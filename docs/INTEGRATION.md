# INTEGRATION.md — Diagnóstico e Estratégia de Integração com Novel Assistant

> Fase 1 — Discovery. Investigação da instalação **real** do Novel Assistant, conforme master prompt §14.2: "descubra o ID real em seu `package.json` ou em `contributes.commands`".

---

## 1. Diagnóstico da instalação observada

### 1.1 Dados da extensão instalada

| Propriedade | Valor observado |
|---|---|
| ID | `baryo-dev.novel-assistant` |
| Pasta | `C:\Users\Administrator\.vscode\extensions\baryo-dev.novel-assistant-0.1.0` |
| `name` / `publisher` | `novel-assistant` / `baryo-dev` |
| `version` | **0.1.0** (changelog datado de 2025-01-20) |
| `engines.vscode` | `^1.85.0` |
| `main` | `./dist/extension.js` (bundle; usa EasyMDE embutido em `resources/vendor/js`) |
| Código-fonte | `https://github.com/BaryoDev/NovelAssistant` (conforme changelog) |

### 1.2 `contributes` presentes

`commands`, `menus`, `viewsContainers`, `views`, `customEditors`, `configuration`, `keybindings`.

**Activity Bar própria:** `novel-assistant-sidebar` ("Novel Assistant", ícone `resources/book.svg`) — distinta da futura Activity Bar `story-deck`. Sem conflito.

**Views:**
| ID | Tipo | Nome |
|---|---|---|
| `novel-structure` | TreeView nativa | Manuscript |
| `novel-assistant.outlineView` | Webview | Outline |
| `novel-assistant.characterPanel` | Webview | Characters |

**Custom Editor:** `novel-assistant.wysiwyg`, display "Novel WYSIWYG Editor", `selector: [{ filenamePattern: "*.md" }]`, `priority: "option"` — ou seja, é uma **opção** de abertura para `.md`, não substitui o editor de texto padrão. Isso é favorável: o Story Deck pode abrir `.md` com `showTextDocument` sem conflito.

### 1.3 Comandos públicos reais (21 — descobertos em `contributes.commands`)

| ID do comando | Título |
|---|---|
| `novel-assistant.newProject` | Novel Assistant: New Project |
| `novel-assistant.refreshEntry` | Refresh |
| `novel-assistant.showStats` | Novel Assistant: Show Progress Dashboard |
| `novel-assistant.compareHead` | Compare with Saved |
| `novel-assistant.viewHistory` | View History |
| `novel-assistant.startSprint` | Novel Assistant: Start Writing Sprint |
| `novel-assistant.stopSprint` | Novel Assistant: Stop Writing Sprint |
| `novel-assistant.toggleSprint` | Novel Assistant: Toggle Writing Sprint |
| `novel-assistant.export` | Novel Assistant: Export Manuscript |
| `novel-assistant.backup` | Novel Assistant: Create Backup |
| `novel-assistant.analyzeWriting` | Novel Assistant: Analyze Writing |
| `novel-assistant.searchProject` | Novel Assistant: Search in Project |
| `novel-assistant.searchAndReplace` | Novel Assistant: Search and Replace in Project |
| `novel-assistant.newChapter` | Novel Assistant: New Chapter |
| `novel-assistant.newScene` | Novel Assistant: New Scene |
| `novel-assistant.newCharacter` | Novel Assistant: New Character |
| `novel-assistant.toggleTypewriterMode` | Novel Assistant: Toggle Typewriter Mode |
| `novel-assistant.toggleFocusMode` | Novel Assistant: Toggle Focus Mode |
| `novel-assistant.setTheme` | Novel Assistant: Set Editor Theme |
| `novel-assistant.setGoals` | Novel Assistant: Set Writing Goals |

(21 entradas incluindo `refreshEntry`; a listagem acima contém 20 linhas — a contagem exata será confirmada novamente na Fase 6 pelo adaptador em runtime.)

**Comandos com visibilidade restrita no Command Palette:** `compareHead`, `viewHistory`, `refreshEntry` têm `when: "false"` — só aparecem no menu de contexto da TreeView `novel-structure` para itens `scene`. O Story Deck **não deve** tentar invocá-los como se fossem comandos de paleta genéricos.

