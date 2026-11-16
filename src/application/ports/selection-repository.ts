import type { DeckSelection } from '../../domain/selection/deck-selection';

/** Conflito de revisão otimista entre o estado em memória e o arquivo. */
export class RevisionConflictError extends Error {
  constructor(
    readonly expectedRevision: number,
    readonly actualRevision: number,
    message = `Revisão divergente: esperada ${expectedRevision}, atual ${actualRevision}.`,
  ) {
    super(message);
    this.name = 'RevisionConflictError';
  }
}

/**
 * Porta de persistência da seleção (`.storydeck/deck-selection.json`).
 * `projectId` é injetado na implementação; o serviço nunca escolhe o projeto.
 */
export interface SelectionRepository {
  readonly projectId: string;
  load(): Promise<DeckSelection | undefined>;
  /** Grava somente se `expectedRevision` for igual à revisão atual. */
  save(selection: DeckSelection, expectedRevision: number): Promise<DeckSelection>;
}
