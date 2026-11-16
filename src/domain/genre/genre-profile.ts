/**
 * Perfil de gênero do projeto (Fase 4).
 *
 * Regras estruturais:
 * - `dominantGenreId` vazio significa RASCUNHO, não erro: a identidade ainda não foi definida.
 * - No máximo `MAX_SECONDARY_GENRES` secundários; o dominante nunca aparece entre eles.
 * - `subGenresByGenre` é indexado pelo ID da carta-mãe ativa; os nomes são os de
 *   `sub_genre_details[].name` (nunca de `source_card_id`, que é histórico e não é carta).
 * - `contract` e `dimensions` são textos do autor; não são gêneros nem viram cartas.
 */

export interface GenreContract {
  readonly promise: string;
  readonly engine: string;
  readonly conventions: string;
  readonly freedom: string;
  readonly reward: string;
}

export interface IdentityDimensions {
  readonly tone: string;
  readonly atmosphere: string;
  readonly setting: string;
  readonly audience: string;
  readonly format: string;
  readonly approximateLength: string;
}

export interface GenreProfile {
  readonly dominantGenreId: string;
  readonly secondaryGenreIds: readonly string[];
  readonly subGenresByGenre: Readonly<Record<string, readonly string[]>>;
  readonly contract: GenreContract;
  readonly dimensions: IdentityDimensions;
}

/** Forma serializável (JSON) do perfil, sem metadados de persistência. */
export interface GenreProfileJson {
  readonly dominantGenreId: string;
  readonly secondaryGenreIds: string[];
  readonly subGenresByGenre: Record<string, string[]>;
  readonly contract: GenreContract;
  readonly dimensions: IdentityDimensions;
}

export const MAX_SECONDARY_GENRES = 2;

export function createEmptyGenreContract(): GenreContract {
  return { promise: '', engine: '', conventions: '', freedom: '', reward: '' };
}

export function createEmptyIdentityDimensions(): IdentityDimensions {
  return {
    tone: '',
    atmosphere: '',
    setting: '',
    audience: '',
    format: '',
    approximateLength: '',
  };
}

export function createEmptyGenreProfile(): GenreProfile {
  return {
    dominantGenreId: '',
    secondaryGenreIds: [],
    subGenresByGenre: {},
    contract: createEmptyGenreContract(),
    dimensions: createEmptyIdentityDimensions(),
  };
}

export function genreProfileToJson(profile: GenreProfile): GenreProfileJson {
  const subGenresByGenre: Record<string, string[]> = {};
  for (const [genreId, names] of Object.entries(profile.subGenresByGenre)) {
    subGenresByGenre[genreId] = [...names];
  }
  return {
    dominantGenreId: profile.dominantGenreId,
    secondaryGenreIds: [...profile.secondaryGenreIds],
    subGenresByGenre,
    contract: { ...profile.contract },
    dimensions: { ...profile.dimensions },
  };
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function uniqueTexts(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const name = text(value);
    if (!name || seen.has(name)) {
      continue;
    }
    seen.add(name);
    result.push(name);
  }
  return result;
}

/**
 * Hidrata o perfil a partir do JSON persistido.
 * Sanitiza apenas o que a política exige: dominante fora dos secundários, duplicatas
 * removidas preservando a ordem e limite de secundários. Não valida IDs contra o
 * catálogo — isso é feito pela política e sinalizado como aviso no contexto.
 */
export function genreProfileFromJson(json: Partial<GenreProfileJson> | undefined): GenreProfile {
  if (!json) {
    return createEmptyGenreProfile();
  }

  const dominantGenreId = text(json.dominantGenreId);
  const secondaryGenreIds = uniqueTexts(json.secondaryGenreIds)
    .filter((genreId) => genreId !== dominantGenreId)
    .slice(0, MAX_SECONDARY_GENRES);

  const subGenresByGenre: Record<string, string[]> = {};
  const rawSubGenres = json.subGenresByGenre;
  if (rawSubGenres && typeof rawSubGenres === 'object') {
    for (const [genreId, names] of Object.entries(rawSubGenres)) {
      const key = text(genreId);
      const resolvedNames = uniqueTexts(names);
      if (key && resolvedNames.length > 0) {
        subGenresByGenre[key] = resolvedNames;
      }
    }
  }

  const contract = json.contract ?? createEmptyGenreContract();
  const dimensions = json.dimensions ?? createEmptyIdentityDimensions();

  return {
    dominantGenreId,
    secondaryGenreIds,
    subGenresByGenre,
    contract: {
      promise: text(contract.promise),
      engine: text(contract.engine),
      conventions: text(contract.conventions),
      freedom: text(contract.freedom),
      reward: text(contract.reward),
    },
    dimensions: {
      tone: text(dimensions.tone),
      atmosphere: text(dimensions.atmosphere),
      setting: text(dimensions.setting),
      audience: text(dimensions.audience),
      format: text(dimensions.format),
      approximateLength: text(dimensions.approximateLength),
    },
  };
}
