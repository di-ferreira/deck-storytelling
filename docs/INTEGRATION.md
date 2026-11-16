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
