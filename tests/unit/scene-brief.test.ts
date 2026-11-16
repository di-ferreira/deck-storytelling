import { describe, expect, it } from 'vitest';
import { SceneBriefService, type SceneBriefData } from '../../src/application/services/scene-brief-service';
import { escapeHtml, renderSceneBriefHtml } from '../../src/extension/views/scene-brief-html';
import { createEmptyIdentityDimensions } from '../../src/domain/genre/genre-profile';
import { createEmptyStoryProject } from '../../src/domain/story/story-project';
import { createEmptyAct, createEmptyChapter, createEmptyScene } from '../../src/domain/story/structure';
import type { Deck } from '../../src/domain/deck/deck';
import type { StoryProject } from '../../src/domain/story/story-project';

function makeProject(): StoryProject {
  const base = createEmptyStoryProject('proj', '4.0.0', '2026-01-01T00:00:00.000Z');
  const withAct = base.addAct({ ...createEmptyAct('ato-1', 1), title: 'Ato I — O Chamado' });
  const withChapter = withAct.addChapter({
    ...createEmptyChapter('cap-1', 'ato-1', 1),
    title: 'Capítulo 01',
  });
  return withChapter.addScene({
    ...createEmptyScene('cen-1', 'cap-1'),
    title: 'Cena do Encontro',
    goal: 'Encontrar a chave',
    conflict: 'A porta resiste',
    stateChange: 'A chave aparece',
    hook: 'Alguém observa',
    sourceCardIds: ['ST-1'],
  });
}

const deck = {
  index: {
    getById: (id: string) =>
      new Map([
        ['ST-1', { id: 'ST-1', title: 'Cliffhanger' }],
        ['GEN-1', { id: 'GEN-1', title: 'Mistério' }],
      ]).get(id),
  },
} as unknown as Deck;

describe('T67 — Scene Brief: escape HTML', () => {
  it('escapa todos os caracteres especiais', () => {
    expect(escapeHtml(`A & B <script> "q" 's'`)).toBe(
      'A &amp; B &lt;script&gt; &quot;q&quot; &#39;s&#39;',
    );
  });

  it('escapa valores não string', () => {
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml(42)).toBe('42');
  });
});

describe('T67 — Scene Brief: renderização estática com CSP restritivo', () => {
  const data: SceneBriefData = {
    sceneId: 'cen-1',
    title: '<img src=x onerror=alert(1)>Cena & Crítica',
    goal: 'Encontrar a <chave>',
    conflict: 'A porta resiste',
    stateChange: 'A chave aparece',
    hook: 'Alguém observa',
    chapterTitle: 'Capítulo 01',
    actTitle: 'Ato I — O Chamado',
    linkedCards: [{ cardId: 'ST-1', title: 'Cliffhanger', note: 'usar no clímax' }],
    dominantGenreTitle: 'Mistério',
    dimensions: { ...createEmptyIdentityDimensions(), tone: 'sombrio' },
    warnings: [{ code: 'UNKNOWN_CARD', message: 'Carta ausente <b>x</b>.', cardId: 'ST-9' }],
  };

  const html = renderSceneBriefHtml(data, 'nonce-teste');

  it('inclui CSP rígida, sem scripts e com localResourceRoots vazio', () => {
    expect(html).toContain("default-src 'none'");
    expect(html).toContain("style-src 'nonce-nonce-teste'");
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<img');
  });

  it('mostra título, objetivo, conflito, mudança e gancho escapados', () => {
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;Cena &amp; Crítica');
    expect(html).toContain('Encontrar a &lt;chave&gt;');
    expect(html).toContain('A porta resiste');
    expect(html).toContain('A chave aparece');
    expect(html).toContain('Alguém observa');
  });

  it('mostra capítulo/ato, cartas vinculadas, gênero, dimensões e avisos', () => {
    expect(html).toContain('Capítulo 01');
    expect(html).toContain('Ato I — O Chamado');
    expect(html).toContain('Cliffhanger');
    expect(html).toContain('usar no clímax');
    expect(html).toContain('Mistério');
    expect(html).toContain('sombrio');
    expect(html).toContain('Carta ausente &lt;b&gt;x&lt;/b&gt;.');
  });
});

describe('T67 — Scene Brief: montagem dos dados a partir dos serviços', () => {
  function makeService() {
    return new SceneBriefService({
      story: { getProject: async () => makeProject() },
      selection: {
        getSelection: async () => ({
          links: [
            {
              cardId: 'ST-1',
              target: { type: 'scene' as const, sceneId: 'cen-1' },
              createdAt: '2026-01-01T00:00:00.000Z',
              note: 'clímax',
            },
            {
              cardId: 'GEN-1',
              target: { type: 'scene' as const, sceneId: 'outra-cena' },
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        }),
      },
      genre: {
        getProfile: async () => ({
          dominantGenreId: 'GEN-1',
          secondaryGenreIds: [],
          subGenresByGenre: {},
          contract: { promise: '', engine: '', conventions: '', freedom: '', reward: '' },
          dimensions: { ...createEmptyIdentityDimensions(), tone: 'sombrio' },
        }),
      },
      deck: { load: async () => deck },
    });
  }

  it('monta o brief da cena com capítulo, ato, cartas vinculadas e gênero', async () => {
    const brief = await makeService().build('cen-1');
    expect(brief).toBeDefined();
    expect(brief?.sceneId).toBe('cen-1');
    expect(brief?.chapterTitle).toBe('Capítulo 01');
    expect(brief?.actTitle).toBe('Ato I — O Chamado');
    expect(brief?.linkedCards).toEqual([{ cardId: 'ST-1', title: 'Cliffhanger', note: 'clímax' }]);
    expect(brief?.dominantGenreTitle).toBe('Mistério');
    expect(brief?.dimensions.tone).toBe('sombrio');
  });

  it('devolve undefined para cena inexistente', async () => {
    expect(await makeService().build('inexistente')).toBeUndefined();
  });
});
