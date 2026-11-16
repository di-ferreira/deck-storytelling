import type { DeckIndex } from '../deck/deck';
import type { GenreCardJson } from '../../shared/schemas/deck';
import { GenreError } from './genre-error';
import {
  MAX_SECONDARY_GENRES,
  createEmptyGenreProfile,
  type GenreContract,
  type GenreProfile,
  type IdentityDimensions,
} from './genre-profile';
import { findUnknownSubGenreNames, resolveSubGenres } from './sub-genre-resolver';

/**
 * Política pura da seleção de gênero. Todas as operações são imutáveis:
 * devolvem um NOVO perfil e nunca alteram o anterior.
 *
 * - Dominante vazio = rascunho (não é erro).
 * - 0–2 secundários; o terceiro é recusado com mensagem editorial.
 * - O dominante nunca permanece nos secundários; promovê-lo remove o antigo secundário.
 * - Remover um gênero remove os subgêneros dele (a chave do gênero deixa o perfil).
 * - IDs precisam ser cartas ATIVAS `genre_definition`; históricos e não-gêneros são recusados.
 */

export function isGenreDraft(profile: GenreProfile): boolean {
  return profile.dominantGenreId.trim() === '';
}

function requireGenreCard(index: DeckIndex, genreId: string): GenreCardJson {
  const id = genreId.trim();
  if (!id) {
    throw new GenreError('UNKNOWN_GENRE', 'Informe um gênero para selecionar.');
  }
  const card = index.getById(id);
  if (!card) {
    throw new GenreError(
      'UNKNOWN_GENRE',
      `O gênero ${id} não faz parte do catálogo ativo. Escolha uma carta de gênero do deck.`,
    );
  }
  if (card.kind !== 'genre_definition') {
    throw new GenreError(
      'NOT_A_GENRE',
      `A carta ${card.id} (“${card.title}”) não é um gênero. Gêneros vêm apenas das cartas de definição de gênero.`,
    );
  }
  return card;
}

function isSelected(profile: GenreProfile, genreId: string): boolean {
  return profile.dominantGenreId === genreId || profile.secondaryGenreIds.includes(genreId);
}

/** Remove subgêneros de gêneros que deixaram de ser dominante ou secundário. */
function pruneSubGenres(profile: GenreProfile): GenreProfile {
  const selected = new Set([profile.dominantGenreId, ...profile.secondaryGenreIds].filter(Boolean));
  const entries = Object.entries(profile.subGenresByGenre).filter(([genreId]) => selected.has(genreId));
  if (entries.length === Object.keys(profile.subGenresByGenre).length) {
    return profile;
  }
  return { ...profile, subGenresByGenre: Object.fromEntries(entries) };
}

