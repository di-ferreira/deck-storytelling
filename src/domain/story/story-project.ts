import {
  createEmptyAuditState,
  type AuditState,
} from './audit';
import {
  characterFromJson,
  createEmptyCharacter,
  type Character,
  type Relationship,
  relationshipFromJson,
} from './character';
import {
  conflictFromJson,
  createEmptyConflict,
  type Conflict,
} from './conflict';
import {
  genreProfileFromJson,
  type GenreProfile,
  type GenreProfileJson,
} from '../genre/genre-profile';
import {
  createEmptyNarrator,
  narratorFromJson,
  structureChoiceFromJson,
  type NarratorProfile,
  type StructureChoice,
} from './narrator';
import {
  createEmptyPremise,
  premiseFromJson,
  type Premise,
  type PremiseApproval,
  type PremiseField,
} from './premise';
import {
  createEmptyScene,
  chapterFromJson,
  renumberActs,
  renumberChapters,
  scenesForChapter,
  chaptersForAct,
  actFromJson,
  sceneFromJson,
  techniqueFromJson,
  type Act,
  type Chapter,
  type Scene,
  type TechniqueAssignment,
} from './structure';
import {
  createEmptySecret,
  secretFromJson,
  type Secret,
} from './secret';
import {
  createEmptyStoryBibleRef,
  decisionFromJson,
  storyBibleRefFromJson,
  type Decision,
  type StoryBibleRef,
} from './story-bible';
import { StoryError } from './story-error';
import {
  createEmptyLocation,
  createEmptyWorld,
  worldFromJson,
  type Location,
  type World,
} from './world';

/** Etapa 1 — a identidade NÃO repete as dimensões; essas continuam só em `GenreProfile.dimensions`. */
export interface WorkIdentity {
  readonly provisionalTitle: string;
  readonly initialDescription: string;
  readonly period: string;
}

export interface StoryProjectData {
  readonly id: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly identity: WorkIdentity;
  readonly genre: GenreProfile;
  readonly premise: Premise;
  readonly characters: readonly Character[];
  readonly relationships: readonly Relationship[];
  readonly conflicts: readonly Conflict[];
  readonly world: World;
  readonly secrets: readonly Secret[];
  readonly narrator: NarratorProfile;
  readonly structures: readonly StructureChoice[];
  readonly acts: readonly Act[];
  readonly chapters: readonly Chapter[];
  readonly scenes: readonly Scene[];
  readonly techniques: readonly TechniqueAssignment[];
  readonly decisions: readonly Decision[];
  readonly bible: StoryBibleRef;
  readonly audit: AuditState;
}

/** Formato integral do `.storydeck/project.json` v2. */
export interface StoryProjectFileJson {
  readonly schemaVersion: 2;
  readonly deckVersion: string;
  readonly revision: number;
  readonly project: StoryProjectData;
}

export const STORY_SCHEMA_VERSION = 2;

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function uniqueIds(ids: readonly unknown[]): readonly string[] {
  return [...new Set(ids.filter((id): id is string => typeof id === 'string' && id.length > 0))];
}

function assertUniqueId(items: readonly { readonly id: string }[], id: string, label: string): void {
  if (!id) {
    throw new StoryError('INVALID_HIERARCHY', `O identificador de ${label} não pode ser vazio.`);
  }
  if (items.some((item) => item.id === id)) {
    throw new StoryError('DUPLICATE_ID', `Já existe ${label} com o identificador ${id}.`);
  }
}

function assertExists(items: readonly { readonly id: string }[], id: string, label: string): void {
  if (!items.some((item) => item.id === id)) {
    throw new StoryError('ENTITY_NOT_FOUND', `${label} ${id} não existe neste projeto.`);
  }
}

function orderById<T extends { readonly id: string }>(
  items: readonly T[],
  orderedIds: readonly string[],
): readonly T[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const result: T[] = [];
  for (const id of orderedIds) {
    const item = byId.get(id);
    if (item && !result.includes(item)) {
      result.push(item);
    }
  }
  for (const item of items) {
    if (!result.includes(item)) {
      result.push(item);
    }
  }
  return result;
}

