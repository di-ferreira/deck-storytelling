import type { CardLink } from '../../domain/selection/deck-selection';

export type StoryLinkTargetType = 'character' | 'act' | 'chapter' | 'scene';

/**
 * Consulta de vínculos de cartas do `deck-selection.json`.
 * Usada pelo StoryService para impedir a exclusão de entidades ainda referenciadas.
 */
export interface StoryLinkQuery {
  linksForTarget(type: StoryLinkTargetType, id: string): Promise<readonly CardLink[]>;
}
