import type { CardLink } from '../../domain/selection/deck-selection';
import { LinkRegistry } from '../../domain/selection/link-registry';
import type { StoryLinkQuery, StoryLinkTargetType } from '../ports/story-link-query';
import type { SelectionRepository } from '../ports/selection-repository';

/** `StoryLinkQuery` lendo o agregado persistido em `.storydeck/deck-selection.json`. */
export class SelectionLinkQuery implements StoryLinkQuery {
  constructor(private readonly repository: SelectionRepository) {}

  async linksForTarget(type: StoryLinkTargetType, id: string): Promise<readonly CardLink[]> {
    const selection = await this.repository.load();
    if (!selection) {
      return [];
    }
    const registry = new LinkRegistry(selection.links);
    return registry.links.filter(
      (link) => link.target.type === type && entityId(link.target) === id,
    );
  }
}

function entityId(target: CardLink['target']): string | undefined {
  switch (target.type) {
    case 'character': return target.characterId;
    case 'act': return target.actId;
    case 'chapter': return target.chapterId;
    case 'scene': return target.sceneId;
    default: return undefined;
  }
}
