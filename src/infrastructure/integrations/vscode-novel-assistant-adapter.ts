import * as vscode from 'vscode';
import type { IntegrationGateway, NovelAssistantStatus } from '../../application/ports/integration-gateway';

const EXTENSION_ID = 'baryo-dev.novel-assistant';

/**
 * Descobre a extensão e seus comandos em runtime, a partir de contributes.commands.
 * Nenhum ID de comando é inventado ou assumido como contrato.
 */
export class VsCodeNovelAssistantAdapter implements IntegrationGateway {
  detectNovelAssistant(): NovelAssistantStatus {
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    if (!extension) {
      return { installed: false, version: null, commands: [] };
    }

    const contributes = extension.packageJSON?.contributes as
      | { commands?: Array<{ command?: string }> }
      | undefined;
    const commands = (contributes?.commands ?? [])
      .map((entry) => entry.command)
      .filter((value): value is string => typeof value === 'string' && value.length > 0);

    const version = typeof extension.packageJSON?.version === 'string'
      ? extension.packageJSON.version as string
      : null;

    return { installed: true, version, commands };
  }
}
