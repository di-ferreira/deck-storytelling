import type { StoryProjectFileJson } from '../../domain/story/story-project';
import type { IDisposable } from '../../shared/types';
import { RevisionConflictError } from './selection-repository';

/** Compatibilidade com o descritor mínimo da Fase 2. O tipo canônico é `StoryProjectFileJson`. */
export type StoredProject = StoryProjectFileJson;

export interface EnsureResult {
  readonly projectFile: string;
  readonly createdFiles: readonly string[];
  readonly created: boolean;
}

export interface EnsureOptions {
  /** Fluxo B (sem Novel Assistant): cria os seis diretórios documentados se ausentes. */
  readonly compatibilityDirs?: boolean;
}

/** Conflito de revisão otimista do `project.json`. */
export class StoryProjectConflictError extends RevisionConflictError {
  constructor(expectedRevision: number, actualRevision: number) {
    super(
      expectedRevision,
      actualRevision,
      `O projeto foi alterado externamente (revisão esperada ${expectedRevision}, atual ${actualRevision}). Recarregue antes de salvar.`,
    );
    this.name = 'StoryProjectConflictError';
  }
}

export interface ProjectRepository {
  getWorkspaceRoot(): string | undefined;
  ensureStructure(options?: EnsureOptions): Promise<EnsureResult>;
  /** Compatível com v1: normaliza o descritor mínimo em memória para o formato v2. */
  load(): Promise<StoredProject | undefined>;
  /** Versão BRUTA gravada em `project.json` (não normalizada), usada pela migração. */
  rawSchemaVersion(): Promise<number | undefined>;
  /** Grava somente se `expectedRevision` for igual à revisão do arquivo. */
  save(project: StoredProject, expectedRevision: number): Promise<StoredProject>;
  watch(listener: () => void): IDisposable;
}
