import { z } from 'zod';
import { genreProfileSchema } from './genre';

/**
 * Fronteira de dados do Story Builder (Fase 5).
 * TODOS os campos têm default: um projeto recém-criado, incompleto ou v1 normalizado
 * sempre passa na validação. Nenhum schema reescreve texto do deck.
 */

export const premiseFieldSchema = z.enum([
  'centralIdea',
  'logline',
  'premise',
  'shortSynopsis',
  'expandedSynopsis',
  'centralTheme',
  'dramaticQuestion',
  'narrativeProposition',
  'differentiator',
]);

export const premiseApprovalSchema = z.enum(['draft', 'approved', 'edited']);

export const premiseSchema = z.object({
  centralIdea: z.string().default(''),
  logline: z.string().default(''),
  premise: z.string().default(''),
  shortSynopsis: z.string().default(''),
  expandedSynopsis: z.string().default(''),
  centralTheme: z.string().default(''),
  dramaticQuestion: z.string().default(''),
  narrativeProposition: z.string().default(''),
  differentiator: z.string().default(''),
  sourceCardIds: z.array(z.string()).default([]),
  approvals: z.record(premiseFieldSchema, premiseApprovalSchema).default({}),
});

export const workIdentitySchema = z.object({
  provisionalTitle: z.string().default(''),
  initialDescription: z.string().default(''),
  period: z.string().default(''),
});

export const characterSchema = z.object({
  id: z.string(),
  name: z.string().default(''),
  age: z.string().default(''),
  description: z.string().default(''),
  backstory: z.string().default(''),
  storyRole: z.string().default(''),
  externalDesire: z.string().default(''),
  internalNeed: z.string().default(''),
  motivation: z.string().default(''),
  fear: z.string().default(''),
  emotionalWound: z.string().default(''),
  contradictions: z.array(z.string()).default([]),
  values: z.array(z.string()).default([]),
  flaws: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  secrets: z.array(z.string()).default([]),
  arc: z.string().default(''),
  archetypeIds: z.array(z.string()).default([]),
  motivationCardIds: z.array(z.string()).default([]),
  emotionCardIds: z.array(z.string()).default([]),
});

export const relationshipSchema = z.object({
  id: z.string(),
  fromCharacterId: z.string().default(''),
  toCharacterId: z.string().default(''),
  nature: z.string().default(''),
  dynamic: z.string().default(''),
});

export const conflictSchema = z.object({
  id: z.string(),
  kind: z.enum(['main', 'secondary']).default('secondary'),
  description: z.string().default(''),
  obstacles: z.array(z.string()).default([]),
  opposition: z.string().default(''),
  moralDilemma: z.string().default(''),
  emotionalPressure: z.string().default(''),
  consequences: z.string().default(''),
  difficultChoices: z.array(z.string()).default([]),
  linkedCharacterId: z.string().default(''),
  linkedGoal: z.string().default(''),
  sourceCardIds: z.array(z.string()).default([]),
});

export const locationSchema = z.object({
  id: z.string(),
  name: z.string().default(''),
  description: z.string().default(''),
  sensoryNotes: z.string().default(''),
});

export const worldSchema = z.object({
  universe: z.string().default(''),
  locations: z.array(locationSchema).default([]),
  rules: z.array(z.string()).default([]),
  culture: z.string().default(''),
  society: z.string().default(''),
  customs: z.array(z.string()).default([]),
  economy: z.string().default(''),
  politics: z.string().default(''),
  technology: z.string().default(''),
  supernatural: z.string().default(''),
  atmosphere: z.string().default(''),
  sensoryTraits: z.array(z.string()).default([]),
  sourceCardIds: z.array(z.string()).default([]),
});

export const secretSchema = z.object({
  id: z.string(),
  description: z.string().default(''),
  knownByCharacterIds: z.array(z.string()).default([]),
  unknownByCharacterIds: z.array(z.string()).default([]),
  clues: z.array(z.string()).default([]),
  revelationMoment: z.string().default(''),
  consequences: z.string().default(''),
  readerPerceptionShift: z.string().default(''),
  narrativeSetup: z.string().default(''),
  factualTruth: z.string().default(''),
  readerAvailableInfo: z.string().default(''),
  sourceCardIds: z.array(z.string()).default([]),
});

export const narratorSchema = z.object({
  typeCardId: z.string().default(''),
  person: z.enum(['first', 'second', 'third', 'variable']).default('third'),
  focus: z.string().default(''),
  knowledgeLevel: z.string().default(''),
  reliability: z.string().default(''),
  perspectiveAlternation: z.string().default(''),
  informationLimits: z.string().default(''),
  sourceCardIds: z.array(z.string()).default([]),
});

export const structureChoiceSchema = z.object({
  cardId: z.string(),
  intent: z.string().default(''),
});

