import { useState } from 'react';
import { Dices, History, RotateCcw, Save, Shuffle } from 'lucide-react';
import type { SelectionPayload } from '../../../shared/messages';
import { formatDateTime } from '../labels';

export interface SelectionToolbarProps {
  readonly selection?: SelectionPayload;
  readonly onDraw: (count: number, from: 'catalog' | 'selection') => void;
  readonly onShuffle: () => void;
  readonly onSaveVersion: (label: string) => void;
  readonly onRestoreVersion: (versionId: string) => void;
}

export function SelectionToolbar(props: SelectionToolbarProps) {
  const [count, setCount] = useState('1');
  const [label, setLabel] = useState('');

  const parsedCount = Number.parseInt(count, 10);
  const validCount = Number.isInteger(parsedCount) && parsedCount >= 1 && parsedCount <= 20;
  const versions = [...(props.selection?.versions ?? [])].reverse();

  return (
    <section className="toolbar" aria-label="Ações da seleção">
      <div className="toolbar__row">
        <label className="field field--count">
          <span>Sortear</span>
          <input
            type="number"
            min={1}
            max={20}
            value={count}
            aria-label="Quantidade de cartas a sortear"
            onChange={(event) => setCount(event.target.value)}
          />
        </label>
        <button
          type="button"
          className="button"
          disabled={!validCount}
          onClick={() => props.onDraw(parsedCount, 'catalog')}
          title="Sortear cartas do catálogo e adicionar à seleção"
        >
          <Dices size={14} aria-hidden="true" /> Sortear do catálogo
        </button>
        <button
          type="button"
          className="button button--ghost"
          disabled={!validCount}
          onClick={() => props.onDraw(parsedCount, 'selection')}
          title="Escolher cartas ao acaso entre as já selecionadas (não altera o conjunto)"
        >
          <Dices size={14} aria-hidden="true" /> Sortear entre selecionadas
        </button>
        <button type="button" className="button button--ghost" onClick={props.onShuffle}>
          <Shuffle size={14} aria-hidden="true" /> Embaralhar
        </button>
      </div>

      <div className="toolbar__row">
        <label className="field field--label">
          <Save size={14} aria-hidden="true" />
          <input
            type="text"
            placeholder="Nome da versão"
            value={label}
            aria-label="Nome da versão"
            onChange={(event) => setLabel(event.target.value)}
          />
        </label>
        <button
          type="button"
          className="button"
          disabled={label.trim().length === 0}
          onClick={() => {
            props.onSaveVersion(label.trim());
            setLabel('');
          }}
        >
          <Save size={14} aria-hidden="true" /> Salvar versão
        </button>
        {props.selection?.activeVersionId && (
          <span className="badge badge--ok">
            <History size={12} aria-hidden="true" /> versão ativa: {props.selection.activeVersionId}
          </span>
        )}
      </div>

      {versions.length > 0 && (
        <div className="versions">
          <h4>
            <History size={14} aria-hidden="true" /> Versões salvas ({versions.length})
          </h4>
          <ul>
            {versions.map((version) => (
              <li key={version.id} className="versions__item">
                <div>
                  <strong>{version.label}</strong>
                  <span className="detail__meta">
                    {version.cardIds.length} carta(s) · {formatDateTime(version.createdAt)}
                  </span>
                </div>
                <button
                  type="button"
                  className={`button button--ghost${
                    props.selection?.activeVersionId === version.id ? ' button--active' : ''
                  }`}
                  onClick={() => props.onRestoreVersion(version.id)}
                >
                  <RotateCcw size={13} aria-hidden="true" />
                  {props.selection?.activeVersionId === version.id ? 'Ativa' : 'Restaurar'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
