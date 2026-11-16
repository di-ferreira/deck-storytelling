import * as vscode from 'vscode';
import type { AppLogger } from '../../application/ports/logger';
import type { DeckService } from '../../application/services/deck-service';
import type { SelectionService } from '../../application/services/selection-service';
import { SpreadError, type SpreadEngine } from '../../application/services/spread-engine';
import { SelectionError } from '../../domain/selection/deck-selection';
import type { SpreadDefinition, SpreadState } from '../../domain/narrative/spread';
import { RevisionConflictError } from '../../application/ports/selection-repository';
import {
  hostToWebviewMessageSchema,
  webviewToHostMessageSchema,
  type CardsPayload,
  type HostToWebviewMessage,
  type OverviewPayload,
  type SelectionPayload,
  type SpreadsPayload,
  type WebviewToHostMessage,
} from '../../shared/messages';
import { filterCards, toCardSummary, type CardView, type CardViewFilter } from './card-summary';
import { getWebviewHtml } from './webview-html';

/** Limite defensivo de cartas por mensagem; o catálogo real tem 210. */
const MAX_CARDS_PER_MESSAGE = 400;

const FRIENDLY_FALLBACK = 'Não foi possível concluir a operação.';

function describeError(error: unknown): string {
  if (error instanceof SelectionError || error instanceof SpreadError) {
    return error.message;
  }
  if (error instanceof RevisionConflictError) {
    return `${error.message} Use "Atualizar" para recarregar o estado.`;
  }
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return FRIENDLY_FALLBACK;
}

/**
 * Ponte entre a Webview do Deck Studio e os serviços de aplicação.
 * Não mantém fonte paralela de seleção: todo estado vem de `SelectionService`/`SpreadEngine`.
 */
