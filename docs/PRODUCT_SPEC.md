# PRODUCT_SPEC.md — Story Deck / Especificação do Produto

> Fase 1 — Discovery e Arquitetura. Especificação consolidada a partir do MASTER PROMPT (23 seções).

---

## 1. Visão do produto

Story Deck é uma extensão VS Code que transforma o deck autoral **ENTRELINHAS v4** (210 cartas, 17 categorias) em um ambiente interativo de **concepção e planejamento narrativo**. Não é um visualizador de cartas: o deck participa de todo o processo criativo, conectando:

```
Gêneros → Personagens → Motivações → Conflitos → Mundo → Narrativa →
Estrutura → Técnicas → Cenas → Manuscrito
```

- **Novel Assistant** = ambiente preferencial de **escrita e edição** do manuscrito.
- **Story Deck** = ambiente de **concepção, organização e planejamento**.
- Ambos coexistem no mesmo workspace, sem modificar um ao outro.

**Visão final (master prompt):** conexão direta entre o deck ENTRELINHAS e a produção de um manuscrito real no VS Code, com o Novel Assistant como destino de escrita. Produto modular, extensível, local-first, confiável e preparado para novos decks e recursos de IA.

---

## 2. Ambientes centrais

| Ambiente | Função | Entrada | Saída |
|---|---|---|---|
| **A — Deck Studio** | Explorar cartas e descobrir possibilidades | Deck completo | Seleção persistida, favoritos, tiragens, histório |
| **B — Story Builder** | Transformar escolhas em estrutura narrativa | Seleção + decisões do autor | Premissa, Story Bible,personagens, atos, capítulos, cenas |

O escritor transita livremente entre A e B. **Cartas selecionadas permanecem vinculadas às decisões narrativas** (rastreabilidade por identificador).

---

## 3. Navegação principal (Activity Bar "Story Deck")

| Seção | Conteúdo |
|---|---|
| **Dashboard** | Projetos, progresso narrativo, últimas atividades, acesso rápido |
| **Deck Studio** | Catálogo, categorias, cartas selecionadas, favoritos, tiragens |
| **Genre Builder** | Gênero dominante, secundários, subgêneros, contrato de gênero |
| **Story Builder** | Premissa, Story Bible, personagens, conflitos, world building, estrutura, capítulos, cenas |
| **AI Assistant** | Consultoria, geração de ideias, planejamento, revisão |

---

## 4. Requisitos funcionais (mapeados ao master prompt)

### 4.1 Catálogo e exploração (§6)
- [ ] Carregar dinamicamente **17 categorias** e **210 cartas** do JSON oficial.
- [ ] Exibir quantidade por categoria, tipos de carta, cartas selecionadas e favoritas.
- [ ] Pesquisa por texto; filtros por categoria, tipo e tags; consulta de subgêneros.
- [ ] Modos: grade, detalhado, selecionadas.
- [ ] Cartas com identidade visual: ID, título, categoria, cor da categoria, tipo, resumo, indicadores de seleção/favorito; abertura mostra conteúdo integral.
- [ ] Seleção: selecionar, desmarcar, múltipla, favoritar, bloquear, substituir, sortear, embaralhar, salvar combinação, nova versão, histórico. **Nenhuma escolha é descartada durante a navegação.**
- [ ] Associar carta a decisão narrativa / gênero / personagem / ato / capítulo / cena, com rastreabilidade por ID.

### 4.2 Sistema de gêneros (§7)
- [ ] 1 gênero **dominante** (usa `reader_promise`, `story_engine`, `core_conventions`, `pitfalls`).
- [ ] 0 a 2 gêneros **secundários**; exibir contribuição de cada um sem diluir o dominante.
- [ ] Subgêneros selecionáveis dentro da carta-mãe (8 cartas com `sub_genre_details`, 31 detalhes); cada um com definição própria; **`source_card_id` preservado para rastreabilidade**, sem adicionar cartas históricas ao catálogo ativo.
- [ ] Contrato de gênero: 5 perguntas editáveis e persistidas na Story Bible.
- [ ] Dimensões independentes: tom, atmosfera, cenário, público, formato, extensão. **Sombrio = tom; medieval = contexto; YA = público; mangá/HQ = formato.**
- [ ] `compatible_genres` é orientação, **nunca restrição absoluta**.

### 4.3 Tiragens recomendadas (§8)
Quatro tiragens implementadas como experiências prontas e extensíveis como dados:

| Tiragem | Composição | Objetivo |
|---|---|---|
| Identidade da obra | 1 dominante + 1 secundário + 1 tom/atmosfera (CAT-05 ou CAT-16) | Definir promessa, mistura e estilo |
| Projeto de enredo | 1 dominante + 1 estrutura (CAT-13) + 1 conflito (CAT-03) + 1 trama (CAT-14) | Transformar gênero em motor de acontecimentos |
| Teste de coerência | 1 gênero + 1 narrador (CAT-10) + 1 técnica (CAT-15) + 1 cena (CAT-06) | Verificar voz, técnica e cena |
| Mistura de gêneros | 2 gêneros + 1 conflito + 1 personagem | Descobrir contribuição de cada gênero |

