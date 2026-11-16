# ARCHITECTURE.md — Story Deck / Arquitetura Técnica

> Fase 1 — Discovery e Arquitetura. Documento de planejamento. Nenhuma funcionalidade foi implementada.
> Local de origem: `C:\Projetos\Extensão VS Code`. Este arquivo reside no diretório de plano do modo de planejamento.

---

## 1. Diagnóstico do repositório

### 1.1 Estado atual

O diretório de trabalho `C:\Projetos\Extensão VS Code` é um **repositório semente (seed)**, não um projeto de software iniciado:

| Item | Situação |
|---|---|
| `MASTER PROMPT — STORY DECK.md` | Presente. 1683 linhas, 23 seções + Visão Final. É a especificação normativa. |
| `deck_storytelling.json` | Presente. 5207 linhas, fonte oficial do deck ENTRELINHAS v4. |
| `.novel-assistant/stats.json` | Presente. Gerado pelo Novel Assistant (estatísticas de escrita). |
| `package.json`, `tsconfig.json`, `node_modules` | **Ausentes**. Não há scaffold de extensão. |
| `src/`, `resources/`, `tests/` | **Ausentes**. |
| `.git` | **Ausente**. O diretório não é um repositório Git. |
| `deck-small.json` | **Ausente** (corretamente; o master prompt proíbe seu uso). |

**Conclusão:** a Fase 2 começará do zero. Não há código legado, dívida técnica nem decisões prévias a preservar. O único ativo de dados é o deck oficial; o único sinal de outra extensão é `.novel-assistant/stats.json`.

### 1.2 Toolchain disponível (verificado)

| Ferramenta | Versão observada | Adequação |
|---|---|---|
| Node.js | v26.2.0 | OK (acima do mínimo necessário) |
| npm | 11.15.0 | OK |
| npx | 11.15.0 | OK |
| git | 2.54.0.windows.1 | OK (necessário para testes de coexistência com Novel Assistant) |
| VS Code | 1.142.0 (instalação local) | OK |
| Novel Assistant | `baryo-dev.novel-assistant` **0.1.0** (instalado em `~/.vscode/extensions/`) | Ver `INTEGRATION.md` |

### 1.3 Implicações do diagnóstico

1. O bootstrap deve criar toda a estrutura de build (esbuild + Vite + TypeScript + Zod + Vitest).
2. O deck deve ser **copiado** para `resources/decks/` como recurso incorporado — nunca editado in place.
3. A coexistência com Novel Assistant já é observável no workspace, mas o projeto ainda **não foi inicializado** por ele: existe `stats.json`, porém não existem os diretórios `Manuscript/`, `Characters/`, etc. Isso confirma que `stats.json` é criado preguiçosamente pelo serviço de estatísticas, independentemente do comando "New Project".
4. Como não há Git no projeto, a inicialização de Git pelo Story Deck **não deve ser assumida**; ela pertence ao Novel Assistant (Fluxo A) ou é opcional no Fluxo B.

---

## 2. Decisões arquiteturais (ADRs resumidas)

| ID | Decisão | Justificativa | Alternativa rejeitada |
|---|---|---|---|
| ADR-01 | Clean Architecture em 4 camadas (domain / application / infrastructure / presentation) | Exigido pelo master prompt; domínio puro sem dependência da API do VS Code facilita testes | Camada única com lógica em comandos/webview |
| ADR-02 | Domínio **zero dependências de `vscode`** | Permite testar regras com Vitest sem Extension Host | Importar `vscode` em entidades |
| ADR-03 | Deck como **recurso de leitura incorporado** + validação Zod na carga | Preserva conteúdo original e detecta corrupção cedo | Buscar deck remoto ou gerar cartas |
| ADR-04 | `compatible_genres` tratado como **rótulo consultivo**, não chave estrita | 12 rótulos não resolvem para IDs/cartas ativos (ver `DECK_SCHEMA.md`); rejeitar o deck por isso violaria "não inventor cartas / não remova cartas" | Foreign key obrigatória |
| ADR-05 | Persistência local em `.storydeck/*.json` + `Story/*.md`, com escrita atômica e lock por projeto | Requisito local-first + proteção contra gravações concorrentes | SQLite ou armazenamento global |
| ADR-06 | Webview **apenas** para Deck Studio, Genre Builder e Studio Builder visual; TreeViews nativas para navegação hierárquica | Master prompt §15.3: "Não transforme toda a extensão em uma Webview" | Webview única monolítica |
| ADR-07 | IA como módulo opcional com porta `AiProvider` (OpenAI-compatible) | Funcionar integralmente sem IA; agnóstico de provedor | Dependência direta de SDK proprietário |
| ADR-08 | Tiragens recomendadas como **dados** (`SpreadDefinition`), não código | Master prompt §8: "Crie um mecanismo extensível para futuras tiragens personalizadas" | 4 functions hardcoded |
| ADR-09 | Integração com Novel Assistant por **descoberta em runtime** de `contributes.commands`, nunca IDs inventados | Master prompt §14.2 | Hardcode de comandos presumidos |
| ADR-10 | Nenhum arquivo existente é sobrescrito; geradores são idempotentes (criam se ausente) | Master prompt §14.4 e §21.17 | Escrita direta sempre |
| ADR-11 | Mensagens Webview ↔ Host tipadas com discriminated unions validadas por Zod | Segurança §18 | `postMessage` livre |
| ADR-12 | `engines.vscode: ^1.85.0` e alvo Node compatível | Alinha-se ao baseline observado no Novel Assistant 0.1.0, garantindo coexistência | VS Code mais antigo |

