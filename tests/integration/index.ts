import * as vscode from 'vscode';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function readJson(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
}

function fail(message: string): never {
  throw new Error(message);
}

/** Runner mínimo executado dentro do Extension Development Host. */
export async function run(): Promise<void> {
  const extension = vscode.extensions.getExtension('story-deck.story-deck');
  if (!extension) {
    fail('Story Deck não foi descoberto como extensão instalada.');
  }

  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) {
    fail('O workspace de teste não foi aberto; a verificação de persistência não pode rodar.');
  }

  // Semente: um projeto v2 com cena para exercitar abertura/brief sem depender da UI.
  const storydeckDir = join(workspaceRoot, '.storydeck');
  mkdirSync(storydeckDir, { recursive: true });
  writeFileSync(
    join(storydeckDir, 'project.json'),
    JSON.stringify(
      {
        schemaVersion: 2,
        deckVersion: '4.0.0',
        revision: 0,
        project: {
          id: 'projeto-integracao',
          createdAt: '2026-11-16T00:00:00.000Z',
          updatedAt: '2026-11-16T00:00:00.000Z',
          acts: [{ id: 'ato-integracao', title: 'Ato I' }],
          chapters: [{ id: 'cap-integracao', actId: 'ato-integracao', title: 'Capítulo de Teste' }],
          scenes: [
            {
              id: 'cen-integracao',
              chapterId: 'cap-integracao',
              title: 'Cena da Integração',
              goal: 'Verificar a abertura',
              conflict: 'Arquivo ausente',
              stateChange: 'Arquivo criado',
              hook: 'Continua',
              sourceCardIds: [],
            },
          ],
        },
      },
      null,
      2,
    ),
  );

  // Sentinel privado do Novel Assistant: nada do Story Deck pode alterá-lo.
  const naDir = join(workspaceRoot, '.novel-assistant');
  mkdirSync(naDir, { recursive: true });
  const statsFile = join(naDir, 'stats.json');
  const statsSentinel = JSON.stringify({ goals: { dailyWordGoal: 9999 }, projectStartDate: '2026-11-16' });
  writeFileSync(statsFile, statsSentinel);

  await extension.activate();
  if (!extension.isActive) {
    fail('A extensão não ativou.');
  }

  const commands = await vscode.commands.getCommands(true);
  const expected = [
    'storyDeck.openDeckStudio',
    'storyDeck.refresh',
    'storyDeck.showDiagnostics',
    'storyDeck.newProject',
    'storyDeck.drawCard',
    'storyDeck.shuffleSelection',
    'storyDeck.saveVersion',
    'storyDeck.restoreVersion',
    'storyDeck.openSpread',
    'storyDeck.openGenreBuilder',
    'storyDeck.setDominantGenre',
    'storyDeck.regenerateGenreContract',
    'storyDeck.openStoryBuilder',
    'storyDeck.regenerateStoryBible',
    'storyDeck.checkNovelAssistant',
    'storyDeck.openSceneInManuscript',
    'storyDeck.showSceneBrief',
  ];
  for (const command of expected) {
    if (!commands.includes(command)) {
      fail(`Comando não registrado: ${command}`);
    }
  }

  // V6 — ausência de colisão de namespaces/IDs lendo os contributes do próprio pacote.
  const manifest = readJson(join(extension.extensionPath, 'package.json')) as {
    contributes?: {
      commands?: Array<{ command?: string }>;
      viewsContainers?: { activitybar?: Array<{ id?: string }> };
    };
  };
  const contributed = (manifest.contributes?.commands ?? [])
    .map((entry) => entry.command)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
  for (const id of contributed) {
    if (!id.startsWith('storyDeck.')) {
      fail(`Comando fora do namespace storyDeck.*: ${id}`);
    }
  }
  if (new Set(contributed).size !== contributed.length) {
    fail('O manifesto declara IDs de comando duplicados.');
  }
  const knownNovelAssistantCommands = [
    'novel-assistant.newProject',
    'novel-assistant.newScene',
    'novel-assistant.newChapter',
    'novel-assistant.newCharacter',
  ];
  for (const id of knownNovelAssistantCommands) {
    if (contributed.includes(id)) {
      fail(`Colisão de ID de comando com o Novel Assistant: ${id}`);
    }
  }
  const activityBarIds = (manifest.contributes?.viewsContainers?.activitybar ?? [])
    .map((entry) => entry.id)
    .filter((id): id is string => typeof id === 'string');
  if (activityBarIds.includes('novel-assistant-sidebar')) {
    fail('Colisão de Activity Bar com o Novel Assistant.');
  }

  for (const viewId of ['storyDeck.dashboard', 'storyDeck.deckStudio', 'storyDeck.genreBuilder', 'storyDeck.storyBuilder', 'storyDeck.aiAssistant']) {
    const view = vscode.window.createTreeView(viewId, { treeDataProvider: { getTreeItem: (item) => item, getChildren: () => [] } });
    view.dispose();
  }

  // Fluxo B (sem NA neste host): cria .storydeck/, Story/ e os 6 diretórios compatíveis.
  await vscode.commands.executeCommand('storyDeck.newProject', false);
  const projectFile = join(workspaceRoot, '.storydeck', 'project.json');
  if (!existsSync(projectFile)) {
    fail('project.json não foi criado pelo comando storyDeck.newProject.');
  }

  const contractFile = join(workspaceRoot, 'Story', 'genre-contract.md');
  if (!existsSync(contractFile)) {
    fail('Story/genre-contract.md não foi criado pelo comando storyDeck.newProject.');
  }
  for (const doc of ['premise.md', 'story-bible.md', 'outline.md', 'narrative-decisions.md']) {
    if (!existsSync(join(workspaceRoot, 'Story', doc))) {
      fail(`Story/${doc} não foi criado pelo comando storyDeck.newProject.`);
    }
  }
  for (const directory of ['Manuscript', 'Characters', 'Locations', 'Research', 'Timeline', 'Notes']) {
    if (!existsSync(join(workspaceRoot, directory))) {
      fail(`Diretório de compatibilidade ${directory}/ não foi criado no fluxo B.`);
    }
  }

  const settings = readJson(join(workspaceRoot, '.storydeck', 'settings.json')) as Record<string, unknown>;
  if (settings.integrationMode !== 'standalone') {
    fail(`settings.json deveria registrar integrationMode=standalone; encontrado: ${String(settings.integrationMode)}`);
  }

  // A semente não pode ter sido sobrescrita.
  const seeded = readJson(projectFile) as {
    project?: { scenes?: Array<{ id?: string }> };
  };
  if (!seeded.project?.scenes?.some((scene) => scene.id === 'cen-integracao')) {
    fail('storyDeck.newProject sobrescreveu um project.json existente.');
  }

  const projectJson = readJson(projectFile) as { schemaVersion?: unknown };
  if (projectJson.schemaVersion !== 2) {
    fail(`project.json deveria estar no schema v2 após a migração; encontrado: ${String(projectJson.schemaVersion)}`);
  }

  // Smoke test do painel: cria a webview e exercita ready/overview/cards/seleção/tiragens.
  await vscode.commands.executeCommand('storyDeck.openDeckStudio');
  await new Promise((resolve) => setTimeout(resolve, 1500));
  await vscode.commands.executeCommand('storyDeck.refresh');

  // Genre Builder: abre o painel e atualiza o contrato sem sobrescrever edições do autor.
  await vscode.commands.executeCommand('storyDeck.openGenreBuilder');
  await new Promise((resolve) => setTimeout(resolve, 800));
  await vscode.commands.executeCommand('storyDeck.regenerateGenreContract');
  if (!existsSync(contractFile)) {
    fail('O contrato de gênero desapareceu após a regeneração.');
  }

  await vscode.commands.executeCommand('storyDeck.openStoryBuilder');
  await new Promise((resolve) => setTimeout(resolve, 800));
  await vscode.commands.executeCommand('storyDeck.regenerateStoryBible');
  const bibleFile = join(workspaceRoot, 'Story', 'story-bible.md');
  if (!existsSync(bibleFile)) {
    fail('A Story Bible desapareceu após a regeneração.');
  }

  // Comando fino de sorteio: passa pelo painel, SelectionService e persistência real.
  await vscode.commands.executeCommand('storyDeck.drawCard');
  await new Promise((resolve) => setTimeout(resolve, 800));

  const selectionFile = join(workspaceRoot, '.storydeck', 'deck-selection.json');
  if (!existsSync(selectionFile)) {
    fail('deck-selection.json não foi gravado após storyDeck.drawCard.');
  }

  const selection = readJson(selectionFile) as {
    projectId?: unknown;
    selectedCardIds?: unknown;
    revision?: unknown;
  };
  if (!Array.isArray(selection.selectedCardIds) || selection.selectedCardIds.length !== 1) {
    fail(`Esperava 1 carta selecionada; encontrado: ${JSON.stringify(selection.selectedCardIds)}`);
  }
  if (selection.revision !== 1) {
    fail(`Esperava revisão 1 após o primeiro sorteio; encontrado: ${String(selection.revision)}`);
  }
  if (typeof selection.projectId !== 'string' || selection.projectId.length === 0) {
    fail('deck-selection.json não registra o projectId do projeto.');
  }

  const logFile = join(workspaceRoot, '.storydeck', 'decisions.json');
  if (!existsSync(logFile)) {
    fail('decisions.json não recebeu o registro da operação de sorteio.');
  }
  const log = readJson(logFile) as { operations?: Array<{ type?: unknown }> };
  if (!Array.isArray(log.operations) || !log.operations.some((entry) => entry.type === 'draw')) {
    fail('O journal não registra a operação "draw" do sorteio.');
  }

  // Fase 6 — abertura de cena no layout inferido, sem sobrescrever e com brief.
  await vscode.commands.executeCommand('storyDeck.openSceneInManuscript', 'cen-integracao');
  const sceneFile = join(workspaceRoot, 'Manuscript', 'Capítulo de Teste', 'Cena da Integração.md');
  if (!existsSync(sceneFile)) {
    fail('A cena não foi criada em Manuscript/<Capítulo>/<Cena>.md.');
  }
  const sceneMarkdown = readFileSync(sceneFile, 'utf8');
  if (!sceneMarkdown.includes('# Cena da Integração') || !sceneMarkdown.includes('cen-integracao')) {
    fail('O template da cena não traz título e referência ao ID da cena.');
  }
  writeFileSync(sceneFile, '# Edição do autor\n');
  await vscode.commands.executeCommand('storyDeck.openSceneInManuscript', 'cen-integracao');
  if (readFileSync(sceneFile, 'utf8') !== '# Edição do autor\n') {
    fail('A segunda abertura sobrescreveu um arquivo de cena existente.');
  }
  await vscode.commands.executeCommand('storyDeck.showSceneBrief', 'cen-integracao');
  await new Promise((resolve) => setTimeout(resolve, 300));
  await vscode.commands.executeCommand('storyDeck.checkNovelAssistant');

  // V4 automatizado: neste host o NA não está instalado, então exportsApi é falso.
  // A checagem em runtime com a extensão real permanece no checklist manual.
  if (vscode.extensions.getExtension('baryo-dev.novel-assistant')) {
    // Se um dia o host incluir o NA, o comando de diagnóstico ainda deve funcionar.
    await vscode.commands.executeCommand('storyDeck.checkNovelAssistant');
  }

  if (readFileSync(statsFile, 'utf8') !== statsSentinel) {
    fail('.novel-assistant/stats.json foi modificado pelo Story Deck.');
  }
}
