import * as vscode from 'vscode';
import type { DeckService } from '../../application/services/deck-service';
import type { SpreadDefinition, SpreadState } from '../../domain/narrative/spread';

/** Leitura mínima da seleção necessária para as contagens das views. */
export interface SelectionCountsReader {
  getSelection(): Promise<{
    readonly selectedCardIds: readonly string[];
    readonly favoriteCardIds: readonly string[];
  }>;
}

/** Leitura mínima das tiragens necessária para a view lateral. */
export interface SpreadCountsReader {
  listSpreads(): Promise<readonly SpreadDefinition[]>;
  loadState(spreadId: string): Promise<SpreadState | undefined>;
}

/** Leitura mínima do perfil de gênero necessária para a view lateral. */
export interface GenreStatusReader {
  getProfile(): Promise<{
    readonly dominantGenreId: string;
    readonly secondaryGenreIds: readonly string[];
    readonly subGenresByGenre: Readonly<Record<string, readonly string[]>>;
    readonly contract: {
      readonly promise: string;
      readonly engine: string;
      readonly conventions: string;
      readonly freedom: string;
      readonly reward: string;
    };
  }>;
}

export class TreeEntry extends vscode.TreeItem {
  constructor(
    label: string,
    public readonly children: TreeEntry[] = [],
    options: { description?: string; icon?: string; commandId?: string; tooltip?: string } = {},
  ) {
    super(label, children.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
    this.description = options.description;
    this.tooltip = options.tooltip ?? label;
    if (options.icon) {
      this.iconPath = new vscode.ThemeIcon(options.icon);
    }
    if (options.commandId) {
      this.command = { command: options.commandId, title: label };
    }
  }
}

const OPEN = 'storyDeck.openDeckStudio';

const SPREAD_STATUS_LABEL: Readonly<Record<SpreadState['status'], string>> = {
  idle: 'não iniciada',
  'in-progress': 'em andamento',
  complete: 'completa',
};

export class StoryDeckTreeProvider implements vscode.TreeDataProvider<TreeEntry> {
  private readonly emitter = new vscode.EventEmitter<TreeEntry | undefined>();
  readonly onDidChangeTreeData = this.emitter.event;

  constructor(
    private readonly viewId: string,
    private readonly deckService: DeckService,
    private readonly selection?: SelectionCountsReader,
    private readonly spreads?: SpreadCountsReader,
    private readonly genres?: GenreStatusReader,
  ) {}

  refresh(): void {
    this.emitter.fire(undefined);
  }

  getTreeItem(element: TreeEntry): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TreeEntry): Promise<TreeEntry[]> {
    if (element) {
      return element.children;
    }

    switch (this.viewId) {
      case 'storyDeck.dashboard':
        return [
          new TreeEntry('Projetos', [], { icon: 'folder', description: 'workspace local' }),
          new TreeEntry('Progresso narrativo', [], { icon: 'graph' }),
          new TreeEntry('Últimas atividades', [], { icon: 'history' }),
          new TreeEntry('Acesso rápido', [], { icon: 'rocket', commandId: OPEN }),
        ];

      case 'storyDeck.deckStudio':
        return this.deckStudioChildren();

      case 'storyDeck.genreBuilder':
        return this.genreBuilderChildren();

      case 'storyDeck.storyBuilder':
        return [
          new TreeEntry('Premissa', [], { icon: 'lightbulb' }),
          new TreeEntry('Story Bible', [], { icon: 'book' }),
          new TreeEntry('Personagens', [], { icon: 'person' }),
          new TreeEntry('Conflitos', [], { icon: 'swords' }),
          new TreeEntry('World Building', [], { icon: 'globe' }),
          new TreeEntry('Estrutura', [], { icon: 'outline' }),
          new TreeEntry('Capítulos', [], { icon: 'list-ordered' }),
          new TreeEntry('Cenas', [], { icon: 'film' }),
        ];

      case 'storyDeck.aiAssistant':
        return [
          new TreeEntry('Consultoria narrativa', [], { icon: 'comment-discussion' }),
          new TreeEntry('Geração de ideias', [], { icon: 'sparkle' }),
          new TreeEntry('Planejamento', [], { icon: 'map' }),
          new TreeEntry('Revisão', [], { icon: 'search' }),
        ];

      default:
        return [];
    }
  }

