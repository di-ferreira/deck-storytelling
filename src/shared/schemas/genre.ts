import { z } from 'zod';

/**
 * Schemas do Genre Builder (Fase 4).
 * São a fronteira de dados: formulário da webview, arquivo `.storydeck/story-state.json`
 * (`stepStates.genre`) e payloads de mensagem. Nenhum schema reescreve textos do deck.
 */

export const genreContractSchema = z.object({
  promise: z.string(),
  engine: z.string(),
  conventions: z.string(),
  freedom: z.string(),
  reward: z.string(),
});

export const identityDimensionsSchema = z.object({
  tone: z.string(),
  atmosphere: z.string(),
  setting: z.string(),
  audience: z.string(),
  format: z.string(),
  approximateLength: z.string(),
});

export const genreProfileSchema = z.object({
  dominantGenreId: z.string(),
  secondaryGenreIds: z.array(z.string()).max(2),
  subGenresByGenre: z.record(z.string(), z.array(z.string())),
  contract: genreContractSchema,
  dimensions: identityDimensionsSchema,
});

/** Formato persistido em `stepStates.genre`. */
export const genreStepSchema = genreProfileSchema.extend({
  schemaVersion: z.literal(1),
  updatedAt: z.string(),
});

/** Códigos estáveis de aviso; devem coincidir com `GenreWarningCode` do domínio. */
export const genreWarningCodeSchema = z.enum([
  'UNKNOWN_GENRE_IN_PROFILE',
  'UNKNOWN_SUBGENRE_IN_PROFILE',
  'ORPHAN_SUBGENRE',
  'UNKNOWN_SUBGENRE',
]);

export const genreWarningSchema = z.object({
  code: genreWarningCodeSchema,
  message: z.string(),
  genreId: z.string().optional(),
  subGenreName: z.string().optional(),
});

/** Projeção de uma carta de gênero para a webview (somente leitura). */
export const genreContextCardSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  sourceConcept: z.string(),
  genreFamily: z.string(),
  genreLevel: z.string(),
  readerPromise: z.string(),
  coreConventions: z.string(),
  storyEngine: z.string(),
  pitfalls: z.string(),
  compatibleGenres: z.array(z.string()),
  subGenres: z.array(z.string()),
});

export const resolvedSubGenreSchema = z.object({
  name: z.string().min(1),
  parentGenreId: z.string().min(1),
  /** Rastreio histórico de `sub_genre_details[].source_card_id`; nunca uma carta do catálogo. */
  sourceCardId: z.string().min(1),
  prompt: z.string(),
  question: z.string(),
  suggestedUse: z.string(),
  readerPromise: z.string(),
  coreConventions: z.string(),
  pitfalls: z.string(),
  compatibleGenres: z.array(z.string()),
});

export const genreContextPayloadSchema = z.object({
  dominant: genreContextCardSchema.nullable(),
  secondaries: z.array(genreContextCardSchema),
  subGenres: z.array(resolvedSubGenreSchema),
  contract: genreContractSchema,
  dimensions: identityDimensionsSchema,
  warnings: z.array(genreWarningSchema),
});

/** Payload host → webview do Genre Builder: perfil persistido, contexto derivado e revisão. */
export const genrePayloadSchema = z.object({
  profile: genreProfileSchema,
  context: genreContextPayloadSchema,
  revision: z.number().int().nonnegative(),
  /** Catálogo completo de gêneros (32 cartas ativas) para os seletores. */
  genreCatalog: z.array(genreContextCardSchema).default([]),
  /** Rótulos das 5 perguntas, lidos de usage.genre_contract do deck. */
  contractLabels: z.array(z.string()).default([]),
});

/** Modo de visualização do Genre Builder. Projeção de UI: nunca é persistido. */
export const genreModeSchema = z.enum(['identity', 'contract']);

export type GenreContractJson = z.infer<typeof genreContractSchema>;
export type IdentityDimensionsJson = z.infer<typeof identityDimensionsSchema>;
export type GenreProfileJsonParsed = z.infer<typeof genreProfileSchema>;
export type GenreStepJson = z.infer<typeof genreStepSchema>;
export type GenreWarningJson = z.infer<typeof genreWarningSchema>;
export type GenreContextPayload = z.infer<typeof genreContextPayloadSchema>;
export type GenrePayload = z.infer<typeof genrePayloadSchema>;
export type GenreMode = z.infer<typeof genreModeSchema>;