**Atalhos confirmados:** `newScene` (Ctrl/Cmd+Shift+N), `searchProject` (Ctrl/Cmd+Shift+H), `startSprint` (Ctrl/Cmd+Shift+S), `toggleFocusMode`, `toggleTypewriterMode`.

### 1.4 Configurações públicas (`novel-assistant.*`)

`editor.theme` (auto), `editor.fontSize` (18), `editor.fontFamily` (Merriweather), `editor.lineHeight` (1,8), `editor.maxWidth` (720), `editor.typewriterMode`, `editor.focusMode`, `editor.showToolbar`, `dailyWordGoal` (1000), `wordsPerMinute` (200), `sprintDuration` (25), `autoBackup.enabled` (true), `autoBackup.intervalMinutes` (30), `autoBackup.includeTimestamp` (true).

**Namespace separado:** o Story Deck usará `storyDeck.*`, evitando colisão.

### 1.5 Estrutura de projeto criada (código real observado)

O comando `newProject` cria, **somente se ausentes**:

```text
<workspace>/
├── Manuscript/        # capítulos e cenas (.md)
├── Characters/        # fichas de personagem
├── Locations/         # descrições de world building
├── Research/          # links e referências
├── Timeline/          # cronologia
├── Notes/             # brainstorm
├── USER_GUIDE.md      # guia embutido
└── .novel-assistant/
    └── stats.json     # metas e estatísticas
```

Código extraído (ofuscado): `const r=["Manuscript","Characters","Locations","Research","Timeline","Notes"]… a.existsSync(r)||a.mkdirSync(r)`.

**`stats.json` no workspace atual** (conteúdo real): `goals.dailyWordGoal=1000`, `sessionWordGoal=500`, `projectWordGoal=50000`; `dailyStats[0] = {date:"2026-11-16", wordsWritten:5105, timeSpentMinutes:19, sessionsCount:1}`; `currentStreak=1`, `totalWordsEver=5105`, `projectStartDate="2026-11-16"`.

**Interpretação:** `stats.json` é criado pelo `WritingStatsService` com base apenas na pasta de workspace aberta (`join(workspaceRoot, ".novel-assistant", "stats.json")`), **sem exigir** que `newProject` tenha sido executado. Confirma-se que os 6 diretórios **ainda não existem** neste workspace — o projeto não foi inicializado pelo Novel Assistant.

### 1.6 Convenções de capítulos/cenas observadas

- `newScene` abre um `QuickPick` com o placeholder **"Select chapter for new scene"** (lista de diretórios sob `Manuscript`); depois pede "Enter scene name" com placeholder "e.g., Scene 1 - Opening".
- Grava `<nome>.md` dentro da pasta do capítulo selecionada, com template:

```markdown
# <nome>

## Synopsis
[Brief scene summary]

---

[Start writing your scene here...]
```

- `analyzeProject()` lê recursivamente todos os `.md` sob `Manuscript/`.
- A TreeView ordena diretórios primeiro, depois arquivos alfabeticamente; mostra contagem de palavras, contagem de cenas por capítulo, ícones e tempos de leitura (conforme changelog 0.1.0).
- Git é feito via biblioteca `simple-git` (não comandos de shell).

**Layout inferido (a validar):** `Manuscript/<Capítulo>/<Cena>.md`.

### 1.7 Recursos que o master prompt atribui ao Novel Assistant — confirmação

| Recurso | Confirmado? | Evidência |
|---|---|---|
| Editor WYSIWYG | ✅ | `customEditors` + EasyMDE bundled |
| Estrutura de manuscrito | ✅ | `Manuscript/` + TreeView `novel-structure` |
| Personagens | ✅ | `Characters/` + comando + Webview |
| Localizações | ✅ | `Locations/` (diretório; **sem comando dedicado**) |
| Linha do tempo | ✅ | `Timeline/` (diretório; **sem comando dedicado**) |
| Pesquisas e notas | ✅ | `Research/`, `Notes/` (diretórios) |
| Contagem de palavras | ✅ | TreeView + `analyzeWriting` + stats |
| Histórico / comparação | ✅ | `viewHistory`, `compareHead` (menu de contexto) |
| Git automático | ✅ | changelog + `simple-git` |

