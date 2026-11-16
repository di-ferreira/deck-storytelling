/** Contratos compartilhados entre Extension Host, camadas e Webview. */

export interface IDisposable {
  dispose(): void;
}

export type Severity = 'error' | 'warning' | 'info';

export interface ValidationFinding {
  readonly severity: Severity;
  readonly code: string;
  readonly message: string;
}

export type Result<T, E = string> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
