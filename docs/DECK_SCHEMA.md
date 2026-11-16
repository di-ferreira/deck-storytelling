# DECK_SCHEMA.md — ENTRELINHAS v4 / Análise integral e schema

> Fase 1 — Discovery. Análise programática de `deck_storytelling.json` (5207 linhas), conferida com o master prompt §§2–4 e §19.

---

## 1. Identificação e metadados (verificado)

| Campo | Valor real | Conferência com master prompt |
|---|---|---|
| `deck_id` | `entrelinhas-storytelling-v4` | ✅ |
| `title` | `ENTRELINHAS — Deck Autoral de Storytelling` | ✅ |
| `subtitle` | `210 cartas para definir gêneros, construir histórias e dominar recursos narrativos` | (extra) |
| `version` | `4.0.0` | ✅ |
| `language` | `pt-BR` | ✅ |
| `created` | `2026-11-12` | (extra) |
| `card_count` | 210 — **confirmado**: `cards.length === 210` | ✅ |
| `category_count` | 17 — **confirmado**: `categories.length === 17` | ✅ |
| `editorial_principles` | 6 itens | ✅ §4 |

**Chaves de nível superior (16):** `deck_id`, `title`, `subtitle`, `version`, `language`, `created`, `card_count`, `category_count`, `description`, `originality_note`, `editorial_principles`, `categories`, `cards`, `usage`, `genre_taxonomy_sources`, `editorial_audit`.

**Descrição editorial preservada:** "Versão compactada do deck v3. Reúne subgêneros derivados em cartas-mãe com os campos `sub_genre` e `sub_genre_details`, preservando as definições específicas para consulta. Remove apenas cartas não genéricas com função narrativa redundante comprovada."

**Nota de originalidade preservada:** conteúdo autoral; categorias organizadas a partir de estudo + pesquisa complementar; textos redigidos para este deck; sem reprodução de baralhos comerciais.

---

## 2. Mapa das 17 categorias (valores reais)

| ID | Nome | Curto | Cor | Qtd. |
|---|---|---|---|---:|
| CAT-17 | Gêneros literários e narrativos | GÊNEROS | `#344F69` | 32 |
| CAT-01 | Personagens e arquétipos | PERSONAGENS | `#315C72` | 9 |
| CAT-02 | Desejos e motivações | MOTIVAÇÕES | `#8A563E` | 10 |
| CAT-03 | Conflitos e obstáculos | CONFLITOS | `#A3443F` | 10 |
| CAT-04 | Emoções e dilemas | EMOÇÕES | `#765A8C` | 10 |
| CAT-05 | Mundos e atmosfera | MUNDOS | `#55734B` | 10 |
| CAT-06 | Cenas e acontecimentos | CENAS | `#B17A32` | 10 |
| CAT-07 | Segredos e revelações | SEGREDOS | `#4C627F` | 10 |
| CAT-08 | Reviravoltas e consequências | REVIRAVOLTAS | `#9A4F70` | 10 |
| CAT-09 | Estrutura e ritmo | ESTRUTURA | `#5F6B68` | 10 |
| CAT-10 | Tipos de narradores e foco | NARRADORES | `#365C7D` | 12 |
| CAT-11 | Arquétipos de função narrativa | FUNÇÕES | `#704C77` | 13 |
| CAT-12 | Arquétipos de motivação | MOTIVAÇÕES | `#A56D3A` | 13 |
| CAT-13 | Estruturas e organização temporal | ESTRUTURAS | `#526D58` | 15 |
| CAT-14 | Trama, preparação e revelação | TRAMA | `#A34D4B` | 13 |
| CAT-15 | Técnicas de narrativa e perspectiva | TÉCNICAS | `#4C7180` | 12 |
| CAT-16 | Estilo, linguagem e impacto | LINGUAGEM | `#8B6A4F` | 11 |

Soma: 32+9+10+10+10+10+10+10+10+12+13+13+15+13+12+11 = **210**. As cores devem alimentar diretamente os tokens visuais; **não codificar categorias no frontend**.

---

## 3. Tipos de carta — contagens verificadas

| `kind` | Qtd. | Esperado (§19) | Status |
|---|---:|---:|---|
| `genre_definition` | 32 | 32 | ✅ |
| `creative_prompt` | 89 | 89 | ✅ |
| `technique` | 34 | 34 | ✅ |
| `archetype` | 26 | 26 | ✅ |
| `structure` | 15 | 15 | ✅ |
| `narrator` | 12 | 12 | ✅ |
| `craft_warning` | 2 | 2 | ✅ |
| **Total** | **210** | **210** | ✅ |

