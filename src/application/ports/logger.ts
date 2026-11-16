/** Log sem conteúdo do manuscrito: apenas mensagens, IDs e códigos. */
export interface AppLogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  show(): void;
}