/** Move um item dentro do array mantendo a ordem relativa dos demais grupos. */
function moveInGroup<T extends { readonly id: string }>(
  items: readonly T[],
  moved: T,
  inTargetGroup: (item: T) => boolean,
  index?: number,
): readonly T[] {
  const without = items.filter((item) => item.id !== moved.id);
  const targetPositions = without
    .map((item, position) => (inTargetGroup(item) ? position : -1))
    .filter((position) => position >= 0);
  const insertion = index === undefined
    ? targetPositions.length
    : Math.max(0, Math.min(index, targetPositions.length));

  const result: T[] = [];
  let emitted = false;
  for (let position = 0; position < without.length; position += 1) {
    const item = without[position]!;
    if (inTargetGroup(item) && !emitted && targetPositions.indexOf(position) === insertion) {
      result.push(moved);
      emitted = true;
    }
    result.push(item);
  }
  if (!emitted) {
    const lastTargetPosition = targetPositions[targetPositions.length - 1];
    if (lastTargetPosition === undefined) {
      result.push(moved);
    } else {
      const lastTarget = without[lastTargetPosition]!;
      result.splice(result.indexOf(lastTarget) + 1, 0, moved);
    }
  }
  return result;
}

function sanitizeData(raw: Partial<StoryProjectData>, fallback: {
  id: string;
  createdAt: string;
  updatedAt: string;
}): StoryProjectData {
  const characters = uniqueIds((raw.characters ?? []).map((c) => c?.id)).length
    ? raw.characters!.map((c, index) => characterFromJson(c, `pes-${index + 1}`))
    : [];
  const acts = (raw.acts ?? []).map((act, index) => actFromJson(act, act?.id || `ato-${index + 1}`, index + 1));
  const chapters = (raw.chapters ?? []).map((chapter, index) =>
    chapterFromJson(chapter, chapter?.id || `cap-${index + 1}`, index + 1),
  );
  const conflicts = (raw.conflicts ?? []).map((conflict, index) =>
    conflictFromJson(conflict, conflict?.id || `con-${index + 1}`),
  );

  const actIds = new Set(acts.map((act) => act.id));
  const chapterIds = new Set(chapters.map((chapter) => chapter.id));
  let normalizedChapters: readonly Chapter[] = chapters.map((chapter) =>
    actIds.has(chapter.actId) ? chapter : { ...chapter, actId: '' },
  );
  normalizedChapters = renumberChapters(normalizedChapters);

  const scenes = (raw.scenes ?? []).map((scene, index) => sceneFromJson(scene, scene?.id || `cen-${index + 1}`));
  const normalizedScenes = scenes.map((scene) =>
    chapterIds.has(scene.chapterId) ? scene : { ...scene, chapterId: '' },
  );

  // No máximo um conflito principal: o primeiro encontrado vence ao carregar dados externos.
  let seenMain = false;
  const normalizedConflicts = conflicts.map((conflict) => {
    if (conflict.kind !== 'main') {
      return conflict;
    }
    if (seenMain) {
      return { ...conflict, kind: 'secondary' as const };
    }
    seenMain = true;
    return conflict;
  });

  return {
    id: text(raw.id) || fallback.id,
    createdAt: text(raw.createdAt) || fallback.createdAt,
    updatedAt: text(raw.updatedAt) || fallback.updatedAt,
    identity: {
      provisionalTitle: text(raw.identity?.provisionalTitle),
      initialDescription: text(raw.identity?.initialDescription),
      period: text(raw.identity?.period),
    },
    genre: genreProfileFromJson(raw.genre as unknown as Partial<GenreProfileJson> | undefined),
    premise: premiseFromJson(raw.premise),
    characters,
    relationships: (raw.relationships ?? []).map((relationship, index) =>
      relationshipFromJson(relationship, relationship?.id || `rel-${index + 1}`),
    ),
    conflicts: normalizedConflicts,
    world: worldFromJson(raw.world),
    secrets: (raw.secrets ?? []).map((secret, index) => secretFromJson(secret, secret?.id || `seg-${index + 1}`)),
    narrator: narratorFromJson(raw.narrator),
    structures: (raw.structures ?? []).map(structureChoiceFromJson),
    acts,
    chapters: normalizedChapters,
    scenes: normalizedScenes,
    techniques: (raw.techniques ?? []).map(techniqueFromJson).filter((t): t is TechniqueAssignment => t !== undefined),
    decisions: (raw.decisions ?? []).map((decision, index) =>
      decisionFromJson(decision, decision?.id || `dec-${index + 1}`),
    ),
    bible: storyBibleRefFromJson(raw.bible),
    audit: createEmptyAuditState(),
  };
}

