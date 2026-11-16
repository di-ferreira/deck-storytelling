import type { GenreProfile } from '../../domain/genre/genre-profile';

/**
 * Porta do Markdown do contrato de gênero (`Story/genre-contract.md`).
 * Implementações nunca sobrescrevem conteúdo do autor: criação é create-if-absent e
 * regeneração é sempre explícita.
 */
export interface GenreDocumentStore {
  loadContract(): Promise<string | undefined>;
  /** Cria o arquivo somente se ele não existir. `true` quando criou algo. */
  saveContractIfAbsent(markdown: string): Promise<boolean>;
  /** Regenera SOMENTE os blocos gerados do perfil atual, preservando blocos do usuário. */
  regenerateContract(profile: GenreProfile): Promise<{ changed: boolean }>;
}
