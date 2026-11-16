/**
 * Estágios 8–10 — Atos, capítulos, cenas e técnicas.
 *
 * Decisão de persistência: SOMENTE `Chapter.actId` e `Scene.chapterId` são gravados.
 * Listas como `act.chapterIds` ou `chapter.sceneIds` são DERIVADAS na projeção, na ordem
 * dos arrays do agregado. `number` é um rótulo de exibição renumerado a cada reordenação,
 * nunca um identificador.
 */

export type DevelopmentStatus = 'planned' | 'draft' | 'revision' | 'complete';

export interface Act {
  readonly id: string;
  readonly number: number;
  readonly title: string;
  readonly goal: string;
  readonly description: string;
  readonly conflict: string;
  readonly characterIds: readonly string[];
  readonly turningPoints: readonly string[];
  readonly expectedOutcome: string;
}

export interface Chapter {
  readonly id: string;
  readonly number: number;
  readonly title: string;
  readonly description: string;
  readonly actId: string;
  readonly narrativeGoal: string;
  readonly characterIds: readonly string[];
  readonly locationIds: readonly string[];
  readonly developmentStatus: DevelopmentStatus;
}

export interface Scene {
  readonly id: string;
  readonly title: string;
  readonly chapterId: string;
  readonly goal: string;
  readonly focalCharacterId: string;
  readonly presentCharacterIds: readonly string[];
  readonly locationId: string;
  readonly chronologicalMoment: string;
  readonly conflict: string;
  readonly obstacle: string;
  readonly tension: string;
  readonly stateChange: string;
  readonly consequence: string;
  readonly hook: string;
  readonly sourceCardIds: readonly string[];
}

export type TechniqueScope =
  | { readonly type: 'work' }
  | { readonly type: 'act'; readonly actId: string }
  | { readonly type: 'chapter'; readonly chapterId: string }
  | { readonly type: 'scene'; readonly sceneId: string };

export interface TechniqueAssignment {
  readonly cardId: string;
  readonly scope: TechniqueScope;
  readonly intent: string;
}

export function createEmptyAct(id: string, number = 1): Act {
  return {
    id,
    number,
    title: '',
    goal: '',
    description: '',
    conflict: '',
    characterIds: [],
    turningPoints: [],
    expectedOutcome: '',
  };
}

export function createEmptyChapter(id: string, actId: string, number = 1): Chapter {
  return {
    id,
    number,
    title: '',
    description: '',
    actId,
    narrativeGoal: '',
    characterIds: [],
    locationIds: [],
    developmentStatus: 'planned',
  };
}

export function createEmptyScene(id: string, chapterId: string): Scene {
  return {
    id,
    title: '',
    chapterId,
    goal: '',
    focalCharacterId: '',
    presentCharacterIds: [],
    locationId: '',
    chronologicalMoment: '',
    conflict: '',
    obstacle: '',
    tension: '',
    stateChange: '',
    consequence: '',
    hook: '',
    sourceCardIds: [],
  };
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function strings(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function actFromJson(json: Partial<Act> | undefined, fallbackId: string, number = 1): Act {
  const empty = createEmptyAct(fallbackId, number);
  if (!json) {
    return empty;
  }
  return {
    id: text(json.id) || fallbackId,
    number: Number.isInteger(json.number) && (json.number ?? 0) >= 1 ? json.number! : number,
    title: text(json.title),
    goal: text(json.goal),
    description: text(json.description),
    conflict: text(json.conflict),
    characterIds: strings(json.characterIds),
    turningPoints: strings(json.turningPoints),
    expectedOutcome: text(json.expectedOutcome),
  };
}

export function chapterFromJson(json: Partial<Chapter> | undefined, fallbackId: string, number = 1): Chapter {
  const empty = createEmptyChapter(fallbackId, '', number);
  if (!json) {
    return empty;
  }
  const status = json.developmentStatus;
  return {
    id: text(json.id) || fallbackId,
    number: Number.isInteger(json.number) && (json.number ?? 0) >= 1 ? json.number! : number,
    title: text(json.title),
    description: text(json.description),
    actId: text(json.actId),
    narrativeGoal: text(json.narrativeGoal),
    characterIds: strings(json.characterIds),
    locationIds: strings(json.locationIds),
    developmentStatus:
      status === 'draft' || status === 'revision' || status === 'complete' ? status : 'planned',
  };
}

export function sceneFromJson(json: Partial<Scene> | undefined, fallbackId: string): Scene {
  const empty = createEmptyScene(fallbackId, '');
  if (!json) {
    return empty;
  }
  return {
    id: text(json.id) || fallbackId,
    title: text(json.title),
    chapterId: text(json.chapterId),
    goal: text(json.goal),
    focalCharacterId: text(json.focalCharacterId),
    presentCharacterIds: strings(json.presentCharacterIds),
    locationId: text(json.locationId),
    chronologicalMoment: text(json.chronologicalMoment),
    conflict: text(json.conflict),
    obstacle: text(json.obstacle),
    tension: text(json.tension),
    stateChange: text(json.stateChange),
    consequence: text(json.consequence),
    hook: text(json.hook),
    sourceCardIds: strings(json.sourceCardIds),
  };
}

export function techniqueFromJson(json: Partial<TechniqueAssignment> | undefined): TechniqueAssignment | undefined {
  if (!json) {
    return undefined;
  }
  const raw = json.scope;
  let scope: TechniqueScope = { type: 'work' };
  if (raw && typeof raw === 'object') {
    if (raw.type === 'act' && raw.actId) scope = { type: 'act', actId: raw.actId };
    else if (raw.type === 'chapter' && raw.chapterId) scope = { type: 'chapter', chapterId: raw.chapterId };
    else if (raw.type === 'scene' && raw.sceneId) scope = { type: 'scene', sceneId: raw.sceneId };
  }
  return { cardId: text(json.cardId), scope, intent: text(json.intent) };
}

/** Capítulos de um ato, na ordem em que aparecem no agregado. */
export function chaptersForAct(chapters: readonly Chapter[], actId: string): readonly Chapter[] {
  return chapters.filter((chapter) => chapter.actId === actId);
}

/** Cenas de um capítulo, na ordem em que aparecem no agregado. */
export function scenesForChapter(scenes: readonly Scene[], chapterId: string): readonly Scene[] {
  return scenes.filter((scene) => scene.chapterId === chapterId);
}

/** Reatribui `number` sequencial por ato, preservando a ordem relativa dos capítulos. */
export function renumberChapters(chapters: readonly Chapter[], actId?: string): readonly Chapter[] {
  const counters = new Map<string, number>();
  return chapters.map((chapter) => {
    if (actId !== undefined && chapter.actId !== actId) {
      return chapter;
    }
    const next = (counters.get(chapter.actId) ?? 0) + 1;
    counters.set(chapter.actId, next);
    return chapter.number === next ? chapter : { ...chapter, number: next };
  });
}

export function renumberActs(acts: readonly Act[]): readonly Act[] {
  return acts.map((act, index) => (act.number === index + 1 ? act : { ...act, number: index + 1 }));
}
