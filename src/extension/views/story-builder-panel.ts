import * as vscode from 'vscode';
import type { AppLogger } from '../../application/ports/logger';
import type { DeckService } from '../../application/services/deck-service';
import type { SelectionService } from '../../application/services/selection-service';
import type { StoryService } from '../../application/services/story-service';
import type { StoryDocumentStore } from '../../application/ports/story-document-store';
import { StoryContextBuilder } from '../../application/services/story-context-builder';
import { StoryBibleAssembler } from '../../application/services/story-bible-assembler';
import { PremiseRenderer } from '../../infrastructure/markdown/premise-renderer';
import { StoryBibleRenderer } from '../../infrastructure/markdown/story-bible-renderer';
import { OutlineRenderer } from '../../infrastructure/markdown/outline-renderer';
import { NarrativeDecisionsRenderer } from '../../infrastructure/markdown/narrative-decisions-renderer';
import { StoryError } from '../../domain/story/story-error';
import { RevisionConflictError } from '../../application/ports/selection-repository';
import {
  hostToWebviewMessageSchema,
  webviewToHostMessageSchema,
  type HostToWebviewMessage,
  type StoryAction,
  type StoryDocumentKindMessage,
  type StoryPayload,
  type WebviewToHostMessage,
} from '../../shared/messages';
import { getWebviewHtml } from './webview-html';

function describeError(error: unknown): string {
  if (error instanceof StoryError || error instanceof RevisionConflictError) {
    return error.message;
  }
  return error instanceof Error && error.message.trim().length > 0
    ? error.message
    : 'Não foi possível concluir a operação do Story Builder.';
}