IDs únicos: **210/210** (zero duplicatas). Prefixos: `GEN-001`…`GEN-062` (com lacunas, 32 ativos) e `ST-001`…`ST-180` (com lacunas, 178 ativos).

---

## 4. Mapa completo das 210 cartas

### CAT-17 — Gêneros literários e narrativos (32 · `genre_definition`)
`GEN-001` Mistério · `GEN-002` Ficção policial / crime · `GEN-004` Procedural policial · `GEN-005` Noir / hardboiled · `GEN-006` Thriller · `GEN-007` Suspense · `GEN-010` Espionagem · `GEN-013` Romance amoroso · `GEN-017` Drama · `GEN-019` Comédia · `GEN-020` Sátira · `GEN-021` Aventura · `GEN-022` Ação · `GEN-023` Ficção histórica · `GEN-025` Ficção contemporânea e realista · `GEN-026` Ficção literária · `GEN-027` Saga familiar · `GEN-028` Coming-of-age / formação · `GEN-029` Ficção social e política · `GEN-030` Ficção de guerra · `GEN-031` Western / Faroeste · `GEN-032` Sobrevivência · `GEN-033` Fantasia · `GEN-038` Ficção científica · `GEN-047` Terror / horror · `GEN-051` Realismo mágico · `GEN-052` Ficção mitológica e retellings · `GEN-053` Contos de fadas e fábulas · `GEN-054` Slice of life / cotidiano · `GEN-055` Ficção experimental e metaficcional · `GEN-056` Ficção absurda e surrealista · `GEN-062` Fantasia científica (science fantasy)

### CAT-01 — Personagens e arquétipos (9 · `creative_prompt`)
`ST-001` A máscara útil · `ST-002` O herói improvável · `ST-004` O guardião contraditório · `ST-005` O aliado inconveniente · `ST-006` A pessoa invisível · `ST-007` O talento com custo · `ST-008` O aprendiz que discorda · `ST-009` O antagonista íntimo · `ST-010` A identidade herdada

### CAT-02 — Desejos e motivações (10 · `creative_prompt`)
`ST-011` O desejo declarado · `ST-012` A necessidade escondida · `ST-013` A promessa antiga · `ST-014` O medo de perder · `ST-015` A dívida invisível · `ST-016` A curiosidade proibida · `ST-017` O desejo emprestado · `ST-018` A busca por reparação · `ST-019` A necessidade de pertencer · `ST-020` A ambição legítima

### CAT-03 — Conflitos e obstáculos (10 · `creative_prompt`)
`ST-021` O prazo que se aproxima · `ST-022` Duas lealdades · `ST-023` O recurso insuficiente · `ST-024` A regra injusta · `ST-025` O mal-entendido plausível · `ST-026` O preço crescente · `ST-027` O conflito de competência · `ST-028` A ameaça do passado · `ST-029` A escolha sem saída limpa · `ST-030` O adversário com razão

### CAT-04 — Emoções e dilemas (10 · `creative_prompt`)
`ST-031` Inveja reveladora · `ST-032` Culpa sem testemunhas · `ST-033` Luto em movimento · `ST-034` Medo de ser conhecido · `ST-035` Compaixão exausta · `ST-036` Orgulho ferido · `ST-037` Esperança deslocada · `ST-038` Perdão ou justiça · `ST-039` Afeto em conflito · `ST-040` O sacrifício recusado

### CAT-05 — Mundos e atmosfera (10 · `creative_prompt`)
`ST-041` O lugar que se lembra · `ST-042` Uma assinatura sensorial · `ST-043` O costume obrigatório · `ST-044` A economia do cotidiano · `ST-045` O clima como pressão · `ST-046` Beleza perigosa · `ST-047` A ruína reaproveitada · `ST-048` A tecnologia banal · `ST-049` A fronteira cotidiana · `ST-050` O espaço de refúgio

### CAT-06 — Cenas e acontecimentos (10 · `creative_prompt`)
`ST-051` A rotina interrompida · `ST-052` A chegada inesperada · `ST-053` A promessa pública · `ST-054` A confissão incompleta · `ST-055` O objeto muda de mãos · `ST-056` A celebração que falha · `ST-057` O silêncio negociado · `ST-058` A negociação impossível · `ST-059` A descoberta inoportuna · `ST-060` Depois do impacto