/**
 * Agregado imutável do Story Builder. Nenhuma operação `with*` altera a instância atual:
 * todas devolvem uma nova versão com `bible.dirty = true`.
 */
export class StoryProject {
  private constructor(
    private readonly data: StoryProjectData,
    private readonly file: { schemaVersion: 2; deckVersion: string; revision: number },
  ) {}

  static create(id: string, deckVersion: string, now: string): StoryProject {
    return new StoryProject(
      sanitizeData(
        { id, createdAt: now, updatedAt: now },
        { id, createdAt: now, updatedAt: now },
      ),
      { schemaVersion: STORY_SCHEMA_VERSION, deckVersion, revision: 0 },
    );
  }

  /** Hidrata um `project.json` (v2 completo ou v1 normalizado pelo repositório). */
  static fromJSON(json: StoryProjectFileJson | Partial<StoryProjectFileJson> | undefined): StoryProject {
    const now = '';
    const fallback = {
      id: text(json?.project?.id),
      createdAt: text(json?.project?.createdAt),
      updatedAt: text(json?.project?.updatedAt) || now,
    };
    return new StoryProject(
      sanitizeData(json?.project ?? {}, fallback),
      {
        schemaVersion: STORY_SCHEMA_VERSION,
        deckVersion: text(json?.deckVersion),
        revision: Number.isInteger(json?.revision) && (json?.revision ?? -1) >= 0 ? json!.revision! : 0,
      },
    );
  }

  toJSON(): StoryProjectFileJson {
    return {
      schemaVersion: STORY_SCHEMA_VERSION,
      deckVersion: this.file.deckVersion,
      revision: this.file.revision,
      project: {
        ...this.data,
        identity: { ...this.data.identity },
        genre: {
          ...this.data.genre,
          secondaryGenreIds: [...this.data.genre.secondaryGenreIds],
          subGenresByGenre: Object.fromEntries(
            Object.entries(this.data.genre.subGenresByGenre).map(([key, names]) => [key, [...names]]),
          ),
          contract: { ...this.data.genre.contract },
          dimensions: { ...this.data.genre.dimensions },
        },
        premise: {
          ...this.data.premise,
          sourceCardIds: [...this.data.premise.sourceCardIds],
          approvals: { ...this.data.premise.approvals },
        },
        characters: this.data.characters.map((character) => ({ ...character })),
        relationships: this.data.relationships.map((relationship) => ({ ...relationship })),
        conflicts: this.data.conflicts.map((conflict) => ({ ...conflict })),
        world: {
          ...this.data.world,
          locations: this.data.world.locations.map((location) => ({ ...location })),
          rules: [...this.data.world.rules],
          customs: [...this.data.world.customs],
          sensoryTraits: [...this.data.world.sensoryTraits],
          sourceCardIds: [...this.data.world.sourceCardIds],
        },
        secrets: this.data.secrets.map((secret) => ({ ...secret })),
        narrator: { ...this.data.narrator },
        structures: this.data.structures.map((structure) => ({ ...structure })),
        acts: this.data.acts.map((act) => ({ ...act })),
        chapters: this.data.chapters.map((chapter) => ({ ...chapter })),
        scenes: this.data.scenes.map((scene) => ({ ...scene })),
        techniques: this.data.techniques.map((technique) => ({ ...technique, scope: { ...technique.scope } })),
        decisions: this.data.decisions.map((decision) => ({ ...decision })),
        bible: { ...this.data.bible },
        audit: {},
      },
    };
  }

