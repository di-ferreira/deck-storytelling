import type { Deck } from '../../domain/deck/deck';
import type { GenreCardJson } from '../../shared/schemas/deck';
import type { GenreProfile } from '../../domain/genre/genre-profile';
import { resolveSubGenres, type ResolvedSubGenre } from '../../domain/genre/sub-genre-resolver';

/**
 * Renderização do contrato de gênero em Markdown.
 *
 * - Os títulos das 5 seções vêm de `usage.genre_contract` do deck (cortados no primeiro
 *   `:`); nada de títulos de gênero hardcoded.
 * - `source_card_id` dos subgêneros é impresso como RASTREIO histórico, nunca como carta.
 * - O documento só é gerado/regenerado por ação explícita (ver `genre-contract-document.ts`).
 */

export type GenreContractField = 'promise' | 'engine' | 'conventions' | 'freedom' | 'reward';

export const GENRE_CONTRACT_FIELDS: readonly GenreContractField[] = [
  'promise',
  'engine',
  'conventions',
  'freedom',
  'reward',
];

export const GENRE_CONTRACT_HEADING = '# Contrato de Gênero';

export interface GenreContractSection {
  readonly field: GenreContractField;
  /** Rótulo do deck, sem a pergunta (texto antes do primeiro `:`). */
  readonly title: string;
  /** Pergunta editorial do deck (texto após o primeiro `:`). */
  readonly question: string;
  readonly value: string;
}

export interface RenderedGenreBlock {
  readonly key: string;
  readonly markdown: string;
}

const FALLBACK_TITLES: Readonly<Record<GenreContractField, string>> = {
  promise: 'Promessa',
  engine: 'Motor',
  conventions: 'Convenções',
  freedom: 'Liberdade',
  reward: 'Recompensa',
};

function normalizeLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

function fieldForTitle(title: string): GenreContractField | undefined {
  const label = normalizeLabel(title);
  if (label.startsWith('promessa')) return 'promise';
  if (label.startsWith('motor')) return 'engine';
  if (label.startsWith('convenc')) return 'conventions';
  if (label.startsWith('liberdade')) return 'freedom';
  if (label.startsWith('recompensa')) return 'reward';
  return undefined;
}

/** Títulos/perguntas editoriais na ordem canônica, lidos de `usage.genre_contract`. */
export function genreContractSections(profile: GenreProfile, deck: Deck): readonly GenreContractSection[] {
  const labels = new Map<GenreContractField, { title: string; question: string }>();
  const usage = deck.usage.genre_contract;
  usage.forEach((entry, position) => {
    const separator = entry.indexOf(':');
    const title = (separator === -1 ? entry : entry.slice(0, separator)).trim();
    const question = separator === -1 ? '' : entry.slice(separator + 1).trim();
    const field = fieldForTitle(title) ?? GENRE_CONTRACT_FIELDS[position];
    if (field && !labels.has(field)) {
      labels.set(field, { title: title || FALLBACK_TITLES[field], question });
    }
  });

  return GENRE_CONTRACT_FIELDS.map((field) => {
    const label = labels.get(field);
    return {
      field,
      title: label?.title ?? FALLBACK_TITLES[field],
      question: label?.question ?? '',
      value: profile.contract[field],
    };
  });
}

function generatedMarkers(key: string): { start: string; end: string } {
  return {
    start: `<!-- story-deck:generated:start:${key} -->`,
    end: `<!-- story-deck:generated:end:${key} -->`,
  };
}

export function userBlockMarkers(key: string): { start: string; end: string } {
  return {
    start: `<!-- story-deck:user:start:${key} -->`,
    end: `<!-- story-deck:user:end:${key} -->`,
  };
}

export function renderGeneratedBlock(key: string, body: string): string {
  const markers = generatedMarkers(key);
  return `${markers.start}\n${body.trim()}\n${markers.end}`;
}

export function renderUserBlock(key: string, existingContent = ''): string {
  const markers = userBlockMarkers(key);
  const content = existingContent.trim();
  return content ? `${markers.start}\n${content}\n${markers.end}` : `${markers.start}\n${markers.end}`;
}

function resolveGenreCard(deck: Deck, genreId: string): GenreCardJson | undefined {
  const card = deck.index.getById(genreId.trim());
  return card && card.kind === 'genre_definition' ? card : undefined;
}

