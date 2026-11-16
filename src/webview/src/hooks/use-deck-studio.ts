import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CardSummary,
  OverviewPayload,
  SelectionPayload,
} from '../../../shared/messages';
import type { SpreadDefinition, SpreadState } from '../../../shared/schemas/spread';
import type { CardLinkTargetJson } from '../../../shared/schemas/selection';
import { onHostMessage, postToHost } from '../services/message-client';

export type TabId = 'catalog' | 'selection' | 'favorites' | 'spreads';
export type ViewMode = 'grid' | 'detailed';

export interface DeckStudioState {
  readonly overview?: OverviewPayload;
  readonly cards: readonly CardSummary[];
  readonly cardsById: Readonly<Record<string, CardSummary>>;
  readonly total: number;
  readonly selection?: SelectionPayload;
  readonly spreads: readonly SpreadDefinition[];
  readonly spreadState?: SpreadState;
  readonly drawnCardIds: readonly string[];
  readonly error: string;
}

const FILTER_DEBOUNCE_MS = 180;

/**
 * Estado da webview derivado exclusivamente do host.
 * Nenhuma fonte paralela de seleção: `selection` e `cards` vêm das mensagens.
 */
export function useDeckStudio() {
  const [overview, setOverview] = useState<OverviewPayload | undefined>();
  const [cards, setCards] = useState<readonly CardSummary[]>([]);
  const [cardsById, setCardsById] = useState<Readonly<Record<string, CardSummary>>>({});
  const [total, setTotal] = useState(0);
  const [selection, setSelection] = useState<SelectionPayload | undefined>();
  const [spreads, setSpreads] = useState<readonly SpreadDefinition[]>([]);
  const [spreadState, setSpreadState] = useState<SpreadState | undefined>();
  const [drawnCardIds, setDrawnCardIds] = useState<readonly string[]>([]);
  const [error, setError] = useState('');

  const [tab, setTab] = useState<TabId>('catalog');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [kind, setKind] = useState('');
  const [tag, setTag] = useState('');
  const [detailCardId, setDetailCardId] = useState<string | undefined>();

  const readyRef = useRef(false);

  useEffect(() => {
    return onHostMessage((message) => {
      switch (message.type) {
        case 'overview':
          setOverview(message.payload);
          break;
        case 'cards':
          setCards(message.payload.cards);
          setTotal(message.payload.total);
          setDrawnCardIds(message.payload.drawnCardIds ?? []);
          setCardsById((current) => {
            const next = { ...current };
            for (const card of message.payload.cards) {
              next[card.id] = card;
            }
            return next;
          });
          break;
        case 'selection':
          setSelection(message.payload);
          break;
        case 'selectionChanged':
          // Compatibilidade: o host também reenvia a seleção completa.
          setCards((current) =>
            current.map((card) => (card.id === message.cardId ? { ...card, selected: message.selected } : card)),
          );
          break;
        case 'spreads':
          setSpreads(message.payload.spreads);
          break;
        case 'spreadState':
          setSpreadState(message.payload.state);
          break;
        case 'error':
          setError(message.message);
          break;
      }
    });
  }, []);

  useEffect(() => {
    postToHost({ type: 'ready' });
    readyRef.current = true;
  }, []);

  const viewForTab = useMemo<'catalog' | 'selection' | 'favorites' | undefined>(() => {
    switch (tab) {
      case 'selection':
        return 'selection';
      case 'favorites':
        return 'favorites';
      case 'catalog':
        return 'catalog';
      default:
        return undefined;
    }
  }, [tab]);

  useEffect(() => {
    if (!readyRef.current || viewForTab === undefined) {
      return;
    }
    const timer = setTimeout(() => {
      postToHost({
        type: 'setFilter',
        query,
        categoryId: categoryId || undefined,
        kind: kind || undefined,
        tag: tag || undefined,
        view: viewForTab,
      });
    }, FILTER_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, categoryId, kind, tag, viewForTab]);

  useEffect(() => {
    if (tab === 'spreads') {
      postToHost({ type: 'listSpreads' });
    }
  }, [tab]);

  const clearError = useCallback(() => setError(''), []);

  const state: DeckStudioState = {
    overview,
    cards,
    cardsById,
    total,
    selection,
    spreads,
    spreadState,
    drawnCardIds,
    error,
  };

  const actions = useMemo(
    () => ({
      select: (cardId: string) => postToHost({ type: 'selectCard', cardId }),
      deselect: (cardId: string) => postToHost({ type: 'deselectCard', cardId }),
      toggleFavorite: (cardId: string) => postToHost({ type: 'toggleFavorite', cardId }),
      toggleLock: (cardId: string) => postToHost({ type: 'toggleLock', cardId }),
      draw: (count: number, from: 'catalog' | 'selection') => postToHost({ type: 'drawCards', count, from }),
      shuffle: () => postToHost({ type: 'shuffleSelection' }),
      saveVersion: (label: string) => postToHost({ type: 'saveVersion', label }),
      restoreVersion: (versionId: string) => postToHost({ type: 'restoreVersion', versionId }),
      addLink: (cardId: string, target: CardLinkTargetJson, note?: string) =>
        postToHost({ type: 'addLink', cardId, target, note }),
      removeLink: (cardId: string, target: CardLinkTargetJson) =>
        postToHost({ type: 'removeLink', cardId, target }),
      listSpreads: () => postToHost({ type: 'listSpreads' }),
      startSpread: (spreadId: string) => postToHost({ type: 'startSpread', spreadId }),
      drawSpreadSlot: (spreadId: string, slotId: string) =>
        postToHost({ type: 'drawSpreadSlot', spreadId, slotId }),
      saveSpread: (spreadId: string) => postToHost({ type: 'saveSpread', spreadId }),
    }),
    [],
  );

  return {
    state,
    filters: {
      query,
      setQuery,
      categoryId,
      setCategoryId,
      kind,
      setKind,
      tag,
      setTag,
      tagOptions: collectTags(cardsById),
    },
    ui: {
      tab,
      setTab,
      viewMode,
      setViewMode,
      detailCardId,
      setDetailCardId,
      clearError,
    },
    actions,
  };
}

function collectTags(cardsById: Readonly<Record<string, CardSummary>>): readonly string[] {
  const tags = new Set<string>();
  for (const card of Object.values(cardsById)) {
    for (const value of card.tags ?? []) {
      tags.add(value);
    }
  }
  return [...tags].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
