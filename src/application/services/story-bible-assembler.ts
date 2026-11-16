import type { StoryProject } from '../../domain/story/story-project';
import { PREMISE_FIELDS } from '../../domain/story/premise';
import type { StoryContext } from './story-context-builder';

export interface StoryBibleSection {
  readonly key: string;
  readonly title: string;
  readonly body: string;
}

export interface StoryBibleDocument {
  readonly sections: readonly StoryBibleSection[];
  readonly context: StoryContext;
  readonly project: StoryProject;
}

const EMPTY = '_A definir._';

/** Ordem canônica do master prompt §12. */
export const STORY_BIBLE_SECTION_TITLES = [
  'Identidade da obra',
  'Contrato de gênero',
  'Premissa e sinopse',
  'Temas',
  'Personagens',
  'Relacionamentos',
  'Conflitos',
  'Mundo',
  'Narrador e perspectiva',
  'Estrutura narrativa',
  'Atos',
  'Capítulos',
  'Cenas',
  'Técnicas escolhidas',
  'Segredos e revelações',
  'Decisões criativas',
  'Cartas utilizadas',
] as const;

/**
 * Monta as 17 seções na ordem canônica. Referências de cartas usam `[ID] título`.
 * Seção sem conteúdo recebe `_A definir._`. Nenhum texto é inventado.
 */
