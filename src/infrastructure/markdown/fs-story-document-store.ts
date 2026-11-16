import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  StoryDocumentKind,
  StoryDocumentStore,
} from '../../application/ports/story-document-store';
import { atomicWriteText, sharedWriteLock } from '../filesystem/atomic-writer';
import { replaceGeneratedBlocks } from './document-blocks';

const FILE_BY_KIND: Readonly<Record<StoryDocumentKind, string>> = {
  premise: 'premise.md',
  'story-bible': 'story-bible.md',
  outline: 'outline.md',
  'narrative-decisions': 'narrative-decisions.md',
};

export interface FsStoryDocumentStoreOptions {
  readonly projectRoot?: string;
  /** Diretório explícito dos documentos (tem precedência sobre `projectRoot`). */
  readonly directory?: string;
}

/** Implementação em `Story/*.md` com criação condicional e regeneração preservando o autor. */
export class FsStoryDocumentStore implements StoryDocumentStore {
  private readonly directory: string | undefined;

  constructor(options: FsStoryDocumentStoreOptions) {
    if (!options.projectRoot && !options.directory) {
      throw new Error('FsStoryDocumentStore exige projectRoot ou directory.');
    }
    this.directory = options.directory ?? (options.projectRoot ? join(options.projectRoot, 'Story') : undefined);
  }

  private pathFor(kind: StoryDocumentKind): string {
    return join(this.directory!, FILE_BY_KIND[kind]);
  }

  async load(kind: StoryDocumentKind): Promise<string | undefined> {
    try {
      return await readFile(this.pathFor(kind), 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return undefined;
      }
      throw error;
    }
  }

  saveIfAbsent(kind: StoryDocumentKind, markdown: string): Promise<boolean> {
    const path = this.pathFor(kind);
    return sharedWriteLock.run(path, async () => {
      if ((await this.load(kind)) !== undefined) {
        return false;
      }
      await atomicWriteText(path, markdown.endsWith('\n') ? markdown : `${markdown}\n`);
      return true;
    });
  }

  regenerate(
    kind: StoryDocumentKind,
    fullMarkdown: string,
    blocks: readonly { readonly key: string; readonly markdown: string }[],
  ): Promise<{ changed: boolean }> {
    const path = this.pathFor(kind);
    return sharedWriteLock.run(path, async () => {
      const existing = await this.load(kind);
      if (existing === undefined) {
        await atomicWriteText(path, fullMarkdown);
        return { changed: true };
      }
      const result = replaceGeneratedBlocks(existing, blocks);
      if (!result.changed) {
        return { changed: false };
      }
      await atomicWriteText(path, result.content);
      return { changed: true };
    });
  }
}
