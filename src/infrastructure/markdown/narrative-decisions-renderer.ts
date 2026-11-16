import type { StoryProject } from '../../domain/story/story-project';
import type { StoryContext } from '../../application/services/story-context-builder';
import { renderGeneratedBlock, type RenderedBlock } from './document-blocks';
import { assembleDocument, documentHeader, type RenderedStoryDocument } from './story-document-renderer';

/** Renderizador puro de `Story/narrative-decisions.md`. */
export class NarrativeDecisionsRenderer {
  render(project: StoryProject, context: StoryContext): RenderedStoryDocument {
    const ref = (cardId: string): string =>
      context.cardTitles[cardId] ? `[${cardId}] ${context.cardTitles[cardId]}` : `[${cardId}]`;
    const blocks: RenderedBlock[] = project.decisions.map((decision, index) => {
      const lines = [
        `### ${decision.title || '(sem título)'} [${decision.id}]`,
        decision.description.trim() || '_A definir._',
      ];
      if (decision.cardIds.length) {
        lines.push('', `**Cartas:** ${decision.cardIds.map(ref).join(', ')}`);
      }
      return {
        key: `decision-${index + 1}`,
        markdown: renderGeneratedBlock(`decision-${index + 1}`, lines.join('\n')),
      };
    });

    if (!blocks.length) {
      blocks.push({
        key: 'empty',
        markdown: renderGeneratedBlock('empty', '## Decisões criativas\n\n_A definir._'),
      });
    }

    return assembleDocument(
      documentHeader('Decisões Narrativas', project.deckVersion, 2, project.bible.generatedAt),
      blocks,
    );
  }
}