**Divergência útil:** a descrição pública fala em "gerenciamento de localizações" e "linha do tempo", mas a v0.1.0 oferece apenas os **diretórios**, sem comandos dedicados. O Story Deck não deve inventar comandos para eles; deve apenas tratar os diretórios como compatíveis.

---

## 2. Estratégia de integração proposta

### 2.1 Detecção em runtime (`NovelAssistantAdapter`)

```ts
const ext = vscode.extensions.getExtension('baryo-dev.novel-assistant');
const status = {
  installed: !!ext,
  version: ext?.packageJSON?.version as string | undefined,
  commands: Object.values(ext?.packageJSON?.contributes?.commands ?? {})
              .map(c => c.command),              // descoberta real, nunca hardcoded
  exportsApi: ext?.exports !== undefined,        // presumidamente false na v0.1.0
  workspaceDirs: await detectDirs(workspaceRoot) // Manuscript/, Characters/, ...
};
```

- `ext.packageJSON` é **público** e é a fonte oficial de IDs (master prompt §14.2).
- Nenhuma API privada é assumida; se `exportsApi === false`, a integração é exclusivamente por workspace + comandos públicos.
- O adaptador **não lê nem altera** `dist/extension.js` em produção; a inspeção feita nesta fase foi apenas discovery.

### 2.2 Fluxos de criação de projeto (§14.3)

**Fluxo A — Novel Assistant instalado**
1. Detectar extensão e versão; confirmar que `novel-assistant.newProject` existe na lista descoberta.
2. Oferecer ao usuário executar o fluxo oficial (`vscode.commands.executeCommand('novel-assistant.newProject')`).
3. Após a criação, o Story Deck adiciona **somente** `.storydeck/` e `Story/`.
4. Nunca tocar em `Manuscript/`, `Characters/`, `.novel-assistant/`, `USER_GUIDE.md`.

**Fluxo B — não instalado**
1. Criar `.storydeck/` + `Story/` e, para compatibilidade futura, os 6 diretórios documentados **se ausentes**.
2. Funcionar integralmente sem Novel Assistant (o Story Deck não depende dele).
3. Registrar em `project.json` o modo (`integrationMode: 'novel-assistant' | 'standalone'`) para ajustar o fluxo de escrita depois.

### 2.3 Organização complementar (§14.4)

```text
<workspace>/
├── .storydeck/         # projeto, seleção, estado, decisões, settings
├── Story/              # premise, story-bible, genre-contract, outline, narrative-decisions
├── Manuscript/         # do Novel Assistant — Intacto
├── Characters/ ...     # do Novel Assistant — Intacto
└── .novel-assistant/   # do Novel Assistant — Intacto
```

 geradores usam `FileGuard.createIfMissing()`: se arquivo existe, nunca sobrescrevem — oferecem "mesclar" ou "manter edição atual" na UI.

### 2.4 Fluxo de escrita (§14.5)

| Ação | Implementação |
|---|---|
| Abrir capítulo/cena | `vscode.window.showTextDocument(Uri.file(path))` — sempre funciona |
| Criar novo capítulo/cena | Se `novel-assistant.newChapter`/`newScene` foi confirmado em runtime **e** o usuário optou pelo fluxo oficial, delegar; senão, criar `.md` no layout compatível com template próprio |
| Consultar planejamento enquanto escreve | Webview lateral "Scene Brief" lendo `.storydeck/story-state.json` + cartas vinculadas |
| Acessar personagens/localizações | Abrir arquivos de `Characters/` e `Locations/` (somente leitura no Story Deck) |
| Cartas da cena | `CardLink` filtrados por `{ type: 'scene', sceneId }` |

**Regra:** direcionar para o editor do Novel Assistant **somente quando comandos e formatos forem efetivamente conhecidos**; caso contrário, Markdown normal.

### 2.5 Mapeamento de dados entre as extensões