function renderGenresBlock(profile: GenreProfile, deck: Deck): string {
  const lines: string[] = ['## Gêneros da obra', ''];

  const dominantId = profile.dominantGenreId.trim();
  if (!dominantId) {
    lines.push('- **Dominante:** _Rascunho — nenhum gênero dominante definido._');
  } else {
    const dominant = resolveGenreCard(deck, dominantId);
    lines.push(
      dominant
        ? `- **Dominante:** [${dominant.id}] ${dominant.title}`
        : `- **Dominante:** ${dominantId} _(não encontrado no deck atual)_`,
    );
  }

  if (profile.secondaryGenreIds.length === 0) {
    lines.push('- **Secundários:** _nenhum_');
  } else {
    for (const genreId of profile.secondaryGenreIds) {
      const card = resolveGenreCard(deck, genreId);
      lines.push(
        card
          ? `- **Secundário:** [${card.id}] ${card.title}`
          : `- **Secundário:** ${genreId} _(não encontrado no deck atual)_`,
      );
    }
  }

  const dimensions = profile.dimensions;
  if (
    dimensions.tone ||
    dimensions.atmosphere ||
    dimensions.setting ||
    dimensions.audience ||
    dimensions.format ||
    dimensions.approximateLength
  ) {
    lines.push('', '### Dimensões de identidade', '');
    if (dimensions.tone) lines.push(`- **Tom:** ${dimensions.tone}`);
    if (dimensions.atmosphere) lines.push(`- **Atmosfera:** ${dimensions.atmosphere}`);
    if (dimensions.setting) lines.push(`- **Cenário:** ${dimensions.setting}`);
    if (dimensions.audience) lines.push(`- **Público:** ${dimensions.audience}`);
    if (dimensions.format) lines.push(`- **Formato:** ${dimensions.format}`);
    if (dimensions.approximateLength) lines.push(`- **Extensão aproximada:** ${dimensions.approximateLength}`);
  }

  return lines.join('\n');
}

function selectedSubGenres(profile: GenreProfile, deck: Deck): readonly ResolvedSubGenre[] {
  const selectedIds = [profile.dominantGenreId, ...profile.secondaryGenreIds].filter(Boolean);
  const resolved: ResolvedSubGenre[] = [];
  for (const genreId of selectedIds) {
    const card = resolveGenreCard(deck, genreId);
    if (!card) {
      continue;
    }
    resolved.push(...resolveSubGenres(card, profile.subGenresByGenre[card.id] ?? []));
  }
  return resolved;
}

function renderSubGenresBlock(profile: GenreProfile, deck: Deck): string {
  const lines: string[] = ['## Subgêneros escolhidos', ''];
  const subGenres = selectedSubGenres(profile, deck);

  if (subGenres.length === 0) {
    lines.push('_Nenhum subgênero selecionado._');
    return lines.join('\n');
  }

  for (const item of subGenres) {
    const parent = resolveGenreCard(deck, item.parentGenreId);
    const parentLabel = parent ? `[${parent.id}] ${parent.title} → ` : `[${item.parentGenreId}] `;
    lines.push(`### ${parentLabel}${item.name}`, '');
    lines.push(`- **Rastreio histórico:** \`${item.sourceCardId}\``);
    lines.push(`- **Promessa ao leitor:** ${item.detail.reader_promise}`);
    lines.push(`- **Convenções centrais:** ${item.detail.core_conventions}`);
    lines.push(`- **Armadilhas:** ${item.detail.pitfalls}`);
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}

/** Blocos gerados na ordem do documento: cabeçalho, gêneros, subgêneros e 5 seções. */
export function renderGenreContractBlocks(
  profile: GenreProfile,
  deck: Deck,
): readonly RenderedGenreBlock[] {
  const blocks: RenderedGenreBlock[] = [
    {
      key: 'header',
      markdown: renderGeneratedBlock(
        'header',
        [
          GENRE_CONTRACT_HEADING,
          '',
          'Documento do projeto gerado a partir do deck ENTRELINHAS v4.',
          'Edite apenas os blocos `story-deck:user`; a regeneração explícita atualiza somente os blocos `story-deck:generated`.',
        ].join('\n'),
      ),
    },
    { key: 'genres', markdown: renderGeneratedBlock('genres', renderGenresBlock(profile, deck)) },
    { key: 'subgenres', markdown: renderGeneratedBlock('subgenres', renderSubGenresBlock(profile, deck)) },
  ];

  for (const section of genreContractSections(profile, deck)) {
    const title = section.question ? `## ${section.title}: ${section.question}` : `## ${section.title}`;
    const value = section.value.trim() ? section.value : '_A definir._';
    blocks.push({
      key: section.field,
      markdown: renderGeneratedBlock(section.field, `${title}\n\n${value}`),
    });
  }

  return blocks;
}

/** Documento inicial: blocos gerados + blocos de usuário vazios nas 5 seções do contrato. */
export function renderGenreContractDocument(profile: GenreProfile, deck: Deck): string {
  const parts: string[] = [];
  for (const block of renderGenreContractBlocks(profile, deck)) {
    parts.push(block.markdown);
    if ((GENRE_CONTRACT_FIELDS as readonly string[]).includes(block.key)) {
      parts.push(renderUserBlock(block.key));
    }
  }
  return `${parts.join('\n\n')}\n`;
}
