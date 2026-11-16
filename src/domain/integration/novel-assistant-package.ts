/**
 * Leitura pura dos metadados públicos do Novel Assistant (`packageJSON` + `exports`).
 * Nenhuma dependência de `vscode`: toda a descoberta de IDs vem de `contributes`,
 * nunca de constantes tratadas como contrato.
 */

/** Os seis diretórios documentados que o `newProject` do NA cria se ausentes. */
export const NOVEL_ASSISTANT_DIRS = [
  'Manuscript',
  'Characters',
  'Locations',
  'Research',
  'Timeline',
  'Notes',
] as const;

export type NovelAssistantDir = (typeof NOVEL_ASSISTANT_DIRS)[number];

export interface NovelAssistantPackageInfo {
  readonly version: string | null;
  readonly commands: readonly string[];
  readonly customEditors: readonly string[];
  readonly exportsApi: boolean;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function nonEmptyStrings(value: readonly unknown[]): readonly string[] {
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
}

/** Extrai somente o que o próprio manifesto declara. IDs desconhecidos são preservados. */
export function parseNovelAssistantPackage(
  packageJSON: unknown,
  exportsValue?: unknown,
): NovelAssistantPackageInfo {
  const manifest = asRecord(packageJSON);
  const contributes = asRecord(manifest.contributes);

  const rawCommands = Array.isArray(contributes.commands) ? contributes.commands : [];
  const commands = nonEmptyStrings(rawCommands.map((entry) => asRecord(entry).command));

  const rawEditors = Array.isArray(contributes.customEditors) ? contributes.customEditors : [];
  const customEditors = nonEmptyStrings(rawEditors.map((entry) => asRecord(entry).viewType));

  const version = typeof manifest.version === 'string' && manifest.version.trim().length > 0
    ? manifest.version
    : null;

  return {
    version,
    commands,
    customEditors,
    // V4: a API programática só existe se `extension.exports` estiver efetivamente definido.
    exportsApi: exportsValue !== undefined && exportsValue !== null,
  };
}

/** Filtra os diretórios documentados que realmente existem, na ordem canônica. */
export function presentNovelAssistantDirs(
  exists: (directory: NovelAssistantDir) => boolean,
): readonly NovelAssistantDir[] {
  return NOVEL_ASSISTANT_DIRS.filter(exists);
}
