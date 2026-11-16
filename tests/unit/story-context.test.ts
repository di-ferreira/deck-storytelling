import { beforeAll, describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { StoryBibleAssembler, STORY_BIBLE_SECTION_TITLES } from '../../src/application/services/story-bible-assembler';
import { StoryContextBuilder } from '../../src/application/services/story-context-builder';
import type { Deck } from '../../src/domain/deck/deck';
import { StoryProject, createEmptyStoryProject } from '../../src/domain/story/story-project';
import { createEmptyAct, createEmptyChapter, createEmptyScene } from '../../src/domain/story/structure';
import { createEmptyCharacter } from '../../src/domain/story/character';
import { JsonDeckLoader } from '../../src/infrastructure/deck/json-deck-loader';

const deckPath = resolve(process.cwd(), 'resources', 'decks', 'entrelinhas-storytelling-v4.json');
const NOW = '2026-01-01T10:00:00.000Z';
let deck: Deck;

beforeAll(async () => {
  deck = await new JsonDeckLoader(deckPath).load();
});

describe('T52 — StoryContextBuilder: projeção e avisos', () => {
  it('resolve títulos de cartas reais e deriva a hierarquia', () => {
    const project = createEmptyStoryProject('p', '4.0.0', NOW)
      .addAct(createEmptyAct('ato-1'))
      .addChapter(createEmptyChapter('cap-1', 'ato-1'))
      .addScene({ ...createEmptyScene('cen-1', 'cap-1'), sourceCardIds: ['ST-012'] });
    const context = new StoryContextBuilder(deck).build(project);

    expect(context.cardTitles['ST-012']).toBe('A necessidade escondida');
    expect(context.acts[0]?.chapters[0]?.scenes[0]?.id).toBe('cen-1');
    expect(context.warnings).toEqual([]);
  });

  it('emite avisos (não erros) para carta, hierarquia e personagem inexistentes', () => {
    const json = createEmptyStoryProject('p', '4.0.0', NOW).toJSON();
    json.project.chapters = [{ id: 'cap-orfao', number: 1, title: '', description: '', actId: 'ato-inexistente', narrativeGoal: '', characterIds: [], locationIds: [], developmentStatus: 'planned' }];
    json.project.scenes = [{ ...createEmptyScene('cen-orfao', 'cap-inexistente') }];
    json.project.conflicts = [{ id: 'con-1', kind: 'secondary', description: '', obstacles: [], opposition: '', moralDilemma: '', emotionalPressure: '', consequences: '', difficultChoices: [], linkedCharacterId: 'pes-fantasma', linkedGoal: '', sourceCardIds: ['CARTA-FANTASMA'] }];
    const project = StoryProject.fromJSON(json);
    const context = new StoryContextBuilder(deck).build(project);
    const codes = context.warnings.map((warning) => warning.code);

    expect(codes).toContain('UNKNOWN_CARD');
    expect(codes).toContain('ORPHAN_CHAPTER');
    expect(codes).toContain('ORPHAN_SCENE');
    expect(codes).toContain('DANGLING_CONFLICT_CHARACTER');
  });
});

describe('T56 — StoryBibleAssembler: 17 seções na ordem canônica', () => {
  const assembler = new StoryBibleAssembler();

  it('produz exatamente as 17 seções do master prompt §12', () => {
    const project = createEmptyStoryProject('p', '4.0.0', NOW);
    const context = new StoryContextBuilder(deck).build(project);
    const bible = assembler.build(project, context);

    expect(bible.sections).toHaveLength(17);
    expect(bible.sections.map((section) => section.title)).toEqual([...STORY_BIBLE_SECTION_TITLES]);
    expect(bible.sections.every((section) => section.body === '_A definir._')).toBe(true);
  });

  it('referencia cartas por [ID] título e mantém verdades separadas', () => {
    let project = createEmptyStoryProject('p', '4.0.0', NOW)
      .withIdentity({ provisionalTitle: 'O título' })
      .withPremise({ sourceCardIds: ['ST-012'] })
      .addSecret({ id: 'seg-1', factualTruth: 'Verdade.', readerAvailableInfo: 'Pista.' });
    project = project.addCharacter({ ...createEmptyCharacter('pes-1'), name: 'Ana' });
    const context = new StoryContextBuilder(deck).build(project);
    const bible = assembler.build(project, context);

    const all = bible.sections.map((section) => section.body).join('\n');
    expect(all).toContain('[ST-012] A necessidade escondida');
    expect(all).toContain('**Verdade factual:** Verdade.');
    expect(all).toContain('**Informação disponível ao leitor:** Pista.');
    expect(all).toContain('Ana');
  });
});
