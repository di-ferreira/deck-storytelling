import * as vscode from 'vscode';
import { existsSync, readFileSync } from 'node:fs';
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
  ];
  for (const command of expected) {
    if (!commands.includes(command)) {
      fail(`Comando não registrado: ${command}`);
    }
  }

  for (const viewId of ['storyDeck.dashboard', 'storyDeck.deckStudio', 'storyDeck.genreBuilder', 'storyDeck.storyBuilder', 'storyDeck.aiAssistant']) {
    const view = vscode.window.createTreeView(viewId, { treeDataProvider: { getTreeItem: (item) => item, getChildren: () => [] } });
    view.dispose();
  }

  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) {
    fail('O workspace de teste não foi aberto; a verificação de persistência não pode rodar.');
  }

  // Estrutura do projeto (nunca sobrescreve arquivos existentes).
  await vscode.commands.executeCommand('storyDeck.newProject');
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
}
