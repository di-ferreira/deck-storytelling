import { z } from 'zod';
import { cardKindSchema } from './schemas/deck';
import {
  genreContractSchema,
  genreModeSchema,
  genrePayloadSchema,
  identityDimensionsSchema,
} from './schemas/genre';
import { cardLinkSchema, cardLinkTargetSchema, selectionVersionSchema } from './schemas/selection';
import { spreadDefinitionSchema, spreadStateSchema } from './schemas/spread';
import {
  actSchema,
  characterSchema,
  chapterSchema,
  conflictSchema,
  decisionSchema,
  locationSchema,
  narratorSchema,
  premiseApprovalSchema,
  premiseFieldSchema,
  premiseSchema,
  relationshipSchema,
  sceneSchema,
  secretSchema,
  storyProjectFileSchema,
  storyWarningSchema,
  structureChoiceSchema,
  techniqueScopeSchema,
  workIdentitySchema,
  worldSchema,
} from './schemas/story';

function storyEntity<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  return schema.extend({ id: z.string().min(1) });
}

/** Intenções semânticas do Story Builder. Nenhum comando arbitrário atravessa a fronteira. */
export const storyActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('updateIdentity'), patch: workIdentitySchema.partial() }),
  z.object({ action: z.literal('updatePremise'), patch: premiseSchema.partial() }),
  z.object({ action: z.literal('setPremiseApproval'), field: premiseFieldSchema, approval: premiseApprovalSchema }),
  z.object({ action: z.literal('addCharacter'), entity: storyEntity(characterSchema).partial().required({ id: true }) }),
  z.object({ action: z.literal('updateCharacter'), id: z.string().min(1), patch: characterSchema.partial() }),
  z.object({ action: z.literal('removeCharacter'), id: z.string().min(1) }),
  z.object({ action: z.literal('addRelationship'), entity: storyEntity(relationshipSchema).partial().required({ id: true }) }),
  z.object({ action: z.literal('updateRelationship'), id: z.string().min(1), patch: relationshipSchema.partial() }),
  z.object({ action: z.literal('removeRelationship'), id: z.string().min(1) }),
  z.object({ action: z.literal('addConflict'), entity: storyEntity(conflictSchema).partial().required({ id: true }) }),
  z.object({ action: z.literal('updateConflict'), id: z.string().min(1), patch: conflictSchema.partial() }),
  z.object({ action: z.literal('removeConflict'), id: z.string().min(1) }),
  z.object({ action: z.literal('updateWorld'), patch: worldSchema.partial() }),
  z.object({ action: z.literal('addLocation'), entity: storyEntity(locationSchema).partial().required({ id: true }) }),
  z.object({ action: z.literal('updateLocation'), id: z.string().min(1), patch: locationSchema.partial() }),
  z.object({ action: z.literal('removeLocation'), id: z.string().min(1) }),
  z.object({ action: z.literal('addSecret'), entity: storyEntity(secretSchema).partial().required({ id: true }) }),
  z.object({ action: z.literal('updateSecret'), id: z.string().min(1), patch: secretSchema.partial() }),
  z.object({ action: z.literal('removeSecret'), id: z.string().min(1) }),
  z.object({ action: z.literal('setNarrator'), profile: narratorSchema }),
  z.object({ action: z.literal('addStructure'), choice: structureChoiceSchema }),
  z.object({ action: z.literal('removeStructure'), cardId: z.string().min(1) }),
  z.object({ action: z.literal('addAct'), entity: storyEntity(actSchema).partial().required({ id: true }) }),
  z.object({ action: z.literal('updateAct'), id: z.string().min(1), patch: actSchema.partial() }),
  z.object({ action: z.literal('removeAct'), id: z.string().min(1) }),
  z.object({ action: z.literal('reorderActs'), orderedIds: z.array(z.string().min(1)) }),
  z.object({ action: z.literal('addChapter'), entity: storyEntity(chapterSchema).partial().required({ id: true }) }),
  z.object({ action: z.literal('updateChapter'), id: z.string().min(1), patch: chapterSchema.partial() }),
  z.object({ action: z.literal('removeChapter'), id: z.string().min(1) }),
  z.object({ action: z.literal('moveChapter'), id: z.string().min(1), actId: z.string().min(1), index: z.number().int().nonnegative().optional() }),
  z.object({ action: z.literal('reorderChapters'), actId: z.string().min(1), orderedIds: z.array(z.string().min(1)) }),
  z.object({ action: z.literal('addScene'), entity: storyEntity(sceneSchema).partial().required({ id: true }) }),
  z.object({ action: z.literal('updateScene'), id: z.string().min(1), patch: sceneSchema.partial() }),
  z.object({ action: z.literal('removeScene'), id: z.string().min(1) }),
  z.object({ action: z.literal('moveScene'), id: z.string().min(1), chapterId: z.string().min(1), index: z.number().int().nonnegative().optional() }),
  z.object({ action: z.literal('reorderScenes'), chapterId: z.string().min(1), orderedIds: z.array(z.string().min(1)) }),
  z.object({ action: z.literal('assignTechnique'), cardId: z.string().min(1), scope: techniqueScopeSchema, intent: z.string() }),
  z.object({ action: z.literal('updateTechnique'), cardId: z.string().min(1), scope: techniqueScopeSchema, patch: z.object({ intent: z.string() }) }),
  z.object({ action: z.literal('removeTechnique'), cardId: z.string().min(1), scope: techniqueScopeSchema }),
  z.object({ action: z.literal('addDecision'), entity: storyEntity(decisionSchema).partial().required({ id: true }) }),
  z.object({ action: z.literal('updateDecision'), id: z.string().min(1), patch: decisionSchema.partial() }),
  z.object({ action: z.literal('removeDecision'), id: z.string().min(1) }),
  z.object({ action: z.literal('markBibleDirty'), dirty: z.boolean() }),
]);

