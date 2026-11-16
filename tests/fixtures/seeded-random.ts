import type { RandomGenerator } from '../../src/application/ports/random-generator';

/** Gerador linear congruente semeado: determinístico entre execuções. */
export function seededRandom(seed = 42): RandomGenerator {
  let state = seed >>> 0;
  return {
    next(): number {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    },
  };
}
