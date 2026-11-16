/**
 * Erros de domínio da seleção de gênero.
 * O código é estável; a mensagem é editorial, escrita para o autor — nunca um erro técnico.
 */
export type GenreErrorCode =
  | 'SECONDARY_LIMIT'
  | 'DOMINANT_IN_SECONDARIES'
  | 'DUPLICATE_SECONDARY'
  | 'UNKNOWN_GENRE'
  | 'NOT_A_GENRE'
  | 'UNKNOWN_SUBGENRE';

export class GenreError extends Error {
  constructor(
    readonly code: GenreErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'GenreError';
  }
}
