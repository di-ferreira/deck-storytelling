/** Estágios 7 e 8 — Narrador/perspectiva e escolhas de estrutura (CAT-09/10/13). */

export type NarratorPerson = 'first' | 'second' | 'third' | 'variable';

export interface NarratorProfile {
  readonly typeCardId: string;
  readonly person: NarratorPerson;
  readonly focus: string;
  readonly knowledgeLevel: string;
  readonly reliability: string;
  readonly perspectiveAlternation: string;
  readonly informationLimits: string;
  readonly sourceCardIds: readonly string[];
}

export interface StructureChoice {
  readonly cardId: string;
  /** Por que esta estrutura foi combinada com as demais. */
  readonly intent: string;
}

export function createEmptyNarrator(): NarratorProfile {
  return {
    typeCardId: '',
    person: 'third',
    focus: '',
    knowledgeLevel: '',
    reliability: '',
    perspectiveAlternation: '',
    informationLimits: '',
    sourceCardIds: [],
  };
}

export function narratorFromJson(json: Partial<NarratorProfile> | undefined): NarratorProfile {
  const empty = createEmptyNarrator();
  if (!json) {
    return empty;
  }
  const person: NarratorPerson =
    json.person === 'first' || json.person === 'second' || json.person === 'third' || json.person === 'variable'
      ? json.person
      : 'third';
  return {
    typeCardId: typeof json.typeCardId === 'string' ? json.typeCardId : '',
    person,
    focus: typeof json.focus === 'string' ? json.focus : '',
    knowledgeLevel: typeof json.knowledgeLevel === 'string' ? json.knowledgeLevel : '',
    reliability: typeof json.reliability === 'string' ? json.reliability : '',
    perspectiveAlternation: typeof json.perspectiveAlternation === 'string' ? json.perspectiveAlternation : '',
    informationLimits: typeof json.informationLimits === 'string' ? json.informationLimits : '',
    sourceCardIds: Array.isArray(json.sourceCardIds) ? [...json.sourceCardIds] : [],
  };
}

export function structureChoiceFromJson(json: Partial<StructureChoice> | undefined): StructureChoice {
  if (!json) {
    return { cardId: '', intent: '' };
  }
  return {
    cardId: typeof json.cardId === 'string' ? json.cardId : '',
    intent: typeof json.intent === 'string' ? json.intent : '',
  };
}
