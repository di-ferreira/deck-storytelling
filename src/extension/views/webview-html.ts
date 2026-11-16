import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import * as vscode from 'vscode';

/** Gera um documento HTML completo com CSP restritivo e recursos locais via asWebviewUri. */
export function getWebviewHtml(
  webview: vscode.Webview,
  extensionPath: string,
  panel: 'deck' | 'genre' = 'deck',
): string {
  const webviewRoot = join(extensionPath, 'dist', 'webview');
  let scriptUri: vscode.Uri;
  let styleUri: vscode.Uri;

  try {
    readFileSync(join(webviewRoot, 'main.js'));
    readFileSync(join(webviewRoot, 'main.css'));
    scriptUri = webview.asWebviewUri(vscode.Uri.file(join(webviewRoot, 'main.js')));
    styleUri = webview.asWebviewUri(vscode.Uri.file(join(webviewRoot, 'main.css')));
  } catch {
    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Story Deck</title></head>
      <body><h1>Story Deck</h1><p>O bundle da webview ainda não foi compilado. Execute <code>npm run compile</code>.</p></body></html>`;
  }

  const nonce = randomBytes(16).toString('base64');
  const csp = [
    "default-src 'none'",
    `img-src ${webview.cspSource} https: data:`,
    `font-src ${webview.cspSource} data:`,
    `style-src ${webview.cspSource} 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    `script-src ${webview.cspSource} 'nonce-${nonce}'`,
  ].join('; ');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <title>Story Deck — ${panel === 'genre' ? 'Genre Builder' : 'Deck Studio'}</title>
  <link rel="stylesheet" href="${styleUri}">
</head>
<body data-storydeck-panel="${panel}">
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}
