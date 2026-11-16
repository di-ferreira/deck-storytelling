import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { StoryProjectConflictError } from '../../src/application/ports/project-repository';
import type { CardLink } from '../../src/domain/selection/deck-selection';
import { storyLinkLookupFromProject } from '../../src/domain/story/story-link-lookup';
import { StoryError } from '../../src/domain/story/story-error';
import { createEmptyChapter, createEmptyScene } from '../../src/domain/story/structure';
import { StoryService } from '../../src/application/services/story-service';
import type { Deck } from '../../src/domain/deck/deck';
import { JsonDeckLoader } from '../../src/infrastructure/deck/json-deck-loader';
import { JsonOperationLog } from '../../src/infrastructure/persistence/json-operation-log';
import { JsonProjectRepository } from '../../src/infrastructure/persistence/json-project-repository';

const deckPath = resolve(process.cwd(), 'resources', 'decks', 'entrelinhas-storytelling-v4.json');
const NOW = '2026-01-01T10:00:00.000Z';
let deck: Deck;

beforeAll(async () => {
  deck = await new JsonDeckLoader(deckPath).load();
});

describe('T51/T54/T55 — StoryService: escrita única, conflito e proteções', () => {
  let root: string;
  let repo: JsonProjectRepository;
  let links: CardLink[];

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'storydeck-service-'));
    repo = new JsonProjectRepository(root, deck.meta.version, () => NOW);
    await repo.ensureStructure();
    links = [];
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  function createService(): StoryService {
    return new StoryService({
      repository: repo,
      deck: new JsonDeckLoader(deckPath),
      log: new JsonOperationLog({ projectRoot: root, clock: () => NOW, idFactory: () => 'op-1' }),
      links: {
        async linksForTarget(type, id) {
          return links.filter((link) => link.target.type === type && `${type}Id` in link.target && (link.target as Record<string, string>)[`${type}Id`] === id);
        },
      },
      clock: () => NOW,
      idFactory: (prefix) => `${prefix}-teste`,
    });
  }

  it('persiste cada mutação com revisão incrementada e journal', async () => {
    const service = createService();
    expect(await service.getRevision()).toBe(0);

    let project = await service.updateIdentity({ provisionalTitle: 'O título', period: '1970' });
    expect(project.revision).toBe(1);
    expect(project.identity.provisionalTitle).toBe('O título');
    expect(project.bible.dirty).toBe(true);

    project = await service.updatePremise({ logline: 'Uma logline.' });
    expect(project.revision).toBe(2);
    project = await service.setPremiseApproval('logline', 'approved');
    expect(project.premise.approvals.logline).toBe('approved');
    expect(project.revision).toBe(3);

    const journal = JSON.parse(await readFile(join(root, '.storydeck', 'decisions.json'), 'utf8'));
    expect(journal.operations.map((op: { type: string }) => op.type)).toContain('story.updateIdentity');
  });

  it('não grava quando a operação não altera o projeto', async () => {
    const service = createService();
    await service.updateIdentity({ provisionalTitle: 'Igual' });
    await service.updateIdentity({ provisionalTitle: 'Igual' });
    expect(await service.getRevision()).toBe(1);
  });

  it('rejeita carta inexistente em sourceCardIds (UNKNOWN_CARD)', async () => {
    const service = createService();
    await expect(service.updatePremise({ sourceCardIds: ['CARTA-INEXISTENTE'] })).rejects.toMatchObject({
      code: 'UNKNOWN_CARD',
    });
    expect(await service.getRevision()).toBe(0);
  });

  it('aceita carta real do deck em sourceCardIds', async () => {
    const service = createService();
    const project = await service.updatePremise({ centralIdea: 'Ideia', sourceCardIds: ['ST-012'] });
    expect(project.premise.sourceCardIds).toEqual(['ST-012']);
  });

  it('protege exclusão de cena/personagem com CardLink (STORY_HAS_LINKS)', async () => {
    const service = createService();
    await service.addAct({ id: 'ato-1' });
    await service.addChapter({ id: 'cap-1', actId: 'ato-1' });
    await service.addScene({ id: 'cen-1', chapterId: 'cap-1', sourceCardIds: ['ST-051'] });
    await service.addCharacter({ id: 'pes-1', name: 'Ana' });

    links.push({ cardId: 'ST-051', target: { type: 'scene', sceneId: 'cen-1' }, createdAt: NOW });
    await expect(service.removeScene('cen-1')).rejects.toMatchObject({ code: 'STORY_HAS_LINKS' });

    links.push({ cardId: 'ST-001', target: { type: 'character', characterId: 'pes-1' }, createdAt: NOW });
    await expect(service.removeCharacter('pes-1')).rejects.toMatchObject({ code: 'STORY_HAS_LINKS' });
  });

  it('sinaliza conflito de revisão e limpa o cache', async () => {
    const stale = createService();
    const fresh = createService();
    await stale.getProject();
    await fresh.getProject(); // ambas leem a revisão 0 antes da primeira gravação
    await stale.updateIdentity({ provisionalTitle: 'Primeiro' });

    await expect(fresh.updateIdentity({ provisionalTitle: 'Segundo' })).rejects.toBeInstanceOf(
      StoryProjectConflictError,
    );
    expect((await fresh.getProject()).identity.provisionalTitle).toBe('Primeiro');
    const project = await fresh.updateIdentity({ provisionalTitle: 'Terceiro' });
    expect(project.revision).toBe(2);
  });

  it('mantém hierarquia, técnicas com escopo e segredo com verdades separadas', async () => {
    const service = createService();
    let project = await service.addAct({ id: 'ato-1' });
    project = await service.addChapter({ id: 'cap-1', actId: 'ato-1' });
    project = await service.addChapter({ id: 'cap-2', actId: 'ato-1' });
    project = await service.addScene({ id: 'cen-1', chapterId: 'cap-1', sourceCardIds: ['ST-051'] });

    project = await service.moveScene('cen-1', 'cap-2');
    expect(project.scenesOf('cap-2').map((s) => s.id)).toEqual(['cen-1']);

    project = await service.assignTechnique({ cardId: 'ST-145', scope: { type: 'scene', sceneId: 'cen-1' }, intent: 'Preparar.' });
    expect(project.techniques[0]?.scope).toEqual({ type: 'scene', sceneId: 'cen-1' });

    project = await service.addSecret({
      id: 'seg-1',
      factualTruth: 'A verdade.',
      readerAvailableInfo: 'O que o leitor sabe.',
    });
    expect(project.secrets[0]!.factualTruth).not.toBe(project.secrets[0]!.readerAvailableInfo);

    project = await service.addCharacter({ id: 'pes-1', name: 'Ana' });
    project = await service.addConflict({ id: 'con-1', kind: 'main', linkedCharacterId: 'pes-1', linkedGoal: 'Vencer' });
    expect(project.conflicts[0]!.kind).toBe('main');
    const lookup = storyLinkLookupFromProject(project);
    expect(lookup.isScene('cen-1')).toBe(true);
    expect(lookup.isCharacter('inexistente')).toBe(false);
  });
});
