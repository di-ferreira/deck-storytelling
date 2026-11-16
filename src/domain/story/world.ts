/** Estágio 5 — Mundo, localizações e atmosfera (CAT-05). */

export interface Location {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly sensoryNotes: string;
}

export interface World {
  readonly universe: string;
  readonly locations: readonly Location[];
  readonly rules: readonly string[];
  readonly culture: string;
  readonly society: string;
  readonly customs: readonly string[];
  readonly economy: string;
  readonly politics: string;
  readonly technology: string;
  readonly supernatural: string;
  readonly atmosphere: string;
  readonly sensoryTraits: readonly string[];
  readonly sourceCardIds: readonly string[];
}

export function createEmptyWorld(): World {
  return {
    universe: '',
    locations: [],
    rules: [],
    culture: '',
    society: '',
    customs: [],
    economy: '',
    politics: '',
    technology: '',
    supernatural: '',
    atmosphere: '',
    sensoryTraits: [],
    sourceCardIds: [],
  };
}

export function createEmptyLocation(id: string): Location {
  return { id, name: '', description: '', sensoryNotes: '' };
}

const WORLD_TEXT_FIELDS = [
  'universe',
  'culture',
  'society',
  'economy',
  'politics',
  'technology',
  'supernatural',
  'atmosphere',
] as const;

const WORLD_LIST_FIELDS = ['rules', 'customs', 'sensoryTraits', 'sourceCardIds'] as const;

export function worldFromJson(json: Partial<World> | undefined): World {
  const empty = createEmptyWorld();
  if (!json) {
    return empty;
  }
  const result: Record<string, unknown> = { ...empty };
  for (const field of WORLD_TEXT_FIELDS) {
    result[field] = typeof json[field] === 'string' ? json[field] : '';
  }
  for (const field of WORLD_LIST_FIELDS) {
    result[field] = Array.isArray(json[field]) ? [...json[field]!] : [];
  }
  result.locations = Array.isArray(json.locations)
    ? json.locations.map((location, index) => locationFromJson(location, `loc-${index + 1}`))
    : [];
  return result as unknown as World;
}

export function locationFromJson(json: Partial<Location> | undefined, fallbackId: string): Location {
  const empty = createEmptyLocation(fallbackId);
  if (!json) {
    return empty;
  }
  return {
    id: typeof json.id === 'string' && json.id ? json.id : fallbackId,
    name: typeof json.name === 'string' ? json.name : '',
    description: typeof json.description === 'string' ? json.description : '',
    sensoryNotes: typeof json.sensoryNotes === 'string' ? json.sensoryNotes : '',
  };
}
