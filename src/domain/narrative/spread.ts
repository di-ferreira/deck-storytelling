import type { CardJson } from '../../shared/schemas/deck';
import type {
  SpreadDefinition,
  SpreadSlot,
  SpreadState,
  SpreadStatus,
} from '../../shared/schemas/spread';

export type { SpreadDefinition, SpreadSlot, SpreadState, SpreadStatus } from '../../shared/schemas/spread';

export const SPREAD_STATUS: readonly SpreadStatus[] = ['idle', 'in-progress', 'complete'];

/** Slots preenchidos de um estado, na ordem declarada pela tiragem. */
export function slotCardIdsOf(state: SpreadState, slotId: string): readonly string[] {
  return state.slotCardIds[slotId] ?? [];
}

/** Quantidade total esperada da tiragem. */
export function spreadCardCount(spread: SpreadDefinition): number {
  return spread.slots.reduce((total, slot) => total + slot.count, 0);
}

export function isSlotFilled(slot: SpreadSlot, cardIds: readonly string[]): boolean {
  return cardIds.length >= slot.count;
}

export function deriveSpreadStatus(
  spread: SpreadDefinition,
  slotCardIds: Readonly<Record<string, readonly string[]>>,
): SpreadStatus {
  let filledSlots = 0;
  let filledCards = 0;
  for (const slot of spread.slots) {
    const ids = slotCardIds[slot.id] ?? [];
    if (ids.length > 0) {
      filledSlots += 1;
    }
    filledCards += ids.length;
  }
  if (filledCards === 0) {
    return 'idle';
  }
  const complete = spread.slots.every((slot) => (slotCardIds[slot.id] ?? []).length >= slot.count);
  if (complete) {
    return 'complete';
  }
  return filledSlots > 0 ? 'in-progress' : 'idle';
}

export function isSpreadComplete(spread: SpreadDefinition, state: SpreadState): boolean {
  return deriveSpreadStatus(spread, state.slotCardIds) === 'complete';
}

/**
 * Monta o resultado apenas com dados citados: `drawText` original, rótulos dos
 * slots e `[ID] título` das cartas. Nunca inventa conteúdo narrativo.
 */
export function renderSpreadResult(
  spread: SpreadDefinition,
  state: SpreadState,
  resolveCard: (cardId: string) => CardJson | undefined,
): string | undefined {
  if (!isSpreadComplete(spread, state)) {
    return undefined;
  }

  const lines: string[] = [`## ${spread.name}`, '', `> ${spread.drawText}`, '', `**Propósito:** ${spread.purpose}`, ''];

  for (const slot of spread.slots) {
    lines.push(`### ${slot.label}`, '');
    const ids = slotCardIdsOf(state, slot.id);
    for (const cardId of ids) {
      const card = resolveCard(cardId);
      lines.push(card ? `- [${card.id}] ${card.title}` : `- [${cardId}]`);
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}
