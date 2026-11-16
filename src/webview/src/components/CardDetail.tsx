import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Check, Link2, Lock, Star, Trash2, Unlock, X } from 'lucide-react';
import type { CardSummary, SelectionPayload } from '../../../shared/messages';
import type { CardLinkTargetJson } from '../../../shared/schemas/selection';
import {
  KIND_LABELS,
  LINK_TARGET_ID_FIELD,
  LINK_TARGET_LABELS,
  buildLinkTarget,
  describeLinkTarget,
  type LinkTargetType,
} from '../labels';

export interface CardDetailProps {
  readonly card: CardSummary;
  readonly selection?: SelectionPayload;
  readonly onClose: () => void;
  readonly onSelect: (cardId: string) => void;
  readonly onDeselect: (cardId: string) => void;
  readonly onFavorite: (cardId: string) => void;
  readonly onLock: (cardId: string) => void;
  readonly onAddLink: (cardId: string, target: CardLinkTargetJson, note?: string) => void;
  readonly onRemoveLink: (cardId: string, target: CardLinkTargetJson) => void;
}

type TargetType = LinkTargetType;

const TARGET_TYPES: readonly LinkTargetType[] = [
  'project',
  'decision',
  'genre',
  'character',
  'act',
  'chapter',
  'scene',
];

function Section({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <section className="detail__section">
      <h4>{title}</h4>
      <p>{children}</p>
    </section>
  );
}

