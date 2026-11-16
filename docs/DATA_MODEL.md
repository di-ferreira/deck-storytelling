# DATA_MODEL.md — Story Deck / Modelo de Domínio e Persistência

> Fase 1 — Discovery e Arquitetura. Modelo proposto, derivado do deck real e das 23 seções do master prompt.

---

## 1. Convenções

- Todas as entidades têm **identificador estável** (`string`) e são imutáveis por padrão; alterações produzem novas versões do agregado.
- `Result<T, E>` é usado para operações que podem falhar com erro de domínio (sem exceções跨 camadas).
- Nenhuma entidade de domínio importa `vscode`, `fs` ou `path`.
- Cartas do deck são **somente leitura**; anotações do usuário vivem fora delas (em `DeckSelection` / `decisions.json`).

---

## 2. Modelo do deck (domínio)

### 2.1 Agregado `Deck`

```ts
interface Deck {
  readonly meta: DeckMeta;
  readonly categories: readonly Category[];
  readonly cards: readonly Card[];          // exatamente as 210 do JSON
  readonly usage: DeckUsage;
  readonly taxonomySources: readonly TaxonomySource[];
  readonly editorialAudit: EditorialAudit;
  readonly editorialPrinciples: readonly string[];
}

interface DeckMeta {
  deckId: string;            // 'entrelinhas-storytelling-v4'
  title: string;
  subtitle: string;
  version: string;           // '4.0.0'
  language: string;          // 'pt-BR'
  created: string;           // '2026-11-12'
  cardCount: number;         // 210 — declarado; validado contra cards.length
  categoryCount: number;     // 17
  description: string;
  originalityNote: string;
}

interface Category {
  id: string;                // 'CAT-17'
  name: string;
  short: string;
  color: string;             // '#344F69' — usado na UI
  description: string;
}
```

### 2.2 Cartas

`Card` é a base comum; tipos específicos são refinamentos discriminados por `kind`.

```ts
interface CardBase {
  id: string;                // 'ST-012' | 'GEN-001'
  categoryId: string;
  category: string;          // texto duplicado no JSON — preservado
  title: string;
  prompt: string;            // descrição integral
  question: string;
  suggestedUse: string;
  kind: CardKind;
  tags: readonly string[];
  sourceConcept: string;
}

type CardKind =
  | 'genre_definition' | 'creative_prompt' | 'archetype' | 'narrator'
  | 'structure' | 'technique' | 'craft_warning';

interface NonGenreCard extends CardBase {
  kind: Exclude<CardKind, 'genre_definition'>;
  genreAdaptation: string;       // 178 cartas
  genreRelevantAxis: string;     // 178 cartas
  mergedCards?: readonly string[];       // 2 cartas (ST-086, ST-115)
  mergedCardNote?: string;
}

interface GenreCard extends CardBase {
  kind: 'genre_definition';              // 32 cartas
  genreFamily: string;
  genreLevel: string;
  readerPromise: string;
  coreConventions: string;
  storyEngine: string;
  pitfalls: string;
  compatibleGenres: readonly string[];   // consultivo, NÃO chave estrita
  genreSelectionRole: string;            // 'primary_or_secondary'
  subGenre: readonly string[];
  subGenreDetails: readonly SubGenreDetail[];
  mergedFrom: readonly string[];
}

interface SubGenreDetail {
  name: string;
  sourceCardId: string;        // rastreabilidade histórica; NÃO entra no catálogo
  prompt: string;
  question: string;
  suggestedUse: string;
  readerPromise: string;
  coreConventions: string;
  pitfalls: string;
  compatibleGenres: readonly string[];
}

type Card = GenreCard | NonGenreCard;
```

**Representação no índice (domínio):** `DeckIndex` mantém mapas `byId`, `byCategory`, `byKind`, `byTag`, `bySourceConcept`, `subGenre → parentGenreId`. Cartas consolidadas referenciadas por `sourceCardId` **não** são adicionadas a `cards`.

### 2.3 Regras de domínio das cartas