---

## 3. Arquitetura técnica proposta

### 3.1 Visão em camadas

```
┌───────────────────────────────────────────────────────────────────────┐
│ PRESENTATION (extension/)                                             │
│  commands · providers (TreeView) · views (WebviewPanel) · lifecycle   │
│  - registra comandos, traduz eventos da UI em casos de uso            │
│  - CSP, validação de mensagens, tema do VS Code via CSS vars          │
└───────────────────────────┬───────────────────────────────────────────┘
                            │ DTOs validados (shared/messages)
┌───────────────────────────▼───────────────────────────────────────────┐
│ APPLICATION (application/)                                            │
│  use-cases · services · ports (interfaces) · dto                      │
│  - SelectCards, DrawSpread, ChooseGenre, BuildPremise,                │
│    ComposeStoryBible, OrganizeStory, AuditNarrative, GenerateSuggestion│
│  - orquestra domínio através de portas; sem conhecimento de VS Code   │
└───────────────────────────┬───────────────────────────────────────────┘
                            │ portas (dependency inversion)
┌───────────────────────────▼───────────────────────────────────────────┐
│ INFRASTRUCTURE (infrastructure/)                                      │
│  deck (loader/validator) · persistence (JSON/MD) · filesystem ·       │
│  ai (OpenAI-compatible) · integrations (NovelAssistantAdapter) ·      │
│  logging · settings/credentials                                       │
└───────────────────────────┬───────────────────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────────────┐
│ DOMAIN (domain/) — puro, testável, sem 'vscode'                       │
│  deck · card · genre · story · character · narrative · shared         │
│  - entidades, value objects, regras, invariantes, eventos de domínio  │
└───────────────────────────────────────────────────────────────────────┘
```

**WEBVIEW (`webview/src/`)** é um cliente separado, empacotado por Vite, que consome apenas o protocolo de mensagens. React é usado onde a complexidade justificar (grade de cartas, filtros, Genre Builder, editor de estrutura); TreeViews nativas cobrem navegação e hierarquia.

### 3.2 Portas principais (interfaces da aplicação)

```ts
interface DeckRepository        { load(): Promise<Deck>; getVersion(): string }
interface ProjectRepository     { load(id): Promise<StoryProject>; save(p): Promise<void>;
                                  watch(id, cb): Disposable; list(): Promise<ProjectMeta[]> }
interface DocumentRenderer      { renderBible(b): string; renderPremise(p): string; /* ... */ }
interface AiProvider            { chat(req: AiRequest, token: CancellationToken): Promise<AiResponse> }
interface IntegrationGateway    { detect(): Promise<IntegrationStatus>;
                                  runPublicCommand(id, args?): Promise<void> }
interface CredentialVault       { get(key): Promise<string|undefined>; set(key,v): Promise<void> }
interface AppLogger              { info(msg, meta?); warn(...); error(...) } // sem conteúdo do manuscrito
```

A aplicação depende **apenas dessas interfaces**. Adaptadores concretos vivem em `infrastructure/` e são injetados no bootstrap (`extension/extension.ts`).

### 3.3 Fluxo de dados ponta a ponta

```
deck_storytelling.json  --(copiar p/ resources/decks)-->  JsonDeckLoader + Zod
        |                                                       |
        +--> Deck (domínio, imutável) --> índices (id, categoria, kind, tag, subgênero)
                                              |
Usuário --> Webview/TreeView --> mensagem validada --> Use Case --> regras de domínio
                                                        |              |
                                                        +--> ProjectRepository (.storydeck/*.json)
                                                        +--> DocumentRenderer (Story/*.md)
                                                        +--> ContextBuilder --> AiProvider (opcional)
                                                        +--> IntegrationGateway --> Novel Assistant
```

