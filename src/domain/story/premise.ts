/** Estágio 2 — Premissa. Todos os campos podem ficar incompletos (rascunho). */

export type PremiseApproval = 'draft' | 'approved' | 'edited';

export type PremiseField =
  | 'centralIdea'
  | 'logline'
  | 'premise'
  | 'shortSynopsis'
  | 'expandedSynopsis'
  | 'centralTheme'
  | 'dramaticQuestion'
  | 'narrativeProposition'
  | 'differentiator';

export const PREMISE_FIELDS: readonly PremiseField[] = [
  'centralIdea',
  'logline',
  'premise',
  'shortSynopsis',
  'expandedSynopsis',
  'centralTheme',
  'dramaticQuestion',
  'narrativeProposition',
  'differentiator',
];

export interface Premise {
  readonly centralIdea: string;
  readonly logline: string;
  readonly premise: string;
  readonly shortSynopsis: string;
  readonly expandedSynopsis: string;
  readonly centralTheme: string;
  readonly dramaticQuestion: string;
  readonly narrativeProposition: string;
  readonly differentiator: string;
  /** Cartas que estimularam cada campo; validadas pelo serviço contra o deck ativo. */
  readonly sourceCardIds: readonly string[];
  readonly approvals: Readonly<Record<PremiseField, PremiseApproval>>;
}

export function createEmptyPremise(): Premise {
  const approvals = {} as Record<PremiseField, PremiseApproval>;
  for (const field of PREMISE_FIELDS) {
    approvals[field] = 'draft';
  }
  return {
    centralIdea: '',
    logline: '',
    premise: '',
    shortSynopsis: '',
    expandedSynopsis: '',
    centralTheme: '',
    dramaticQuestion: '',
    narrativeProposition: '',
    differentiator: '',
    sourceCardIds: [],
    approvals,
  };
}

export function premiseFromJson(json: Partial<Premise> | undefined): Premise {
  const empty = createEmptyPremise();
  if (!json) {
    return empty;
  }
  const approvals = { ...empty.approvals };
  for (const field of PREMISE_FIELDS) {
    const value = json.approvals?.[field];
    if (value === 'approved' || value === 'edited' || value === 'draft') {
      approvals[field] = value;
    }
  }
  const result: Record<string, unknown> = {};
  for (const field of PREMISE_FIELDS) {
    result[field] = typeof json[field] === 'string' ? json[field] : '';
  }
  return {
    ...(result as Omit<Premise, 'sourceCardIds' | 'approvals'>),
    sourceCardIds: Array.isArray(json.sourceCardIds) ? [...new Set(json.sourceCardIds.filter((id) => typeof id === 'string' && id))] : [],
    approvals,
  };
}

export function premiseToJson(premise: Premise): Premise {
  return {
    ...premise,
    sourceCardIds: [...premise.sourceCardIds],
    approvals: { ...premise.approvals },
  };
}
