import { useState } from 'react';
import { BookOpen, Film, Layers3, Lightbulb, PersonStanding, RefreshCw, Swords } from 'lucide-react';
import type { StoryAction } from '../../../shared/messages';
import { useStoryBuilder } from '../hooks/use-story-builder';

type Tab = 'identity' | 'premise' | 'characters' | 'conflicts' | 'world' | 'secrets' | 'narrator' | 'structure' | 'techniques' | 'hierarchy' | 'bible';

const TABS: readonly { id: Tab; label: string }[] = [
  { id: 'identity', label: 'Identidade' },
  { id: 'premise', label: 'Premissa' },
  { id: 'characters', label: 'Personagens' },
  { id: 'conflicts', label: 'Conflitos' },
  { id: 'world', label: 'Mundo' },
  { id: 'secrets', label: 'Segredos' },
  { id: 'narrator', label: 'Narrador' },
  { id: 'structure', label: 'Estrutura' },
  { id: 'techniques', label: 'Técnicas' },
  { id: 'hierarchy', label: 'Atos / Cenas' },
  { id: 'bible', label: 'Story Bible' },
];

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

interface FieldProps {
  label: string;
  value: string;
  onCommit: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
}

function Field({ label, value, onCommit, multiline, placeholder }: FieldProps) {
  return (
    <label className="story-field">
      <span>{label}</span>
      {multiline ? (
        <textarea
          rows={3}
          key={value}
          defaultValue={value}
          placeholder={placeholder}
          onBlur={(event) => {
            if (event.target.value !== value) onCommit(event.target.value);
          }}
        />
      ) : (
        <input
          key={value}
          defaultValue={value}
          placeholder={placeholder}
          onBlur={(event) => {
            if (event.target.value !== value) onCommit(event.target.value);
          }}
        />
      )}
    </label>
  );
}

