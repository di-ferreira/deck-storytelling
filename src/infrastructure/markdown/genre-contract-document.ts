import type { RenderedGenreBlock } from './genre-contract-renderer';
import {
  replaceGeneratedBlocks as replaceBlocks,
  type ReplaceGeneratedBlocksResult,
} from './document-blocks';

/** Compatibilidade com a Fase 4: a implementação agora vive em `document-blocks.ts`. */
export type { ReplaceGeneratedBlocksResult } from './document-blocks';

export function replaceGeneratedBlocks(
  existing: string,
  blocks: readonly RenderedGenreBlock[],
): ReplaceGeneratedBlocksResult {
  return replaceBlocks(existing, blocks);
}
