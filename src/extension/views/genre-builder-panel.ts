import * as vscode from 'vscode';
import type { AppLogger } from '../../application/ports/logger';
import type { GenreService } from '../../application/services/genre-service';
import type { GenreDocumentStore } from '../../application/ports/genre-document-store';
import type { DeckService } from '../../application/services/deck-service';
import { genreProfileToJson } from '../../domain/genre/genre-profile';
import type { GenreCardJson } from '../../shared/schemas/deck';
import {
  hostToWebviewMessageSchema,
  webviewToHostMessageSchema,
  type GenreMode,
  type GenrePayload,
  type HostToWebviewMessage,
  type WebviewToHostMessage,
} from '../../shared/messages';
import { getWebviewHtml } from './webview-html';

function describeError(error: unknown): string {
  return error instanceof Error && error.message.trim().length > 0
    ? error.message
    : 'Não foi possível concluir a operação de gênero.';
}

function toContextCard(card: GenreCardJson) {
  return {
    id: card.id,
    title: card.title,
    sourceConcept: card.source_concept,
    genreFamily: card.genre_family,
    genreLevel: card.genre_level,
    readerPromise: card.reader_promise,
    coreConventions: card.core_conventions,
    storyEngine: card.story_engine,
    pitfalls: card.pitfalls,
    compatibleGenres: [...card.compatible_genres],
    subGenres: [...card.sub_genre],
  };
}

/**
 * Ponte do Genre Builder. Nunca guarda perfil próprio: a fonte da verdade é GenreService.
 * Usa o mesmo bundle React da Webview; o modo é selecionado pelo atributo no <body>.
 */
export class GenreBuilderPanel {
  private panel: vscode.WebviewPanel | undefined;
  private mode: GenreMode = 'identity';

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly deckService: DeckService,
    private readonly genreService: GenreService,
    private readonly documents: GenreDocumentStore,
    private readonly logger: AppLogger,
  ) {}

  show(): void {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'storyDeck.genreBuilder',
      'Genre Builder — ENTRELINHAS',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview')],
      },
    );
    this.panel = panel;
    panel.webview.html = getWebviewHtml(panel.webview, this.context.extensionPath, 'genre');

    panel.webview.onDidReceiveMessage(
      (raw: unknown) => void this.handleMessage(raw),
      undefined,
      this.context.subscriptions,
    );
    panel.onDidDispose(
      () => {
        this.panel = undefined;
      },
      undefined,
      this.context.subscriptions,
    );
  }

  async refresh(): Promise<void> {
    if (this.panel) {
      await this.sendSnapshot();
    }
  }

  async chooseDominant(): Promise<void> {
    this.show();
    const deck = await this.deckService.getDeck();
    const picked = await vscode.window.showQuickPick(
      deck.index.getGenreCards().map((card) => ({
        label: card.title,
        description: `[${card.id}] · ${card.genre_family}`,
        detail: card.reader_promise,
        genreId: card.id,
      })),
      { title: 'Gênero dominante', placeHolder: 'Escolha a promessa central da obra' },
    );
    if (picked) {
      await this.genreService.setDominant(picked.genreId);
      await this.sendSnapshot();
    }
  }

  async regenerateContract(): Promise<void> {
    const profile = await this.genreService.getProfile();
    const result = await this.documents.regenerateContract(profile);
    void vscode.window.showInformationMessage(
      result.changed ? 'Story Deck: contrato de gênero atualizado.' : 'Story Deck: contrato já estava atualizado.',
    );
  }

  private post(message: HostToWebviewMessage): void {
    const parsed = hostToWebviewMessageSchema.parse(message);
    void this.panel?.webview.postMessage(parsed);
  }

  private async handleMessage(raw: unknown): Promise<void> {
    const parsed = webviewToHostMessageSchema.safeParse(raw);
    if (!parsed.success) {
      this.logger.warn('Mensagem inválida recebida da webview do Genre Builder; descartada.');
      this.post({ type: 'error', message: 'Mensagem inválida. Nenhuma ação foi executada.' });
      return;
    }
    try {
      await this.dispatch(parsed.data);
    } catch (error) {
      this.logger.error(`Falha no Genre Builder (${parsed.data.type}): ${String(error)}`);
      this.post({ type: 'error', message: describeError(error) });
    }
  }

  private async dispatch(message: WebviewToHostMessage): Promise<void> {
    switch (message.type) {
      case 'ready':
        await this.sendSnapshot();
        return;
      case 'getGenre':
        await this.sendGenre();
        return;
      case 'setMode':
        this.mode = message.mode;
        this.post({ type: 'mode', mode: this.mode });
        return;
      case 'setDominantGenre':
        await this.genreService.setDominant(message.genreId);
        await this.sendSnapshot();
        return;
      case 'addSecondaryGenre':
        await this.genreService.addSecondary(message.genreId);
        await this.sendSnapshot();
        return;
      case 'removeSecondaryGenre':
        await this.genreService.removeSecondary(message.genreId);
        await this.sendSnapshot();
        return;
      case 'setSubGenres': {
        const result = await this.genreService.setSubGenres(message.genreId, message.names);
        if (result.unknown.length > 0) {
          this.post({
            type: 'error',
            message: `Subgêneros sem correspondência no deck: ${result.unknown.join(', ')}. Foram ignorados.`,
          });
        }
        await this.sendSnapshot();
        return;
      }
      case 'setContract':
        await this.genreService.setContract(message.contract);
        await this.sendSnapshot();
        return;
      case 'setDimensions':
        await this.genreService.setDimensions(message.dimensions);
        await this.sendSnapshot();
        return;
      case 'regenerateGenreContract':
        await this.regenerateContract();
        await this.sendSnapshot();
        return;
      default:
        return;
    }
  }

  private async sendSnapshot(): Promise<void> {
    this.post({ type: 'mode', mode: this.mode });
    await this.sendGenre();
  }

  private async sendGenre(): Promise<void> {
    const [profile, context, revision, deck] = await Promise.all([
      this.genreService.getProfile(),
      this.genreService.getContext(),
      this.genreService.getRevision(),
      this.deckService.getDeck(),
    ]);
    const payload: GenrePayload = {
      profile: genreProfileToJson(profile) as GenrePayload['profile'],
      context: {
        dominant: context.dominant ? toContextCard(context.dominant) : null,
        secondaries: context.secondaries.map(toContextCard),
        subGenres: context.subGenres.map((item) => ({
          name: item.name,
          parentGenreId: item.parentGenreId,
          sourceCardId: item.sourceCardId,
          prompt: item.detail.prompt,
          question: item.detail.question,
          suggestedUse: item.detail.suggested_use,
          readerPromise: item.detail.reader_promise,
          coreConventions: item.detail.core_conventions,
          pitfalls: item.detail.pitfalls,
          compatibleGenres: [...item.detail.compatible_genres],
        })),
        contract: { ...context.contract },
        dimensions: { ...context.dimensions },
        warnings: context.warnings.map((warning) => ({
          code: warning.code,
          message: warning.message,
          genreId: warning.genreId,
          subGenreName: warning.subGenreName,
        })),
      },
      revision,
      genreCatalog: deck.index.getGenreCards().map(toContextCard),
      contractLabels: [...deck.usage.genre_contract],
    };
    this.post({ type: 'genre', payload });
  }
}