export default function StoryBuilder() {
  const { payload, error, act, regenerate } = useStoryBuilder();
  const [tab, setTab] = useState<Tab>('identity');

  if (!payload) {
    return <main className="shell"><h1>Story Builder</h1><p>Carregando o projeto narrativo…</p></main>;
  }

  const data = payload.project.project;
  const revision = payload.revision;
  const send = (action: StoryAction) => act(action);

  return (
    <main className="shell">
      <header className="hero">
        <div className="hero__title">
          <BookOpen size={26} aria-hidden="true" />
          <div>
            <h1>Story Builder</h1>
            <p>{data.identity.provisionalTitle || 'Obra sem título'} · revisão {revision}</p>
          </div>
        </div>
        <div className="badges">
          <span className="badge">{data.characters.length} personagens</span>
          <span className="badge">{data.acts.length} atos</span>
          <span className="badge">{data.scenes.length} cenas</span>
          <span className={`badge ${data.bible.dirty ? 'badge--warn' : 'badge--ok'}`}>
            Bíblia {data.bible.dirty ? 'desatualizada' : 'atualizada'}
          </span>
        </div>
      </header>

      {error && <div className="error" role="alert">{error}</div>}
      <nav className="story-tabs" aria-label="Etapas do Story Builder">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`chip${tab === item.id ? ' chip--active' : ''}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {payload.warnings.length > 0 && (
        <section className="warnings">
          {payload.warnings.map((warning, index) => (
            <p key={`${warning.code}-${index}`}>⚠ {warning.message}</p>
          ))}
        </section>
      )}

      {tab === 'identity' && (
        <section className="panel">
          <h2>Identidade da obra</h2>
          <p className="hint">Tom, atmosfera, público, formato, cenário e extensão ficam no Genre Builder — são dimensões, não gêneros.</p>
          <Field label="Título provisório" value={data.identity.provisionalTitle} onCommit={(v) => send({ action: 'updateIdentity', patch: { provisionalTitle: v } })} />
          <Field label="Descrição inicial" value={data.identity.initialDescription} multiline onCommit={(v) => send({ action: 'updateIdentity', patch: { initialDescription: v } })} />
          <Field label="Período" value={data.identity.period} onCommit={(v) => send({ action: 'updateIdentity', patch: { period: v } })} />
        </section>
      )}

      {tab === 'premise' && (
        <section className="panel">
          <h2><Lightbulb size={16} /> Premissa</h2>
          {([
            ['centralIdea', 'Ideia central'], ['logline', 'Logline'], ['premise', 'Premissa'],
            ['shortSynopsis', 'Sinopse curta'], ['expandedSynopsis', 'Sinopse expandida'],
            ['centralTheme', 'Tema central'], ['dramaticQuestion', 'Pergunta dramática'],
            ['narrativeProposition', 'Proposta narrativa'], ['differentiator', 'Elemento diferenciador'],
          ] as const).map(([field, label]) => (
            <Field key={field} label={label} value={data.premise[field]} multiline onCommit={(v) => send({ action: 'updatePremise', patch: { [field]: v } })} />
          ))}
        </section>
      )}

      {tab === 'characters' && (
        <section className="panel">
          <h2><PersonStanding size={16} /> Personagens</h2>
          <button type="button" className="primary" onClick={() => send({ action: 'addCharacter', entity: { id: newId('pes') } })}>
            + Novo personagem
          </button>
          {data.characters.map((character) => (
            <article key={character.id} className="story-card">
              <strong>{character.name || '(sem nome)'} <small>[{character.id}]</small></strong>
              <Field label="Nome" value={character.name} onCommit={(v) => send({ action: 'updateCharacter', id: character.id, patch: { name: v } })} />
              <Field label="Papel na história" value={character.storyRole} onCommit={(v) => send({ action: 'updateCharacter', id: character.id, patch: { storyRole: v } })} />
              <Field label="Desejo externo" value={character.externalDesire} onCommit={(v) => send({ action: 'updateCharacter', id: character.id, patch: { externalDesire: v } })} />
              <Field label="Necessidade interna" value={character.internalNeed} onCommit={(v) => send({ action: 'updateCharacter', id: character.id, patch: { internalNeed: v } })} />
              <Field label="Medo" value={character.fear} onCommit={(v) => send({ action: 'updateCharacter', id: character.id, patch: { fear: v } })} />
              <Field label="Ferida emocional" value={character.emotionalWound} onCommit={(v) => send({ action: 'updateCharacter', id: character.id, patch: { emotionalWound: v } })} />
              <Field label="Arco de transformação" value={character.arc} multiline onCommit={(v) => send({ action: 'updateCharacter', id: character.id, patch: { arc: v } })} />
            </article>
          ))}
        </section>
      )}

      {tab === 'conflicts' && (
        <section className="panel">
          <h2><Swords size={16} /> Conflitos</h2>
          <button type="button" className="primary" onClick={() => send({ action: 'addConflict', entity: { id: newId('con') } })}>
            + Novo conflito
          </button>
          {data.conflicts.map((conflict) => (
            <article key={conflict.id} className="story-card">
              <strong>{conflict.description || '(sem descrição)'} <small>[{conflict.id}]</small></strong>
              <Field label="Descrição" value={conflict.description} multiline onCommit={(v) => send({ action: 'updateConflict', id: conflict.id, patch: { description: v } })} />
              <label className="story-field">
                <span>Personagem ligado</span>
                <select value={conflict.linkedCharacterId} onChange={(e) => send({ action: 'updateConflict', id: conflict.id, patch: { linkedCharacterId: e.target.value } })}>
                  <option value="">—</option>
                  {data.characters.map((c) => <option key={c.id} value={c.id}>{c.name || c.id}</option>)}
                </select>
              </label>
              <Field label="Objetivo em jogo" value={conflict.linkedGoal} onCommit={(v) => send({ action: 'updateConflict', id: conflict.id, patch: { linkedGoal: v } })} />
              <Field label="Oposição" value={conflict.opposition} onCommit={(v) => send({ action: 'updateConflict', id: conflict.id, patch: { opposition: v } })} />
              <Field label="Dilema moral" value={conflict.moralDilemma} multiline onCommit={(v) => send({ action: 'updateConflict', id: conflict.id, patch: { moralDilemma: v } })} />
            </article>
          ))}
        </section>
      )}

      {tab === 'world' && (
        <section className="panel">
          <h2>Mundo e atmosfera</h2>
          <Field label="Universo" value={data.world.universe} multiline onCommit={(v) => send({ action: 'updateWorld', patch: { universe: v } })} />
          <Field label="Regras" value={data.world.rules.join('\n')} multiline onCommit={(v) => send({ action: 'updateWorld', patch: { rules: v.split('\n').filter(Boolean) } })} />
          <Field label="Cultura" value={data.world.culture} multiline onCommit={(v) => send({ action: 'updateWorld', patch: { culture: v } })} />
          <Field label="Economia" value={data.world.economy} onCommit={(v) => send({ action: 'updateWorld', patch: { economy: v } })} />
          <Field label="Tecnologia" value={data.world.technology} onCommit={(v) => send({ action: 'updateWorld', patch: { technology: v } })} />
          <Field label="Sobrenatural" value={data.world.supernatural} multiline onCommit={(v) => send({ action: 'updateWorld', patch: { supernatural: v } })} />
          <button type="button" className="primary" onClick={() => send({ action: 'addLocation', entity: { id: newId('loc'), name: 'Nova localização' } })}>
            + Localização
          </button>
          {data.world.locations.map((location) => (
            <Field key={location.id} label={location.name} value={location.description} multiline onCommit={(v) => send({ action: 'updateLocation', id: location.id, patch: { description: v } })} />
          ))}
        </section>
      )}

      {tab === 'secrets' && (
        <section className="panel">
          <h2>Segredos e revelações</h2>
          <button type="button" className="primary" onClick={() => send({ action: 'addSecret', entity: { id: newId('seg') } })}>
            + Novo segredo
          </button>
          {data.secrets.map((secret) => (
            <article key={secret.id} className="story-card">
              <strong>{secret.description || '(sem descrição)'} <small>[{secret.id}]</small></strong>
              <Field label="Descrição" value={secret.description} multiline onCommit={(v) => send({ action: 'updateSecret', id: secret.id, patch: { description: v } })} />
              <Field label="Verdade factual" value={secret.factualTruth} multiline onCommit={(v) => send({ action: 'updateSecret', id: secret.id, patch: { factualTruth: v } })} />
              <Field label="Informação disponível ao leitor" value={secret.readerAvailableInfo} multiline onCommit={(v) => send({ action: 'updateSecret', id: secret.id, patch: { readerAvailableInfo: v } })} />
              <Field label="Momento da revelação" value={secret.revelationMoment} onCommit={(v) => send({ action: 'updateSecret', id: secret.id, patch: { revelationMoment: v } })} />
              <Field label="Preparação narrativa" value={secret.narrativeSetup} multiline onCommit={(v) => send({ action: 'updateSecret', id: secret.id, patch: { narrativeSetup: v } })} />
            </article>
          ))}
        </section>
      )}

      {tab === 'narrator' && (
        <section className="panel">
          <h2>Narrador e perspectiva</h2>
          <label className="story-field">
            <span>Pessoa</span>
            <select value={data.narrator.person} onChange={(e) => send({ action: 'setNarrator', profile: { ...data.narrator, person: e.target.value as typeof data.narrator.person } })}>
              <option value="first">Primeira pessoa</option>
              <option value="second">Segunda pessoa</option>
              <option value="third">Terceira pessoa</option>
              <option value="variable">Variável</option>
            </select>
          </label>
          <Field label="Foco narrativo" value={data.narrator.focus} onCommit={(v) => send({ action: 'setNarrator', profile: { ...data.narrator, focus: v } })} />
          <Field label="Nível de conhecimento" value={data.narrator.knowledgeLevel} onCommit={(v) => send({ action: 'setNarrator', profile: { ...data.narrator, knowledgeLevel: v } })} />
          <Field label="Confiabilidade" value={data.narrator.reliability} onCommit={(v) => send({ action: 'setNarrator', profile: { ...data.narrator, reliability: v } })} />
          <Field label="Limites de informação" value={data.narrator.informationLimits} multiline onCommit={(v) => send({ action: 'setNarrator', profile: { ...data.narrator, informationLimits: v } })} />
        </section>
      )}

      {tab === 'structure' && (
        <section className="panel">
          <h2>Estruturas e técnicas</h2>
          <p className="hint">Estruturas vêm das cartas CAT-09/CAT-13; técnicas, de CAT-14/CAT-15/CAT-16. Nenhuma é imposta.</p>
          {data.structures.map((choice) => (
            <p key={choice.cardId}>{choice.cardId} — {choice.intent || 'sem intenção registrada'}</p>
          ))}
          <Field label="ID da carta de estrutura" value="" placeholder="CAT-13 / ST-134" onCommit={(v) => { if (v) send({ action: 'addStructure', choice: { cardId: v, intent: '' } }); }} />
          <Field label="ID da carta de técnica" value="" placeholder="ST-145" onCommit={(v) => { if (v) send({ action: 'assignTechnique', cardId: v, scope: { type: 'work' }, intent: '' }); }} />
          {data.techniques.map((technique) => (
            <p key={`${technique.cardId}-${technique.scope.type}`}>
              {technique.cardId} · {technique.scope.type} — {technique.intent || 'sem intenção'}
            </p>
          ))}
        </section>
      )}

      {tab === 'hierarchy' && (
        <section className="panel">
          <h2><Layers3 size={16} /> Atos, capítulos e cenas</h2>
          <button type="button" className="primary" onClick={() => send({ action: 'addAct', entity: { id: newId('ato'), title: 'Novo ato' } })}>
            + Novo ato
          </button>
          {data.acts.map((act) => (
            <article key={act.id} className="story-card">
              <strong>{act.title || '(sem título)'} <small>[{act.id}] · Ato {act.number}</small></strong>
              <Field label="Objetivo do ato" value={act.goal} multiline onCommit={(v) => send({ action: 'updateAct', id: act.id, patch: { goal: v } })} />
              <button type="button" className="chip" onClick={() => send({ action: 'addChapter', entity: { id: newId('cap'), actId: act.id, title: 'Novo capítulo' } })}>
                + Capítulo
              </button>
              {data.chapters.filter((chapter) => chapter.actId === act.id).map((chapter) => (
                <div key={chapter.id} className="story-nested">
                  <strong>{chapter.number}. {chapter.title || '(sem título)'} <small>[{chapter.id}]</small></strong>
                  <Field label="Objetivo narrativo" value={chapter.narrativeGoal} onCommit={(v) => send({ action: 'updateChapter', id: chapter.id, patch: { narrativeGoal: v } })} />
                  <label className="story-field">
                    <span>Mover para o ato</span>
                    <select value={chapter.actId} onChange={(e) => send({ action: 'moveChapter', id: chapter.id, actId: e.target.value })}>
                      {data.acts.map((item) => <option key={item.id} value={item.id}>{item.title || item.id}</option>)}
                    </select>
                  </label>
                  <button type="button" className="chip" onClick={() => send({ action: 'addScene', entity: { id: newId('cen'), chapterId: chapter.id, title: 'Nova cena' } })}>
                    + Cena
                  </button>
                  {data.scenes.filter((scene) => scene.chapterId === chapter.id).map((scene) => (
                    <div key={scene.id} className="story-nested">
                      <strong><Film size={12} aria-hidden="true" /> {scene.title || '(sem título)'} <small>[{scene.id}]</small></strong>
                      <Field label="Objetivo" value={scene.goal} onCommit={(v) => send({ action: 'updateScene', id: scene.id, patch: { goal: v } })} />
                      <Field label="Conflito" value={scene.conflict} onCommit={(v) => send({ action: 'updateScene', id: scene.id, patch: { conflict: v } })} />
                      <Field label="Mudança de estado" value={scene.stateChange} onCommit={(v) => send({ action: 'updateScene', id: scene.id, patch: { stateChange: v } })} />
                      <Field label="Gancho" value={scene.hook} onCommit={(v) => send({ action: 'updateScene', id: scene.id, patch: { hook: v } })} />
                      <label className="story-field">
                        <span>Mover para o capítulo</span>
                        <select value={scene.chapterId} onChange={(e) => send({ action: 'moveScene', id: scene.id, chapterId: e.target.value })}>
                          {data.chapters.map((item) => <option key={item.id} value={item.id}>{item.title || item.id}</option>)}
                        </select>
                      </label>
                    </div>
                  ))}
                </div>
              ))}
            </article>
          ))}
        </section>
      )}

      {tab === 'bible' && (
        <section className="panel">
          <h2><BookOpen size={16} /> Story Bible</h2>
          <p className="hint">17 seções geradas em Markdown. Regeneração atualiza só os blocos gerados e preserva o que você escrever.</p>
          <button type="button" className="primary" onClick={() => regenerate('story-bible')}>
            <RefreshCw size={14} aria-hidden="true" /> Atualizar Story Bible
          </button>
          <div className="chips">
            {(['premise', 'outline', 'narrative-decisions'] as const).map((kind) => (
              <button key={kind} type="button" className="chip" onClick={() => regenerate(kind)}>Atualizar {kind}</button>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
