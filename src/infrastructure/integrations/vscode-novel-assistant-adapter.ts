import { existsSync } from 'node:fs';
import { join } from 'node:path';
import * as vscode from 'vscode';
import type { IntegrationGateway, NovelAssistantStatus } from '../../application/ports/integration-gateway';
import {
  parseNovelAssistantPackage,
  presentNovelAssistantDirs,
} from '../../domain/integration/novel-assistant-package';

const EXTENSION_ID = 'baryo-dev.novel-assistant';

const ABSENT: NovelAssistantStatus = {
  installed: false,
  version: null,
  commands: [],
  customEditors: [],
  exportsApi: false,
  workspaceDirs: [],
};

/**
 * Descobre a extensão, comandos e custom editors em runtime a partir do manifesto
 * público. Nenhum ID é inventado; `hasCommand()` é a única porta de execução.
 */
export class VsCodeNovelAssistantAdapter implements IntegrationGateway {
  constructor(private readonly workspaceRoot?: string) {}

  detectNovelAssistant(workspaceRoot = this.workspaceRoot): NovelAssistantStatus {
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    if (!extension) {
      return ABSENT;
    }

    const info = parseNovelAssistantPackage(extension.packageJSON, extension.exports);
    const workspaceDirs = workspaceRoot
      ? presentNovelAssistantDirs((directory) => existsSync(join(workspaceRoot, directory)))
      : [];

    return { installed: true, ...info, workspaceDirs };
  }

  hasCommand(id: string): boolean {
    if (typeof id !== 'string' || id.length === 0) {
      return false;
    }
    return this.detectNovelAssistant().commands.includes(id);
  }

  /** Retorna o primeiro viewType efetivamente descoberto, se houver. */
  customEditorViewType(): string | undefined {
    return this.detectNovelAssistant().customEditors[0];
  }
}
