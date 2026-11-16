import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  isIntegrationMode,
  type IntegrationMode,
} from '../../application/ports/integration-gateway';
import { atomicWriteJson, sharedWriteLock } from '../filesystem/atomic-writer';

export { isIntegrationMode } from '../../application/ports/integration-gateway';
export type { IntegrationMode } from '../../application/ports/integration-gateway';

const STORYDECK_DIR = '.storydeck';
const SETTINGS_FILE = 'settings.json';

/**
 * Lê/escreve `.storydeck/settings.json` preservando todas as chaves existentes.
 * O `project.json` v2 permanece intocável: o modo de integração NÃO entra no schema.
 */
export class IntegrationSettingsStore {
  constructor(private readonly rootPath: string | undefined) {}

  private get filePath(): string | undefined {
    return this.rootPath ? join(this.rootPath, STORYDECK_DIR, SETTINGS_FILE) : undefined;
  }

  async read(): Promise<Record<string, unknown>> {
    const file = this.filePath;
    if (!file || !existsSync(file)) {
      return {};
    }
    try {
      const parsed = JSON.parse(await readFile(file, 'utf8')) as unknown;
      return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : {};
    } catch {
      return {};
    }
  }

  async getIntegrationMode(): Promise<IntegrationMode | undefined> {
    const mode = (await this.read()).integrationMode;
    return isIntegrationMode(mode) ? mode : undefined;
  }

  /** Grava de forma idempotente; devolve `true` somente se houve alteração. */
  async setIntegrationMode(mode: IntegrationMode): Promise<boolean> {
    const file = this.filePath;
    if (!file || !this.rootPath) {
      return false;
    }
    return sharedWriteLock.run(file, async () => {
      const current = await this.read();
      if (current.integrationMode === mode) {
        return false;
      }
      const next: Record<string, unknown> = {
        schemaVersion: 1,
        ...current,
        integrationMode: mode,
      };
      await mkdir(join(this.rootPath!, STORYDECK_DIR), { recursive: true });
      await atomicWriteJson(file, next);
      return true;
    });
  }
}
