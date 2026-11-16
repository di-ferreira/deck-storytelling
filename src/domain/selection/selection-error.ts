/** Erros de domínio da seleção. O código é estável; a mensagem é para o usuário. */
export type SelectionErrorCode =
  | 'UNKNOWN_CARD'
  | 'CARD_LOCKED'
  | 'CARD_ALREADY_SELECTED'
  | 'CARD_NOT_SELECTED'
  | 'POOL_INSUFFICIENT'
  | 'DUPLICATE_LINK'
  | 'VERSION_NOT_FOUND'
  | 'INVALID_REQUEST';

export class SelectionError extends Error {
  constructor(
    readonly code: SelectionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'SelectionError';
  }
}
