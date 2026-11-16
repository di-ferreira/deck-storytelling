import { readFile } from 'node:fs/promises';
import type { Deck } from '../../domain/deck/deck';
import { toDeck } from '../../domain/deck/deck';
import { ENTRELINHAS_V4_EXPECTATIONS, validateDeck, type DeckExpectations } from '../../domain/deck/deck-validation';
import { deckSchema } from '../../shared/schemas/deck';
import type { DeckRepository } from '../../application/ports/deck-repository';

export class DeckLoadError extends Error {
  constructor(message: string, readonly issues: readonly string[]) {
    super(message);
    this.name = 'DeckLoadError';
  }
}

/** Expectativas são escolhidas pela versão declarada — o sistema não fica preso a 210 cartas. */
export function expectationsForVersion(version: string): DeckExpectations {
  return version.startsWith('4.') ? ENTRELINHAS_V4_EXPECTATIONS : {};
}

export class JsonDeckLoader implements DeckRepository {
  constructor(readonly sourcePath: string) {}

  async load(): Promise<Deck> {
    let raw: string;
    try {
      raw = await readFile(this.sourcePath, 'utf8');
    } catch (error) {
      throw new DeckLoadError(`Não foi possível ler o deck em ${this.sourcePath}.`, [String(error)]);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new DeckLoadError('deck_storytelling.json não é um JSON válido.', [String(error)]);
    }

    const result = deckSchema.safeParse(parsed);
    if (!result.success) {
      const issues = result.error.issues.map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`);
      throw new DeckLoadError('O deck falhou na validação estrutural.', issues);
    }

    const deck = result.data;
    const findings = validateDeck(deck, expectationsForVersion(deck.version));
    return toDeck(deck, findings);
  }
}
