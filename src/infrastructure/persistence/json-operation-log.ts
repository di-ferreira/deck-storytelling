import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { OperationLog, OperationLogEntry, OperationLogInput } from '../../application/ports/operation-log';
import { atomicWriteJson, sharedWriteLock } from '../filesystem/atomic-writer';

const STORYDECK_DIR = '.storydeck';
const DECISIONS_FILE = 'decisions.json';

export interface JsonOperationLogOptions {
  readonly projectRoot?: string;
  /** Caminho explícito do arquivo (tem precedência sobre `projectRoot`). */
  readonly filePath?: string;
  readonly clock?: () => string;
  readonly idFactory?: () => string;
}

function readEntries(raw: unknown): OperationLogEntry[] {
  if (!raw || typeof raw !== 'object') {
    return [];
  }
  const operations = (raw as { operations?: unknown }).operations;
  if (!Array.isArray(operations)) {
    return [];
  }
  return operations.filter((entry): entry is OperationLogEntry => {
    if (!entry || typeof entry !== 'object') {
      return false;
    }
    const candidate = entry as Partial<OperationLogEntry>;
    return (
      typeof candidate.id === 'string' &&
      typeof candidate.at === 'string' &&
      typeof candidate.type === 'string' &&
      typeof candidate.projectId === 'string' &&
      !!candidate.payload &&
      typeof candidate.payload === 'object'
    );
  });
}

/** Journal append-only em `.storydeck/decisions.json`; nunca guarda manuscrito. */
export class JsonOperationLog implements OperationLog {
  readonly filePath: string;
  private readonly clock: () => string;
  private readonly idFactory: () => string;

  constructor(options: JsonOperationLogOptions) {
    if (!options.projectRoot && !options.filePath) {
      throw new Error('JsonOperationLog exige projectRoot ou filePath.');
    }
    this.filePath = options.filePath ?? join(options.projectRoot!, STORYDECK_DIR, DECISIONS_FILE);
    this.clock = options.clock ?? (() => new Date().toISOString());
    this.idFactory = options.idFactory ?? (() => randomUUID());
  }

  async append(input: OperationLogInput): Promise<OperationLogEntry> {
    return sharedWriteLock.run(this.filePath, async () => {
      const entries = await this.readEntriesInternal();
      const entry: OperationLogEntry = {
        id: this.idFactory(),
        at: this.clock(),
        type: input.type,
        projectId: input.projectId,
        payload: input.payload,
      };
      await atomicWriteJson(this.filePath, {
        schemaVersion: 1,
        operations: [...entries, entry],
      });
      return entry;
    });
  }

  async read(): Promise<readonly OperationLogEntry[]> {
    return this.readEntriesInternal();
  }

  private async readEntriesInternal(): Promise<readonly OperationLogEntry[]> {
    if (!existsSync(this.filePath)) {
      return [];
    }
    const content = await readFile(this.filePath, 'utf8');
    if (!content.trim()) {
      return [];
    }
    try {
      return readEntries(JSON.parse(content) as unknown);
    } catch {
      throw new Error(`${this.filePath} não é um JSON válido.`);
    }
  }
}
