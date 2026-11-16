import { randomUUID } from 'node:crypto';
import { existsSync, watch } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { EnsureResult, ProjectRepository, StoredProject } from '../../application/ports/project-repository';
import type { IDisposable } from '../../shared/types';
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

export class JsonProjectRepository implements ProjectRepository {
  private lastWrittenAt = 0;

  constructor(
    private readonly rootPath: string | undefined,
    private readonly deckVersion: string,
  ) {}

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
      const now = new Date().toISOString();
      const project: StoredProject = {
        schemaVersion: 1,
        deckVersion: this.deckVersion,
        project: {
          id: randomUUID(),
          createdAt: now,
          updatedAt: now,
          identity: { title: '', description: '' },
        },
      };
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
    const parsed = JSON.parse(raw) as StoredProject;
    if (typeof parsed.schemaVersion !== 'number' || !parsed.project?.id) {
      throw new Error('project.json é inválido ou usa um formato desconhecido.');
    }
    return parsed;
  }

  async save(project: StoredProject): Promise<void> {
    if (!this.projectPath) {
      throw new Error('Nenhum workspace aberto.');
    }
    await sharedWriteLock.run(this.projectPath, async () => {
      await atomicWriteJson(this.projectPath!, {
        ...project,
        project: { ...project.project, updatedAt: new Date().toISOString() },
      });
      this.lastWrittenAt = Date.now();
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
