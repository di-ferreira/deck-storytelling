import type { CardLinkTarget } from '../selection/deck-selection';
import type { StoryProject } from './story-project';

/**
 * Consulta opcional de existência de alvos do Story Builder.
 *
 * `LinkRegistry`/`SelectionService` usam esta porta para recusar vínculos cujo alvo
 * (personagem, ato, capítulo ou cena) não existe — com o código `UNKNOWN_TARGET`.
 * Sem a porta configurada, o comportamento legacy (aceitar forward references) permanece.
 */
export interface StoryLinkLookup {
  isCharacter(id: string): boolean;
  isAct(id: string): boolean;
  isChapter(id: string): boolean;
  isScene(id: string): boolean;
}

export function targetEntityId(target: CardLinkTarget): string | undefined {
  switch (target.type) {
    case 'character':
      return target.characterId;
    case 'act':
      return target.actId;
    case 'chapter':
      return target.chapterId;
    case 'scene':
      return target.sceneId;
    default:
      return undefined;
  }
}

/** Constrói a consulta a partir do agregado em memória. */
export function storyLinkLookupFromProject(project: StoryProject): StoryLinkLookup {
  return {
    isCharacter: (id) => project.characters.some((item) => item.id === id),
    isAct: (id) => project.acts.some((item) => item.id === id),
    isChapter: (id) => project.chapters.some((item) => item.id === id),
    isScene: (id) => project.scenes.some((item) => item.id === id),
  };
}

export function hasTarget(lookup: StoryLinkLookup, target: CardLinkTarget): boolean {
  switch (target.type) {
    case 'character':
      return lookup.isCharacter(target.characterId);
    case 'act':
      return lookup.isAct(target.actId);
    case 'chapter':
      return lookup.isChapter(target.chapterId);
    case 'scene':
      return lookup.isScene(target.sceneId);
    default:
      return true;
  }
}
