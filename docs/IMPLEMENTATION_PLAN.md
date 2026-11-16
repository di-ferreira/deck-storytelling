# IMPLEMENTATION_PLAN.md — Story Deck / Plano de Implementação Incremental

> Fase 1 — Discovery e Arquitetura. Plano técnico para as Fases 2–8 do master prompt §20.
> **Status atual: FASE 6 CONCLUÍDA (2026-11-16).** Fases 1–6 entregues (Discovery, Fundação, Deck Engine, Genre Builder, Story Builder e Novel Assistant). Próxima: Fase 7 — IA opcional. O checklist manual V1/V2/V3/V5 do Novel Assistant segue pendente em `INTEGRATION.md` §6.4.

---

## 0.1 Resultado da Fase 2 — Fundação (2026-11-16)

**Entregas:** scaffold completo (package.json, tsconfig host/webview/integration, esbuild, Vite, Vitest, vsce), deck oficial copiado para `resources/decks/`, domínio puro com índice e validação parametrizada por versão, portas e serviços de aplicação, carregador Zod, persistência atômica com lock e watcher, detecção do Novel Assistant em runtime, TreeViews nativas, Webview React com CSP, protocolo de mensagens validado e suíte de testes.

**Verificações executadas:**
| Comando | Resultado |
|---|---|
| `npm test` | ✅ 4 arquivos, **21 testes aprovados** (T01–T10, T14, T15, T17, T22) |
| `npx tsc -p tsconfig.json --noEmit` | ✅ sem erros |
| `npx tsc -p tsconfig.webview.json` | ✅ sem erros |
| `npm run compile` | ✅ host 161,7 kB + webview 287 kB |
| `npm run test:integration` | ✅ exit 0 no Extension Development Host (VS Code 1.146) |
| `npm run package` | ✅ `story-deck-0.1.0.vsix` (10 arquivos, 173,5 kB) |

**Ajustes durante a fase:**
- Corrigido o harness `@vscode/test-electron` para isolamento em diretório temporário sem espaços (o caminho `Extensão VS Code` quebrava o `extensionTestsPath` no Windows).
- `compatible_genres`: o diagnóstico considera apenas os valores das cartas de gênero de nível superior, resultando nos **12 rótulos consultivos** documentados em `DECK_SCHEMA.md` §9.

**Limitações restantes da Fase 2:**
- Seleção de cartas está em memória no host da Webview (ainda não persistida em `deck-selection.json`) — será concluída na Fase 3.
- Filtros e busca estão implementados de forma básica (texto + categoria); filtros por tipo/tags virão na Fase 3.
- Tiragens, Genre Builder, Story Builder e IA ainda são apenas navegação/placeholders.
- Experimentos V1–V6 do Novel Assistant permanecem para a Fase 6.

**Próximo passo:** Fase 3 — Deck Engine (persistência da seleção, favoritos, bloqueio, versões, sortear/embaralhar, links de cartas e 4 tiragens como dados).

---

## 0.2 Resultado da Fase 3 — Deck Engine (2026-11-16)

**Entregas (núcleo, já verificado):** `DeckSelection` imutável com revisão otimista, `SelectionService` como único escritor do agregado, `LinkRegistry`, `SpreadEngine` com 4 tiragens lidas de `resources/spreads/entrelinhas-v4-spreads.json`, persistência de `deck-selection.json` / `story-state.json` / `decisions.json` com escrita atômica e lock por arquivo, e projeção de cartas para a UI.

**Entregas desta unidade (integração Extension Host + Webview):**

