import type { Deck } from '../../domain/deck/deck';
import type { CardLink } from '../../domain/selection/deck-selection';
import type { StoryProject } from '../../domain/story/story-project';
import type { Act, Chapter, Scene } from '../../domain/story/structure';
import type { StoryWarningCodeJson } from '../../shared/schemas/story';

export interface StoryWarning {
  readonly code: StoryWarningCodeJson;
  readonly message: string;
  readonly id?: string;
  readonly cardId?: string;
}

export interface ChapterProjection {
  readonly chapter: Chapter;
  readonly scenes: readonly Scene[];
}

export interface ActProjection {
  readonly act: Act;
  readonly chapters: readonly ChapterProjection[];
}

/** Projeção imutável consumida por UI, Markdown e (no futuro) contexto de IA. */
export interface StoryContext {
  readonly cardTitles: Readonly<Record<string, string>>;
  readonly usedCardIds: readonly string[];
  readonly acts: readonly ActProjection[];
  readonly orphanChapters: readonly Chapter[];
  readonly orphanScenes: readonly Scene[];
  readonly warnings: readonly StoryWarning[];
  readonly links: readonly CardLink[];
}

/**
 * Projeta o agregado SEM alterá-lo: resolve títulos de cartas, deriva a hierarquia
 * (Atos → Capítulos → Cenas) a partir de `Chapter.actId`/`Scene.chapterId` e emite avisos.
 * Referência inválida é AVISO, nunca erro — a obra pode ficar incompleta.
 */
export class StoryContextBuilder {
  constructor(
    private readonly deck: Deck,
    private readonly links: readonly CardLink[] = [],
  ) {}

  build(project: StoryProject): StoryContext {
    const warnings: StoryWarning[] = [];
    const cardTitles: Record<string, string> = {};

    const collectCards = (ids: readonly string[] | undefined): void => {
      for (const id of ids ?? []) {
        if (!id || id in cardTitles) {
          continue;
        }
        const card = this.deck.index.getById(id);
        if (card) {
          cardTitles[id] = card.title;
        } else {
          cardTitles[id] = '';
          warnings.push({ code: 'UNKNOWN_CARD', message: `A carta ${id} não está no deck ativo.`, cardId: id });
        }
      }
    };

    collectCards(project.premise.sourceCardIds);
    for (const character of project.characters) {
      collectCards([...character.archetypeIds, ...character.motivationCardIds, ...character.emotionCardIds]);
    }
    for (const conflict of project.conflicts) {
      collectCards(conflict.sourceCardIds);
    }
    collectCards(project.world.sourceCardIds);
    for (const secret of project.secrets) {
      collectCards(secret.sourceCardIds);
    }
    collectCards([...(project.narrator.typeCardId ? [project.narrator.typeCardId] : []), ...project.narrator.sourceCardIds]);
    for (const structure of project.structures) {
      collectCards([structure.cardId]);
    }
    for (const technique of project.techniques) {
      collectCards([technique.cardId]);
    }
    for (const decision of project.decisions) {
      collectCards(decision.cardIds);
    }
    for (const scene of project.scenes) {
      collectCards(scene.sourceCardIds);
    }
    for (const link of this.links) {
      collectCards([link.cardId]);
    }

    const acts: ActProjection[] = project.acts.map((act) => ({
      act,
      chapters: project.chaptersOf(act.id).map((chapter) => ({
        chapter,
        scenes: project.scenesOf(chapter.id),
      })),
    }));

    const actIds = new Set(project.acts.map((act) => act.id));
    const chapterIds = new Set(project.chapters.map((chapter) => chapter.id));
    const orphanChapters = project.chapters.filter((chapter) => !actIds.has(chapter.actId));
    const orphanScenes = project.scenes.filter((scene) => !chapterIds.has(scene.chapterId));

    for (const chapter of orphanChapters) {
      warnings.push({
        code: 'ORPHAN_CHAPTER',
        message: `O capítulo ${chapter.id} não pertence a um ato existente.`,
        id: chapter.id,
      });
    }
    for (const scene of orphanScenes) {
      warnings.push({
        code: 'ORPHAN_SCENE',
        message: `A cena ${scene.id} não pertence a um capítulo existente.`,
        id: scene.id,
      });
    }

    const characterIds = new Set(project.characters.map((character) => character.id));
    for (const conflict of project.conflicts) {
      if (conflict.linkedCharacterId && !characterIds.has(conflict.linkedCharacterId)) {
        warnings.push({
          code: 'DANGLING_CONFLICT_CHARACTER',
          message: `O conflito ${conflict.id} cita o personagem ${conflict.linkedCharacterId}, que não existe mais.`,
          id: conflict.id,
        });
      }
    }
    for (const secret of project.secrets) {
      for (const id of [...secret.knownByCharacterIds, ...secret.unknownByCharacterIds]) {
        if (!characterIds.has(id)) {
          warnings.push({
            code: 'DANGLING_SECRET_CHARACTER',
            message: `O segredo ${secret.id} cita o personagem ${id}, que não existe mais.`,
            id: secret.id,
          });
        }
      }
    }
    for (const relationship of project.relationships) {
      for (const id of [relationship.fromCharacterId, relationship.toCharacterId]) {
        if (id && !characterIds.has(id)) {
          warnings.push({
            code: 'DANGLING_RELATIONSHIP_CHARACTER',
            message: `O relacionamento ${relationship.id} cita o personagem ${id}, que não existe mais.`,
            id: relationship.id,
          });
        }
      }
    }

    return {
      cardTitles,
      usedCardIds: Object.keys(cardTitles),
      acts,
      orphanChapters,
      orphanScenes,
      warnings,
      links: this.links,
    };
  }
}
