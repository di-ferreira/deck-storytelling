import { LayoutGrid, List, Search, Tag, X } from 'lucide-react';
import type { CategorySummary } from '../../../shared/messages';
import { KIND_LABELS } from '../labels';
import type { ViewMode } from '../hooks/use-deck-studio';

export interface CardFiltersProps {
  readonly categories: readonly CategorySummary[];
  readonly kinds: Readonly<Record<string, number>>;
  readonly tagOptions: readonly string[];
  readonly query: string;
  readonly onQuery: (value: string) => void;
  readonly categoryId: string;
  readonly onCategory: (value: string) => void;
  readonly kind: string;
  readonly onKind: (value: string) => void;
  readonly tag: string;
  readonly onTag: (value: string) => void;
  readonly viewMode: ViewMode;
  readonly onViewMode: (value: ViewMode) => void;
}

export function CardFilters(props: CardFiltersProps) {
  const hasFilters = props.query !== '' || props.categoryId !== '' || props.kind !== '' || props.tag !== '';

  return (
    <section className="filters" aria-label="Filtros do catálogo">
      <label className="field field--search">
        <Search size={15} aria-hidden="true" />
        <input
          type="search"
          placeholder="Pesquisar título, prompt, pergunta, tags…"
          value={props.query}
          onChange={(event) => props.onQuery(event.target.value)}
          aria-label="Pesquisar cartas"
        />
      </label>

      <select
        aria-label="Filtrar por categoria"
        value={props.categoryId}
        onChange={(event) => props.onCategory(event.target.value)}
      >
        <option value="">Todas as categorias</option>
        {props.categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.short} ({category.cardCount})
          </option>
        ))}
      </select>

      <select aria-label="Filtrar por tipo" value={props.kind} onChange={(event) => props.onKind(event.target.value)}>
        <option value="">Todos os tipos</option>
        {Object.entries(props.kinds).map(([kind, count]) => (
          <option key={kind} value={kind}>
            {KIND_LABELS[kind] ?? kind} ({count})
          </option>
        ))}
      </select>

      <label className="field field--tag">
        <Tag size={14} aria-hidden="true" />
        <select aria-label="Filtrar por tag" value={props.tag} onChange={(event) => props.onTag(event.target.value)}>
          <option value="">Todas as tags</option>
          {props.tagOptions.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
      </label>

      {hasFilters && (
        <button
          type="button"
          className="button button--ghost"
          onClick={() => {
            props.onQuery('');
            props.onCategory('');
            props.onKind('');
            props.onTag('');
          }}
        >
          <X size={14} aria-hidden="true" /> Limpar
        </button>
      )}

      <div className="mode-switch" role="group" aria-label="Modo de exibição">
        <button
          type="button"
          className={`icon-button${props.viewMode === 'grid' ? ' icon-button--active' : ''}`}
          onClick={() => props.onViewMode('grid')}
          aria-pressed={props.viewMode === 'grid'}
          title="Grade"
        >
          <LayoutGrid size={15} aria-hidden="true" />
          <span className="sr-only">Grade</span>
        </button>
        <button
          type="button"
          className={`icon-button${props.viewMode === 'detailed' ? ' icon-button--active' : ''}`}
          onClick={() => props.onViewMode('detailed')}
          aria-pressed={props.viewMode === 'detailed'}
          title="Lista detalhada"
        >
          <List size={15} aria-hidden="true" />
          <span className="sr-only">Lista detalhada</span>
        </button>
      </div>
    </section>
  );
}
