import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { JsonDeckLoader, expectationsForVersion } from '../../src/infrastructure/deck/json-deck-loader';
import { ENTRELINHAS_V4_EXPECTATIONS, validateDeck } from '../../src/domain/deck/deck-validation';
import { deckSchema } from '../../src/shared/schemas/deck';

const deckPath = resolve(process.cwd(), 'resources', 'decks', 'entrelinhas-storytelling-v4.json');

async function loadDeck() {
  return new JsonDeckLoader(deckPath).load();
}

describe('ENTRELINHAS v4 — integridade do catálogo oficial', () => {
  it('carrega 210 cartas e 17 categorias sem erros estruturais', async () => {
    const deck = await loadDeck();
    expect(deck.cards).toHaveLength(210);
    expect(deck.categories).toHaveLength(17);
    expect(deck.meta.version).toBe('4.0.0');
    expect(deck.meta.deckId).toBe('entrelinhas-storytelling-v4');
    expect(deck.findings.filter((item) => item.severity === 'error')).toHaveLength(0);
  });

  it('respeita as contagens por tipo (T01)', async () => {
    const deck = await loadDeck();
    expect(deck.index.countsByKind).toEqual({
      genre_definition: 32,
      creative_prompt: 89,
      technique: 34,
      archetype: 26,
      structure: 15,
      narrator: 12,
      craft_warning: 2,
    });
  });

  it('tem IDs únicos e categorias válidas (T02)', async () => {
    const deck = await loadDeck();
    const ids = deck.cards.map((card) => card.id);
    expect(new Set(ids).size).toBe(210);
    const categoryIds = new Set(deck.categories.map((category) => category.id));
    expect(deck.cards.every((card) => categoryIds.has(card.category_id))).toBe(true);
  });

  it('preserva genre_adaptation e genre_relevant_axis nas 178 cartas não-gênero (T04)', async () => {
    const deck = await loadDeck();
    const nonGenre = deck.cards.filter((card) => card.kind !== 'genre_definition');
    expect(nonGenre).toHaveLength(178);
    expect(nonGenre.every((card) => card.kind !== 'genre_definition' && !!card.genre_adaptation && !!card.genre_relevant_axis)).toBe(true);
  });

  it('mantém os 12 campos específicos nas 32 cartas de gênero', async () => {
    const deck = await loadDeck();
    const genres = deck.index.getGenreCards();
    expect(genres).toHaveLength(32);
    expect(genres.every((genre) => !!genre.reader_promise && !!genre.story_engine && !!genre.core_conventions && !!genre.pitfalls && !!genre.genre_family && !!genre.genre_level)).toBe(true);
  });

  it('mantém 8 cartas-mãe e 31 detalhes de subgênero coerentes (T06)', async () => {
    const deck = await loadDeck();
    const withSubgenres = deck.index.getGenreCards().filter((genre) => genre.sub_genre_details.length > 0);
    const details = withSubgenres.flatMap((genre) => genre.sub_genre_details);
    expect(withSubgenres).toHaveLength(8);
    expect(details).toHaveLength(31);
    for (const genre of withSubgenres) {
      expect(genre.sub_genre.length).toBe(genre.sub_genre_details.length);
      expect(genre.sub_genre_details.every((detail) => !!detail.source_card_id && !!detail.name)).toBe(true);
    }
  });

  it('trata source_card_id como rastreabilidade, sem adicionar cartas históricas (T07)', async () => {
    const deck = await loadDeck();
    const active = new Set(deck.cards.map((card) => card.id));
    const historical = deck.index.getGenreCards().flatMap((genre) => genre.sub_genre_details.map((detail) => detail.source_card_id));
    expect(historical).toHaveLength(31);
    expect(historical.every((id) => !active.has(id))).toBe(true);
  });

  it('classifica rótulos não exatos de compatible_genres como aviso (T08)', async () => {
    const deck = await loadDeck();
    const warning = deck.findings.find((item) => item.code === 'COMPATIBLE_GENRE_LABELS');
    expect(warning?.severity).toBe('warning');
    expect(warning?.message).toContain('12 rótulos');
  });

  it('valida a auditoria editorial 243 → 210 (T09)', async () => {
    const deck = await loadDeck();
    const audit = deck.editorialAudit;
    expect(audit.source_card_count).toBe(243);
    expect(audit.result_card_count).toBe(210);
    expect(audit.genre_cards_before).toBe(63);
    expect(audit.genre_cards_after).toBe(32);
    expect(deck.findings.some((item) => item.code.startsWith('AUDIT_') && item.severity === 'error')).toBe(false);
  });

  it('o loader não altera o conteúdo original do deck (T10)', async () => {
    const first = await loadDeck();
    const second = await loadDeck();
    expect(first.cards[0].title).toBe(second.cards[0].title);
    expect(first.cards).toHaveLength(second.cards.length);
  });

  it('busca no catálogo real sem remover cartas', async () => {
    const deck = await loadDeck();
    expect(deck.index.search('cliffhanger').length).toBeGreaterThan(0);
    expect(deck.index.search('', 'CAT-10')).toHaveLength(12);
    expect(deck.index.search('termo-que-nao-existe-xyz')).toHaveLength(0);
    expect(deck.cards).toHaveLength(210);
  });

  it('parametriza expectativas por versão', () => {
    expect(expectationsForVersion('4.0.0')).toEqual(ENTRELINHAS_V4_EXPECTATIONS);
    expect(expectationsForVersion('5.0.0')).toEqual({});
  });

  it('expõe índices por source_concept e subgênero -> gênero-mãe', async () => {
    const deck = await loadDeck();
    expect(deck.index.getBySourceConcept('Mistério').map((card) => card.id)).toContain('GEN-001');
    expect(deck.index.getParentGenreId('Ficção de detetive')).toBe('GEN-001');
    expect(deck.index.subGenreParents.size).toBe(31);
    expect(deck.index.getParentGenreId('Subgênero inexistente')).toBeUndefined();
    expect(deck.index.allCards()).toHaveLength(210);
  });

  it('promove RECOMMENDED_SPREADS a erro quando faltam tiragens', async () => {
    const deck = await loadDeck();
    expect(deck.findings.some((item) => item.code === 'RECOMMENDED_SPREADS')).toBe(false);

    const raw = JSON.parse(
      await readFile(resolve(process.cwd(), 'deck_storytelling.json'), 'utf8'),
    ) as { usage: { recommended_spreads: unknown[] } };
    raw.usage.recommended_spreads = raw.usage.recommended_spreads.slice(0, 3);

    const findings = validateDeck(deckSchema.parse(raw), ENTRELINHAS_V4_EXPECTATIONS);
    const spreadFinding = findings.find((item) => item.code === 'RECOMMENDED_SPREADS');
    expect(spreadFinding?.severity).toBe('error');
  });
});
