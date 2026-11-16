import type { CardLinkTargetJson } from '../../shared/schemas/selection';

export const KIND_LABELS: Readonly<Record<string, string>> = {
  genre_definition: 'Gênero',
  creative_prompt: 'Prompt criativo',
  archetype: 'Arquétipo',
  narrator: 'Narrador',
  structure: 'Estrutura',
  technique: 'Técnica',
  craft_warning: 'Alerta de ofício',
};

export type LinkTargetType = CardLinkTargetJson['type'];

export const LINK_TARGET_LABELS: Readonly<Record<LinkTargetType, string>> = {
  project: 'Obra inteira',
  decision: 'Decisão',
  genre: 'Gênero',
  character: 'Personagem',
  act: 'Ato',
  chapter: 'Capítulo',
  scene: 'Cena',
};

export const LINK_TARGET_ID_FIELD: Readonly<Record<Exclude<LinkTargetType, 'project'>, string>> = {
  decision: 'decisionId',
  genre: 'genreId',
  character: 'characterId',
  act: 'actId',
  chapter: 'chapterId',
  scene: 'sceneId',
};

/** Converte o formulário em um alvo tipado; `undefined` quando falta o ID. */
export function buildLinkTarget(type: LinkTargetType, id: string): CardLinkTargetJson | undefined {
  if (type === 'project') {
    return { type: 'project' };
  }
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  switch (type) {
    case 'decision':
      return { type, decisionId: trimmed };
    case 'genre':
      return { type, genreId: trimmed };
    case 'character':
      return { type, characterId: trimmed };
    case 'act':
      return { type, actId: trimmed };
    case 'chapter':
      return { type, chapterId: trimmed };
    case 'scene':
      return { type, sceneId: trimmed };
  }
}

export function describeLinkTarget(target: CardLinkTargetJson): string {
  switch (target.type) {
    case 'project':
      return LINK_TARGET_LABELS.project;
    case 'decision':
      return `${LINK_TARGET_LABELS.decision} · ${target.decisionId}`;
    case 'genre':
      return `${LINK_TARGET_LABELS.genre} · ${target.genreId}`;
    case 'character':
      return `${LINK_TARGET_LABELS.character} · ${target.characterId}`;
    case 'act':
      return `${LINK_TARGET_LABELS.act} · ${target.actId}`;
    case 'chapter':
      return `${LINK_TARGET_LABELS.chapter} · ${target.chapterId}`;
    case 'scene':
      return `${LINK_TARGET_LABELS.scene} · ${target.sceneId}`;
  }
}

export function formatDateTime(iso: string): string {
  if (!iso) {
    return '';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString('pt-BR');
}

export const SPREAD_STATUS_LABELS: Readonly<Record<string, string>> = {
  idle: 'não iniciada',
  'in-progress': 'em andamento',
  complete: 'completa',
};
