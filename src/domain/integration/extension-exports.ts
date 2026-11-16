/**
 * Leitura segura de `Extension.exports`.
 *
 * No VS Code, acessar `exports` de uma extensão instalada mas NÃO ativada lança
 * "Extension '<id>' is not known or not activated". A detecção de integração
 * nunca deve derrubar a ativação do Story Deck por causa disso.
 */
export interface ExtensionLike {
  readonly isActive: boolean;
  readonly exports: unknown;
}

export function safeExtensionExports(extension: ExtensionLike | undefined): unknown {
  if (!extension || !extension.isActive) {
    return undefined;
  }
  try {
    return extension.exports;
  } catch {
    return undefined;
  }
}
