import { describe, expect, it } from 'vitest';
import {
  NOVEL_ASSISTANT_DIRS,
  parseNovelAssistantPackage,
  presentNovelAssistantDirs,
} from '../../src/domain/integration/novel-assistant-package';

describe('T64 — descoberta pura do pacote do Novel Assistant (sem vscode)', () => {
  const packageJson = {
    name: 'novel-assistant',
    version: '0.1.0',
    contributes: {
      commands: [
        { command: 'novel-assistant.newProject' },
        { command: 'novel-assistant.newScene' },
        { title: 'sem comando' },
        { command: '' },
      ],
      customEditors: [
        { viewType: 'novel-assistant.wysiwyg', displayName: 'Novel WYSIWYG Editor' },
        { displayName: 'sem viewType' },
      ],
    },
  };

  it('descobre comandos exclusivamente de contributes.commands', () => {
    const parsed = parseNovelAssistantPackage(packageJson);
    expect(parsed.commands).toEqual(['novel-assistant.newProject', 'novel-assistant.newScene']);
  });

  it('não inventa IDs: devolve exatamente o que está no pacote observado', () => {
    const parsed = parseNovelAssistantPackage({
      contributes: { commands: [{ command: 'extensao.futura.desconhecida' }] },
    });
    expect(parsed.commands).toEqual(['extensao.futura.desconhecida']);
  });

  it('descobre viewTypes de customEditors sem hardcoded', () => {
    const parsed = parseNovelAssistantPackage(packageJson);
    expect(parsed.customEditors).toEqual(['novel-assistant.wysiwyg']);
  });

  it('reporta exportsApi conforme o valor real de exports', () => {
    expect(parseNovelAssistantPackage(packageJson).exportsApi).toBe(false);
    expect(parseNovelAssistantPackage(packageJson, null).exportsApi).toBe(false);
    expect(parseNovelAssistantPackage(packageJson, {}).exportsApi).toBe(true);
    expect(parseNovelAssistantPackage(packageJson, () => undefined).exportsApi).toBe(true);
  });

  it('lê a versão quando presente e devolve null quando ausente', () => {
    expect(parseNovelAssistantPackage(packageJson).version).toBe('0.1.0');
    expect(parseNovelAssistantPackage({}).version).toBeNull();
  });

  it('não lança diante de entradas inválidas', () => {
    for (const input of [undefined, null, 'texto', 42, { contributes: null }]) {
      const parsed = parseNovelAssistantPackage(input);
      expect(parsed.commands).toEqual([]);
      expect(parsed.customEditors).toEqual([]);
      expect(parsed.exportsApi).toBe(false);
    }
  });

  it('conhece os seis diretórios documentados, sem incluir dados privados', () => {
    expect([...NOVEL_ASSISTANT_DIRS]).toEqual([
      'Manuscript',
      'Characters',
      'Locations',
      'Research',
      'Timeline',
      'Notes',
    ]);
  });

  it('reporta apenas os diretórios efetivamente presentes, na ordem canônica', () => {
    expect(
      presentNovelAssistantDirs((name) => ['Manuscript', 'Notes'].includes(name)),
    ).toEqual(['Manuscript', 'Notes']);
    expect(presentNovelAssistantDirs(() => false)).toEqual([]);
  });
});
