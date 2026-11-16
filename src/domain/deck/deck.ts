import type {
  CardJson,
  CardKind,
  DeckJson,
  GenreCardJson,
  TypeCategoryJson,
} from '../../shared/schemas/deck';
import type { ValidationFinding } from '../../shared/types';

export interface DeckMeta {
  readonly deckId: string;
  readonly title: string;
  readonly subtitle: string;
  readonly version: string;
  readonly language: string;
  readonly created: string;
  readonly description: string;
  readonly originalityNote: string;
  readonly declaredCardCount: number;
  readonly declaredCategoryCount: number;
}

export interface Deck {
  readonly meta: DeckMeta;
  readonly categories: readonly TypeCategoryJson[];
  readonly cards: readonly CardJson[];
  readonly editorialPrinciples: readonly string[];
  readonly usage: DeckJson['usage'];
  readonly editorialAudit: DeckJson['editorial_audit'];
  readonly taxonomySources: DeckJson['genre_taxonomy_sources'];
  readonly findings: readonly ValidationFinding[];
  readonly index: DeckIndex;
}

export interface CategoryWithCount extends TypeCategoryJson {
  readonly cardCount: number;
}

/** Índice imutável de consulta do catálogo. Nunca altera as cartas. */
export class DeckIndex {
  private readonly byIdMap = new Map<string, CardJson>();
  private readonly byCategoryMap = new Map<string, CardJson[]>();
  private readonly byKindMap = new Map<CardKind, CardJson[]>();
  private readonly byTagMap = new Map<string, CardJson[]>();
  private readonly bySourceConceptMap = new Map<string, CardJson[]>();
  private readonly subGenreParentMap = new Map<string, string>();
  private readonly genreIds = new Set<string>();

  constructor(cards: readonly CardJson[]) {
    for (const card of cards) {
      this.byIdMap.set(card.id, card);

      const categoryList = this.byCategoryMap.get(card.category_id) ?? [];
      categoryList.push(card);
      this.byCategoryMap.set(card.category_id, categoryList);

      const kindList = this.byKindMap.get(card.kind) ?? [];
      kindList.push(card);
      this.byKindMap.set(card.kind, kindList);

      const conceptList = this.bySourceConceptMap.get(card.source_concept) ?? [];
      conceptList.push(card);
      this.bySourceConceptMap.set(card.source_concept, conceptList);

      for (const tag of card.tags) {
        const tagList = this.byTagMap.get(tag) ?? [];
        tagList.push(card);
        this.byTagMap.set(tag, tagList);
      }

      if (card.kind === 'genre_definition') {
        this.genreIds.add(card.id);
        // Mapa subgênero -> gênero-mãe, derivado apenas do catálogo ativo.
        for (const name of card.sub_genre) {
          if (!this.subGenreParentMap.has(name)) {
            this.subGenreParentMap.set(name, card.id);
          }
        }
        for (const detail of card.sub_genre_details) {
          if (!this.subGenreParentMap.has(detail.name)) {
            this.subGenreParentMap.set(detail.name, card.id);
          }
        }
      }
    }
  }

  /** Todas as cartas ativas, na ordem declarada no deck. Somente leitura. */
  allCards(): readonly CardJson[] {
    return Array.from(this.byIdMap.values());
  }

  getById(id: string): CardJson | undefined {
    return this.byIdMap.get(id);
  }

  getByCategory(categoryId: string): readonly CardJson[] {
    return this.byCategoryMap.get(categoryId) ?? [];
  }

  getByKind(kind: CardKind): readonly CardJson[] {
    return this.byKindMap.get(kind) ?? [];
  }

  getByTag(tag: string): readonly CardJson[] {
    return this.byTagMap.get(tag) ?? [];
  }

  getBySourceConcept(sourceConcept: string): readonly CardJson[] {
    return this.bySourceConceptMap.get(sourceConcept) ?? [];
  }

  /** Gênero-mãe de um subgênero ativo, ou undefined quando não há correspondência. */
  getParentGenreId(subGenreName: string): string | undefined {
    return this.subGenreParentMap.get(subGenreName);
  }

  /** Cópia somente leitura do mapa subgênero -> gênero-mãe. */
  get subGenreParents(): ReadonlyMap<string, string> {
    return this.subGenreParentMap;
  }

  getGenreCards(): readonly GenreCardJson[] {
    return (this.byKindMap.get('genre_definition') ?? []) as GenreCardJson[];
  }

  isGenre(id: string): boolean {
    return this.genreIds.has(id);
  }

  get countsByKind(): Readonly<Record<string, number>> {
    const result: Record<string, number> = {};
    for (const [kind, cards] of this.byKindMap) {
      result[kind] = cards.length;
    }
    return result;
  }

  /**
   * Busca por texto integral: título, prompt, pergunta, aplicação, conceito e tags.
   * Nunca remove cartas do catálogo — apenas filtra a projeção.
   */
  search(query: string, categoryId?: string, kind?: CardKind): readonly CardJson[] {
    const term = query.trim().toLocaleLowerCase('pt-BR');
    let pool: readonly CardJson[] = categoryId
      ? this.getByCategory(categoryId)
      : Array.from(this.byIdMap.values());

    if (kind) {
      pool = pool.filter((card) => card.kind === kind);
    }
    if (!term) {
      return pool;
    }

    return pool.filter((card) => {
      const haystack = [
        card.id,
        card.title,
        card.prompt,
        card.question,
        card.suggested_use,
        card.source_concept,
        ...card.tags,
      ]
        .join(' ')
        .toLocaleLowerCase('pt-BR');
      return haystack.includes(term);
    });
  }

  categoriesWithCounts(categories: readonly TypeCategoryJson[]): readonly CategoryWithCount[] {
    return categories.map((category) => ({
      ...category,
      cardCount: (this.byCategoryMap.get(category.id) ?? []).length,
    }));
  }
}

export function toDeck(json: DeckJson, findings: readonly ValidationFinding[]): Deck {
  return {
    meta: {
      deckId: json.deck_id,
      title: json.title,
      subtitle: json.subtitle,
      version: json.version,
      language: json.language,
      created: json.created,
      description: json.description,
      originalityNote: json.originality_note,
      declaredCardCount: json.card_count,
      declaredCategoryCount: json.category_count,
    },
    categories: json.categories,
    cards: json.cards,
    editorialPrinciples: json.editorial_principles,
    usage: json.usage,
    editorialAudit: json.editorial_audit,
    taxonomySources: json.genre_taxonomy_sources,
    findings,
    index: new DeckIndex(json.cards),
  };
}