### CAT-07 — Segredos e revelações (10 · `creative_prompt`)
`ST-061` A origem contestada · `ST-062` O preço omitido · `ST-063` A memória insegura · `ST-064` O protetor secreto · `ST-065` A prova mal interpretada · `ST-066` A peça ausente · `ST-067` O nome escondido · `ST-068` A verdade que divide · `ST-069` O fato impossível de provar · `ST-070` O segredo com prazo

### CAT-08 — Reviravoltas e consequências (10 · `creative_prompt`)
`ST-071` A vitória cobra seu preço · `ST-072` A deserção coerente · `ST-073` O presente era uma pista · `ST-074` O efeito colateral · `ST-075` O inimigo compreensível · `ST-076` A regra tem uma brecha · `ST-077` A consequência atrasada · `ST-078` O sacrifício não encerra · `ST-079` O sucesso transforma · `ST-080` O fim abre uma porta

### CAT-09 — Estrutura e ritmo (10 · `creative_prompt`)
`ST-081` Comece no atrito · `ST-082` Objetivo, pressão, mudança · `ST-083` Escalada em três passos · `ST-084` A pausa antes da escolha · `ST-085` Tramas em paralelo · `ST-086` O motivo recorrente (inclui running gag) · `ST-087` Tempo comprimido · `ST-088` A cena que falta · `ST-089` O ponto de virada central · `ST-090` O final que ecoa

### CAT-10 — Tipos de narradores e foco (12 · `narrator`)
`ST-091` Narrador não confiável · `ST-092` Narrador padrão e confiável · `ST-093` Narrador-câmera · `ST-094` Narrador-guia · `ST-095` Nós: uma consciência coletiva · `ST-096` Onisciente que conversa com o leitor · `ST-097` Ponto de vista alternado · `ST-098` Protagonista em primeira pessoa · `ST-099` Terceira pessoa limitada · `ST-100` Terceira pessoa onisciente · `ST-101` Testemunha em primeira pessoa · `ST-102` Você está dentro da cena

### CAT-11 — Arquétipos de função narrativa (13 · `archetype`)
`ST-103` A Sombra · `ST-104` A pessoa a resgatar · `ST-105` O Aliado ou Companheiro · `ST-106` O Arauto · `ST-107` O Contraponto (Foil) · `ST-108` O Dragão · `ST-109` O Guardião do Limiar · `ST-110` O Herói · `ST-111` O Mentor · `ST-112` O Metamorfo · `ST-113` O Sacrifício · `ST-114` O Trapaceiro · `ST-115` O espelho do protagonista

### CAT-12 — Arquétipos de motivação (13 · `archetype`)
`ST-116` O Amante · `ST-117` O Bufão (Jester) · `ST-118` O Criador · `ST-119` O Cuidador · `ST-120` O Explorador · `ST-121` O Governante · `ST-122` O Guerreiro · `ST-123` O Inocente · `ST-124` O Mago · `ST-125` O Rebelde ou Revolucionário · `ST-126` O Sedutor ou Sereia · `ST-127` O Sábio · `ST-128` O Órfão ou Realista

### CAT-13 — Estruturas e organização temporal (15 · `structure`)
`ST-129` Arco de personagem · `ST-130` Chamado e recusa · `ST-131` Enredo episódico ou antologia · `ST-132` Estrutura circular ou cíclica · `ST-133` Estrutura de montanha · `ST-134` Estrutura de três atos · `ST-135` In Media Res: comece no meio · `ST-136` Incidente incitante · `ST-137` Jornada do Herói · `ST-138` Kishōtenketsu · `ST-139` Mapa de progressão · `ST-140` Mentor e travessia do limiar · `ST-141` Provação e transformação · `ST-142` Retorno com consequência · `ST-143` Testes, aliados e adversários

### CAT-14 — Trama, preparação e revelação (13)
`ST-144` A revelação merecida · `ST-145` Arma de Chekhov · `ST-146` Catarse · `ST-147` Cliffhanger · `ST-148` Decelerando a ação · **`ST-149` Deus Ex Machina: alerta** (`craft_warning`) · **`ST-150` Exposition Dump: alerta** (`craft_warning`) · `ST-151` Foreshadowing: presságio · `ST-152` Inversão de expectativa · `ST-153` MacGuffin · `ST-155` Pista falsa (Red Herring) · `ST-156` Plot Twist · `ST-157` Setup and Payoff

