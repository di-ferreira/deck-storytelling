/**
 * Journal append-only de operações (`.storydeck/decisions.json`).
 * O payload registra IDs e decisões — nunca conteúdo de manuscrito.
 */
export interface OperationLogInput {
  readonly type: string;
  readonly projectId: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface OperationLogEntry extends OperationLogInput {
  readonly id: string;
  readonly at: string;
}

export interface OperationLog {
  append(operation: OperationLogInput): Promise<OperationLogEntry>;
  read(): Promise<readonly OperationLogEntry[]>;
}
