import { useMemo } from 'react';
import {
  BookOpen,
  CheckCheck,
  Layers3,
  ShieldCheck,
  Sparkles,
  Star,
  Wand2,
} from 'lucide-react';
import { useDeckStudio, type TabId } from './hooks/use-deck-studio';
import GenreBuilder from './components/GenreBuilder';
import { CardFilters } from './components/CardFilters';
import { CardGrid } from './components/CardGrid';
import { CardDetail } from './components/CardDetail';
import { SelectionToolbar } from './components/SelectionToolbar';
import { SpreadsPanel } from './components/SpreadsPanel';
import type { CardSummary } from '../../shared/messages';
import './styles/tokens.css';
import './styles/app.css';

const TAB_LABELS: Readonly<Record<TabId, string>> = {
  catalog: 'Catálogo',
  selection: 'Selecionadas',
  favorites: 'Favoritos',
  spreads: 'Tiragens',
};

function DeckStudioApp() {
  const { state, filters, ui, actions } = useDeckStudio();
  const { overview, cards, cardsById, total, selection, spreads, spreadState, drawnCardIds, error } = state;

  const categories = useMemo(() => overview?.categories ?? [], [overview]);
  const kinds = useMemo(() => overview?.kinds ?? {}, [overview]);
  const findings = overview?.findings ?? { errors: 0, warnings: 0, infos: 0 };

  const detailCard: CardSummary | undefined = ui.detailCardId ? cardsById[ui.detailCardId] : undefined;

  const drawnTitles = useMemo(
    () => drawnCardIds.map((cardId) => cardsById[cardId]?.title ?? cardId),
    [drawnCardIds, cardsById],
  );

  const selectedCount = selection?.selectedCardIds.length ?? 0;
  const favoriteCount = selection?.favoriteCardIds.length ?? 0;

  const tabs: readonly { id: TabId; label: string; count?: number }[] = [
    { id: 'catalog', label: TAB_LABELS.catalog },
    { id: 'selection', label: TAB_LABELS.selection, count: selectedCount },
    { id: 'favorites', label: TAB_LABELS.favorites, count: favoriteCount },
    { id: 'spreads', label: TAB_LABELS.spreads, count: spreads.length },
  ];

  const isSelectionTab = ui.tab === 'selection' || ui.tab === 'favorites';

  return (
    <main className="shell">
      <header className="hero">
        <div className="hero__title">
          <Layers3 size={26} aria-hidden="true" />
          <div>
            <h1>Deck Studio</h1>
            <p>
              {overview
                ? `${overview.deckVersion} · ${overview.language} · ${overview.cardCount} cartas · ${overview.categoryCount} categorias`
                : 'Carregando deck…'}
            </p>
          </div>
        </div>
        {overview && (
          <div className="badges" aria-label="Diagnóstico do deck">
            <span className="badge badge--ok">
              <ShieldCheck size={14} aria-hidden="true" /> {findings.errors} erros
            </span>
            <span className="badge badge--warn">{findings.warnings} avisos</span>
            <span className="badge">{findings.infos} informações</span>
            <span className="badge badge--ai">
              <Sparkles size={14} aria-hidden="true" /> Novel Assistant:{' '}
              {overview.novelAssistant.installed ? `v${overview.novelAssistant.version ?? '?'}` : 'não instalado'}
            </span>
            <span className="badge" title="Selecionadas · Favoritos">
              <CheckCheck size={14} aria-hidden="true" /> {selectedCount} · <Star size={14} aria-hidden="true" />{' '}
              {favoriteCount}
            </span>
          </div>
        )}
      </header>

      <nav className="tabs" role="tablist" aria-label="Seções do Deck Studio">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={ui.tab === tab.id}
            className={`tab${ui.tab === tab.id ? ' tab--active' : ''}`}
            onClick={() => ui.setTab(tab.id)}
          >
            {tab.label}
            {tab.count !== undefined && <span className="tab__count">{tab.count}</span>}
          </button>
        ))}
      </nav>

      {error && (
        <div className="error" role="alert">
          <span>{error}</span>
          <button type="button" className="button button--ghost" onClick={ui.clearError}>
            Fechar
          </button>
        </div>
      )}

      {drawnTitles.length > 0 && ui.tab !== 'spreads' && (
        <p className="drawn" aria-live="polite">
          <Wand2 size={14} aria-hidden="true" /> Sorteada(s): {drawnTitles.join(' · ')}
        </p>
      )}

      {ui.tab === 'spreads' ? (
        <SpreadsPanel
          spreads={spreads}
          spreadState={spreadState}
          cardsById={cardsById}
          onStart={actions.startSpread}
          onDrawSlot={actions.drawSpreadSlot}
          onSave={actions.saveSpread}
        />
      ) : (
        <>
          {isSelectionTab && (
            <SelectionToolbar
              selection={selection}
              onDraw={actions.draw}
              onShuffle={actions.shuffle}
              onSaveVersion={actions.saveVersion}
              onRestoreVersion={actions.restoreVersion}
            />
          )}

          <div className="workspace">
            <section className="workspace__list" aria-label="Cartas">
              <CardFilters
                categories={categories}
                kinds={kinds}
                tagOptions={filters.tagOptions}
                query={filters.query}
                onQuery={filters.setQuery}
                categoryId={filters.categoryId}
                onCategory={filters.setCategoryId}
                kind={filters.kind}
                onKind={filters.setKind}
                tag={filters.tag}
                onTag={filters.setTag}
                viewMode={ui.viewMode}
                onViewMode={ui.setViewMode}
              />

              <p className="count" aria-live="polite">
                {cards.length === total
                  ? `${total} carta(s)`
                  : `${cards.length} de ${total} carta(s)`}
                {ui.tab === 'selection' ? ' selecionada(s)' : ui.tab === 'favorites' ? ' favorita(s)' : ''}
              </p>

              <CardGrid
                cards={cards}
                viewMode={ui.viewMode}
                drawnCardIds={drawnCardIds}
                onOpen={ui.setDetailCardId}
                onSelect={actions.select}
                onDeselect={actions.deselect}
                onFavorite={actions.toggleFavorite}
                onLock={actions.toggleLock}
              />
            </section>

            {detailCard && (
              <CardDetail
                card={detailCard}
                selection={selection}
                onClose={() => ui.setDetailCardId(undefined)}
                onSelect={actions.select}
                onDeselect={actions.deselect}
                onFavorite={actions.toggleFavorite}
                onLock={actions.toggleLock}
                onAddLink={actions.addLink}
                onRemoveLink={actions.removeLink}
              />
            )}
          </div>
        </>
      )}

      <footer className="foot">
        <span>
          {overview?.projectRoot ? `Projeto: ${overview.projectRoot}` : 'Sem workspace: estado em diretório temporário.'}
        </span>
        {selection && <span>revisão {selection.revision}</span>}
      </footer>
    </main>
  );
}

/** O host marca o painel no <body>; o mesmo bundle atende Deck Studio e Genre Builder. */
export default function App() {
  const panel = document.body.dataset.storydeckPanel;
  return panel === 'genre' ? <GenreBuilder /> : <DeckStudioApp />;
}
