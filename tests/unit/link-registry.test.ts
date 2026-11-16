import { beforeAll, describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import type { Deck } from '../../src/domain/deck/deck';
import type { CardLinkTarget } from '../../src/domain/selection/deck-selection';
import { LinkRegistry, linkTargetKey, sameLinkTarget } from '../../src/domain/selection/link-registry';
import { SelectionError } from '../../src/domain/selection/selection-error';
import { JsonDeckLoader } from '../../src/infrastructure/deck/json-deck-loader';

const deckPath = resolve(process.cwd(), 'resources', 'decks', 'entrelinhas-storytelling-v4.json');
const NOW = '2026-01-01T10:00:00.000Z';

let deck: Deck;

beforeAll(async () => {
  deck = await new JsonDeckLoader(deckPath).load();
});

const project: CardLinkTarget = { type: 'project' };
const genreMystery: CardLinkTarget = { type: 'genre', genreId: 'GEN-001' };
const genreHistorical: CardLinkTarget = { type: 'genre', genreId: 'GEN-003' };
const sceneA: CardLinkTarget = { type: 'scene', sceneId: 'cena-1' };
const sceneB: CardLinkTarget = { type: 'scene', sceneId: 'cena-2' };
const chapterA: CardLinkTarget = { type: 'chapter', chapterId: 'cap-1' };

describe('T32 — LinkRegistry derivado de links', () => {
  it('indexa por carta, alvo e tipo', () => {
    const registry = new LinkRegistry([], deck.index)
      .addLink('ST-001', project, NOW)
      .addLink('ST-002', project, NOW)
      .addLink('ST-001', genreMystery, NOW)
      .addLink('ST-001', sceneA, NOW, 'cena de abertura');

    expect(registry.linksOfCard('ST-001').map((link) => linkTargetKey(link.target))).toEqual([
      'project',
      'genre:GEN-001',
      'scene:cena-1',
    ]);
    expect(registry.cardsForTarget(project)).toEqual(['ST-001', 'ST-002']);
    expect(registry.cardsForType('scene')).toEqual(['ST-001']);
    expect(registry.linksOfCard('ST-001')[2]?.note).toBe('cena de abertura');
  });

  it('aceita forward references de cena/ato/capítulo/personagem e valida gênero', () => {
    const registry = new LinkRegistry([], deck.index)
      .addLink('ST-001', sceneA, NOW)
      .addLink('ST-001', chapterA, NOW)
      .addLink('ST-001', { type: 'act', actId: 'ato-1' }, NOW)
      .addLink('ST-001', { type: 'character', characterId: 'personagem-1' }, NOW)
      .addLink('ST-001', { type: 'decision', decisionId: 'decisao-1' }, NOW)
      .addLink('ST-001', genreMystery, NOW);

    expect(registry.links).toHaveLength(6);
    expect(registry.cardsForType('character')).toEqual(['ST-001']);

    expect(() => registry.addLink('ST-002', genreHistorical, NOW)).toThrowError(SelectionError);
    try {
      registry.addLink('ST-002', genreHistorical, NOW);
    } catch (error) {
      expect((error as SelectionError).code).toBe('UNKNOWN_CARD');
    }
  });

  it('não muta o registro original e rejeita par duplicado', () => {
    const original = new LinkRegistry([], deck.index).addLink('ST-001', project, NOW);
    const extended = original.addLink('ST-002', project, NOW);

    expect(original.links).toHaveLength(1);
    expect(extended.links).toHaveLength(2);
    expect(() => extended.addLink('ST-001', project, NOW)).toThrowError(SelectionError);
    try {
      extended.addLink('ST-001', project, NOW);
    } catch (error) {
      expect((error as SelectionError).code).toBe('DUPLICATE_LINK');
    }
  });
});

describe('T33 — remoção e realocação de alvos', () => {
  it('remove apenas o par carta/alvo solicitado', () => {
    const registry = new LinkRegistry([], deck.index)
      .addLink('ST-001', sceneA, NOW)
      .addLink('ST-001', sceneB, NOW)
      .addLink('ST-002', sceneA, NOW);

    const removed = registry.removeLink('ST-001', sceneA);
    expect(removed.cardsForTarget(sceneA)).toEqual(['ST-002']);
    expect(removed.linksOfCard('ST-001').map((link) => linkTargetKey(link.target))).toEqual(['scene:cena-2']);
    expect(registry.links).toHaveLength(3);
  });

  it('realoca todos os vínculos de uma cena movida', () => {
    const registry = new LinkRegistry([], deck.index)
      .addLink('ST-001', sceneA, NOW)
      .addLink('ST-002', sceneA, NOW)
      .addLink('ST-003', sceneB, NOW);

    const moved = registry.relocateTarget(sceneA, { type: 'scene', sceneId: 'cena-9' });
    expect(moved.cardsForTarget({ type: 'scene', sceneId: 'cena-9' })).toEqual(['ST-001', 'ST-002']);
    expect(moved.cardsForTarget(sceneA)).toEqual([]);
    expect(moved.cardsForTarget(sceneB)).toEqual(['ST-003']);
  });

  it('compara alvos por tipo e identificador', () => {
    expect(sameLinkTarget(project, { type: 'project' })).toBe(true);
    expect(sameLinkTarget(sceneA, sceneB)).toBe(false);
    expect(linkTargetKey({ type: 'chapter', chapterId: 'x' })).toBe('chapter:x');
  });
});
