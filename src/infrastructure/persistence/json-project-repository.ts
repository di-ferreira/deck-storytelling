import { randomUUID } from 'node:crypto';
import { existsSync, watch } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  StoryProjectConflictError,
  type EnsureResult,
  type ProjectRepository,
  type StoredProject,
} from '../../application/ports/project-repository';
import { createEmptyStoryProject, type StoryProjectFileJson } from '../../domain/story/story-project';
import type { IDisposable } from '../../shared/types';
import { storyProjectFileSchema } from '../../shared/schemas/story';
import { atomicWriteJson, sharedWriteLock } from '../filesystem/atomic-writer';

const STORYDECK_DIR = '.storydeck';
const STORY_DIR = 'Story';

const EMPTY_JSON: Record<string, unknown> = {
  'deck-selection.json': {
    schemaVersion: 1,
    projectId: '',
    selectedCardIds: [],
    favoriteCardIds: [],
    lockedCardIds: [],
    versions: [],
    activeVersionId: '',
    links: [],
    revision: 0,
    updatedAt: '',
  },
  'story-state.json': { schemaVersion: 1, revision: 0, stepStates: {}, spreads: [] },
  'decisions.json': { schemaVersion: 1, operations: [] },
  'settings.json': { schemaVersion: 1 },
};

const EMPTY_MARKDOWN: Record<string, string> = {
  'premise.md': '# Premissa\n\n_Criada pelo Story Deck. Preencha livremente._\n',
  'story-bible.md': '# Story Bible\n\n_Gerada pelo Story Deck a partir das decisões da obra._\n',
  'genre-contract.md': '# Contrato de Gênero\n\n1. **Promessa:** \n2. **Motor:** \n3. **Convenções:** \n4. **Liberdade:** \n5. **Recompensa:** \n',
  'outline.md': '# Outline\n\n## Atos\n\n',
  'narrative-decisions.md': '# Decisões Narrativas\n\n',
};

/** Implementação de `project.json` v2 com revisão otimista e leitura compatível com v1. */
export class JsonProjectRepository implements ProjectRepository {
  private lastWrittenAt = 0;
  private readonly clock: () => string;

  constructor(
    private readonly rootPath: string | undefined,
    private readonly deckVersion: string,
    clock?: () => string,
  ) {
    this.clock = clock ?? (() => new Date().toISOString());
  }

  getWorkspaceRoot(): string | undefined {
    return this.rootPath;
  }

  private get projectPath(): string | undefined {
    return this.rootPath ? join(this.rootPath, STORYDECK_DIR, 'project.json') : undefined;
  }

  /** Cria somente o que não existe. Nunca sobrescreve arquivo do usuário nem do Novel Assistant. */
  async ensureStructure(): Promise<EnsureResult> {
    if (!this.rootPath || !this.projectPath) {
      throw new Error('Abra uma pasta ou workspace antes de criar um projeto Story Deck.');
    }

    const created: string[] = [];
    await mkdir(join(this.rootPath, STORYDECK_DIR), { recursive: true });
    await mkdir(join(this.rootPath, STORY_DIR), { recursive: true });

    if (!existsSync(this.projectPath)) {
      const now = this.clock();
      const project: StoredProject = createEmptyStoryProject(randomUUID(), this.deckVersion, now).toJSON();
      await sharedWriteLock.run(this.projectPath, () => atomicWriteJson(this.projectPath!, project));
      this.lastWrittenAt = Date.now();
      created.push(`.storydeck/project.json`);
    }

    for (const [name, content] of Object.entries(EMPTY_JSON)) {
      const target = join(this.rootPath, STORYDECK_DIR, name);
      if (!existsSync(target)) {
        await atomicWriteJson(target, content);
        created.push(`.storydeck/${name}`);
      }
    }

    for (const [name, content] of Object.entries(EMPTY_MARKDOWN)) {
      const target = join(this.rootPath, STORY_DIR, name);
      if (!existsSync(target)) {
        await writeFile(target, content, 'utf8');
        created.push(`Story/${name}`);
      }
    }

    return {
      projectFile: this.projectPath,
      createdFiles: created,
      created: created.length > 0,
    };
  }

  async load(): Promise<StoredProject | undefined> {
    if (!this.projectPath || !existsSync(this.projectPath)) {
      return undefined;
    }
    const raw = await readFile(this.projectPath, 'utf8');
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      throw new Error('project.json não é um JSON válido.');
    }
    const inner = parsed.project as Record<string, unknown> | undefined;
    if (typeof parsed.schemaVersion !== 'number' || !inner || typeof inner.id !== 'string' || !inner.id) {
      throw new Error('project.json é inválido ou usa um formato desconhecido.');
    }

    if (parsed.schemaVersion === 2) {
      return storyProjectFileSchema.parse(parsed) as StoryProjectFileJson;
    }

    // v1 (descritor mínimo): normalização em memória. A gravação da v2 é feita pela
    // StoryMigration, que também importa o gênero de stepStates.genre.
    const identity = (inner.identity ?? {}) as Record<string, unknown>;
    const now = typeof inner.createdAt === 'string' ? inner.createdAt : '';
    const empty = createEmptyStoryProject(inner.id, String(parsed.deckVersion ?? this.deckVersion), now).toJSON();
    return {
      ...empty,
      deckVersion: typeof parsed.deckVersion === 'string' ? parsed.deckVersion : this.deckVersion,
      project: {
        ...empty.project,
        id: inner.id,
        createdAt: now,
        updatedAt: typeof inner.updatedAt === 'string' ? inner.updatedAt : now,
        identity: {
          provisionalTitle: String(identity.provisionalTitle ?? identity.title ?? ''),
          initialDescription: String(identity.initialDescription ?? identity.description ?? ''),
          period: String(identity.period ?? ''),
        },
      },
    };
  }

  async rawSchemaVersion(): Promise<number | undefined> {
    if (!this.projectPath || !existsSync(this.projectPath)) {
      return undefined;
    }
    const parsed = JSON.parse(await readFile(this.projectPath, 'utf8')) as { schemaVersion?: unknown };
    return typeof parsed.schemaVersion === 'number' ? parsed.schemaVersion : undefined;
  }

  async save(project: StoredProject, expectedRevision: number): Promise<StoredProject> {
    if (!this.projectPath) {
      throw new Error('Nenhum workspace aberto.');
    }
    return sharedWriteLock.run(this.projectPath, async () => {
      const current = await this.load();
      const actualRevision = current?.revision ?? 0;
      if (actualRevision !== expectedRevision) {
        throw new StoryProjectConflictError(expectedRevision, actualRevision);
      }
      const now = this.clock();
      const saved: StoredProject = {
        ...project,
        schemaVersion: 2,
        revision: expectedRevision + 1,
        project: { ...project.project, updatedAt: now },
      };
      await atomicWriteJson(this.projectPath!, saved);
      this.lastWrittenAt = Date.now();
      return saved;
    });
  }

  /** Detecta alterações externas, ignorando as gravações feitas por esta instância. */
  watch(listener: () => void): IDisposable {
    if (!this.projectPath || !existsSync(this.projectPath)) {
      return { dispose: () => undefined };
    }
    const watcher = watch(this.projectPath, () => {
      if (Date.now() - this.lastWrittenAt < 1500) {
        return;
      }
      listener();
    });
    return { dispose: () => watcher.close() };
  }
}

export { StoryProjectConflictError };