export const storyDocumentKindSchema = z.enum(['premise', 'story-bible', 'outline', 'narrative-decisions']);

export const storyPayloadSchema = z.object({
  project: storyProjectFileSchema,
  warnings: z.array(storyWarningSchema),
  revision: z.number().int().nonnegative(),
});

/**
 * Protocolo Webview <-> Extension Host.
 * NENHUM comando arbitrário atravessa esta fronteira: apenas intenções semânticas.
 * As duas direções são validadas com Zod no host (e no cliente da webview).
 */

export const webviewToHostMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ready') }),
  z.object({ type: z.literal('requestOverview') }),
  z.object({ type: z.literal('selectCard'), cardId: z.string().min(1) }),
  z.object({
    type: z.literal('setFilter'),
    categoryId: z.string().optional(),
    kind: z.string().optional(),
    query: z.string().optional(),
    tag: z.string().optional(),
    /** Aba ativa: catálogo completo, somente selecionadas ou somente favoritas. */
    view: z.enum(['catalog', 'selection', 'favorites']).optional(),
  }),
  z.object({ type: z.literal('getSelection') }),
  z.object({ type: z.literal('deselectCard'), cardId: z.string().min(1) }),
  z.object({ type: z.literal('toggleFavorite'), cardId: z.string().min(1) }),
  z.object({ type: z.literal('toggleLock'), cardId: z.string().min(1) }),
  z.object({ type: z.literal('replaceCard'), cardId: z.string().min(1), newCardId: z.string().min(1) }),
  z.object({
    type: z.literal('drawCards'),
    count: z.number().int().positive().max(20),
    from: z.enum(['catalog', 'selection']),
    categoryIds: z.array(z.string().min(1)).optional(),
    kinds: z.array(cardKindSchema).optional(),
  }),
  z.object({ type: z.literal('shuffleSelection') }),
  z.object({ type: z.literal('saveVersion'), label: z.string().min(1).max(80) }),
  z.object({ type: z.literal('restoreVersion'), versionId: z.string().min(1) }),
  z.object({
    type: z.literal('addLink'),
    cardId: z.string().min(1),
    target: cardLinkTargetSchema,
    note: z.string().max(500).optional(),
  }),
  z.object({ type: z.literal('removeLink'), cardId: z.string().min(1), target: cardLinkTargetSchema }),
  z.object({ type: z.literal('listSpreads') }),
  z.object({ type: z.literal('startSpread'), spreadId: z.string().min(1) }),
  z.object({ type: z.literal('drawSpreadSlot'), spreadId: z.string().min(1), slotId: z.string().min(1) }),
  z.object({ type: z.literal('saveSpread'), spreadId: z.string().min(1) }),
  z.object({ type: z.literal('getGenre') }),
  /** String vazia limpa o dominante e devolve o perfil ao estado de rascunho. */
  z.object({ type: z.literal('setDominantGenre'), genreId: z.string() }),
  z.object({ type: z.literal('addSecondaryGenre'), genreId: z.string().min(1) }),
  z.object({ type: z.literal('removeSecondaryGenre'), genreId: z.string().min(1) }),
  z.object({
    type: z.literal('setSubGenres'),
    genreId: z.string().min(1),
    names: z.array(z.string().max(200)).max(20),
  }),
  z.object({ type: z.literal('setContract'), contract: genreContractSchema.partial() }),
  z.object({ type: z.literal('setDimensions'), dimensions: identityDimensionsSchema.partial() }),
  z.object({ type: z.literal('regenerateGenreContract') }),
  z.object({ type: z.literal('setMode'), mode: genreModeSchema }),
  // Story Builder (Fase 5)
  z.object({ type: z.literal('getStory') }),
  z.object({ type: z.literal('storyAction'), action: storyActionSchema }),
  z.object({ type: z.literal('regenerateStoryDocument'), kind: storyDocumentKindSchema }),
]);

export const categorySummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  short: z.string(),
  color: z.string(),
  cardCount: z.number().int().nonnegative(),
});

