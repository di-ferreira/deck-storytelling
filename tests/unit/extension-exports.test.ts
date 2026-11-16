import { describe, expect, it } from 'vitest';
import { safeExtensionExports } from '../../src/domain/integration/extension-exports';

describe('leitura segura de Extension.exports (regressão de ativação)', () => {
  it('retorna undefined quando a extensão não existe', () => {
    expect(safeExtensionExports(undefined)).toBeUndefined();
  });

  it('NÃO acessa exports de extensão instalada mas inativa', () => {
    const extension = {
      isActive: false,
      get exports(): unknown {
        throw new Error('Extension is not known or not activated');
      },
    };
    expect(safeExtensionExports(extension)).toBeUndefined();
  });

  it('retorna undefined se o getter de exports lançar', () => {
    const extension = {
      isActive: true,
      get exports(): unknown {
        throw new Error('boom');
      },
    };
    expect(safeExtensionExports(extension)).toBeUndefined();
  });

  it('retorna a API quando a extensão está ativa', () => {
    const api = { createSomething: () => true };
    expect(safeExtensionExports({ isActive: true, exports: api })).toBe(api);
  });
});