  get id(): string { return this.data.id; }
  get revision(): number { return this.file.revision; }
  get deckVersion(): string { return this.file.deckVersion; }
  get identity(): WorkIdentity { return this.data.identity; }
  get genre(): GenreProfile { return this.data.genre; }
  get premise(): Premise { return this.data.premise; }
  get characters(): readonly Character[] { return this.data.characters; }
  get relationships(): readonly Relationship[] { return this.data.relationships; }
  get conflicts(): readonly Conflict[] { return this.data.conflicts; }
  get world(): World { return this.data.world; }
  get secrets(): readonly Secret[] { return this.data.secrets; }
  get narrator(): NarratorProfile { return this.data.narrator; }
  get structures(): readonly StructureChoice[] { return this.data.structures; }
  get acts(): readonly Act[] { return this.data.acts; }
  get chapters(): readonly Chapter[] { return this.data.chapters; }
  get scenes(): readonly Scene[] { return this.data.scenes; }
  get techniques(): readonly TechniqueAssignment[] { return this.data.techniques; }
  get decisions(): readonly Decision[] { return this.data.decisions; }
  get bible(): StoryBibleRef { return this.data.bible; }
  get audit(): AuditState { return this.data.audit; }

  chaptersOf(actId: string): readonly Chapter[] { return chaptersForAct(this.data.chapters, actId); }
  scenesOf(chapterId: string): readonly Scene[] { return scenesForChapter(this.data.scenes, chapterId); }

  findCharacter(id: string): Character | undefined { return this.data.characters.find((item) => item.id === id); }
  findConflict(id: string): Conflict | undefined { return this.data.conflicts.find((item) => item.id === id); }
  findAct(id: string): Act | undefined { return this.data.acts.find((item) => item.id === id); }
  findChapter(id: string): Chapter | undefined { return this.data.chapters.find((item) => item.id === id); }
  findScene(id: string): Scene | undefined { return this.data.scenes.find((item) => item.id === id); }

  // ---------------------------------------------------------------- persistência

  withRevision(revision: number): StoryProject {
    return new StoryProject(this.data, { ...this.file, revision });
  }

  withUpdatedAt(now: string): StoryProject {
    return new StoryProject({ ...this.data, updatedAt: now }, this.file);
  }

  markBibleDirty(dirty = true): StoryProject {
    return this.dirtyPatch({ bible: { ...this.data.bible, dirty } });
  }

  markBibleGenerated(now: string): StoryProject {
    return this.dirtyPatch({ bible: { ...this.data.bible, dirty: false, generatedAt: now } });
  }

  // ---------------------------------------------------------------- etapa 1/2

  withIdentity(patch: Partial<WorkIdentity>): StoryProject {
    return this.dirtyPatch({
      identity: {
        provisionalTitle: patch.provisionalTitle ?? this.data.identity.provisionalTitle,
        initialDescription: patch.initialDescription ?? this.data.identity.initialDescription,
        period: patch.period ?? this.data.identity.period,
      },
    });
  }

  withGenre(profile: GenreProfile): StoryProject {
    return this.dirtyPatch({ genre: profile });
  }

  withPremise(patch: Partial<Premise>): StoryProject {
    return this.dirtyPatch({ premise: { ...this.data.premise, ...patch } });
  }

  setPremiseApproval(field: PremiseField, approval: PremiseApproval): StoryProject {
    return this.dirtyPatch({
      premise: { ...this.data.premise, approvals: { ...this.data.premise.approvals, [field]: approval } },
    });
  }

  // ---------------------------------------------------------------- personagens

