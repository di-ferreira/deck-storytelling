import { randomUUID } from 'node:crypto';
import type { DeckRepository } from '../ports/deck-repository';
import type { OperationLog } from '../ports/operation-log';
import type { ProjectRepository } from '../ports/project-repository';
import { StoryProjectConflictError } from '../ports/project-repository';
import type { StoryLinkQuery } from '../ports/story-link-query';
import {
  characterFromJson,
  createEmptyCharacter,
  createEmptyRelationship,
  relationshipFromJson,
  type Character,
  type Relationship,
} from '../../domain/story/character';
import {
  conflictFromJson,
  createEmptyConflict,
  type Conflict,
} from '../../domain/story/conflict';
import {
  createEmptyLocation,
  locationFromJson,
  createEmptyWorld,
  type Location,
  type World,
} from '../../domain/story/world';
import {
  createEmptySecret,
  secretFromJson,
  type Secret,
} from '../../domain/story/secret';
import { createEmptyNarrator, type NarratorProfile, type StructureChoice } from '../../domain/story/narrator';
import {
  createEmptyAct,
  createEmptyChapter,
  createEmptyScene,
  actFromJson,
  chapterFromJson,
  sceneFromJson,
  type Act,
  type Chapter,
  type Scene,
  type TechniqueAssignment,
} from '../../domain/story/structure';
import { createEmptyDecision, decisionFromJson, type Decision } from '../../domain/story/story-bible';
import {
  createEmptyStoryProject,
  StoryProject,
  type WorkIdentity,
} from '../../domain/story/story-project';
import { StoryError } from '../../domain/story/story-error';
import type { Premise, PremiseApproval, PremiseField } from '../../domain/story/premise';
import type { GenreProfile } from '../../domain/genre/genre-profile';
import type { StoryLinkTargetType } from '../ports/story-link-query';

export interface StoryServiceDeps {
  readonly repository: ProjectRepository;
  readonly log: OperationLog;
  readonly links: StoryLinkQuery;
  /** Necessário para validar `sourceCardIds` contra as cartas ativas do deck. */
  readonly deck?: DeckRepository;
  readonly projectId?: string;
  readonly clock?: () => string;
  readonly idFactory?: (prefix: string) => string;
}

type Draft<T> = Partial<T> & { readonly id?: string };

/**
 * ÚNICO escritor do `StoryProject`.
 * Cache + revisão otimista: cada mutação grava via `ProjectRepository.save`, registra no
 * journal e atualiza o cache. Conflito limpa o cache e é relançado.
 */
export class StoryService {
  private cached: StoryProject | undefined;
  private readonly clock: () => string;
  private readonly idFactory: (prefix: string) => string;

  constructor(private readonly deps: StoryServiceDeps) {
    this.clock = deps.clock ?? (() => new Date().toISOString());
    this.idFactory = deps.idFactory ?? ((prefix) => `${prefix}-${randomUUID().slice(0, 8)}`);
  }

  async getProject(): Promise<StoryProject> {
    if (!this.cached) {
      if (this.deps.deck && !this.deckIndex) {
        const deck = await this.deps.deck.load();
        this.deckIndex = deck.index;
      }
      const stored = await this.deps.repository.load();
      this.cached = stored
        ? StoryProject.fromJSON(stored)
        : createEmptyStoryProject(this.deps.projectId ?? 'project', '', this.clock());
    }
    return this.cached;
  }

  async getRevision(): Promise<number> {
    return (await this.getProject()).revision;
  }

  /** Grava o projeto, atualiza o cache e devolve a versão persistida. */
  async commit(next: StoryProject): Promise<StoryProject> {
    let saved;
    try {
      saved = await this.deps.repository.save(next.toJSON(), next.revision);
    } catch (error) {
      this.cached = undefined;
      throw error;
    }
    this.cached = StoryProject.fromJSON(saved);
    return this.cached;
  }

  private async apply(
    type: string,
    payload: Readonly<Record<string, unknown>>,
    transform: (project: StoryProject) => StoryProject,
  ): Promise<StoryProject> {
    const current = await this.getProject();
    const next = transform(current);
    if (JSON.stringify(next.toJSON()) === JSON.stringify(current.toJSON())) {
      return current;
    }
    const saved = await this.commit(next.withUpdatedAt(this.clock()));
    try {
      await this.deps.log.append({ type, projectId: saved.id, payload });
    } catch {
      // Estado já persistido: falha de journal não invalida a operação.
    }
    return saved;
  }

