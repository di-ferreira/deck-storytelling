import { describe, expect, it } from 'vitest';
import {
  hostToWebviewMessageSchema,
  webviewToHostMessageSchema,
} from '../../src/shared/messages';

describe('protocolo de mensagens validado (T22)', () => {
  it('aceita intenções semânticas conhecidas', () => {
    expect(webviewToHostMessageSchema.safeParse({ type: 'ready' }).success).toBe(true);
    expect(webviewToHostMessageSchema.safeParse({ type: 'selectCard', cardId: 'ST-012' }).success).toBe(true);
    expect(
      webviewToHostMessageSchema.safeParse({ type: 'setFilter', query: 'cliffhanger', categoryId: 'CAT-14' }).success,
    ).toBe(true);
    expect(
      webviewToHostMessageSchema.safeParse({
        type: 'setFilter',
        query: 'misterio',
        categoryId: 'CAT-14',
        kind: 'genre_definition',
        tag: 'suspense',
        view: 'favorites',
      }).success,
    ).toBe(true);
  });

  it('rejeita mensagens arbitrárias e campos inválidos', () => {
    expect(webviewToHostMessageSchema.safeParse({ type: 'executeCommand', command: 'rm -rf' }).success).toBe(false);
    expect(webviewToHostMessageSchema.safeParse({ type: 'selectCard' }).success).toBe(false);
    expect(webviewToHostMessageSchema.safeParse({ type: 'setFilter', query: 42 }).success).toBe(false);
    expect(webviewToHostMessageSchema.safeParse({ type: 'setFilter', view: 'spreads' }).success).toBe(false);
  });

  it('valida o payload enviado pelo host', () => {
    const message = {
      type: 'overview',
      payload: {
        deckId: 'entrelinhas-storytelling-v4',
        deckVersion: '4.0.0',
        language: 'pt-BR',
        cardCount: 210,
        categoryCount: 17,
        categories: [],
        kinds: {},
        findings: { errors: 0, warnings: 1, infos: 1 },
        novelAssistant: { installed: true, version: '0.1.0' },
        projectRoot: null,
      },
    };
    expect(hostToWebviewMessageSchema.safeParse(message).success).toBe(true);
  });
});

