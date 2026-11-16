import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { Deck } from '../../src/domain/deck/deck';
import { DeckSelection } from '../../src/domain/selection/deck-selection';
import { SpreadEngine, SpreadError } from '../../src/application/services/spread-engine';
import { JsonDeckLoader } from '../../src/infrastructure/deck/json-deck-loader';
import { JsonStoryStateRepository } from '../../src/infrastructure/persistence/json-story-state-repository';
import { JsonSpreadCatalog } from '../../src/infrastructure/spread/json-spread-catalog';
import { seededRandom } from '../fixtures/seeded-random';

const deckPath = resolve(process.cwd(), 'resources', 'decks', 'entrelinhas-storytelling-v4.json');
const spreadsPath = resolve(process.cwd(), 'resources', 'spreads', 'entrelinhas-v4-spreads.json');
const NOW = '2026-01-02T09:00:00.000Z';

let deck: Deck;
let root: string;

beforeAll(async () => {
  deck = await new JsonDeckLoader(deckPath).load();
});

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'storydeck-engine-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

function engineFor(selection: DeckSelection, seed = 13): SpreadEngine {
  return new SpreadEngine({
    spreads: new JsonSpreadCatalog({ resourcePath: spreadsPath }),
    deck: { load: async () => deck, sourcePath: deckPath },
    selection: { getSelection: async () => selection },
    storyState: new JsonStoryStateRepository({ projectRoot: root, clock: () => NOW }),
    random: seededRandom(seed),
    clock: () => NOW,
  });
}

function selectionWith(...cardIds: string[]): DeckSelection {
  let selection = DeckSelection.create('projeto-engine', NOW);
  for (const cardId of cardIds) {
    selection = selection.withSelected(cardId, deck.index, NOW);
  }
  return selection;
}

describe('T35 — abertura de tiragem', () => {
  it('pré-preenche slots de seleção com cartas selecionadas que casam com o filtro', async () => {
    const engine = engineFor(selectionWith('GEN-001', 'GEN-002'));
    const state = await engine.start('identidade-da-obra');

    expect(state.spreadId).toBe('identidade-da-obra');
    expect(state.slotCardIds.dominante).toEqual(['GEN-001']);
    expect(state.slotCardIds.secundario).toEqual(['GEN-002']);
    expect(state.slotCardIds['tom-atmosfera']).toEqual([]);
    expect(state.status).toBe('in-progress');
    expect(state.result).toBeUndefined();
    expect(state.savedAt).toBeUndefined();
  });

  it('não repete a mesma carta em dois slots de seleção', async () => {
    const engine = engineFor(selectionWith('GEN-001', 'GEN-002', 'GEN-004'));
    const state = await engine.start('mistura-de-generos');

    expect(state.slotCardIds['genero-a']).toEqual(['GEN-001']);
    expect(state.slotCardIds['genero-b']).toEqual(['GEN-002']);
    expect(state.status).toBe('in-progress');
  });

  it('sem cartas selecionadas a tiragem começa idle', async () => {
    const engine = engineFor(DeckSelection.create('projeto-engine', NOW));
    const state = await engine.start('teste-de-coerencia');
    expect(state.status).toBe('idle');
    expect(Object.values(state.slotCardIds).flat()).toEqual([]);
  });

  it('rejeita tiragem desconhecida', async () => {
    const engine = engineFor(selectionWith('GEN-001'));
    await expect(engine.start('nao-existe')).rejects.toBeInstanceOf(SpreadError);
  });
});

