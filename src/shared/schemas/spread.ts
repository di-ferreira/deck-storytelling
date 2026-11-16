import { z } from 'zod';
import { cardKindSchema } from './deck';

/**
 * Tiragens são DADOS: o schema valida o recurso, nunca reescreve textos.
 * `drawText` e `purpose` devem ser idênticos aos de `usage.recommended_spreads`.
 */
export const spreadSlotSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  categoryIds: z.array(z.string().min(1)).optional(),
  kinds: z.array(cardKindSchema).optional(),
  count: z.number().int().positive(),
  source: z.enum(['deck', 'selection']),
});

export const spreadDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  purpose: z.string().min(1),
  drawText: z.string().min(1),
  slots: z.array(spreadSlotSchema).min(1),
  custom: z.boolean(),
});

export const spreadCatalogFileSchema = z.object({
  schemaVersion: z.number().int().positive(),
  spreads: z.array(spreadDefinitionSchema).min(1),
});

export const spreadStatusSchema = z.enum(['idle', 'in-progress', 'complete']);

export const spreadStateSchema = z.object({
  spreadId: z.string().min(1),
  slotCardIds: z.record(z.string(), z.array(z.string())),
  status: spreadStatusSchema,
  result: z.string().optional(),
  savedAt: z.string().optional(),
});

/** Formato persistido em `.storydeck/story-state.json`. Revision ausente = 0. */
export const storyStateFileSchema = z.object({
  schemaVersion: z.number().int().positive().optional(),
  revision: z.number().int().nonnegative().default(0),
  stepStates: z.record(z.string(), z.unknown()).default({}),
  spreads: z.array(spreadStateSchema).default([]),
});

export type SpreadSlot = z.infer<typeof spreadSlotSchema>;
export type SpreadDefinition = z.infer<typeof spreadDefinitionSchema>;
export type SpreadCatalogFile = z.infer<typeof spreadCatalogFileSchema>;
export type SpreadStatus = z.infer<typeof spreadStatusSchema>;
export type SpreadState = z.infer<typeof spreadStateSchema>;