  addCharacter(character: Character): StoryProject {
    const normalized = characterFromJson(character, character.id);
    assertUniqueId(this.data.characters, normalized.id, 'personagem');
    return this.dirtyPatch({ characters: [...this.data.characters, normalized] });
  }

  updateCharacter(id: string, patch: Partial<Character>): StoryProject {
    assertExists(this.data.characters, id, 'Personagem');
    return this.dirtyPatch({
      characters: this.data.characters.map((item) => (item.id === id ? { ...item, ...patch, id } : item)),
    });
  }

  removeCharacter(id: string): StoryProject {
    assertExists(this.data.characters, id, 'Personagem');
    return this.dirtyPatch({
      characters: this.data.characters.filter((item) => item.id !== id),
      relationships: this.data.relationships.filter(
        (item) => item.fromCharacterId !== id && item.toCharacterId !== id,
      ),
    });
  }

  addRelationship(relationship: Relationship): StoryProject {
    assertUniqueId(this.data.relationships, relationship.id, 'relacionamento');
    assertExists(this.data.characters, relationship.fromCharacterId, 'Personagem de origem');
    assertExists(this.data.characters, relationship.toCharacterId, 'Personagem de destino');
    return this.dirtyPatch({ relationships: [...this.data.relationships, relationship] });
  }

  updateRelationship(id: string, patch: Partial<Relationship>): StoryProject {
    assertExists(this.data.relationships, id, 'Relacionamento');
    return this.dirtyPatch({
      relationships: this.data.relationships.map((item) => (item.id === id ? { ...item, ...patch, id } : item)),
    });
  }

  removeRelationship(id: string): StoryProject {
    assertExists(this.data.relationships, id, 'Relacionamento');
    return this.dirtyPatch({ relationships: this.data.relationships.filter((item) => item.id !== id) });
  }

  // ---------------------------------------------------------------- conflitos

  addConflict(conflict: Conflict): StoryProject {
    const normalized = conflictFromJson(conflict, conflict.id);
    assertUniqueId(this.data.conflicts, normalized.id, 'conflito');
    return this.withNormalizedConflicts([...this.data.conflicts, normalized]);
  }

  updateConflict(id: string, patch: Partial<Conflict>): StoryProject {
    assertExists(this.data.conflicts, id, 'Conflito');
    return this.withNormalizedConflicts(
      this.data.conflicts.map((item) => (item.id === id ? { ...item, ...patch, id } : item)),
    );
  }

  removeConflict(id: string): StoryProject {
    assertExists(this.data.conflicts, id, 'Conflito');
    return this.dirtyPatch({ conflicts: this.data.conflicts.filter((item) => item.id !== id) });
  }

  /** Garante o vínculo com personagem existente e no máximo um conflito principal. */
  private withNormalizedConflicts(conflicts: readonly Conflict[]): StoryProject {
    const characters = new Set(this.data.characters.map((item) => item.id));
    let mainSeen = false;
    const normalized = conflicts.map((conflict) => {
      if (conflict.linkedCharacterId && !characters.has(conflict.linkedCharacterId)) {
        throw new StoryError(
          'UNKNOWN_TARGET',
          `O conflito ${conflict.id} aponta para o personagem inexistente ${conflict.linkedCharacterId}.`,
        );
      }
      if (conflict.kind !== 'main') {
        return conflict;
      }
      if (mainSeen) {
        throw new StoryError('MULTIPLE_MAIN_CONFLICTS', 'Só pode existir um conflito principal.');
      }
      mainSeen = true;
      return conflict;
    });
    return this.dirtyPatch({ conflicts: normalized });
  }

  // ---------------------------------------------------------------- mundo

  withWorld(patch: Partial<World>): StoryProject {
    return this.dirtyPatch({ world: { ...this.data.world, ...patch } });
  }

  addLocation(location: Location): StoryProject {
    assertUniqueId(this.data.world.locations, location.id, 'localização');
    return this.dirtyPatch({ world: { ...this.data.world, locations: [...this.data.world.locations, location] } });
  }