### CAT-15 — Técnicas de narrativa e perspectiva (12 · `technique`)
`ST-158` Analepse (Flashback) · `ST-159` Backstory: história de fundo · `ST-160` Dispositivo metaficcional · `ST-161` Ethos: credibilidade · `ST-162` Fluxo de consciência · `ST-163` Foco narrativo · `ST-164` Ironia dramática · `ST-165` Logos: lógica e evidência · `ST-166` Multiperspectiva · `ST-167` Pathos: apelo emocional · `ST-168` Prolepse (Flashforward) · `ST-169` Subtexto

### CAT-16 — Estilo, linguagem e impacto (11 · `technique`)
`ST-170` Descrição sensorial · `ST-171` Diálogo com intenção · `ST-172` Epifania · `ST-173` Exposição incorporada à ação · `ST-174` Imagem simbólica · `ST-175` Metáfora · `ST-176` Personificação · `ST-177` Show, Don't Tell: mostre, não conte · `ST-178` Silêncio significativo · `ST-179` Símile ou comparação · `ST-180` Tom e escolha vocabular

---

## 5. Schema real por tipo de carta (conjuntos de campos observados)

```text
[genre_definition] n=32
  id, category_id, category, title, prompt, question, suggested_use, kind, tags,
  source_concept, genre_family, genre_level, reader_promise, core_conventions,
  story_engine, pitfalls, compatible_genres, genre_selection_role,
  sub_genre, sub_genre_details, merged_from

[creative_prompt] n=89
  id, category_id, category, title, prompt, question, suggested_use, kind, tags,
  source_concept, genre_adaptation, genre_relevant_axis
  (+ merged_cards, merged_card_note em ST-086)

[archetype] n=26
  ... campos comuns + genre_adaptation, genre_relevant_axis
  (+ merged_cards, merged_card_note em ST-115)

[narrator] n=12      → comuns + genre_adaptation, genre_relevant_axis
[structure] n=15     → comuns + genre_adaptation, genre_relevant_axis
[technique] n=34     → comuns + genre_adaptation, genre_relevant_axis
[craft_warning] n=2  → comuns + genre_adaptation, genre_relevant_axis
```

**Verificação de presença:**
- `genre_adaptation`: **178/210** ✅ (exatamente as não-gênero)
- `genre_relevant_axis`: **178/210** ✅
- Cartas sem esses campos: **32** (as de gênero) — correto.
- Campos específicos de gênero: **32/32 em todos os 12 campos** ✅

### 5.1 Exemplos reais de campos de adaptação

- `ST-012` — eixo: `motivação e objetivo`; adaptação: "Faça o desejo alimentar o motor principal do gênero…"
- `ST-082` — eixo: `estrutura e ritmo`; adaptação: "Ajuste ritmo e estrutura à experiência escolhida: escalada e urgência no thriller…"
- `ST-149` / `ST-150` — eixo: `preparação e recompensa`; adaptação: "Use preparação e recompensa para cumprir a promessa do gênero: pistas para o mistério…"

Esses dois campos são **obrigatórios no contexto de IA** (master prompt §13.4).

---

## 6. Sistema de subgêneros (v4)

- **8 cartas-mãe** possuem subgêneros; **31 objetos** em `sub_genre_details`.
- `sub_genre` (lista compacta) e `sub_genre_details` (definições) têm **correspondência 1:1** em todas as 8 cartas — nenhum desencontro encontrado.
- Campos de cada detalhe (9): `name`, `source_card_id`, `prompt`, `question`, `suggested_use`, `reader_promise`, `core_conventions`, `pitfalls`, `compatible_genres`.

