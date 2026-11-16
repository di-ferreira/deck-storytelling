import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { atomicWriteJson, WriteLock } from '../../src/infrastructure/filesystem/atomic-writer';

describe('persistência atômica (T14)', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'storydeck-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('grava JSON válido e substitui o arquivo por rename', async () => {
    const target = join(dir, 'nested', 'project.json');
    await atomicWriteJson(target, { schemaVersion: 1, value: 'a' });
    await atomicWriteJson(target, { schemaVersion: 2, value: 'b' });
    expect(JSON.parse(await readFile(target, 'utf8'))).toEqual({ schemaVersion: 2, value: 'b' });
  });

  it('serializa operações concorrentes da mesma chave', async () => {
    const lock = new WriteLock();
    const order: number[] = [];
    await Promise.all(
      [1, 2, 3, 4].map((n) =>
        lock.run('projeto', async () => {
          await new Promise((resolve) => setTimeout(resolve, 2));
          order.push(n);
        }),
      ),
    );
    expect(order).toEqual([1, 2, 3, 4]);
  });

  it('não bloqueia chaves distintas', async () => {
    const lock = new WriteLock();
    const order: string[] = [];
    const a = lock.run('a', async () => {
      await new Promise((resolve) => setTimeout(resolve, 15));
      order.push('a-fim');
    });
    const b = lock.run('b', async () => {
      order.push('b-fim');
    });
    await Promise.all([a, b]);
    expect(order[0]).toBe('b-fim');
  });
});
