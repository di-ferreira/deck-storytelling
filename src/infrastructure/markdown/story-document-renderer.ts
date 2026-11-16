import type { RenderedBlock } from './document-blocks';
import { renderGeneratedBlock, renderUserBlock } from './document-blocks';

export interface RenderedStoryDocument {
  readonly markdown: string;
  readonly blocks: readonly RenderedBlock[];
}

/** Cabeçalho comum: metadados e aviso de preservação das edições do autor. */
export function documentHeader(title: string, deckVersion: string, schemaVersion: number, updatedAt: string): string {
  return [
    `# ${title}`,
    '',
    `Documento do projeto gerado a partir do deck ENTRELINHAS${deckVersion ? ` v${deckVersion}` : ''}.`,
    `Schema v${schemaVersion}${updatedAt ? ` · atualizado em ${updatedAt}` : ''}.`,
    'Edite apenas os blocos `story-deck:user`; a regeneração explícita atualiza somente os blocos `story-deck:generated`.',
  ].join('\n');
}

/** Monta o documento final intercalando blocos gerados e blocos de usuário vazios. */
export function assembleDocument(
  header: string,
  blocks: readonly RenderedBlock[],
  userKeys: readonly string[] = [],
): RenderedStoryDocument {
  const parts: string[] = [];
  for (const block of blocks) {
    parts.push(block.markdown);
    if (userKeys.includes(block.key)) {
      parts.push(renderUserBlock(block.key));
    }
  }
  const withHeader = [renderGeneratedBlock('header', header), ...parts].join('\n\n');
  return {
    markdown: `${withHeader}\n`,
    blocks: [{ key: 'header', markdown: renderGeneratedBlock('header', header) }, ...blocks],
  };
}