export const overviewPayloadSchema = z.object({
  deckId: z.string(),
  deckVersion: z.string(),
  language: z.string(),
  cardCount: z.number().int().nonnegative(),
  categoryCount: z.number().int().nonnegative(),
  categories: z.array(categorySummarySchema),
  kinds: z.record(z.string(), z.number().int().nonnegative()),
  findings: z.object({
    errors: z.number().int().nonnegative(),
    warnings: z.number().int().nonnegative(),
    infos: z.number().int().nonnegative(),
  }),
  novelAssistant: z.object({
    installed: z.boolean(),
    version: z.string().nullable(),
  }),
  projectRoot: z.string().nullable(),
});

/** Definição integral de um subgênero, copiada do JSON do deck sem reescrita. */
export const subGenreSummarySchema = z.object({
  name: z.string(),
  prompt: z.string(),
  question: z.string(),
  suggestedUse: z.string(),
  readerPromise: z.string(),
  coreConventions: z.string(),
  pitfalls: z.string(),
  compatibleGenres: z.array(z.string()),
});

/**
 * Projeção de uma carta para a webview.
 * `selected`/`favorite`/`locked` são o estado persistido; o restante é conteúdo
 * integral do deck, necessário ao painel de detalhe (nenhum texto é resumido).
 */
export const cardSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: z.string(),
  categoryId: z.string(),
  categoryName: z.string(),
  color: z.string(),
  selected: z.boolean(),
  favorite: z.boolean().optional(),
  locked: z.boolean().optional(),
  prompt: z.string().optional(),
  question: z.string().optional(),
  suggestedUse: z.string().optional(),
  tags: z.array(z.string()).optional(),
  sourceConcept: z.string().optional(),
  genreAdaptation: z.string().optional(),
  genreRelevantAxis: z.string().optional(),
  genreFamily: z.string().optional(),
  genreLevel: z.string().optional(),
  readerPromise: z.string().optional(),
  storyEngine: z.string().optional(),
  coreConventions: z.string().optional(),
  pitfalls: z.string().optional(),
  compatibleGenres: z.array(z.string()).optional(),
  subGenres: z.array(z.string()).optional(),
  subGenreDetails: z.array(subGenreSummarySchema).optional(),
});

export const cardsPayloadSchema = z.object({
  cards: z.array(cardSummarySchema),
  total: z.number().int().nonnegative(),
  query: z.string(),
  categoryId: z.string().optional(),
  kind: z.string().optional(),
  tag: z.string().optional(),
  view: z.enum(['catalog', 'selection', 'favorites']).optional(),
  /** IDs sorteados na última ação, para destaque visual; nunca persistidos. */
  drawnCardIds: z.array(z.string()).optional(),
});

export const selectionPayloadSchema = z.object({
  projectId: z.string(),
  selectedCardIds: z.array(z.string()),
  favoriteCardIds: z.array(z.string()),
  lockedCardIds: z.array(z.string()),
  versions: z.array(selectionVersionSchema),
  activeVersionId: z.string(),
  links: z.array(cardLinkSchema),
  revision: z.number().int().nonnegative(),
  updatedAt: z.string(),
});

export const spreadsPayloadSchema = z.object({
  spreads: z.array(spreadDefinitionSchema),
});

export const spreadStatePayloadSchema = z.object({
  state: spreadStateSchema,
});

export const hostToWebviewMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('overview'), payload: overviewPayloadSchema }),
  z.object({ type: z.literal('cards'), payload: cardsPayloadSchema }),
  z.object({ type: z.literal('error'), message: z.string() }),
  z.object({ type: z.literal('selectionChanged'), cardId: z.string(), selected: z.boolean() }),
  z.object({ type: z.literal('selection'), payload: selectionPayloadSchema }),
  z.object({ type: z.literal('spreads'), payload: spreadsPayloadSchema }),
  z.object({ type: z.literal('spreadState'), payload: spreadStatePayloadSchema }),
  z.object({ type: z.literal('genre'), payload: genrePayloadSchema }),
  z.object({ type: z.literal('mode'), mode: genreModeSchema }),
  z.object({ type: z.literal('story'), payload: storyPayloadSchema }),
]);

export type WebviewToHostMessage = z.infer<typeof webviewToHostMessageSchema>;
export type HostToWebviewMessage = z.infer<typeof hostToWebviewMessageSchema>;
export type OverviewPayload = z.infer<typeof overviewPayloadSchema>;
export type CategorySummary = z.infer<typeof categorySummarySchema>;
export type CardSummary = z.infer<typeof cardSummarySchema>;
export type SubGenreSummary = z.infer<typeof subGenreSummarySchema>;
export type CardsPayload = z.infer<typeof cardsPayloadSchema>;
export type SelectionPayload = z.infer<typeof selectionPayloadSchema>;
export type SpreadsPayload = z.infer<typeof spreadsPayloadSchema>;
export type SpreadStatePayload = z.infer<typeof spreadStatePayloadSchema>;
export type GenrePayload = z.infer<typeof genrePayloadSchema>;
export type GenreMode = z.infer<typeof genreModeSchema>;
export type StoryAction = z.infer<typeof storyActionSchema>;
export type StoryDocumentKindMessage = z.infer<typeof storyDocumentKindSchema>;
export type StoryPayload = z.infer<typeof storyPayloadSchema>;