export class DeckStudioPanel {
  private panel: vscode.WebviewPanel | undefined;
  private filter: CardViewFilter = { query: '', view: 'catalog' };
  private activeSpread: SpreadState | undefined;
  private lastDrawnCardIds: readonly string[] = [];

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly deckService: DeckService,
    private readonly selectionService: SelectionService,
    private readonly spreadEngine: SpreadEngine,
    private readonly getProjectRoot: () => string | undefined,
    private readonly logger: AppLogger,
  ) {}

  show(): void {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'storyDeck.deckStudio',
      'Deck Studio — ENTRELINHAS',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview')],
      },
    );
    this.panel = panel;
    panel.webview.html = getWebviewHtml(panel.webview, this.context.extensionPath);

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
    if (!this.panel) {
      return;
    }
    await this.sendSnapshot();
  }

  /** Sorteia cartas do catálogo e devolve os IDs sorteados (usado por comandos). */
  async drawCards(count: number): Promise<readonly string[]> {
    this.show();
    const outcome = await this.selectionService.draw({ count, from: 'catalog' });
    this.lastDrawnCardIds = outcome.drawnCardIds;
    await this.broadcastState();
    return outcome.drawnCardIds;
  }

  async shuffleSelection(): Promise<void> {
    this.show();
    await this.selectionService.shuffle();
    this.lastDrawnCardIds = [];
    await this.broadcastState();
  }

  async saveVersion(label: string): Promise<void> {
    this.show();
    await this.selectionService.saveVersion(label);
    await this.broadcastState();
  }

  async restoreVersion(versionId: string): Promise<void> {
    this.show();
    await this.selectionService.restoreVersion(versionId);
    this.lastDrawnCardIds = [];
    await this.broadcastState();
  }

  /** Abre o painel já com a tiragem iniciada (comando `storyDeck.openSpread`). */
  async openSpread(spreadId: string): Promise<SpreadState> {
    this.show();
    const saved = await this.spreadEngine.loadState(spreadId);
    const state = saved && saved.status !== 'idle' ? saved : await this.spreadEngine.start(spreadId);
    this.activeSpread = state;
    this.postSpreads();
    this.postSpreadState();
    return state;
  }

  async listSpreads(): Promise<readonly SpreadDefinition[]> {
    return this.spreadEngine.listSpreads();
  }

  private post(message: HostToWebviewMessage): void {
    const parsed = hostToWebviewMessageSchema.parse(message);
    void this.panel?.webview.postMessage(parsed);
  }

  private async handleMessage(raw: unknown): Promise<void> {
    const parsed = webviewToHostMessageSchema.safeParse(raw);
    if (!parsed.success) {
      this.logger.warn('Mensagem inválida recebida da webview; descartada.');
      this.post({ type: 'error', message: 'Mensagem inválida. Nenhuma ação foi executada.' });
      return;
    }

    try {
      await this.dispatch(parsed.data);
    } catch (error) {
      this.logger.error(`Falha ao processar mensagem da webview (${parsed.data.type}): ${String(error)}`);
      this.post({ type: 'error', message: describeError(error) });
    }
  }

  private async dispatch(message: WebviewToHostMessage): Promise<void> {
    switch (message.type) {
      case 'ready':
        await this.sendSnapshot();
        return;
      case 'requestOverview':
        this.sendOverview();
        return;
      case 'setFilter':
        this.filter = {
          query: message.query ?? '',
          categoryId: message.categoryId || undefined,
          kind: message.kind || undefined,
          tag: message.tag || undefined,
          view: (message.view ?? 'catalog') as CardView,
        };
        this.lastDrawnCardIds = [];
        await this.sendCards();
        return;
      case 'getSelection':
        await this.sendSelection();
        return;
      case 'selectCard':
        await this.selectCard(message.cardId);
        await this.broadcastState();
        return;
      case 'deselectCard':
        await this.deselectCard(message.cardId);
        await this.broadcastState();
        return;
      case 'toggleFavorite':
        await this.selectionService.toggleFavorite(message.cardId);
        await this.broadcastState();
        return;
      case 'toggleLock':
        await this.toggleLock(message.cardId);
        await this.broadcastState();
        return;
      case 'replaceCard':
        await this.selectionService.replace(message.cardId, message.newCardId);
        await this.broadcastState();
        return;
      case 'drawCards': {
        const outcome = await this.selectionService.draw({
          count: message.count,
          from: message.from,
          categoryIds: message.categoryIds,
          kinds: message.kinds,
        });
        this.lastDrawnCardIds = outcome.drawnCardIds;
        await this.broadcastState();
        return;
      }
      case 'shuffleSelection':
        await this.selectionService.shuffle();
        this.lastDrawnCardIds = [];
        await this.broadcastState();
        return;
      case 'saveVersion':
        await this.selectionService.saveVersion(message.label);
        await this.broadcastState();
        return;
      case 'restoreVersion':
        await this.selectionService.restoreVersion(message.versionId);
        this.lastDrawnCardIds = [];
        await this.broadcastState();
        return;
      case 'addLink':
        await this.selectionService.addLink(message.cardId, message.target, message.note);
        await this.broadcastState();
        return;
      case 'removeLink':
        await this.selectionService.removeLink(message.cardId, message.target);
        await this.broadcastState();
        return;
      case 'listSpreads':
        this.postSpreads();
        return;
      case 'startSpread':
        await this.startSpread(message.spreadId);
        return;
      case 'drawSpreadSlot':
        await this.drawSpreadSlot(message.spreadId, message.slotId);
        return;
      case 'saveSpread':
        await this.saveSpread(message.spreadId);
        return;
    }
  }

  private async selectCard(cardId: string): Promise<void> {
    const deck = await this.deckService.getDeck();
    if (!deck.index.getById(cardId)) {
      throw new SelectionError('UNKNOWN_CARD', `A carta ${cardId} não existe no catálogo ativo.`);
    }
    const selection = await this.selectionService.getSelection();
    if (selection.has(cardId)) {
      return;
    }
    await this.selectionService.select(cardId);
  }

  private async deselectCard(cardId: string): Promise<void> {
    const selection = await this.selectionService.getSelection();
    if (!selection.has(cardId)) {
      return;
    }
    await this.selectionService.deselect(cardId);
  }

  private async toggleLock(cardId: string): Promise<void> {
    const selection = await this.selectionService.getSelection();
    if (!selection.has(cardId)) {
      throw new SelectionError(
        'CARD_NOT_SELECTED',
        `Só é possível bloquear cartas selecionadas. Carta: ${cardId}.`,
      );
    }
    await this.selectionService.toggleLock(cardId);
  }

  private async startSpread(spreadId: string): Promise<void> {
    this.activeSpread = await this.spreadEngine.start(spreadId);
    this.postSpreads();
    this.postSpreadState();
  }

  private async drawSpreadSlot(spreadId: string, slotId: string): Promise<void> {
    const state = this.activeSpread?.spreadId === spreadId
      ? this.activeSpread
      : (await this.spreadEngine.loadState(spreadId)) ?? (await this.spreadEngine.start(spreadId));

    const selection = await this.selectionService.getSelection();
    const outcome = await this.spreadEngine.drawSlot(state, slotId, selection);
    this.activeSpread = outcome.state;

    if (outcome.insufficient) {
      this.post({
        type: 'error',
        message:
          `Pool insuficiente no slot "${outcome.insufficient.slotId}": ` +
          `${outcome.insufficient.available} carta(s) disponível(is), ${outcome.insufficient.requested} necessária(s). ` +
          'Selecione mais cartas ou libere cartas bloqueadas.',
      });
    }

    this.postSpreadState();
  }

  private async saveSpread(spreadId: string): Promise<void> {
    const state = this.activeSpread?.spreadId === spreadId ? this.activeSpread : await this.spreadEngine.loadState(spreadId);
    if (!state) {
      throw new SpreadError('UNKNOWN_SPREAD', `A tiragem ${spreadId} ainda não foi iniciada.`);
    }
    this.activeSpread = await this.spreadEngine.save(state);
    this.postSpreadState();
  }

  private async sendSnapshot(): Promise<void> {
    this.sendOverview();
    await this.sendCards();
    await this.sendSelection();
    this.postSpreads();
    await this.hydrateActiveSpread();
    if (this.activeSpread) {
      this.postSpreadState();
    }
  }

  /** Retoma a última tiragem persistida (nada é sobrescrito: apenas lido). */
  private async hydrateActiveSpread(): Promise<void> {
    if (this.activeSpread) {
      return;
    }
    try {
      const spreads = await this.spreadEngine.listSpreads();
      for (const spread of spreads) {
        const state = await this.spreadEngine.loadState(spread.id);
        if (state && state.status !== 'idle') {
          this.activeSpread = state;
          return;
        }
      }
    } catch (error) {
      this.logger.warn(`Não foi possível retomar tiragens persistidas: ${String(error)}`);
    }
  }

  private async broadcastState(): Promise<void> {
    await this.sendCards();
    await this.sendSelection();
  }

  private async sendCards(): Promise<void> {
    this.post({ type: 'cards', payload: await this.buildCardsPayload() });
  }

  private async sendSelection(): Promise<void> {
    this.post({ type: 'selection', payload: await this.buildSelectionPayload() });
  }

  private postSpreads(): void {
    void this.spreadEngine.listSpreads().then((spreads) => {
      const payload: SpreadsPayload = { spreads: [...spreads] };
      this.post({ type: 'spreads', payload });
    }).catch((error: unknown) => {
      this.logger.error(`Falha ao listar tiragens: ${String(error)}`);
      this.post({ type: 'error', message: 'Não foi possível carregar as tiragens.' });
    });
  }

  private postSpreadState(): void {
    if (!this.activeSpread) {
      return;
    }
    this.post({ type: 'spreadState', payload: { state: this.activeSpread } });
  }

  private sendOverview(): void {
    void this.deckService
      .getOverview(this.getProjectRoot())
      .then((payload: OverviewPayload) => this.post({ type: 'overview', payload }))
      .catch((error: unknown) => {
        this.logger.error(`Falha ao montar o panorama do deck: ${String(error)}`);
        this.post({ type: 'error', message: 'Não foi possível carregar o panorama do deck.' });
      });
  }

  private async buildSelectionPayload(): Promise<SelectionPayload> {
    const selection = await this.selectionService.getSelection();
    return {
      projectId: selection.projectId,
      selectedCardIds: [...selection.selectedCardIds],
      favoriteCardIds: [...selection.favoriteCardIds],
      lockedCardIds: [...selection.lockedCardIds],
      versions: selection.versions.map((version) => ({ ...version, cardIds: [...version.cardIds] })),
      activeVersionId: selection.activeVersionId,
      links: selection.links.map((link) => ({ ...link, target: { ...link.target } })),
      revision: selection.revision,
      updatedAt: selection.updatedAt,
    };
  }

  private async buildCardsPayload(): Promise<CardsPayload> {
    const deck = await this.deckService.getDeck();
    const selection = await this.selectionService.getSelection();
    const categories = new Map(deck.categories.map((category) => [category.id, category]));
    const cards = filterCards(deck, selection, this.filter);

    return {
      cards: cards.slice(0, MAX_CARDS_PER_MESSAGE).map((card) =>
        toCardSummary(card, categories.get(card.category_id), selection),
      ),
      total: cards.length,
      query: this.filter.query,
      categoryId: this.filter.categoryId,
      kind: this.filter.kind,
      tag: this.filter.tag,
      view: this.filter.view,
      drawnCardIds: this.lastDrawnCardIds.length > 0 ? [...this.lastDrawnCardIds] : undefined,
    };
  }
}
