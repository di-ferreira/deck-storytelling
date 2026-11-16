import type { CardJson, CardKind } from '../../shared/schemas/deck';

/** Filtro consultivo por categoria e/ou tipo. Nunca altera o catálogo. */
export interface CardFilter {
  readonly categoryIds?: readonly string[];
  readonly kinds?: readonly CardKind[];
}

export function matchesCardFilter(card: CardJson, filter: CardFilter): boolean {
  if (filter.categoryIds && filter.categoryIds.length > 0 && !filter.categoryIds.includes(card.category_id)) {
    return false;
  }
  if (filter.kinds && filter.kinds.length > 0 && !filter.kinds.includes(card.kind)) {
    return false;
  }
  return true;
}