Cada tiragem exibe: objetivo, regras, cartas necessárias, cartas já selecionadas, quantidade restante, resultado, salvar/retomar.

### 4.4 Story Builder (§9)
Nove etapas progressivas, editáveis e **não obrigatórias** (campos podem ficar incompletos):

1. **Identidade da obra** — título provisório, descrição, gêneros, subgêneros, tom, atmosfera, público, formato, cenário, período, extensão.
2. **Premissa** — ideia central, logline, premissa, sinopse curta/expandida, tema, pergunta dramática, proposta narrativa, elemento diferenciador. IA sugere; autor aprova/edita.
3. **Personagens** — CAT-01, CAT-02, CAT-04, CAT-11, CAT-12; distinguir papéis dramáticos de modelos de motivação; ficha completa (nome, idade, descrição, história, papel, desejo externo, necessidade interna, motivação, medo, ferida, contradições, valores, defeitos, habilidades, segredos, relacionamentos, arquétipos, arco).
4. **Conflitos** — CAT-03/CAT-04; principal, secundários, obstáculos, oposição, dilemas, pressões, consequências, escolhas; cada conflito ligado a um objetivo de personagem.
5. **World building** — CAT-05; universo, localizações, regras, cultura, sociedade, costumes, economia, política, tecnologia, sobrenatural, atmosfera, sensorial.
6. **Segredos e reviravoltas** — CAT-07/CAT-08; segredo, quem sabe/quem não sabe, pistas, revelação, consequências, mudança de percepção, preparação; **verdade factual separada do que o leitor sabe**.
7. **Narrador e perspectiva** — CAT-10; tipo, pessoa, foco, conhecimento, confiabilidade, alternância, limites.
8. **Estrutura narrativa** — CAT-09/CAT-13; atos, reordenação, objetivos, viradas, linhas paralelas, clímax, resolução; combinações coerentes permitidas, modelos não impostos.
9. **Técnicas narrativas** — CAT-14/CAT-15/CAT-16; vinculáveis à obra, arco, capítulo ou cena; carregar **todas** as cartas disponíveis.

### 4.5 Construtor de capítulos e cenas (§10)
- Visão hierárquica **ou** cartões organizáveis.
- **Ato**: ID, título, objetivo, descrição, conflito, personagens, viradas, resultado esperado.
- **Capítulo**: ID, número, título, descrição, ato, objetivo, personagens, localizações, cenas, status.
- **Cena**: ID, título, capítulo, objetivo, personagem focal, presentes, localização, momento cronológico, conflito, obstáculo, tensão, mudança de estado, consequência, gancho, cartas associadas.
- Modelo sugerido **Objetivo → Pressão → Conflito → Escolha → Mudança** (inspirado em ST-082, não obrigatório).
- Mover cenas entre capítulos/atos **preserva referências**.

### 4.6 Auditoria narrativa (§11)
- Usar cartas `craft_warning` (ST-149, ST-150) para identificar riscos.
- Fluxo: selecionar elemento → verificação assistida → identificar risco → explicar motivo → apontar trechos/decisões → sugerir alternativas → autor ignora ou aceita.
- Expansão futura: coerência de personagens, continuidade temporal, preparação/recompensa, coerência de gênero, contradições do universo, arcos sem resolução, pontas soltas.
- **Alertas nunca são erros absolutos de autoria.**

### 4.7 Story Bible (§12)
Markdown editável, gerado automaticamente, com 17 seções na ordem: identidade, contrato de gênero, premissa/sinopse, temas, personagens, relacionamentos, conflitos, mundo, narrador/perspectiva, estrutura, atos, capítulos, cenas, técnicas, segredos/revelações, decisões criativas, cartas utilizadas. Deve acompanhar a evolução da obra — **não é relatório estático**.

### 4.8 IA opcional (§13)
- Funcionamento integral **sem IA**; arquitetura agnóstica.
- Provedores OpenAI-compatible: LM Studio, Ollama, outros. Avaliar futuramente API de modelos do VS Code.
- Configurações: provedor, endpoint, modelo, API key, temperatura, limite de saída, timeout, contexto, preferência local. Segredo em `SecretStorage`.
- Contexto **seletivo por tarefa** (premissa e cena têm listas próprias); nunca enviar as 210 cartas nem o manuscrito inteiro.
- **Obrigatório** incluir `genre_adaptation` e `genre_relevant_axis` das cartas aplicadas.
- 9 modos de atuação como perfis de prompt compartilhando a mesma Story Bible (não agentes fixos).
- Regras: autor decide; IA explica; sugestões referenciam cartas; nada é inserido automaticamente no manuscrito; nada é sobrescrito sem autorização; histórico consultável; **3 alternativas** por padrão.

