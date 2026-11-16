import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { Deck } from '../../src/domain/deck/deck';
import { GenreError } from '../../src/domain/genre/genre-error';
import { createEmptyGenreProfile } from '../../src/domain/genre/genre-profile';
import type { SpreadState } from '../../src/domain/narrative/spread';
import { GenreService } from '../../src/application/services/genre-service';
import { JsonDeckLoader } from '../../src/infrastructure/deck/json-deck-loader';
import {
  JsonStoryStateRepository,
  StoryStateConflictError,
} from '../../src/infrastructure/persistence/json-story-state-repository';

const deckPath = resolve(process.cwd(), 'resources', 'decks', 'entrelinhas-storytelling-v4.json');
const NOW = '2026-01-01T10:00:00.000Z';

const spreadState: SpreadState = {
  spreadId: 'identidade-da-obra',
  slotCardIds: { dominante: ['GEN-001'], secundario: [] },
  status: 'in-progress',
};

let deck: Deck;
let root: string;

beforeAll(async () => {
  deck = await new JsonDeckLoader(deckPath).load();
});

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'storydeck-genre-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

function createService(): GenreService {
  return new GenreService({
    deck: new JsonDeckLoader(deckPath),
    storyState: new JsonStoryStateRepository({ projectRoot: root, clock: () => NOW }),
    clock: () => NOW,
  });
}

async function readStoryState(): Promise<Record<string, any>> {
  return JSON.parse(await readFile(join(root, '.storydeck', 'story-state.json'), 'utf8')) as Record<string, any>;
}

describe('T43 — persistência do perfil de gênero em stepStates.genre', () => {
  it('persiste cada etapa mantendo spreads e demais stepStates', async () => {
    const directory = join(root, '.storydeck');
    await mkdir(directory, { recursive: true });
    await writeFile(
      join(directory, 'story-state.json'),
      JSON.stringify({
        schemaVersion: 1,
        revision: 3,
        stepStates: { premise: { approved: true } },
        spreads: [spreadState],
      }),
      'utf8',
    );

    const service = createService();
    expect(await service.getProfile()).toEqual(createEmptyGenreProfile());
    expect(await service.getRevision()).toBe(3);

    await service.setDominant('GEN-001');
    await service.addSecondary('GEN-006');
    const subGenres = await service.setSubGenres('GEN-001', ['Ficção de detetive']);
    expect(subGenres.accepted).toEqual(['Ficção de detetive']);
    expect(subGenres.unknown).toEqual([]);
    await service.setContract({ promise: 'O leitor quer investigar junto.' });
    await service.setDimensions({ tone: 'sombrio' });

    expect(await service.getRevision()).toBe(8);

    const raw = await readStoryState();
    expect(raw.revision).toBe(8);
    expect(raw.stepStates.premise).toEqual({ approved: true });
    expect(raw.spreads).toHaveLength(1);
    expect(raw.spreads[0].spreadId).toBe('identidade-da-obra');

    const genre = raw.stepStates.genre;
    expect(genre.schemaVersion).toBe(1);
    expect(genre.dominantGenreId).toBe('GEN-001');
    expect(genre.secondaryGenreIds).toEqual(['GEN-006']);
    expect(genre.subGenresByGenre).toEqual({ 'GEN-001': ['Ficção de detetive'] });
    expect(genre.contract.promise).toBe('O leitor quer investigar junto.');
    expect(genre.dimensions.tone).toBe('sombrio');
    expect(genre.updatedAt).toBe(NOW);

    const reloaded = createService();
    const profile = await reloaded.getProfile();
    expect(profile.dominantGenreId).toBe('GEN-001');
    expect(profile.secondaryGenreIds).toEqual(['GEN-006']);
    expect(profile.contract.promise).toBe('O leitor quer investigar junto.');
    expect(await reloaded.getRevision()).toBe(8);
  });

  it('não grava quando a operação não altera o perfil', async () => {
    const service = createService();
    await service.setDominant('GEN-001');
    expect(await service.getRevision()).toBe(1);

    await service.setDominant('GEN-001');
    await service.removeSecondary('GEN-006');
    expect(await service.getRevision()).toBe(1);
  });

  it('recusa o terceiro secundário sem tocar no arquivo', async () => {
    const service = createService();
    await service.setDominant('GEN-001');
    await service.addSecondary('GEN-006');
    await service.addSecondary('GEN-013');
    const before = await readStoryState();

    await expect(service.addSecondary('GEN-017')).rejects.toBeInstanceOf(GenreError);
    expect(await service.getRevision()).toBe(3);
    expect(await readStoryState()).toEqual(before);
  });

  it('sinaliza conflito de revisão e recarrega o arquivo após conflito', async () => {
    const staleService = createService();
    const freshService = createService();
    expect(await staleService.getProfile()).toEqual(createEmptyGenreProfile());
    expect(await freshService.getProfile()).toEqual(createEmptyGenreProfile());

    await staleService.setDominant('GEN-001');
    await expect(freshService.setContract({ promise: 'Promessa antiga.' })).rejects.toBeInstanceOf(
      StoryStateConflictError,
    );

    const reloaded = await freshService.getProfile();
    expect(reloaded.dominantGenreId).toBe('GEN-001');

    await freshService.setContract({ promise: 'Promessa atual.' });
    expect(await freshService.getRevision()).toBe(2);
    expect((await readStoryState()).stepStates.genre.dominantGenreId).toBe('GEN-001');
  });

  it('limpa o perfil e mantém o formato persistido', async () => {
    const service = createService();
    await service.setDominant('GEN-001');
    await service.setSubGenres('GEN-001', ['Ficção de detetive']);
    await service.clear();

    const profile = await service.getProfile();
    expect(profile).toEqual(createEmptyGenreProfile());
    const genre = (await readStoryState()).stepStates.genre;
    expect(genre.dominantGenreId).toBe('');
    expect(genre.subGenresByGenre).toEqual({});
  });

  it('expõe contexto com avisos a partir do perfil persistido', async () => {
    const service = createService();
    await service.setDominant('GEN-006');
    await service.addSecondary('GEN-001');
    await service.setSubGenres('GEN-006', ['psicológico']);

    const context = await service.getContext();
    expect(context.dominant?.id).toBe('GEN-006');
    expect(context.secondaries.map((card) => card.id)).toEqual(['GEN-001']);
    expect(context.subGenres[0]?.sourceCardId).toBe('GEN-008');
    expect(context.warnings).toEqual([]);
  });
});

describe('T43 — repositório de story-state para o gênero', () => {
  it('lê perfil vazio quando o passo ainda não existe e preserva spreads ao gravar', async () => {
    const repository = new JsonStoryStateRepository({ projectRoot: root, clock: () => NOW });
    expect(await repository.loadGenreStep()).toEqual(createEmptyGenreProfile());

    await repository.saveSpreadStates([spreadState], 0);
    const saved = await repository.saveGenreStep(
      {
        ...createEmptyGenreProfile(),
        dominantGenreId: 'GEN-001',
        secondaryGenreIds: ['GEN-006'],
      },
      1,
    );
    expect(saved.revision).toBe(2);

    const snapshot = await repository.load();
    expect(snapshot.spreads).toHaveLength(1);
    expect((snapshot.stepStates.genre as { dominantGenreId: string }).dominantGenreId).toBe('GEN-001');
    expect((await repository.loadGenreStep()).secondaryGenreIds).toEqual(['GEN-006']);

    await expect(repository.saveGenreStep(createEmptyGenreProfile(), 1)).rejects.toBeInstanceOf(
      StoryStateConflictError,
    );
  });
});