| Regra | Implementação |
|---|---|
| Carta de estrutura organiza a história | UI/ação associada difere por `kind` (não são todas "perguntas") |
| Carta de narrador define voz e foco | `NarratorProfile` consome `NonGenreCard` |
| Carta de arquétipo define função/motivação | `ArchetypeAssignment` consome `kind: 'archetype'` |
| Carta de alerta serve à revisão | `AuditService` consome `kind: 'craft_warning'` |
| `genre_adaptation`/`genre_relevant_axis` obrigatórios na IA | `ContextBuilder` rejeita contexto sem esses campos para cartas não-gênero |
| Rastreabilidade por ID | `LinkRegistry` usa `cardId` como chave, nunca texto |

---

## 3. Modelo de gênero

```ts
interface GenreProfile {
  dominantGenreId: string;                   // exatamente 1
  secondaryGenreIds: readonly string[];      // 0..2
  subGenresByGenre: Readonly<Record<string, readonly string[]>>; // genreId -> nomes
  contract: GenreContract;                   // 5 respostas editáveis
  dimensions: IdentityDimensions;
}

interface GenreContract {
  promise: string;        // "que experiência o leitor espera?"
  engine: string;         // "que conflito faz a história avançar?"
  conventions: string;    // "que elementos ajudam a reconhecer o gênero?"
  freedom: string;        // "quais convenções serão mantidas/combinadas/subvertidas?"
  reward: string;         // "que resolução satisfaz a promessa?"
}

interface IdentityDimensions {
  tone: string;           // tom        (ex.: sombrio)
  atmosphere: string;     // atmosfera
  setting: string;        // cenário/contexto (ex.: medieval)
  audience: string;       // público   (ex.: YA)
  format: string;         // formato   (ex.: mangá/HQ)
  approximateLength: string;
}

interface GenreContext {
  dominant: GenreCard;
  secondaries: readonly GenreCard[];
  subGenres: readonly ResolvedSubGenre[];   // inclui SubGenreDetail completo
  contract: GenreContract;
  dimensions: IdentityDimensions;
}

interface ResolvedSubGenre {
  name: string;
  parentGenreId: string;
  detail: SubGenreDetail;                   // definição integral
  sourceCardId: string;                     // preservado
}
```

### 3.1 Regras (`GenreSelectionPolicy` — domínio puro)

1. `dominantGenreId` é obrigatório para considerar a identidade "definida"; pode ficar vazio em rascunho.
2. `secondaryGenreIds.length <= 2`.
3. Nenhum ID de gênero secundário pode repetir o dominante.
4. Subgêneros devem pertencer a um gênero selecionado (mas a associação é **consultiva**: a UI avisa, nunca bloqueia, pois gêneros "não são mutuamente exclusivos").
5. `compatibleGenres` é exibido como orientação; nunca filtra nem invalida escolhas.
6. Dimensões são campos separados do gênero (violar isso é erro de modelo).

---

## 4. Modelo de seleção e tiragens

```ts
interface DeckSelection {
  projectId: string;
  selectedCardIds: readonly string[];
  favoriteCardIds: readonly string[];
  lockedCardIds: readonly string[];          // bloqueiam substituição/sorteio
  versions: readonly SelectionVersion[];     // histórico; nunca descartado
  activeVersionId: string;
  links: readonly CardLink[];
}

interface SelectionVersion {
  id: string;
  createdAt: string;
  label: string;
  cardIds: readonly string[];
}

interface CardLink {
  cardId: string;
  target: CardLinkTarget;                    // discriminated union
  createdAt: string;
  note?: string;
}

type CardLinkTarget =
  | { type: 'project' }                      // história inteira
  | { type: 'decision'; decisionId: string }
  | { type: 'genre'; genreId: string }
  | { type: 'character'; characterId: string }
  | { type: 'act'; actId: string }
  | { type: 'chapter'; chapterId: string }
  | { type: 'scene'; sceneId: string };

interface SpreadDefinition {                 // dado, não código
  id: string;
  name: string;
  purpose: string;
  drawText: string;                          // texto original do JSON
  slots: readonly SpreadSlot[];
  custom: boolean;                           // true => persistido pelo usuário
}

interface SpreadSlot {
  id: string;
  label: string;
  categoryIds?: readonly string[];
  kinds?: readonly CardKind[];
  count: number;                             // 1 ou 2
  source: 'deck' | 'selection';
}

interface SpreadState {
  spreadId: string;
  slotCardIds: Readonly<Record<string, readonly string[]>>;
  status: 'idle' | 'in-progress' | 'complete';
  result?: string;
  savedAt?: string;
}
```

