/**
 * Porta de aleatoriedade. O domínio recebe apenas `random: () => number`,
 * permitindo sorteios determinísticos nos testes.
 */
export interface RandomGenerator {
  /** Valor em [0, 1). */
  next(): number;
}