  /** Perfil real do Genre Builder; falha de leitura nunca derruba a view. */
  private async genreBuilderChildren(): Promise<TreeEntry[]> {
    const OPEN_GENRE = 'storyDeck.openGenreBuilder';
    try {
      const profile = await this.genres?.getProfile();
      const deck = await this.deckService.getDeck();
      const labelOf = (id: string): string => {
        const card = deck.index.getById(id);
        return card ? `[${card.id}] ${card.title}` : id;
      };
      const subGenreCount = Object.values(profile?.subGenresByGenre ?? {}).reduce(
        (total, names) => total + names.length,
        0,
      );
      const answered = profile
        ? Object.values(profile.contract).filter((value) => value.trim().length > 0).length
        : 0;

      return [
        new TreeEntry('Gênero dominante', [], {
          icon: 'crown',
          description: profile?.dominantGenreId ? labelOf(profile.dominantGenreId) : 'não definido',
          commandId: OPEN_GENRE,
        }),
        new TreeEntry('Gêneros secundários', [], {
          icon: 'layers',
          description: String(profile?.secondaryGenreIds.length ?? 0),
          commandId: OPEN_GENRE,
        }),
        new TreeEntry('Subgêneros', [], {
          icon: 'telescope',
          description: String(subGenreCount),
          commandId: OPEN_GENRE,
        }),
        new TreeEntry('Contrato de gênero', [], {
          icon: 'file-text',
          description: `${answered}/5 respondidas`,
          commandId: OPEN_GENRE,
        }),
      ];
    } catch {
      return [new TreeEntry('Gênero dominante', [], { icon: 'crown', commandId: OPEN_GENRE })];
    }
  }

  /** Contagens reais vêm dos serviços; falha de leitura nunca derruba a view. */
  private async deckStudioChildren(): Promise<TreeEntry[]> {
    const categories = await this.deckService.getCategories();
    const totalCards = categories.reduce((total, category) => total + category.cardCount, 0);

    let selectedCount = 0;
    let favoriteCount = 0;
    try {
      const selection = await this.selection?.getSelection();
      selectedCount = selection?.selectedCardIds.length ?? 0;
      favoriteCount = selection?.favoriteCardIds.length ?? 0;
    } catch {
      selectedCount = 0;
      favoriteCount = 0;
    }

    let spreadEntries: TreeEntry[] = [];
    try {
      const spreads = (await this.spreads?.listSpreads()) ?? [];
      spreadEntries = await Promise.all(
        spreads.map(async (spread) => {
          const state = await this.spreads?.loadState(spread.id);
          const filled = state ? Object.values(state.slotCardIds).flat().length : 0;
          const expected = spread.slots.reduce((total, slot) => total + slot.count, 0);
          return new TreeEntry(spread.name, [], {
            description: `${filled}/${expected} · ${SPREAD_STATUS_LABEL[state?.status ?? 'idle']}`,
            icon: state?.status === 'complete' ? 'pass-filled' : 'circle-outline',
            tooltip: `${spread.purpose}\n${spread.drawText}`,
            commandId: OPEN,
          });
        }),
      );
    } catch {
      spreadEntries = [];
    }

    return [
      new TreeEntry('Todas as cartas', [], {
        icon: 'layers',
        description: String(totalCards),
        commandId: OPEN,
      }),
      new TreeEntry('Selecionadas', [], {
        icon: 'checklist',
        description: String(selectedCount),
        commandId: OPEN,
      }),
      new TreeEntry('Favoritos', [], {
        icon: 'star',
        description: String(favoriteCount),
        commandId: OPEN,
      }),
      new TreeEntry('Tiragens', spreadEntries, {
        icon: 'layout',
        description: String(spreadEntries.length),
        tooltip: 'Tiragens do ENTRELINHAS v4',
        commandId: OPEN,
      }),
      ...categories.map(
        (category) =>
          new TreeEntry(category.name, [], {
            description: String(category.cardCount),
            icon: 'symbol-color',
            tooltip: category.description,
            commandId: OPEN,
          }),
      ),
    ];
  }

  dispose(): void {
    this.emitter.dispose();
  }
}
