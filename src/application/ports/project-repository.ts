import type { IDisposable } from '../../shared/types';

export interface ProjectIdentity {
  title: string;
  description: string;
}

export interface StoredProject {
  readonly schemaVersion: number;
  readonly deckVersion: string;
  readonly project: {
    readonly id: string;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly identity: ProjectIdentity;
  };
}

export interface EnsureResult {
  readonly projectFile: string;
  readonly createdFiles: readonly string[];
  readonly created: boolean;
}

export interface ProjectRepository {
  getWorkspaceRoot(): string | undefined;
  ensureStructure(): Promise<EnsureResult>;
  load(): Promise<StoredProject | undefined>;
  save(project: StoredProject): Promise<void>;
  watch(listener: () => void): IDisposable;
}
