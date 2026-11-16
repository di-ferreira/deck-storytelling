import type { Deck } from '../../domain/deck/deck';
import {
  DeckSelection,
  type CardLinkTarget,
  type DrawRequest,
} from '../../domain/selection/deck-selection';
import { LinkRegistry, linkTargetKey } from '../../domain/selection/link-registry';
import type { DeckRepository } from '../ports/deck-repository';
import type { OperationLog } from '../ports/operation-log';
import type { StoryLinkLookup } from '../../domain/story/story-link-lookup';
import type { RandomGenerator } from '../ports/random-generator';
import type { SelectionRepository } from '../ports/selection-repository';

export interface SelectionServiceDeps {
  readonly deck: DeckRepository;
  readonly repository: SelectionRepository;
  readonly log: OperationLog;
  readonly random: RandomGenerator;
  /** Quando presente, recusa vínculos cujo alvo do Story Builder não existe. */
  readonly storyLookup?: StoryLinkLookup;
  readonly clock?: () => string;
  /** Gerador de IDs de versão; recebe um prefixo estável. */
  readonly idFactory?: (prefix: string) => string;
}

export interface SelectionDrawResult {
  readonly selection: DeckSelection;
  readonly drawnCardIds: readonly string[];
}

/**
 * ÚNICO escritor do agregado `DeckSelection`.
 * Valida IDs contra o catálogo, persiste após cada mutação e registra a operação.
 */
export class SelectionService {
  private cached: DeckSelection | undefined;
  private deckCache: Deck | undefined;
  private readonly clock: () => string;
  private readonly idFactory: (prefix: string) => string;

  constructor(private readonly deps: SelectionServiceDeps) {
    this.clock = deps.clock ?? (() => new Date().toISOString());
    this.idFactory =
      deps.idFactory ??
      ((prefix) => `${prefix}-${Date.now().toString(36)}-${Math.floor(deps.random.next() * 1_000_000_000).toString(36)}`);
  }

  async getSelection(): Promise<DeckSelection> {
    if (!this.cached) {
      const loaded = await this.deps.repository.load();
      this.cached = loaded ?? DeckSelection.create(this.deps.repository.projectId, this.clock());
    }
    return this.cached;
  }

  async select(cardId: string): Promise<DeckSelection> {
    return this.apply('select', { cardId }, (selection, deck) =>
      selection.withSelected(cardId, deck.index, this.clock()),
    );
  }

  async deselect(cardId: string): Promise<DeckSelection> {
    return this.apply('deselect', { cardId }, (selection) => selection.withDeselected(cardId, this.clock()));
  }

  async toggle(cardId: string): Promise<DeckSelection> {
    return this.apply('toggle', { cardId }, (selection, deck) =>
      selection.withToggled(cardId, deck.index, this.clock()),
    );
  }

  async favorite(cardId: string): Promise<DeckSelection> {
    return this.apply('favorite', { cardId }, (selection, deck) =>
      selection.withFavorite(cardId, deck.index, this.clock()),
    );
  }

  async unfavorite(cardId: string): Promise<DeckSelection> {
    return this.apply('unfavorite', { cardId }, (selection) => selection.withUnfavorite(cardId, this.clock()));
  }

  async toggleFavorite(cardId: string): Promise<DeckSelection> {
    const current = await this.getSelection();
    return current.isFavorite(cardId) ? this.unfavorite(cardId) : this.favorite(cardId);
  }

  async lock(cardId: string): Promise<DeckSelection> {
    return this.apply('lock', { cardId }, (selection) => selection.withLocked(cardId, this.clock()));
  }

  async unlock(cardId: string): Promise<DeckSelection> {
    return this.apply('unlock', { cardId }, (selection) => selection.withUnlocked(cardId, this.clock()));
  }

  async toggleLock(cardId: string): Promise<DeckSelection> {
    const current = await this.getSelection();
    return current.isLocked(cardId) ? this.unlock(cardId) : this.lock(cardId);
  }

  async replace(cardId: string, newCardId: string): Promise<DeckSelection> {
    return this.apply('replace', { cardId, newCardId }, (selection, deck) =>
      selection.withReplaced(cardId, newCardId, deck.index, this.clock()),
    );
  }