export class StoryBibleAssembler {
  build(project: StoryProject, context: StoryContext): StoryBibleDocument {
    const ref = (cardId: string): string =>
      context.cardTitles[cardId]
        ? `[${cardId}] ${context.cardTitles[cardId]}`
        : `[${cardId}] (carta ausente do deck ativo)`;
    const refs = (ids: readonly string[]): string => ids.filter(Boolean).map(ref).join(', ');
    const value = (text: string): string => (text.trim() ? text : EMPTY);
    const lines = (items: readonly string[]): string => (items.length ? items.join('\n\n') : EMPTY);

    const sections: StoryBibleSection[] = [];

    // 1 — Identidade
    sections.push({
      key: 'identity',
      title: STORY_BIBLE_SECTION_TITLES[0],
      body: lines([
        project.identity.provisionalTitle ? `**Título provisório:** ${project.identity.provisionalTitle}` : '',
        project.identity.initialDescription ? `**Descrição inicial:** ${project.identity.initialDescription}` : '',
        project.identity.period ? `**Período:** ${project.identity.period}` : '',
        refs(project.genre.secondaryGenreIds.length ? [project.genre.dominantGenreId, ...project.genre.secondaryGenreIds].filter(Boolean) : project.genre.dominantGenreId ? [project.genre.dominantGenreId] : []),
      ].filter(Boolean)),
    });

    // 2 — Contrato de gênero
    const contractEntries = [
      ['Promessa', project.genre.contract.promise],
      ['Motor', project.genre.contract.engine],
      ['Convenções', project.genre.contract.conventions],
      ['Liberdade', project.genre.contract.freedom],
      ['Recompensa', project.genre.contract.reward],
    ] as const;
    const dimensions = project.genre.dimensions;
    sections.push({
      key: 'genre-contract',
      title: STORY_BIBLE_SECTION_TITLES[1],
      body: lines([
        ...contractEntries.map(([label, text]) => (text.trim() ? `- **${label}:** ${text}` : '')),
        ...[
          ['Tom', dimensions.tone],
          ['Atmosfera', dimensions.atmosphere],
          ['Cenário', dimensions.setting],
          ['Público', dimensions.audience],
          ['Formato', dimensions.format],
          ['Extensão aproximada', dimensions.approximateLength],
        ].map(([label, text]) => (text.trim() ? `- **${label}:** ${text}` : '')),
      ].filter(Boolean)),
    });

    // 3 — Premissa e sinopse
    sections.push({
      key: 'premise',
      title: STORY_BIBLE_SECTION_TITLES[2],
      body: lines([
        ...PREMISE_FIELDS.map((field) => {
          const text = project.premise[field];
          return text.trim() ? `- **${field}:** ${text}` : '';
        }).filter(Boolean),
        project.premise.sourceCardIds.length ? `- **Cartas:** ${refs(project.premise.sourceCardIds)}` : '',
      ].filter(Boolean)),
    });

    // 4 — Temas
    sections.push({
      key: 'themes',
      title: STORY_BIBLE_SECTION_TITLES[3],
      body: value(project.premise.centralTheme || project.premise.narrativeProposition),
    });

    // 5 — Personagens
    sections.push({
      key: 'characters',
      title: STORY_BIBLE_SECTION_TITLES[4],
      body: lines(project.characters.map((character) => {
        const parts = [
          `### ${character.name || '(sem nome)'} [${character.id}]`,
          character.storyRole ? `**Papel:** ${character.storyRole}` : '',
          character.externalDesire ? `**Desejo externo:** ${character.externalDesire}` : '',
          character.internalNeed ? `**Necessidade interna:** ${character.internalNeed}` : '',
          character.arc ? `**Arco:** ${character.arc}` : '',
          [
            ...character.archetypeIds.map(ref),
            ...character.motivationCardIds.map(ref),
            ...character.emotionCardIds.map(ref),
          ].length
            ? `**Cartas:** ${refs([...character.archetypeIds, ...character.motivationCardIds, ...character.emotionCardIds])}`
            : '',
        ].filter(Boolean);
        return parts.join('\n\n');
      })),
    });

    // 6 — Relacionamentos
    sections.push({
      key: 'relationships',
      title: STORY_BIBLE_SECTION_TITLES[5],
      body: lines(project.relationships.map((relationship) =>
        [
          `### [${relationship.id}] ${relationship.fromCharacterId} → ${relationship.toCharacterId}`,
          relationship.nature ? `**Natureza:** ${relationship.nature}` : '',
          relationship.dynamic ? `**Dinâmica:** ${relationship.dynamic}` : '',
        ].filter(Boolean).join('\n\n'),
      )),
    });

    // 7 — Conflitos
    sections.push({
      key: 'conflicts',
      title: STORY_BIBLE_SECTION_TITLES[6],
      body: lines(project.conflicts.map((conflict) =>
        [
          `### [${conflict.id}] ${conflict.kind === 'main' ? 'Conflito principal' : 'Conflito secundário'}`,
          conflict.description ? conflict.description : '',
          conflict.linkedCharacterId ? `**Personagem:** [${conflict.linkedCharacterId}]` : '',
          conflict.linkedGoal ? `**Objetivo em risco:** ${conflict.linkedGoal}` : '',
          conflict.sourceCardIds.length ? `**Cartas:** ${refs(conflict.sourceCardIds)}` : '',
        ].filter(Boolean).join('\n\n'),
      )),
    });

    // 8 — Mundo
    const world = project.world;
    sections.push({
      key: 'world',
      title: STORY_BIBLE_SECTION_TITLES[7],
      body: lines([
        world.universe ? `**Universo:** ${world.universe}` : '',
        ...world.locations.map((location) => `- **[${location.id}] ${location.name || 'sem nome'}:** ${location.description}`),
        world.rules.length ? `**Regras:** ${world.rules.join('; ')}` : '',
        world.culture ? `**Cultura:** ${world.culture}` : '',
        world.society ? `**Sociedade:** ${world.society}` : '',
        world.customs.length ? `**Costumes:** ${world.customs.join('; ')}` : '',
        world.economy ? `**Economia:** ${world.economy}` : '',
        world.politics ? `**Política:** ${world.politics}` : '',
        world.technology ? `**Tecnologia:** ${world.technology}` : '',
        world.supernatural ? `**Sobrenatural:** ${world.supernatural}` : '',
        world.atmosphere ? `**Atmosfera:** ${world.atmosphere}` : '',
        world.sensoryTraits.length ? `**Traços sensoriais:** ${world.sensoryTraits.join('; ')}` : '',
        world.sourceCardIds.length ? `**Cartas:** ${refs(world.sourceCardIds)}` : '',
      ].filter(Boolean)),
    });

    // 9 — Narrador (o `person` padrão não conta como conteúdo do autor)
    const narrator = project.narrator;
    const narratorHasContent = Boolean(
      narrator.typeCardId || narrator.focus || narrator.knowledgeLevel || narrator.reliability ||
      narrator.perspectiveAlternation || narrator.informationLimits || narrator.sourceCardIds.length,
    );
    sections.push({
      key: 'narrator',
      title: STORY_BIBLE_SECTION_TITLES[8],
      body: narratorHasContent
        ? lines([
            narrator.typeCardId ? `**Tipo:** ${ref(narrator.typeCardId)}` : '',
            `**Pessoa:** ${narrator.person}`,
            narrator.focus ? `**Foco:** ${narrator.focus}` : '',
            narrator.knowledgeLevel ? `**Conhecimento:** ${narrator.knowledgeLevel}` : '',
            narrator.reliability ? `**Confiabilidade:** ${narrator.reliability}` : '',
            narrator.perspectiveAlternation ? `**Alternância:** ${narrator.perspectiveAlternation}` : '',
            narrator.informationLimits ? `**Limites de informação:** ${narrator.informationLimits}` : '',
            narrator.sourceCardIds.length ? `**Cartas:** ${refs(narrator.sourceCardIds)}` : '',
          ].filter(Boolean))
        : EMPTY,
    });

    // 10 — Estrutura narrativa
    sections.push({
      key: 'structures',
      title: STORY_BIBLE_SECTION_TITLES[9],
      body: lines(project.structures.map((choice) =>
        `- ${ref(choice.cardId)}${choice.intent ? ` — ${choice.intent}` : ''}`,
      )),
    });

    // 11 — Atos
    sections.push({
      key: 'acts',
      title: STORY_BIBLE_SECTION_TITLES[10],
      body: lines(context.acts.map(({ act, chapters }) =>
        [
          `### ${act.number}. ${act.title || '(sem título)'} [${act.id}]`,
          act.goal ? `**Objetivo:** ${act.goal}` : '',
          act.conflict ? `**Conflito:** ${act.conflict}` : '',
          act.turningPoints.length ? `**Viradas:** ${act.turningPoints.join('; ')}` : '',
          act.expectedOutcome ? `**Resultado esperado:** ${act.expectedOutcome}` : '',
          chapters.length ? `**Capítulos:** ${chapters.map((item) => `[${item.chapter.id}]`).join(', ')}` : '',
        ].filter(Boolean).join('\n\n'),
      )),
    });

    // 12 — Capítulos
    sections.push({
      key: 'chapters',
      title: STORY_BIBLE_SECTION_TITLES[11],
      body: lines(project.chapters.map((chapter) =>
        [
          `### ${chapter.number}. ${chapter.title || '(sem título)'} [${chapter.id}]`,
          `**Ato:** [${chapter.actId}]`,
          chapter.narrativeGoal ? `**Objetivo narrativo:** ${chapter.narrativeGoal}` : '',
          chapter.developmentStatus ? `**Status:** ${chapter.developmentStatus}` : '',
        ].filter(Boolean).join('\n\n'),
      )),
    });

    // 13 — Cenas
    sections.push({
      key: 'scenes',
      title: STORY_BIBLE_SECTION_TITLES[12],
      body: lines(project.scenes.map((scene) =>
        [
          `### ${scene.title || '(sem título)'} [${scene.id}]`,
          `**Capítulo:** [${scene.chapterId}]`,
          scene.goal ? `**Objetivo:** ${scene.goal}` : '',
          scene.focalCharacterId ? `**Personagem focal:** [${scene.focalCharacterId}]` : '',
          scene.conflict ? `**Conflito:** ${scene.conflict}` : '',
          scene.stateChange ? `**Mudança de estado:** ${scene.stateChange}` : '',
          scene.hook ? `**Gancho:** ${scene.hook}` : '',
          scene.sourceCardIds.length ? `**Cartas:** ${refs(scene.sourceCardIds)}` : '',
        ].filter(Boolean).join('\n\n'),
      )),
    });

    // 14 — Técnicas
    sections.push({
      key: 'techniques',
      title: STORY_BIBLE_SECTION_TITLES[13],
      body: lines(project.techniques.map((technique) =>
        `- ${ref(technique.cardId)} — ${technique.scope.type}${technique.intent ? `: ${technique.intent}` : ''}`,
      )),
    });

    // 15 — Segredos
    sections.push({
      key: 'secrets',
      title: STORY_BIBLE_SECTION_TITLES[14],
      body: lines(project.secrets.map((secret) =>
        [
          `### [${secret.id}] ${secret.description || '(sem descrição)'}`,
          `**Verdade factual:** ${value(secret.factualTruth)}`,
          `**Informação disponível ao leitor:** ${value(secret.readerAvailableInfo)}`,
          secret.revelationMoment ? `**Momento da revelação:** ${secret.revelationMoment}` : '',
          secret.sourceCardIds.length ? `**Cartas:** ${refs(secret.sourceCardIds)}` : '',
        ].join('\n\n'),
      )),
    });

    // 16 — Decisões criativas
    sections.push({
      key: 'decisions',
      title: STORY_BIBLE_SECTION_TITLES[15],
      body: lines(project.decisions.map((decision) =>
        [
          `### ${decision.title || '(sem título)'} [${decision.id}]`,
          value(decision.description),
          decision.cardIds.length ? `**Cartas:** ${refs(decision.cardIds)}` : '',
        ].filter(Boolean).join('\n\n'),
      )),
    });

    // 17 — Cartas utilizadas
    sections.push({
      key: 'cards',
      title: STORY_BIBLE_SECTION_TITLES[16],
      body: context.usedCardIds.length
        ? context.usedCardIds.map((cardId) => `- ${ref(cardId)}`).join('\n')
        : EMPTY,
    });

    return { sections, context, project };
  }
}