---

## 5. Modelo da história (Story Builder)

### 5.1 Agregado raiz

```ts
interface StoryProject {
  id: string;
  schemaVersion: number;                     // migração
  deckVersion: string;                       // '4.0.0'
  createdAt: string;
  updatedAt: string;
  identity: WorkIdentity;
  genre: GenreProfile;
  premise: Premise;
  characters: readonly Character[];
  relationships: readonly Relationship[];
  conflicts: readonly Conflict[];
  world: World;
  secrets: readonly Secret[];
  narrator: NarratorProfile;
  structures: readonly StructureChoice[];
  acts: readonly Act[];
  techniques: readonly TechniqueAssignment[];
  bible: StoryBibleRef;
  audit: AuditState;
}

interface WorkIdentity {
  provisionalTitle: string;
  initialDescription: string;
  tone: string;
  atmosphere: string;
  audience: string;
  format: string;
  setting: string;
  period: string;
  approximateLength: string;
}
```

### 5.2 Estágios 2–6

```ts
interface Premise {
  centralIdea: string;
  logline: string;
  premise: string;
  shortSynopsis: string;
  expandedSynopsis: string;
  centralTheme: string;
  dramaticQuestion: string;
  narrativeProposition: string;
  differentiator: string;
  sourceCardIds: readonly string[];          // cartas que estimularam cada campo
  approvals: Readonly<Record<keyof Premise, 'draft'|'approved'|'edited'>>;
}

interface Character {
  id: string;
  name: string;
  age?: string;
  description: string;
  backstory: string;
  storyRole: string;
  externalDesire: string;
  internalNeed: string;
  motivation: string;
  fear: string;
  emotionalWound: string;
  contradictions: readonly string[];
  values: readonly string[];
  flaws: readonly string[];
  skills: readonly string[];
  secrets: readonly string[];
  arc: string;
  archetypeIds: readonly string[];           // carões CAT-11 (função) e CAT-12 (motivação)
  motivationCardIds: readonly string[];      // CAT-02
  emotionCardIds: readonly string[];         // CAT-04
}

interface Relationship {
  id: string;
  fromCharacterId: string;
  toCharacterId: string;
  nature: string;
  dynamic: string;                           // como muda ao longo da obra
}

interface Conflict {
  id: string;
  kind: 'main' | 'secondary';
  description: string;
  obstacles: readonly string[];
  opposition: string;
  moralDilemma: string;
  emotionalPressure: string;
  consequences: string;
  difficultChoices: readonly string[];
  linkedCharacterGoalId: string;             // obrigatório: conflito ↔ objetivo
  sourceCardIds: readonly string[];
}

interface World {
  universe: string;
  locations: readonly Location[];
  rules: readonly string[];
  culture: string;
  society: string;
  customs: readonly string[];
  economy: string;
  politics: string;
  technology: string;
  supernatural: string;
  atmosphere: string;
  sensoryTraits: readonly string[];
  sourceCardIds: readonly string[];
}

interface Location { id: string; name: string; description: string; sensoryNotes: string; }

interface Secret {
  id: string;
  description: string;
  knownByCharacterIds: readonly string[];
  unknownByCharacterIds: readonly string[];
  clues: readonly string[];
  revelationMoment: string;
  consequences: string;
  readerPerceptionShift: string;
  narrativeSetup: string;
  factualTruth: string;                      // separado do que o leitor sabe
  readerAvailableInfo: string;               // separado da verdade factual
  sourceCardIds: readonly string[];
}
```

### 5.3 Estágios 7–9 e hierarquia

