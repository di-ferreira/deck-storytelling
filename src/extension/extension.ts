import * as vscode from 'vscode';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DeckService } from '../application/services/deck-service';
import { SelectionService } from '../application/services/selection-service';
import { SpreadEngine } from '../application/services/spread-engine';
import { GenreService } from '../application/services/genre-service';
import { StoryService } from '../application/services/story-service';
import { StoryMigration } from '../application/services/story-migration';
import { SelectionLinkQuery } from '../application/services/selection-link-query';
import { JsonDeckLoader } from '../infrastructure/deck/json-deck-loader';
import { VsCodeOutputLogger } from '../infrastructure/logging/vscode-logger';
import { VsCodeNovelAssistantAdapter } from '../infrastructure/integrations/vscode-novel-assistant-adapter';
import { JsonOperationLog } from '../infrastructure/persistence/json-operation-log';
import { JsonProjectRepository } from '../infrastructure/persistence/json-project-repository';
import { JsonSelectionRepository } from '../infrastructure/persistence/json-selection-repository';
import { JsonStoryStateRepository } from '../infrastructure/persistence/json-story-state-repository';
import { MathRandomGenerator } from '../infrastructure/random/math-random-generator';
import { JsonSpreadCatalog } from '../infrastructure/spread/json-spread-catalog';
import { GenreContractDocumentStore } from '../infrastructure/markdown/genre-contract-document-store';
import { FsStoryDocumentStore } from '../infrastructure/markdown/fs-story-document-store';
import { StoryDeckTreeProvider } from './providers/story-deck-tree-provider';
import { DeckStudioPanel } from './views/deck-studio-panel';
import { GenreBuilderPanel } from './views/genre-builder-panel';
import { StoryBuilderPanel } from './views/story-builder-panel';

const VIEW_IDS = [
  'storyDeck.dashboard',
  'storyDeck.deckStudio',
  'storyDeck.genreBuilder',
  'storyDeck.storyBuilder',
  'storyDeck.aiAssistant',
];

const TEMP_PROJECT_DIR = 'story-deck';

function errorText(error: unknown): string {
  return error instanceof Error && error.message.trim().length > 0
    ? error.message
    : 'Erro desconhecido.';
}

async function guarded(failurePrefix: string, action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (error) {
    void vscode.window.showErrorMessage(`Story Deck: ${failurePrefix} ${errorText(error)}`);
  }
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  try {
    await bootstrap(context);
  } catch (error) {
    // A ativação nunca deve falhar: sem estado, o usuário ainda vê diagnóstico.
    void vscode.window.showErrorMessage(`Story Deck: falha ao ativar a extensão. ${errorText(error)}`);
    throw error;
  }
}

