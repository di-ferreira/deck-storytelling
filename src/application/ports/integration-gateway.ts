export interface NovelAssistantStatus {
  readonly installed: boolean;
  readonly version: string | null;
  /** IDs descobertos em `contributes.commands` — nunca assumidos como contrato. */
  readonly commands: readonly string[];
  /** viewTypes descobertos em `contributes.customEditors`. */
  readonly customEditors: readonly string[];
  /** V4: `extension.exports` efetivamente definido. */
  readonly exportsApi: boolean;
  /** Subconjunto dos seis diretórios documentados que existe no workspace. */
  readonly workspaceDirs: readonly string[];
}

export type IntegrationMode = 'novel-assistant' | 'standalone';

export function isIntegrationMode(value: unknown): value is IntegrationMode {
  return value === 'novel-assistant' || value === 'standalone';
}

/** Integração por descoberta em runtime — nunca IDs inventados. */
export interface IntegrationGateway {
  detectNovelAssistant(workspaceRoot?: string): NovelAssistantStatus;
  /** Só devolve `true` quando o ID foi confirmado no manifesto em runtime. */
  hasCommand(id: string): boolean;
}
