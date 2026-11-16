import { beforeAll, describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { StoryBibleAssembler } from '../../src/application/services/story-bible-assembler';
import { StoryContextBuilder } from '../../src/application/services/story-context-builder';
import type { Deck } from '../../src/domain/deck/deck';
import { createEmptyStoryProject } from '../../src/domain/story/story-project';
import { createEmptySecret } from '../../src/domain/story/secret';
import { JsonDeckLoader } from '../../src/infrastructure/deck/json-deck-loader';
import { StoryBibleRenderer } from '../../src/infrastructure/markdown/story-bible-renderer';

const deckPath = resolve(process.cwd(), 'resources', 'decks', 'entrelinhas-storytelling-v4.json');
const NOW = '2026-01-01T10:00:00.000Z';
let deck: Deck;

beforeAll(async () => {
  deck = await new JsonDeckLoader(deckPath).load();
});

describe('T57 — renderizador da Story Bible', () => {
  it('gera 17 seções numeradas na ordem canônica com marcadores e _A definir._', () => {
    const project = createEmptyStoryProject('p', '4.0.0', NOW);
    const context = new StoryContextBuilder(deck).build(project);
    const document = new StoryBibleAssembler().build(project, context);
    const rendered = new StoryBibleRenderer().render(document);

    expect(rendered.markdown).toContain('# Story Bible');
    for (let index = 1; index <= 17; index += 1) {
      expect(rendered.markdown).toContain(`<!-- story-deck:generated:start:section-${index} -->`);
      expect(rendered.markdown).toContain(`## ${index}. `);
    }
    expect(rendered.markdown).toContain('_A definir._');
    expect(rendered.blocks).toHaveLength(18); // cabeçalho + 17 seções
  });

  it('mantém referências [ID] e verdades separadas mesmo com blocos vazios', () => {
    const project = createEmptyStoryProject('p', '4.0.0', NOW)
      .withPremise({ sourceCardIds: ['ST-012'] })
      .addSecret({
        ...createEmptySecret('seg-1'),
        factualTruth: 'A verdade integral.',
        readerAvailableInfo: 'Só a pista.',
      });
    const context = new StoryContextBuilder(deck).build(project);
    const rendered = new StoryBibleRenderer().render(
      new StoryBibleAssembler().build(project, context),
    );

    expect(rendered.markdown).toContain('[ST-012] A necessidade escondida');
    expect(rendered.markdown).toContain('**Verdade factual:** A verdade integral.');
    expect(rendered.markdown).toContain('**Informação disponível ao leitor:** Só a pista.');
    expect(rendered.markdown).not.toContain('undefined');
  });
});
