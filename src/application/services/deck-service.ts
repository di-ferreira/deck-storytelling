import type { CardKind } from '../../shared/schemas/deck';
import type { CategoryWithCount, Deck } from '../../domain/deck/deck';
import { countBySeverity } from '../../domain/deck/deck-validation';
import type { DeckRepository } from '../ports/deck-repository';
import type { NovelAssistantStatus } from '../ports/integration-gateway';
import type { OverviewPayload } from '../../shared/messages';

/** Serviço de aplicação: expõe o deck sem nunca alterá-lo. */
export class DeckService {
  private cached: Deck | undefined;

  constructor(
    private readonly repository: DeckRepository,
    private readonly integration: { detectNovelAssistant(): NovelAssistantStatus },
  ) {}

  async getDeck(): Promise<Deck> {
    if (!this.cached) {
      this.cached = await this.repository.load();
    }
    return this.cached;
  }

  async invalidate(): Promise<Deck> {
    this.cached = undefined;
    return this.getDeck();
  }

  async getCategories(): Promise<readonly CategoryWithCount[]> {
    const deck = await this.getDeck();
    return deck.index.categoriesWithCounts(deck.categories);
  }

  async search(query: string, categoryId?: string, kind?: CardKind) {
    const deck = await this.getDeck();
    return deck.index.search(query, categoryId, kind);
  }

  async getOverview(projectRoot: string | undefined): Promise<OverviewPayload> {
    const deck = await this.getDeck();
    const counts = countBySeverity(deck.findings);
    const assistant = this.integration.detectNovelAssistant();
    return {
      deckId: deck.meta.deckId,
      deckVersion: deck.meta.version,
      language: deck.meta.language,
      cardCount: deck.cards.length,
      categoryCount: deck.categories.length,
      categories: deck.index.categoriesWithCounts(deck.categories).map((category) => ({
        id: category.id,
        name: category.name,
        short: category.short,
        color: category.color,
        cardCount: category.cardCount,
      })),
      kinds: { ...deck.index.countsByKind },
      findings: counts,
      novelAssistant: { installed: assistant.installed, version: assistant.version },
      projectRoot: projectRoot ?? null,
    };
  }

  get sourcePath(): string {
    return this.repository.sourcePath;
  }
}
