import type { Deck } from '../../domain/deck/deck';

/** Porta de carregamento do catálogo oficial. O deck é sempre somente leitura. */
export interface DeckRepository {
  load(): Promise<Deck>;
  readonly sourcePath: string;
}