  updateLocation(id: string, patch: Partial<Location>): StoryProject {
    assertExists(this.data.world.locations, id, 'Localização');
    return this.dirtyPatch({
      world: {
        ...this.data.world,
        locations: this.data.world.locations.map((item) => (item.id === id ? { ...item, ...patch, id } : item)),
      },
    });
  }

  removeLocation(id: string): StoryProject {
    assertExists(this.data.world.locations, id, 'Localização');
    return this.dirtyPatch({
      world: { ...this.data.world, locations: this.data.world.locations.filter((item) => item.id !== id) },
    });
  }

  // ---------------------------------------------------------------- segredos

  addSecret(secret: Secret): StoryProject {
    const normalized = secretFromJson(secret, secret.id);
    assertUniqueId(this.data.secrets, normalized.id, 'segredo');
    return this.dirtyPatch({ secrets: [...this.data.secrets, normalized] });
  }

  updateSecret(id: string, patch: Partial<Secret>): StoryProject {
    assertExists(this.data.secrets, id, 'Segredo');
    return this.dirtyPatch({
      secrets: this.data.secrets.map((item) => (item.id === id ? { ...item, ...patch, id } : item)),
    });
  }

  removeSecret(id: string): StoryProject {
    assertExists(this.data.secrets, id, 'Segredo');
    return this.dirtyPatch({ secrets: this.data.secrets.filter((item) => item.id !== id) });
  }

  // ---------------------------------------------------------------- narrador/estrutura

  setNarrator(profile: NarratorProfile): StoryProject {
    return this.dirtyPatch({ narrator: profile });
  }

  addStructure(choice: StructureChoice): StoryProject {
    if (!choice.cardId) {
      throw new StoryError('INVALID_HIERARCHY', 'A estrutura precisa de uma carta associada.');
    }
    if (this.data.structures.some((item) => item.cardId === choice.cardId)) {
      throw new StoryError('DUPLICATE_ID', `A estrutura ${choice.cardId} já foi escolhida.`);
    }
    return this.dirtyPatch({ structures: [...this.data.structures, choice] });
  }

  removeStructure(cardId: string): StoryProject {
    if (!this.data.structures.some((item) => item.cardId === cardId)) {
      throw new StoryError('ENTITY_NOT_FOUND', `Estrutura ${cardId} não foi escolhida neste projeto.`);
    }
    return this.dirtyPatch({ structures: this.data.structures.filter((item) => item.cardId !== cardId) });
  }

  // ---------------------------------------------------------------- atos

  addAct(act: Act): StoryProject {
    assertUniqueId(this.data.acts, act.id, 'ato');
    return this.dirtyPatch({ acts: renumberActs([...this.data.acts, act]) });
  }

  updateAct(id: string, patch: Partial<Act>): StoryProject {
    assertExists(this.data.acts, id, 'Ato');
    return this.dirtyPatch({
      acts: this.data.acts.map((item) => (item.id === id ? { ...item, ...patch, id } : item)),
    });
  }

  removeAct(id: string): StoryProject {
    assertExists(this.data.acts, id, 'Ato');
    const removedChapters = new Set(this.data.chapters.filter((chapter) => chapter.actId === id).map((c) => c.id));
    return this.dirtyPatch({
      acts: renumberActs(this.data.acts.filter((item) => item.id !== id)),
      chapters: renumberChapters(this.data.chapters.filter((item) => item.actId !== id)),
      scenes: this.data.scenes.filter((scene) => !removedChapters.has(scene.chapterId)),
    });
  }

  reorderActs(orderedIds: readonly string[]): StoryProject {
    return this.dirtyPatch({ acts: renumberActs(orderById(this.data.acts, orderedIds)) });
  }

  // ---------------------------------------------------------------- capítulos

  addChapter(chapter: Chapter): StoryProject {
    assertUniqueId(this.data.chapters, chapter.id, 'capítulo');
    if (!this.data.acts.some((act) => act.id === chapter.actId)) {
      throw new StoryError('INVALID_HIERARCHY', `O ato ${chapter.actId} não existe neste projeto.`);
    }
    return this.dirtyPatch({
      chapters: renumberChapters([...this.data.chapters, chapter], chapter.actId),
    });
  }