```ts
interface NarratorProfile {
  typeCardId: string;                        // CAT-10
  person: 'first' | 'second' | 'third' | 'variable';
  focus: string;
  knowledgeLevel: string;
  reliability: string;
  perspectiveAlternation: string;
  informationLimits: string;
  sourceCardIds: readonly string[];
}

interface StructureChoice {
  cardId: string;                            // CAT-09 / CAT-13
  intent: string;                            // por que combinar
}

interface Act {
  id: string;
  title: string;
  goal: string;
  description: string;
  conflict: string;
  characterIds: readonly string[];
  turningPoints: readonly string[];
  expectedOutcome: string;
  chapterIds: readonly string[];
}

interface Chapter {
  id: string;
  number: number;
  title: string;
  description: string;
  actId: string;
  narrativeGoal: string;
  characterIds: readonly string[];
  locationIds: readonly string[];
  sceneIds: readonly string[];
  developmentStatus: 'planned' | 'draft' | 'revision' | 'complete';
}

interface Scene {
  id: string;
  title: string;
  chapterId: string;
  goal: string;
  focalCharacterId: string;
  presentCharacterIds: readonly string[];
  locationId: string;
  chronologicalMoment: string;
  conflict: string;
  obstacle: string;
  tension: string;
  stateChange: string;
  consequence: string;
  hook: string;
  sourceCardIds: readonly string[];          // cartas associadas à cena
}

interface TechniqueAssignment {
  cardId: string;                            // CAT-14/15/16
  scope: { type: 'work' } | { type: 'arc'; arcId: string }
       | { type: 'chapter'; chapterId: string }
       | { type: 'scene'; sceneId: string };
  intent: string;
}

interface TechniqueUsage { /* CAT-14/15/16 selecionadas na obra */ }

interface StoryBibleRef {
  generatedAt: string;
  path: string;                              // 'Story/story-bible.md'
  dirty: boolean;                            // precisa regenerar
  userEditsPreserved: boolean;
}

interface AuditFinding {
  id: string;
  warningCardId: string;                     // ST-149 / ST-150
  target: CardLinkTarget;
  reason: string;
  relatedDecisions: readonly string[];
  suggestion: string;
  authorResponse: 'pending' | 'accepted' | 'ignored';
}
```

### 5.4 Regras de integridade da hierarquia

- `Act.chapterIds`, `Chapter.sceneIds` e `Scene.chapterId` são **redundantes por desempenho**; `LinkRegistry` é a fonte da verdade e deve ser atualizado atomicamente ao mover cenas.
- Mover cena entre capítulos/atos **não invalida** `CardLink`s: eles usam IDs estáveis.
- Reordenar atos/capítulos atualiza `number` sem alterar IDs.
- `StoryBibleRenderer` consome o agregado, nunca edita o Markdown gerado sem intenção explícita.

---

## 6. Modelo de persistência

### 6.1 Arquivos no workspace

```text
<workspace>/
├── .storydeck/
│   ├── project.json          # StoryProject + metadados (ID, schemaVersion, deckVersion)
│   ├── deck-selection.json   # DeckSelection (cartas, favoritos, bloqueios, versões, links)
│   ├── story-state.json      # estado das 9 etapas + tiragens (SpreadState[])
│   ├── decisions.json        # decisões criativas + histórico de operações
│   └── settings.json         # configurações locais do projeto (não segredos)
│
└── Story/
    ├── premise.md
    ├── story-bible.md
    ├── genre-contract.md
    ├── outline.md
    └── narrative-decisions.md
```

**Novel Assistant (intacto):** `Manuscript/`, `Characters/`, `Locations/`, `Timeline/`, `Research/`, `Notes/`, `USER_GUIDE.md`, `.novel-assistant/stats.json`. Nenhum desses é criado/sobrescrito pelo Story Deck no Fluxo A. No Fluxo B, o Story Deck pode criar os diretórios **se ausentes**, para compatibilidade futura.

### 6.2 `project.json` — formato lógico

```jsonc
{
  "schemaVersion": 1,
  "deckVersion": "4.0.0",
  "project": {
    "id": "uuid-estavel",
    "createdAt": "...",
    "updatedAt": "...",
    "identity": { /* WorkIdentity */ },
    "genre": { /* GenreProfile */ },
    "premise": { /* Premise */ },
    "characters": [ /* Character */ ],
    "relationships": [ /* ... */ ],
    "conflicts": [ /* ... */ ],
    "world": { /* ... */ },
    "secrets": [ /* ... */ ],
    "narrator": { /* ... */ },
    "structures": [ /* ... */ ],
    "acts": [ /* Act -> chapters -> scenes aninhados ou por ID */ ],
    "techniques": [ /* ... */ ]
  }
}
```

