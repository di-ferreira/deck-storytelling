import type { GenreCardJson } from '../../shared/schemas/deck';
import { normalizeSubGenreName } from './sub-genre-resolver';

/**
 * Mapa CONSULTIVO de rótulos de `compatible_genres`.
 *
 * ADR-04: `compatible_genres` é orientação editorial, nunca restrição. Este índice
 * tenta ligar um rótulo a gêneros/subgêneros ativos para exibição e sugestão; rótulos
 * sem correspondência (os 12 documentados em `DECK_SCHEMA.md` §9) permanecem texto puro.
 * Nenhuma função aqui bloqueia, filtra ou invalida uma combinação de gêneros.
 */

export interface CompatibleGenreMatch {
  readonly genreIds: readonly string[];
  readonly subGenreNames: readonly string[];
}

export interface CompatibleGenreResolution extends CompatibleGenreMatch {
  readonly label: string;
  readonly matched: boolean;
}

interface MutableMatch {
  readonly genreIds: Set<string>;
  readonly subGenreNames: Set<string>;
}

export class CompatibleGenreIndex {
  private readonly byLabel = new Map<string, MutableMatch>();

  constructor(genreCards: readonly GenreCardJson[]) {
    for (const card of genreCards) {
      this.add(card.title, card.id);
      this.add(card.source_concept, card.id);
      this.add(card.genre_family, card.id);
      for (const name of card.sub_genre) {
        this.add(name, card.id, name);
      }
      for (const detail of card.sub_genre_details) {
        this.add(detail.name, card.id, detail.name);
      }
    }
  }

  /** Número de rótulos normalizados distintos conhecidos. */
  get size(): number {
    return this.byLabel.size;
  }

  lookup(label: string): CompatibleGenreMatch | undefined {
    const match = this.byLabel.get(normalizeSubGenreName(label));
    if (!match) {
      return undefined;
    }
    return {
      genreIds: [...match.genreIds],
      subGenreNames: [...match.subGenreNames],
    };
  }

  /** Nunca lança: rótulo desconhecido volta como `matched: false` e texto puro. */
  resolve(label: string): CompatibleGenreResolution {
    const match = this.lookup(label);
    if (!match) {
      return { label, matched: false, genreIds: [], subGenreNames: [] };
    }
    return { label, matched: true, ...match };
  }

  resolveAll(labels: readonly string[]): readonly CompatibleGenreResolution[] {
    return labels.map((label) => this.resolve(label));
  }

  private add(label: string, genreId: string, subGenreName?: string): void {
    const key = normalizeSubGenreName(label);
    if (!key) {
      return;
    }
    let match = this.byLabel.get(key);
    if (!match) {
      match = { genreIds: new Set<string>(), subGenreNames: new Set<string>() };
      this.byLabel.set(key, match);
    }
    match.genreIds.add(genreId);
    if (subGenreName) {
      match.subGenreNames.add(subGenreName);
    }
  }
}

export function createCompatibleGenreIndex(
  genreCards: readonly GenreCardJson[],
): CompatibleGenreIndex {
  return new CompatibleGenreIndex(genreCards);
}