| Carta-mãe | Subgêneros | `source_card_id` |
|---|---|---|
| GEN-001 Mistério | Ficção de detetive; Mistério aconchegante (cozy mystery); Mistério de sala fechada | GEN-003, GEN-057, GEN-058 |
| GEN-006 Thriller | psicológico; de ação; jurídico; médico e científico; político; conspiratório | GEN-008, GEN-009, GEN-011, GEN-012, GEN-059, GEN-060 |
| GEN-013 Romance amoroso | Comédia romântica; Romance histórico; Romance paranormal; Suspense romântico | GEN-014, GEN-015, GEN-016, GEN-061 |
| GEN-017 Drama | Tragédia | GEN-018 |
| GEN-023 Ficção histórica | História alternativa | GEN-024 |
| GEN-033 Fantasia | Fantasia épica / alta fantasia; Fantasia urbana; Fantasia sombria; Fantasia histórica | GEN-034, GEN-035, GEN-036, GEN-037 |
| GEN-038 Ficção científica | hard; Space opera; Cyberpunk; Distopia; Utopia; pós-apocalíptica; Steampunk; cli-fi; Biopunk | GEN-039…GEN-046, GEN-063 |
| GEN-047 Terror / horror | Horror psicológico; Horror sobrenatural; Gótico | GEN-048, GEN-049, GEN-050 |

**Achado importante:** os 31 `source_card_id` apontam para IDs **ausentes do catálogo ativo** (são cartas históricas da v3 consolidadas). Isso é **esperado e desejado** — o validador deve tratá-los como rastreabilidade, não como erro, e **nunca** adicioná-los ao catálogo.

---

## 7. Histórico de consolidação editorial (`editorial_audit`)

| Métrica | Valor |
|---|---|
| `source_version` | 3.0.0 |
| `source_card_count` | 243 |
| `result_card_count` | 210 |
| `genre_cards_before` | 63 |
| `genre_cards_after` | 32 |
| `non_genre_cards_removed` | `ST-003`, `ST-154` |
| `genre_consolidations` | 8 cartas-mãe cobrindo 31 gêneros derivados |
| `non_genre_merges` | 2 (ST-086←ST-154; ST-115←ST-003) |
| `reviewed_but_retained_examples` | 3 grupos (ST-030/075; ST-145/151/157; ST-130/136/137/140) |

**Fechamento aritmético:** 243 − 31 (gêneros consolidados) − 2 (não-gênero removidas) = **210** ✅. 63 − 31 = **32** gêneros ativos ✅.

Cartas não-gênero com campos de mesclagem: `ST-086` ("Incorpora a função de 'Motivo recorrente ou Running Gag' (ST-154)…") e `ST-115` ("Incorpora a função de 'O espelho incômodo' (ST-003)…").

**Regra:** `merged_from`, `merged_cards`, `merged_card_note` e `editorial_audit` são preservados para consulta/auditoria, mas **não aparecem como cartas adicionais**.

---

## 8. `usage` — contrato, tiragens e notas

- **`selection_method`** (6 diretrizes): 1 dominante; 0–2 secundários; subgêneros combináveis; exemplo "Mistério + Thriller (jurídico, psicoló gico) + Ficção científica (cyberpunk)"; dimensões separadas (sombrio/medieval/YA/mangá); usar demais cartas depois dos gêneros.
- **`genre_contract`** (5 perguntas): Promessa · Motor · Convenções · Liberdade · Recompensa.
- **`recommended_spreads`** (4): Identidade da obra · Projeto de enredo · Teste de coerência · Mistura de gêneros — textos `draw`/`purpose` já transcritos no `PRODUCT_SPEC.md` §4.3.
- **`taxonomy_notes`** (6): lista não fechada; subgêneros agrupados em cartas-mãe; `genre_level` preserva distinções; suspense = modo, thriller = motor; público/formato/tom/cenário não são gêneros.

**`genre_taxonomy_sources`** (4 fontes acadêmicas): Open University, SNHU, Portland Community College, Lit2Go/USF — URLs preservadas no JSON.

---

## 9. Achado crítico: integridade de `compatible_genres`

Análise dos valores de `compatible_genres` nas 32 cartas de gênero (e detalhes de subgênero):

- **151 valores não vazios**, **54 distintos**.
- **28 valores** não correspondem a nenhum `source_concept` ativo.
- Após incluir os nomes de `sub_genre` / `sub_genre_details.name`, **12 permanecem sem correspondência exata**:

```
Coming-of-age            Experimental e metaficcional   Fantasia épica
Ficção policial          Ficção política e social       Horror
Romance de suspense      Thriller de ação               Thriller jurídico
Thriller médico e científico  Thriller psicológico      Western
```

**Interpretação:** são rótulos editoriais abreviados ou variantes (ex.: `Horror` vs `Terror / horror`; `Ficção policial` vs `Ficção policial / crime`; `Fantasia épica` vs `Fantasia épica / alta fantasia`; `Thriller psicológico` vs subgênero `psicológico`). São **orientações de mistura**, não referências a cartas.

