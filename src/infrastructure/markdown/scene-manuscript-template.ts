import type { Scene } from '../../domain/story/structure';

/**
 * Template PRÓPRIO do Story Deck (distinto do template do Novel Assistant).
 * Nunca é aplicado sobre um arquivo existente — apenas na criação.
 */
export function renderSceneManuscriptTemplate(scene: Pick<Scene, 'id' | 'title' | 'goal'>): string {
  const title = scene.title?.trim() || 'Cena sem título';
  const synopsis = scene.goal?.trim() || '[Breve resumo da cena]';
  return [
    `# ${title}`,
    '',
    '## Synopsis',
    synopsis,
    '',
    '---',
    '',
    `<!-- story-deck:scene-id ${scene.id} -->`,
    '',
    '[Comece a escrever sua cena aqui...]',
    '',
  ].join('\n');
}