  private async assertNoLinks(type: StoryLinkTargetType, id: string): Promise<void> {
    const links = await this.deps.links.linksForTarget(type, id);
    if (links.length > 0) {
      throw new StoryError(
        'STORY_HAS_LINKS',
        `Não é possível remover ${type} ${id}: existem ${links.length} carta(s) vinculada(s). Remova os vínculos primeiro.`,
      );
    }
  }

  private assertCards(ids: readonly string[] | undefined): void {
    if (!ids || !ids.length || !this.deps.deck) {
      return;
    }
    // A validação síncrona usa o índice em cache carregado sob demanda na primeira chamada.
    if (!this.deckIndex) {
      return;
    }
    for (const cardId of ids) {
      if (!this.deckIndex.getById(cardId)) {
        throw new StoryError('UNKNOWN_CARD', `A carta ${cardId} não existe no catálogo ativo.`);
      }
    }
  }

  private deckIndex: import('../../domain/deck/deck').DeckIndex | undefined;

  private nextId(prefix: string): string {
    return this.idFactory(prefix);
  }

  // ---------------------------------------------------------------- etapas 1–2

  updateIdentity(patch: Partial<WorkIdentity>): Promise<StoryProject> {
    return this.apply('story.updateIdentity', { fields: Object.keys(patch) }, (project) => project.withIdentity(patch));
  }

  setGenre(profile: GenreProfile): Promise<StoryProject> {
    return this.apply('story.setGenre', {}, (project) => project.withGenre(profile));
  }

  updatePremise(patch: Partial<Premise>): Promise<StoryProject> {
    return this.apply('story.updatePremise', { fields: Object.keys(patch) }, (project) => {
      this.assertCards(patch.sourceCardIds);
      return project.withPremise(patch);
    });
  }

  setPremiseApproval(field: PremiseField, approval: PremiseApproval): Promise<StoryProject> {
    return this.apply('story.setPremiseApproval', { field, approval }, (project) =>
      project.setPremiseApproval(field, approval),
    );
  }

  // ---------------------------------------------------------------- personagens

  addCharacter(draft: Draft<Character>): Promise<StoryProject> {
    return this.apply('story.addCharacter', { id: draft.id }, (project) => {
      const id = draft.id ?? this.nextId('pes');
      const character = characterFromJson({ ...draft, id }, id);
      this.assertCards(character.archetypeIds);
      this.assertCards(character.motivationCardIds);
      this.assertCards(character.emotionCardIds);
      return project.addCharacter(character);
    });
  }

  updateCharacter(id: string, patch: Partial<Character>): Promise<StoryProject> {
    return this.apply('story.updateCharacter', { id, fields: Object.keys(patch) }, (project) => {
      this.assertCards(patch.archetypeIds);
      this.assertCards(patch.motivationCardIds);
      this.assertCards(patch.emotionCardIds);
      return project.updateCharacter(id, patch);
    });
  }

  async removeCharacter(id: string): Promise<StoryProject> {
    await this.assertNoLinks('character', id);
    return this.apply('story.removeCharacter', { id }, (project) => project.removeCharacter(id));
  }

  addRelationship(draft: Draft<Relationship>): Promise<StoryProject> {
    return this.apply('story.addRelationship', { id: draft.id }, (project) => {
      const id = draft.id ?? this.nextId('rel');
      return project.addRelationship(relationshipFromJson({ ...draft, id }, id));
    });
  }

  updateRelationship(id: string, patch: Partial<Relationship>): Promise<StoryProject> {
    return this.apply('story.updateRelationship', { id }, (project) => project.updateRelationship(id, patch));
  }

  removeRelationship(id: string): Promise<StoryProject> {
    return this.apply('story.removeRelationship', { id }, (project) => project.removeRelationship(id));
  }

  // ---------------------------------------------------------------- conflitos

  addConflict(draft: Draft<Conflict>): Promise<StoryProject> {
    return this.apply('story.addConflict', { id: draft.id }, (project) => {
      const id = draft.id ?? this.nextId('con');
      const conflict = conflictFromJson({ ...draft, id }, id);
      this.assertCards(conflict.sourceCardIds);
      return project.addConflict(conflict);
    });
  }

  updateConflict(id: string, patch: Partial<Conflict>): Promise<StoryProject> {
    return this.apply('story.updateConflict', { id, fields: Object.keys(patch) }, (project) => {
      this.assertCards(patch.sourceCardIds);
      return project.updateConflict(id, patch);
    });
  }