### 3.4 Módulos centrais e responsabilidades

| Módulo | Responsabilidade | Não faz |
|---|---|---|
| `DeckEngine` | Carregar, validar, indexar e consultar o deck | Não altera cartas |
| `SelectionService` | Selecionar/desmarcar/favoritar/bloquear/substituir/sortear/embaralhar; versões e histórico | Não decide gênero |
| `SpreadEngine` | Interpretar `SpreadDefinition`, calcular progresso, salvar/retomar | Não cria cartas |
| `GenreService` | Aplicar regra 1 dominante + 0–2 secundários; subgêneros; contrato; dimensões | Não bloqueia combinações por `compatible_genres` |
| `StoryBuilder` | Orquestrar 9 etapas de construção e hierarquia ato→capítulo→cena | Não escreve prosa do manuscrito |
| `StoryBibleAssembler` | Consolidar 17 seções em Markdown editável | Não é relatório estático |
| `LinkRegistry` | Rastrear carta ↔ decisão/gênero/personagem/ato/capítulo/cena; realocar referências | Não perde vínculo ao reordenar |
| `AuditService` | Aplicar cartas `craft_warning` e regras futuras de coerência | Nunca apresenta alerta como erro absoluto |
| `ContextBuilder` | Selecionar contexto mínimo relevante para IA (inclui `genre_adaptation`/`genre_relevant_axis`) | Nunca envia as 210 cartas nem o manuscrito inteiro |
| `NovelAssistantAdapter` | Detectar extensão, ler comandos públicos, abrir arquivos, delegar escrita | Não modifica arquivos internos da extensão |

### 3.5 Segurança (master prompt §18)

- CSP rigoroso no Webview: `default-src 'none'`; `script-src` somente o bundle local com nonce; `style-src` com nonce; sem `unsafe-inline`.
- `localResourceRoots` restrito a `resources/` e ao diretório do projeto.
- Toda mensagem recebida é validada por schema Zod; comandos arbitrários vindos da Webview **nunca** são executados — a Webview envia intenções semânticas (`{type: 'selectCard', cardId}`), e o Host mapeia para casos de uso.
- API key em `SecretStorage`; nunca em arquivos do projeto nem em mensagens para a Webview.
- Logs sem trechos do manuscrito; erros registrados com IDs e códigos, não conteúdo.
- Nenhuma escrita sem autorização; geradores verificam existência antes de criar.

---

## 4. Estrutura de diretórios proposta

Adaptação da estrutura sugerida no master prompt §16, com nomes alinhados às responsabilidades acima:

```text
story-deck/
├── package.json                      # engines ^1.85.0, contributes, scripts
├── tsconfig.json                     # base; referências para webview
├── esbuild.config.mjs                # bundle do Extension Host
├── vite.config.ts                    # bundle da Webview (React)
├── vitest.config.ts
├── .vscodeignore
├── README.md
│
├── resources/
│   └── decks/
│       └── entrelinhas-storytelling-v4.json   # cópia integral, somente leitura
│
├── src/
│   ├── extension/                    # Presentation (Extension Host)
│   │   ├── extension.ts              # bootstrap / composition root
│   │   ├── commands/                 # registration + handlers finos
│   │   ├── providers/                # TreeDataProvider, WebviewViewProvider
│   │   ├── views/                    # WebviewPanel: DeckStudio, GenreBuilder, StoryBuilder
│   │   ├── integrations/             # ponte para presentation→application
│   │   └── lifecycle/                # activate/deactivate, disposable registry
│   │
│   ├── domain/                       # Regras puras — sem 'vscode'
│   │   ├── shared/                   # EntityId, Result, DomainError, eventos
│   │   ├── deck/                     # Deck, DeckIndex, DeckVersion
│   │   ├── card/                     # Card (base), variações por kind, Tag
│   │   ├── genre/                    # GenreCard, SubGenre, GenreProfile, GenreContract,
│   │   │                             # GenreSelectionPolicy, GenreContext
│   │   ├── story/                    # StoryProject, Premise, StoryBible, Act, Chapter, Scene
│   │   ├── character/                # Character, Relationship, CharacterArc
│   │   └── narrative/                # Conflict, World, Secret, Narrator, Structure,
│   │                                 # Technique, Decision, SpreadDefinition, AuditFinding
│   │
│   ├── application/                  # Casos de uso
│   │   ├── use-cases/                # select-cards, draw-spread, choose-genre,
│   │   │                             # build-premise, compose-bible, organize-story,
│   │   │                             # audit-narrative, generate-suggestion
│   │   ├── services/                 # SelectionService, SpreadEngine, GenreService,
│   │   │                             # StoryBuilder, LinkRegistry, ContextBuilder
│   │   ├── ports/                    # interfaces (DeckRepository, AiProvider, ...)
│   │   └── dto/                      # DTOs de entrada/saída
│   │
│   ├── infrastructure/               # Adaptadores
│   │   ├── deck/                     # JsonDeckLoader, DeckValidator (Zod), indexes
│   │   ├── persistence/              # JsonProjectRepository, atomic-write, lock,
│   │   │                             # migrations, external-change-watcher, ops-log
│   │   ├── filesystem/               # PathResolver, FileGuard (não sobrescrever)
│   │   ├── markdown/                 # StoryBibleRenderer, PremiseRenderer, OutlineRenderer
│   │   ├── ai/                       # OpenAICompatibleProvider, provider configs
│   │   ├── integrations/             # NovelAssistantAdapter, extension-discovery
│   │   ├── credentials/              # SecretStorageVault
│   │   └── logging/                  # VsCodeOutputLogger
│   │
│   ├── webview/                      # Frontend React (bundled por Vite)
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── features/             # deck-catalog, genre-builder, story-builder,
│   │       │                         # spreads, audit, ai-panel
│   │       ├── components/           # Card, CategoryBadge, FilterBar, SpreadBoard,
│   │       │                         # OutlineTree, DetailPanel (reutilizáveis)
│   │       ├── hooks/                # useVscodeMessage, useTheme, useSelection
│   │       ├── stores/               # estado local da webview (espelho do host)
│   │       ├── services/             # message-client (postMessage tipado)
│   │       └── styles/               # tokens.css (variáveis do tema VS Code), cards.css
│   │
│   └── shared/                       # Contratos compartilhados host ↔ webview
│       ├── types/
│       ├── schemas/                  # Zod: deck, project, messages
│       └── messages/                 # discriminated unions (request/response/event)
│
├── tests/
│   ├── unit/                         # domínio + validação do deck (Vitest)
│   ├── integration/                  # @vscode/test-electron
│   └── fixtures/                     # decks sintéticos pequenos (somente aqui)
│
└── docs/                             # cópias dos 6 documentos de arquitetura
    ├── ARCHITECTURE.md
    ├── PRODUCT_SPEC.md
    ├── DATA_MODEL.md
    ├── DECK_SCHEMA.md
    ├── INTEGRATION.md
    └── IMPLEMENTATION_PLAN.md
```

### 4.1 Regras de organização

- `domain/` **nunca** importa `vscode`, `fs`, `path` ou qualquer adaptador.
- `application/` importa apenas `domain/` e `shared/`.
- `infrastructure/` implementa portas; pode importar `vscode`.
- `extension/` é a única camada que registra comandos e cria Webviews.
- `webview/` não conhece o filesystem; só troca mensagens.
- `shared/` é o único ponto de acoplamento intencional entre Host e Webview.

---

## 5. Coexistência com outras extensões

- Activity Bar própria `story-deck`, com ícone distinto da Activity Bar `novel-assistant-sidebar` (observada na v0.1.0).
- Prefixo de comandos `storyDeck.*` e de configurações `storyDeck.*` para evitar colisão com `novel-assistant.*`.
- Diretório próprio `.storydeck/` e `Story/`; nenhum arquivo de `.novel-assistant/`, `Manuscript/`, `Characters/`, etc. é alterado.
- Ao abrir um capítulo/cena, o Story Deck usa `vscode.window.showTextDocument()` como caminho universal; a delegação ao editor WYSIWYG do Novel Assistant occurre somente quando o comando público tiver sido confirmado em runtime.

---

## 6. Limitações conhecidas desta fase

1. Nenhuma linha de código foi escrita; esta é uma proposta, não uma implementação.
2. O layout exato de capítulos/cenas reconhecido pelo Novel Assistant precisa de teste empírico em workspace temporário (ver `INTEGRATION.md`, item "Validação pendente").
3. Nome definitivo do publisher/extension ID do Story Deck precisa de confirmação do usuário; proposta: `story-deck` (publisher a definir).
4. Documentos registrados no diretório de plano do modo de planejamento; a movimentação para `docs/` no repositório deve acontecer quando o modo de implementação for ativado.