  async draw(request: DrawRequest): Promise<SelectionDrawResult> {
    const current = await this.getSelection();
    const deck = await this.loadDeck();
    const outcome = current.withDrawn(request, deck.index, () => this.deps.random.next(), this.clock());
    const selection = await this.commit(outcome.selection, current, 'draw', {
      count: request.count,
      from: request.from,
      categoryIds: request.categoryIds,
      kinds: request.kinds,
      drawnCardIds: outcome.drawnCardIds,
    });
    return { selection, drawnCardIds: outcome.drawnCardIds };
  }

  async shuffle(): Promise<DeckSelection> {
    return this.apply('shuffle', {}, (selection) => selection.withShuffled(() => this.deps.random.next(), this.clock()));
  }

  async saveVersion(label: string): Promise<DeckSelection> {
    const versionId = this.idFactory('ver');
    return this.apply('saveVersion', { versionId, label }, (selection) =>
      selection.withVersionSaved(versionId, label, this.clock()),
    );
  }

  async restoreVersion(versionId: string): Promise<DeckSelection> {
    return this.apply('restoreVersion', { versionId }, (selection, deck) =>
      selection.withVersionRestored(versionId, deck.index, this.clock()),
    );
  }

  async addLink(cardId: string, target: CardLinkTarget, note?: string): Promise<DeckSelection> {
    return this.apply('addLink', { cardId, target, note }, (selection, deck) => {
      const registry = new LinkRegistry(selection.links, deck.index, this.deps.storyLookup);
      const next = registry.addLink(cardId, target, this.clock(), note);
      return selection.withLinks(next.toLinks(), this.clock());
    });
  }

  async removeLink(cardId: string, target: CardLinkTarget): Promise<DeckSelection> {
    return this.apply('removeLink', { cardId, target }, (selection, deck) => {
      const registry = new LinkRegistry(selection.links, deck.index, this.deps.storyLookup);
      const next = registry.removeLink(cardId, target);
      if (next.links.length === selection.links.length) {
        return selection;
      }
      return selection.withLinks(next.links, this.clock());
    });
  }

  async relocateTarget(from: CardLinkTarget, to: CardLinkTarget): Promise<DeckSelection> {
    return this.apply('relocateTarget', { from, to }, (selection, deck) => {
      if (linkTargetKey(from) === linkTargetKey(to)) {
        return selection;
      }
      const registry = new LinkRegistry(selection.links, deck.index, this.deps.storyLookup);
      const hasMatchingLink = registry.links.some(
        (link) => linkTargetKey(link.target) === linkTargetKey(from),
      );
      if (!hasMatchingLink) {
        return selection;
      }
      const next = registry.relocateTarget(from, to);
      return selection.withLinks(next.links, this.clock());
    });
  }

  private async apply(
    type: string,
    payload: Readonly<Record<string, unknown>>,
    transform: (selection: DeckSelection, deck: Deck) => DeckSelection,
  ): Promise<DeckSelection> {
    const current = await this.getSelection();
    const deck = await this.loadDeck();
    const next = transform(current, deck);
    return this.commit(next, current, type, payload);
  }

  private async loadDeck(): Promise<Deck> {
    if (!this.deckCache) {
      this.deckCache = await this.deps.deck.load();
    }
    return this.deckCache;
  }

  private async commit(
    next: DeckSelection,
    previous: DeckSelection,
    type: string,
    payload: Readonly<Record<string, unknown>>,
  ): Promise<DeckSelection> {
    if (next === previous) {
      return previous;
    }

    let saved: DeckSelection;
    try {
      saved = await this.deps.repository.save(next, previous.revision);
    } catch (error) {
      // Força recarga no próximo acesso: o arquivo é a fonte da verdade.
      this.cached = undefined;
      throw error;
    }

    this.cached = saved;
    try {
      await this.deps.log.append({ type, projectId: saved.projectId, payload });
    } catch {
      // O estado já foi persistido; falha de journal não invalida a operação.
    }
    return saved;
  }
}
