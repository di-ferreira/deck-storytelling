import { AlertTriangle, Crown, FileText, Layers, RefreshCw, Telescope } from 'lucide-react';
import { useGenreBuilder } from '../hooks/use-genre-builder';
import type { GenrePayload } from '../../../shared/messages';

const CONTRACT_FIELDS: readonly (keyof GenrePayload['profile']['contract'])[] = [
  'promise',
  'engine',
  'conventions',
  'freedom',
  'reward',
];

const DIMENSION_FIELDS: readonly { key: keyof GenrePayload['profile']['dimensions']; label: string; hint: string }[] = [
  { key: 'tone', label: 'Tom', hint: 'ex.: sombrio, esperançoso, irônico' },
  { key: 'atmosphere', label: 'Atmosfera', hint: 'sensação dominante da leitura' },
  { key: 'setting', label: 'Cenário / contexto', hint: 'ex.: medieval, contemporâneo, urbano' },
  { key: 'audience', label: 'Público-alvo', hint: 'ex.: YA, adulto, infantil' },
  { key: 'format', label: 'Formato', hint: 'ex.: romance, mangá, HQ, conto' },
  { key: 'approximateLength', label: 'Extensão aproximada', hint: 'ex.: 80.000 palavras' },
];

function shortLabel(raw: string | undefined, index: number): string {
  if (!raw) {
    return CONTRACT_FIELDS[index];
  }
  const colon = raw.indexOf(':');
  return (colon > 0 ? raw.slice(0, colon) : raw).trim();
}

function fieldHint(raw: string | undefined): string {
  if (!raw) {
    return '';
  }
  const colon = raw.indexOf(':');
  return (colon > 0 ? raw.slice(colon + 1) : '').trim();
}