| Arquivo | Entrega |
|---|---|
| `src/extension/extension.ts` | Composition root completo: `projectId` de `project.json` ou `randomUUID()`; `JsonSelectionRepository`, `JsonOperationLog`, `JsonStoryStateRepository`, `JsonSpreadCatalog` (recurso + `custom.json` opcional), `MathRandomGenerator`; `SelectionService` e `SpreadEngine` injetados no painel e nas TreeViews. Sem workspace, o estado vive em `<tmp>/story-deck/<projectId>/.storydeck/` — a ativação nunca falha por falta de pasta. |
| `src/extension/views/deck-studio-panel.ts` | `Set` em memória removido: toda leitura/escrita passa pelos serviços. Todas as intenções da Fase 3 tratadas com `try/catch` e mensagem `error` amigável (erros de domínio preservam o texto editorial). `SpreadState` ativo mantido no host e retomado de `story-state.json` ao abrir o painel. |
| `src/extension/views/card-summary.ts` | Projeção pura (sem `vscode`) de filtros e cartas: busca texto/categoria/tipo/tag, abas catálogo/selecionadas/favoritos e conteúdo integral da carta (gênero e não-gênero). |
| `src/shared/messages.ts` | `setFilter` ganhou `tag` e `view`; `cardSummary` ganhou `favorite`, `locked`, `prompt`, `question`, `suggestedUse`, `tags`, `sourceConcept`, campos de gênero (`readerPromise`, `storyEngine`, `coreConventions`, `pitfalls`, `compatibleGenres`, `subGenres`, `subGenreDetails`) e de não-gênero (`genreAdaptation`, `genreRelevantAxis`); `cards` ganhou `kind`, `tag`, `view`, `drawnCardIds`. |
| `src/webview/src/App.tsx` + `hooks/` + `components/` | UI completa: abas Catálogo/Selecionadas/Favoritos/Tiragens, filtros (texto, categoria, tipo, tag), modos grade/detalhado, painel de detalhe integral, ações de selecionar/desmarcar, favoritar, bloquear, sortear, embaralhar, salvar/restaurar versão, associar/remover vínculo, e painel de tiragens com progresso por slot, sorteio por slot, resultado e salvar. Estado vem exclusivamente do host. |
| `src/extension/providers/story-deck-tree-provider.ts` | Contagens reais de selecionadas/favoritos e lista de tiragens com progresso (`preenchidas/esperadas · status`), lidas dos serviços. |
| `package.json` | Comandos `storyDeck.drawCard`, `storyDeck.shuffleSelection`, `storyDeck.saveVersion`, `storyDeck.restoreVersion`, `storyDeck.openSpread` (com ícones e entradas em `view/title` do Deck Studio). |

**Verificações executadas:**

| Comando | Resultado |
|---|---|
| `npm test` | ✅ 11 arquivos, **87 testes aprovados** (80 herdados + 7 novos: T40 projeção de cartas e protocolo estendido) |
| `npx tsc -p tsconfig.json --noEmit` | ✅ sem erros |
| `npx tsc -p tsconfig.webview.json` | ✅ sem erros |
| `npm run compile` | ✅ host 225,4 kB + webview 314,5 kB (CSS 10,8 kB) |
| `npm run test:integration` | ✅ exit 0 no Extension Development Host (VS Code 1.146) |
| `npm run package` | ✅ `story-deck-0.1.0.vsix` (11 arquivos, 196,8 kB), incluindo `resources/spreads/entrelinhas-v4-spreads.json` |

O teste de integração agora abre um workspace real e verifica ponta a ponta: ativação, 9 comandos registrados, `storyDeck.newProject` criando `.storydeck/project.json`, abertura do painel (webview), `storyDeck.drawCard` persistindo 1 carta com `revision: 1` em `deck-selection.json` e a operação `draw` em `decisions.json`.

**Ajustes durante a fase:**
- Filtro por tag e por aba passou a ser intenção do host (`setFilter.view/tag`), evitando que a webview mantivesse uma segunda fonte de verdade para seleção.
- `startSpread`/`drawSpreadSlot`/`saveSpread` mantêm um único `SpreadState` ativo no host; ao abrir o painel, a última tiragem persistida é retomada sem sobrescrever arquivos.
- `.vscodeignore` já preservava `resources/`; `scripts/copy-deck.mjs` não precisou de alteração — o VSIX empacota `resources/spreads/` diretamente.

**Limitações restantes da Fase 3:**
- A renderização da webview não tem teste automatizado de DOM; a verificação visual depende de abrir o Extension Development Host.
- `replaceCard` é tratado no host, mas ainda não tem botão na UI (substituição será exposta junto do fluxo de gênero na Fase 4).
- Sem workspace, o estado é temporário do SO e não sobrevive a reinícios — decisão deliberada para nunca falhar na ativação.
- O `projectId` é estável por sessão até que `.storydeck/project.json` exista; quando o arquivo é criado por `storyDeck.newProject`, o vínculo é adotado no próximo carregamento da janela (o arquivo de seleção é renormalizado pelo repositório).
- As tiragens são dados fixos do recurso; `custom.json` é lido se existir, mas ainda não há editor de customização.

**Próximo passo:** Fase 4 — Genre Builder (1 gênero dominante, 0–2 secundários, subgêneros por gênero, contrato de gênero em `Story/genre-contract.md`).

---

## 0.3 Resultado da Fase 4 — Genre Builder (2026-11-16)

