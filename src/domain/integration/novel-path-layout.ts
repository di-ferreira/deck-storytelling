/**
 * Layout de arquivos de cena do Novel Assistant.
 *
 * INFERIDO da observação da v0.1.0 (INTEGRATION.md §1.6):
 *
 *     Manuscript/<Capítulo>/<Cena>.md
 *
 * Os experimentos V2/V3 (criação e reconhecimento pela TreeView/Outline) ainda não
 * foram executados, então este módulo é o ÚNICO lugar que conhece o layout.
 * Para trocá-lo, altere as constantes e funções abaixo; nenhum outro módulo deve
 * montar esse caminho manualmente. Nenhuma dependência de `vscode` ou `fs`.
 */

export const MANUSCRIPT_ROOT = 'Manuscript';
export const SCENE_EXTENSION = '.md';
export const MAX_SEGMENT_LENGTH = 80;

const FALLBACK_SEGMENT = 'sem-titulo';
const WINDOWS_INVALID = /[<>:"/\\|?*\u0000-\u001F]/g;
const EDGE_NOISE = /^[\s.-]+|[\s.-]+$/g;

/**
 * Normaliza um título em um segmento de caminho seguro: sem travessia (`..`),
 * sem separadores, sem caracteres proibidos no Windows e com tamanho limitado.
 * Idempotente: sanitizeSegment(sanitizeSegment(x)) === sanitizeSegment(x).
 */
export function sanitizeSegment(name: string, fallback = FALLBACK_SEGMENT): string {
  let value = typeof name === 'string' ? name : '';

  // Travessia primeiro; separadores viram hífen para preservar a legibilidade.
  value = value.replace(/\.\./g, '').replace(/[\\/]/g, '-').replace(WINDOWS_INVALID, '');
  value = value.replace(/\s+/g, ' ').replace(EDGE_NOISE, '');

  if (value.length === 0) {
    value = fallback.replace(WINDOWS_INVALID, '').replace(EDGE_NOISE, '');
  }
  if (value.length > MAX_SEGMENT_LENGTH) {
    value = value.slice(0, MAX_SEGMENT_LENGTH).replace(EDGE_NOISE, '');
  }
  return value || FALLBACK_SEGMENT;
}

/** Nome do diretório do capítulo dentro de `Manuscript/`. */
export function chapterDirectory(title: string): string {
  return sanitizeSegment(title, 'Capítulo sem título');
}

/** Caminho relativo (separadores POSIX) da cena: `Manuscript/<Capítulo>/<Cena>.md`. */
export function scenePath(chapterTitle: string, sceneTitle: string): string {
  const chapter = chapterDirectory(chapterTitle);
  const scene = sanitizeSegment(sceneTitle, 'Cena sem título');
  return `${MANUSCRIPT_ROOT}/${chapter}/${scene}${SCENE_EXTENSION}`;
}
