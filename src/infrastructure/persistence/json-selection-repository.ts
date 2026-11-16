import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DeckSelection, type DeckSelectionData } from '../../domain/selection/deck-selection';
import {
  RevisionConflictError,
  type SelectionRepository,
} from '../../application/ports/selection-repository';
import { deckSelectionFileSchema } from '../../shared/schemas/selection';
import { atomicWriteJson, sharedWriteLock } from '../filesystem/atomic-writer';

const STORYDECK_DIR = '.storydeck';
const SELECTION_FILE = 'deck-selection.json';

export class SelectionConflictError extends RevisionConflictError {
  constructor(expectedRevision: number, actualRevision: number) {
    super(
      expectedRevision,
      actualRevision,
      `A seleção foi alterada externamente (revisão esperada ${expectedRevision}, atual ${actualRevision}). Recarregue antes de salvar.`,
    );
    this.name = 'SelectionConflictError';
  }
}

export interface JsonSelectionRepositoryOptions {
  readonly projectId: string;
  /** Raiz do projeto; o arquivo vira `<root>/.storydeck/deck-selection.json`. */
  readonly projectRoot?: string;
  /** Caminho explícito do arquivo (tem precedência sobre `projectRoot`). */
  readonly filePath?: string;
  readonly clock?: () => string;
}

/**
 * Persistência da seleção com revisão otimista.
 * Aceita `projectRoot` ou `filePath` para ser testável com diretório temporário.
 */
export class JsonSelectionRepository implements SelectionRepository {
  readonly projectId: string;
  readonly filePath: string;
  private readonly clock: () => string;

  constructor(options: JsonSelectionRepositoryOptions) {
    if (!options.projectRoot && !options.filePath) {
      throw new Error('JsonSelectionRepository exige projectRoot ou filePath.');
    }
    this.projectId = options.projectId;
    this.filePath = options.filePath ?? join(options.projectRoot!, STORYDECK_DIR, SELECTION_FILE);
    this.clock = options.clock ?? (() => new Date().toISOString());
  }

  async load(): Promise<DeckSelection | undefined> {
    const raw = await this.readRaw();
    if (!raw) {
      return undefined;
    }
    const parsed = deckSelectionFileSchema.parse(raw);
    const data: DeckSelectionData = {
      projectId: this.projectId,
      selectedCardIds: parsed.selectedCardIds,
      favoriteCardIds: parsed.favoriteCardIds,
      lockedCardIds: parsed.lockedCardIds,
      versions: parsed.versions,
      activeVersionId: parsed.activeVersionId,
      links: parsed.links,
      revision: parsed.revision,
      updatedAt: parsed.updatedAt,
    };
    return DeckSelection.fromJSON(data);
  }

  async save(selection: DeckSelection, expectedRevision: number): Promise<DeckSelection> {
    return sharedWriteLock.run(this.filePath, async () => {
      const raw = await this.readRaw();
      const currentRevision = raw ? deckSelectionFileSchema.parse(raw).revision : 0;
      if (currentRevision !== expectedRevision) {
        throw new SelectionConflictError(expectedRevision, currentRevision);
      }

      const nextRevision = currentRevision + 1;
      const payload = {
        schemaVersion: 1,
        ...selection.toJSON(),
        projectId: this.projectId,
        revision: nextRevision,
        updatedAt: this.clock(),
      };
      await atomicWriteJson(this.filePath, payload);
      return DeckSelection.fromJSON(payload as DeckSelectionData);
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
