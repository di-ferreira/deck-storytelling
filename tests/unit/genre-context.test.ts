import { beforeAll, describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import type { Deck } from '../../src/domain/deck/deck';
import { GenreContextBuilder } from '../../src/application/services/genre-context-builder';
import {
  createEmptyGenreProfile,
  type GenreProfile,
} from '../../src/domain/genre/genre-profile';
import { createCompatibleGenreIndex } from '../../src/domain/genre/compatible-genre-index';
import {
  addSecondaryGenre,
  setDominantGenre,
  setGenreSubGenres,
} from '../../src/domain/genre/genre-selection-policy';
import { resolveSubGenres } from '../../src/domain/genre/sub-genre-resolver';
import { JsonDeckLoader } from '../../src/infrastructure/deck/json-deck-loader';

const deckPath = resolve(process.cwd(), 'resources', 'decks', 'entrelinhas-storytelling-v4.json');

let deck: Deck;

beforeAll(async () => {
  deck = await new JsonDeckLoader(deckPath).load();
});

function buildProfile(mutate: (profile: GenreProfile) => GenreProfile): GenreProfile {
  return mutate(createEmptyGenreProfile());
}

describe('T41 — resolução 1:1 de subgêneros contra o deck real', () => {
  it('preserva source_card_id e devolve o nome canônico', () => {
    const thriller = deck.index.getById('GEN-006');
    expect(thriller?.kind).toBe('genre_definition');
    if (!thriller || thriller.kind !== 'genre_definition') {
      throw new Error('GEN-006 deveria ser um gênero ativo.');
    }

    const resolved = resolveSubGenres(thriller, ['  PSICOLÓGICO ', 'de ação']);
    expect(resolved).toHaveLength(2);
    expect(resolved[0]?.name).toBe('psicológico');
    expect(resolved[0]?.parentGenreId).toBe('GEN-006');
    expect(resolved[0]?.sourceCardId).toBe('GEN-008');
    expect(resolved[0]?.detail.source_card_id).toBe('GEN-008');
    expect(resolved[1]?.name).toBe('de ação');
    expect(resolved[1]?.sourceCardId).toBe('GEN-009');
  });

  it('resolve todos os 31 detalhes do deck sem converter source_card_id em carta', () => {
    const detailCards = deck.index
      .getGenreCards()
      .filter((card) => card.sub_genre_details.length > 0);
    expect(detailCards).toHaveLength(8);

    let total = 0;
    for (const card of detailCards) {
      const resolved = resolveSubGenres(
        card,
        card.sub_genre_details.map((detail) => detail.name),
      );
      expect(resolved, card.id).toHaveLength(card.sub_genre_details.length);
      for (const [index, item] of resolved.entries()) {
        const detail = card.sub_genre_details[index]!;
        expect(item.name).toBe(detail.name);
        expect(item.sourceCardId).toBe(detail.source_card_id);
        expect(item.parentGenreId).toBe(card.id);
        expect(deck.index.getById(item.sourceCardId)?.kind).not.toBe('genre_definition');
      }
      total += resolved.length;
    }
    expect(total).toBe(31);
  });

  it('omite nome desconhecido do contexto e registra aviso, nunca erro', () => {
    const profile = buildProfile((current) =>
      setDominantGenre(current, 'GEN-001', deck.index),
    );
    const withKnown = setGenreSubGenres(profile, 'GEN-001', ['Ficção de detetive'], deck.index).profile;
    const tampered: GenreProfile = {
      ...withKnown,
      subGenresByGenre: { 'GEN-001': ['Ficção de detetive', 'Subgênero inventado'] },
    };

    const context = new GenreContextBuilder(deck).build(tampered);
    expect(context.subGenres.map((item) => item.name)).toEqual(['Ficção de detetive']);
    const warning = context.warnings.find((item) => item.code === 'UNKNOWN_SUBGENRE_IN_PROFILE');
    expect(warning?.subGenreName).toBe('Subgênero inventado');
    expect(context.warnings.some((item) => item.code === 'ORPHAN_SUBGENRE')).toBe(false);
  });

  it('sinaliza subgênero órfão de gênero não selecionado e gênero inexistente', () => {
    const orphan = new GenreContextBuilder(deck).build({
      ...createEmptyGenreProfile(),
      dominantGenreId: 'GEN-001',
      subGenresByGenre: { 'GEN-006': ['psicológico'] },
    });
    expect(orphan.subGenres).toEqual([]);
    expect(orphan.warnings.map((item) => item.code)).toContain('ORPHAN_SUBGENRE');

    const unknown = new GenreContextBuilder(deck).build({
      ...createEmptyGenreProfile(),
      dominantGenreId: 'GEN-999',
      secondaryGenreIds: ['GEN-003'],
    });
    expect(unknown.dominant).toBeUndefined();
    expect(unknown.secondaries).toEqual([]);
    expect(unknown.warnings.filter((item) => item.code === 'UNKNOWN_GENRE_IN_PROFILE')).toHaveLength(2);
  });

  it('projeta dominante, secundários, contrato e dimensões sem persistir', () => {
    const profile = buildProfile((current) => {
      let next = setDominantGenre(current, 'GEN-006', deck.index);
      next = addSecondaryGenre(next, 'GEN-013', deck.index);
      next = setGenreSubGenres(next, 'GEN-006', ['psicológico', 'de ação'], deck.index).profile;
      return {
        ...next,
        contract: { ...next.contract, promise: 'Promessa do thriller.' },
        dimensions: { ...next.dimensions, tone: 'tenso' },
      };
    });

    const context = new GenreContextBuilder(deck).build(profile);
    expect(context.dominant?.id).toBe('GEN-006');
    expect(context.dominant?.title).toBe('Thriller');
    expect(context.secondaries.map((card) => card.id)).toEqual(['GEN-013']);
    expect(context.subGenres.map((item) => item.sourceCardId)).toEqual(['GEN-008', 'GEN-009']);
    expect(context.contract.promise).toBe('Promessa do thriller.');
    expect(context.dimensions.tone).toBe('tenso');
    expect(context.warnings).toEqual([]);
    expect(profile.dominantGenreId).toBe('GEN-006');
  });
});

describe('T42 — compatible_genres é consultivo', () => {
  const documentedUnmatched = [
    'Coming-of-age',
    'Experimental e metaficcional',
    'Fantasia épica',
    'Ficção policial',
    'Ficção política e social',
    'Horror',
    'Romance de suspense',
    'Thriller de ação',
    'Thriller jurídico',
    'Thriller médico e científico',
    'Thriller psicológico',
    'Western',
  ];

  it('mapeia rótulos conhecidos para gêneros ativos, sem criar cartas históricas', () => {
    const index = createCompatibleGenreIndex(deck.index.getGenreCards());
    expect(index.lookup('  MISTÉRIO  ')?.genreIds).toEqual(['GEN-001']);
    expect(index.lookup('Terror / horror')?.genreIds).toEqual(['GEN-047']);

    const subGenreLabel = index.resolve('Ficção de detetive');
    expect(subGenreLabel.matched).toBe(true);
    expect(subGenreLabel.genreIds).toEqual(['GEN-001']);
    expect(subGenreLabel.subGenreNames).toEqual(['Ficção de detetive']);
    expect(subGenreLabel.genreIds).not.toContain('GEN-003');
  });

  it('mantém os 12 rótulos documentados como texto puro, sem bloquear nada', () => {
    const index = createCompatibleGenreIndex(deck.index.getGenreCards());
    const resolutions = index.resolveAll(documentedUnmatched);
    expect(resolutions).toHaveLength(12);
    for (const [position, resolution] of resolutions.entries()) {
      expect(resolution.label).toBe(documentedUnmatched[position]);
      expect(resolution.matched, resolution.label).toBe(false);
      expect(resolution.genreIds).toEqual([]);
      expect(resolution.subGenreNames).toEqual([]);
    }
  });

  it('não interfere na seleção: combinações continuam permitidas', () => {
    let profile = setDominantGenre(createEmptyGenreProfile(), 'GEN-001', deck.index);
    profile = addSecondaryGenre(profile, 'GEN-033', deck.index);
    profile = addSecondaryGenre(profile, 'GEN-038', deck.index);
    expect(profile.secondaryGenreIds).toEqual(['GEN-033', 'GEN-038']);

    const index = createCompatibleGenreIndex(deck.index.getGenreCards());
    const fantasy = deck.index.getById('GEN-033');
    if (!fantasy || fantasy.kind !== 'genre_definition') {
      throw new Error('GEN-033 deveria ser um gênero ativo.');
    }
    for (const label of fantasy.compatible_genres) {
      expect(() => index.resolve(label)).not.toThrow();
    }
  });
});
