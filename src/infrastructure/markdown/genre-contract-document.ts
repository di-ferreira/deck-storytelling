import type { RenderedGenreBlock } from './genre-contract-renderer';

/**
 * Manipulação do arquivo `Story/genre-contract.md` como documento editável.
 *
 * Contrato de convivência:
 * - Blocos `<!-- story-deck:generated:start:CHAVE -->…end -->` pertencem à extensão.
 * - Blocos `<!-- story-deck:user:start:CHAVE -->…end -->` pertencem ao autor e NUNCA
 *   são tocados por regeneração.
 * - Qualquer texto fora dos blocos gerados também é do autor e é preservado.
 */

const GENERATED_BLOCK_PATTERN = (key: string): RegExp =>
  new RegExp(
    `<!-- story-deck:generated:start:${escapeRegExp(key)} -->[\\s\\S]*?<!-- story-deck:generated:end:${escapeRegExp(key)} -->`,
  );

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface ReplaceGeneratedBlocksResult {
  readonly content: string;
  readonly changed: boolean;
}

/**
 * Substitui apenas os blocos gerados. Blocos desconhecidos/ausentes são anexados ao final;
 * nada é removido do arquivo, inclusive edições livres do autor.
 */
export function replaceGeneratedBlocks(
  existing: string,
  blocks: readonly RenderedGenreBlock[],
): ReplaceGeneratedBlocksResult {
  let content = existing;

  for (const block of blocks) {
    const pattern = GENERATED_BLOCK_PATTERN(block.key);
    if (pattern.test(content)) {
      content = content.replace(pattern, block.markdown);
    } else {
      content = `${content.trimEnd()}\n\n${block.markdown}\n`;
    }
  }

  if (!content.endsWith('\n')) {
    content += '\n';
  }

  return { content, changed: content !== existing };
}
