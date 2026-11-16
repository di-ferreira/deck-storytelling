import type { CardJson, CardKind } from '../../shared/schemas/deck';
import { matchesCardFilter, type CardFilter } from '../deck/card-filter';
import { SelectionError } from './selection-error';

export { SelectionError } from './selection-error';
export type { SelectionErrorCode } from './selection-error';

/**
 * Catálogo mínimo exigido pelo agregado de seleção.
 * `DeckIndex` satisfaz esta porta estruturalmente.
 */
export interface CardCatalog {
  allCards(): readonly CardJson[];
  getById(cardId: string): CardJson | undefined;
}

export interface SelectionVersion {
  readonly id: string;
  readonly createdAt: string;
  readonly label: string;
  readonly cardIds: readonly string[];
}

export type CardLinkTarget =
  | { readonly type: 'project' }
  | { readonly type: 'decision'; readonly decisionId: string }
  | { readonly type: 'genre'; readonly genreId: string }
  | { readonly type: 'character'; readonly characterId: string }
  | { readonly type: 'act'; readonly actId: string }
  | { readonly type: 'chapter'; readonly chapterId: string }
  | { readonly type: 'scene'; readonly sceneId: string };

export type CardLinkTargetType = CardLinkTarget['type'];

export interface CardLink {
  readonly cardId: string;
  readonly target: CardLinkTarget;
  readonly createdAt: string;
  readonly note?: string;
}

export interface DeckSelectionData {
  readonly projectId: string;
  readonly selectedCardIds: readonly string[];
  readonly favoriteCardIds: readonly string[];
  readonly lockedCardIds: readonly string[];
  readonly versions: readonly SelectionVersion[];
  readonly activeVersionId: string;
  readonly links: readonly CardLink[];
  readonly revision: number;
  readonly updatedAt: string;
}

export interface DrawRequest {
  readonly count: number;
  readonly from: 'catalog' | 'selection';
  readonly categoryIds?: readonly string[];
  readonly kinds?: readonly CardKind[];
}

export interface DrawOutcome {
  readonly selection: DeckSelection;
  readonly drawnCardIds: readonly string[];
}

/** Sorteio sem reposição, determinístico para um `random` semeado. */
export function sampleWithoutReplacement<T>(
  items: readonly T[],
  count: number,
  random: () => number,
): readonly T[] {
  const pool = [...items];
  const picked: T[] = [];
  for (let index = 0; index < count && pool.length > 0; index += 1) {
    const raw = random();
    const normalized = Math.min(Math.max(raw, 0), 0.999999999);
    const position = Math.floor(normalized * pool.length);
    picked.push(pool.splice(position, 1)[0]!);
  }
  return picked;
}

function uniqueInOrder(ids: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of ids) {
    if (!seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }
  return result;
}

function normalizeData(data: DeckSelectionData): DeckSelectionData {
  const selectedCardIds = uniqueInOrder(data.selectedCardIds);
  const selected = new Set(selectedCardIds);
  return {
    projectId: data.projectId,
    selectedCardIds,
    favoriteCardIds: uniqueInOrder(data.favoriteCardIds),
    lockedCardIds: uniqueInOrder(data.lockedCardIds).filter((id) => selected.has(id)),
    versions: data.versions.map((version) => ({ ...version, cardIds: uniqueInOrder(version.cardIds) })),
    activeVersionId: data.activeVersionId ?? '',
    links: data.links,
    revision: Number.isInteger(data.revision) && data.revision >= 0 ? data.revision : 0,
    updatedAt: data.updatedAt,
  };
}

/**
 * Agregado imutável da seleção do Deck Studio.
 * Toda operação `with*` devolve uma NOVA instância; a original nunca é mutada.
 */
export class DeckSelection {
  private constructor(private readonly data: DeckSelectionData) {}

  static create(projectId: string, now: string): DeckSelection {
    return new DeckSelection(
      normalizeData({
        projectId,
        selectedCardIds: [],
        favoriteCardIds: [],
        lockedCardIds: [],
        versions: [],
        activeVersionId: '',
        links: [],
        revision: 0,
        updatedAt: now,
      }),
    );
  }

  /** Reconstitui a partir de dados persistidos, saneando duplicatas e invariantes. */
  static fromJSON(data: DeckSelectionData): DeckSelection {
    const normalized = normalizeData({
      ...data,
      projectId: data.projectId ?? '',
      activeVersionId: data.activeVersionId ?? '',
      updatedAt: data.updatedAt ?? '',
    });
    const versionIds = new Set(normalized.versions.map((version) => version.id));
    const activeVersionId = versionIds.has(normalized.activeVersionId) ? normalized.activeVersionId : '';
    return new DeckSelection({ ...normalized, activeVersionId });
  }

  get projectId(): string {
    return this.data.projectId;
  }