### 4.9 Integração (§14)
Ver `INTEGRATION.md`. Resumo: detectar `baryo-dev.novel-assistant`, descobrir comandos reais em `contributes.commands`, dois fluxos de criação de projeto, diretórios próprios `.storydeck/` + `Story/`, direcionar para escrita no Novel Assistant quando os formatos forem conhecidos; caso contrário, abrir Markdown normalmente.

### 4.10 Interface (§15)
Cards visuais, painéis de detalhes, navegação por categorias, indicadores, organização por etapas, hierarquia, kanban opcional para cenas, busca rápida, tema claro/escuro, acessibilidade, navegação por teclado. Cores originais das categorias; variáveis de tema do VS Code. React + Vite + CSS modular + Lucide Icons quando justificado; TreeView nativa para hierarquia.

---

## 5. Princípios editoriais obrigatórios (§4)

Presentes em `editorial_principles` (6 itens). Regras de ouro para o comportamento do produto:

1. Gênero é promessa de experiência, não fórmula.
2. Um dominante organiza a promessa; até dois secundários enriquecem.
3. Subgêneros são especificadores combináveis.
4. Arquétipos, narradores, técnicas, estrutura, gênero, tom, público e formato são dimensões distintas.
5. Semelhança temática não equivale a equivalência funcional.
6. Cartas de alerta indicam risco, não proibição artística.

**O sistema nunca julga uma história inválida por não seguir fórmula conhecida.**

---

## 6. Escopo

### 6.1 MVP (critérios de aceitação — §21)
1. Instala corretamente no VS Code.
2. ENTRELINHAS v4 carregado integralmente.
3. 17 categorias disponíveis.
4. Cartas visualizadas e pesquisadas.
5. Cartas selecionadas e desmarcadas.
6. Sorteios funcionam.
7. Escolhas persistidas.
8. Regras de gênero respeitadas.
9. Subgêneros escolhidos e consultados.
10. Quatro tiragens originais disponíveis.
11. Premissa construída.
12. Story Bible criada.
13. Personagens, conflitos e estruturas organizados.
14. Atos, capítulos e cenas criados.
15. Arquivos Markdown gerados corretamente.
16. Coexistência com Novel Assistant.
17. Nenhum conteúdo existente sobrescrito.
18. Funciona sem IA.
19. Persistência e regras críticas cobertas por testes.

### 6.2 Fora do escopo do MVP
- Editor WYSIWYG, histórico, contagem de palavras, Git, exportação (pertencem ao Novel Assistant).
- Decks personalizados além do ENTRELINHAS (arquitetura deve permitir no futuro).
- Análises de coerência além das cartas `craft_warning` (roadmap futuro).
- API de modelos do VS Code (avaliar futuramente).
- Kanban de cenas (somente se agregar valor).

---

## 7. Critérios de teste e validação (resumo)

A matriz completa está em `IMPLEMENTATION_PLAN.md`. Princípios:

- **Integridade do deck**: 210 cartas, 17 categorias, contagens por `kind` (32/89/34/26/15/12/2), IDs únicos, categorias válidas, `sub_genre` ↔ `sub_genre_details`, `genre_adaptation`/`genre_relevant_axis` preservados, auditoria editorial presente. Validação parametrizada pela versão — **não fixar 210 para sempre**.
- **Regras de domínio**: 1 dominante, máx. 2 secundários, subgêneros pertencentes ao gênero escolhido, cartas consolidadas históricas **não** entram no catálogo ativo.
- **Persistência**: escrita atômica, travamento concorrente, edição externa preservada, migração de schema, recuperação de estado.
- **IA**: contexto mínimo, campos de adaptação presentes, referências às cartas, 3 alternativas, nenhuma inserção automática.
- **Integração**: coexistência em workspace compartilhado, nenhum arquivo do Novel Assistant alterado, comandos descobertos em runtime.
- **UI/segurança**: CSP, mensagens validadas, sem credenciais no frontend, temas claro/escuro, navegação por teclado.

---

## 8. Informações que ainda precisam de decisão / confirmação

Relacionadas no `INTEGRATION.md` e `IMPLEMENTATION_PLAN.md`. As que impactam o produto:

1. Nome/publisher definitivos da extensão (proposta: `story-deck`).
2. Versão mínima suportada do Novel Assistant (proposta: 0.1.0, a instalada).
3. Formato exato de nomes de capítulos/cenas reconhecido pelo Novel Assistant — validar empiricamente.
4. Como tratar os 12 rótulos de `compatible_genres` que não resolvem para cartas/subgêneros ativos (decisão proposta: rótulos consultivos + mapa de aliases).
5. Provedor de IA preferido para os testes de aceitação (a interface é agnóstica; não bloqueia).
