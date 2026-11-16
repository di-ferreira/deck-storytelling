import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { Deck } from '../../src/domain/deck/deck';
import { DeckSelection } from '../../src/domain/selection/deck-selection';
import type { SpreadState } from '../../src/domain/narrative/spread';
import { JsonDeckLoader } from '../../src/infrastructure/deck/json-deck-loader';
import { JsonOperationLog } from '../../src/infrastructure/persistence/json-operation-log';
import {
  JsonSelectionRepository,
  SelectionConflictError,
} from '../../src/infrastructure/persistence/json-selection-repository';
import {
  JsonStoryStateRepository,
  StoryStateConflictError,
} from '../../src/infrastructure/persistence/json-story-state-repository';

const deckPath = resolve(process.cwd(), 'resources', 'decks', 'entrelinhas-storytelling-v4.json');
const NOW = '2026-01-01T10:00:00.000Z';

let deck: Deck;
let root: string;

beforeAll(async () => {
  deck = await new JsonDeckLoader(deckPath).load();
});

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'storydeck-selection-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

function buildSelection(): DeckSelection {
  return DeckSelection.create('projeto-1', NOW)
    .withSelected('ST-001', deck.index, NOW)
    .withSelected('ST-002', deck.index, NOW)
    .withFavorite('ST-010', deck.index, NOW)
    .withLocked('ST-001', NOW)
    .withVersionSaved('ver-1', 'Rascunho', NOW)
    .withLinks(
      [
        {
          cardId: 'ST-001',
          target: { type: 'scene', sceneId: 'cena-1' },
          createdAt: NOW,
        },
      ],
      NOW,
    );
}

describe('T31 — persistência da seleção', () => {
  it('faz roundtrip completo com projeto injetado', async () => {
    const repository = new JsonSelectionRepository({
      projectId: 'projeto-1',
      projectRoot: root,
      clock: () => NOW,
    });
    expect(await repository.load()).toBeUndefined();

    const saved = await repository.save(buildSelection(), 0);
    expect(saved.revision).toBe(1);
    expect(saved.projectId).toBe('projeto-1');

    const filePath = join(root, '.storydeck', 'deck-selection.json');
    const raw = JSON.parse(await readFile(filePath, 'utf8')) as Record<string, unknown>;
    expect(raw.schemaVersion).toBe(1);
    expect(raw.projectId).toBe('projeto-1');
    expect(raw.revision).toBe(1);
    expect(raw.selectedCardIds).toEqual(['ST-001', 'ST-002']);
    expect(raw.lockedCardIds).toEqual(['ST-001']);

    const loaded = await repository.load();
    expect(loaded?.selectedCardIds).toEqual(['ST-001', 'ST-002']);
    expect(loaded?.favoriteCardIds).toEqual(['ST-010']);
    expect(loaded?.lockedCardIds).toEqual(['ST-001']);
    expect(loaded?.versions).toHaveLength(1);
    expect(loaded?.activeVersionId).toBe('ver-1');
    expect(loaded?.links).toHaveLength(1);
    expect(loaded?.revision).toBe(1);
  });

  it('trata revision ausente no stub da Fase 2 como 0', async () => {
    const directory = join(root, '.storydeck');
    const filePath = join(directory, 'deck-selection.json');
    await mkdir(directory, { recursive: true });
    await writeFile(
      filePath,
      JSON.stringify({
        schemaVersion: 1,
        selectedCardIds: ['ST-001'],
        favoriteCardIds: [],
        lockedCardIds: [],
        versions: [],
        links: [],
      }),
      'utf8',
    );

    const repository = new JsonSelectionRepository({ projectId: 'projeto-1', projectRoot: root });
    const loaded = await repository.load();
    expect(loaded?.revision).toBe(0);
    expect(loaded?.selectedCardIds).toEqual(['ST-001']);

    const saved = await repository.save(loaded!, 0);
    expect(saved.revision).toBe(1);
  });

  it('rejeita gravação com revisão divergente', async () => {
    const repository = new JsonSelectionRepository({
      projectId: 'projeto-1',
      projectRoot: root,
      clock: () => NOW,
    });
    await repository.save(buildSelection(), 0);

    const stale = buildSelection();
    await expect(repository.save(stale, 0)).rejects.toBeInstanceOf(SelectionConflictError);

    const current = await repository.load();
    const updated = await repository.save(stale, current!.revision);
    expect(updated.revision).toBe(2);
  });

  it('aceita filePath explícito', async () => {
    const filePath = join(root, 'estado', 'selecao.json');
    const repository = new JsonSelectionRepository({ projectId: 'p', filePath, clock: () => NOW });
    expect(repository.filePath).toBe(filePath);
    const saved = await repository.save(DeckSelection.create('p', NOW), 0);
    expect(saved.revision).toBe(1);
  });
});

const spreadState: SpreadState = {
  spreadId: 'identidade-da-obra',
  slotCardIds: { dominante: ['GEN-001'], secundario: [], 'tom-atmosfera': [] },
  status: 'in-progress',
};

describe('T38 — story-state e journal de operações', () => {
  it('persiste tiragens preservando stepStates', async () => {
    const filePath = join(root, '.storydeck', 'story-state.json');
    await mkdir(join(root, '.storydeck'), { recursive: true });
    await writeFile(
      filePath,
      JSON.stringify({
        schemaVersion: 1,
        stepStates: { premise: { approved: true } },
        spreads: [],
      }),
      'utf8',
    );

    const repository = new JsonStoryStateRepository({ projectRoot: root, clock: () => NOW });
    const initial = await repository.load();
    expect(initial.revision).toBe(0);
    expect(initial.stepStates).toEqual({ premise: { approved: true } });

    const saved = await repository.saveSpreadStates([spreadState], 0);
    expect(saved.revision).toBe(1);

    const reloaded = await repository.load();
    expect(reloaded.revision).toBe(1);
    expect(reloaded.spreads).toHaveLength(1);
    expect(reloaded.spreads[0]?.slotCardIds.dominante).toEqual(['GEN-001']);
    expect(reloaded.stepStates).toEqual({ premise: { approved: true } });

    await expect(repository.saveSpreadStates([], 0)).rejects.toBeInstanceOf(StoryStateConflictError);
  });

  it('inicia vazio quando story-state.json não existe', async () => {
    const repository = new JsonStoryStateRepository({ projectRoot: root });
    const snapshot = await repository.load();
    expect(snapshot).toEqual({ revision: 0, stepStates: {}, spreads: [] });
  });

  it('faz append-only no decisions.json sem conteúdo de manuscrito', async () => {
    const log = new JsonOperationLog({
      projectRoot: root,
      clock: () => NOW,
      idFactory: (() => {
        let counter = 0;
        return () => `op-${++counter}`;
      })(),
    });

    expect(await log.read()).toEqual([]);
    await log.append({ type: 'select', projectId: 'projeto-1', payload: { cardId: 'ST-001' } });
    await log.append({ type: 'draw', projectId: 'projeto-1', payload: { count: 2, drawnCardIds: ['ST-002'] } });

    const entries = await log.read();
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ id: 'op-1', at: NOW, type: 'select', projectId: 'projeto-1' });

    const raw = JSON.parse(
      await readFile(join(root, '.storydeck', 'decisions.json'), 'utf8'),
    ) as { schemaVersion: number; operations: unknown[] };
    expect(raw.schemaVersion).toBe(1);
    expect(raw.operations).toHaveLength(2);
    expect(JSON.stringify(raw)).not.toContain('manuscrito');
  });
});
