import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { Deck } from '../../src/domain/deck/deck';
import { SelectionService } from '../../src/application/services/selection-service';
import { JsonDeckLoader } from '../../src/infrastructure/deck/json-deck-loader';
import { JsonOperationLog } from '../../src/infrastructure/persistence/json-operation-log';
import {
  JsonSelectionRepository,
  SelectionConflictError,
} from '../../src/infrastructure/persistence/json-selection-repository';
import { seededRandom } from '../fixtures/seeded-random';

const deckPath = resolve(process.cwd(), 'resources', 'decks', 'entrelinhas-storytelling-v4.json');
const NOW = '2026-01-03T08:00:00.000Z';

let deck: Deck;
let root: string;

beforeAll(async () => {
  deck = await new JsonDeckLoader(deckPath).load();
});

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'storydeck-service-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

function createService(seed = 5): SelectionService {
  return new SelectionService({
    deck: { load: async () => deck, sourcePath: deckPath },
    repository: new JsonSelectionRepository({ projectId: 'projeto-servico', projectRoot: root, clock: () => NOW }),
    log: new JsonOperationLog({ projectRoot: root, clock: () => NOW }),
    random: seededRandom(seed),
    clock: () => NOW,
    idFactory: (prefix) => `${prefix}-teste`,
  });
}

describe('SelectionService — único escritor do agregado', () => {
  it('persiste cada mutação e registra a operação', async () => {
    const service = createService();
    const initial = await service.getSelection();
    expect(initial.selectedCardIds).toEqual([]);
    expect(initial.revision).toBe(0);

    const selected = await service.select('ST-001');
    expect(selected.selectedCardIds).toEqual(['ST-001']);
    expect(selected.revision).toBe(1);

    await service.toggle('ST-002');
    await service.toggle('ST-002');
    const final = await service.getSelection();
    expect(final.selectedCardIds).toEqual(['ST-001']);

    const reloaded = await createService().getSelection();
    expect(reloaded.selectedCardIds).toEqual(['ST-001']);
    expect(reloaded.revision).toBe(3);
  });

  it('não grava quando a operação é no-op', async () => {
    const service = createService();
    await service.favorite('ST-010');
    const before = (await service.getSelection()).revision;
    await service.favorite('ST-010');
    expect((await service.getSelection()).revision).toBe(before);
  });

  it('favorita, bloqueia e substitui mantendo invariantes', async () => {
    const service = createService();
    await service.select('ST-001');
    await service.select('ST-002');

    const favorited = await service.toggleFavorite('ST-004');
    expect(favorited.favoriteCardIds).toEqual(['ST-004']);
    const unfavorited = await service.toggleFavorite('ST-004');
    expect(unfavorited.favoriteCardIds).toEqual([]);

    const locked = await service.toggleLock('ST-001');
    expect(locked.lockedCardIds).toEqual(['ST-001']);
    await service.toggleLock('ST-001');

    const replaced = await service.replace('ST-002', 'ST-005');
    expect(replaced.selectedCardIds).toEqual(['ST-001', 'ST-005']);
  });

  it('sorteia do catálogo e persiste o resultado', async () => {
    const service = createService(9);
    const outcome = await service.draw({ count: 2, from: 'catalog', kinds: ['narrator'] });

    expect(outcome.drawnCardIds).toHaveLength(2);
    expect(outcome.selection.selectedCardIds).toEqual(outcome.drawnCardIds);

    const reloaded = await createService().getSelection();
    expect(reloaded.selectedCardIds).toEqual(outcome.drawnCardIds);
  });

  it('salva e restaura versões persistidas', async () => {
    const service = createService();
    await service.select('ST-001');
    const saved = await service.saveVersion('Primeira');
    expect(saved.versions).toHaveLength(1);

    await service.select('ST-002');
    const restored = await service.restoreVersion(saved.activeVersionId);
    expect(restored.selectedCardIds).toEqual(['ST-001']);

    const reloaded = await createService().getSelection();
    expect(reloaded.selectedCardIds).toEqual(['ST-001']);
    expect(reloaded.activeVersionId).toBe(saved.activeVersionId);
  });

  it('gerencia vínculos com validação de gênero', async () => {
    const service = createService();
    await service.select('ST-001');

    const linked = await service.addLink('ST-001', { type: 'scene', sceneId: 'cena-1' }, 'abertura');
    expect(linked.links).toHaveLength(1);

    const relocated = await service.relocateTarget(
      { type: 'scene', sceneId: 'cena-1' },
      { type: 'scene', sceneId: 'cena-2' },
    );
    expect(relocated.links[0]?.target).toEqual({ type: 'scene', sceneId: 'cena-2' });

    const removed = await service.removeLink('ST-001', { type: 'scene', sceneId: 'cena-2' });
    expect(removed.links).toEqual([]);

    await expect(
      service.addLink('ST-001', { type: 'genre', genreId: 'GEN-003' }),
    ).rejects.toMatchObject({ code: 'UNKNOWN_CARD' });
  });

  it('detecta escrita concorrente e recarrega do arquivo', async () => {
    const first = createService();
    await first.getSelection();

    const second = createService();
    await second.select('ST-001');

    await expect(first.select('ST-002')).rejects.toBeInstanceOf(SelectionConflictError);

    const refreshed = await first.getSelection();
    expect(refreshed.selectedCardIds).toEqual(['ST-001']);
    expect(refreshed.revision).toBe(1);
  });
});
