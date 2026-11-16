import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { Deck } from '../../src/domain/deck/deck';
import { JsonDeckLoader } from '../../src/infrastructure/deck/json-deck-loader';
import {
  JsonSpreadCatalog,
  SpreadCatalogError,
} from '../../src/infrastructure/spread/json-spread-catalog';

const deckPath = resolve(process.cwd(), 'resources', 'decks', 'entrelinhas-storytelling-v4.json');
const spreadsPath = resolve(process.cwd(), 'resources', 'spreads', 'entrelinhas-v4-spreads.json');

let deck: Deck;
let root: string;

beforeEach(async () => {
  deck = await new JsonDeckLoader(deckPath).load();
  root = await mkdtemp(join(tmpdir(), 'storydeck-spreads-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('T34 — tiragens como dados', () => {
  it('carrega as 4 tiragens com drawText e purpose idênticos ao deck', async () => {
    const catalog = new JsonSpreadCatalog({ resourcePath: spreadsPath });
    const spreads = await catalog.list();

    expect(spreads).toHaveLength(4);
    expect(spreads.map((spread) => spread.name)).toEqual(
      deck.usage.recommended_spreads.map((spread) => spread.name),
    );

    for (const [index, spread] of spreads.entries()) {
      const source = deck.usage.recommended_spreads[index]!;
      expect(spread.drawText).toBe(source.draw);
      expect(spread.purpose).toBe(source.purpose);
      expect(spread.custom).toBe(false);
    }
  });

  it('declara os slots conforme a especificação', async () => {
    const catalog = new JsonSpreadCatalog({ resourcePath: spreadsPath });
    const identity = await catalog.get('identidade-da-obra');
    const plot = await catalog.get('projeto-de-enredo');
    const coherence = await catalog.get('teste-de-coerencia');
    const mix = await catalog.get('mistura-de-generos');

    expect(identity?.slots.map((slot) => slot.id)).toEqual(['dominante', 'secundario', 'tom-atmosfera']);
    expect(identity?.slots[0]).toMatchObject({ kinds: ['genre_definition'], count: 1, source: 'selection' });
    expect(identity?.slots[1]).toMatchObject({ kinds: ['genre_definition'], count: 1, source: 'selection' });
    expect(identity?.slots[2]).toMatchObject({ categoryIds: ['CAT-05', 'CAT-16'], count: 1, source: 'deck' });

    expect(plot?.slots.map((slot) => slot.id)).toEqual(['dominante', 'estrutura', 'conflito', 'trama']);
    expect(plot?.slots.slice(1).map((slot) => slot.categoryIds)).toEqual([['CAT-13'], ['CAT-03'], ['CAT-14']]);

    expect(coherence?.slots.map((slot) => slot.id)).toEqual(['genero', 'narrador', 'tecnica', 'cena']);
    expect(coherence?.slots.slice(1).map((slot) => slot.categoryIds)).toEqual([
      ['CAT-10'],
      ['CAT-15'],
      ['CAT-06'],
    ]);

    expect(mix?.slots.map((slot) => slot.id)).toEqual(['genero-a', 'genero-b', 'conflito', 'personagem']);
    expect(mix?.slots.slice(2).map((slot) => slot.categoryIds)).toEqual([['CAT-03'], ['CAT-01']]);
    expect(mix?.slots[0]).toMatchObject({ kinds: ['genre_definition'], source: 'selection' });
  });

  it('mescla customizações marcando custom true e preservando o restante', async () => {
    const resource = JSON.parse(await readFile(spreadsPath, 'utf8')) as {
      schemaVersion: number;
      spreads: Array<Record<string, unknown>>;
    };
    const base = resource.spreads[0]!;
    const extra = {
      id: 'tiragem-do-usuario',
      name: 'Tiragem do usuário',
      purpose: 'Teste sintético.',
      drawText: '1 carta qualquer',
      custom: false,
      slots: [{ id: 'carta', label: 'Carta', count: 1, source: 'deck' }],
    };
    const customPath = join(root, 'custom.json');
    await writeFile(
      customPath,
      JSON.stringify({
        schemaVersion: 1,
        spreads: [{ ...base, name: 'Identidade (customizada)' }, extra],
      }),
      'utf8',
    );

    const catalog = new JsonSpreadCatalog({ resourcePath: spreadsPath, customPath });
    const spreads = await catalog.list();

    expect(spreads).toHaveLength(5);
    expect(spreads.find((spread) => spread.id === 'identidade-da-obra')?.name).toBe('Identidade (customizada)');
    expect(spreads.find((spread) => spread.id === 'tiragem-do-usuario')?.custom).toBe(true);
    expect(spreads.filter((spread) => spread.custom)).toHaveLength(2);
  });

  it('rejeita recurso ausente ou inválido com erro claro', async () => {
    const missing = new JsonSpreadCatalog({ resourcePath: join(root, 'nao-existe.json') });
    await expect(missing.list()).rejects.toBeInstanceOf(SpreadCatalogError);

    const invalidPath = join(root, 'invalido.json');
    await writeFile(invalidPath, JSON.stringify({ schemaVersion: 1, spreads: [] }), 'utf8');
    const invalid = new JsonSpreadCatalog({ resourcePath: invalidPath });
    await expect(invalid.list()).rejects.toBeInstanceOf(SpreadCatalogError);
  });
});