**Status:** concluída. Planejamento fechado pelo agente `story-deck-planner` (`longcat-2.5-free`); núcleo implementado pelo `story-deck-developer` (`deepseek-v4.1-flash-free#high`, que atingiu o limite gratuito ao final da etapa — o modelo do agente foi trocado para `opencode/hy4-flash-free#high`); integração conduzida no modo developer nesta sessão.

**Entregas:**
| Área | Entrega |
|---|---|
| Domínio | `GenreProfile` imutável, `GenreSelectionPolicy` (1 dominante, 0–2 secundários, promoção/remoção, IDs ativos), `SubGenreResolver` (nome canônico + `source_card_id` preservado), `CompatibleGenreIndex` (normalização consultiva), erros e avisos `GenreError`. |
| Aplicação | `GenreService` (único escritor do perfil), `GenreContextBuilder` (projeção somente leitura com avisos), `GenreContractDocumentStore`, extensão de `StoryStateRepository` com `loadGenreStep`/`saveGenreStep`. |
| Persistência | Perfil em `.storydeck/story-state.json` → `stepStates.genre`, com a MESMA revisão otimista/escrita atômica de `spreads`; `Story/genre-contract.md` é projeção regenerável (preserva blocos `<!-- story-deck:user -->`). `project.json` não foi alterado. |
| Protocolo/UI | Novas intenções de gênero, payload com catálogo completo de 32 gêneros e rótulos do contrato vindos de `usage.genre_contract`; painel `storyDeck.genreBuilder` usando o mesmo bundle React (modo pelo atributo no `<body>`); seletores de dominante/secundários/subgêneros, dimensões independentes, contrato com 5 perguntas e atualização do Markdown. |
| Navegação | TreeView do Genre Builder com contagens reais (dominante, secundários, subgêneros, perguntas respondidas) e comandos `storyDeck.openGenreBuilder`, `storyDeck.setDominantGenre`, `storyDeck.regenerateGenreContract`. |

**Decisões fechadas:** subgênero órfão é **aviso**, nunca bloqueio; `compatible_genres` permanece consultivo; `source_card_id` é rastreio, nunca carta do catálogo; dimensões são a fonte única (Fase 5 não terá segunda superfície para elas); contrato pré-preenchido só por ação explícita (a implementação inicial deixa vazio); rótulos das perguntas vêm do deck.

**Verificações executadas:**
| Comando | Resultado |
|---|---|
| `npm test` | ✅ 15 arquivos, **118 testes aprovados** (87 herdados + 31 de gênero) |
| `npx tsc -p tsconfig.json --noEmit` | ✅ sem erros |
| `npx tsc -p tsconfig.webview.json` | ✅ sem erros |
| `npm run compile` | ✅ host 266,5 kB + webview 333,6 kB (CSS 12,7 kB) |
| `npm run test:integration` | ✅ exit 0 — 12 comandos, `Story/genre-contract.md` criado e regenerado sem perda |
| `npm run package` | ✅ VSIX 11 arquivos, 208,3 kB |

**Limitações:** sem teste automatizado de DOM do Genre Builder; substituição de carta ainda sem botão na UI; aliases dos 12 rótulos sem correspondência ficam para a Fase 7; sem workspace o contrato é gravado em diretório temporário.

**Próximo passo:** Fase 5 — Story Builder (premissa, personagens, conflitos, mundo, narrador, estrutura, atos/capítulos/cenas e Story Bible), começando pelo domínio puro e suas regras.

---

## 0.4 Resultado da Fase 5 — Story Builder (2026-11-16)

**Status:** concluída. Planejamento pelo `story-deck-planner` (`longcat-2.5-free`); núcleo pelo `story-deck-developer` (`hy4-flash-free#high`); integração host/webview na continuação da sessão.

**Entregas principais:**
- **Domínio puro** `src/domain/story/` com `StoryProject` imutável, 9 etapas, hierarquia ato→capítulo→cena (só `Chapter.actId`/`Scene.chapterId` persistidos), segredos com verdade factual separada, técnicas com escopo workaround, decisões criativas e `AuditState` reservado.
- **Persistência:** `project.json` v2 com `revision` otimista e `StoryProjectConflictError`; migração lazy/idempotente v1→v2 que importa `stepStates.genre`, preserva tiragens e registra no journal; `WorkIdentity` sem duplicar as dimensões da Fase 4.
- **Serviços:** `StoryService` (único escritor do agregado, journal, exclusão protegida via `StoryLinkQuery`), `StoryContextBuilder` (hierarquia derivada + avisos), `StoryBibleAssembler` (17 seções), `SelectionLinkQuery`. `GenreService` passa a delegar ao `StoryService` quando injetado.
- **Markdown:** `document-blocks.ts` generalizado; `premise.md`, `story-bible.md`, `outline.md` e `narrative-decisions.md` create-if-absent com regeneração explícita preservando blocos `story-deck:user`.
- **UI:** painel `storyDeck.storyBuilder` no mesmo bundle React (modo `story` pelo atributo no `<body>`), abas para as 9 etapas + hierarquia + Bíblia, TreeView dinâmica e comandos `storyDeck.openStoryBuilder` / `storyDeck.regenerateStoryBible`.

