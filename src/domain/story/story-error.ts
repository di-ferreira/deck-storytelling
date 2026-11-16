/**
 * Erros de domínio do Story Builder.
 *
 * Códigos estáveis — a mensagem é editorial e nunca deve conter conteúdo de manuscrito.
 * Referências inválidas em texto (cartas, personagens citados) são AVISOS emitidos pelo
 * `StoryContextBuilder`; aqui ficam apenas as violações que impedem uma operação.
 */
export type StoryErrorCode =
  | 'STORY_HAS_LINKS'
  | 'UNKNOWN_TARGET'
  | 'UNKNOWN_CARD'
  | 'INVALID_HIERARCHY'
  | 'DUPLICATE_ID'
  | 'ENTITY_NOT_FOUND'
  | 'MULTIPLE_MAIN_CONFLICTS';

export class StoryError extends Error {
  constructor(
    readonly code: StoryErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'StoryError';
  }
}