export default function GenreBuilder() {
  const {
    payload,
    mode,
    error,
    setMode,
    setDominant,
    addSecondary,
    removeSecondary,
    setSubGenres,
    setContractField,
    setDimension,
    regenerate,
  } = useGenreBuilder();

  if (!payload) {
    return <main className="shell"><h1>Genre Builder</h1><p>Carregando gêneros do deck…</p></main>;
  }

  const { profile, context, genreCatalog } = payload;
  const selectedGenres = [profile.dominantGenreId, ...profile.secondaryGenreIds].filter(Boolean);
  const catalogById = new Map(genreCatalog.map((card) => [card.id, card]));

  return (
    <main className="shell">
      <header className="hero">
        <div className="hero__title">
          <Crown size={26} aria-hidden="true" />
          <div>
            <h1>Genre Builder</h1>
            <p>Identidade literária a partir do ENTRELINHAS v4 · revisão {payload.revision}</p>
          </div>
        </div>
        <div className="badges">
          <button type="button" className="badge" onClick={() => setMode('identity')} aria-pressed={mode === 'identity'}>
            <Layers size={14} /> Identidade
          </button>
          <button type="button" className="badge" onClick={() => setMode('contract')} aria-pressed={mode === 'contract'}>
            <FileText size={14} /> Contrato
          </button>
        </div>
      </header>

      {error && <div className="error" role="alert">{error}</div>}
      {context.warnings.length > 0 && (
        <section className="warnings" aria-label="Avisos do perfil">
          {context.warnings.map((warning, index) => (
            <p key={`${warning.code}-${index}`}>
              <AlertTriangle size={14} aria-hidden="true" /> {warning.message}
            </p>
          ))}
        </section>
      )}

      {mode === 'identity' ? (
        <>
          <section className="panel">
            <h2>Gênero dominante</h2>
            <p className="hint">Um único gênero estabelece a promessa principal e o motor da trama.</p>
            <select
              aria-label="Gênero dominante"
              value={profile.dominantGenreId}
              onChange={(event) => setDominant(event.target.value)}
            >
              <option value="">Selecione um gênero</option>
              {genreCatalog.map((card) => (
                <option key={card.id} value={card.id}>
                  [{card.id}] {card.title}
                </option>
              ))}
            </select>
            {context.dominant && (
              <div className="genre-detail">
                <p><strong>Leitor:</strong> {context.dominant.readerPromise}</p>
                <p><strong>Motor:</strong> {context.dominant.storyEngine}</p>
                <p><strong>Convenções:</strong> {context.dominant.coreConventions}</p>
                <p><strong>Riscos:</strong> {context.dominant.pitfalls}</p>
                <p className="hint">Orientações de mistura: {context.dominant.compatibleGenres.join(' · ')}</p>
              </div>
            )}
          </section>

          <section className="panel">
            <h2>Gêneros secundários <span className="muted">(até 2)</span></h2>
            <div className="chips">
              {profile.secondaryGenreIds.map((id) => (
                <button key={id} type="button" className="chip" onClick={() => removeSecondary(id)} title="Remover">
                  [{id}] {catalogById.get(id)?.title ?? id} ×
                </button>
              ))}
            </div>
            <select
              aria-label="Adicionar gênero secundário"
              value=""
              onChange={(event) => {
                if (event.target.value) {
                  addSecondary(event.target.value);
                }
              }}
              disabled={profile.secondaryGenreIds.length >= 2}
            >
              <option value="">Adicionar gênero secundário…</option>
              {genreCatalog
                .filter((card) => card.id !== profile.dominantGenreId && !profile.secondaryGenreIds.includes(card.id))
                .map((card) => (
                  <option key={card.id} value={card.id}>
                    [{card.id}] {card.title}
                  </option>
                ))}
            </select>
          </section>

          <section className="panel">
            <h2><Telescope size={16} aria-hidden="true" /> Subgêneros</h2>
            <p className="hint">Especifique a vertente dentro de cada gênero escolhido. Nomes sem correspondência no deck geram aviso.</p>
            {selectedGenres.length === 0 && <p className="muted">Escolha um gênero para ver seus subgêneros.</p>}
            {selectedGenres.map((genreId) => {
              const card = catalogById.get(genreId);
              const chosen = profile.subGenresByGenre[genreId] ?? [];
              return (
                <div key={genreId} className="subgenre-group">
                  <strong>{card ? card.title : genreId}</strong>
                  <div className="chips">
                    {(card?.subGenres ?? []).map((name) => {
                      const active = chosen.includes(name);
                      return (
                        <button
                          key={name}
                          type="button"
                          className={`chip${active ? ' chip--active' : ''}`}
                          aria-pressed={active}
                          onClick={() =>
                            setSubGenres(
                              genreId,
                              active ? chosen.filter((item) => item !== name) : [...chosen, name],
                            )
                          }
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {context.subGenres.length > 0 && (
              <ul className="resolved-subgenres">
                {context.subGenres.map((item) => (
                  <li key={`${item.parentGenreId}:${item.name}`}>
                    <strong>{item.name}</strong> — {item.readerPromise}
                    <br />
                    <span className="hint">Fonte histórica: {item.sourceCardId} · Convenções: {item.coreConventions}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel">
            <h2>Dimensões independentes</h2>
            <p className="hint">Tom, contexto, público e formato não são gêneros. Preencha livremente; campos vazios são permitidos.</p>
            <div className="form-grid">
              {DIMENSION_FIELDS.map((field) => (
                <label key={field.key}>
                  <span>{field.label}</span>
                  <input
                    value={profile.dimensions[field.key]}
                    placeholder={field.hint}
                    onChange={(event) => setDimension(field.key, event.target.value)}
                  />
                </label>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="panel">
          <h2>Contrato de gênero</h2>
          <p className="hint">As cinco perguntas vêm de <code>usage.genre_contract</code> do deck. Respostas são livres e editáveis.</p>
          {CONTRACT_FIELDS.map((field, index) => (
            <label key={field} className="contract-field">
              <span>{shortLabel(payload.contractLabels[index], index)}</span>
              <small>{fieldHint(payload.contractLabels[index])}</small>
              <textarea
                rows={3}
                value={profile.contract[field]}
                onChange={(event) => setContractField(field, event.target.value)}
              />
            </label>
          ))}
          <button type="button" className="primary" onClick={regenerate}>
            <RefreshCw size={14} aria-hidden="true" /> Atualizar Story/genre-contract.md
          </button>
        </section>
      )}
    </main>
  );
}