**Decisões:** IA e auditoria ficam para a Fase 7; integração Novel Assistant para a Fase 6; nenhuma substituição de carta foi exposta na UI; regeneração Markdown nunca é automática; `sourceCardIds` inválidos são erro, referências textuais inválidas são aviso.

**Verificações executadas:**
| Comando | Resultado |
|---|---|
| `npm test` | ✅ 22 arquivos, **154 testes aprovados** (118 + 36 novos) |
| `npx tsc -p tsconfig.json --noEmit` | ✅ sem erros |
| `npx tsc -p tsconfig.webview.json` | ✅ sem erros |
| `npm run compile` | ✅ host 375,7 kB + webview 358 kB |
| `npm run test:integration` | ✅ exit 0 — 14 comandos, `project.json` v2, 4 Markdown e Bíblia regenerada |
| `npm run package` | ✅ VSIX 233,3 kB |

**Limitações:** sem teste automatizado de DOM do Story Builder; edição de vínculos de carta e a substituição `replaceCard` ainda sem botão; kanban de cenas fora do MVP; migração só é disparada na ativação (não em `load()` isolado).

**Próximo passo:** Fase 6 — Novel Assistant (detecção, experimentos V1–V6, compatibilidade de diretórios e abertura de capítulos/cenas no editor de terceiros).

---

## 0.5 Resultado da Fase 6 — Novel Assistant (2026-11-16)

**Status:** concluída (núcleo + UI + testes). Detalhes em `INTEGRATION.md` §6.

**Entregas:**
- **Detecção ampliada:** `NovelAssistantStatus` expõe `commands`, `customEditors`, `exportsApi` e `workspaceDirs`; `hasCommand(id)` é a única forma de executar um comando de terceiros. A lógica pura `parseNovelAssistantPackage` vive no domínio, sem `vscode`, e a descoberta de IDs vem exclusivamente de `contributes`.
- **Fluxos A/B:** `IntegrationService` decide o modo. A (NA instalado) oferece `novel-assistant.newProject` somente se confirmado em runtime e cria apenas `.storydeck/` + `Story/`; B (standalone) acrescenta os 6 diretórios documentados se ausentes. `integrationMode` é gravado em `.storydeck/settings.json` preservando outras chaves — **o schema v2 do `project.json` não foi tocado**.
- **Layout isolado:** `src/domain/integration/novel-path-layout.ts` (`sanitizeSegment`, `chapterDirectory`, `scenePath`) concentra o layout **inferido** `Manuscript/<Capítulo>/<Cena>.md`, com sanitização anti-travessia, fallback seguro, limite de tamanho e idempotência.
- **Abertura de cena:** `storyDeck.openSceneInManuscript` calcula o caminho, cria o `.md` somente se ausente com template próprio (`writeFile` com flag `wx`) e abre com `showTextDocument`; oferece `vscode.openWith` apenas com um viewType descoberto.
- **Scene Brief:** `storyDeck.showSceneBrief` abre um painel HTML estático (CSP `default-src 'none'`, sem scripts, todo valor escapado) com dados do `StoryService`, `SelectionService.links`, `GenreService` e avisos do `StoryContextBuilder`.
- **Diagnóstico:** `storyDeck.checkNovelAssistant` mostra instalação, versão, nº de comandos, custom editor, `exportsApi`, diretórios presentes e modo de integração.
- **Comandos:** 17 no total (14 anteriores + 3 novos), com entradas em `view/title` do Story Builder e Dashboard.

**Decisões mantidas:** nenhum ID de terceiros é contrato; nada é sobrescrito; nada em `.novel-assistant/` é alterado; domínio sem `vscode`/`fs`; sem NA a extensão funciona 100%.

**Verificações executadas:**

