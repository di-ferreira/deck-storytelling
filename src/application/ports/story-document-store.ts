export type StoryDocumentKind = 'premise' | 'story-bible' | 'outline' | 'narrative-decisions';

/** Estrutura mínima de um bloco gerado (satisfeita por `RenderedBlock` da infraestrutura). */
export interface StoryDocumentBlock {
  readonly key: string;
  readonly markdown: string;
}

/**
 * Porta dos documentos Markdown do Story Builder.
 * `saveIfAbsent` nunca sobrescreve; `regenerate` SÓ é explícito e preserva blocos do
 * autor e texto livre fora dos blocos gerados.
 */
export interface StoryDocumentStore {
  load(kind: StoryDocumentKind): Promise<string | undefined>;
  saveIfAbsent(kind: StoryDocumentKind, markdown: string): Promise<boolean>;
  regenerate(
    kind: StoryDocumentKind,
    fullMarkdown: string,
    blocks: readonly StoryDocumentBlock[],
  ): Promise<{ readonly changed: boolean }>;
}
