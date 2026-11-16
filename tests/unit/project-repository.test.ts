import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StoryProjectConflictError } from '../../src/application/ports/project-repository';
import { JsonProjectRepository } from '../../src/infrastructure/persistence/json-project-repository';

describe('repositório de projeto (T15/T17)', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'storydeck-project-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('cria a estrutura uma única vez sem sobrescrever arquivos existentes', async () => {
    const repo = new JsonProjectRepository(root, '4.0.0');
    const first = await repo.ensureStructure();
    expect(first.created).toBe(true);
    expect(first.createdFiles).toContain('.storydeck/project.json');
    expect(first.createdFiles).toContain('Story/story-bible.md');

    const bible = join(root, 'Story', 'story-bible.md');
    await writeFile(bible, '# Minha edição manual\n', 'utf8');

    const second = await repo.ensureStructure();
    expect(second.created).toBe(false);
    expect(await readFile(bible, 'utf8')).toBe('# Minha edição manual\n');
  });

  it('carrega e salva mantendo schemaVersion, deckVersion e revisão otimista', async () => {
    const repo = new JsonProjectRepository(root, '4.0.0', () => '2026-01-01T10:00:00.000Z');
    await repo.ensureStructure();
    const project = await repo.load();
    expect(project?.schemaVersion).toBe(2);
    expect(project?.deckVersion).toBe('4.0.0');
    expect(project?.revision).toBe(0);

    if (!project) throw new Error('projeto não carregado');
    const saved = await repo.save({
      ...project,
      project: {
        ...project.project,
        identity: { provisionalTitle: 'Minha obra', initialDescription: 'teste', period: '' },
      },
    }, project.revision);
    expect(saved.revision).toBe(1);

    const reloaded = await repo.load();
    expect(reloaded?.project.identity.provisionalTitle).toBe('Minha obra');

    // Atualização com revisão desatualizada é recusada (T15: edição externa preservada).
    await expect(repo.save(project, project.revision)).rejects.toBeInstanceOf(StoryProjectConflictError);
    expect((await repo.load())?.revision).toBe(1);
  });

  it('não exige workspace para operações de leitura', async () => {
    const repo = new JsonProjectRepository(undefined, '4.0.0');
    expect(repo.getWorkspaceRoot()).toBeUndefined();
    expect(await repo.load()).toBeUndefined();
  });
});