| Comando | Resultado |
|---|---|
| `npm test` | ✅ 28 arquivos, **194 testes aprovados** (154 + 40 novos: T63–T69) |
| `npx tsc -p tsconfig.json --noEmit` | ✅ sem erros |
| `npx tsc -p tsconfig.webview.json` | ✅ sem erros |
| `npm run compile` | ✅ host 394,7 kB + webview 358,03 kB |
| `npm run test:integration` | ✅ exit 0 — 17 comandos, V6 no manifesto, `stats.json` intacto, cena criada/não sobrescrita, brief aberto |
| `npm run package` | ✅ VSIX 238,39 kB |

**O que foi automatizado dos experimentos:** V4 (leitura de `exports` coberta por teste unitário; a checagem runtime com o NA real permanece manual) e V6 (manifesto sem colisões + sentinel `.novel-assistant/stats.json` comparado byte a byte). V1, V2, V3 e V5 **não foram executados** — checklist em `INTEGRATION.md` §6.4.

**Limitações:** layout ainda inferido (V2/V3); Fluxo A não executado de ponta a ponta com o NA instalado; Scene Brief sem persistência de painel; oferta WYSIWYG depende de interação.

**Próximo passo:** Fase 7 — IA opcional (porta `AiProvider`, contexto seletivo, 3 alternativas, nada inserido automaticamente).

---

## 0.6 Encerramento (Fase 8) — 2026-11-16

**Decisão do usuário:** não implementar IA neste momento. A Fase 7 (IA opcional + auditoria narrativa com `craft_warning`) fica **adiada**, sem código, configuração, credencial ou chamada de rede. O roadmap permanece documentado para retomada futura; a arquitetura já isola `ContextBuilder`, `AiProvider` e `AuditState` como pontos de extensão.

**Escopo de finalização executado:**
- Documentação de estado atualizada (`README.md` com fases 1–6 concluídas e número real de testes).
- Validação final completa: 194 testes unitários, type-check host e webview, build, teste de integração no Extension Development Host e empacotamento VSIX.
- Verificação de integridade do deck (hash do recurso idêntico ao original) e ausência de dependências de IA no manifesto/código.
- Acessibilidade: variáveis de tema do VS Code (claro/escuro/alto contraste) e controles com rótulos/estados ARIA nas três Webviews.

**Resultado final:** extensão funcional, local-first, modular e pronta para uso com o Novel Assistant. Limitações conhecidas e pendências V1/V2/V3/V5 do Novel Assistant permanecem documentadas em `INTEGRATION.md` §6.4.

---

## 0. Como usar este plano

O master prompt §22 exige: não implementar tudo de uma vez; trabalhar por fases; antes de cada fase ler a documentação existente, verificar o implementado, identificar dependências e definir critérios de conclusão; durante cada fase implementar, testar, corrigir, atualizar docs e manter build; ao final apresentar concluído, arquivos, testes, limitações e atualizar o plano.

**Regra de ouro:** uma funcionalidade só é "pronta" quando está conectada à lógica, aos dados **reais** e à persistência, com testes. Mock data apenas em `tests/fixtures/`.

---

## 1. Visão geral das fases e dependências

```
Fase 1 (atual) ──> Fase 2 ──> Fase 3 ──> Fase 4 ──> Fase 5 ──> Fase 6 ──> Fase 7 ──> Fase 8
 Discovery       Fundação   Deck Engine  Genre      Story      Novel      IA         Finalização
                                          Builder    Builder    Assistant
                  └──────────┴── testes de deck (Fase 2) ──────────┘
                                                          └── V1–V6 (Fase 6) ──┘
                                                                       └── IA opcional ──┘
```

| Fase | Depende de | Pode ser paralela? |
|---|---|---|
| 2 Fundação | Fase 1 | Não |
| 3 Deck Engine | Fase 2 | Não (usa validação e persistência) |
| 4 Genre Builder | Fase 3 | Parcial com Fase 5 (ambas consomem Deck Engine) |
| 5 Story Builder | Fase 3, 4 | Não (precisa de GenreProfile) |
| 6 Novel Assistant | Fase 2, 5 (para abrir cenas) | Sim, após Fase 2 |
| 7 IA | Fase 3, 5 (precisa de cartas e Story Bible) | Sim, após Fase 5 |
| 8 Finalização | Todas | Não |

---

## 2. Fase 2 — Fundação

**Objetivo:** extensão funcional no Extension Development Host, com build, navegação, persistência e testes básicos.