export const actSchema = z.object({
  id: z.string(),
  number: z.number().int().positive().default(1),
  title: z.string().default(''),
  goal: z.string().default(''),
  description: z.string().default(''),
  conflict: z.string().default(''),
  characterIds: z.array(z.string()).default([]),
  turningPoints: z.array(z.string()).default([]),
  expectedOutcome: z.string().default(''),
});

export const chapterSchema = z.object({
  id: z.string(),
  number: z.number().int().positive().default(1),
  title: z.string().default(''),
  description: z.string().default(''),
  actId: z.string().default(''),
  narrativeGoal: z.string().default(''),
  characterIds: z.array(z.string()).default([]),
  locationIds: z.array(z.string()).default([]),
  developmentStatus: z.enum(['planned', 'draft', 'revision', 'complete']).default('planned'),
});

export const sceneSchema = z.object({
  id: z.string(),
  title: z.string().default(''),
  chapterId: z.string().default(''),
  goal: z.string().default(''),
  focalCharacterId: z.string().default(''),
  presentCharacterIds: z.array(z.string()).default([]),
  locationId: z.string().default(''),
  chronologicalMoment: z.string().default(''),
  conflict: z.string().default(''),
  obstacle: z.string().default(''),
  tension: z.string().default(''),
  stateChange: z.string().default(''),
  consequence: z.string().default(''),
  hook: z.string().default(''),
  sourceCardIds: z.array(z.string()).default([]),
});

export const techniqueScopeSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('work') }),
  z.object({ type: z.literal('act'), actId: z.string() }),
  z.object({ type: z.literal('chapter'), chapterId: z.string() }),
  z.object({ type: z.literal('scene'), sceneId: z.string() }),
]);

export const techniqueSchema = z.object({
  cardId: z.string(),
  scope: techniqueScopeSchema,
  intent: z.string().default(''),
});

export const decisionSchema = z.object({
  id: z.string(),
  title: z.string().default(''),
  description: z.string().default(''),
  cardIds: z.array(z.string()).default([]),
  createdAt: z.string().default(''),
});

export const storyBibleRefSchema = z.object({
  generatedAt: z.string().default(''),
  path: z.string().default('Story/story-bible.md'),
  dirty: z.boolean().default(true),
  userEditsPreserved: z.boolean().default(true),
});

/** Auditoria reservada: nenhum campo existe ainda; objetos com qualquer conteúdo são ignorados. */
export const auditStateSchema = z.object({}).default({});

const emptyGenreProfile = {
  dominantGenreId: '',
  secondaryGenreIds: [],
  subGenresByGenre: {},
  contract: { promise: '', engine: '', conventions: '', freedom: '', reward: '' },
  dimensions: { tone: '', atmosphere: '', setting: '', audience: '', format: '', approximateLength: '' },
};

export const storyProjectDataSchema = z.object({
  id: z.string().default(''),
  createdAt: z.string().default(''),
  updatedAt: z.string().default(''),
  identity: workIdentitySchema.default({}),
  genre: genreProfileSchema.default(emptyGenreProfile),
  premise: premiseSchema.default({}),
  characters: z.array(characterSchema).default([]),
  relationships: z.array(relationshipSchema).default([]),
  conflicts: z.array(conflictSchema).default([]),
  world: worldSchema.default({}),
  secrets: z.array(secretSchema).default([]),
  narrator: narratorSchema.default({}),
  structures: z.array(structureChoiceSchema).default([]),
  acts: z.array(actSchema).default([]),
  chapters: z.array(chapterSchema).default([]),
  scenes: z.array(sceneSchema).default([]),
  techniques: z.array(techniqueSchema).default([]),
  decisions: z.array(decisionSchema).default([]),
  bible: storyBibleRefSchema.default({}),
  audit: auditStateSchema,
});

/** Formato integral do `project.json` v2. */
export const storyProjectFileSchema = z.object({
  schemaVersion: z.literal(2),
  deckVersion: z.string().default(''),
  revision: z.number().int().nonnegative().default(0),
  project: storyProjectDataSchema.default({}),
});

/** Códigos estáveis de aviso da projeção (nunca bloqueiam a obra). */
export const storyWarningCodeSchema = z.enum([
  'UNKNOWN_CARD',
  'UNKNOWN_TARGET',
  'ORPHAN_CHAPTER',
  'ORPHAN_SCENE',
  'DANGLING_CONFLICT_CHARACTER',
  'DANGLING_SECRET_CHARACTER',
  'DANGLING_RELATIONSHIP_CHARACTER',
  'MISSING_SOURCE_CARD',
]);

export const storyWarningSchema = z.object({
  code: storyWarningCodeSchema,
  message: z.string(),
  id: z.string().optional(),
  cardId: z.string().optional(),
});

export type StoryWarningCodeJson = z.infer<typeof storyWarningCodeSchema>;
export type StoryWarningJson = z.infer<typeof storyWarningSchema>;
export type PremiseSchema = z.infer<typeof premiseSchema>;
export type StoryProjectFileSchema = z.infer<typeof storyProjectFileSchema>;
