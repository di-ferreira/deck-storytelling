import type { Deck } from '../../domain/deck/deck';
import type { IdentityDimensions } from '../../domain/genre/genre-profile';
import type { CardLink } from '../../domain/selection/deck-selection';
import type { StoryProject } from '../../domain/story/story-project';
import { StoryContextBuilder, type StoryWarning } from './story-context-builder';

export interface SceneBriefCard {
  readonly cardId: string;
  readonly title: string;
  readonly note?: string;
}

/** Dados completos do painel leve de cena — sem `vscode`, sem HTML. */
export interface SceneBriefData {
  readonly sceneId: string;
  readonly title: string;
  readonly goal: string;
  readonly conflict: string;
  readonly stateChange: string;
  readonly hook: string;
  readonly chapterTitle: string;
  readonly actTitle: string;
  readonly linkedCards: readonly SceneBriefCard[];
  readonly dominantGenreTitle: string;
  readonly dimensions: IdentityDimensions;
  readonly warnings: readonly StoryWarning[];
}

export interface SceneBriefDeps {
  readonly story: { getProject(): Promise<StoryProject> };
  readonly selection: { getSelection(): Promise<{ links: readonly CardLink[] }> };
  readonly genre: { getProfile(): Promise<{ dominantGenreId: string; dimensions: IdentityDimensions }> };
  readonly deck: { load(): Promise<Deck> };
}

/** Monta o brief somente leitura a partir dos serviços existentes. */
export class SceneBriefService {
  constructor(private readonly deps: SceneBriefDeps) {}

  async build(sceneId: string): Promise<SceneBriefData | undefined> {
    const [project, selection, profile, deck] = await Promise.all([
      this.deps.story.getProject(),
      this.deps.selection.getSelection(),
      this.deps.genre.getProfile(),
      this.deps.deck.load(),
    ]);

    const scene = project.scenes.find((item) => item.id === sceneId);
    if (!scene) {
      return undefined;
    }

    const chapter = project.chapters.find((item) => item.id === scene.chapterId);
    const act = chapter ? project.acts.find((item) => item.id === chapter.actId) : undefined;

    const links = selection.links.filter(
      (link) => link.target.type === 'scene' && link.target.sceneId === sceneId,
    );
    const linkedCards: SceneBriefCard[] = links.map((link) => ({
      cardId: link.cardId,
      title: deck.index.getById(link.cardId)?.title ?? link.cardId,
      ...(link.note ? { note: link.note } : {}),
    }));

    const context = new StoryContextBuilder(deck, selection.links).build(project);
    const dominantGenreTitle = profile.dominantGenreId
      ? deck.index.getById(profile.dominantGenreId)?.title ?? 'Gênero fora do deck'
      : 'Nenhum gênero dominante';

    return {
      sceneId: scene.id,
      title: scene.title || scene.id,
      goal: scene.goal,
      conflict: scene.conflict,
      stateChange: scene.stateChange,
      hook: scene.hook,
      chapterTitle: chapter?.title || 'Capítulo sem título',
      actTitle: act?.title || 'Ato sem título',
      linkedCards,
      dominantGenreTitle,
      dimensions: profile.dimensions,
      warnings: context.warnings,
    };
  }
}