### 2.1 Tarefas
1. `package.json`: `name`, `publisher` (confirmar), `engines.vscode: ^1.85.0`, `activationEvents`, `contributes` (Activity Bar `story-deck`, comandos `storyDeck.*`, configurações `storyDeck.*`), scripts.
2. TypeScript: `tsconfig.json` base + referências; `tsconfig.webview.json`.
3. Build: `esbuild` (host) + Vite (webview) + `vsce` (VSIX); copiar `deck_storytelling.json` → `resources/decks/entrelinhas-storytelling-v4.json`.
4. Bootstrap: `extension.ts` como composition root; registro de comandos e providers; `Disposable` registry.
5. Navegação: Activity Bar + views iniciais (Dashboard, Deck Studio, Genre Builder, Story Builder, AI Assistant) — mesmo que vazias.
6. Persistência: `JsonProjectRepository` com escrita atômica, lock por projeto, watcher, migrations, journal; `FileGuard`.
7. Protocolo de mensagens: Zod discriminated unions em `shared/messages`; `MessageClient` na webview; roteador validado no host; CSP.
8. Tema: `styles/tokens.css` mapeando variáveis do VS Code; suporte claro/escuro.
9. Testes: Vitest (domínio + validação) e `@vscode/test-electron` (ativamento + comandos).

### 2.2 Critérios de conclusão
- [ ] `npm run compile` e `npm run package` passam sem erros.
- [ ] Extensão ativa no Extension Development Host sem erros no Output.
- [ ] Activity Bar "Story Deck" aparece ao lado de "Novel Assistant".
- [ ] Comandos registrados respondem (mesmo que exibam "em breve").
- [ ] Escrita atômica testada: dois saves concorrentes não corrompem JSON.
- [ ] CSP bloqueia script externo; mensagem inválida é rejeitada.
- [ ] Testes iniciais verdes.

---

## 3. Fase 3 — Deck Engine

**Objetivo:** usuário consegue explorar, filtrar, selecionar e sortear as 210 cartas.

### 3.1 Tarefas
1. `JsonDeckLoader`: ler recurso incorporado, validar com Zod, construir `Deck`.
2. `DeckValidator`: todas as verificações de `DECK_SCHEMA.md` §11 (ERROR/WARNING/INFO parametrizados por versão).
3. `DeckIndex`: índices por id, categoria, kind, tag, sourceConcept, subgênero→pai.
4. UI Deck Studio: catálogo com cores das 17 categorias, grade/detalhado/selecionadas, busca, filtros, carta integral, indicadores.
5. `SelectionService`: selecionar, desmarcar, múltipla, favoritar, bloquear, substituir, sortear, embaralhar; versões e histórico; persistência em `deck-selection.json`.
6. `CardLink` e `LinkRegistry`: associação a decisão/gênero/personagem/ato/capítulo/cena.
7. `SpreadEngine` + 4 `SpreadDefinition` como dados; progresso, resultado, salvar/retomar.

### 3.2 Critérios de conclusão
- [x] Teste de integridade do deck: 210/17/32/89/34/26/15/12/2 — verde.
- [x] IDs únicos; campos presentes; 178 com adaptação; 31 detalhes de subgênero coerentes.
- [x] 12 rótulos `compatible_genres` são WARNING, não ERROR.
- [x] Nenhuma carta histórica (`GEN-003` etc.) aparece no catálogo.
- [x] Busca/filtros retornam resultados corretos; cores do JSON aplicadas.
- [x] Seleção, favoritos, bloqueio, sorteio e versões persistem após recarregar janela.
- [x] Associar carta a cena e reabrir mantém o vínculo.

---

## 4. Fase 4 — Genre Builder

**Objetivo:** usuário define promessa e identidade da obra respeitando as regras do deck.

### 4.1 Tarefas
1. `GenreSelectionPolicy`: 1 dominante, 0–2 secundários, subgêneros por gênero, dimensões separadas.
2. UI do contrato de gênero (5 perguntas editáveis) e seleção de subgêneros com definição integral.
3. `GenreContext` + resolvedor de aliases para `compatible_genres` (consultivo).
4. Geração de `Story/genre-contract.md`.
5. Testes de regra: secundário duplicado rejeitado; subgênero de gênero não selecionado gera aviso; `compatible_genres` nunca bloqueia; dimensões não viram gênero.

### 4.2 Critérios de conclusão
- [ ] Dominante único obrigatório para "identidade definida".
- [ ] Terceiro gênero secundário impedido pela regra (com mensagem editorial, não erro técnico).
- [ ] Cada subgênero mostra `reader_promise`, `core_conventions`, `pitfalls`, `source_card_id`.
- [ ] Contrato persistido na Story Bible e no Markdown.

---

## 5. Fase 5 — Story Builder

