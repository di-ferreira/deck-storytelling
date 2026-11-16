import { describe, expect, it } from 'vitest';
import {
  createEmptyStoryProject,
  STORY_SCHEMA_VERSION,
  StoryProject,
} from '../../src/domain/story/story-project';
import {
  createEmptyAct,
  createEmptyChapter,
  createEmptyScene,
} from '../../src/domain/story/structure';
import { createEmptyConflict } from '../../src/domain/story/conflict';
import { createEmptyCharacter } from '../../src/domain/story/character';
import { createEmptySecret } from '../../src/domain/story/secret';
import { StoryError } from '../../src/domain/story/story-error';

const NOW = '2026-01-01T10:00:00.000Z';
const empty = (): StoryProject => createEmptyStoryProject('proj-1', '4.0.0', NOW);

describe('T47 — agregado StoryProject: defaults e imutabilidade', () => {
  it('cria projeto v2 completo com todos os campos vazios e revisão zero', () => {
    const project = empty();
    const json = project.toJSON();

    expect(json.schemaVersion).toBe(2);
    expect(STORY_SCHEMA_VERSION).toBe(2);
    expect(json.revision).toBe(0);
    expect(json.deckVersion).toBe('4.0.0');
    expect(json.project.id).toBe('proj-1');
    expect(json.project.identity).toEqual({ provisionalTitle: '', initialDescription: '', period: '' });
    expect(Object.keys(json.project.identity)).toHaveLength(3); // sem dimensões repetidas
    expect(json.project.genre.dimensions.tone).toBe('');
    expect(json.project.characters).toEqual([]);
    expect(json.project.acts).toEqual([]);
    expect(json.project.audit).toEqual({});
    expect(project.bible.dirty).toBe(true);
  });

  it('roundtrip fromJSON/toJSON preserva os dados e saneia campos ausentes', () => {
    const original = empty()
      .withIdentity({ provisionalTitle: 'A obra', period: 'séc. XIX' })
      .withPremise({ logline: 'Uma logline.' });
    const reloaded = StoryProject.fromJSON(original.toJSON());
    expect(reloaded.identity.provisionalTitle).toBe('A obra');
    expect(reloaded.premise.logline).toBe('Uma logline.');
    expect(StoryProject.fromJSON(undefined).toJSON().project.characters).toEqual([]);
  });

  it('toda operação with* devolve nova instância e marca a Bible suja', () => {
    const original = empty().markBibleDirty(false);
    const next = original.withIdentity({ provisionalTitle: 'Novo título' });

    expect(next).not.toBe(original);
    expect(original.identity.provisionalTitle).toBe('');
    expect(next.identity.provisionalTitle).toBe('Novo título');
    expect(next.bible.dirty).toBe(true);
  });
});