| Story Deck | Novel Assistant | Tipo de integração |
|---|---|---|
| `Character` (nome, descrição, arco) | `Characters/*.md` | leitura/opcional escrita se ausente |
| `Location` (world building) | `Locations/*.md` | leitura |
| `Chapter` + `Scene` | `Manuscript/<Capítulo>/<Cena>.md` | abertura; criação opcional via comando público |
| `GenreContract` / `StoryBible` | `Story/*.md` (próprio) | sem sobreposição |
| Segredos, técnica, decisões | `.storydeck/*.json` | sem sobreposição |

---

## 3. Validação pendente ( Antes de definir a estrutura definitiva dos capítulos — §14.4)

Experimentos a executar na **Fase 6**, em workspace temporário com a extensão instalada:

| # | Experimento | Critério |
|---|---|---|
| V1 | Executar `novel-assistant.newProject` em workspace vazio | Confirmar exatamente quais dirs/arquivos aparecem e se `.git` é criado |
| V2 | Executar `novel-assistant.newChapter` e `newScene` | Confirmar nomes de pastas/arquivos e se `Manuscript/<Capítulo>/<Cena>.md` é reconhecido pela TreeView e pelo Outline |
| V3 | Criar manualmente `Manuscript/Meu Capitulo/Minha Cena.md` e recarregar | Verificar se a TreeView reconhece (teste crucial para o Fluxo B) |
| V4 | Inspecionar `ext.exports` em runtime | Confirmar ausência de API pública programável |
| V5 | Abrir `.md` com `showTextDocument` e com `vscode.openWith(..., 'novel-assistant.wysiwyg')` | Confirmar que ambos funcionam e que o WYSIWYG é opcional |
| V6 | Instalar o Story Deck junto com o NA e executar comandos de ambas | Nenhuma colisão de comandos, IDs, Activity Bars ou writes |

Enquanto V1–V6 não forem executados, o layout `Manuscript/<Capítulo>/<Cena>.md` é **inferido**, não confirmado. A implementação deve mantê-lo em um único módulo (`NovelAssistantAdapter.pathLayout`) para troca fácil.

---

## 4. Riscos e mitigação

| Risco | Impacto | Mitigação |
|---|---|---|
| Versão do marketplace diferente da v0.1.0 instalada | Comandos podem mudar | Descoberta em runtime; nunca IDs fixos como contrato |
| Extensão desinstalada após criação do projeto | Perda do editor WYSIWYG | Fluxo B independente; `.md` continua legível |
|Escrever em `Manuscript/` corrompe histórico do NA | Alto | Story Deck só cria arquivo se ausente; nunca edita conteúdo existente |
| Conflito de Activity Bar/namespace | Médio | IDs `story-deck` / `storyDeck.*` distintos |
| `compatible_genres` com rótulos divergentes (ver DECK_SCHEMA §9) | Baixo | Consultivo, nunca bloqueante |
| Workspace atual sem diretórios do NA | Baixo | Fluxo B cria o que faltar, sem tocar em `stats.json` |

---

## 5. Informações faltantes / decisões necessárias

1. **Versão mínima suportada do Novel Assistant** — proposta: 0.1.0 (a instalada). Confirmar com o usuário.
2. **Resultado dos experimentos V1–V6** — bloqueia a definição final do layout de capítulos (não bloqueia o início da Fase 2, pois o adaptador isola essa decisão).
3. **Se o usuário quer que o Story Deck crie automaticamente os 6 diretórios no Fluxo B** — proposta: sim, se ausentes (compatibilidade futura), mas nunca sobrescrever.
4. **Publisher/ID final da extensão Story Deck** — proposta provisória: `story-deck`.
5. **Política caso o NA esteja instalado mas desatualizado** — proposta: aviso informativo, não bloqueio.

---

## 6. Resultado da Fase 6 — integração com Novel Assistant (2026-11-16)

**Status:** núcleo, UI, comandos e testes concluídos. O layout `Manuscript/<Capítulo>/<Cena>.md` continua **inferido** (V2/V3 pendentes) e está isolado em um único módulo, pronto para troca.

