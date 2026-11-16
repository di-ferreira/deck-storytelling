import { Check, ChevronRight, Lock, Star, Unlock } from 'lucide-react';
import type { CardSummary } from '../../../shared/messages';
import type { ViewMode } from '../hooks/use-deck-studio';
import { KIND_LABELS } from '../labels';

export interface CardGridProps {
  readonly cards: readonly CardSummary[];
  readonly viewMode: ViewMode;
  readonly drawnCardIds: readonly string[];
  readonly onOpen: (cardId: string) => void;
  readonly onSelect: (cardId: string) => void;
  readonly onDeselect: (cardId: string) => void;
  readonly onFavorite: (cardId: string) => void;
  readonly onLock: (cardId: string) => void;
}

interface CardActionsProps {
  readonly card: CardSummary;
  readonly onSelect: (cardId: string) => void;
  readonly onDeselect: (cardId: string) => void;
  readonly onFavorite: (cardId: string) => void;
  readonly onLock: (cardId: string) => void;
}

function CardActions({ card, onSelect, onDeselect, onFavorite, onLock }: CardActionsProps) {
  return (
    <div className="card__actions">
      <button
        type="button"
        className={`icon-button${card.selected ? ' icon-button--active' : ''}`}
        title={card.selected ? 'Desmarcar carta' : 'Selecionar carta'}
        aria-pressed={card.selected}
        onClick={(event) => {
          event.stopPropagation();
          if (card.selected) {
            onDeselect(card.id);
          } else {
            onSelect(card.id);
          }
        }}
      >
        <Check size={14} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={`icon-button${card.favorite ? ' icon-button--active' : ''}`}
        title={card.favorite ? 'Remover dos favoritos' : 'Favoritar carta'}
        aria-pressed={Boolean(card.favorite)}
        onClick={(event) => {
          event.stopPropagation();
          onFavorite(card.id);
        }}
      >
        <Star size={14} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={`icon-button${card.locked ? ' icon-button--active' : ''}`}
        title={card.locked ? 'Desbloquear carta' : card.selected ? 'Bloquear carta' : 'Selecione a carta para bloqueá-la'}
        aria-pressed={Boolean(card.locked)}
        disabled={!card.selected}
        onClick={(event) => {
          event.stopPropagation();
          onLock(card.id);
        }}
      >
        {card.locked ? <Lock size={14} aria-hidden="true" /> : <Unlock size={14} aria-hidden="true" />}
      </button>
    </div>
  );
}

export function CardGrid(props: CardGridProps) {
  if (props.cards.length === 0) {
    return (
      <p className="empty">
        Nenhuma carta corresponde a estes filtros. Ajuste a busca, a categoria, o tipo ou a tag.
      </p>
    );
  }

  const drawn = new Set(props.drawnCardIds);

  if (props.viewMode === 'detailed') {
    return (
      <ul className="rows" aria-label="Cartas do deck em lista detalhada">
        {props.cards.map((card) => (
          <li
            key={card.id}
            className={`row${card.selected ? ' row--selected' : ''}${drawn.has(card.id) ? ' row--drawn' : ''}`}
            style={{ borderLeftColor: card.color }}
          >
            <button type="button" className="row__main" onClick={() => props.onOpen(card.id)}>
              <span className="row__id">{card.id}</span>
              <span className="row__title">{card.title}</span>
              <span className="row__meta">
                {card.categoryName} · {KIND_LABELS[card.kind] ?? card.kind}
                {card.tags && card.tags.length > 0 ? ` · ${card.tags.slice(0, 4).join(', ')}` : ''}
              </span>
              {card.prompt && <span className="row__prompt">{card.prompt}</span>}
            </button>
            <CardActions {...props} card={card} />
            <ChevronRight size={16} aria-hidden="true" className="row__chevron" />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section className="grid" aria-label="Cartas do deck">
      {props.cards.map((card) => (
        <article
          key={card.id}
          className={`card${card.selected ? ' card--selected' : ''}${drawn.has(card.id) ? ' card--drawn' : ''}`}
          style={{ borderLeftColor: card.color }}
        >
          <button type="button" className="card__main" onClick={() => props.onOpen(card.id)}>
            <span className="card__id">
              {card.id}
              {card.favorite ? <Star size={11} aria-label="favorita" className="card__flag" /> : null}
              {card.locked ? <Lock size={11} aria-label="bloqueada" className="card__flag" /> : null}
            </span>
            <strong className="card__title">{card.title}</strong>
            <span className="card__category">{card.categoryName}</span>
            <span className="card__kind">{KIND_LABELS[card.kind] ?? card.kind}</span>
          </button>
          <CardActions {...props} card={card} />
        </article>
      ))}
    </section>
  );
}