describe('T48 — invariantes de hierarquia, conflito e segredo', () => {
  it('deriva hierarquia de Chapter.actId / Scene.chapterId sem listas redundantes', () => {
    let project = empty()
      .addAct(createEmptyAct('ato-1'))
      .addAct(createEmptyAct('ato-2'))
      .addChapter(createEmptyChapter('cap-1', 'ato-1'))
      .addChapter(createEmptyChapter('cap-2', 'ato-1'))
      .addChapter(createEmptyChapter('cap-3', 'ato-2'))
      .addScene(createEmptyScene('cen-1', 'cap-1'))
      .addScene(createEmptyScene('cen-2', 'cap-3'));

    expect(project.chaptersOf('ato-1').map((c) => c.id)).toEqual(['cap-1', 'cap-2']);
    expect(project.scenesOf('cap-1').map((s) => s.id)).toEqual(['cen-1']);
    const json = project.toJSON().project;
    expect(Object.keys(json.acts[0]!)).not.toContain('chapterIds');
    expect(Object.keys(json.chapters[0]!)).not.toContain('sceneIds');

    project = project.moveChapter('cap-1', 'ato-2');
    expect(project.chaptersOf('ato-1').map((c) => c.id)).toEqual(['cap-2']);
    expect(project.chaptersOf('ato-2').map((c) => c.number)).toEqual([1, 2]);
    expect(project.chaptersOf('ato-1').map((c) => c.number)).toEqual([1]);
  });

  it('mover cena preserva ID, sourceCardIds e vínculos (por target ID)', () => {
    const scene = { ...createEmptyScene('cen-1', 'cap-1'), title: 'Abertura', sourceCardIds: ['ST-051'] };
    let project = empty()
      .addAct(createEmptyAct('ato-1'))
      .addChapter(createEmptyChapter('cap-1', 'ato-1'))
      .addChapter(createEmptyChapter('cap-2', 'ato-1'))
      .addScene(scene);

    project = project.moveScene('cen-1', 'cap-2');
    const moved = project.findScene('cen-1')!;
    expect(moved.id).toBe('cen-1');
    expect(moved.sourceCardIds).toEqual(['ST-051']);
    expect(moved.chapterId).toBe('cap-2');
    expect(project.scenesOf('cap-1')).toEqual([]);
  });

  it('reordenar atos e capítulos renumera sem alterar IDs', () => {
    let project = empty()
      .addAct(createEmptyAct('ato-a'))
      .addAct(createEmptyAct('ato-b'))
      .addChapter(createEmptyChapter('cap-a', 'ato-a'))
      .addChapter(createEmptyChapter('cap-b', 'ato-a'));

    project = project.reorderActs(['ato-b', 'ato-a']);
    expect(project.acts.map((act) => [act.id, act.number])).toEqual([['ato-b', 1], ['ato-a', 2]]);

    project = project.reorderChapters('ato-a', ['cap-b', 'cap-a']);
    expect(project.chaptersOf('ato-a').map((c) => [c.id, c.number])).toEqual([['cap-b', 1], ['cap-a', 2]]);
  });

  it('recusa hierarquia inválida e IDs duplicados', () => {
    const project = empty();
    expect(() => project.addChapter(createEmptyChapter('cap-1', 'ato-inexistente'))).toThrow(StoryError);
    expect(() => project.addScene(createEmptyScene('cen-1', 'cap-inexistente'))).toThrow(StoryError);
    const withAct = project.addAct(createEmptyAct('ato-1'));
    expect(() => withAct.addAct(createEmptyAct('ato-1'))).toThrow(StoryError);
  });

  it('conflito exige personagem existente e admite no máximo um principal', () => {
    const withCharacter = empty().addCharacter(createEmptyCharacter('pes-1'));
    const main = { ...createEmptyConflict('con-1'), kind: 'main' as const, linkedCharacterId: 'pes-1' };

    expect(() => empty().addConflict(main)).toThrow(StoryError);
    const withMain = withCharacter.addConflict(main);
    expect(withMain.conflicts[0]!.kind).toBe('main');
    expect(() => withMain.addConflict({ ...main, id: 'con-2' })).toThrow(
      expect.objectContaining({ code: 'MULTIPLE_MAIN_CONFLICTS' }),
    );
  });

  it('segredo mantém verdade factual e informação do leitor separadas', () => {
    const secret = {
      ...createEmptySecret('seg-1'),
      factualTruth: 'O mordomo matou o dono.',
      readerAvailableInfo: 'O leitor só viu a faca.',
    };
    const project = empty().addSecret(secret);
    expect(project.secrets[0]!.factualTruth).not.toBe(project.secrets[0]!.readerAvailableInfo);
  });

  it('remover ato remove capítulos e cenas dependentes', () => {
    const project = empty()
      .addAct(createEmptyAct('ato-1'))
      .addChapter(createEmptyChapter('cap-1', 'ato-1'))
      .addScene(createEmptyScene('cen-1', 'cap-1'))
      .removeAct('ato-1');
    expect(project.acts).toEqual([]);
    expect(project.chapters).toEqual([]);
    expect(project.scenes).toEqual([]);
  });
});
