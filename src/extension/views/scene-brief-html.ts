import type { SceneBriefData } from '../../application/services/scene-brief-service';

/** Escapa TODO o conteúdo dinâmico antes de compor o HTML estático. */
export function escapeHtml(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function section(title: string, body: string): string {
  return `<section><h2>${escapeHtml(title)}</h2>${body}</section>`;
}

function field(label: string, value: string): string {
  return `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value) || '<em>(não preenchido)</em>'}</p>`;
}

/**
 * Documento HTML completo, sem scripts e com CSP restritiva. Todo valor vindo do
 * projeto passa por `escapeHtml`; o nonce só autoriza o `<style>` desta página.
 */
export function renderSceneBriefHtml(data: SceneBriefData, nonce: string): string {
  const cards = data.linkedCards.length > 0
    ? `<ul>${data.linkedCards
        .map(
          (card) =>
            `<li>${escapeHtml(card.title)} <small>(${escapeHtml(card.cardId)})${
              card.note ? ` — ${escapeHtml(card.note)}` : ''
            }</small></li>`,
        )
        .join('')}</ul>`
    : '<p><em>Nenhuma carta vinculada a esta cena.</em></p>';

  const warnings = data.warnings.length > 0
    ? `<ul>${data.warnings
        .map((warning) => `<li>${escapeHtml(warning.message)} <small>(${escapeHtml(warning.code)})</small></li>`)
        .join('')}</ul>`
    : '<p><em>Nenhum aviso do contexto.</em></p>';

  const d = data.dimensions;
  const dimensions = [
    field('Tom', d.tone),
    field('Atmosfera', d.atmosphere),
    field('Ambiente', d.setting),
    field('Público', d.audience),
    field('Formato', d.format),
    field('Extensão aproximada', d.approximateLength),
  ].join('');

  const csp = [
    "default-src 'none'",
    `style-src 'nonce-${escapeHtml(nonce)}'`,
  ].join('; ');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <title>Scene Brief — ${escapeHtml(data.title)}</title>
  <style nonce="${escapeHtml(nonce)}">
    body { font-family: var(--vscode-font-family); color: var(--vscode-editor-foreground); padding: 0 1rem 2rem; line-height: 1.5; }
    h1 { font-size: 1.4rem; border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: .4rem; }
    h2 { font-size: 1.05rem; margin-top: 1.4rem; color: var(--vscode-textLink-foreground); }
    p { margin: .35rem 0; }
    small { opacity: .75; }
    em { opacity: .7; }
  </style>
</head>
<body>
  <h1>${escapeHtml(data.title)}</h1>
  <p><small>ID: ${escapeHtml(data.sceneId)}</small></p>
  ${section('Estrutura', field('Ato', data.actTitle) + field('Capítulo', data.chapterTitle))}
  ${section('Cena', field('Objetivo', data.goal) + field('Conflito', data.conflict) + field('Mudança', data.stateChange) + field('Gancho', data.hook))}
  ${section('Cartas vinculadas', cards)}
  ${section('Gênero e identidade', field('Gênero dominante', data.dominantGenreTitle) + dimensions)}
  ${section('Avisos do contexto', warnings)}
</body>
</html>`;
}
