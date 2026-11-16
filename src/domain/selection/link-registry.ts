import { SelectionError } from './selection-error';
import type { CardLink, CardLinkTarget, CardLinkTargetType } from './deck-selection';
import { StoryError } from '../story/story-error';
import { hasTarget, type StoryLinkLookup } from '../story/story-link-lookup';

/** Consulta mínima para validar alvos de gênero. `DeckIndex` satisfaz estruturalmente. */
export interface GenreLookup {
  isGenre(id: string): boolean;
}

export function linkTargetKey(target: CardLinkTarget): string {
  switch (target.type) {
    case 'project':
      return 'project';
    case 'decision':
      return `decision:${target.decisionId}`;
    case 'genre':
      return `genre:${target.genreId}`;
    case 'character':
      return `character:${target.characterId}`;
    case 'act':
      return `act:${target.actId}`;
    case 'chapter':
      return `chapter:${target.chapterId}`;
    case 'scene':
      return `scene:${target.sceneId}`;
  }
}

export function sameLinkTarget(a: CardLinkTarget, b: CardLinkTarget): boolean {
  return linkTargetKey(a) === linkTargetKey(b);
}

function pairKey(cardId: string, target: CardLinkTarget): string {
  return `${cardId}::${linkTargetKey(target)}`;
}

function uniqueCardIds(links: readonly CardLink[]): readonly string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const link of links) {
    if (!seen.has(link.cardId)) {
      seen.add(link.cardId);
      result.push(link.cardId);
    }
  }
  return result;
}

/**
 * Registro puro derivado de `CardLink[]`.
 * Nunca altera o agregado: `addLink`/`removeLink`/`relocateTarget` devolvem
 * um NOVO registro, que o serviço aplica com `DeckSelection.withLinks`.
 */
export class LinkRegistry {
  private readonly entries: readonly CardLink[];

  constructor(
    links: readonly CardLink[],
    private readonly genres?: GenreLookup,
    private readonly stories?: StoryLinkLookup,
  ) {
    const seen = new Set<string>();
    const entries: CardLink[] = [];
    for (const link of links) {
      const key = pairKey(link.cardId, link.target);
      if (!seen.has(key)) {
        seen.add(key);
        entries.push(link);
      }
    }
    this.entries = entries;
  }

  get links(): readonly CardLink[] {
    return this.entries;
  }

  linksOfCard(cardId: string): readonly CardLink[] {
    return this.entries.filter((link) => link.cardId === cardId);
  }

  /** Cartas associadas exatamente a este alvo (sem duplicatas). */
  cardsForTarget(target: CardLinkTarget): readonly string[] {
    return uniqueCardIds(this.entries.filter((link) => sameLinkTarget(link.target, target)));
  }

  /** Cartas associadas a qualquer alvo de um tipo. */
  cardsForType(type: CardLinkTargetType): readonly string[] {
    return uniqueCardIds(this.entries.filter((link) => link.target.type === type));
  }

  addLink(cardId: string, target: CardLinkTarget, createdAt: string, note?: string): LinkRegistry {
    this.assertTarget(target);
    if (this.entries.some((link) => pairKey(link.cardId, link.target) === pairKey(cardId, target))) {
      throw new SelectionError('DUPLICATE_LINK', `A carta ${cardId} já está vinculada a este alvo.`);
    }
    const link: CardLink = note === undefined
      ? { cardId, target, createdAt }
      : { cardId, target, createdAt, note };
    return new LinkRegistry([...this.entries, link], this.genres, this.stories);
  }

  removeLink(cardId: string, target: CardLinkTarget): LinkRegistry {
    const filtered = this.entries.filter(
      (link) => !(link.cardId === cardId && sameLinkTarget(link.target, target)),
    );
    return new LinkRegistry(filtered, this.genres, this.stories);
  }

  /**
   * Move todos os vínculos de um alvo para outro (ex.: cena movida de capítulo).
   * Colisões do mesmo par carta/alvo são consolidadas sem duplicar.
   */
  relocateTarget(from: CardLinkTarget, to: CardLinkTarget): LinkRegistry {
    if (linkTargetKey(from) === linkTargetKey(to)) {
      return this;
    }
    this.assertTarget(to);
    const mapped = this.entries.map((link) =>
      sameLinkTarget(link.target, from) ? { ...link, target: to } : link,
    );
    return new LinkRegistry(mapped, this.genres, this.stories);
  }

  toLinks(): readonly CardLink[] {
    return this.entries;
  }

  private assertTarget(target: CardLinkTarget): void {
    if (target.type === 'genre' && this.genres && !this.genres.isGenre(target.genreId)) {
      throw new SelectionError('UNKNOWN_CARD', `O gênero ${target.genreId} não existe no catálogo ativo.`);
    }
    if (this.stories && !hasTarget(this.stories, target)) {
      throw new StoryError('UNKNOWN_TARGET', `O alvo do vínculo não existe neste projeto (${target.type}).`);
    }
  }
}
