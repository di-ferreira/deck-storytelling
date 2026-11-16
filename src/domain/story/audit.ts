/**
 * Auditoria narrativa — RESERVADO.
 *
 * Nenhum serviço, estado ou UI de auditoria existe nesta fase. O agregado mantém o campo
 * vazio apenas para reservar o formato de persistência; ST-149/ST-150 serão consumidos
 * em uma entrega futura e nunca rotulados como erro absoluto de autoria.
 */
export type AuditState = Readonly<Record<string, never>>;

export function createEmptyAuditState(): AuditState {
  return {};
}

export function auditFromJson(_json: unknown): AuditState {
  return createEmptyAuditState();
}
