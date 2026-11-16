import type { OperationLog } from '../ports/operation-log';
import type { ProjectRepository } from '../ports/project-repository';
import type { StoryStateRepository } from '../ports/story-state-repository';
import {
  createEmptyGenreProfile,
  genreProfileFromJson,
  genreProfileToJson,
  type GenreProfile,
} from '../../domain/genre/genre-profile';
import { StoryProject } from '../../domain/story/story-project';
import { genreStepSchema } from '../../shared/schemas/genre';

export interface StoryMigrationDeps {
  readonly projectRepository: ProjectRepository;
  readonly storyState: StoryStateRepository;
  readonly log: OperationLog;
  readonly clock?: () => string;
}

export interface StoryMigrationResult {
  readonly changed: boolean;
  readonly revision: number;
  readonly importedGenre?: GenreProfile;
}

function isEmptyGenre(profile: GenreProfile): boolean {
  return (
    JSON.stringify(genreProfileToJson(profile)) ===
    JSON.stringify(genreProfileToJson(createEmptyGenreProfile()))
  );
}

/**
 * Migração LAZY e IDEMPOTENTE de `project.json` v1 → v2.
 *
 * - v2 já migrado nunca é reescrito.
 * - Se `genre` está vazio e `stepStates.genre` existe, o perfil é importado para o
 *   agregado, a v2 é gravada e `stepStates.genre` é removido (spreads e outras etapas
 *   permanecem intactos).
 * - Toda migração que altera arquivos é registrada no journal.
 */
export class StoryMigration {
  constructor(private readonly deps: StoryMigrationDeps) {}

  async migrate(): Promise<StoryMigrationResult> {
    const stored = await this.deps.projectRepository.load();
    if (!stored) {
      return { changed: false, revision: 0 };
    }
    // `load()` normaliza v1 em memória; a versão BRUTA é a fonte da verdade para a migração.
    const rawVersion = await this.deps.projectRepository.rawSchemaVersion();
    if (rawVersion === undefined || rawVersion >= 2) {
      return { changed: false, revision: stored.revision };
    }

    const project = StoryProject.fromJSON(stored);
    const state = await this.deps.storyState.load();
    let importedGenre: GenreProfile | undefined;

    if (isEmptyGenre(project.genre) && state.stepStates.genre !== undefined) {
      const parsed = genreStepSchema.parse(state.stepStates.genre);
      importedGenre = genreProfileFromJson(parsed);
    }

    const next = importedGenre ? project.withGenre(importedGenre) : project;
    const now = this.deps.clock?.() ?? new Date().toISOString();
    const saved = await this.deps.projectRepository.save(
      next.withUpdatedAt(now).toJSON(),
      stored.revision,
    );

    if (importedGenre) {
      await this.deps.storyState.clearGenreStep(state.revision);
    }

    try {
      await this.deps.log.append({
        type: 'storyMigration.v1ToV2',
        projectId: saved.project.id,
        payload: {
          fromVersion: 1,
          toVersion: 2,
          genreImported: importedGenre !== undefined,
          revision: saved.revision,
        },
      });
    } catch {
      // O arquivo já foi migrado; falha de journal não invalida a migração.
    }

    return { changed: true, revision: saved.revision, ...(importedGenre ? { importedGenre } : {}) };
  }
}

/** Testa se a versão bruta salva precisa de migração, sem gravar nada. */
export function needsMigration(rawVersion: number | undefined): boolean {
  return rawVersion !== undefined && rawVersion < 2;
}