> Nota: o master prompt descreve `story-state.json` para cartas/seleção e `project.json` para o projeto. A divisão acima mantém `project.json` como agregado narrativo e `deck-selection.json` como estado do Deck Studio, evitando acoplamento entre exploração e construção.

### 6.2.1 `deck-selection.json` — formato real gravado na Fase 3

Escrito exclusivamente por `JsonSelectionRepository.save()` (uma gravação atômica por mutação). O agregado é imutável; cada operação produz uma nova `revision`.

```jsonc
{
  "schemaVersion": 1,
  "projectId": "8d1c0b8e-2f4d-4a7b-9a55-2b0f6a1c9e77",
  "selectedCardIds": ["GEN-001", "GEN-002", "ST-012"],   // ordem = ordem da seleção/embaralhamento
  "favoriteCardIds": ["GEN-001"],                         // independente de estar selecionada
  "lockedCardIds": ["GEN-001"],                           // subconjunto das selecionadas
  "versions": [
    {
      "id": "ver-m4z9k2-1f8d3a",
      "createdAt": "2026-11-16T14:03:11.482Z",
      "label": "Primeira",
      "cardIds": ["GEN-001", "GEN-002"]
    }
  ],
  "activeVersionId": "ver-m4z9k2-1f8d3a",                 // "" quando a seleção divergiu da versão
  "links": [
    {
      "cardId": "GEN-001",
      "target": { "type": "scene", "sceneId": "cena-1" },
      "createdAt": "2026-11-16T14:05:02.010Z",
      "note": "abertura"
    }
  ],
  "revision": 7,                                          // revisão otimista: gravou ⇒ +1
  "updatedAt": "2026-11-16T14:05:02.010Z"
}
```

Regras: `revision` ausente no arquivo = `0` (compatível com o stub da Fase 2); a gravação falha com `SelectionConflictError` quando a revisão em memória difere do arquivo; `lockedCardIds` é sempre filtrado para o subconjunto das selecionadas ao carregar; IDs duplicados são removidos preservando a ordem; `source_card_id` históricos nunca entram no catálogo.

### 6.2.2 `story-state.json` — formato real gravado na Fase 3

Escrito por `JsonStoryStateRepository.saveSpreadStates()` e, a partir da Fase 4, por `saveGenreStep()`. `stepStates` pertence às fases seguintes e é preservado byte a byte.

```jsonc
{
  "schemaVersion": 1,
  "revision": 3,
  "stepStates": { "premise": { "approved": true } },       // Story Builder (Fase 5), intocado
  "spreads": [
    {
      "spreadId": "identidade-da-obra",
      "slotCardIds": {
        "dominante": ["GEN-001"],
        "secundario": ["GEN-002"],
        "tom-atmosfera": ["ST-047"]
      },
      "status": "complete",                                 // idle | in-progress | complete
      "result": "## Identidade da obra\n\n> 1 gênero dominante + ...\n\n**Propósito:** ...\n\n### Gênero dominante\n\n- [GEN-001] Mistério",
      "savedAt": "2026-11-16T14:10:44.118Z"
    }
  ],
  "updatedAt": "2026-11-16T14:10:44.118Z"
}
```

Regras: `revision` ausente = `0`; gravação com revisão divergente falha com `StoryStateConflictError`; `result` só existe quando todos os slots estão completos e cita `[ID] título` + o `drawText` original (nunca conteúdo inventado); `savedAt` só é preenchido por `SpreadEngine.save()`. Tiragens customizadas do usuário vivem em `.storydeck/spreads/custom.json` e substituem a definição embarcada de mesmo `id` (marcadas `custom: true`).

### 6.2.3 `stepStates.genre` — formato real gravado na Fase 4

**Decisão operacional:** o `GenreProfile` vive em `stepStates.genre` de `story-state.json` (casa do estado criativo mutável, com revisão otimista). `project.json` continua sendo o descritor mínimo do projeto e só receberá o agregado narrativo completo na Fase 5. `Story/genre-contract.md` é projeção regenerável, não fonte de verdade.

