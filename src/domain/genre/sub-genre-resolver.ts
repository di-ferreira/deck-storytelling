import type { GenreCardJson } from '../../shared/schemas/deck';

export type SubGenreDetail = GenreCardJson['sub_genre_details'][number];

/**
 * Subgênero resolvido contra a carta-mãe ativa.
 * `sourceCardId` é preservado VERBATIM de `sub_genre_details[].source_card_id`:
 * é rastreio histórico, nunca uma carta do catálogo.
 */
export interface ResolvedSubGenre {
  readonly name: string;
  readonly parentGenreId: string;
  readonly detail: SubGenreDetail;
  readonly sourceCardId: string;
}

/** Comparação editorial: espaços nas pontas não importam e a caixa é pt-BR. */
export function normalizeSubGenreName(name: string): string {
  return name.trim().toLocaleLowerCase('pt-BR');
}

export function findSubGenreDetail(
  genreCard: GenreCardJson,
  name: string,
): SubGenreDetail | undefined {
  const target = normalizeSubGenreName(name);
  if (!target) {
    return undefined;
  }
  return genreCard.sub_genre_details.find((detail) => normalizeSubGenreName(detail.name) === target);
}

/**
 * Resolve nomes para detalhes 1:1 da carta-mãe.
 * Nomes desconhecidos são omitidos — quem chama decide transformar a omissão em aviso,
 * nunca em erro (o deck não é uma lista fechada).
 */
export function resolveSubGenres(
  genreCard: GenreCardJson,
  names: readonly string[],
): readonly ResolvedSubGenre[] {
  const seen = new Set<string>();
  const resolved: ResolvedSubGenre[] = [];

  for (const name of names) {
    const detail = findSubGenreDetail(genreCard, name);
    if (!detail) {
      continue;
    }
    const canonicalName = detail.name;
    const key = normalizeSubGenreName(canonicalName);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    resolved.push({
      name: canonicalName,
      parentGenreId: genreCard.id,
      detail,
      sourceCardId: detail.source_card_id,
    });
  }

  return resolved;
}

/** Nomes que não correspondem a nenhum detalhe da carta, preservando a grafia digitada. */
export function findUnknownSubGenreNames(
  genreCard: GenreCardJson,
  names: readonly string[],
): readonly string[] {
  const unknown: string[] = [];
  const seen = new Set<string>();
  for (const name of names) {
    const trimmed = name.trim();
    if (!trimmed) {
      continue;
    }
    const key = normalizeSubGenreName(trimmed);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    if (!findSubGenreDetail(genreCard, trimmed)) {
      unknown.push(trimmed);
    }
  }
  return unknown;
}
