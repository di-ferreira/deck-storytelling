import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { SelectionService } from '../../src/application/services/selection-service';
import { createEmptyStoryProject } from '../../src/domain/story/story-project';
import { createEmptyAct, createEmptyChapter, createEmptyScene } from '../../src/domain/story/structure';
import { createEmptyCharacter } from '../../src/domain/story/character';
import { storyLinkLookupFromProject } from '../../src/domain/story/story-link-lookup';
import { StoryError } from '../../src/domain/story/story-error';
import { LinkRegistry } from '../../src/domain/selection/link-registry';
import { JsonDeckLoader } from '../../src/infrastructure/deck/json-deck-loader';
import { JsonOperationLog } from '../../src/infrastructure/persistence/json-operation-log';
import { JsonSelectionRepository } from '../../src/infrastructure/persistence/json-selection-repository';
import { MathRandomGenerator } from '../../src/infrastructure/random/math-random-generator';

const deckPath = resolve(process.cwd(), 'resources', 'decks', 'entrelinhas-storytelling-v4.json');
const NOW = '2026-01-01T10:00:00.000Z';

function projectWithEntities() {
  return createEmptyStoryProject('p', '4.0.0', NOW)
    .addCharacter(createEmptyCharacter('pes-1'))
    .addAct(createEmptyAct('ato-1'))
    .addChapter(createEmptyChapter('cap-1', 'ato-1'))
    .addScene(createEmptyScene('cen-1', 'cap-1'));
}

describe('T53 — validação de alvos de vínculo (UNKNOWN_TARGET)', () => {
  it('LinkRegistry recusa alvo inexistente quando recebe StoryLinkLookup', () => {
    const lookup = storyLinkLookupFromProject(projectWithEntities());
    const registry = new LinkRegistry([], undefined, lookup);

    expect(() => registry.addLink('ST-012', { type: 'scene', sceneId: 'cen-1' }, NOW)).not.toThrow();
    expect(() => registry.addLink('ST-012', { type: 'scene', sceneId: 'cen-inexistente' }, NOW)).toThrow(
      expect.objectContaining({ code: 'UNKNOWN_TARGET' }),
    );
    expect(() => registry.addLink('ST-012', { type: 'character', characterId: 'pes-fantasma' }, NOW)).toThrow(
      StoryError,
    );
    expect(() => registry.addLink('ST-012', { type: 'project' }, NOW)).not.toThrow();
  });

  it('sem StoryLinkLookup o comportamento forward-reference permanece', () => {
    const registry = new LinkRegistry([]);
    expect(() => registry.addLink('ST-012', { type: 'scene', sceneId: 'cen-futuro' }, NOW)).not.toThrow();
  });

  describe('SelectionService com lookup injetado', () => {
    let root: string;

    beforeEach(async () => {
      root = await mkdtemp(join(tmpdir(), 'storydeck-links-'));
    });

    afterEach(async () => {
      await rm(root, { recursive: true, force: true });
    });

    it('recusa addLink com alvo de cena inexistente', async () => {
      const lookup = storyLinkLookupFromProject(projectWithEntities());
      const service = new SelectionService({
        deck: new JsonDeckLoader(deckPath),
        repository: new JsonSelectionRepository({ projectId: 'p', projectRoot: root, clock: () => NOW }),
        log: new JsonOperationLog({ projectRoot: root, clock: () => NOW }),
        random: new MathRandomGenerator(),
        storyLookup: lookup,
        clock: () => NOW,
      });

      await expect(
        service.addLink('ST-012', { type: 'scene', sceneId: 'cen-inexistente' }),
      ).rejects.toMatchObject({ code: 'UNKNOWN_TARGET' });
      await expect(service.addLink('ST-012', { type: 'scene', sceneId: 'cen-1' })).resolves.toBeDefined();
    });
  });
});
