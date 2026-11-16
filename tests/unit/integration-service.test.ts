import { describe, expect, it } from 'vitest';
import { IntegrationService } from '../../src/application/services/integration-service';
import type { IntegrationGateway, NovelAssistantStatus } from '../../src/application/ports/integration-gateway';

function status(patch: Partial<NovelAssistantStatus> = {}): NovelAssistantStatus {
  return {
    installed: false,
    version: null,
    commands: [],
    customEditors: [],
    exportsApi: false,
    workspaceDirs: [],
    ...patch,
  };
}

function gateway(current: NovelAssistantStatus, confirmed: readonly string[] = []): IntegrationGateway {
  return {
    detectNovelAssistant: () => current,
    hasCommand: (id: string) => confirmed.includes(id),
  };
}

describe('T68 — plano de integração (fluxos A/B)', () => {
  it('fluxo A: instalado e comando confirmado usa o fluxo oficial e não cria diretórios de compatibilidade', () => {
    const current = status({ installed: true, version: '0.1.0' });
    const service = new IntegrationService(gateway(current, ['novel-assistant.newProject']));

    const plan = service.plan();
    expect(plan.mode).toBe('novel-assistant');
    expect(plan.officialNewProjectCommand).toBe('novel-assistant.newProject');
    expect(plan.createCompatibilityDirs).toBe(false);
  });

  it('fluxo A: comando não confirmado em runtime nunca é oferecido', () => {
    const current = status({ installed: true, version: '0.1.0', commands: [] });
    const service = new IntegrationService(gateway(current));

    const plan = service.plan();
    expect(plan.mode).toBe('novel-assistant');
    expect(plan.officialNewProjectCommand).toBeUndefined();
    expect(plan.createCompatibilityDirs).toBe(false);
  });

  it('fluxo B: sem Novel Assistant, modo standalone cria os diretórios de compatibilidade', () => {
    const service = new IntegrationService(gateway(status()));

    const plan = service.plan();
    expect(plan.mode).toBe('standalone');
    expect(plan.officialNewProjectCommand).toBeUndefined();
    expect(plan.createCompatibilityDirs).toBe(true);
  });

  it('nunca devolve um ID de comando que hasCommand não confirmou', () => {
    const confirmed = ['novel-assistant.newScene'];
    const service = new IntegrationService(gateway(status({ installed: true }), confirmed));

    const plan = service.plan();
    if (plan.officialNewProjectCommand) {
      expect(confirmed).toContain(plan.officialNewProjectCommand);
    }
    expect(plan.officialNewProjectCommand).not.toBe('novel-assistant.newProject');
  });
});
