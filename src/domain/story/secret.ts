/** Estágio 6 — Segredos. A verdade factual NUNCA é confundida com a informação do leitor. */

export interface Secret {
  readonly id: string;
  readonly description: string;
  readonly knownByCharacterIds: readonly string[];
  readonly unknownByCharacterIds: readonly string[];
  readonly clues: readonly string[];
  readonly revelationMoment: string;
  readonly consequences: string;
  readonly readerPerceptionShift: string;
  readonly narrativeSetup: string;
  /** O que de fato aconteceu na trama. */
  readonly factualTruth: string;
  /** O que o leitor pode saber até o momento da revelação. */
  readonly readerAvailableInfo: string;
  readonly sourceCardIds: readonly string[];
}

export function createEmptySecret(id: string): Secret {
  return {
    id,
    description: '',
    knownByCharacterIds: [],
    unknownByCharacterIds: [],
    clues: [],
    revelationMoment: '',
    consequences: '',
    readerPerceptionShift: '',
    narrativeSetup: '',
    factualTruth: '',
    readerAvailableInfo: '',
    sourceCardIds: [],
  };
}

const SECRET_TEXT_FIELDS = [
  'description',
  'revelationMoment',
  'consequences',
  'readerPerceptionShift',
  'narrativeSetup',
  'factualTruth',
  'readerAvailableInfo',
] as const;

const SECRET_LIST_FIELDS = [
  'knownByCharacterIds',
  'unknownByCharacterIds',
  'clues',
  'sourceCardIds',
] as const;

export function secretFromJson(json: Partial<Secret> | undefined, fallbackId: string): Secret {
  const empty = createEmptySecret(fallbackId);
  if (!json) {
    return empty;
  }
  const result: Record<string, unknown> = { ...empty };
  for (const field of SECRET_TEXT_FIELDS) {
    result[field] = typeof json[field] === 'string' ? json[field] : '';
  }
  for (const field of SECRET_LIST_FIELDS) {
    result[field] = Array.isArray(json[field]) ? [...json[field]!] : [];
  }
  result.id = typeof json.id === 'string' && json.id ? json.id : fallbackId;
  return result as unknown as Secret;
}