### 6.1 Entregas

| Arquivo | Entrega |
|---|---|
| `src/domain/integration/novel-path-layout.ts` | Módulo puro do layout inferido: `sanitizeSegment`, `chapterDirectory`, `scenePath`. Remove travessia `..`, separadores, caracteres inválidos no Windows, limita tamanho e é idempotente. É o único lugar que conhece o layout. |
| `src/domain/integration/novel-assistant-package.ts` | Descoberta pura do manifesto: `parseNovelAssistantPackage` lê `version`, `contributes.commands[].command`, `contributes.customEditors[].viewType` e `exports`; `presentNovelAssistantDirs` filtra os seis diretórios documentados. Sem `vscode`. |
| `src/application/ports/integration-gateway.ts` | `NovelAssistantStatus` ampliado (`customEditors`, `exportsApi`, `workspaceDirs`) e `hasCommand(id)` como única porta de execução. `IntegrationMode` (`novel-assistant` \| `standalone`). |
| `src/infrastructure/integrations/vscode-novel-assistant-adapter.ts` | Detecta extensão/versão/comandos/custom editors em runtime e responde `hasCommand()`. Nenhum ID é tratado como contrato. |
| `src/application/services/integration-service.ts` | Decide o fluxo A (NA instalado → modo `novel-assistant`, oferece o comando oficial **somente** se `hasCommand` confirmar, não cria diretórios do NA) ou B (sem NA → `standalone`, cria os 6 diretórios). |
| `src/infrastructure/persistence/integration-settings.ts` | Lê/escreve `integrationMode` em `.storydeck/settings.json` preservando chaves existentes e `schemaVersion`. **`project.json` v2 não foi alterado.** |
| `src/infrastructure/persistence/json-project-repository.ts` | `ensureStructure({ compatibilityDirs })` cria os 6 diretórios documentados **somente se ausentes**, no fluxo B. Nunca toca em `.novel-assistant/`, `USER_GUIDE.md` nem no conteúdo existente. |
| `src/infrastructure/integrations/manuscript-scene-store.ts` | `ensureSceneFile` usa `writeFile` com flag `wx`: cria o `.md` apenas se ausente, com dupla validação de caminho (sanitização + checagem de que o absoluto continua sob `Manuscript/`). |
| `src/infrastructure/markdown/scene-manuscript-template.ts` | Template próprio (`# título`, `## Synopsis`, `---`, `<!-- story-deck:scene-id ... -->`), distinto do template do NA. |
| `src/application/services/scene-brief-service.ts` | Monta título/objetivo/conflito/mudança/gancho, capítulo/ato, cartas vinculadas (`links` filtrados por `{type:'scene', sceneId}`), gênero dominante, dimensões e avisos de `StoryContextBuilder`. |
| `src/extension/views/scene-brief-html.ts` + `scene-brief-panel.ts` | HTML estático com `escapeHtml` em todo valor dinâmico, `default-src 'none'`, sem scripts e sem recursos locais; painel reutilizável com `enableScripts: false`. |
| `src/extension/extension.ts` | 3 novos comandos e composição dos serviços. `openSceneInManuscript` usa `showTextDocument` como padrão e oferece `vscode.openWith` **somente** com um viewType descoberto. |
| `package.json` | Comandos `storyDeck.checkNovelAssistant`, `storyDeck.openSceneInManuscript`, `storyDeck.showSceneBrief` (17 no total) e entradas em `view/title` do Story Builder/Dashboard. |

### 6.2 O que foi automatizado