describe('T36 — sorteio de slots', () => {
  it('sorteia do catálogo respeitando categoryIds', async () => {
    const engine = engineFor(selectionWith('GEN-001'), 21);
    const started = await engine.start('projeto-de-enredo');
    const outcome = await engine.drawSlot(started, 'estrutura', selectionWith('GEN-001'));

    expect(outcome.drawnCardIds).toHaveLength(1);
    const card = deck.index.getById(outcome.drawnCardIds[0]!);
    expect(card?.category_id).toBe('CAT-13');
    expect(outcome.state.slotCardIds.estrutura).toEqual(outcome.drawnCardIds);
    expect(outcome.state.status).toBe('in-progress');
    expect(outcome.insufficient).toBeUndefined();
  });

  it('exclui cartas bloqueadas do pool', async () => {
    const narrators = deck.index.getByKind('narrator').map((card) => card.id);
    const unlocked = narrators[narrators.length - 1]!;
    let selection = selectionWith(...narrators);
    for (const cardId of narrators.filter((id) => id !== unlocked)) {
      selection = selection.withLocked(cardId, NOW);
    }

    const engine = engineFor(selection);
    const started = await engine.start('teste-de-coerencia');
    const outcome = await engine.drawSlot(started, 'narrador', selection);

    expect(outcome.drawnCardIds).toEqual([unlocked]);
  });

  it('exclui cartas já usadas na tiragem e sinaliza pool insuficiente sem quebrar', async () => {
    const selection = selectionWith('GEN-001');
    const engine = engineFor(selection);
    const started = await engine.start('identidade-da-obra');

    const outcome = await engine.drawSlot(started, 'secundario', selection);
    expect(outcome.insufficient).toEqual({ slotId: 'secundario', requested: 1, available: 0 });
    expect(outcome.drawnCardIds).toEqual([]);
    expect(outcome.state).toBe(started);
  });

  it('sinaliza pool insuficiente em slot de seleção vazia', async () => {
    const empty = DeckSelection.create('projeto-engine', NOW);
    const engine = engineFor(empty);
    const started = await engine.start('mistura-de-generos');

    const outcome = await engine.drawSlot(started, 'genero-a', empty);
    expect(outcome.insufficient).toEqual({ slotId: 'genero-a', requested: 1, available: 0 });
    expect(outcome.state.status).toBe('idle');
  });

  it('rejeita slot desconhecido', async () => {
    const engine = engineFor(selectionWith('GEN-001'));
    const started = await engine.start('identidade-da-obra');
    await expect(
      engine.drawSlot(started, 'inexistente', selectionWith('GEN-001')),
    ).rejects.toBeInstanceOf(SpreadError);
  });
});

describe('T37 — resultado, citações e persistência', () => {
  it('gera resultado somente quando completo, citando IDs, títulos e o drawText original', async () => {
    const selection = selectionWith('GEN-001', 'GEN-002');
    const engine = engineFor(selection);
    const identity = await engine.start('identidade-da-obra');
    const draw = await engine.drawSlot(identity, 'tom-atmosfera', selection);

    const state = draw.state;
    expect(state.status).toBe('complete');
    expect(state.result).toBeDefined();

    const tomCardId = state.slotCardIds['tom-atmosfera']?.[0] ?? '';
    const tomCard = deck.index.getById(tomCardId);
    const source = deck.usage.recommended_spreads[0]!;

    expect(state.result).toContain(source.draw);
    expect(state.result).toContain(source.purpose);
    expect(state.result).toContain('[GEN-001] Mistério');
    expect(state.result).toContain(`[${tomCardId}] ${tomCard?.title}`);
  });

  it('não gera resultado parcial', async () => {
    const engine = engineFor(selectionWith('GEN-001'));
    const state = await engine.start('identidade-da-obra');
    expect(state.status).toBe('in-progress');
    expect(state.result).toBeUndefined();
  });

  it('persiste o estado preservando stepStates e permite retomar', async () => {
    await mkdir(join(root, '.storydeck'), { recursive: true });
    await writeFile(
      join(root, '.storydeck', 'story-state.json'),
      JSON.stringify({ schemaVersion: 1, stepStates: { act1: { done: true } }, spreads: [] }),
      'utf8',
    );

    const selection = selectionWith('GEN-001', 'GEN-002');
    const engine = engineFor(selection);
    const identity = await engine.start('identidade-da-obra');
    const complete = (await engine.drawSlot(identity, 'tom-atmosfera', selection)).state;
    expect(complete.status).toBe('complete');
    const saved = await engine.save(complete);

    expect(saved.savedAt).toBe(NOW);
    expect(saved.result).toBe(complete.result);
    expect(saved.result).toBeDefined();

    const loaded = await engine.loadState('identidade-da-obra');
    expect(loaded?.result).toBe(complete.result);
    expect(loaded?.slotCardIds.dominante).toEqual(['GEN-001']);
    expect(loaded?.savedAt).toBe(NOW);

    const snapshot = await new JsonStoryStateRepository({ projectRoot: root }).load();
    expect(snapshot.stepStates).toEqual({ act1: { done: true } });
    expect(snapshot.revision).toBe(1);
  });
});