```jsonc
{
  "schemaVersion": 1,
  "revision": 4,
  "stepStates": {
    "genre": {
      "schemaVersion": 1,
      "dominantGenreId": "GEN-001",
      "secondaryGenreIds": ["GEN-006", "GEN-038"],   // 0..2, sem dominante, sem duplicatas
      "subGenresByGenre": {
        "GEN-006": ["psicológico", "conspiratório"], // nomes canônicos de sub_genre_details
        "GEN-038": ["Cyberpunk"]
      },
      "contract": {
        "promise": "", "engine": "", "conventions": "", "freedom": "", "reward": ""
      },
      "dimensions": {
        "tone": "", "atmosphere": "", "setting": "",
        "audience": "", "format": "", "approximateLength": ""
      },
      "updatedAt": "2026-11-16T15:10:00.000Z"
    }
  },
  "spreads": [],                                       // preservado por saveGenreStep()
  "updatedAt": "2026-11-16T15:10:00.000Z"
}
```

`GenreService` é o único escritor. `saveGenreStep` e `saveSpreadStates` usam a mesma revisão do arquivo: salvar com revisão divergente falha com `StoryStateConflictError`. Subgêneros são persistidos por **nome canônico**; `source_card_id` permanece apenas no `sub_genre_details` do deck (rastreio), nunca entra no catálogo. Rótulos das 5 perguntas do contrato vêm de `usage.genre_contract` do deck, não são hardcoded. `compatible_genres` é exibido como orientação e nunca usado como filtro ou validação.

### 6.3 Regras de persistência (master prompt §17)

| Regra | Mecanismo proposto |
|---|---|
| Salvamento automático | Debounce + escrita em fila serial por projeto |
| Proteção contra gravações concorrentes | Lock por `projectId` (fila de promessas) + escrita atômica: gravar `.tmp` → `rename` |
| Alterações externas | `FileSystemWatcher` em `.storydeck/`; comparar `mtime`+hash; nunca sobrescrever edição externa — gerar conflito resolvível na UI |
| Recuperação de estado | `decisions.json` registra operações importantes (quem/what/when); journal de sessão para crash recovery |
| Migração de versões | Registro `migrations[fromVersion] -> (data) => data`; incremento atômico de `schemaVersion` |
| Validação antes de persistir | Zod schema do `StoryProject` no limite da infraestrutura |
| IDs estáveis | UUID v4 gerado uma vez; nunca recalculado |
| Preservação de referências | `LinkRegistry` reescrito em uma única transação lógica ao reestruturar |
| Histórico | `SelectionVersion[]` + `decisions.json` (append-only) |
| Não descartar edição direta do usuário | Geradores Markdown só criam arquivo se ausente; se existir, oferecem "mesclar"/"manter" |

### 6.4 Markdown gerado

`StoryBibleRenderer` produz as 17 seções do master prompt §12 em ordem fixa, com cabeçalho e metadados (`deckVersion`, `schemaVersion`, `updatedAt`). Cada seção referencia cartas por ID (ex.: `[ST-012]`). O arquivo permanece editável; ao regenerar, o renderer preserva blocos marcados com `<!-- story-deck:user -->` e nunca apaga conteúdo inserido pelo usuário.

---

## 7. Mapa de relacionamentos (resumo)

```
Deck ──< Category ──< Card
                       ├── GenreCard ──< SubGenreDetail ──(sourceCardId, rastreio)
                       └── NonGenreCard (genreAdaptation + genreRelevantAxis)

StoryProject
 ├── GenreProfile ──> GenreCard + SubGenreDetail
 ├── DeckSelection ──< SelectionVersion + CardLink ──> alvos (decisão/gênero/personagem/ato/capítulo/cena)
 ├── Premise ──> sourceCardIds
 ├── Character ──> archetypeIds (CAT-11/12) + motivation/emotion cardIds
 ├── Conflict ──> objetivo de personagem + sourceCardIds
 ├── World ──> sourceCardIds (CAT-05)
 ├── Secret ──> verdade factual ≠ informação do leitor
 ├── Act ──< Chapter ──< Scene ──> sourceCardIds + link
 ├── TechniqueAssignment ──> escopo (obra/arco/capítulo/cena)
 ├── StoryBibleRef ──> Story/story-bible.md
 └── AuditState ──< AuditFinding ──> craft_warning cards
```