  get selectedCardIds(): readonly string[] {
    return this.data.selectedCardIds;
  }

  get favoriteCardIds(): readonly string[] {
    return this.data.favoriteCardIds;
  }

  get lockedCardIds(): readonly string[] {
    return this.data.lockedCardIds;
  }

  get versions(): readonly SelectionVersion[] {
    return this.data.versions;
  }

  get activeVersionId(): string {
    return this.data.activeVersionId;
  }

  get links(): readonly CardLink[] {
    return this.data.links;
  }

  get revision(): number {
    return this.data.revision;
  }

  get updatedAt(): string {
    return this.data.updatedAt;
  }

  has(cardId: string): boolean {
    return this.data.selectedCardIds.includes(cardId);
  }

  isFavorite(cardId: string): boolean {
    return this.data.favoriteCardIds.includes(cardId);
  }

  isLocked(cardId: string): boolean {
    return this.data.lockedCardIds.includes(cardId);
  }

  withProjectId(projectId: string): DeckSelection {
    return this.next({ projectId });
  }

  withSelected(cardId: string, catalog: CardCatalog, now: string): DeckSelection {
    this.assertKnown(cardId, catalog);
    if (this.has(cardId)) {
      throw new SelectionError('CARD_ALREADY_SELECTED', `A carta ${cardId} já está selecionada.`);
    }
    return this.next({ selectedCardIds: [...this.data.selectedCardIds, cardId], activeVersionId: '' }, now);
  }

  withDeselected(cardId: string, now: string): DeckSelection {
    if (!this.has(cardId)) {
      throw new SelectionError('CARD_NOT_SELECTED', `A carta ${cardId} não está selecionada.`);
    }
    return this.next(
      {
        selectedCardIds: this.data.selectedCardIds.filter((id) => id !== cardId),
        lockedCardIds: this.data.lockedCardIds.filter((id) => id !== cardId),
        activeVersionId: '',
      },
      now,
    );
  }

  withToggled(cardId: string, catalog: CardCatalog, now: string): DeckSelection {
    return this.has(cardId) ? this.withDeselected(cardId, now) : this.withSelected(cardId, catalog, now);
  }

  withFavorite(cardId: string, catalog: CardCatalog, now: string): DeckSelection {
    this.assertKnown(cardId, catalog);
    if (this.isFavorite(cardId)) {
      return this;
    }
    return this.next({ favoriteCardIds: [...this.data.favoriteCardIds, cardId] }, now);
  }

  withUnfavorite(cardId: string, now: string): DeckSelection {
    if (!this.isFavorite(cardId)) {
      return this;
    }
    return this.next(
      { favoriteCardIds: this.data.favoriteCardIds.filter((id) => id !== cardId) },
      now,
    );
  }

  withLocked(cardId: string, now: string): DeckSelection {
    if (!this.has(cardId)) {
      throw new SelectionError('CARD_NOT_SELECTED', `Só é possível bloquear cartas selecionadas. Carta: ${cardId}.`);
    }
    if (this.isLocked(cardId)) {
      return this;
    }
    return this.next({ lockedCardIds: [...this.data.lockedCardIds, cardId] }, now);
  }

  withUnlocked(cardId: string, now: string): DeckSelection {
    if (!this.isLocked(cardId)) {
      return this;
    }
    return this.next(
      { lockedCardIds: this.data.lockedCardIds.filter((id) => id !== cardId) },
      now,
    );
  }

  /** Substitui uma carta preservando a posição. Carta bloqueada nunca é substituída. */
  withReplaced(cardId: string, newCardId: string, catalog: CardCatalog, now: string): DeckSelection {
    this.assertKnown(newCardId, catalog);
    if (!this.has(cardId)) {
      throw new SelectionError('CARD_NOT_SELECTED', `A carta ${cardId} não está selecionada.`);
    }
    if (this.isLocked(cardId)) {
      throw new SelectionError('CARD_LOCKED', `A carta ${cardId} está bloqueada e não pode ser substituída.`);
    }
    if (cardId === newCardId || this.has(newCardId)) {
      throw new SelectionError('CARD_ALREADY_SELECTED', `A carta ${newCardId} já está selecionada.`);
    }
    return this.next(
      {
        selectedCardIds: this.data.selectedCardIds.map((id) => (id === cardId ? newCardId : id)),
        activeVersionId: '',
      },
      now,
    );
  }