async function bootstrap(context: vscode.ExtensionContext): Promise<void> {
  const logger = new VsCodeOutputLogger();
  context.subscriptions.push(logger);

  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  const deckPath = join(context.extensionPath, 'resources', 'decks', 'entrelinhas-storytelling-v4.json');
  const loader = new JsonDeckLoader(deckPath);

  let deck;
  try {
    deck = await loader.load();
  } catch (error) {
    logger.error(`Falha ao carregar o deck: ${errorText(error)}`);
    void vscode.window.showErrorMessage(`Story Deck: não foi possível carregar o ENTRELINHAS v4. ${errorText(error)}`);
    return;
  }

  logger.info(`Deck ${deck.meta.title} v${deck.meta.version} carregado: ${deck.cards.length} cartas, ${deck.categories.length} categorias.`);

  const validateOnStartup = vscode.workspace.getConfiguration('storyDeck').get<boolean>('deck.validateOnStartup', true);
  if (validateOnStartup) {
    for (const item of deck.findings) {
      logger[item.severity === 'error' ? 'error' : item.severity === 'warning' ? 'warn' : 'info'](
        `[${item.code}] ${item.message}`,
      );
    }
    const errors = deck.findings.filter((item) => item.severity === 'error').length;
    if (errors > 0) {
      void vscode.window.showWarningMessage(`Story Deck: ${errors} problema(s) de integridade no deck. Veja o canal de saída.`);
    }
  }

  const integration = new VsCodeNovelAssistantAdapter();
  const assistant = integration.detectNovelAssistant();
  logger.info(
    assistant.installed
      ? `Novel Assistant detectado: v${assistant.version ?? 'desconhecida'}, ${assistant.commands.length} comandos públicos.`
      : 'Novel Assistant não detectado — modo independente.',
  );

  const deckService = new DeckService(loader, integration);
  const projectRepository = new JsonProjectRepository(workspaceRoot, deck.meta.version);

  let storedProjectId: string | undefined;
  try {
    storedProjectId = (await projectRepository.load())?.project.id;
  } catch (error) {
    logger.warn(`project.json ilegível; será usado um identificador derivado da sessão. ${errorText(error)}`);
  }
  const projectId = storedProjectId ?? randomUUID();
  logger.info(
    workspaceRoot
      ? `Projeto ${projectId} em ${join(workspaceRoot, '.storydeck')}.`
      : `Sem workspace aberto: seleção e tiragens em memória temporária (${join(tmpdir(), TEMP_PROJECT_DIR, projectId)}).`,
  );

  // Sem workspace, o estado vive em diretório temporário do SO em vez de falhar na ativação.
  const tempFile = (name: string): string =>
    join(tmpdir(), TEMP_PROJECT_DIR, projectId, '.storydeck', name);

  const selectionRepository = new JsonSelectionRepository(
    workspaceRoot ? { projectId, projectRoot: workspaceRoot } : { projectId, filePath: tempFile('deck-selection.json') },
  );
  const operationLog = new JsonOperationLog(
    workspaceRoot ? { projectRoot: workspaceRoot } : { filePath: tempFile('decisions.json') },
  );
  const storyStateRepository = new JsonStoryStateRepository(
    workspaceRoot ? { projectRoot: workspaceRoot } : { filePath: tempFile('story-state.json') },
  );
  const spreadCatalog = new JsonSpreadCatalog({
    resourcePath: join(context.extensionPath, 'resources', 'spreads', 'entrelinhas-v4-spreads.json'),
    customPath: workspaceRoot ? join(workspaceRoot, '.storydeck', 'spreads', 'custom.json') : undefined,
  });
  const random = new MathRandomGenerator();

  const selectionService = new SelectionService({
    deck: loader,
    repository: selectionRepository,
    log: operationLog,
    random,
  });
  const spreadEngine = new SpreadEngine({
    spreads: spreadCatalog,
    deck: loader,
    selection: selectionService,
    storyState: storyStateRepository,
    random,
  });
  const storyService = new StoryService({
    repository: projectRepository,
    log: operationLog,
    links: new SelectionLinkQuery(selectionRepository),
    deck: loader,
    projectId,
  });

  // Migração lazy v1 → v2: importa o gênero da Fase 4 e preserva tiragens/outras etapas.
  const migration = new StoryMigration({
    projectRepository,
    storyState: storyStateRepository,
    log: operationLog,
  });
  try {
    const result = await migration.migrate();
    if (result.changed) {
      logger.info(`Projeto migrado para schema v2 (revisão ${result.revision}).`);
    }
  } catch (error) {
    logger.warn(`A migração v1→v2 não foi concluída: ${errorText(error)}`);
  }

  const genreService = new GenreService({ deck: loader, storyState: storyStateRepository, story: storyService });
  const genreDocuments = new GenreContractDocumentStore(
    workspaceRoot
      ? { projectRoot: workspaceRoot, deck: loader }
      : { filePath: join(tmpdir(), TEMP_PROJECT_DIR, projectId, 'Story', 'genre-contract.md'), deck: loader },
  );
  const genrePanel = new GenreBuilderPanel(context, deckService, genreService, genreDocuments, logger);
  const storyDocuments = new FsStoryDocumentStore(
    workspaceRoot
      ? { projectRoot: workspaceRoot }
      : { directory: join(tmpdir(), TEMP_PROJECT_DIR, projectId, 'Story') },
  );
  const storyPanel = new StoryBuilderPanel(
    context,
    deckService,
    selectionService,
    storyService,
    storyDocuments,
    logger,
  );

  const panel = new DeckStudioPanel(
    context,
    deckService,
    selectionService,
    spreadEngine,
    () => projectRepository.getWorkspaceRoot(),
    logger,
  );

  const treeProviders: StoryDeckTreeProvider[] = [];
  for (const viewId of VIEW_IDS) {
    const provider = new StoryDeckTreeProvider(viewId, deckService, selectionService, spreadEngine, genreService, storyService);
    treeProviders.push(provider);
    context.subscriptions.push(vscode.window.registerTreeDataProvider(viewId, provider));
    context.subscriptions.push(provider);
  }

  const refreshViews = (): void => {
    for (const provider of treeProviders) {
      provider.refresh();
    }
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('storyDeck.openDeckStudio', () => {
      panel.show();
      refreshViews();
    }),
    vscode.commands.registerCommand('storyDeck.openGenreBuilder', async () => {
      genrePanel.show();
      refreshViews();
      await genrePanel.refresh();
    }),
    vscode.commands.registerCommand('storyDeck.openStoryBuilder', async () => {
      storyPanel.show();
      refreshViews();
      await storyPanel.refresh();
    }),
    vscode.commands.registerCommand('storyDeck.regenerateStoryBible', async () => {
      await guarded('não foi possível atualizar a Story Bible.', async () => {
        await storyPanel.regenerate('story-bible');
        refreshViews();
      });
    }),
    vscode.commands.registerCommand('storyDeck.setDominantGenre', async () => {
      await guarded('não foi possível definir o gênero dominante.', async () => {
        await genrePanel.chooseDominant();
        refreshViews();
      });
    }),
    vscode.commands.registerCommand('storyDeck.regenerateGenreContract', async () => {
      await guarded('não foi possível atualizar o contrato de gênero.', async () => {
        await genrePanel.regenerateContract();
        await genrePanel.refresh();
        refreshViews();
      });
    }),
    vscode.commands.registerCommand('storyDeck.drawCard', async () => {
      await guarded('não foi possível sortear a carta.', async () => {
        const drawnCardIds = await panel.drawCards(1);
        refreshViews();
        if (drawnCardIds.length === 0) {
          void vscode.window.showInformationMessage('Story Deck: nenhuma carta disponível para sorteio.');
          return;
        }
        const titles = drawnCardIds.map((cardId) => {
          const card = deck.index.getById(cardId);
          return card ? `[${card.id}] ${card.title}` : `[${cardId}]`;
        });
        void vscode.window.showInformationMessage(`Story Deck — carta sorteada: ${titles.join(' · ')}`);
      });
    }),
    vscode.commands.registerCommand('storyDeck.shuffleSelection', async () => {
      await guarded('não foi possível embaralhar a seleção.', async () => {
        await panel.shuffleSelection();
        refreshViews();
      });
    }),
    vscode.commands.registerCommand('storyDeck.saveVersion', async () => {
      await guarded('não foi possível salvar a versão.', async () => {
        const selection = await selectionService.getSelection();
        const label = await vscode.window.showInputBox({
          title: 'Salvar versão da seleção',
          prompt: 'Um nome curto para reconhecer esta versão do conjunto de cartas.',
          value: `Versão ${selection.versions.length + 1}`,
          validateInput: (value) => (value.trim().length === 0 ? 'Informe um nome para a versão.' : undefined),
        });
        if (label === undefined || label.trim().length === 0) {
          return;
        }
        await panel.saveVersion(label.trim());
        refreshViews();
        void vscode.window.showInformationMessage(`Story Deck: versão "${label.trim()}" salva.`);
      });
    }),
    vscode.commands.registerCommand('storyDeck.restoreVersion', async () => {
      await guarded('não foi possível restaurar a versão.', async () => {
        const selection = await selectionService.getSelection();
        if (selection.versions.length === 0) {
          void vscode.window.showInformationMessage('Story Deck: nenhuma versão salva ainda.');
          return;
        }
        const picked = await vscode.window.showQuickPick(
          [...selection.versions].reverse().map((version) => ({
            label: version.label,
            description: `${version.cardIds.length} carta(s) · ${version.createdAt}`,
            versionId: version.id,
          })),
          { title: 'Restaurar versão da seleção', placeHolder: 'Escolha a versão a restaurar' },
        );
        if (!picked) {
          return;
        }
        await panel.restoreVersion(picked.versionId);
        refreshViews();
      });
    }),
    vscode.commands.registerCommand('storyDeck.openSpread', async () => {
      await guarded('não foi possível abrir a tiragem.', async () => {
        let spreads;
        try {
          spreads = await spreadEngine.listSpreads();
        } catch (error) {
          throw new Error(`as tiragens não puderam ser lidas (${errorText(error)}).`);
        }
        const picked = await vscode.window.showQuickPick(
          spreads.map((spread) => ({
            label: spread.name,
            description: spread.drawText,
            detail: spread.purpose,
            spreadId: spread.id,
          })),
          { title: 'Abrir tiragem', placeHolder: 'Escolha a tiragem do ENTRELINHAS v4' },
        );
        if (!picked) {
          return;
        }
        await panel.openSpread(picked.spreadId);
        refreshViews();
      });
    }),
    vscode.commands.registerCommand('storyDeck.showDiagnostics', async () => {
      logger.show();
      for (const item of deck.findings) {
        logger.info(`[${item.severity.toUpperCase()}] ${item.code}: ${item.message}`);
      }
    }),
    vscode.commands.registerCommand('storyDeck.refresh', async () => {
      refreshViews();
      await panel.refresh();
      await genrePanel.refresh();
      await storyPanel.refresh();
    }),
    vscode.commands.registerCommand('storyDeck.newProject', async () => {
      try {
        const result = await projectRepository.ensureStructure();
        const count = result.createdFiles.length;
        void vscode.window.showInformationMessage(
          count > 0
            ? `Projeto Story Deck pronto. ${count} arquivo(s) criado(s), nenhum existente foi alterado.`
            : 'O projeto Story Deck já existe e permaneceu intacto.',
        );
        logger.info(`Estrutura do projeto verificada. Criados: ${result.createdFiles.join(', ') || 'nenhum'}.`);
      } catch (error) {
        void vscode.window.showErrorMessage(`Story Deck: ${errorText(error)}`);
      }
    }),
  );

  context.subscriptions.push(
    projectRepository.watch(() => {
      logger.info('Alteração externa detectada em .storydeck/project.json; recarregando visualizações.');
      refreshViews();
      void panel.refresh();
    }),
  );

  logger.info('Story Deck ativado. Use a Activity Bar ou o comando "Abrir Deck Studio".');
}

export function deactivate(): void {
  // Recursos são liberados via context.subscriptions.
}
