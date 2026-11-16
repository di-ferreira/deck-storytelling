import { describe, expect, it } from 'vitest';
import {
  chapterDirectory,
  MANUSCRIPT_ROOT,
  sanitizeSegment,
  scenePath,
} from '../../src/domain/integration/novel-path-layout';

describe('T63 — layout de caminhos do Novel Assistant (inferido, V2/V3 pendentes)', () => {
  it('remove travessia de diretório e separadores de um segmento', () => {
    const result = sanitizeSegment('../../Segredo');
    expect(result).not.toContain('..');
    expect(result).not.toMatch(/[\\/]/);
    expect(result).toBe('Segredo');
  });

  it('remove caracteres inválidos no Windows e caracteres de controle', () => {
    const result = sanitizeSegment('a<b>c:d"e/f|g?h*i\u0000');
    expect(result).not.toMatch(/[<>:"/\\|?*\u0000-\u001F]/);
    expect(result.length).toBeGreaterThan(0);
  });

  it('devolve um fallback seguro para nomes vazios ou somente pontos', () => {
    for (const input of ['', '   ', '..', '../', '.', '\\']) {
      const result = sanitizeSegment(input);
      expect(result.length).toBeGreaterThan(0);
      expect(result).not.toMatch(/[\\/]/);
      expect(result).not.toContain('..');
    }
  });

  it('limita o tamanho do segmento', () => {
    expect(sanitizeSegment('a'.repeat(300)).length).toBeLessThanOrEqual(80);
  });

  it('é idempotente', () => {
    for (const input of ['Capítulo 01', '../../Cena', 'a<b>c', '   ', 'Cena: final?']) {
      const once = sanitizeSegment(input);
      expect(sanitizeSegment(once)).toBe(once);
    }
  });

  it('gera diretório de capítulo sanitizado sem barras', () => {
    const dir = chapterDirectory('Capítulo 01: O Encontro');
    expect(dir).not.toMatch(/[\\/]/);
    expect(dir).not.toContain(':');
    expect(dir.length).toBeGreaterThan(0);
  });

  it('monta o caminho relativo no layout inferido Manuscript/<Capítulo>/<Cena>.md', () => {
    expect(scenePath('Capítulo 01', 'Cena do Encontro')).toBe(
      'Manuscript/Capítulo 01/Cena do Encontro.md',
    );
  });

  it('usa apenas separadores POSIX e nunca deixa travessia escapar do layout', () => {
    const path = scenePath('../../Capítulo', '..\\Cena');
    expect(path.startsWith(`${MANUSCRIPT_ROOT}/`)).toBe(true);
    expect(path).not.toContain('..');
    expect(path).not.toContain('\\');
    expect(path.endsWith('.md')).toBe(true);
    expect(path.match(/\.md/g)?.length).toBe(1);
  });

  it('é determinístico para as mesmas entradas', () => {
    expect(scenePath('Capítulo 02', 'Fuga')).toBe(scenePath('Capítulo 02', 'Fuga'));
  });
});
