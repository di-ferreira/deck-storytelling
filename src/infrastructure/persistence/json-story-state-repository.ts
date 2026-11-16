import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { RevisionConflictError } from '../../application/ports/selection-repository';
import type {
  GenreStepSaveResult,
  StoryStateRepository,
  StoryStateSnapshot,
} from '../../application/ports/story-state-repository';
import type { GenreProfile } from '../../domain/genre/genre-profile';
import { createEmptyGenreProfile, genreProfileFromJson, genreProfileToJson } from '../../domain/genre/genre-profile';
import type { SpreadState } from '../../domain/narrative/spread';
import { genreStepSchema } from '../../shared/schemas/genre';
import { storyStateFileSchema } from '../../shared/schemas/spread';
import { atomicWriteJson, sharedWriteLock } from '../filesystem/atomic-writer';

const STORYDECK_DIR = '.storydeck';
const STORY_STATE_FILE = 'story-state.json';

export class StoryStateConflictError extends RevisionConflictError {
  constructor(expectedRevision: number, actualRevision: number) {
    super(
      expectedRevision,
      actualRevision,
      `O estado da história foi alterado externamente (revisão esperada ${expectedRevision}, atual ${actualRevision}). Recarregue antes de salvar.`,
    );
    this.name = 'StoryStateConflictError';
  }
}

export interface JsonStoryStateRepositoryOptions {
  readonly projectRoot?: string;
  /** Caminho explícito do arquivo (tem precedência sobre `projectRoot`). */
  readonly filePath?: string;
  readonly clock?: () => string;
}

/** Persiste `SpreadState[]` preservando `stepStates` de outras fases. */
export class JsonStoryStateRepository implements StoryStateRepository {
  readonly filePath: string;
  private readonly clock: () => string;

  constructor(options: JsonStoryStateRepositoryOptions) {
    if (!options.projectRoot && !options.filePath) {
      throw new Error('JsonStoryStateRepository exige projectRoot ou filePath.');
    }
    this.filePath = options.filePath ?? join(options.projectRoot!, STORYDECK_DIR, STORY_STATE_FILE);
    this.clock = options.clock ?? (() => new Date().toISOString());
  }

  async load(): Promise<StoryStateSnapshot> {
    const raw = await this.readRaw();
    if (!raw) {
      return { revision: 0, stepStates: {}, spreads: [] };
    }
    const parsed = storyStateFileSchema.parse(raw);
    return { revision: parsed.revision, stepStates: parsed.stepStates, spreads: parsed.spreads };
  }

  async saveSpreadStates(
    spreads: readonly SpreadState[],
    expectedRevision: number,
  ): Promise<StoryStateSnapshot> {
    return sharedWriteLock.run(this.filePath, async () => {
      const raw = await this.readRaw();
      const current = raw ? storyStateFileSchema.parse(raw) : { revision: 0, stepStates: {}, spreads: [] };
      if (current.revision !== expectedRevision) {
        throw new StoryStateConflictError(expectedRevision, current.revision);
      }

      const nextRevision = current.revision + 1;
      const payload = {
        schemaVersion: 1,
        revision: nextRevision,
        stepStates: current.stepStates,
        spreads,
        updatedAt: this.clock(),
      };
      await atomicWriteJson(this.filePath, payload);
      return { revision: nextRevision, stepStates: current.stepStates, spreads };
    });
  }

  async loadGenreStep(): Promise<GenreProfile> {
    const snapshot = await this.load();
    const raw = snapshot.stepStates.genre;
    if (raw === undefined) {
      return createEmptyGenreProfile();
    }
    const parsed = genreStepSchema.parse(raw);
    return genreProfileFromJson(parsed);
  }

  /** Grava `stepStates.genre` preservando `spreads` e as demais etapas, sob a mesma revisão. */
  async saveGenreStep(
    profile: GenreProfile,
    expectedRevision: number,
  ): Promise<GenreStepSaveResult> {
    return sharedWriteLock.run(this.filePath, async () => {
      const raw = await this.readRaw();
      const current = raw ? storyStateFileSchema.parse(raw) : { revision: 0, stepStates: {}, spreads: [] };
      if (current.revision !== expectedRevision) {
        throw new StoryStateConflictError(expectedRevision, current.revision);
      }

      const normalized = genreProfileFromJson(genreProfileToJson(profile));
      const updatedAt = this.clock();
      const step = genreStepSchema.parse({
        schemaVersion: 1,
        ...genreProfileToJson(normalized),
        updatedAt,
      });
      const nextRevision = current.revision + 1;
      const payload = {
        schemaVersion: 1,
        revision: nextRevision,
        stepStates: { ...current.stepStates, genre: step },
        spreads: current.spreads,
        updatedAt,
      };
      await atomicWriteJson(this.filePath, payload);
      return { profile: normalized, revision: nextRevision };
    });
  }

  /** Remove somente `stepStates.genre`; spreads e demais etapas são preservados. */
  async clearGenreStep(expectedRevision: number): Promise<StoryStateSnapshot> {
    return sharedWriteLock.run(this.filePath, async () => {
      const raw = await this.readRaw();
      const current = raw ? storyStateFileSchema.parse(raw) : { revision: 0, stepStates: {}, spreads: [] };
      if (current.revision !== expectedRevision) {
        throw new StoryStateConflictError(expectedRevision, current.revision);
      }
      const { genre: _genre, ...remaining } = current.stepStates;
      const payload = {
        schemaVersion: 1,
        revision: current.revision + 1,
        stepStates: remaining,
        spreads: current.spreads,
        updatedAt: this.clock(),
      };
      await atomicWriteJson(this.filePath, payload);
      return { revision: payload.revision, stepStates: remaining, spreads: current.spreads };
    });
  }

  private async readRaw(): Promise<unknown | undefined> {
    if (!existsSync(this.filePath)) {
      return undefined;
    }
    const content = await readFile(this.filePath, 'utf8');
    try {
      return JSON.parse(content) as unknown;
    } catch {
      throw new Error(`${this.filePath} não é um JSON válido.`);
    }
  }
}
