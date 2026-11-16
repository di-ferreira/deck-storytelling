import type { StoryBibleDocument } from '../../application/services/story-bible-assembler';
import { renderGeneratedBlock, type RenderedBlock } from './document-blocks';
import { assembleDocument, documentHeader, type RenderedStoryDocument } from './story-document-renderer';

/** Renderizador puro de `Story/story-bible.md` — 17 seções na ordem canônica. */
export class StoryBibleRenderer {
  render(document: StoryBibleDocument): RenderedStoryDocument {
    const { sections, project } = document;
    const blocks: RenderedBlock[] = sections.map((section, index) => ({
      key: `section-${index + 1}`,
      markdown: renderGeneratedBlock(
        `section-${index + 1}`,
        `## ${index + 1}. ${section.title}\n\n${section.body.trim() ? section.body : '_A definir._'}`,
      ),
    }));
    return assembleDocument(
      documentHeader('Story Bible', project.deckVersion, 2, project.bible.generatedAt),
      blocks,
    );
  }
}
