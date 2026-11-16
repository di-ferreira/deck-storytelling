/**
 * Manipulação genérica de documentos Markdown editáveis.
 *
 * Contrato de convivência (idêntico ao do contrato de gênero da Fase 4):
 * - Blocos `<!-- story-deck:generated:start:CHAVE -->…end -->` pertencem à extensão.
 * - Blocos `<!-- story-deck:user:start:CHAVE -->…end -->` pertencem ao autor e NUNCA
 *   são tocados por regeneração.
 * - Qualquer texto fora dos blocos gerados também é do autor e é preservado.
 */

export interface RenderedBlock {
  readonly key: string;
  readonly markdown: string;
}

export interface MarkerPair {
  readonly start: string;
  readonly end: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function generatedMarkers(key: string): MarkerPair {
  return {
    start: `<!-- story-deck:generated:start:${key} -->`,
    end: `<!-- story-deck:generated:end:${key} -->`,
  };
}

export function userBlockMarkers(key: string): MarkerPair {
  return {
    start: `<!-- story-deck:user:start:${key} -->`,
    end: `<!-- story-deck:user:end:${key} -->`,
  };
}

export function renderGeneratedBlock(key: string, body: string): string {
  const markers = generatedMarkers(key);
  return `${markers.start}\n${body.trim()}\n${markers.end}`;
}

export function renderUserBlock(key: string, existingContent = ''): string {
  const markers = userBlockMarkers(key);
  const content = existingContent.trim();
  return content ? `${markers.start}\n${content}\n${markers.end}` : `${markers.start}\n${markers.end}`;
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
  blocks: readonly RenderedBlock[],
): ReplaceGeneratedBlocksResult {
  let content = existing;

  for (const block of blocks) {
    const markers = generatedMarkers(block.key);
    const pattern = new RegExp(
      `${escapeRegExp(markers.start)}[\\s\\S]*?${escapeRegExp(markers.end)}`,
    );
    if (pattern.test(content)) {
      content = content.replace(pattern, () => block.markdown);
    } else {
      content = `${content.trimEnd()}\n\n${block.markdown}\n`;
    }
  }

  if (!content.endsWith('\n')) {
    content += '\n';
  }

  return { content, changed: content !== existing };
}
