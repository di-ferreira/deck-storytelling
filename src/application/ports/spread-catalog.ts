import type { SpreadDefinition } from '../../shared/schemas/spread';

/** Catálogo de tiragens: recurso embarcado + customizações do usuário. */
export interface SpreadCatalog {
  list(): Promise<readonly SpreadDefinition[]>;
  get(spreadId: string): Promise<SpreadDefinition | undefined>;
}
