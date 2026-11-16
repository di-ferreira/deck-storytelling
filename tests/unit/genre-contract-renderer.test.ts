import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { Deck } from '../../src/domain/deck/deck';
import {
  addSecondaryGenre,
  setDominantGenre,
  setGenreSubGenres,
} from '../../src/domain/genre/genre-selection-policy';
import { createEmptyGenreProfile, type GenreProfile } from '../../src/domain/genre/genre-profile';
import { JsonDeckLoader } from '../../src/infrastructure/deck/json-deck-loader';
import {
  GenreContractDocumentStore,
} from '../../src/infrastructure/markdown/genre-contract-document-store';
import { renderGenreContractDocument } from '../../src/infrastructure/markdown/genre-contract-renderer';

const deckPath = resolve(process.cwd(), 'resources', 'decks', 'entrelinhas-storytelling-v4.json');
const NOW = '2026-01-01T10:00:00.000Z';

let deck: Deck;
let root: string;

beforeAll(async () => {
  deck = await new JsonDeckLoader(deckPath).load();
});

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'storydeck-genre-md-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

function buildProfile(overrides: Partial<GenreProfile> = {}): GenreProfile {
  let profile = setDominantGenre(createEmptyGenreProfile(), 'GEN-001', deck.index);
  profile = addSecondaryGenre(profile, 'GEN-006', deck.index);
  profile = setGenreSubGenres(profile, 'GEN-001', ['Ficção de detetive'], deck.index).profile;
  return { ...profile, ...overrides };
}

function createStore(): GenreContractDocumentStore {
  return new GenreContractDocumentStore({
    projectRoot: root,
    deck: new JsonDeckLoader(deckPath),
    clock: () => NOW,
  });
}

function userBlock(name: string, text: string): { start: string; end: string; content: string } {
  return {
    start: `<!-- story-deck:user:start:${name} -->`,
    end: `<!-- story-deck:user:end:${name} -->`,
    content: text,
  };
}

describe('T44 — contrato de gênero em Markdown', () => {
  it('renderiza as 5 perguntas com os títulos do deck e o rastreio dos subgêneros', () => {
    const profile = buildProfile({
      contract: {
        promise: 'O leitor quer investigar junto.',
        engine: 'A investigação move a trama.',
        conventions: 'Pistas justas e suspeitos plausíveis.',
        freedom: 'A subversão é consciente e sinalizada.',
        reward: 'Uma solução que reinterpreta pistas anteriores.',
      },
    });
    const markdown = renderGenreContractDocument(profile, deck);

    expect(markdown).toContain('# Contrato de Gênero');
    for (const entry of deck.usage.genre_contract) {
      expect(markdown).toContain(entry);
    }

    expect(markdown).toContain('[GEN-001] Mistério');
    expect(markdown).toContain('[GEN-006] Thriller');
    expect(markdown).toContain('Ficção de detetive');
    expect(markdown).toContain('Rastreio histórico:** `GEN-003`');
    expect(markdown).toContain('O leitor quer investigar junto.');
    expect(markdown).toContain('Uma solução que reinterpreta pistas anteriores.');

    for (const field of ['promise', 'engine', 'conventions', 'freedom', 'reward']) {
      expect(markdown).toContain(`<!-- story-deck:generated:start:${field} -->`);
      expect(markdown).toContain(`<!-- story-deck:generated:end:${field} -->`);
      expect(markdown).toContain(`<!-- story-deck:user:start:${field} -->`);
      expect(markdown).toContain(`<!-- story-deck:user:end:${field} -->`);
    }
  });

  it('marca o perfil vazio como rascunho, sem inventar gênero', () => {
    const markdown = renderGenreContractDocument(createEmptyGenreProfile(), deck);
    expect(markdown).toContain('Rascunho');
    expect(markdown).not.toContain('[GEN-001]');
  });

  it('cria o arquivo somente se ausente e nunca sobrescreve o existente', async () => {
    const store = createStore();
    expect(await store.loadContract()).toBeUndefined();

    const markdown = renderGenreContractDocument(buildProfile(), deck);
    expect(await store.saveContractIfAbsent(markdown)).toBe(true);
    expect(await store.loadContract()).toBe(markdown);

    expect(await store.saveContractIfAbsent('# Outro conteúdo\n')).toBe(false);
    expect(await store.loadContract()).toBe(markdown);
  });

  it('regenera apenas os blocos gerados, preservando blocos e texto do usuário', async () => {
    const store = createStore();
    const initialProfile = buildProfile();
    expect(await store.saveContractIfAbsent(renderGenreContractDocument(initialProfile, deck))).toBe(true);

    const filePath = join(root, 'Story', 'genre-contract.md');
    const block = userBlock('promise', 'Minha nota pessoal sobre a promessa.');
    const original = await readFile(filePath, 'utf8');
    const edited = `${original.replace(
      `${block.start}\n${block.end}`,
      `${block.start}\n${block.content}\n${block.end}`,
    )}\n## Seção livre do autor\n\nTexto que o Story Deck não deve tocar.\n`;
    await writeFile(filePath, edited, 'utf8');

    const updatedProfile = buildProfile({
      contract: {
        ...initialProfile.contract,
        promise: 'Nova promessa revisada.',
      },
    });
    const result = await store.regenerateContract(updatedProfile);
    expect(result.changed).toBe(true);

    const regenerated = await readFile(filePath, 'utf8');
    expect(regenerated).toContain('Nova promessa revisada.');
    expect(regenerated).toContain('Minha nota pessoal sobre a promessa.');
    expect(regenerated).toContain('## Seção livre do autor');
    expect(regenerated).toContain('Texto que o Story Deck não deve tocar.');
    expect(regenerated).toContain('<!-- story-deck:user:end:promise -->');

    const stable = await store.regenerateContract(updatedProfile);
    expect(stable.changed).toBe(false);
    expect(await readFile(filePath, 'utf8')).toBe(regenerated);
  });

  it('regenera criando o arquivo quando ele ainda não existe', async () => {
    const store = createStore();
    const result = await store.regenerateContract(buildProfile());
    expect(result.changed).toBe(true);
    const markdown = await store.loadContract();
    expect(markdown).toContain('# Contrato de Gênero');
    expect(markdown).toContain('[GEN-001] Mistério');
  });
});