function sameStrings(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export function setDominantGenre(profile: GenreProfile, genreId: string, index: DeckIndex): GenreProfile {
  const id = genreId.trim();
  if (id === profile.dominantGenreId) {
    return profile;
  }

  if (!id) {
    const next: GenreProfile = {
      ...profile,
      dominantGenreId: '',
      secondaryGenreIds: [...profile.secondaryGenreIds],
    };
    return pruneSubGenres(next);
  }

  requireGenreCard(index, id);
  const next: GenreProfile = {
    ...profile,
    dominantGenreId: id,
    // Promoção: o gênero deixa de ser secundário; a ordem dos demais é preservada.
    secondaryGenreIds: profile.secondaryGenreIds.filter((secondaryId) => secondaryId !== id),
  };
  return pruneSubGenres(next);
}

export function addSecondaryGenre(profile: GenreProfile, genreId: string, index: DeckIndex): GenreProfile {
  const card = requireGenreCard(index, genreId);

  if (card.id === profile.dominantGenreId) {
    throw new GenreError(
      'DOMINANT_IN_SECONDARIES',
      `“${card.title}” já é o gênero dominante e não pode ser também secundário.`,
    );
  }
  if (profile.secondaryGenreIds.includes(card.id)) {
    throw new GenreError(
      'DUPLICATE_SECONDARY',
      `“${card.title}” já está entre os gêneros secundários.`,
    );
  }
  if (profile.secondaryGenreIds.length >= MAX_SECONDARY_GENRES) {
    throw new GenreError(
      'SECONDARY_LIMIT',
      `O deck permite no máximo ${MAX_SECONDARY_GENRES} gêneros secundários: mantenha um dominante claro e até dois secundários. Promova um deles a dominante ou remova um antes de adicionar outro.`,
    );
  }

  return {
    ...profile,
    secondaryGenreIds: [...profile.secondaryGenreIds, card.id],
  };
}

export function removeSecondaryGenre(profile: GenreProfile, genreId: string): GenreProfile {
  const id = genreId.trim();
  if (!profile.secondaryGenreIds.includes(id)) {
    return profile;
  }
  return pruneSubGenres({
    ...profile,
    secondaryGenreIds: profile.secondaryGenreIds.filter((secondaryId) => secondaryId !== id),
  });
}

export interface GenreSubGenreSelection {
  readonly profile: GenreProfile;
  /** Nomes canônicos aceitos, na ordem escolhida, sem duplicatas. */
  readonly accepted: readonly string[];
  /** Nomes sem correspondência na carta-mãe; são omitidos do perfil (aviso, nunca erro). */
  readonly unknown: readonly string[];
}

/**
 * Define os subgêneros de um gênero já selecionado.
 * Nomes são normalizados para o `name` canônico de `sub_genre_details`; nomes
 * desconhecidos são devolvidos em `unknown` para quem chama registrar um aviso.
 */
export function setGenreSubGenres(
  profile: GenreProfile,
  genreId: string,
  names: readonly string[],
  index: DeckIndex,
): GenreSubGenreSelection {
  const card = requireGenreCard(index, genreId);
  if (!isSelected(profile, card.id)) {
    throw new GenreError(
      'UNKNOWN_GENRE',
      `“${card.title}” não está no perfil. Escolha-o como dominante ou secundário antes de definir subgêneros.`,
    );
  }

  const resolved = resolveSubGenres(card, names);
  const accepted = resolved.map((item) => item.name);
  const unknown = findUnknownSubGenreNames(card, names);
  const current = profile.subGenresByGenre[card.id] ?? [];

  if (sameStrings(current, accepted)) {
    return { profile, accepted, unknown };
  }

  const subGenresByGenre: Record<string, readonly string[]> = { ...profile.subGenresByGenre };
  if (accepted.length === 0) {
    delete subGenresByGenre[card.id];
  } else {
    subGenresByGenre[card.id] = accepted;
  }

  return { profile: { ...profile, subGenresByGenre }, accepted, unknown };
}

export function setGenreContract(profile: GenreProfile, patch: Partial<GenreContract>): GenreProfile {
  let changed = false;
  const contract: GenreContract = {
    promise: applyText(profile.contract.promise, patch.promise, () => (changed = true)),
    engine: applyText(profile.contract.engine, patch.engine, () => (changed = true)),
    conventions: applyText(profile.contract.conventions, patch.conventions, () => (changed = true)),
    freedom: applyText(profile.contract.freedom, patch.freedom, () => (changed = true)),
    reward: applyText(profile.contract.reward, patch.reward, () => (changed = true)),
  };
  return changed ? { ...profile, contract } : profile;
}

export function setIdentityDimensions(
  profile: GenreProfile,
  patch: Partial<IdentityDimensions>,
): GenreProfile {
  let changed = false;
  const dimensions: IdentityDimensions = {
    tone: applyText(profile.dimensions.tone, patch.tone, () => (changed = true)),
    atmosphere: applyText(profile.dimensions.atmosphere, patch.atmosphere, () => (changed = true)),
    setting: applyText(profile.dimensions.setting, patch.setting, () => (changed = true)),
    audience: applyText(profile.dimensions.audience, patch.audience, () => (changed = true)),
    format: applyText(profile.dimensions.format, patch.format, () => (changed = true)),
    approximateLength: applyText(
      profile.dimensions.approximateLength,
      patch.approximateLength,
      () => (changed = true),
    ),
  };
  return changed ? { ...profile, dimensions } : profile;
}

function applyText(current: string, incoming: string | undefined, markChanged: () => void): string {
  if (incoming === undefined) {
    return current;
  }
  const next = incoming.trim();
  if (next !== current) {
    markChanged();
  }
  return next;
}

export function clearGenreProfile(): GenreProfile {
  return createEmptyGenreProfile();
}
