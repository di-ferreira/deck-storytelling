import { z } from 'zod';

/**
 * Schema estrutural do ENTRELINHAS v4.
 * Validações semânticas (contagens, referências, coerência de subgêneros)
 * vivem em infrastructure/deck/deck-validator.ts e produzem findings.
 */

export const cardKindSchema = z.enum([
  'genre_definition',
  'creative_prompt',
  'archetype',
  'narrator',
  'structure',
  'technique',
  'craft_warning',
]);

export type CardKind = z.infer<typeof cardKindSchema>;

export const categorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  short: z.string().min(1),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  description: z.string().min(1),
});

export const subGenreDetailSchema = z.object({
  name: z.string().min(1),
  source_card_id: z.string().min(1),
  prompt: z.string().min(1),
  question: z.string().min(1),
  suggested_use: z.string().min(1),
  reader_promise: z.string().min(1),
  core_conventions: z.string().min(1),
  pitfalls: z.string().min(1),
  compatible_genres: z.array(z.string()),
});

const cardBaseSchema = z.object({
  id: z.string().min(1),
  category_id: z.string().min(1),
  category: z.string().min(1),
  title: z.string().min(1),
  prompt: z.string().min(1),
  question: z.string().min(1),
  suggested_use: z.string().min(1),
  tags: z.array(z.string()),
  source_concept: z.string().min(1),
});

export const genreCardSchema = cardBaseSchema.extend({
  kind: z.literal('genre_definition'),
  genre_family: z.string().min(1),
  genre_level: z.string().min(1),
  reader_promise: z.string().min(1),
  core_conventions: z.string().min(1),
  story_engine: z.string().min(1),
  pitfalls: z.string().min(1),
  compatible_genres: z.array(z.string()),
  genre_selection_role: z.string().min(1),
  sub_genre: z.array(z.string()),
  sub_genre_details: z.array(subGenreDetailSchema),
  merged_from: z.array(z.string()),
});

export const nonGenreCardSchema = cardBaseSchema.extend({
  kind: z.enum(['creative_prompt', 'archetype', 'narrator', 'structure', 'technique', 'craft_warning']),
  genre_adaptation: z.string().min(1),
  genre_relevant_axis: z.string().min(1),
  merged_cards: z.array(z.string()).optional(),
  merged_card_note: z.string().optional(),
});

export const cardSchema = z.discriminatedUnion('kind', [genreCardSchema, nonGenreCardSchema]);

const taxonomySourceSchema = z.object({
  title: z.string().min(1),
  url: z.string().min(1),
});

const usageSchema = z.object({
  selection_method: z.array(z.string()),
  genre_contract: z.array(z.string()),
  recommended_spreads: z.array(
    z.object({
      name: z.string().min(1),
      draw: z.string().min(1),
      purpose: z.string().min(1),
    }),
  ),
  taxonomy_notes: z.array(z.string()),
});

const editorialAuditSchema = z.object({
  source_version: z.string().min(1),
  source_card_count: z.number().int().nonnegative(),
  result_card_count: z.number().int().nonnegative(),
  genre_cards_before: z.number().int().nonnegative(),
  genre_cards_after: z.number().int().nonnegative(),
  non_genre_cards_removed: z.array(z.string()),
  genre_consolidations: z.array(
    z.object({
      parent_card_id: z.string().min(1),
      parent_title: z.string().min(1),
      merged_card_ids: z.array(z.string()),
      merged_titles: z.array(z.string()),
      reason: z.string().min(1),
    }),
  ),
  non_genre_merges: z.array(
    z.object({
      retained_card_id: z.string().min(1),
      retained_title: z.string().min(1),
      removed_card_id: z.string().min(1),
      removed_title: z.string().min(1),
      proof: z.string().min(1),
    }),
  ),
  reviewed_but_retained_examples: z.array(
    z.object({
      cards: z.array(z.string()),
      reason: z.string().min(1),
    }),
  ),
});

export const deckSchema = z.object({
  deck_id: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().min(1),
  version: z.string().min(1),
  language: z.string().min(1),
  created: z.string().min(1),
  card_count: z.number().int().positive(),
  category_count: z.number().int().positive(),
  description: z.string().min(1),
  originality_note: z.string().min(1),
  editorial_principles: z.array(z.string()).min(1),
  categories: z.array(categorySchema).min(1),
  cards: z.array(cardSchema).min(1),
  usage: usageSchema,
  genre_taxonomy_sources: z.array(taxonomySourceSchema),
  editorial_audit: editorialAuditSchema,
});

export type DeckJson = z.infer<typeof deckSchema>;
export type CardJson = z.infer<typeof cardSchema>;
export type GenreCardJson = z.infer<typeof genreCardSchema>;
export type NonGenreCardJson = z.infer<typeof nonGenreCardSchema>;
export type TypeCategoryJson = z.infer<typeof categorySchema>;
