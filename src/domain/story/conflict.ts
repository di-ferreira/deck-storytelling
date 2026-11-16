/** Estágio 4 — Conflitos. Cada conflito aponta para umpersonagem existente e um objetivo. */

export type ConflictKind = 'main' | 'secondary';

export interface Conflict {
  readonly id: string;
  readonly kind: ConflictKind;
  readonly description: string;
  readonly obstacles: readonly string[];
  readonly opposition: string;
  readonly moralDilemma: string;
  readonly emotionalPressure: string;
  readonly consequences: string;
  readonly difficultChoices: readonly string[];
  /** ID do personagem cujo objetivo está em jogo. */
  readonly linkedCharacterId: string;
  /** Objetivo do personagem que este conflito coloca em risco. */
  readonly linkedGoal: string;
  readonly sourceCardIds: readonly string[];
}

export function createEmptyConflict(id: string): Conflict {
  return {
    id,
    kind: 'secondary',
    description: '',
    obstacles: [],
    opposition: '',
    moralDilemma: '',
    emotionalPressure: '',
    consequences: '',
    difficultChoices: [],
    linkedCharacterId: '',
    linkedGoal: '',
    sourceCardIds: [],
  };
}

export function conflictFromJson(json: Partial<Conflict> | undefined, fallbackId: string): Conflict {
  const empty = createEmptyConflict(fallbackId);
  if (!json) {
    return empty;
  }
  return {
    id: typeof json.id === 'string' && json.id ? json.id : fallbackId,
    kind: json.kind === 'main' || json.kind === 'secondary' ? json.kind : 'secondary',
    description: typeof json.description === 'string' ? json.description : '',
    obstacles: Array.isArray(json.obstacles) ? [...json.obstacles] : [],
    opposition: typeof json.opposition === 'string' ? json.opposition : '',
    moralDilemma: typeof json.moralDilemma === 'string' ? json.moralDilemma : '',
    emotionalPressure: typeof json.emotionalPressure === 'string' ? json.emotionalPressure : '',
    consequences: typeof json.consequences === 'string' ? json.consequences : '',
    difficultChoices: Array.isArray(json.difficultChoices) ? [...json.difficultChoices] : [],
    linkedCharacterId: typeof json.linkedCharacterId === 'string' ? json.linkedCharacterId : '',
    linkedGoal: typeof json.linkedGoal === 'string' ? json.linkedGoal : '',
    sourceCardIds: Array.isArray(json.sourceCardIds) ? [...json.sourceCardIds] : [],
  };
}