**Decisão arquitetural (ADR-04):** o validador classifica `compatible_genres` como `warning` informativo, nunca `error`. O resolvedor de contexto pode usar um **mapa de aliases** para ligar rótulos a gêneros/subgêneros quando possível, mas a falta de correspondência **não bloqueia** nem altera o deck. Isso preserva o princípio §4: gêneros não são lista fechada nem mutuamente exclusivos.

---

## 10. Schema Zod proposto (esqueleto)

```ts
const CardBase = z.object({
  id: z.string().regex(/^(GEN|ST)-\d{3}$/),
  category_id: z.string().regex(/^CAT-\d{2}$/),
  category: z.string().min(1),
  title: z.string().min(1),
  prompt: z.string().min(1),
  question: z.string().min(1),
  suggested_use: z.string().min(1),
  kind: z.enum(['genre_definition','creative_prompt','archetype',
                'narrator','structure','technique','craft_warning']),
  tags: z.array(z.string()),
  source_concept: z.string().min(1)
});

const GenreCardSchema = CardBase.extend({
  kind: z.literal('genre_definition'),
  genre_family: z.string(), genre_level: z.string(),
  reader_promise: z.string(), core_conventions: z.string(),
  story_engine: z.string(), pitfalls: z.string(),
  compatible_genres: z.array(z.string()),
  genre_selection_role: z.string(),
  sub_genre: z.array(z.string()),
  sub_genre_details: z.array(SubGenreDetailSchema),
  merged_from: z.array(z.string())
});

const NonGenreCardSchema = CardBase.extend({
  kind: z.enum(['creative_prompt','archetype','narrator','structure','technique','craft_warning']),
  genre_adaptation: z.string().min(1),
  genre_relevant_axis: z.string().min(1),
  merged_cards: z.array(z.string()).optional(),
  merged_card_note: z.string().optional()
});

const DeckSchema = z.object({
  deck_id: z.literal('entrelinhas-storytelling-v4'),
  version: z.string(), language: z.literal('pt-BR'),
  card_count: z.number(), category_count: z.number(),
  editorial_principles: z.array(z.string()),
  categories: z.array(CategorySchema),
  cards: z.array(z.discriminatedUnion('kind', [GenreCardSchema, NonGenreCardSchema])),
  usage: UsageSchema,
  genre_taxonomy_sources: z.array(z.object({ title: z.string(), url: z.string().url() })),
  editorial_audit: EditorialAuditSchema
}).superRefine(/* validações cruzadas abaixo */);
```

> `deck_id`/`version` devem ser **parâmetros** da expecting config para decks futuros — não fixar `z.literal` permanente na camada de domínio; usar o literal apenas no fixture de teste da v4.

---

## 11. Testes obrigatórios do deck (§19) — plano

| Categoria | Verificação | Nível |
|---|---|---|
| Contagem | 210 cartas, 17 categorias | ERROR (v4) / parametrizado por versão |
| Contagem por tipo | 32/89/34/26/15/12/2 | ERROR (v4) |
| IDs | 210 únicos, padrão `GEN-\d{3}` / `ST-\d{3}` | ERROR |
| Categorias | toda carta referencia categoria existente | ERROR |
| Campos comuns | presentes e não vazios nas 210 | ERROR |
| Adaptação | `genre_adaptation` + `genre_relevant_axis` nas 178 | ERROR |
| Gênero | 12 campos específicos nas 32 | ERROR |
| Subgêneros | `sub_genre` ↔ `sub_genre_details` 1:1; 8 cartas; 31 detalhes | ERROR |
| `source_card_id` | 31 apontando para históricos — **preservar, não rejeitar** | INFO |
| `compatible_genres` | 12 rótulos não exatos — **aviso, não erro** | WARNING |
| Auditoria | 243→210, 63→32, ST-003/ST-154 removidas, 8 consolidações, 2 merges | ERROR |
| `usage` | 5 perguntas de contrato, 4 tiragens, 6 notas, 6 diretrizes | ERROR |
| Princípios | 6 presentes | ERROR |
| Imutabilidade | loader nunca muta o JSON original | ERROR |

Fixtures sintéticos (`tests/fixtures/`) são permitidos **apenas para testes**; a aplicação usa integralmente o arquivo real.