**Objetivo:** cartas transformadas em estrutura narrativa editável.

### 5.1 Tarefas
1. Etapas 1–9 com persistência incremental (campos incompletos permitidos).
2. Fichas de personagem (CAT-01/02/04/11/12) com distinção função vs motivação.
3. Conflitos ligados a objetivos de personagem; world building; segredos com verdade factual separada.
4. Narrador/perspectiva; estruturas combináveis; técnicas com escopo (obra/arco/capítulo/cena).
5. Construtor hierárquico Atos → Capítulos → Cenas, com mover/reordenar preservando IDs e links.
6. `StoryBibleAssembler` + `StoryBibleRenderer` (17 seções, editável, preserva blocos do usuário).
7. `AuditService` com ST-149/ST-150: selecionar elemento, verificar, explicar, sugerir, aceitar/ignorar.

### 5.2 Critérios de conclusão
- [ ] Premissa com todos os 9 campos e aprovação/edit registro.
- [ ] Story Bible com 17 seções na ordem e referências `[ID]`.
- [ ] Cena movida entre capítulos mantém `CardLink` e `sourceCardIds`.
- [ ] Segredo mantém `factualTruth` ≠ `readerAvailableInfo`.
- [ ] Alertas nunca rotulados como "erro"; autor pode ignorar.

---

## 6. Fase 6 — Novel Assistant

**Objetivo:** integração funcional sem modificar extensão de terceiros.

### 6.1 Tarefas
1. `NovelAssistantAdapter` com detecção e descoberta de comandos em runtime (`INTEGRATION.md` §2.1).
2. Fluxos A e B de criação de projeto.
3. `FileGuard`: `.storydeck/` e `Story/` criados somente se ausentes; nada é sobrescrito.
4. Executar experimentos **V1–V6** (`INTEGRATION.md` §3) em workspace temporário.
5. Ajustar `pathLayout` com base nos resultados; implementar abertura de capítulo/cena e Scene Brief.
6. Testes de coexistência com `@vscode/test-electron`.

### 6.2 Critérios de conclusão (atualizado na Fase 6)
- [x] Nenhum ID de comando do NA hardcoded como contrato (descoberta em runtime + `hasCommand`).
- [x] Fluxo A preserva integralmente `Manuscript/`, `Characters/`, `.novel-assistant/` (código e decisão testados; execução real depende de V1).
- [x] Fluxo B funciona sem a extensão instalada (integration test verde).
- [ ] V1–V6 com resultados reais — V4 parcial e V6 automatizados; **V1/V2/V3/V5 pendentes de execução manual** (`INTEGRATION.md` §6.4).
- [ ] Abrir cena por `showTextDocument` (✅) **e** WYSIWYG confirmado (depende de V5 — não executado).
- [x] Teste de coexistência verde (manifesto sem colisões + sentinel `stats.json` intacto).

---

## 7. Fase 7 — Inteligência Artificial

**Objetivo:** assistente inteligente baseado nas cartas e na Story Bible, sem ser obrigatório.

### 7.1 Tarefas
1. Porta `AiProvider` + implementação OpenAI-compatible (LM Studio, Ollama, custom).
2. Configurações `storyDeck.ai.*`; API key em `SecretStorage`.
3. `ContextBuilder`: contexto seletivo por tarefa, incluindo obrigatoriamente `genre_adaptation` + `genre_relevant_axis` e referências de carta.
4. 9 perfis de prompt (Arquiteto, Consultor de gênero, Desenvolvedor de personagens, Especialista em conflitos, World building, Estruturador, Planejador de cenas, Revisor de continuidade, Consultor de técnicas) — dados, não agentes fixos.
5. Geração de premissa, construção assistida, revisão; 3 alternativas por padrão.
6. Histórico de sugestões consultável; nada inserido automaticamente; timeout/cancelamento.

### 7.2 Critérios de conclusão
- [ ] Extensão funciona integralmente com IA desligada (teste de regressão).
- [ ] Nenhuma requisição envia as 210 cartas ou o manuscrito completo.
- [ ] Prompt de cena contém gênero, subgêneros, personagens, objetivos, conflitos, estrutura, cartas e continuidade.
- [ ] Sugestões citam cartas e explicam o motivo.
- [ ] API key ausente de logs, arquivos e mensagens da webview.
- [ ] Nenhum arquivo sobrescrito sem autorização.

---

## 8. Fase 8 — Finalização

