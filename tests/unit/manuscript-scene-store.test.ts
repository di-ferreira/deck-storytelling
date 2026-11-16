import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ManuscriptSceneStore } from '../../src/infrastructure/integrations/manuscript-scene-store';
import { renderSceneManuscriptTemplate } from '../../src/infrastructure/markdown/scene-manuscript-template';
import type { Scene } from '../../src/domain/story/structure';

const scene: Scene = {
  id: 'cen-123',
  title: 'Cena do Encontro',
  chapterId: 'cap-1',
  goal: 'Revelar a chave',
  conflict: 'A porta está trancada',
  obstacle: '',
  tension: '',
  stateChange: 'A chave é encontrada',
  consequence: '',
  hook: 'Alguém observa',
  chronologicalMoment: '',
  focalCharacterId: '',
  presentCharacterIds: [],
  locationId: '',
  sourceCardIds: [],
};

describe('T66 — arquivo de cena no Manuscript (create-if-missing)', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'storydeck-manuscript-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('cria o arquivo e o diretório quando ausentes', async () => {
    const store = new ManuscriptSceneStore(root);
    const template = renderSceneManuscriptTemplate(scene);
    const result = await store.ensureSceneFile('Manuscript/Capítulo 01/Cena do Encontro.md', template);

    expect(result.created).toBe(true);
    expect(result.relativePath).toBe('Manuscript/Capítulo 01/Cena do Encontro.md');
    const content = await readFile(result.absolutePath, 'utf8');
    expect(content).toContain('# Cena do Encontro');
    expect(content).toContain('## Synopsis');
    expect(content).toContain('---');
    expect(content).toContain('cen-123');
    expect(content).toContain('Revelar a chave');
  });

  it('nunca sobrescreve um arquivo existente', async () => {
    const store = new ManuscriptSceneStore(root);
    const relative = 'Manuscript/Capítulo 01/Cena do Encontro.md';
    const first = await store.ensureSceneFile(relative, renderSceneManuscriptTemplate(scene));
    await writeFile(first.absolutePath, '# Edição do autor\n', 'utf8');

    const second = await store.ensureSceneFile(relative, 'template novo');
    expect(second.created).toBe(false);
    expect(await readFile(second.absolutePath, 'utf8')).toBe('# Edição do autor\n');
  });

  it('rejeita travessia de diretório', async () => {
    const store = new ManuscriptSceneStore(root);
    await expect(store.ensureSceneFile('../forbidden.md', 'x')).rejects.toThrow(/Manuscript|seguro|inválid/i);
    await expect(store.ensureSceneFile('Manuscript/../forbidden.md', 'x')).rejects.toThrow(/Manuscript|seguro|inválid/i);
  });

  it('rejeita caminhos fora do layout Manuscript', async () => {
    const store = new ManuscriptSceneStore(root);
    await expect(store.ensureSceneFile('Story/outline.md', 'x')).rejects.toThrow(/Manuscript/);
  });

  it('exige workspace aberto', async () => {
    const store = new ManuscriptSceneStore(undefined);
    await expect(store.ensureSceneFile('Manuscript/Cap/Cena.md', 'x')).rejects.toThrow(/workspace/i);
  });
});
