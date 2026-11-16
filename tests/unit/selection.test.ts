import { beforeAll, describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import type { Deck } from '../../src/domain/deck/deck';
import {
  DeckSelection,
  SelectionError,
  sampleWithoutReplacement,
} from '../../src/domain/selection/deck-selection';
import { JsonDeckLoader } from '../../src/infrastructure/deck/json-deck-loader';
import { seededRandom } from '../fixtures/seeded-random';

const deckPath = resolve(process.cwd(), 'resources', 'decks', 'entrelinhas-storytelling-v4.json');
const NOW = '2026-01-01T10:00:00.000Z';

let deck: Deck;

beforeAll(async () => {
  deck = await new JsonDeckLoader(deckPath).load();
});

function emptySelection(): DeckSelection {
  return DeckSelection.create('projeto-teste', NOW);
}

function expectCode(action: () => unknown, code: string): void {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(SelectionError);
    expect((error as SelectionError).code).toBe(code);
    return;
  }
  throw new Error(`Esperava SelectionError com código ${code}.`);
}

describe('T26 — seleção imutável e validação de IDs', () => {
  it('seleciona sem mutar o agregado anterior', () => {
    const empty = emptySelection();
    const first = empty.withSelected('ST-001', deck.index, NOW);
    const second = first.withSelected('ST-002', deck.index, NOW);

    expect(empty.selectedCardIds).toEqual([]);
    expect(first.selectedCardIds).toEqual(['ST-001']);
    expect(second.selectedCardIds).toEqual(['ST-001', 'ST-002']);
    expect(second.revision).toBe(2);
    expect(second.updatedAt).toBe(NOW);
  });

  it('rejeita ID histórico (GEN-003) e carta inexistente', () => {
    expectCode(() => emptySelection().withSelected('GEN-003', deck.index, NOW), 'UNKNOWN_CARD');
    expectCode(() => emptySelection().withSelected('NAO-EXISTE', deck.index, NOW), 'UNKNOWN_CARD');
  });

  it('rejeita duplicata explícita e desmarcação de carta ausente', () => {
    const selection = emptySelection().withSelected('ST-001', deck.index, NOW);
    expectCode(() => selection.withSelected('ST-001', deck.index, NOW), 'CARD_ALREADY_SELECTED');
    expectCode(() => emptySelection().withDeselected('ST-001', NOW), 'CARD_NOT_SELECTED');
  });

  it('desmarca, alterna e nunca duplica IDs', () => {
    const selection = emptySelection()
      .withSelected('ST-001', deck.index, NOW)
      .withSelected('ST-002', deck.index, NOW);
    const removed = selection.withDeselected('ST-001', NOW);
    expect(removed.selectedCardIds).toEqual(['ST-002']);

    const toggledOff = removed.withToggled('ST-002', deck.index, NOW);
    expect(toggledOff.selectedCardIds).toEqual([]);
    const toggledOn = toggledOff.withToggled('ST-004', deck.index, NOW);
    expect(toggledOn.selectedCardIds).toEqual(['ST-004']);
  });
});

describe('T27 — favoritos independentes e bloqueio', () => {
  it('favorita carta fora da seleção', () => {
    const selection = emptySelection().withFavorite('ST-010', deck.index, NOW);
    expect(selection.selectedCardIds).toEqual([]);
    expect(selection.favoriteCardIds).toEqual(['ST-010']);
    expect(selection.isFavorite('ST-010')).toBe(true);
  });

  it('rejeita favorito inexistente e mantém favorito ao desselecionar', () => {
    expectCode(() => emptySelection().withFavorite('GEN-003', deck.index, NOW), 'UNKNOWN_CARD');

    const selection = emptySelection()
      .withSelected('ST-010', deck.index, NOW)
      .withFavorite('ST-010', deck.index, NOW)
      .withDeselected('ST-010', NOW);
    expect(selection.favoriteCardIds).toEqual(['ST-010']);
  });

  it('só bloqueia carta selecionada e mantém bloqueio como subconjunto', () => {
    expectCode(() => emptySelection().withLocked('ST-010', NOW), 'CARD_NOT_SELECTED');

    const selection = emptySelection()
      .withSelected('ST-010', deck.index, NOW)
      .withSelected('ST-011', deck.index, NOW)
      .withLocked('ST-010', NOW);
    expect(selection.lockedCardIds).toEqual(['ST-010']);

    const deselected = selection.withDeselected('ST-010', NOW);
    expect(deselected.lockedCardIds).toEqual([]);
    expect(deselected.selectedCardIds).toEqual(['ST-011']);
  });
});

describe('T28 — substituição preserva posição e respeita bloqueio', () => {
  it('substitui mantendo o índice', () => {
    const selection = emptySelection()
      .withSelected('ST-001', deck.index, NOW)
      .withSelected('ST-002', deck.index, NOW)
      .withSelected('ST-004', deck.index, NOW);

    const replaced = selection.withReplaced('ST-002', 'ST-005', deck.index, NOW);
    expect(replaced.selectedCardIds).toEqual(['ST-001', 'ST-005', 'ST-004']);
  });

  it('rejeita carta bloqueada, já selecionada e inexistente', () => {
    const selection = emptySelection()
      .withSelected('ST-001', deck.index, NOW)
      .withSelected('ST-002', deck.index, NOW)
      .withSelected('ST-004', deck.index, NOW)
      .withLocked('ST-002', NOW);

    expectCode(() => selection.withReplaced('ST-002', 'ST-005', deck.index, NOW), 'CARD_LOCKED');
    expectCode(() => selection.withReplaced('ST-001', 'ST-004', deck.index, NOW), 'CARD_ALREADY_SELECTED');
    expectCode(() => selection.withReplaced('ST-001', 'GEN-003', deck.index, NOW), 'UNKNOWN_CARD');
  });
});

