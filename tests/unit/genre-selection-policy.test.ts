import { beforeAll, describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import type { Deck } from '../../src/domain/deck/deck';
import {
  MAX_SECONDARY_GENRES,
  createEmptyGenreProfile,
  genreProfileFromJson,
  genreProfileToJson,
  type GenreProfile,
} from '../../src/domain/genre/genre-profile';
import { GenreError } from '../../src/domain/genre/genre-error';
import {
  addSecondaryGenre,
  clearGenreProfile,
  isGenreDraft,
  removeSecondaryGenre,
  setDominantGenre,
  setGenreContract,
  setGenreSubGenres,
  setIdentityDimensions,
} from '../../src/domain/genre/genre-selection-policy';
import { JsonDeckLoader } from '../../src/infrastructure/deck/json-deck-loader';

const deckPath = resolve(process.cwd(), 'resources', 'decks', 'entrelinhas-storytelling-v4.json');

let deck: Deck;

beforeAll(async () => {
  deck = await new JsonDeckLoader(deckPath).load();
});

function withGenres(...genreIds: readonly string[]): GenreProfile {
  let profile = createEmptyGenreProfile();
  for (const genreId of genreIds) {
    profile = setDominantGenre(profile, genreId, deck.index);
  }
  return profile;
}

describe('T11 — gênero dominante e secundários', () => {
  it('começa como rascunho sem erro e aceita um dominante único', () => {
    const draft = createEmptyGenreProfile();
    expect(isGenreDraft(draft)).toBe(true);
    expect(draft.dominantGenreId).toBe('');
    expect(draft.secondaryGenreIds).toEqual([]);

    const profile = setDominantGenre(draft, 'GEN-001', deck.index);
    expect(isGenreDraft(profile)).toBe(false);
    expect(profile.dominantGenreId).toBe('GEN-001');
    expect(draft).toEqual(createEmptyGenreProfile());
    expect(isGenreDraft(setDominantGenre(profile, '', deck.index))).toBe(true);
  });

  it('aceita de 0 a 2 secundários e recusa o terceiro com mensagem editorial', () => {
    let profile = withGenres('GEN-001');
    expect(MAX_SECONDARY_GENRES).toBe(2);

    profile = addSecondaryGenre(profile, 'GEN-006', deck.index);
    profile = addSecondaryGenre(profile, 'GEN-013', deck.index);
    expect(profile.secondaryGenreIds).toEqual(['GEN-006', 'GEN-013']);

    let error: unknown;
    try {
      addSecondaryGenre(profile, 'GEN-017', deck.index);
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(GenreError);
    expect((error as GenreError).code).toBe('SECONDARY_LIMIT');
    expect((error as Error).message).toContain('máximo 2');
    expect((error as Error).message).toContain('dominante');
  });

  it('nunca permite o dominante nos secundários e promove removendo o antigo secundário', () => {
    let profile = withGenres('GEN-001');
    expect(() => addSecondaryGenre(profile, 'GEN-001', deck.index)).toThrowError(GenreError);

    profile = addSecondaryGenre(profile, 'GEN-006', deck.index);
    profile = setDominantGenre(profile, 'GEN-006', deck.index);
    expect(profile.dominantGenreId).toBe('GEN-006');
    expect(profile.secondaryGenreIds).not.toContain('GEN-006');
  });

  it('rejeita secundário duplicado e preserva a ordem ao deduplicar o JSON', () => {
    let profile = withGenres('GEN-001');
    profile = addSecondaryGenre(profile, 'GEN-006', deck.index);
    expect(() => addSecondaryGenre(profile, 'GEN-006', deck.index)).toThrowError(GenreError);

    const hydrated = genreProfileFromJson({
      dominantGenreId: 'GEN-001',
      secondaryGenreIds: ['GEN-006', 'GEN-013', 'GEN-006', 'GEN-001'],
      subGenresByGenre: {},
      contract: createEmptyGenreProfile().contract,
      dimensions: createEmptyGenreProfile().dimensions,
    });
    expect(hydrated.secondaryGenreIds).toEqual(['GEN-006', 'GEN-013']);
  });

  it('valida IDs no catálogo ativo: histórico e não-gênero são recusados', () => {
    const base = createEmptyGenreProfile();
    expect(() => setDominantGenre(base, 'GEN-999', deck.index)).toThrowError(GenreError);
    try {
      setDominantGenre(base, 'GEN-003', deck.index);
      throw new Error('deveria ter recusado o histórico GEN-003');
    } catch (error) {
      expect(error).toBeInstanceOf(GenreError);
      expect((error as GenreError).code).toBe('UNKNOWN_GENRE');
    }
    try {
      setDominantGenre(base, 'ST-001', deck.index);
      throw new Error('deveria ter recusado a carta não-gênero ST-001');
    } catch (error) {
      expect(error).toBeInstanceOf(GenreError);
      expect((error as GenreError).code).toBe('NOT_A_GENRE');
    }
    expect(deck.index.isGenre('GEN-001')).toBe(true);
    expect(deck.index.getGenreCards()).toHaveLength(32);
  });

  it('remove gênero e seus subgêneros, preservando os demais', () => {
    let profile = withGenres('GEN-001');
    profile = addSecondaryGenre(profile, 'GEN-006', deck.index);
    profile = setGenreSubGenres(profile, 'GEN-006', ['psicológico'], deck.index).profile;
    profile = setGenreSubGenres(profile, 'GEN-001', ['Ficção de detetive'], deck.index).profile;
    expect(profile.subGenresByGenre['GEN-006']).toEqual(['psicológico']);

    profile = removeSecondaryGenre(profile, 'GEN-006');
    expect(profile.secondaryGenreIds).toEqual([]);
    expect(profile.subGenresByGenre['GEN-006']).toBeUndefined();
    expect(profile.subGenresByGenre['GEN-001']).toEqual(['Ficção de detetive']);
  });

  it('recusa subgênero de gênero não selecionado e sinaliza nome desconhecido como aviso', () => {
    const profile = withGenres('GEN-001');
    expect(() => setGenreSubGenres(profile, 'GEN-006', ['psicológico'], deck.index)).toThrowError(GenreError);

    const result = setGenreSubGenres(profile, 'GEN-001', ['Ficção de detetive', 'Subgênero inventado'], deck.index);
    expect(result.accepted).toEqual(['Ficção de detetive']);
    expect(result.unknown).toEqual(['Subgênero inventado']);
    expect(result.profile.subGenresByGenre['GEN-001']).toEqual(['Ficção de detetive']);
  });

  it('limpa o perfil quando solicitado', () => {
    let profile = withGenres('GEN-001');
    profile = addSecondaryGenre(profile, 'GEN-006', deck.index);
    expect(clearGenreProfile()).toEqual(createEmptyGenreProfile());
  });
});

describe('T12 — dimensões de identidade independentes do gênero', () => {
  it('tom, atmosfera, cenário, público e formato não alteram gêneros', () => {
    let profile = withGenres('GEN-001');
    profile = addSecondaryGenre(profile, 'GEN-006', deck.index);
    profile = setGenreSubGenres(profile, 'GEN-001', ['Ficção de detetive'], deck.index).profile;
    const before = genreProfileToJson(profile);

    profile = setIdentityDimensions(profile, { tone: 'sombrio' });
    profile = setIdentityDimensions(profile, { atmosphere: 'opressiva', setting: 'cidade portuária' });
    profile = setIdentityDimensions(profile, { audience: 'jovem adulto', format: 'romance', approximateLength: '80 mil palavras' });

    expect(profile.dominantGenreId).toBe(before.dominantGenreId);
    expect(profile.secondaryGenreIds).toEqual(before.secondaryGenreIds);
    expect(profile.subGenresByGenre).toEqual(before.subGenresByGenre);
    expect(profile.contract).toEqual(before.contract);
    expect(profile.dimensions).toEqual({
      tone: 'sombrio',
      atmosphere: 'opressiva',
      setting: 'cidade portuária',
      audience: 'jovem adulto',
      format: 'romance',
      approximateLength: '80 mil palavras',
    });
    expect(profile.dominantGenreId).not.toBe('sombrio');
    expect(profile.secondaryGenreIds).not.toContain('cidade portuária');
  });

  it('contrato e dimensões são campos separados e parciais preservam o restante', () => {
    let profile = createEmptyGenreProfile();
    profile = setGenreContract(profile, { promise: 'Uma promessa de mistério.' });
    profile = setGenreContract(profile, { engine: 'A investigação avança.' });
    profile = setIdentityDimensions(profile, { tone: 'melancólico' });

    expect(profile.contract.promise).toBe('Uma promessa de mistério.');
    expect(profile.contract.engine).toBe('A investigação avança.');
    expect(profile.contract.conventions).toBe('');
    expect(profile.dimensions.tone).toBe('melancólico');
    expect(profile.dimensions.setting).toBe('');
    expect(profile.dominantGenreId).toBe('');
  });
});
