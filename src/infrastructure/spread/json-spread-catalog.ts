import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import type { SpreadCatalog } from '../../application/ports/spread-catalog';
import { spreadCatalogFileSchema, type SpreadDefinition } from '../../shared/schemas/spread';

export class SpreadCatalogError extends Error {
  constructor(
    message: string,
    readonly issues: readonly string[] = [],
  ) {
    super(message);
    this.name = 'SpreadCatalogError';
  }
}

export interface JsonSpreadCatalogOptions {
  /** Recurso embarcado somente leitura (`resources/spreads/entrelinhas-v4-spreads.json`). */
  readonly resourcePath: string;
  /** Customizações opcionais do usuário (`.storydeck/spreads/custom.json`). */
  readonly customPath?: string;
}

function assertUniqueIds(spreads: readonly SpreadDefinition[], source: string): void {
  const seen = new Set<string>();
  for (const spread of spreads) {
    if (seen.has(spread.id)) {
      throw new SpreadCatalogError(`Tiragem duplicada ${spread.id} em ${source}.`);
    }
    seen.add(spread.id);
  }
}

async function readCatalog(filePath: string, custom: boolean): Promise<readonly SpreadDefinition[]> {
  let raw: string;
  try {
    raw = await readFile(filePath, 'utf8');
  } catch (error) {
    throw new SpreadCatalogError(`Não foi possível ler as tiragens em ${filePath}.`, [String(error)]);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new SpreadCatalogError(`${filePath} não é um JSON válido.`);
  }

  const result = spreadCatalogFileSchema.safeParse(parsed);
  if (!result.success) {
    throw new SpreadCatalogError(
      `As tiragens em ${filePath} falharam na validação estrutural.`,
      result.error.issues.map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`),
    );
  }

  assertUniqueIds(result.data.spreads, filePath);
  return result.data.spreads.map((spread) => ({ ...spread, custom: custom || spread.custom }));
}

/**
 * Lê o recurso embarcado e, se existir, o arquivo de customização.
 * Customizações substituem a tiragem de mesmo id e são marcadas `custom: true`.
 */
export class JsonSpreadCatalog implements SpreadCatalog {
  private cached: readonly SpreadDefinition[] | undefined;

  constructor(private readonly options: JsonSpreadCatalogOptions) {}

  async list(): Promise<readonly SpreadDefinition[]> {
    if (!this.cached) {
      this.cached = await this.loadAll();
    }
    return this.cached;
  }

  async get(spreadId: string): Promise<SpreadDefinition | undefined> {
    const spreads = await this.list();
    return spreads.find((spread) => spread.id === spreadId);
  }

  private async loadAll(): Promise<readonly SpreadDefinition[]> {
    const builtIn = await readCatalog(this.options.resourcePath, false);
    if (!this.options.customPath || !existsSync(this.options.customPath)) {
      return builtIn;
    }

    const custom = await readCatalog(this.options.customPath, true);
    const merged = new Map<string, SpreadDefinition>(builtIn.map((spread) => [spread.id, spread]));
    for (const spread of custom) {
      merged.set(spread.id, spread);
    }
    return [...merged.values()];
  }
}
