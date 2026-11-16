import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { GenreDocumentStore } from '../../application/ports/genre-document-store';
import type { DeckRepository } from '../../application/ports/deck-repository';
import type { GenreProfile } from '../../domain/genre/genre-profile';
import { atomicWriteText, sharedWriteLock } from '../filesystem/atomic-writer';
import { replaceGeneratedBlocks } from './genre-contract-document';
import {
  renderGenreContractBlocks,
  renderGenreContractDocument,
} from './genre-contract-renderer';

export interface GenreContractDocumentStoreOptions {
  readonly projectRoot?: string;
  /** Caminho explícito do arquivo (tem precedência sobre `projectRoot`). */
  readonly filePath?: string;
  readonly deck: DeckRepository;
}

/**
 * Implementação em `Story/genre-contract.md`.
 *
 * - `saveContractIfAbsent` nunca sobrescreve um arquivo existente.
 * - `regenerateContract` é explícito e substitui apenas blocos `story-deck:generated`,
 *   preservando blocos `story-deck:user` e qualquer texto fora deles.
 */
export class GenreContractDocumentStore implements GenreDocumentStore {
  readonly filePath: string;
  private readonly deck: DeckRepository;

  constructor(options: GenreContractDocumentStoreOptions) {
    if (!options.projectRoot && !options.filePath) {
      throw new Error('GenreContractDocumentStore exige projectRoot ou filePath.');
    }
    this.filePath = options.filePath ?? join(options.projectRoot!, 'Story', 'genre-contract.md');
    this.deck = options.deck;
  }

  async loadContract(): Promise<string | undefined> {
    try {
      return await readFile(this.filePath, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return undefined;
      }
      throw error;
    }
  }

  saveContractIfAbsent(markdown: string): Promise<boolean> {
    return sharedWriteLock.run(this.filePath, async () => {
      if ((await this.loadContract()) !== undefined) {
        return false;
      }
      await atomicWriteText(this.filePath, markdown.endsWith('\n') ? markdown : `${markdown}\n`);
      return true;
    });
  }

  regenerateContract(profile: GenreProfile): Promise<{ changed: boolean }> {
    return sharedWriteLock.run(this.filePath, async () => {
      const deck = await this.deck.load();
      const existing = await this.loadContract();

      if (existing === undefined) {
        await atomicWriteText(this.filePath, renderGenreContractDocument(profile, deck));
        return { changed: true };
      }

      const result = replaceGeneratedBlocks(existing, renderGenreContractBlocks(profile, deck));
      if (!result.changed) {
        return { changed: false };
      }
      await atomicWriteText(this.filePath, result.content);
      return { changed: true };
    });
  }
}