  updateChapter(id: string, patch: Partial<Chapter>): StoryProject {
    assertExists(this.data.chapters, id, 'Capítulo');
    const chapters = this.data.chapters.map((item) => (item.id === id ? { ...item, ...patch, id } : item));
    const target = chapters.find((item) => item.id === id)!;
    if (!this.data.acts.some((act) => act.id === target.actId)) {
      throw new StoryError('INVALID_HIERARCHY', `O ato ${target.actId} não existe neste projeto.`);
    }
    const previousActId = this.data.chapters.find((item) => item.id === id)!.actId;
    return this.dirtyPatch({
      chapters: renumberChapters(renumberChapters(chapters, previousActId), target.actId),
    });
  }

  /** Move o capítulo preservando o ID; renumeira os atos de origem e destino. */
  moveChapter(id: string, actId: string, index?: number): StoryProject {
    const chapter = this.findChapter(id);
    if (!chapter) {
      throw new StoryError('ENTITY_NOT_FOUND', `Capítulo ${id} não existe neste projeto.`);
    }
    if (!this.data.acts.some((act) => act.id === actId)) {
      throw new StoryError('INVALID_HIERARCHY', `O ato ${actId} não existe neste projeto.`);
    }
    const moved = { ...chapter, actId };
    const previousActId = chapter.actId;
    const chapters = moveInGroup(this.data.chapters, moved, (item) => item.actId === actId, index);
    return this.dirtyPatch({
      chapters: renumberChapters(renumberChapters(chapters, previousActId), actId),
    });
  }

  removeChapter(id: string): StoryProject {
    assertExists(this.data.chapters, id, 'Capítulo');
    const chapter = this.findChapter(id)!;
    return this.dirtyPatch({
      chapters: renumberChapters(this.data.chapters.filter((item) => item.id !== id), chapter.actId),
      scenes: this.data.scenes.filter((scene) => scene.chapterId !== id),
    });
  }

  reorderChapters(actId: string, orderedIds: readonly string[]): StoryProject {
    return this.dirtyPatch({
      chapters: renumberChapters(orderById(this.data.chapters, orderedIds), actId),
    });
  }

  // ---------------------------------------------------------------- cenas

  addScene(scene: Scene): StoryProject {
    const normalized = sceneFromJson(scene, scene.id);
    assertUniqueId(this.data.scenes, normalized.id, 'cena');
    if (!this.data.chapters.some((chapter) => chapter.id === normalized.chapterId)) {
      throw new StoryError('INVALID_HIERARCHY', `O capítulo ${normalized.chapterId} não existe neste projeto.`);
    }
    return this.dirtyPatch({ scenes: [...this.data.scenes, normalized] });
  }

  updateScene(id: string, patch: Partial<Scene>): StoryProject {
    assertExists(this.data.scenes, id, 'Cena');
    const scenes = this.data.scenes.map((item) => (item.id === id ? { ...item, ...patch, id } : item));
    const target = scenes.find((item) => item.id === id)!;
    if (!this.data.chapters.some((chapter) => chapter.id === target.chapterId)) {
      throw new StoryError('INVALID_HIERARCHY', `O capítulo ${target.chapterId} não existe neste projeto.`);
    }
    return this.dirtyPatch({ scenes });
  }

  /** Move a cena entre capítulos preservando `id`, `sourceCardIds` e a posição relativa. */
  moveScene(id: string, chapterId: string, index?: number): StoryProject {
    const scene = this.findScene(id);
    if (!scene) {
      throw new StoryError('ENTITY_NOT_FOUND', `Cena ${id} não existe neste projeto.`);
    }
    if (!this.data.chapters.some((chapter) => chapter.id === chapterId)) {
      throw new StoryError('INVALID_HIERARCHY', `O capítulo ${chapterId} não existe neste projeto.`);
    }
    const moved = { ...scene, chapterId };
    return this.dirtyPatch({
      scenes: moveInGroup(this.data.scenes, moved, (item) => item.chapterId === chapterId, index),
    });
  }