1. Testes unitários, integração, regressão e coexistência — todos verdes.
2. Ajustes visuais, acessibilidade, navegação por teclado, temas claro/escuro.
3. Documentação (README, USER_GUIDE, 6 docs de arquitetura movidos para `docs/`).
4. Empacotamento VSIX com `vsce`; validação em instalação limpa.
5. Revisão dos 19 critérios de aceitação do MVP.

---

## 9. Matriz de testes e validação (consolidada)

| # | Alvo | Teste | Expectativa | Fase |
|---|---|---|---|---|
| T01 | Deck | contagens 210/17/32/89/34/26/15/12/2 | exato | 3 |
| T02 | Deck | IDs únicos e padrão | 210 únicos | 3 |
| T03 | Deck | campos comuns não vazios | 210/210 | 3 |
| T04 | Deck | `genre_adaptation`/`genre_relevant_axis` | 178/178 | 3 |
| T05 | Deck | 12 campos de gênero | 32/32 | 3 |
| T06 | Deck | subgêneros 1:1 | 8 cartas / 31 detalhes | 3 |
| T07 | Deck | `source_card_id` histórico | preservado, não adicionado | 3 |
| T08 | Deck | `compatible_genres` | 12 rótulos = WARNING | 3 |
| T09 | Deck | auditoria editorial | 243→210, 63→32, 2 removidas | 3 |
| T10 | Deck | imutabilidade do JSON | loader não altera fonte | 3 |
| T11 | Domínio | gênero dominante/secondary | 1 / 0–2 | 4 |
| T12 | Domínio | dimensões independentes | tom ≠ contexto ≠ público ≠ formato | 4 |
| T13 | Domínio | carta associada a cena | vínculo sobrevive a reordenação | 5 |
| T14 | Persistência | saves concorrentes | sem corrupção | 2 |
| T15 | Persistência | edição externa | preservada, conflito sinalizado | 2 |
| T16 | Persistência | migração de schema | sem perda de dados | 2 |
| T17 | IA | contexto seletivo | sem deck completo/manuscrito | 7 |
| T18 | IA | campos de adaptação no prompt | sempre presentes | 7 |
| T19 | IA | funcionamento sem IA | todos os fluxos funcionam | 7 |
| T20 | Integração | não sobrescrever | 0 arquivos alterados | 6 |
| T21 | Integração | detecção runtime | comandos descobertos do package.json | 6 |
| T22 | Segurança | CSP + mensagens | scripts externos bloqueados | 2 |
| T23 | Segurança | SecretStorage | nenhuma key em arquivo/log | 7 |
| T24 | UI | temas e teclado | claro/escuro + navegação | 8 |
| T25 | Aceitação | 19 critérios do MVP | todos atendidos | 8 |

---

## 10. Definition of Done (por fase)

Uma fase só é encerrada quando:
1. Funcionalidades reais (não mocks) conectadas a dados, lógica e persistência.
2. Testes escritos **e executados**, com erros corrigidos.
3. Build funcional (`compile` + `package`).
4. Documentação atualizada (inclusive este plano).
5. Relatório de fase: concluído, arquivos criados/modificados, resultados de testes, limitações restantes.

---

## 11. Riscos do plano

| Risco | Mitigação |
|---|---|
| Fase 5 muito grande | Separar em sub-entregas: premissa/Bible → personagens/conflitos/mundo → estrutura/cenas → auditoria |
| Decisões de IA atrasadas | Porta `AiProvider` definida na Fase 2; implementação na Fase 7 não bloqueia nada |
| Layout de capítulos do NA diferente do inferido | Isolado em `pathLayout`; experimentos V1–V6 na Fase 6 |
| Escopo de UI inflar | React só onde complexidade justifica; TreeView nativa para o resto |
| Rótulos `compatible_genres` gerarem confusão | Documentados como consultivos; alias map opcional |

---

## 12. Próximo passo

Fases 1–6 concluídas. A próxima unidade é a **Fase 7 — Inteligência Artificial opcional**: porta `AiProvider` + provider OpenAI-compatible, segredos em `SecretStorage`, contexto seletivo (nunca 210 cartas nem manuscrito completo), `genre_adaptation` + `genre_relevant_axis`, 9 perfis de prompt como dados, 3 alternativas por padrão e nenhuma inserção automática.

Em paralelo, executar o checklist manual V1/V2/V3/V5 em uma sessão com o Novel Assistant 0.1.0 instalado (`INTEGRATION.md` §6.4). O resultado de V2/V3 pode exigir ajuste **exclusivo** em `src/domain/integration/novel-path-layout.ts`; não há outro módulo que conheça o layout.
