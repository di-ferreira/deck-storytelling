import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { MANUSCRIPT_ROOT, SCENE_EXTENSION } from '../../domain/integration/novel-path-layout';

export interface ManuscriptFileResult {
  readonly absolutePath: string;
  readonly relativePath: string;
  readonly created: boolean;
}

/**
 * Cria o `.md` da cena SOMENTE se ele não existir. Nunca edita um arquivo do
 * Novel Assistant. A validação do caminho é uma segunda barreira além do
 * `scenePath()` sanitizado: nenhuma travessia sai de `Manuscript/`.
 */
export class ManuscriptSceneStore {
  constructor(private readonly rootPath: string | undefined) {}

  async ensureSceneFile(relativePath: string, content: string): Promise<ManuscriptFileResult> {
    if (!this.rootPath) {
      throw new Error('Abra um workspace antes de abrir uma cena.');
    }

    const relative = this.normalize(relativePath);
    const root = resolve(this.rootPath);
    const absolute = resolve(root, ...relative.split('/'));
    if (absolute !== root && !absolute.startsWith(root + sep)) {
      throw new Error('Caminho de cena fora do workspace.');
    }

    await mkdir(dirname(absolute), { recursive: true });
    let created = false;
    try {
      // 'wx' = criação exclusiva: se outro processo criar o arquivo primeiro,
      // não sobrescrevemos. Não usamos atomicWriteText aqui justamente por isso.
      await writeFile(absolute, content, { encoding: 'utf8', flag: 'wx' });
      created = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }

    return { absolutePath: absolute, relativePath: relative, created };
  }

  private normalize(relativePath: string): string {
    const normalized = typeof relativePath === 'string' ? relativePath.replace(/\\/g, '/') : '';
    const segments = normalized.split('/').filter((segment) => segment.length > 0);

    if (segments.length < 3) {
      throw new Error('Caminho de cena inválido: use o layout Manuscript/<Capítulo>/<Cena>.md.');
    }
    if (segments.some((segment) => segment === '..' || segment === '.' || segment.includes('\u0000'))) {
      throw new Error('Caminho de cena inseguro: travessia detectada.');
    }
    if (segments[0] !== MANUSCRIPT_ROOT) {
      throw new Error('A cena deve ficar dentro de Manuscript/.');
    }
    if (!segments[segments.length - 1]!.toLowerCase().endsWith(SCENE_EXTENSION)) {
      throw new Error('A cena deve ser um arquivo .md.');
    }
    return segments.join('/');
  }
}
