import type { Deck } from '../../domain/deck/deck';
import type { GenreCardJson } from '../../shared/schemas/deck';
import type { GenreContract, GenreProfile, IdentityDimensions } from '../../domain/genre/genre-profile';
import {
  findUnknownSubGenreNames,
  resolveSubGenres,
  type ResolvedSubGenre,
} from '../../domain/genre/sub-genre-resolver';

/**
 * Avisos do Genre Builder. Aviso NUNCA bloqueia a obra: o autor pode seguir com
 * um perfil incompleto ou com um nome que saiu do deck. Erros de política
 * (limite de secundários, carta inexistente) são `GenreError`; aqui só há sinalização.
 */
export type GenreWarningCode =
  | 'UNKNOWN_GENRE_IN_PROFILE'
  | 'UNKNOWN_SUBGENRE_IN_PROFILE'
  | 'ORPHAN_SUBGENRE'
  | 'UNKNOWN_SUBGENRE';

export interface GenreWarning {
  readonly code: GenreWarningCode;
  readonly message: string;
  readonly genreId?: string;
  readonly subGenreName?: string;
}

/**
 * Projeção SOMENTE LEITURA do perfil para UI/IA/Markdown.
 * Nunca é persistida: a fonte da verdade é `GenreProfile` + o deck ativo.
 * `dominant` é `undefined` enquanto o perfil é rascunho (sem erro).
 */
export interface GenreContext {
  readonly dominant: GenreCardJson | undefined;
  readonly secondaries: readonly GenreCardJson[];
  readonly subGenres: readonly ResolvedSubGenre[];
  readonly contract: GenreContract;
  readonly dimensions: IdentityDimensions;
  readonly warnings: readonly GenreWarning[];
}

export class GenreContextBuilder {
  constructor(private readonly deck: Deck) {}

  build(profile: GenreProfile): GenreContext {
    const warnings: GenreWarning[] = [];
    const dominant = this.resolveGenre(profile.dominantGenreId, warnings);
    const secondaries: GenreCardJson[] = [];
    for (const genreId of profile.secondaryGenreIds) {
      const card = this.resolveGenre(genreId, warnings);
      if (card && card.id !== dominant?.id) {
        secondaries.push(card);
      }
    }

    const selected = new Set<string>();
    if (dominant) {
      selected.add(dominant.id);
    }
    for (const card of secondaries) {
      selected.add(card.id);
    }

    for (const genreId of Object.keys(profile.subGenresByGenre)) {
      if (!selected.has(genreId)) {
        warnings.push({
          code: 'ORPHAN_SUBGENRE',
          message: `Os subgêneros de ${genreId} foram ignorados porque o gênero não está mais no perfil.`,
          genreId,
        });
      }
    }

    const subGenres: ResolvedSubGenre[] = [];
    const seen = new Set<string>();
    const collect = (card: GenreCardJson): void => {
      const names = profile.subGenresByGenre[card.id] ?? [];
      for (const resolved of resolveSubGenres(card, names)) {
        const key = `${resolved.parentGenreId}:${resolved.name}`;
        if (!seen.has(key)) {
          seen.add(key);
          subGenres.push(resolved);
        }
      }
      for (const name of findUnknownSubGenreNames(card, names)) {
        warnings.push({
          code: 'UNKNOWN_SUBGENRE_IN_PROFILE',
          message: `O subgênero “${name}” não consta em “${card.title}” no deck atual. Ele fica fora do contexto até ser reescolhido.`,
          genreId: card.id,
          subGenreName: name,
        });
      }
    };

    if (dominant) {
      collect(dominant);
    }
    for (const card of secondaries) {
      collect(card);
    }

    return {
      dominant,
      secondaries,
      subGenres,
      contract: { ...profile.contract },
      dimensions: { ...profile.dimensions },
      warnings,
    };
  }

  /**
   * Busca a carta ATIVA de gênero. Históricos (`GEN-003`…), cartas não-gênero e IDs
   * inexistentes viram aviso e são omitidos — nunca derrubam a projeção.
   */
  private resolveGenre(genreId: string, warnings: GenreWarning[]): GenreCardJson | undefined {
    const id = genreId.trim();
    if (!id) {
      return undefined;
    }
    const card = this.deck.index.getById(id);
    if (!card || card.kind !== 'genre_definition') {
      warnings.push({
        code: 'UNKNOWN_GENRE_IN_PROFILE',
        message: `O gênero ${id} não é uma carta de gênero ativa do deck. Ele fica fora do contexto.`,
        genreId: id,
      });
      return undefined;
    }
    return card;
  }
}