describe('T39 — protocolo da seleção e das tiragens', () => {
  const validIntents = [
    { type: 'getSelection' },
    { type: 'deselectCard', cardId: 'ST-001' },
    { type: 'toggleFavorite', cardId: 'ST-001' },
    { type: 'toggleLock', cardId: 'ST-001' },
    { type: 'replaceCard', cardId: 'ST-001', newCardId: 'ST-002' },
    { type: 'drawCards', count: 2, from: 'catalog', kinds: ['narrator'] },
    { type: 'drawCards', count: 1, from: 'selection', categoryIds: ['CAT-10'] },
    { type: 'shuffleSelection' },
    { type: 'saveVersion', label: 'Versão de teste' },
    { type: 'restoreVersion', versionId: 'ver-1' },
    { type: 'addLink', cardId: 'ST-001', target: { type: 'scene', sceneId: 'cena-1' }, note: 'abertura' },
    { type: 'addLink', cardId: 'ST-001', target: { type: 'project' } },
    { type: 'removeLink', cardId: 'ST-001', target: { type: 'chapter', chapterId: 'cap-1' } },
    { type: 'listSpreads' },
    { type: 'startSpread', spreadId: 'identidade-da-obra' },
    { type: 'drawSpreadSlot', spreadId: 'identidade-da-obra', slotId: 'dominante' },
    { type: 'saveSpread', spreadId: 'identidade-da-obra' },
  ];

  it('aceita todas as intenções da Fase 3', () => {
    for (const intent of validIntents) {
      expect(webviewToHostMessageSchema.safeParse(intent).success, JSON.stringify(intent)).toBe(true);
    }
  });

  it('rejeita payloads inválidos', () => {
    expect(webviewToHostMessageSchema.safeParse({ type: 'drawCards', count: 0, from: 'catalog' }).success).toBe(false);
    expect(webviewToHostMessageSchema.safeParse({ type: 'drawCards', count: 2, from: 'hand' }).success).toBe(false);
    expect(webviewToHostMessageSchema.safeParse({ type: 'restoreVersion' }).success).toBe(false);
    expect(
      webviewToHostMessageSchema.safeParse({
        type: 'addLink',
        cardId: 'ST-001',
        target: { type: 'desconhecido' },
      }).success,
    ).toBe(false);
    expect(webviewToHostMessageSchema.safeParse({ type: 'saveVersion', label: '' }).success).toBe(false);
    expect(webviewToHostMessageSchema.safeParse({ type: 'drawSpreadSlot', spreadId: 'x' }).success).toBe(false);
  });

  it('valida mensagens de seleção e tiragem enviadas pelo host', () => {
    const selection = {
      type: 'selection',
      payload: {
        projectId: 'projeto-1',
        selectedCardIds: ['ST-001'],
        favoriteCardIds: [],
        lockedCardIds: [],
        versions: [{ id: 'ver-1', createdAt: '2026-01-01T00:00:00.000Z', label: 'v1', cardIds: ['ST-001'] }],
        activeVersionId: 'ver-1',
        links: [{ cardId: 'ST-001', target: { type: 'project' }, createdAt: '2026-01-01T00:00:00.000Z' }],
        revision: 1,
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    };
    expect(hostToWebviewMessageSchema.safeParse(selection).success).toBe(true);

    const spreads = {
      type: 'spreads',
      payload: {
        spreads: [
          {
            id: 'identidade-da-obra',
            name: 'Identidade da obra',
            purpose: 'Definir promessa, mistura e estilo.',
            drawText: '1 gênero dominante',
            custom: false,
            slots: [{ id: 'dominante', label: 'Gênero dominante', count: 1, source: 'selection' }],
          },
        ],
      },
    };
    expect(hostToWebviewMessageSchema.safeParse(spreads).success).toBe(true);

    const spreadState = {
      type: 'spreadState',
      payload: {
        state: {
          spreadId: 'identidade-da-obra',
          slotCardIds: { dominante: ['GEN-001'] },
          status: 'in-progress',
        },
      },
    };
    expect(hostToWebviewMessageSchema.safeParse(spreadState).success).toBe(true);
  });

  it('T45 — aceita as intenções do Genre Builder e valida os payloads de gênero', () => {
    const genreIntents = [
      { type: 'getGenre' },
      { type: 'setDominantGenre', genreId: 'GEN-001' },
      { type: 'setDominantGenre', genreId: '' },
      { type: 'addSecondaryGenre', genreId: 'GEN-006' },
      { type: 'removeSecondaryGenre', genreId: 'GEN-006' },
      { type: 'setSubGenres', genreId: 'GEN-001', names: ['Ficção de detetive'] },
      { type: 'setContract', contract: { promise: 'Uma promessa.' } },
      { type: 'setDimensions', dimensions: { tone: 'sombrio' } },
      { type: 'regenerateGenreContract' },
      { type: 'setMode', mode: 'identity' },
      { type: 'setMode', mode: 'contract' },
    ];
    for (const intent of genreIntents) {
      expect(webviewToHostMessageSchema.safeParse(intent).success, JSON.stringify(intent)).toBe(true);
    }

    expect(webviewToHostMessageSchema.safeParse({ type: 'addSecondaryGenre' }).success).toBe(false);
    expect(webviewToHostMessageSchema.safeParse({ type: 'setMode', mode: 'spreads' }).success).toBe(false);
    expect(webviewToHostMessageSchema.safeParse({ type: 'setSubGenres', genreId: 'GEN-001', names: 'x' }).success).toBe(
      false,
    );
    expect(webviewToHostMessageSchema.safeParse({ type: 'setContract', contract: { promise: 42 } }).success).toBe(false);

    const profile = {
      dominantGenreId: 'GEN-001',
      secondaryGenreIds: ['GEN-006'],
      subGenresByGenre: { 'GEN-001': ['Ficção de detetive'] },
      contract: {
        promise: 'Uma promessa.',
        engine: '',
        conventions: '',
        freedom: '',
        reward: '',
      },
      dimensions: {
        tone: 'sombrio',
        atmosphere: '',
        setting: '',
        audience: '',
        format: '',
        approximateLength: '',
      },
    };
    const genreMessage = {
      type: 'genre',
      payload: {
        profile,
        context: {
          dominant: {
            id: 'GEN-001',
            title: 'Mistério',
            sourceConcept: 'Mistério',
            genreFamily: 'Investigação e crime',
            genreLevel: 'gênero amplo',
            readerPromise: 'Curiosidade.',
            coreConventions: 'Pistas justas.',
            storyEngine: 'Uma pergunta central.',
            pitfalls: 'Esconder pistas.',
            compatibleGenres: ['Fantasia épica'],
            subGenres: ['Ficção de detetive'],
          },
          secondaries: [],
          subGenres: [
            {
              name: 'Ficção de detetive',
              parentGenreId: 'GEN-001',
              sourceCardId: 'GEN-003',
              prompt: 'Um investigador conecta indícios.',
              question: 'Qual habilidade revela a verdade?',
              suggestedUse: 'Criar hipóteses concorrentes.',
              readerPromise: 'Ver detalhes virarem explicação.',
              coreConventions: 'Pistas verificáveis.',
              pitfalls: 'Detetive infalível.',
              compatibleGenres: ['Mistério'],
            },
          ],
          contract: profile.contract,
          dimensions: profile.dimensions,
          warnings: [
            { code: 'UNKNOWN_SUBGENRE_IN_PROFILE', message: 'Nome fora do deck.', subGenreName: 'Inventado' },
          ],
        },
        revision: 4,
      },
    };
    expect(hostToWebviewMessageSchema.safeParse(genreMessage).success).toBe(true);
    expect(hostToWebviewMessageSchema.safeParse({ type: 'mode', mode: 'contract' }).success).toBe(true);

    const invalidProfile = {
      ...genreMessage,
      payload: { ...genreMessage.payload, profile: { ...profile, secondaryGenreIds: ['GEN-006', 'GEN-013', 'GEN-017'] } },
    };
    expect(hostToWebviewMessageSchema.safeParse(invalidProfile).success).toBe(false);
    const invalidWarning = {
      ...genreMessage,
      payload: {
        ...genreMessage.payload,
        context: {
          ...genreMessage.payload.context,
          warnings: [{ code: 'QUALQUER_COISA', message: 'x' }],
        },
      },
    };
    expect(hostToWebviewMessageSchema.safeParse(invalidWarning).success).toBe(false);
  });

  it('valida a projeção de cartas com conteúdo integral e filtros aplicados', () => {
    const payload = {
      type: 'cards',
      payload: {
        cards: [
          {
            id: 'GEN-001',
            title: 'Mistério',
            kind: 'genre_definition',
            categoryId: 'CAT-17',
            categoryName: 'Gêneros',
            color: '#344F69',
            selected: true,
            favorite: true,
            locked: false,
            prompt: 'Promessa do gênero.',
            question: 'Que mistério o leitor investiga?',
            suggestedUse: 'Definir o gênero dominante.',
            tags: ['misterio', 'investigacao'],
            sourceConcept: 'Genre core',
            readerPromise: 'Suspense sustentado por pistas.',
            storyEngine: 'Pergunta sem resposta.',
            coreConventions: 'Pistas justas.',
            pitfalls: 'Pistas desonestas.',
            compatibleGenres: ['Suspense'],
            subGenres: ['Cozy mystery'],
            subGenreDetails: [
              {
                name: 'Cozy mystery',
                prompt: 'Crime sem violência explícita.',
                question: 'Quem é o culpado?',
                suggestedUse: 'Usar como base do mistério.',
                readerPromise: 'Resolver junto com a protagonista.',
                coreConventions: 'Comunidade fechada.',
                pitfalls: 'Falta de suspeitos plausíveis.',
                compatibleGenres: ['Mistério'],
              },
            ],
          },
          {
            id: 'ST-001',
            title: 'Cliffhanger',
            kind: 'technique',
            categoryId: 'CAT-15',
            categoryName: 'Técnicas',
            color: '#888888',
            selected: false,
            genreAdaptation: 'Fecha o capítulo em tensão.',
            genreRelevantAxis: 'Tensão',
          },
        ],
        total: 2,
        query: 'misterio',
        categoryId: 'CAT-14',
        kind: 'technique',
        tag: 'suspense',
        view: 'catalog',
        drawnCardIds: ['ST-001'],
      },
    };
    expect(hostToWebviewMessageSchema.safeParse(payload).success).toBe(true);

    const invalid = {
      ...payload,
      payload: { ...payload.payload, view: 'spreads' },
    };
    expect(hostToWebviewMessageSchema.safeParse(invalid).success).toBe(false);
  });

  it('T60 — aceita as intenções do Story Builder e valida os payloads', () => {
    const intents = [
      { type: 'getStory' },
      { type: 'storyAction', action: { action: 'updateIdentity', patch: { provisionalTitle: 'Obra' } } },
      { type: 'storyAction', action: { action: 'setPremiseApproval', field: 'logline', approval: 'approved' } },
      { type: 'storyAction', action: { action: 'addCharacter', entity: { id: 'pes-1', name: 'Ana' } } },
      { type: 'storyAction', action: { action: 'addConflict', entity: { id: 'con-1', kind: 'main', linkedCharacterId: 'pes-1' } } },
      { type: 'storyAction', action: { action: 'addScene', entity: { id: 'cen-1', chapterId: 'cap-1', sourceCardIds: ['ST-012'] } } },
      { type: 'storyAction', action: { action: 'moveScene', id: 'cen-1', chapterId: 'cap-2' } },
      { type: 'storyAction', action: { action: 'assignTechnique', cardId: 'ST-145', scope: { type: 'scene', sceneId: 'cen-1' }, intent: 'Preparar.' } },
      { type: 'storyAction', action: { action: 'markBibleDirty', dirty: true } },
      { type: 'regenerateStoryDocument', kind: 'story-bible' },
    ];
    for (const intent of intents) {
      expect(webviewToHostMessageSchema.safeParse(intent).success, JSON.stringify(intent)).toBe(true);
    }

    expect(webviewToHostMessageSchema.safeParse({ type: 'storyAction' }).success).toBe(false);
    expect(
      webviewToHostMessageSchema.safeParse({
        type: 'storyAction',
        action: { action: 'setPremiseApproval', field: 'inexistente', approval: 'approved' },
      }).success,
    ).toBe(false);
    expect(
      webviewToHostMessageSchema.safeParse({ type: 'regenerateStoryDocument', kind: 'qualquer' }).success,
    ).toBe(false);

    const storyMessage = {
      type: 'story',
      payload: {
        project: {
          schemaVersion: 2,
          deckVersion: '4.0.0',
          revision: 3,
          project: {
            id: 'p',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            identity: { provisionalTitle: 'Obra', initialDescription: '', period: '' },
          },
        },
        warnings: [{ code: 'UNKNOWN_CARD', message: 'Carta ausente.', cardId: 'ST-999' }],
        revision: 3,
      },
    };
    expect(hostToWebviewMessageSchema.safeParse(storyMessage).success).toBe(true);
  });
});