/** Ponte do Story Builder. Todo estado vem de StoryService; nenhum cache paralelo. */
export class StoryBuilderPanel {
  private panel: vscode.WebviewPanel | undefined;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly deckService: DeckService,
    private readonly selectionService: SelectionService,
    private readonly storyService: StoryService,
    private readonly documents: StoryDocumentStore,
    private readonly logger: AppLogger,
  ) {}

  show(): void {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      'storyDeck.storyBuilder',
      'Story Builder — ENTRELINHAS',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview')],
      },
    );
    this.panel = panel;
    panel.webview.html = getWebviewHtml(panel.webview, this.context.extensionPath, 'story');
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

  async regenerate(kind: StoryDocumentKindMessage): Promise<void> {
    await this.regenerateDocument(kind);
    if (this.panel) {
      await this.sendSnapshot();
    }
  }

  private post(message: HostToWebviewMessage): void {
    const parsed = hostToWebviewMessageSchema.parse(message);
    void this.panel?.webview.postMessage(parsed);
  }

  private async handleMessage(raw: unknown): Promise<void> {
    const parsed = webviewToHostMessageSchema.safeParse(raw);
    if (!parsed.success) {
      this.logger.warn('Mensagem inválida recebida da webview do Story Builder; descartada.');
      this.post({ type: 'error', message: 'Mensagem inválida. Nenhuma ação foi executada.' });
      return;
    }
    try {
      await this.dispatch(parsed.data);
    } catch (error) {
      this.logger.error(`Falha no Story Builder (${parsed.data.type}): ${String(error)}`);
      this.post({ type: 'error', message: describeError(error) });
    }
  }

  private async dispatch(message: WebviewToHostMessage): Promise<void> {
    switch (message.type) {
      case 'ready':
      case 'getStory':
        await this.sendSnapshot();
        return;
      case 'storyAction':
        await this.applyAction(message.action);
        await this.sendSnapshot();
        return;
      case 'regenerateStoryDocument':
        await this.regenerateDocument(message.kind);
        await this.sendSnapshot();
        return;
      default:
        return;
    }
  }

  private async applyAction(action: StoryAction): Promise<void> {
    const s = this.storyService;
    switch (action.action) {
      case 'updateIdentity': return void await s.updateIdentity(action.patch);
      case 'updatePremise': return void await s.updatePremise(action.patch as unknown as Parameters<typeof s.updatePremise>[0]);
      case 'setPremiseApproval': return void await s.setPremiseApproval(action.field, action.approval);
      case 'addCharacter': return void await s.addCharacter(action.entity);
      case 'updateCharacter': return void await s.updateCharacter(action.id, action.patch);
      case 'removeCharacter': return void await s.removeCharacter(action.id);
      case 'addRelationship': return void await s.addRelationship(action.entity);
      case 'updateRelationship': return void await s.updateRelationship(action.id, action.patch);
      case 'removeRelationship': return void await s.removeRelationship(action.id);
      case 'addConflict': return void await s.addConflict(action.entity);
      case 'updateConflict': return void await s.updateConflict(action.id, action.patch);
      case 'removeConflict': return void await s.removeConflict(action.id);
      case 'updateWorld': return void await s.updateWorld(action.patch);
      case 'addLocation': return void await s.addLocation(action.entity);
      case 'updateLocation': return void await s.updateLocation(action.id, action.patch);
      case 'removeLocation': return void await s.removeLocation(action.id);
      case 'addSecret': return void await s.addSecret(action.entity);
      case 'updateSecret': return void await s.updateSecret(action.id, action.patch);
      case 'removeSecret': return void await s.removeSecret(action.id);
      case 'setNarrator': return void await s.setNarrator(action.profile);
      case 'addStructure': return void await s.addStructure(action.choice);
      case 'removeStructure': return void await s.removeStructure(action.cardId);
      case 'addAct': return void await s.addAct(action.entity);
      case 'updateAct': return void await s.updateAct(action.id, action.patch);
      case 'removeAct': return void await s.removeAct(action.id);
      case 'reorderActs': return void await s.reorderActs(action.orderedIds);
      case 'addChapter': return void await s.addChapter(action.entity);
      case 'updateChapter': return void await s.updateChapter(action.id, action.patch);
      case 'removeChapter': return void await s.removeChapter(action.id);
      case 'moveChapter': return void await s.moveChapter(action.id, action.actId, action.index);
      case 'reorderChapters': return void await s.reorderChapters(action.actId, action.orderedIds);
      case 'addScene': return void await s.addScene(action.entity);
      case 'updateScene': return void await s.updateScene(action.id, action.patch);
      case 'removeScene': return void await s.removeScene(action.id);
      case 'moveScene': return void await s.moveScene(action.id, action.chapterId, action.index);
      case 'reorderScenes': return void await s.reorderScenes(action.chapterId, action.orderedIds);
      case 'assignTechnique': return void await s.assignTechnique({ cardId: action.cardId, scope: action.scope, intent: action.intent });
      case 'updateTechnique': return void await s.updateTechnique(action.cardId, action.scope, action.patch);
      case 'removeTechnique': return void await s.removeTechnique(action.cardId, action.scope);
      case 'addDecision': return void await s.addDecision(action.entity);
      case 'updateDecision': return void await s.updateDecision(action.id, action.patch);
      case 'removeDecision': return void await s.removeDecision(action.id);
      case 'markBibleDirty': return void await s.markBibleDirty(action.dirty);
    }
  }

  private async buildContext() {
    const [deck, project, selection] = await Promise.all([
      this.deckService.getDeck(),
      this.storyService.getProject(),
      this.selectionService.getSelection(),
    ]);
    return { deck, project, context: new StoryContextBuilder(deck, selection.links).build(project) };
  }

  private async regenerateDocument(kind: StoryDocumentKindMessage): Promise<void> {
    const { deck, project, context } = await this.buildContext();
    const rendered =
      kind === 'premise'
        ? new PremiseRenderer().render(project, context)
        : kind === 'story-bible'
          ? new StoryBibleRenderer().render(new StoryBibleAssembler().build(project, context))
          : kind === 'outline'
            ? new OutlineRenderer().render(project, context)
            : new NarrativeDecisionsRenderer().render(project, context);

    await this.documents.regenerate(kind, rendered.markdown, rendered.blocks);
    if (kind === 'story-bible') {
      await this.storyService.markBibleDirty(false);
    }
    void vscode.window.showInformationMessage(`Story Deck: documento "${kind}" atualizado.`);
    void deck;
  }

  private async sendSnapshot(): Promise<void> {
    const { project, context } = await this.buildContext();
    const payload: StoryPayload = {
      project: project.toJSON() as unknown as StoryPayload['project'],
      warnings: context.warnings.map((warning) => ({
        code: warning.code,
        message: warning.message,
        id: warning.id,
        cardId: warning.cardId,
      })),
      revision: await this.storyService.getRevision(),
    };
    this.post({ type: 'story', payload });
  }
}
