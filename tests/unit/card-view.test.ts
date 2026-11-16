import { beforeAll, describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import type { Deck } from '../../src/domain/deck/deck';
import { DeckSelection } from '../../src/domain/selection/deck-selection';
import { filterCards, toCardSummary } from '../../src/extension/views/card-summary';
import { cardSummarySchema } from '../../src/shared/messages';
import { JsonDeckLoader } from '../../src/infrastructure/deck/json-deck-loader';

const deckPath = resolve(process.cwd(), 'resources', 'decks', 'entrelinhas-storytelling-v4.json');
const NOW = '2026-01-04T10:00:00.000Z';

let deck: Deck;

beforeAll(async () => {
  deck = await new JsonDeckLoader(deckPath).load();
});

function selectionWith(...cardIds: string[]): DeckSelection {
  let selection = DeckSelection.create('projeto-ui', NOW);
  for (const cardId of cardIds) {
    selection = selection.withSelected(cardId, deck.index, NOW);
  }
  return selection;
}

describe('projeção de cartas para a webview', () => {
  it('mantém a ordem da seleção na aba Selecionadas', () => {
    const selection = selectionWith('ST-002', 'ST-001');
    const cards = filterCards(deck, selection, { query: '', view: 'selection' });
    expect(cards.map((card) => card.id)).toEqual(['ST-002', 'ST-001']);
  });

  it('filtra favoritos sem depender do catálogo filtrado por texto', () => {
    let selection = selectionWith();
    selection = selection.withFavorite('ST-001', deck.index, NOW);
    selection = selection.withFavorite('GEN-001', deck.index, NOW);

    expect(filterCards(deck, selection, { query: '', view: 'favorites' }).map((card) => card.id)).toEqual([
      'GEN-001',
      'ST-001',
    ]);
    expect(
      filterCards(deck, selection, { query: 'misterio', view: 'favorites' }).map((card) => card.id),
    ).toEqual([]);
  });

  it('filtra por tipo, categoria e tag', () => {
    const selection = selectionWith();
    const byKind = filterCards(deck, selection, { query: '', kind: 'narrator' });
    expect(byKind.length).toBeGreaterThan(0);
    expect(byKind.every((card) => card.kind === 'narrator')).toBe(true);

    const byCategory = filterCards(deck, selection, { query: '', categoryId: 'CAT-10' });
    expect(byCategory.every((card) => card.category_id === 'CAT-10')).toBe(true);

    const tag = deck.index.allCards().find((card) => card.tags.length > 0)!.tags[0]!;
    const byTag = filterCards(deck, selection, { query: '', tag: tag.toUpperCase() });
    expect(byTag.length).toBeGreaterThan(0);
    expect(byTag.every((card) => card.tags.includes(tag))).toBe(true);
  });

  it('ignora tipo inválido em vez de devolver catálogo vazio por engano', () => {
    const selection = selectionWith();
    const cards = filterCards(deck, selection, { query: '', kind: 'tipo-inexistente' });
    expect(cards).toHaveLength(deck.cards.length);
  });

  it('projeta carta de gênero com o conteúdo integral e o estado persistido', () => {
    let selection = selectionWith('GEN-001');
    selection = selection.withFavorite('GEN-001', deck.index, NOW);
    selection = selection.withLocked('GEN-001', NOW);

    const card = deck.index.getById('GEN-001')!;
    const category = deck.categories.find((item) => item.id === card.category_id);
    const summary = toCardSummary(card, category, selection);

    expect(cardSummarySchema.safeParse(summary).success).toBe(true);
    expect(summary.selected).toBe(true);
    expect(summary.favorite).toBe(true);
    expect(summary.locked).toBe(true);
    expect(summary.readerPromise).toBe(card.kind === 'genre_definition' ? card.reader_promise : undefined);
    expect(summary.subGenres).toEqual(card.kind === 'genre_definition' ? card.sub_genre : undefined);
    expect(summary.subGenreDetails?.length).toBe(
      card.kind === 'genre_definition' ? card.sub_genre_details.length : -1,
    );
    expect(summary.genreAdaptation).toBeUndefined();
  });

  it('projeta carta não-gênero com adaptação e eixo de gênero', () => {
    const card = deck.index.getById('ST-001')!;
    const summary = toCardSummary(card, undefined, DeckSelection.create('projeto-ui', NOW));

    expect(cardSummarySchema.safeParse(summary).success).toBe(true);
    expect(summary.color).toBe('#888888');
    expect(summary.categoryName).toBe(card.category);
    expect(summary.genreAdaptation).toBe(card.kind === 'genre_definition' ? undefined : card.genre_adaptation);
    expect(summary.genreRelevantAxis).toBe(
      card.kind === 'genre_definition' ? undefined : card.genre_relevant_axis,
    );
    expect(summary.readerPromise).toBeUndefined();
    expect(summary.prompt).toBe(card.prompt);
  });
});
