import type { CardKind, DeckJson } from '../../shared/schemas/deck';
import type { ValidationFinding } from '../../shared/types';

/**
 * Regras semânticas do deck. Puras: recebem o JSON já validado estruturalmente
 * e devolvem findings. Nenhuma regra altera o conteúdo original.
 */

export interface DeckExpectations {
  readonly cardCount?: number;
  readonly categoryCount?: number;
  readonly kindCounts?: Partial<Record<CardKind, number>>;
  readonly genreCardsWithSubgenres?: number;
  readonly subGenreDetailCount?: number;
}

/** Expectativas específicas da v4.0.0; versões futuras podem declarar as suas. */
export const ENTRELINHAS_V4_EXPECTATIONS: DeckExpectations = {
  cardCount: 210,
  categoryCount: 17,
  kindCounts: {
    genre_definition: 32,
    creative_prompt: 89,
    technique: 34,
    archetype: 26,
    structure: 15,
    narrator: 12,
    craft_warning: 2,
  },
  genreCardsWithSubgenres: 8,
  subGenreDetailCount: 31,
};

function finding(severity: ValidationFinding['severity'], code: string, message: string): ValidationFinding {
  return { severity, code, message };
}

export function validateDeck(json: DeckJson, expected: DeckExpectations = {}): readonly ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const cards = json.cards;
  const genres = cards.filter((card) => card.kind === 'genre_definition');

  // Contagens declaradas x reais
  if (json.card_count !== cards.length) {
    findings.push(finding('error', 'COUNT_CARDS', `card_count declara ${json.card_count}, mas há ${cards.length} cartas.`));
  }
  if (json.category_count !== json.categories.length) {
    findings.push(finding('error', 'COUNT_CATEGORIES', `category_count declara ${json.category_count}, mas há ${json.categories.length} categorias.`));
  }

  // Expectativas parametrizadas por versão
  if (expected.cardCount !== undefined && cards.length !== expected.cardCount) {
    findings.push(finding('error', 'EXPECTED_CARDS', `Esperadas ${expected.cardCount} cartas; encontradas ${cards.length}.`));
  }
  if (expected.categoryCount !== undefined && json.categories.length !== expected.categoryCount) {
    findings.push(finding('error', 'EXPECTED_CATEGORIES', `Esperadas ${expected.categoryCount} categorias; encontradas ${json.categories.length}.`));
  }
  for (const [kind, count] of Object.entries(expected.kindCounts ?? {})) {
    const actual = cards.filter((card) => card.kind === kind).length;
    if (actual !== count) {
      findings.push(finding('error', 'EXPECTED_KIND', `Esperadas ${count} cartas do tipo ${kind}; encontradas ${actual}.`));
    }
  }

  // Identificadores únicos
  const ids = new Set<string>();
  for (const card of cards) {
    if (ids.has(card.id)) {
      findings.push(finding('error', 'DUPLICATE_ID', `ID duplicado: ${card.id}.`));
    }
    ids.add(card.id);
  }

  // Referências de categoria
  const categoryIds = new Set(json.categories.map((category) => category.id));
  for (const card of cards) {
    if (!categoryIds.has(card.category_id)) {
      findings.push(finding('error', 'UNKNOWN_CATEGORY', `${card.id} referencia categoria inexistente ${card.category_id}.`));
    }
  }

  // Subgêneros: correspondência 1:1 entre sub_genre e sub_genre_details
  const genreIdsWithSubgenres = genres.filter((genre) => genre.sub_genre_details.length > 0);
  if (expected.genreCardsWithSubgenres !== undefined && genreIdsWithSubgenres.length !== expected.genreCardsWithSubgenres) {
    findings.push(finding('error', 'SUBGENRE_PARENTS', `Esperadas ${expected.genreCardsWithSubgenres} cartas-mãe com subgêneros; encontradas ${genreIdsWithSubgenres.length}.`));
  }
  let detailCount = 0;
  for (const genre of genres) {
    detailCount += genre.sub_genre_details.length;
    if (genre.sub_genre.length !== genre.sub_genre_details.length) {
      findings.push(finding('error', 'SUBGENRE_LENGTH', `${genre.id}: sub_genre (${genre.sub_genre.length}) ≠ sub_genre_details (${genre.sub_genre_details.length}).`));
    }
    const detailNames = new Set(genre.sub_genre_details.map((detail) => detail.name));
    for (const name of genre.sub_genre) {
      if (!detailNames.has(name)) {
        findings.push(finding('error', 'SUBGENRE_MISSING_DETAIL', `${genre.id}: "${name}" não possui definição detalhada.`));
      }
    }
  }
  if (expected.subGenreDetailCount !== undefined && detailCount !== expected.subGenreDetailCount) {
    findings.push(finding('error', 'SUBGENRE_DETAILS', `Esperados ${expected.subGenreDetailCount} detalhes de subgênero; encontrados ${detailCount}.`));
  }

  // Auditoria editorial: fechamento aritmético da consolidação
  const audit = json.editorial_audit;
  const mergedGenreIds = audit.genre_consolidations.reduce((sum, item) => sum + item.merged_card_ids.length, 0);
  if (audit.source_card_count - mergedGenreIds - audit.non_genre_cards_removed.length !== audit.result_card_count) {
    findings.push(finding('error', 'AUDIT_ARITHMETIC', `Consolidação editorial não fecha: ${audit.source_card_count} - ${mergedGenreIds} - ${audit.non_genre_cards_removed.length} ≠ ${audit.result_card_count}.`));
  }
  if (audit.genre_cards_before - mergedGenreIds !== audit.genre_cards_after) {
    findings.push(finding('error', 'AUDIT_GENRE_COUNTS', `Gêneros: ${audit.genre_cards_before} - ${mergedGenreIds} ≠ ${audit.genre_cards_after}.`));
  }
  if (audit.result_card_count !== cards.length) {
    findings.push(finding('error', 'AUDIT_RESULT', `editorial_audit.result_card_count (${audit.result_card_count}) ≠ cartas ativas (${cards.length}).`));
  }

  // Campos de adaptação preservados nas cartas não-gênero (checagem semântica redundante)
  for (const card of cards) {
    if (card.kind !== 'genre_definition') {
      if (!card.genre_adaptation || !card.genre_relevant_axis) {
        findings.push(finding('error', 'MISSING_ADAPTATION', `${card.id} perdeu genre_adaptation ou genre_relevant_axis.`));
      }
    }
  }

  // Rastreabilidade histórica: source_card_id NÃO deve estar no catálogo ativo
  const historicalIds = genres.flatMap((genre) => genre.sub_genre_details.map((detail) => detail.source_card_id));
  const activeHistorical = historicalIds.filter((id) => ids.has(id));
  if (activeHistorical.length > 0) {
    findings.push(finding('error', 'HISTORICAL_CARD_ACTIVE', `IDs históricos presentes no catálogo ativo: ${activeHistorical.join(', ')}.`));
  } else {
    findings.push(finding('info', 'HISTORICAL_TRACE', `${historicalIds.length} source_card_id preservados como rastreabilidade (fora do catálogo ativo).`));
  }

  // compatible_genres é consultivo: rótulos não exatos geram aviso, nunca erro
  const knownLabels = new Set<string>([
    ...cards.map((card) => card.source_concept),
    ...genres.flatMap((genre) => genre.sub_genre),
    ...genres.flatMap((genre) => genre.sub_genre_details.map((detail) => detail.name)),
  ]);
  // Apenas os valores de compatibilidade das cartas de gênero de nível superior
  // entram neste diagnóstico, conforme DECK_SCHEMA.md §9.
  const allCompatible = genres.flatMap((genre) => genre.compatible_genres);
  const unresolved = [...new Set(allCompatible.filter((label) => !knownLabels.has(label)))].sort();
  if (unresolved.length > 0) {
    findings.push(finding('warning', 'COMPATIBLE_GENRE_LABELS', `${unresolved.length} rótulos de compatible_genres são consultivos (sem carta ativa correspondente): ${unresolved.join('; ')}.`));
  }

  // Princípios editoriais e contrato de uso
  if (json.editorial_principles.length < 6) {
    findings.push(finding('error', 'EDITORIAL_PRINCIPLES', `Esperados ao menos 6 princípios editoriais; encontrados ${json.editorial_principles.length}.`));
  }
  if (json.usage.genre_contract.length < 5) {
    findings.push(finding('error', 'GENRE_CONTRACT', `Esperadas ao menos 5 perguntas de contrato de gênero; encontradas ${json.usage.genre_contract.length}.`));
  }
  if (json.usage.recommended_spreads.length < 4) {
    findings.push(finding('error', 'RECOMMENDED_SPREADS', `Esperadas ao menos 4 tiragens recomendadas; encontradas ${json.usage.recommended_spreads.length}.`));
  }

  return findings;
}

export function countBySeverity(findings: readonly ValidationFinding[]): {
  errors: number;
  warnings: number;
  infos: number;
} {
  return {
    errors: findings.filter((item) => item.severity === 'error').length,
    warnings: findings.filter((item) => item.severity === 'warning').length,
    infos: findings.filter((item) => item.severity === 'info').length,
  };
}
