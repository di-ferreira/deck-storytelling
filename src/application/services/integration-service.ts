import type {
  IntegrationGateway,
  IntegrationMode,
} from '../ports/integration-gateway';

/**
 * Candidato observado em `INTEGRATION.md` — NÃO é um contrato. Só é devolvido no
 * plano se `IntegrationGateway.hasCommand()` confirmar o ID no manifesto em runtime.
 */
export const NA_NEW_PROJECT_COMMAND = 'novel-assistant.newProject';

export interface IntegrationPlan {
  readonly mode: IntegrationMode;
  readonly officialNewProjectCommand: string | undefined;
  readonly createCompatibilityDirs: boolean;
}

/** Decide o fluxo A (NA instalado) ou B (standalone) sem tocar em arquivos. */
export class IntegrationService {
  constructor(
    private readonly integration: IntegrationGateway,
    private readonly newProjectCommandId: string = NA_NEW_PROJECT_COMMAND,
  ) {}

  plan(): IntegrationPlan {
    const status = this.integration.detectNovelAssistant();
    if (status.installed) {
      return {
        mode: 'novel-assistant',
        officialNewProjectCommand: this.integration.hasCommand(this.newProjectCommandId)
          ? this.newProjectCommandId
          : undefined,
        // Fluxo A: o NA é dono dos seus diretórios; o Story Deck só cria .storydeck/ e Story/.
        createCompatibilityDirs: false,
      };
    }
    return {
      mode: 'standalone',
      officialNewProjectCommand: undefined,
      // Fluxo B: criamos os seis diretórios documentados se ausentes.
      createCompatibilityDirs: true,
    };
  }
}