export function CardDetail(props: CardDetailProps) {
  const { card } = props;
  const [targetType, setTargetType] = useState<TargetType>('project');
  const [targetId, setTargetId] = useState('');
  const [note, setNote] = useState('');

  const cardLinks = useMemo(
    () => (props.selection?.links ?? []).filter((link) => link.cardId === card.id),
    [props.selection, card.id],
  );

  const linkTarget = buildLinkTarget(targetType, targetId);

  return (
    <aside className="detail" aria-label={`Detalhe da carta ${card.id}`}>
      <header className="detail__head" style={{ borderLeftColor: card.color }}>
        <div>
          <span className="detail__id">{card.id}</span>
          <h3>{card.title}</h3>
          <p className="detail__meta">
            {card.categoryName} · {KIND_LABELS[card.kind] ?? card.kind}
          </p>
        </div>
        <button type="button" className="icon-button" onClick={props.onClose} title="Fechar detalhe">
          <X size={15} aria-hidden="true" />
          <span className="sr-only">Fechar detalhe</span>
        </button>
      </header>

      <div className="detail__actions">
        <button
          type="button"
          className={`button${card.selected ? ' button--active' : ''}`}
          onClick={() => (card.selected ? props.onDeselect(card.id) : props.onSelect(card.id))}
        >
          <Check size={14} aria-hidden="true" /> {card.selected ? 'Desmarcar' : 'Selecionar'}
        </button>
        <button
          type="button"
          className={`button${card.favorite ? ' button--active' : ''}`}
          onClick={() => props.onFavorite(card.id)}
        >
          <Star size={14} aria-hidden="true" /> {card.favorite ? 'Desfavoritar' : 'Favoritar'}
        </button>
        <button
          type="button"
          className={`button${card.locked ? ' button--active' : ''}`}
          onClick={() => props.onLock(card.id)}
          disabled={!card.selected}
          title={card.selected ? undefined : 'Selecione a carta para bloqueá-la'}
        >
          {card.locked ? <Unlock size={14} aria-hidden="true" /> : <Lock size={14} aria-hidden="true" />}
          {card.locked ? 'Desbloquear' : 'Bloquear'}
        </button>
      </div>

      {card.prompt && <Section title="Prompt">{card.prompt}</Section>}
      {card.question && <Section title="Pergunta">{card.question}</Section>}
      {card.suggestedUse && <Section title="Uso sugerido">{card.suggestedUse}</Section>}

      {card.kind === 'genre_definition' ? (
        <>
          {card.genreFamily && <Section title="Família de gênero">{card.genreFamily}</Section>}
          {card.genreLevel && <Section title="Nível">{card.genreLevel}</Section>}
          {card.readerPromise && <Section title="Promessa ao leitor">{card.readerPromise}</Section>}
          {card.storyEngine && <Section title="Motor da história">{card.storyEngine}</Section>}
          {card.coreConventions && <Section title="Convenções centrais">{card.coreConventions}</Section>}
          {card.pitfalls && <Section title="Armadilhas">{card.pitfalls}</Section>}
          {card.compatibleGenres && card.compatibleGenres.length > 0 && (
            <section className="detail__section">
              <h4>Gêneros compatíveis (consultivo)</h4>
              <ul className="chips">
                {card.compatibleGenres.map((genre) => (
                  <li key={genre} className="chip">
                    {genre}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {card.subGenres && card.subGenres.length > 0 && (
            <section className="detail__section">
              <h4>Subgêneros</h4>
              <ul className="chips">
                {card.subGenres.map((genre) => (
                  <li key={genre} className="chip">
                    {genre}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {card.subGenreDetails?.map((detail) => (
            <section key={detail.name} className="detail__section detail__subgenre">
              <h4>{detail.name}</h4>
              <p>{detail.prompt}</p>
              <p className="detail__meta">Pergunta: {detail.question}</p>
              <p className="detail__meta">Uso sugerido: {detail.suggestedUse}</p>
              <p className="detail__meta">Promessa: {detail.readerPromise}</p>
              <p className="detail__meta">Convenções: {detail.coreConventions}</p>
              <p className="detail__meta">Armadilhas: {detail.pitfalls}</p>
              {detail.compatibleGenres.length > 0 && (
                <p className="detail__meta">Compatíveis: {detail.compatibleGenres.join(', ')}</p>
              )}
            </section>
          ))}
        </>
      ) : (
        <>
          {card.genreAdaptation && <Section title="Adaptação por gênero">{card.genreAdaptation}</Section>}
          {card.genreRelevantAxis && <Section title="Eixo relevante de gênero">{card.genreRelevantAxis}</Section>}
        </>
      )}

      {card.sourceConcept && <Section title="Conceito de origem">{card.sourceConcept}</Section>}

      {card.tags && card.tags.length > 0 && (
        <section className="detail__section">
          <h4>Tags</h4>
          <ul className="chips">
            {card.tags.map((tag) => (
              <li key={tag} className="chip">
                {tag}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="detail__section">
        <h4>
          <Link2 size={14} aria-hidden="true" /> Vínculos desta carta
        </h4>
        {cardLinks.length === 0 ? (
          <p className="detail__meta">Nenhum vínculo registrado.</p>
        ) : (
          <ul className="links">
            {cardLinks.map((link) => (
              <li key={`${link.cardId}-${JSON.stringify(link.target)}-${link.createdAt}`} className="links__item">
                <span>{describeLinkTarget(link.target)}</span>
                {link.note && <em>{link.note}</em>}
                <button
                  type="button"
                  className="icon-button"
                  title="Remover vínculo"
                  onClick={() => props.onRemoveLink(card.id, link.target)}
                >
                  <Trash2 size={13} aria-hidden="true" />
                  <span className="sr-only">Remover vínculo</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="link-form">
          <select
            aria-label="Tipo de alvo do vínculo"
            value={targetType}
            onChange={(event) => setTargetType(event.target.value as TargetType)}
          >
            {TARGET_TYPES.map((type) => (
              <option key={type} value={type}>
                {LINK_TARGET_LABELS[type]}
              </option>
            ))}
          </select>
          {targetType !== 'project' && (
            <input
              type="text"
              aria-label="Identificador do alvo"
              placeholder={LINK_TARGET_ID_FIELD[targetType]}
              value={targetId}
              onChange={(event) => setTargetId(event.target.value)}
            />
          )}
          <input
            type="text"
            aria-label="Nota do vínculo"
            placeholder="Nota (opcional)"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <button
            type="button"
            className="button"
            disabled={!linkTarget}
            onClick={() => {
              if (!linkTarget) {
                return;
              }
              props.onAddLink(card.id, linkTarget, note.trim() || undefined);
              setNote('');
              setTargetId('');
            }}
          >
            Associar
          </button>
        </div>
      </section>
    </aside>
  );
}