describe('T29 — sorteios determinísticos', () => {
  it('sorteia do catálogo sem duplicar e repete com a mesma semente', () => {
    const request = { count: 3, from: 'catalog' as const, kinds: ['narrator' as const] };
    const first = emptySelection().withDrawn(request, deck.index, seededRandom(7).next, NOW);
    const second = emptySelection().withDrawn(request, deck.index, seededRandom(7).next, NOW);

    expect(first.drawnCardIds).toHaveLength(3);
    expect(new Set(first.drawnCardIds).size).toBe(3);
    expect(first.drawnCardIds).toEqual(second.drawnCardIds);
    expect(first.drawnCardIds.every((id) => deck.index.getById(id)?.kind === 'narrator')).toBe(true);
    expect(first.selection.selectedCardIds).toEqual(first.drawnCardIds);
  });

  it('nunca devolve carta já selecionada e sinaliza pool insuficiente', () => {
    const selection = emptySelection().withSelected('ST-091', deck.index, NOW);
    const outcome = selection.withDrawn(
      { count: 2, from: 'catalog', kinds: ['narrator'] },
      deck.index,
      seededRandom(11).next,
      NOW,
    );
    expect(outcome.drawnCardIds).not.toContain('ST-091');

    expectCode(
      () =>
        emptySelection().withDrawn(
          { count: 13, from: 'catalog', categoryIds: ['CAT-10'] },
          deck.index,
          seededRandom(1).next,
          NOW,
        ),
      'POOL_INSUFFICIENT',
    );
  });

  it('sorteia entre selecionadas sem alterar o conjunto', () => {
    let selection = emptySelection();
    for (const id of ['ST-091', 'ST-092', 'ST-093', 'ST-094', 'ST-095']) {
      selection = selection.withSelected(id, deck.index, NOW);
    }
    const before = [...selection.selectedCardIds];
    const outcome = selection.withDrawn(
      { count: 2, from: 'selection' },
      deck.index,
      seededRandom(5).next,
      NOW,
    );

    expect(outcome.drawnCardIds).toHaveLength(2);
    expect(outcome.drawnCardIds.every((id) => before.includes(id))).toBe(true);
    expect(outcome.selection.selectedCardIds).toEqual(before);
  });

  it('nunca sorteia carta bloqueada', () => {
    const narrators = deck.index
      .getByKind('narrator')
      .map((card) => card.id);
    let selection = emptySelection();
    for (const id of narrators) {
      selection = selection.withSelected(id, deck.index, NOW);
    }
    const unlocked = narrators[narrators.length - 1]!;
    for (const id of narrators.filter((item) => item !== unlocked)) {
      selection = selection.withLocked(id, NOW);
    }

    const outcome = selection.withDrawn(
      { count: 1, from: 'selection' },
      deck.index,
      seededRandom(3).next,
      NOW,
    );
    expect(outcome.drawnCardIds).toEqual([unlocked]);
  });

  it('amostra sem reposição é estável e limitada', () => {
    const random = seededRandom(9).next;
    const sample = sampleWithoutReplacement([1, 2, 3, 4, 5], 5, random);
    expect(new Set(sample).size).toBe(5);
    expect(sampleWithoutReplacement([1, 2], 5, seededRandom(1).next)).toHaveLength(2);
  });
});

describe('T30 — embaralhar e histórico de versões', () => {
  it('embaralha como permutação da seleção', () => {
    let selection = emptySelection();
    for (const id of ['ST-001', 'ST-002', 'ST-004', 'ST-005', 'ST-006']) {
      selection = selection.withSelected(id, deck.index, NOW);
    }
    const shuffled = selection.withShuffled(seededRandom(3).next, NOW);

    expect([...shuffled.selectedCardIds].sort()).toEqual([...selection.selectedCardIds].sort());
    expect(shuffled.selectedCardIds).not.toEqual(selection.selectedCardIds);
    expect(selection.selectedCardIds).toEqual(['ST-001', 'ST-002', 'ST-004', 'ST-005', 'ST-006']);
  });

  it('embaralhar seleção vazia é no-op', () => {
    const selection = emptySelection();
    expect(selection.withShuffled(seededRandom(3).next, NOW)).toBe(selection);
  });

  it('salva e restaura versões com histórico append-only', () => {
    const base = emptySelection().withSelected('ST-001', deck.index, NOW);
    const saved = base.withVersionSaved('ver-1', 'Primeira seleção', NOW);
    expect(saved.versions).toHaveLength(1);
    expect(saved.versions[0]?.cardIds).toEqual(['ST-001']);
    expect(saved.activeVersionId).toBe('ver-1');

    const changed = saved.withSelected('ST-002', deck.index, NOW);
    expect(changed.activeVersionId).toBe('');

    const restored = changed.withVersionRestored('ver-1', deck.index, NOW);
    expect(restored.selectedCardIds).toEqual(['ST-001']);
    expect(restored.activeVersionId).toBe('ver-1');
    expect(restored.versions).toHaveLength(1);
  });

  it('rejeita versão inexistente', () => {
    expectCode(
      () => emptySelection().withVersionRestored('ver-inexistente', deck.index, NOW),
      'VERSION_NOT_FOUND',
    );
  });
});
