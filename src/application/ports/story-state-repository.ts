import type { GenreProfile } from '../../domain/genre/genre-profile';
import type { SpreadState } from '../../domain/narrative/spread';

/** Resultado de uma gravação do perfil de gênero (revisão já incrementada). */
export interface GenreStepSaveResult {
  readonly profile: GenreProfile;
  readonly revision: number;
}

/** Estado do projeto que não pertence à seleção do Deck Studio. */
export interface StoryStateSnapshot {
  readonly revision: number;
  /** Etapas do Story Builder (Fase 5). Preservadas integralmente por este repositório. */
  readonly stepStates: Readonly<Record<string, unknown>>;
  readonly spreads: readonly SpreadState[];
}

/**
 * Porta de persistência de `.storydeck/story-state.json`.
 * `saveSpreadStates` e `saveGenreStep` NUNCA descartam as demais etapas nem as tiragens,
 * e ambos usam a MESMA revisão otimista do arquivo.
 */
export interface StoryStateRepository {
  load(): Promise<StoryStateSnapshot>;
  saveSpreadStates(spreads: readonly SpreadState[], expectedRevision: number): Promise<StoryStateSnapshot>;
  /** Lê `stepStates.genre`; ausente = perfil vazio (rascunho). */
  loadGenreStep(): Promise<GenreProfile>;
  /** Grava somente se `expectedRevision` for igual à revisão atual do arquivo. */
  saveGenreStep(profile: GenreProfile, expectedRevision: number): Promise<GenreStepSaveResult>;
}
