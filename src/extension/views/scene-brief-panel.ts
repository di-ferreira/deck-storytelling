import { randomBytes } from 'node:crypto';
import * as vscode from 'vscode';
import type { SceneBriefData } from '../../application/services/scene-brief-service';
import { renderSceneBriefHtml } from './scene-brief-html';

/** Painel estático e somente leitura: sem scripts, sem recursos locais, CSP rígida. */
export class SceneBriefPanel {
  private panel: vscode.WebviewPanel | undefined;

  constructor(private readonly context: vscode.ExtensionContext) {}

  show(data: SceneBriefData): void {
    const nonce = randomBytes(16).toString('base64');
    if (!this.panel) {
      this.panel = vscode.window.createWebviewPanel(
        'storyDeck.sceneBrief',
        `Scene Brief — ${data.title}`,
        vscode.ViewColumn.Beside,
        { enableScripts: false, localResourceRoots: [] },
      );
      this.panel.onDidDispose(() => {
        this.panel = undefined;
      });
      this.context.subscriptions.push(this.panel);
    }
    this.panel.title = `Scene Brief — ${data.title}`;
    this.panel.webview.html = renderSceneBriefHtml(data, nonce);
    this.panel.reveal(vscode.ViewColumn.Beside);
  }
}
