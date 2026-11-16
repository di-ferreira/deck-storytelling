/** Estágio 3 — Personagens e relacionamentos (CAT-01/02/04/11/12). */

export interface Character {
  readonly id: string;
  readonly name: string;
  readonly age: string;
  readonly description: string;
  readonly backstory: string;
  readonly storyRole: string;
  readonly externalDesire: string;
  readonly internalNeed: string;
  readonly motivation: string;
  readonly fear: string;
  readonly emotionalWound: string;
  readonly contradictions: readonly string[];
  readonly values: readonly string[];
  readonly flaws: readonly string[];
  readonly skills: readonly string[];
  readonly secrets: readonly string[];
  readonly arc: string;
  readonly archetypeIds: readonly string[];
  readonly motivationCardIds: readonly string[];
  readonly emotionCardIds: readonly string[];
}

export interface Relationship {
  readonly id: string;
  readonly fromCharacterId: string;
  readonly toCharacterId: string;
  readonly nature: string;
  readonly dynamic: string;
}

export function createEmptyCharacter(id: string): Character {
  return {
    id,
    name: '',
    age: '',
    description: '',
    backstory: '',
    storyRole: '',
    externalDesire: '',
    internalNeed: '',
    motivation: '',
    fear: '',
    emotionalWound: '',
    contradictions: [],
    values: [],
    flaws: [],
    skills: [],
    secrets: [],
    arc: '',
    archetypeIds: [],
    motivationCardIds: [],
    emotionCardIds: [],
  };
}

export function createEmptyRelationship(id: string): Relationship {
  return { id, fromCharacterId: '', toCharacterId: '', nature: '', dynamic: '' };
}

const LIST_FIELDS = [
  'contradictions',
  'values',
  'flaws',
  'skills',
  'secrets',
  'archetypeIds',
  'motivationCardIds',
  'emotionCardIds',
] as const;

const TEXT_FIELDS = [
  'id',
  'name',
  'age',
  'description',
  'backstory',
  'storyRole',
  'externalDesire',
  'internalNeed',
  'motivation',
  'fear',
  'emotionalWound',
  'arc',
] as const;

export function characterFromJson(json: Partial<Character> | undefined, fallbackId: string): Character {
  const empty = createEmptyCharacter(fallbackId);
  if (!json) {
    return empty;
  }
  const result: Record<string, unknown> = { ...empty };
  for (const field of TEXT_FIELDS) {
    result[field] = typeof json[field] === 'string' ? json[field] : empty[field];
  }
  for (const field of LIST_FIELDS) {
    result[field] = Array.isArray(json[field]) ? [...json[field]!] : [];
  }
  return result as unknown as Character;
}

export function relationshipFromJson(json: Partial<Relationship> | undefined, fallbackId: string): Relationship {
  if (!json) {
    return createEmptyRelationship(fallbackId);
  }
  return {
    id: typeof json.id === 'string' && json.id ? json.id : fallbackId,
    fromCharacterId: typeof json.fromCharacterId === 'string' ? json.fromCharacterId : '',
    toCharacterId: typeof json.toCharacterId === 'string' ? json.toCharacterId : '',
    nature: typeof json.nature === 'string' ? json.nature : '',
    dynamic: typeof json.dynamic === 'string' ? json.dynamic : '',
  };
}
