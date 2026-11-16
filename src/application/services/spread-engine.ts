import type { CardJson } from '../../shared/schemas/deck';
import { matchesCardFilter } from '../../domain/deck/card-filter';
import type { Deck } from '../../domain/deck/deck';
import {
  deriveSpreadStatus,
  renderSpreadResult,
  type SpreadDefinition,
  type SpreadSlot,
  type SpreadState,
} from '../../domain/narrative/spread';
import { sampleWithoutReplacement, type DeckSelection } from '../../domain/selection/deck-selection';
import type { DeckRepository } from '../ports/deck-repository';
import type { RandomGenerator } from '../ports/random-generator';
import type { SpreadCatalog } from '../ports/spread-catalog';
import type { StoryStateRepository } from '../ports/story-state-repository';

export interface SpreadSelectionReader {
  getSelection(): Promise<DeckSelection>;
}

export interface SpreadEngineDeps {
  readonly spreads: SpreadCatalog;
  readonly deck: DeckRepository;
  readonly selection: SpreadSelectionReader;
  readonly storyState: StoryStateRepository;
  readonly random: RandomGenerator;
  readonly clock?: () => string;
}

export type SpreadErrorCode = 'UNKNOWN_SPREAD' | 'UNKNOWN_SLOT';

export class SpreadError extends Error {
  constructor(
    readonly code: SpreadErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'SpreadError';
  }
}

/** Sinaliza pool insuficiente sem lanÃ§ar: a UI decide como avisar. */
export interface SpreadInsufficientPool {
  readonly slotId: string;
  readonly requested: number;
  readonly available: number;
}

export interface SpreadDrawOutcome {
  readonly state: SpreadState;
  readonly drawnCardIds: readonly string[];
  readonly insufficient?: SpreadInsufficientPool;
}

/**
 * Motor das tiragens: usa apenas dados do catÃ¡logo e da seleÃ§Ã£o.
 * Nunca inventa conteÃºdo: o resultado cita `[ID] tÃ­tulo` e o `drawText` original.
 */
export class SpreadEngine {
  private readonly clock: () => string;
  private deckCache: Deck | undefined;

  constructor(private readonly deps: SpreadEngineDeps) {
    this.clock = deps.clock ?? (() => new Date().toISOString());
  }

  async listSpreads(): Promise<readonly SpreadDefinition[]> {
    return this.deps.spreads.list();
  }

  private async loadDeck(): Promise<Deck> {
    if (!this.deckCache) {
      this.deckCache = await this.deps.deck.load();
    }
    return this.deckCache;
  }

  async start(spreadId: string): Promise<SpreadState> {
    const spread = await this.requireSpread(spreadId);
    const selection = await this.deps.selection.getSelection();
    const deck = await this.loadDeck();

    const used = new Set<string>();
    const slotCardIds: Record<string, string[]> = {};
    for (const slot of spread.slots) {
      if (slot.source !== 'selection') {
        slotCardIds[slot.id] = [];
        continue;
      }
      const matches = selection.selectedCardIds
        .map((cardId) => deck.index.getById(cardId))
        .filter((card): card is CardJson => card !== undefined)
        .filter((card) => matchesCardFilter(card, slot) && !used.has(card.id))
        .slice(0, slot.count)
        .map((card) => card.id);
      for (const cardId of matches) {
        used.add(cardId);
      }
      slotCardIds[slot.id] = matches;
    }

    return this.buildState(spread, slotCardIds, deck);
  }

  async loadState(spreadId: string): Promise<SpreadState | undefined> {
    const snapshot = await this.deps.storyState.load();
    return snapshot.spreads.find((state) => state.spreadId === spreadId);
  }

  /**
   * Sorteia cartas para um slot, excluindo bloqueadas e cartas jÃ¡ usadas na tiragem.
   * Pool insuficiente Ã© devolvido em `insufficient`, sem alterar o estado.
   */
  async drawSlot(state: SpreadState, slotId: string, selection: DeckSelection): Promise<SpreadDrawOutcome> {
    const spread = await this.requireSpread(state.spreadId);
    const slot = spread.slots.find((item) => item.id === slotId);
    if (!slot) {
      throw new SpreadError('UNKNOWN_SLOT', `A tiragem ${spread.id} nÃ£o possui o slot ${slotId}.`);
    }

    const deck = await this.loadDeck();
    const pool = this.poolFor(slot, state, selection, deck);

    if (pool.length < slot.count) {
      return {
        state,
        drawnCardIds: [],
        insufficient: { slotId, requested: slot.count, available: pool.length },
      };
    }

    const drawnCardIds = sampleWithoutReplacement(pool, slot.count, () => this.deps.random.next()).map(
      (card) => card.id,
    );
    const slotCardIds = { ...cloneSlotCardIds(state.slotCardIds), [slot.id]: drawnCardIds };
    return { state: this.buildState(spread, slotCardIds, deck), drawnCardIds };
  }

  /** Persiste o estado preservando `stepStates` do Story Builder. */
  async save(state: SpreadState): Promise<SpreadState> {
    const spread = await this.requireSpread(state.spreadId);
    const deck = await this.loadDeck();
    const normalized = this.buildState(spread, cloneSlotCardIds(state.slotCardIds), deck);
    const saved: SpreadState = { ...normalized, savedAt: this.clock() };

    const snapshot = await this.deps.storyState.load();
    const spreads = [...snapshot.spreads.filter((item) => item.spreadId !== saved.spreadId), saved];
    await this.deps.storyState.saveSpreadStates(spreads, snapshot.revision);
    return saved;
  }

  private poolFor(
    slot: SpreadSlot,
    state: SpreadState,
    selection: DeckSelection,
    deck: Deck,
  ): readonly CardJson[] {
    const used = new Set(Object.values(state.slotCardIds).flat());
    const locked = new Set(selection.lockedCardIds);
    const base: readonly CardJson[] =
      slot.source === 'selection'
        ? selection.selectedCardIds
            .map((cardId) => deck.index.getById(cardId))
            .filter((card): card is CardJson => card !== undefined)
        : deck.index.allCards();

    return base.filter(
      (card) => matchesCardFilter(card, slot) && !used.has(card.id) && !locked.has(card.id),
    );
  }

  private buildState(
    spread: SpreadDefinition,
    slotCardIds: Readonly<Record<string, readonly string[]>>,
    deck: Deck,
  ): SpreadState {
    const normalized: Record<string, string[]> = {};
    for (const [slotId, cardIds] of Object.entries(slotCardIds)) {
      normalized[slotId] = [...cardIds];
    }
    const status = deriveSpreadStatus(spread, normalized);
    const base: SpreadState = { spreadId: spread.id, slotCardIds: normalized, status };
    if (status !== 'complete') {
      return base;
    }
    const result = renderSpreadResult(spread, base, (cardId) => deck.index.getById(cardId));
    return result ? { ...base, result } : base;
  }

  private async requireSpread(spreadId: string): Promise<SpreadDefinition> {
    const spread = await this.deps.spreads.get(spreadId);
    if (!spread) {
      throw new SpreadError('UNKNOWN_SPREAD', `Tiragem ${spreadId} nÃ£o encontrada.`);
    }
    return spread;
  }
}

function cloneSlotCardIds(
  slotCardIds: Readonly<Record<string, readonly string[]>>,
): Record<string, string[]> {
  const clone: Record<string, string[]> = {};
  for (const [slotId, cardIds] of Object.entries(slotCardIds)) {
    clone[slotId] = [...cardIds];
  }
  return clone;
}
