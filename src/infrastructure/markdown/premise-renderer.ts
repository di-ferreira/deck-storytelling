import type { StoryProject } from '../../domain/story/story-project';
import { PREMISE_FIELDS, type PremiseField } from '../../domain/story/premise';
import type { StoryContext } from '../../application/services/story-context-builder';
import { renderGeneratedBlock, type RenderedBlock } from './document-blocks';
import { assembleDocument, documentHeader, type RenderedStoryDocument } from './story-document-renderer';

const FIELD_TITLES: Readonly<Record<PremiseField, string>> = {
  centralIdea: 'Ideia central',
  logline: 'Logline',
  premise: 'Premissa',
  shortSynopsis: 'Sinopse curta',
  expandedSynopsis: 'Sinopse expandida',
  centralTheme: 'Tema central',
  dramaticQuestion: 'Pergunta dramática',
  narrativeProposition: 'Proposta narrativa',
  differentiator: 'Elemento diferenciador',
};

/** Renderizador puro de `Story/premise.md`. */
export class PremiseRenderer {
  render(project: StoryProject, context: StoryContext): RenderedStoryDocument {
    const ref = (cardId: string): string =>
      context.cardTitles[cardId] ? `[${cardId}] ${context.cardTitles[cardId]}` : `[${cardId}]`;
    const blocks: RenderedBlock[] = PREMISE_FIELDS.map((field) => {
      const body = project.premise[field];
      const status = project.premise.approvals[field];
      const text = body.trim() ? body : '_A definir._';
      return {
        key: field,
        markdown: renderGeneratedBlock(
          field,
          `## ${FIELD_TITLES[field]}\n\n${text}\n\n_Status: ${status}._`,
        ),
      };
    });

    if (project.premise.sourceCardIds.length) {
      blocks.push({
        key: 'source-cards',
        markdown: renderGeneratedBlock(
          'source-cards',
          `## Cartas que estimularam a premissa\n\n${project.premise.sourceCardIds.map(ref).join(', ')}`,
        ),
      });
    }

    return assembleDocument(
      documentHeader('Premissa', project.deckVersion, 2, project.bible.generatedAt),
      blocks,
      [...PREMISE_FIELDS],
    );
  }
}