  /**
   * Sorteia cartas.
   * - `from: 'catalog'`: adiciona cartas do catálogo filtrado à seleção.
   * - `from: 'selection'`: sorteia entre as cartas já selecionadas, sem alterar o conjunto.
   * Cartas bloqueadas nunca são sorteadas e o resultado nunca duplica IDs.
   */
  withDrawn(
    request: DrawRequest,
    catalog: CardCatalog,
    random: () => number,
    now: string,
  ): DrawOutcome {
    if (!Number.isInteger(request.count) || request.count < 1) {
      throw new SelectionError('INVALID_REQUEST', `A quantidade sorteada deve ser um inteiro positivo; recebido ${request.count}.`);
    }

    const filter: CardFilter = { categoryIds: request.categoryIds, kinds: request.kinds };
    const locked = new Set(this.data.lockedCardIds);
    const selected = new Set(this.data.selectedCardIds);

    const base: readonly CardJson[] =
      request.from === 'selection'
        ? this.data.selectedCardIds
            .map((id) => catalog.getById(id))
            .filter((card): card is CardJson => card !== undefined)
        : catalog.allCards();

    const pool = base.filter(
      (card) => matchesCardFilter(card, filter) && !locked.has(card.id) && (request.from === 'selection' || !selected.has(card.id)),
    );

    if (pool.length < request.count) {
      throw new SelectionError(
        'POOL_INSUFFICIENT',
        `Pool insuficiente: solicitadas ${request.count} cartas, disponíveis ${pool.length}.`,
      );
    }

    const drawnCardIds = sampleWithoutReplacement(pool, request.count, random).map((card) => card.id);
    if (request.from === 'selection') {
      return { selection: this, drawnCardIds };
    }

    return {
      selection: this.next(
        { selectedCardIds: [...this.data.selectedCardIds, ...drawnCardIds], activeVersionId: '' },
        now,
      ),
      drawnCardIds,
    };
  }

  /** Permutação da seleção; não adiciona nem remove cartas. */
  withShuffled(random: () => number, now: string): DeckSelection {
    if (this.data.selectedCardIds.length < 2) {
      return this;
    }
    const shuffled = [...this.data.selectedCardIds];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const raw = random();
      const normalized = Math.min(Math.max(raw, 0), 0.999999999);
      const position = Math.floor(normalized * (index + 1));
      const current = shuffled[index]!;
      shuffled[index] = shuffled[position]!;
      shuffled[position] = current;
    }
    return this.next({ selectedCardIds: shuffled, activeVersionId: '' }, now);
  }

  /** Histórico append-only: nunca descarta versões anteriores. */
  withVersionSaved(id: string, label: string, now: string): DeckSelection {
    if (this.data.versions.some((version) => version.id === id)) {
      throw new SelectionError('INVALID_REQUEST', `Já existe uma versão com o identificador ${id}.`);
    }
    const version: SelectionVersion = {
      id,
      createdAt: now,
      label,
      cardIds: [...this.data.selectedCardIds],
    };
    return this.next({ versions: [...this.data.versions, version], activeVersionId: id }, now);
  }

  withVersionRestored(versionId: string, catalog: CardCatalog, now: string): DeckSelection {
    const version = this.data.versions.find((item) => item.id === versionId);
    if (!version) {
      throw new SelectionError('VERSION_NOT_FOUND', `Versão ${versionId} não encontrada no histórico.`);
    }
    const missing = version.cardIds.filter((id) => !catalog.getById(id));
    if (missing.length > 0) {
      throw new SelectionError('UNKNOWN_CARD', `A versão ${versionId} cita cartas ausentes do catálogo ativo: ${missing.join(', ')}.`);
    }
    const selectedCardIds = uniqueInOrder(version.cardIds);
    const selected = new Set(selectedCardIds);
    return this.next(
      {
        selectedCardIds,
        lockedCardIds: this.data.lockedCardIds.filter((id) => selected.has(id)),
        activeVersionId: versionId,
      },
      now,
    );
  }

  withLinks(links: readonly CardLink[], now: string): DeckSelection {
    return this.next({ links }, now);
  }

  toJSON(): DeckSelectionData {
    return {
      projectId: this.data.projectId,
      selectedCardIds: [...this.data.selectedCardIds],
      favoriteCardIds: [...this.data.favoriteCardIds],
      lockedCardIds: [...this.data.lockedCardIds],
      versions: this.data.versions.map((version) => ({ ...version, cardIds: [...version.cardIds] })),
      activeVersionId: this.data.activeVersionId,
      links: this.data.links.map((link) => ({ ...link, target: { ...link.target } })),
      revision: this.data.revision,
      updatedAt: this.data.updatedAt,
    };
  }

  private next(patch: Partial<DeckSelectionData>, now?: string): DeckSelection {
    return new DeckSelection(
      normalizeData({
        ...this.data,
        ...patch,
        revision: this.data.revision + 1,
        updatedAt: now ?? this.data.updatedAt,
      }),
    );
  }

  private assertKnown(cardId: string, catalog: CardCatalog): void {
    if (!catalog.getById(cardId)) {
      throw new SelectionError(
        'UNKNOWN_CARD',
        `A carta ${cardId} não existe no catálogo ativo (IDs históricos não são válidos).`,
      );
    }
  }
}