  removeConflict(id: string): Promise<StoryProject> {
    return this.apply('story.removeConflict', { id }, (project) => project.removeConflict(id));
  }

  // ---------------------------------------------------------------- mundo

  updateWorld(patch: Partial<World>): Promise<StoryProject> {
    return this.apply('story.updateWorld', { fields: Object.keys(patch) }, (project) => {
      this.assertCards(patch.sourceCardIds);
      return project.withWorld(patch);
    });
  }

  addLocation(draft: Draft<Location>): Promise<StoryProject> {
    return this.apply('story.addLocation', { id: draft.id }, (project) => {
      const id = draft.id ?? this.nextId('loc');
      const location = locationFromJson({ ...draft, id }, id);
      if (!location.name && !location.description) {
        return project;
      }
      return project.addLocation(location);
    });
  }

  updateLocation(id: string, patch: Partial<Location>): Promise<StoryProject> {
    return this.apply('story.updateLocation', { id }, (project) => project.updateLocation(id, patch));
  }

  removeLocation(id: string): Promise<StoryProject> {
    return this.apply('story.removeLocation', { id }, (project) => project.removeLocation(id));
  }

  // ---------------------------------------------------------------- segredos

  addSecret(draft: Draft<Secret>): Promise<StoryProject> {
    return this.apply('story.addSecret', { id: draft.id }, (project) => {
      const id = draft.id ?? this.nextId('seg');
      const secret = secretFromJson({ ...draft, id }, id);
      this.assertCards(secret.sourceCardIds);
      return project.addSecret(secret);
    });
  }

  updateSecret(id: string, patch: Partial<Secret>): Promise<StoryProject> {
    return this.apply('story.updateSecret', { id }, (project) => {
      this.assertCards(patch.sourceCardIds);
      return project.updateSecret(id, patch);
    });
  }

  removeSecret(id: string): Promise<StoryProject> {
    return this.apply('story.removeSecret', { id }, (project) => project.removeSecret(id));
  }

  // ---------------------------------------------------------------- narrador/estrutura

  setNarrator(profile: NarratorProfile): Promise<StoryProject> {
    return this.apply('story.setNarrator', {}, (project) => {
      this.assertCards(profile.sourceCardIds);
      if (profile.typeCardId) {
        this.assertCards([profile.typeCardId]);
      }
      return project.setNarrator(profile);
    });
  }

  addStructure(choice: StructureChoice): Promise<StoryProject> {
    return this.apply('story.addStructure', { cardId: choice.cardId }, (project) => {
      this.assertCards([choice.cardId]);
      return project.addStructure(choice);
    });
  }

  removeStructure(cardId: string): Promise<StoryProject> {
    return this.apply('story.removeStructure', { cardId }, (project) => project.removeStructure(cardId));
  }

  // ---------------------------------------------------------------- atos

  addAct(draft: Draft<Act>): Promise<StoryProject> {
    return this.apply('story.addAct', { id: draft.id }, (project) => {
      const id = draft.id ?? this.nextId('ato');
      const act = actFromJson({ ...draft, id }, id, project.acts.length + 1);
      return project.addAct(act);
    });
  }

  updateAct(id: string, patch: Partial<Act>): Promise<StoryProject> {
    return this.apply('story.updateAct', { id }, (project) => project.updateAct(id, patch));
  }

  async removeAct(id: string): Promise<StoryProject> {
    const project = await this.getProject();
    const chapterIds = project.chaptersOf(id).map((chapter) => chapter.id);
    for (const chapterId of chapterIds) {
      await this.assertNoLinks('chapter', chapterId);
      for (const scene of project.scenesOf(chapterId)) {
        await this.assertNoLinks('scene', scene.id);
      }
    }
    await this.assertNoLinks('act', id);
    return this.apply('story.removeAct', { id }, (current) => current.removeAct(id));
  }

  reorderActs(orderedIds: readonly string[]): Promise<StoryProject> {
    return this.apply('story.reorderActs', { orderedIds }, (project) => project.reorderActs(orderedIds));
  }

  // ---------------------------------------------------------------- capítulos

  addChapter(draft: Draft<Chapter>): Promise<StoryProject> {
    return this.apply('story.addChapter', { id: draft.id, actId: draft.actId }, (project) => {
      const id = draft.id ?? this.nextId('cap');
      const chapter = chapterFromJson({ ...draft, id }, id, project.chaptersOf(draft.actId ?? '').length + 1);
      return project.addChapter(chapter);
    });
  }