- **V4 (API programável):** `parseNovelAssistantPackage` lê efetivamente `extension.exports`; testes unitários cobrem ausência (`false`), `null` (`false`), objeto e função (`true`). No host de teste o NA está desativado (`--disable-extensions`), então o valor runtime observado é `false` — a checagem **com a extensão real instalada** continua no checklist manual abaixo. Não afirmamos que V4 foi totalmente executado.
- **V6 (coexistência):** o teste de integração lê os `contributes` do próprio `package.json` e verifica: todos os comandos começam com `storyDeck.*`, não há IDs duplicados, nenhum ID repete comandos conhecidos do NA e a Activity Bar não é `novel-assistant-sidebar`.
- **Intocabilidade do NA:** um sentinel `.novel-assistant/stats.json` é escrito antes da ativação e comparado **byte a byte** ao final da suíte — nenhuma alteração. Os comandos de cena também são chamados duas vezes: a segunda não sobrescreve o arquivo criado na primeira.
- **Fluxo B ponta a ponta:** `settings.json` registra `integrationMode: standalone`; os 6 diretórios são criados; `project.json` semeado não é sobrescrito; os fluxos de desenho, gênero, história e seleção continuam funcionando.

### 6.3 Invariantes verificados

Nada é sobrescrito; nada em `.novel-assistant/` é alterado; nomes são sanitizados sem path traversal; nenhuma API privada é usada; sem o NA a extensão funciona integralmente.

### 6.4 Checklist pendente — interação manual, NÃO executado

Estes experimentos exigem uma sessão interativa com o Novel Assistant 0.1.0 instalado e não foram realizados nesta fase. Não devem ser marcados como concluídos.

- [ ] **V1** — Em workspace vazio, executar `novel-assistant.newProject`; anotar exatamente quais dirs/arquivos aparecem e se `.git` é criado. Define se o Fluxo A precisa de algum ajuste.
- [ ] **V2** — Executar `novel-assistant.newChapter` e `novel-assistant.newScene`; confirmar nomes de pastas/arquivos e se `Manuscript/<Capítulo>/<Cena>.md` aparece na TreeView e no Outline. Valida o `pathLayout`.
- [ ] **V3** — Criar manualmente `Manuscript/Meu Capitulo/Minha Cena.md`, recarregar e verificar reconhecimento pelo NA. É o teste crucial do Fluxo B.
- [ ] **V4 (runtime)** — Com o NA instalado, inspecionar `ext.exports` em uma sessão real e confirmar a ausência de API pública programática. A lógica de leitura já está coberta por teste; falta a observação real.
- [ ] **V5** — Abrir o `.md` da cena com `showTextDocument` e, separadamente, com `vscode.openWith(uri, 'novel-assistant.wysiwyg')`; confirmar que ambos funcionam e que o WYSIWYG é opcional (`priority: "option"`).
- [ ] **V6 (execução real)** — Instalar Story Deck e NA juntos, executar comandos de ambos e conferir visualmente ausência de colisão de UI/escrita. A parte automatizada (manifesto + sentinel) já passou.

### 6.5 Verificações executadas

| Comando | Resultado |
|---|---|
| `npm test` | ✅ 28 arquivos, **194 testes aprovados** (154 anteriores + 40 novos) |
| `npx tsc -p tsconfig.json --noEmit` | ✅ sem erros |
| `npx tsc -p tsconfig.webview.json` | ✅ sem erros |
| `npm run compile` | ✅ host 394,7 kB + webview 358,03 kB (CSS 13,48 kB) |
| `npm run test:integration` | ✅ exit 0 — 17 comandos, V6 no manifesto, sentinel intacto, cena criada/não sobrescrita, brief aberto |
| `npm run package` | ✅ `story-deck-0.1.0.vsix` (11 arquivos, 238,39 kB) |

### 6.6 Limitações restantes

- O layout de capítulos/cenas ainda é inferido; V2/V3 podem exigir ajuste **apenas** em `novel-path-layout.ts`.
- O Fluxo A foi implementado e testado como decisão pura (`IntegrationService`), mas não executado de ponta a ponta com o NA instalado depende de V1.
- O Scene Brief é estático (sem script e sem mensagens) — não há serializador de painel sobrevivente a reinício.
- Sem workspace aberto, os comandos de cena informam ao usuário e não criam arquivos (estado em diretório temporário).
- A oferta do WYSIWYG usa `showInformationMessage`; em automação com NA instalado, essa interação precisa de um respondente.

### 6.7 Próximo passo

Fase 7 — IA opcional. Em paralelo, executar o checklist §6.4 em uma sessão com o Novel Assistant instalado para confirmar o layout e fechar V1–V5.
