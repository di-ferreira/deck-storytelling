import type { RandomGenerator } from '../../application/ports/random-generator';

/** Implementação de produção; testes injetam um gerador semeado. */
export class MathRandomGenerator implements RandomGenerator {
  next(): number {
    return Math.random();
  }
}
