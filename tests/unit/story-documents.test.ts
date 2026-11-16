import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StoryContextBuilder } from '../../src/application/services/story-context-builder';
import type { Deck } from '../../src/domain/deck/deck';
import { createEmptyStoryProject } from '../../src/domain/story/story-project';
import { createEmptyAct, createEmptyChapter, createEmptyScene } from '../../src/domain/story/structure';
import { createEmptyDecision } from '../../src/domain/story/story-bible';
import { JsonDeckLoader } from '../../src/infrastructure/deck/json-deck-loader';
import {
  renderGeneratedBlock,
  renderUserBlock,
  replaceGeneratedBlocks,
} from '../../src/infrastructure/markdown/document-blocks';
import { FsStoryDocumentStore } from '../../src/infrastructure/markdown/fs-story-document-store';
import { NarrativeDecisionsRenderer } from '../../src/infrastructure/markdown/narrative-decisions-renderer';
import { OutlineRenderer } from '../../src/infrastructure/markdown/outline-renderer';
import { PremiseRenderer } from '../../src/infrastructure/markdown/premise-renderer';

const deckPath = join(process.cwd(), 'resources', 'decks', 'entrelinhas-storytelling-v4.json');
const NOW = '2026-01-01T10:00:00.000Z';
let deck: Deck;

beforeEach(async () => {
  deck = await new JsonDeckLoader(deckPath).load();
});

describe('T58 — blocos de documento genéricos (document-blocks)', () => {
  it('substitui somente blocos gerados e preserva blocos do usuário e texto livre', () => {
    const existing = [
      '# Livre do autor',
      renderUserBlock('resumo', 'Minha anotação.'),
      renderGeneratedBlock('campo', 'Conteúdo antigo.'),
      'Texto fora de blocos.',
    ].join('\n\n');

    const result = replaceGeneratedBlocks(existing, [
      { key: 'campo', markdown: renderGeneratedBlock('campo', 'Conteúdo novo.') },
    ]);

    expect(result.changed).toBe(true);
    expect(result.content).toContain('# Livre do autor');
    expect(result.content).toContain('Minha anotação.');
    expect(result.content).toContain('Conteúdo novo.');
    expect(result.content).not.toContain('Conteúdo antigo.');
    expect(result.content).toContain('Texto fora de blocos.');
  });

  it('anexa blocos ainda ausentes sem perder nada', () => {
    const result = replaceGeneratedBlocks('# Meu texto\n', [
      { key: 'novo', markdown: renderGeneratedBlock('novo', 'Gerado.') },
    ]);
    expect(result.content).toContain('# Meu texto');
    expect(result.content).toContain('<!-- story-deck:generated:start:novo -->');
  });
});

describe('T59 — FsStoryDocumentStore e renderers', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'storydeck-docs-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('cria arquivo somente se ausente e regenera preservando edição do autor', async () => {
    const store = new FsStoryDocumentStore({ projectRoot: root });
    const project = createEmptyStoryProject('p', '4.0.0', NOW).withPremise({ logline: 'Linha inicial.' });
    const context = new StoryContextBuilder(deck).build(project);
    const rendered = new PremiseRenderer().render(project, context);

    expect(await store.load('premise')).toBeUndefined();
    expect(await store.saveIfAbsent('premise', rendered.markdown)).toBe(true);
    expect(await store.saveIfAbsent('premise', '# Sobrescrito\n')).toBe(false);

    const path = join(root, 'Story', 'premise.md');
    const edited = `${await readFile(path, 'utf8')}\n\n<!-- story-deck:user:start:logline -->\nEdição pessoal.\n<!-- story-deck:user:end:logline -->\nTexto livre.\n`;
    await writeFile(path, edited, 'utf8');

    const updated = project.withPremise({ logline: 'Linha revisada.' });
    const next = new PremiseRenderer().render(updated, context);
    const result = await store.regenerate('premise', next.markdown, next.blocks);
    expect(result.changed).toBe(true);

    const final = await readFile(path, 'utf8');
    expect(final).toContain('Linha revisada.');
    expect(final).toContain('Edição pessoal.');
    expect(final).toContain('Texto livre.');
    expect(final).not.toContain('Linha inicial.');
  });

  it('renderiza outline e decisões narrativas com hierarquia e referências', () => {
    const project = createEmptyStoryProject('p', '4.0.0', NOW)
      .addAct(createEmptyAct('ato-1'))
      .addChapter(createEmptyChapter('cap-1', 'ato-1'))
      .addScene({ ...createEmptyScene('cen-1', 'cap-1'), sourceCardIds: ['ST-012'] })
      .addDecision({ ...createEmptyDecision('dec-1', NOW), title: 'Usar cliffhanger', cardIds: ['ST-001'] })
      .markBibleDirty(false);
    const context = new StoryContextBuilder(deck).build(project);

    const outline = new OutlineRenderer().render(project, context);
    expect(outline.markdown).toContain('[ato-1]');
    expect(outline.markdown).toContain('[cap-1]');
    expect(outline.markdown).toContain('[cen-1]');

    const decisions = new NarrativeDecisionsRenderer().render(project, context);
    expect(decisions.markdown).toContain('Usar cliffhanger');
    expect(decisions.markdown).toContain('[ST-001]');
  });
});
