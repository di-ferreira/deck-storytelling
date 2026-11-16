import { BookOpen, Dices, Save } from 'lucide-react';
import type { CardSummary } from '../../../shared/messages';
import type { SpreadDefinition, SpreadState } from '../../../shared/schemas/spread';
import { KIND_LABELS, SPREAD_STATUS_LABELS } from '../labels';

export interface SpreadsPanelProps {
  readonly spreads: readonly SpreadDefinition[];
  readonly spreadState?: SpreadState;
  readonly cardsById: Readonly<Record<string, CardSummary>>;
  readonly onStart: (spreadId: string) => void;
  readonly onDrawSlot: (spreadId: string, slotId: string) => void;
  readonly onSave: (spreadId: string) => void;
}

function describeSlotFilters(slot: SpreadDefinition['slots'][number]): string {
  const parts: string[] = [];
  if (slot.categoryIds && slot.categoryIds.length > 0) {
    parts.push(slot.categoryIds.join(', '));
  }
  if (slot.kinds && slot.kinds.length > 0) {
    parts.push(slot.kinds.map((kind) => KIND_LABELS[kind] ?? kind).join(', '));
  }
  parts.push(slot.source === 'selection' ? 'da seleção' : 'do catálogo');
  return parts.join(' · ');
}

export function SpreadsPanel(props: SpreadsPanelProps) {
  if (props.spreads.length === 0) {
    return <p className="empty">Nenhuma tiragem disponível no recurso incorporado.</p>;
  }

  const activeId = props.spreadState?.spreadId;

  return (
    <section className="spreads" aria-label="Tiragens do ENTRELINHAS v4">
      {props.spreads.map((spread) => {
        const state = activeId === spread.id ? props.spreadState : undefined;
        const filled = state ? Object.values(state.slotCardIds).flat().length : 0;
        const expected = spread.slots.reduce((total, slot) => total + slot.count, 0);
        const status = state?.status ?? 'idle';

        return (
          <article key={spread.id} className={`spread${activeId === spread.id ? ' spread--active' : ''}`}>
            <header className="spread__head">
              <div>
                <h3>
                  <BookOpen size={16} aria-hidden="true" /> {spread.name}
                </h3>
                <p className="spread__purpose">{spread.purpose}</p>
                <p className="spread__draw">
                  <strong>Como sortear:</strong> {spread.drawText}
                </p>
              </div>
              <span className={`badge${status === 'complete' ? ' badge--ok' : ''}`}>
                {filled}/{expected} · {SPREAD_STATUS_LABELS[status] ?? status}
              </span>
            </header>

            <ul className="slots">
              {spread.slots.map((slot) => {
                const cardIds = state?.slotCardIds[slot.id] ?? [];
                const complete = cardIds.length >= slot.count;
                return (
                  <li key={slot.id} className="slot">
                    <div className="slot__info">
                      <strong>{slot.label}</strong>
                      <span className="detail__meta">
                        {describeSlotFilters(slot)} · {cardIds.length}/{slot.count}
                      </span>
                      {cardIds.length > 0 && (
                        <ul className="chips">
                          {cardIds.map((cardId) => (
                            <li key={cardId} className="chip">
                              [{cardId}] {props.cardsById[cardId]?.title ?? 'carta'}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <button
                      type="button"
                      className={`button${complete ? ' button--active' : ''}`}
                      onClick={() => props.onDrawSlot(spread.id, slot.id)}
                      title={complete ? 'Sortear novamente este slot' : 'Sortear uma carta para este slot'}
                    >
                      <Dices size={14} aria-hidden="true" /> {complete ? 'Re-sortear' : 'Sortear slot'}
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="spread__footer">
              <button type="button" className="button button--ghost" onClick={() => props.onStart(spread.id)}>
                {activeId === spread.id ? 'Reiniciar tiragem' : 'Iniciar tiragem'}
              </button>
              <button
                type="button"
                className="button"
                disabled={!state || state.status === 'idle'}
                onClick={() => props.onSave(spread.id)}
                title="Persistir o estado da tiragem em .storydeck/story-state.json"
              >
                <Save size={14} aria-hidden="true" /> Salvar tiragem
              </button>
              {state?.savedAt && <span className="badge">salva em {state.savedAt}</span>}
            </div>

            {state?.result && (
              <pre className="spread__result" aria-label={`Resultado da tiragem ${spread.name}`}>
                {state.result}
              </pre>
            )}
          </article>
        );
      })}
    </section>
  );
}