  removeScene(id: string): StoryProject {
    assertExists(this.data.scenes, id, 'Cena');
    return this.dirtyPatch({ scenes: this.data.scenes.filter((item) => item.id !== id) });
  }

  reorderScenes(chapterId: string, orderedIds: readonly string[]): StoryProject {
    const reordered = orderById(this.data.scenes.filter((scene) => scene.chapterId === chapterId), orderedIds);
    let cursor = 0;
    return this.dirtyPatch({
      scenes: this.data.scenes.map((scene) => (scene.chapterId === chapterId ? reordered[cursor++]! : scene)),
    });
  }

  // ---------------------------------------------------------------- técnicas

  assignTechnique(assignment: TechniqueAssignment): StoryProject {
    const duplicate = this.data.techniques.some(
      (item) => item.cardId === assignment.cardId && JSON.stringify(item.scope) === JSON.stringify(assignment.scope),
    );
    if (duplicate) {
      throw new StoryError('DUPLICATE_ID', `A técnica ${assignment.cardId} já está atribuída a este escopo.`);
    }
    return this.dirtyPatch({ techniques: [...this.data.techniques, assignment] });
  }

  updateTechnique(cardId: string, scope: TechniqueAssignment['scope'], patch: Partial<TechniqueAssignment>): StoryProject {
    const index = this.data.techniques.findIndex(
      (item) => item.cardId === cardId && JSON.stringify(item.scope) === JSON.stringify(scope),
    );
    if (index === -1) {
      throw new StoryError('ENTITY_NOT_FOUND', `Técnica ${cardId} não está atribuída a este escopo.`);
    }
    return this.dirtyPatch({
      techniques: this.data.techniques.map((item, position) =>
        position === index ? { ...item, ...patch, cardId, scope } : item,
      ),
    });
  }

  removeTechnique(cardId: string, scope: TechniqueAssignment['scope']): StoryProject {
    const techniques = this.data.techniques.filter(
      (item) => !(item.cardId === cardId && JSON.stringify(item.scope) === JSON.stringify(scope)),
    );
    if (techniques.length === this.data.techniques.length) {
      throw new StoryError('ENTITY_NOT_FOUND', `Técnica ${cardId} não está atribuída a este escopo.`);
    }
    return this.dirtyPatch({ techniques });
  }

  // ---------------------------------------------------------------- decisões

  addDecision(decision: Decision): StoryProject {
    assertUniqueId(this.data.decisions, decision.id, 'decisão');
    return this.dirtyPatch({ decisions: [...this.data.decisions, decision] });
  }

  updateDecision(id: string, patch: Partial<Decision>): StoryProject {
    assertExists(this.data.decisions, id, 'Decisão');
    return this.dirtyPatch({
      decisions: this.data.decisions.map((item) => (item.id === id ? { ...item, ...patch, id } : item)),
    });
  }

  removeDecision(id: string): StoryProject {
    assertExists(this.data.decisions, id, 'Decisão');
    return this.dirtyPatch({ decisions: this.data.decisions.filter((item) => item.id !== id) });
  }

  private dirtyPatch(patch: Partial<StoryProjectData>): StoryProject {
    return new StoryProject(
      { ...this.data, ...patch, bible: { ...this.data.bible, dirty: true } },
      this.file,
    );
  }
}

/** Estado vazio reutilizável por serviços e migração. */
export function createEmptyStoryProject(id: string, deckVersion: string, now: string): StoryProject {
  return StoryProject.create(id, deckVersion, now);
}

export { createEmptyCharacter, createEmptyConflict, createEmptyLocation, createEmptyScene, createEmptySecret, createEmptyNarrator, createEmptyPremise, createEmptyStoryBibleRef, createEmptyWorld };
