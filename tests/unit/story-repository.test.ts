import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { StoryProjectConflictError } from '../../src/application/ports/project-repository';
import { StoryMigration } from '../../src/application/services/story-migration';
import type { Deck } from '../../src/domain/deck/deck';
import { JsonDeckLoader } from '../../src/infrastructure/deck/json-deck-loader';
import { JsonOperationLog } from '../../src/infrastructure/persistence/json-operation-log';
import { JsonProjectRepository } from '../../src/infrastructure/persistence/json-project-repository';
import { JsonStoryStateRepository } from '../../src/infrastructure/persistence/json-story-state-repository';

const deckPath = resolve(process.cwd(), 'resources', 'decks', 'entrelinhas-storytelling-v4.json');
const NOW = '2026-01-01T10:00:00.000Z';
let deck: Deck;

beforeAll(async () => {
  deck = await new JsonDeckLoader(deckPath).load();
});

describe('T49 — repositório v2 com revisão otimista', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'storydeck-v2-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('cria um stub v2 completo', async () => {
    const repo = new JsonProjectRepository(root, deck.meta.version, () => NOW);
    await repo.ensureStructure();
    const stored = await repo.load();
    expect(stored?.schemaVersion).toBe(2);
    expect(stored?.revision).toBe(0);
    expect(stored?.project.acts).toEqual([]);
    expect(stored?.project.genre.dominantGenreId).toBe('');
    const raw = JSON.parse(await readFile(join(root, '.storydeck', 'project.json'), 'utf8'));
    expect(raw.schemaVersion).toBe(2);
  });

  it('normaliza v1 em memória sem tocar no arquivo', async () => {
    const file = join(root, '.storydeck', 'project.json');
    const { mkdir } = await import('node:fs/promises');
    await mkdir(join(root, '.storydeck'), { recursive: true });
    await writeFile(file, JSON.stringify({
      schemaVersion: 1,
      deckVersion: '4.0.0',
      project: { id: 'v1-id', createdAt: NOW, updatedAt: NOW, identity: { title: 'Antigo', description: 'Descrição' } },
    }), 'utf8');

    const repo = new JsonProjectRepository(root, '4.0.0', () => NOW);
    const stored = await repo.load();
    expect(stored?.schemaVersion).toBe(2);
    expect(stored?.project.id).toBe('v1-id');
    expect(stored?.project.identity.provisionalTitle).toBe('Antigo');
    expect(stored?.project.identity.initialDescription).toBe('Descrição');
    expect(JSON.parse(await readFile(file, 'utf8')).schemaVersion).toBe(1);
  });

  it('recusa gravação com revisão divergente', async () => {
    const repo = new JsonProjectRepository(root, '4.0.0', () => NOW);
    await repo.ensureStructure();
    const stored = (await repo.load())!;
    const saved = await repo.save(stored, stored.revision);
    expect(saved.revision).toBe(1);
    await expect(repo.save(stored, stored.revision)).rejects.toBeInstanceOf(StoryProjectConflictError);
  });
});

describe('T50 — migração lazy e idempotente v1 → v2', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'storydeck-migration-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  async function writeV1(): Promise<void> {
    const dir = join(root, '.storydeck');
    const { mkdir } = await import('node:fs/promises');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'project.json'), JSON.stringify({
      schemaVersion: 1,
      deckVersion: '4.0.0',
      project: { id: 'migrar-1', createdAt: NOW, updatedAt: NOW, identity: { title: 'Obra', description: '' } },
    }), 'utf8');
    await writeFile(join(dir, 'story-state.json'), JSON.stringify({
      schemaVersion: 1,
      revision: 3,
      stepStates: {
        premise: { approved: true },
        genre: {
          schemaVersion: 1,
          dominantGenreId: 'GEN-001',
          secondaryGenreIds: ['GEN-006'],
          subGenresByGenre: { 'GEN-001': ['Ficção de detetive'] },
          contract: { promise: 'Promessa.', engine: '', conventions: '', freedom: '', reward: '' },
          dimensions: { tone: 'sombrio', atmosphere: '', setting: '', audience: '', format: '', approximateLength: '' },
          updatedAt: NOW,
        },
      },
      spreads: [{ spreadId: 'identidade-da-obra', slotCardIds: {}, status: 'complete' }],
      updatedAt: NOW,
    }), 'utf8');
  }

  function migration() {
    return new StoryMigration({
      projectRepository: new JsonProjectRepository(root, '4.0.0', () => NOW),
      storyState: new JsonStoryStateRepository({ projectRoot: root, clock: () => NOW }),
      log: new JsonOperationLog({ projectRoot: root, clock: () => NOW, idFactory: () => 'op-1' }),
    });
  }

  it('importa o gênero, grava v2 e remove apenas stepStates.genre', async () => {
    await writeV1();
    const result = await migration().migrate();

    expect(result.changed).toBe(true);
    expect(result.importedGenre?.dominantGenreId).toBe('GEN-001');

    const projectRaw = JSON.parse(await readFile(join(root, '.storydeck', 'project.json'), 'utf8'));
    expect(projectRaw.schemaVersion).toBe(2);
    expect(projectRaw.project.genre.dominantGenreId).toBe('GEN-001');
    expect(projectRaw.project.identity.provisionalTitle).toBe('Obra');

    const stateRaw = JSON.parse(await readFile(join(root, '.storydeck', 'story-state.json'), 'utf8'));
    expect(stateRaw.stepStates.genre).toBeUndefined();
    expect(stateRaw.stepStates.premise).toEqual({ approved: true });
    expect(stateRaw.spreads).toHaveLength(1);

    const journal = JSON.parse(await readFile(join(root, '.storydeck', 'decisions.json'), 'utf8'));
    expect(journal.operations[0].type).toBe('storyMigration.v1ToV2');
  });

  it('é idempotente e nunca reescreve um projeto já migrado', async () => {
    await writeV1();
    const first = await migration().migrate();
    const before = await readFile(join(root, '.storydeck', 'project.json'), 'utf8');

    const second = await migration().migrate();
    expect(second.changed).toBe(false);
    expect(second.revision).toBe(first.revision);
    expect(await readFile(join(root, '.storydeck', 'project.json'), 'utf8')).toBe(before);
  });
});
