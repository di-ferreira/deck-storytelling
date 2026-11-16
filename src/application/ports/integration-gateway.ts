export interface NovelAssistantStatus {
  readonly installed: boolean;
  readonly version: string | null;
  readonly commands: readonly string[];
}

/** Integração por descoberta em runtime — nunca IDs inventados. */
export interface IntegrationGateway {
  detectNovelAssistant(): NovelAssistantStatus;
}
