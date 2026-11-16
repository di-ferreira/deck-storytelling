import type { Deck } from '../../domain/deck/deck';
import {
  cardKindSchema,
  type CardJson,
  type GenreCardJson,
  type TypeCategoryJson,
} from '../../shared/schemas/deck';
import type { CardSummary, SubGenreSummary } from '../../shared/messages';

type SubGenreDetailJson = GenreCardJson['sub_genre_details'][number];

export type CardView = 'catalog' | 'selection' | 'favorites';

/** Estado de seleção necessário para projetar as cartas (satisfeito por `DeckSelection`). */
export interface SelectionFlags {
  has(cardId: string): boolean;
  isFavorite(cardId: string): boolean;
  isLocked(cardId: string): boolean;
  readonly selectedCardIds: readonly string[];
  readonly favoriteCardIds: readonly string[];
}

export interface CardViewFilter {
  readonly query: string;
  readonly categoryId?: string;
  readonly kind?: string;
  readonly tag?: string;
  readonly view?: CardView;
}

const KIND_VALUES = cardKindSchema.options as readonly string[];

/**
 * Filtra as cartas exibidas. Nunca altera o catálogo: apenas projeta o subconjunto
 * que casa com busca, categoria, tipo, tag e aba ativa.
 */
export function filterCards(
  deck: Deck,
  selection: SelectionFlags,
  filter: CardViewFilter,
): readonly CardJson[] {
  const kind = filter.kind && KIND_VALUES.includes(filter.kind)
    ? (filter.kind as CardJson['kind'])
    : undefined;
  const base = deck.index.search(filter.query, filter.categoryId || undefined, kind);

  const tag = filter.tag?.trim();
  const tagged = tag
    ? base.filter((card) => card.tags.some((item) => item.toLocaleLowerCase('pt-BR') === tag.toLocaleLowerCase('pt-BR')))
    : base;

  if (filter.view === 'selection') {
    const selected = new Set(selection.selectedCardIds);
    const byId = new Map(tagged.map((card) => [card.id, card]));
    return selection.selectedCardIds
      .map((cardId) => byId.get(cardId))
      .filter((card): card is CardJson => card !== undefined && selected.has(card.id));
  }

  if (filter.view === 'favorites') {
    const favorites = new Set(selection.favoriteCardIds);
    return tagged.filter((card) => favorites.has(card.id));
  }

  return tagged;
}

function subGenreSummary(detail: SubGenreDetailJson): SubGenreSummary {
  return {
    name: detail.name,
    prompt: detail.prompt,
    question: detail.question,
    suggestedUse: detail.suggested_use,
    readerPromise: detail.reader_promise,
    coreConventions: detail.core_conventions,
    pitfalls: detail.pitfalls,
    compatibleGenres: [...detail.compatible_genres],
  };
}

/** Projeta uma carta integral para a webview, sem resumir nenhum texto do deck. */
export function toCardSummary(
  card: CardJson,
  category: TypeCategoryJson | undefined,
  selection: SelectionFlags,
): CardSummary {
  const base: CardSummary = {
    id: card.id,
    title: card.title,
    kind: card.kind,
    categoryId: card.category_id,
    categoryName: category?.name ?? card.category,
    color: category?.color ?? '#888888',
    selected: selection.has(card.id),
    favorite: selection.isFavorite(card.id),
    locked: selection.isLocked(card.id),
    prompt: card.prompt,
    question: card.question,
    suggestedUse: card.suggested_use,
    tags: [...card.tags],
    sourceConcept: card.source_concept,
  };

  if (card.kind === 'genre_definition') {
    return {
      ...base,
      genreFamily: card.genre_family,
      genreLevel: card.genre_level,
      readerPromise: card.reader_promise,
      storyEngine: card.story_engine,
      coreConventions: card.core_conventions,
      pitfalls: card.pitfalls,
      compatibleGenres: [...card.compatible_genres],
      subGenres: [...card.sub_genre],
      subGenreDetails: card.sub_genre_details.map((detail) => subGenreSummary(detail)),
    };
  }

  return {
    ...base,
    genreAdaptation: card.genre_adaptation,
    genreRelevantAxis: card.genre_relevant_axis,
  };
}
