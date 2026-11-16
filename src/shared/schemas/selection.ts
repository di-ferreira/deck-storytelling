import { z } from 'zod';

/** Alvo de vínculo de carta. character/act/chapter/scene são forward references aceitas. */
export const cardLinkTargetSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('project') }),
  z.object({ type: z.literal('decision'), decisionId: z.string().min(1) }),
  z.object({ type: z.literal('genre'), genreId: z.string().min(1) }),
  z.object({ type: z.literal('character'), characterId: z.string().min(1) }),
  z.object({ type: z.literal('act'), actId: z.string().min(1) }),
  z.object({ type: z.literal('chapter'), chapterId: z.string().min(1) }),
  z.object({ type: z.literal('scene'), sceneId: z.string().min(1) }),
]);

export const cardLinkSchema = z.object({
  cardId: z.string().min(1),
  target: cardLinkTargetSchema,
  createdAt: z.string(),
  note: z.string().optional(),
});

export const selectionVersionSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string(),
  label: z.string(),
  cardIds: z.array(z.string().min(1)),
});

/** Formato persistido em `.storydeck/deck-selection.json`. Revision ausente = 0. */
export const deckSelectionFileSchema = z.object({
  schemaVersion: z.number().int().positive().optional(),
  projectId: z.string().optional(),
  selectedCardIds: z.array(z.string().min(1)).default([]),
  favoriteCardIds: z.array(z.string().min(1)).default([]),
  lockedCardIds: z.array(z.string().min(1)).default([]),
  versions: z.array(selectionVersionSchema).default([]),
  activeVersionId: z.string().default(''),
  links: z.array(cardLinkSchema).default([]),
  revision: z.number().int().nonnegative().default(0),
  updatedAt: z.string().default(''),
});

export type CardLinkTargetJson = z.infer<typeof cardLinkTargetSchema>;
export type CardLinkJson = z.infer<typeof cardLinkSchema>;
export type SelectionVersionJson = z.infer<typeof selectionVersionSchema>;
export type DeckSelectionFileJson = z.infer<typeof deckSelectionFileSchema>;
