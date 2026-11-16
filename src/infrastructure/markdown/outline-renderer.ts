import type { StoryProject } from '../../domain/story/story-project';
import type { StoryContext } from '../../application/services/story-context-builder';
import { renderGeneratedBlock, type RenderedBlock } from './document-blocks';
import { assembleDocument, documentHeader, type RenderedStoryDocument } from './story-document-renderer';

/** Renderizador puro de `Story/outline.md` — hierarquia derivada Atos → Capítulos → Cenas. */
export class OutlineRenderer {
  render(project: StoryProject, context: StoryContext): RenderedStoryDocument {
    const blocks: RenderedBlock[] = context.acts.map(({ act, chapters }, index) => {
      const lines: string[] = [`### ${act.number}. ${act.title || '(sem título)'} [${act.id}]`];
      if (act.goal) {
        lines.push(`**Objetivo:** ${act.goal}`);
      }
      for (const { chapter, scenes } of chapters) {
        lines.push('', `#### ${chapter.number}. ${chapter.title || '(sem título)'} [${chapter.id}]`);
        if (!scenes.length) {
          lines.push('_Nenhuma cena planejada._');
        }
        for (const scene of scenes) {
          lines.push(`- ${scene.title || '(sem título)'} [${scene.id}]`);
        }
      }
      if (!chapters.length) {
        lines.push('_Nenhum capítulo planejado._');
      }
      return {
        key: `act-${index + 1}`,
        markdown: renderGeneratedBlock(`act-${index + 1}`, lines.join('\n')),
      };
    });

    if (!blocks.length) {
      blocks.push({
        key: 'empty',
        markdown: renderGeneratedBlock('empty', '## Atos\n\n_A definir._'),
      });
    }

    return assembleDocument(
      documentHeader('Outline', project.deckVersion, 2, project.bible.generatedAt),
      blocks,
    );
  }
}