  updateChapter(id: string, patch: Partial<Chapter>): Promise<StoryProject> {
    return this.apply('story.updateChapter', { id }, (project) => project.updateChapter(id, patch));
  }

  async removeChapter(id: string): Promise<StoryProject> {
    const project = await this.getProject();
    for (const scene of project.scenesOf(id)) {
      await this.assertNoLinks('scene', scene.id);
    }
    await this.assertNoLinks('chapter', id);
    return this.apply('story.removeChapter', { id }, (current) => current.removeChapter(id));
  }

  moveChapter(id: string, actId: string, index?: number): Promise<StoryProject> {
    return this.apply('story.moveChapter', { id, actId, index }, (project) => project.moveChapter(id, actId, index));
  }

  reorderChapters(actId: string, orderedIds: readonly string[]): Promise<StoryProject> {
    return this.apply('story.reorderChapters', { actId, orderedIds }, (project) =>
      project.reorderChapters(actId, orderedIds),
    );
  }

  // ---------------------------------------------------------------- cenas

  addScene(draft: Draft<Scene>): Promise<StoryProject> {
    return this.apply('story.addScene', { id: draft.id, chapterId: draft.chapterId }, (project) => {
      const id = draft.id ?? this.nextId('cen');
      const scene = sceneFromJson({ ...draft, id }, id);
      this.assertCards(scene.sourceCardIds);
      return project.addScene(scene);
    });
  }

  updateScene(id: string, patch: Partial<Scene>): Promise<StoryProject> {
    return this.apply('story.updateScene', { id }, (project) => {
      this.assertCards(patch.sourceCardIds);
      return project.updateScene(id, patch);
    });
  }

  async removeScene(id: string): Promise<StoryProject> {
    await this.assertNoLinks('scene', id);
    return this.apply('story.removeScene', { id }, (project) => project.removeScene(id));
  }

  moveScene(id: string, chapterId: string, index?: number): Promise<StoryProject> {
    return this.apply('story.moveScene', { id, chapterId, index }, (project) =>
      project.moveScene(id, chapterId, index),
    );
  }

  reorderScenes(chapterId: string, orderedIds: readonly string[]): Promise<StoryProject> {
    return this.apply('story.reorderScenes', { chapterId, orderedIds }, (project) =>
      project.reorderScenes(chapterId, orderedIds),
    );
  }

  // ---------------------------------------------------------------- técnicas/decisões

  assignTechnique(assignment: TechniqueAssignment): Promise<StoryProject> {
    return this.apply('story.assignTechnique', { cardId: assignment.cardId, scope: assignment.scope }, (project) => {
      this.assertCards([assignment.cardId]);
      return project.assignTechnique(assignment);
    });
  }

  updateTechnique(cardId: string, scope: TechniqueAssignment['scope'], patch: Partial<TechniqueAssignment>): Promise<StoryProject> {
    return this.apply('story.updateTechnique', { cardId, scope }, (project) =>
      project.updateTechnique(cardId, scope, patch),
    );
  }

  removeTechnique(cardId: string, scope: TechniqueAssignment['scope']): Promise<StoryProject> {
    return this.apply('story.removeTechnique', { cardId, scope }, (project) => project.removeTechnique(cardId, scope));
  }

  addDecision(draft: Draft<Decision>): Promise<StoryProject> {
    return this.apply('story.addDecision', { id: draft.id }, (project) => {
      const id = draft.id ?? this.nextId('dec');
      const decision = decisionFromJson({ ...draft, id, createdAt: draft.createdAt ?? this.clock() }, id);
      this.assertCards(decision.cardIds);
      return project.addDecision(decision);
    });
  }

  updateDecision(id: string, patch: Partial<Decision>): Promise<StoryProject> {
    return this.apply('story.updateDecision', { id }, (project) => {
      this.assertCards(patch.cardIds);
      return project.updateDecision(id, patch);
    });
  }

  removeDecision(id: string): Promise<StoryProject> {
    return this.apply('story.removeDecision', { id }, (project) => project.removeDecision(id));
  }

  markBibleDirty(dirty = true): Promise<StoryProject> {
    return this.apply('story.markBibleDirty', { dirty }, (project) => project.markBibleDirty(dirty));
  }
}

export { StoryProjectConflictError, createEmptyCharacter, createEmptyRelationship, createEmptyConflict, createEmptyLocation, createEmptyWorld, createEmptySecret, createEmptyNarrator, createEmptyAct, createEmptyChapter, createEmptyScene, createEmptyDecision };
