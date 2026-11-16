import type { Deck } from '../../domain/deck/deck';
import {
  createEmptyGenreProfile,
  genreProfileToJson,
  type GenreContract,
  type GenreProfile,
  type IdentityDimensions,
} from '../../domain/genre/genre-profile';
import {
  addSecondaryGenre,
  clearGenreProfile,
  removeSecondaryGenre,
  setDominantGenre,
  setGenreContract,
  setGenreSubGenres,
  setIdentityDimensions,
} from '../../domain/genre/genre-selection-policy';
import type { DeckRepository } from '../ports/deck-repository';
import type { GenreStepSaveResult, StoryStateRepository } from '../ports/story-state-repository';
import type { StoryService } from './story-service';
import {
  GenreContextBuilder,
  type GenreContext,
} from './genre-context-builder';

export interface GenreServiceDeps {
  readonly deck: DeckRepository;
  /** Legado: usado quando não há StoryService injetado (T43). */
  readonly storyState: StoryStateRepository;
  /** Quando presente, o perfil passa a viver no agregado `project.json` v2. */
  readonly story?: StoryService;
  /** Reservado para carimbos futuros do serviço; a persistência usa o clock do repositório. */
  readonly clock?: () => string;
  /** Reservado para IDs futuros (ex.: versões do contrato). Nada é gerado hoje. */
  readonly idFactory?: (prefix: string) => string;
}

export interface SubGenreUpdate {
  readonly profile: GenreProfile;
  /** Nomes canônicos aceitos e persistidos. */
  readonly accepted: readonly string[];
  /** Nomes sem correspondência no deck; omitidos do perfil e sinalizados como aviso pela UI. */
  readonly unknown: readonly string[];
}

interface GenreSnapshot {
  readonly profile: GenreProfile;
  readonly revision: number;
  readonly delegated: boolean;
}

/**
 * Fachada do perfil de gênero, preservando a API usada pelo painel.
 *
 * Com `story` injetado, delega a leitura/escrita ao `StoryService` (dono do `StoryProject`
 * em `project.json` v2). Sem ele, mantém o comportamento da Fase 4 em `stepStates.genre`.
 * Em ambos os casos há cache por instância e conflito de revisão limpa o cache.
 */
export class GenreService {
  private cached: GenreSnapshot | undefined;
  private deckCache: Deck | undefined;
  private contextBuilder: GenreContextBuilder | undefined;

  constructor(private readonly deps: GenreServiceDeps) {}

  async getProfile(): Promise<GenreProfile> {
    return (await this.getSnapshot()).profile;
  }

  async getRevision(): Promise<number> {
    return (await this.getSnapshot()).revision;
  }

  async setDominant(genreId: string): Promise<GenreProfile> {
    const snapshot = await this.getSnapshot();
    const deck = await this.loadDeck();
    return this.commit(setDominantGenre(snapshot.profile, genreId, deck.index), snapshot);
  }

  async addSecondary(genreId: string): Promise<GenreProfile> {
    const snapshot = await this.getSnapshot();
    const deck = await this.loadDeck();
    return this.commit(addSecondaryGenre(snapshot.profile, genreId, deck.index), snapshot);
  }

  async removeSecondary(genreId: string): Promise<GenreProfile> {
    const snapshot = await this.getSnapshot();
    return this.commit(removeSecondaryGenre(snapshot.profile, genreId), snapshot);
  }

  async setSubGenres(genreId: string, names: readonly string[]): Promise<SubGenreUpdate> {
    const snapshot = await this.getSnapshot();
    const deck = await this.loadDeck();
    const outcome = setGenreSubGenres(snapshot.profile, genreId, names, deck.index);
    const profile = await this.commit(outcome.profile, snapshot);
    return { profile, accepted: outcome.accepted, unknown: outcome.unknown };
  }

  async setContract(patch: Partial<GenreContract>): Promise<GenreProfile> {
    const snapshot = await this.getSnapshot();
    return this.commit(setGenreContract(snapshot.profile, patch), snapshot);
  }

  async setDimensions(patch: Partial<IdentityDimensions>): Promise<GenreProfile> {
    const snapshot = await this.getSnapshot();
    return this.commit(setIdentityDimensions(snapshot.profile, patch), snapshot);
  }

  /** Projeção somente leitura (perfil + deck ativo). Inclui os avisos de integridade. */
  async getContext(): Promise<GenreContext> {
    const snapshot = await this.getSnapshot();
    const deck = await this.loadDeck();
    if (!this.contextBuilder) {
      this.contextBuilder = new GenreContextBuilder(deck);
    }
    return this.contextBuilder.build(snapshot.profile);
  }

  /** Volta o perfil ao rascunho vazio; a gravação só ocorre se algo mudar. */
  async clear(): Promise<GenreProfile> {
    const snapshot = await this.getSnapshot();
    if (JSON.stringify(genreProfileToJson(snapshot.profile)) === JSON.stringify(genreProfileToJson(createEmptyGenreProfile()))) {
      return snapshot.profile;
    }
    return this.commit(clearGenreProfile(), snapshot);
  }

  private async getSnapshot(): Promise<GenreSnapshot> {
    if (!this.cached) {
      if (this.deps.story) {
        const project = await this.deps.story.getProject();
        this.cached = { profile: project.genre, revision: project.revision, delegated: true };
        return this.cached;
      }
      // A revisão vem primeiro: se outro processo gravar no meio, o próximo save
      // falha com conflito (comportamento desejado), nunca grava por cima.
      const state = await this.deps.storyState.load();
      const profile = await this.deps.storyState.loadGenreStep();
      this.cached = { profile, revision: state.revision, delegated: false };
    }
    return this.cached;
  }

  private async loadDeck(): Promise<Deck> {
    if (!this.deckCache) {
      this.deckCache = await this.deps.deck.load();
    }
    return this.deckCache;
  }

  private async commit(next: GenreProfile, snapshot: GenreSnapshot): Promise<GenreProfile> {
    if (JSON.stringify(genreProfileToJson(next)) === JSON.stringify(genreProfileToJson(snapshot.profile))) {
      return snapshot.profile;
    }

    if (snapshot.delegated && this.deps.story) {
      try {
        await this.deps.story.setGenre(next);
      } catch (error) {
        this.cached = undefined;
        throw error;
      }
      this.cached = undefined;
      return next;
    }

    let saved: GenreStepSaveResult;
    try {
      saved = await this.deps.storyState.saveGenreStep(next, snapshot.revision);
    } catch (error) {
      // Força recarga: o arquivo é a fonte da verdade após qualquer conflito.
      this.cached = undefined;
      throw error;
    }

    this.cached = { profile: saved.profile, revision: saved.revision, delegated: false };
    return saved.profile;
  }
}
