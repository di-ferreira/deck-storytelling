import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  IntegrationSettingsStore,
  isIntegrationMode,
} from '../../src/infrastructure/persistence/integration-settings';

describe('T65 — modo de integração em .storydeck/settings.json', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'storydeck-settings-'));
    await mkdir(join(root, '.storydeck'), { recursive: true });
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('grava e lê o modo de integração', async () => {
    const store = new IntegrationSettingsStore(root);
    expect(await store.setIntegrationMode('standalone')).toBe(true);
    expect(await store.getIntegrationMode()).toBe('standalone');
  });

  it('preserva chaves existentes e o schemaVersion', async () => {
    const file = join(root, '.storydeck', 'settings.json');
    await writeFile(file, JSON.stringify({ schemaVersion: 1, outraChave: { mantida: true } }), 'utf8');
    const store = new IntegrationSettingsStore(root);
    await store.setIntegrationMode('novel-assistant');

    const saved = JSON.parse(await readFile(file, 'utf8')) as Record<string, unknown>;
    expect(saved.schemaVersion).toBe(1);
    expect(saved.outraChave).toEqual({ mantida: true });
    expect(saved.integrationMode).toBe('novel-assistant');
  });

  it('não reescreve quando o modo já é o mesmo', async () => {
    const store = new IntegrationSettingsStore(root);
    await store.setIntegrationMode('standalone');
    const file = join(root, '.storydeck', 'settings.json');
    const before = await readFile(file, 'utf8');
    expect(await store.setIntegrationMode('standalone')).toBe(false);
    expect(await readFile(file, 'utf8')).toBe(before);
  });

  it('cria o arquivo quando ele não existe', async () => {
    const store = new IntegrationSettingsStore(root);
    expect(await store.getIntegrationMode()).toBeUndefined();
    await store.setIntegrationMode('novel-assistant');
    expect(await store.getIntegrationMode()).toBe('novel-assistant');
  });

  it('opera sem workspace sem lançar', async () => {
    const store = new IntegrationSettingsStore(undefined);
    expect(await store.getIntegrationMode()).toBeUndefined();
    expect(await store.setIntegrationMode('standalone')).toBe(false);
  });

  it('valida apenas os dois modos conhecidos', () => {
    expect(isIntegrationMode('novel-assistant')).toBe(true);
    expect(isIntegrationMode('standalone')).toBe(true);
    expect(isIntegrationMode('outro')).toBe(false);
    expect(isIntegrationMode(undefined)).toBe(false);
  });
});
