# Story Deck — ENTRELINHAS

Extensão para VS Code que transforma o deck autoral **ENTRELINHAS v4** (210 cartas, 17 categorias) em um ambiente de concepção e planejamento narrativo. Complementar ao [Novel Assistant](https://marketplace.visualstudio.com/items?itemName=baryo-dev.novel-assistant), que continua sendo o ambiente preferencial de escrita do manuscrito.

## Status

**Fases 1 a 6 concluídas e verificadas** (Discovery, Fundação, Deck Engine, Genre Builder, Story Builder e integração com Novel Assistant). A extensão instala, ativa, carrega o deck real com validação de integridade, persiste todo o planejamento localmente e coexiste com o Novel Assistant.

**Fora do escopo por decisão do usuário:** IA e auditoria narrativa (Fase 7 do roadmap). O produto funciona integralmente sem elas — nenhum provedor, chave ou chamada de IA existe no código. A arquitetura deixa portas e pontos de extensão para adicioná-las depois, sem alterar o modelo de domínio.

## Desenvolvimento

```sh
npm install
npm run compile           # esbuild (host) + Vite (webview) + cópia do deck
npm test                  # 194 testes unitários (integridade do deck, regras, persistência, integração)
npm run compile:integration
npm run test:integration  # requer VS Code de teste (já baixado em .vscode-test)
npm run package           # gera story-deck-0.1.0.vsix
```

Pressione **F5** no VS Code para abrir o Extension Development Host. Use a Activity Bar **Story Deck** ou os comandos **Abrir Deck Studio**, **Abrir Genre Builder** e **Abrir Story Builder**.

## O que está pronto

| Ambiente | Recursos |
|---|---|
| Deck Studio | 210 cartas, 17 categorias, busca e filtros (texto/categoria/tipo/tag), grade/detalhado, seleção, favoritos, bloqueio, sorteios, versões, vínculos e 4 tiragens recomendadas |
| Genre Builder | 1 gênero dominante, 0–2 secundários, subgêneros com definição integral e `source_card_id` preservado, 5 perguntas do contrato, dimensões independentes, `Story/genre-contract.md` |
| Story Builder | 9 etapas editáveis, hierarquia Atos → Capítulos → Cenas (mover/reordenar preservando IDs e vínculos), Story Bible de 17 seções e 4 documentos Markdown regeneráveis |
| Novel Assistant | detecção por `contributes.commands`, fluxos A/B, criação idempotente de diretórios, abertura de cenas em `Manuscript/`, Scene Brief e diagnóstico de coexistência |

## Estrutura

```text
src/
├── extension/       # comandos, TreeViews, Webviews, bootstrap
├── application/     # serviços e portas
├── domain/          # regras puras (sem dependência da API do VS Code)
├── infrastructure/  # deck, persistência, integrações, Markdown, logging
├── webview/         # React + Vite (Deck Studio, Genre Builder, Story Builder)
└── shared/          # schemas Zod e protocolo de mensagens
resources/decks/     # cópia integral e somente leitura do deck oficial
resources/spreads/   # 4 tiragens como dados
docs/                # documentos de arquitetura
.opencode/agents/    # agentes de planejamento e implementação
tests/               # unit e integration
```

## Decisões de fundação

- O deck original nunca é editado; o recurso incorporado tem o mesmo hash SHA-256.
- Validação parametrizada por versão — as contagens da v4 são expectativas declaradas, não uma regra fixa para sempre.
- `compatible_genres` é consultivo: 12 rótulos sem correspondência exata geram aviso, nunca erro.
- `source_card_id` é rastreabilidade histórica e nunca entra no catálogo.
- Persistência em `.storydeck/*.json` e `Story/*.md`, com escrita atômica, lock por arquivo, revisão otimista e criação idempotente.
- Webview com CSP restritivo, `localResourceRoots` limitado ao bundle e mensagens validadas com Zod nas duas direções.
- Navegação hierárquica usa TreeViews nativas; edição usa Webview.
- Nenhum arquivo do Novel Assistant é alterado; nenhum comando de terceiros é invocado sem descoberta em runtime.
- Tema claro/escuro e alto contraste via variáveis `--vscode-*`; controles com rótulos e estados ARIA.

## Agentes

Dois agentes do OpenCode estão em `.opencode/agents/`: `story-deck-planner` (`longcat-2.5-free`) para arquitetura e decisões, e `story-deck-developer` (`hy4-flash-free#high`) para implementação por fases com TDD. Veja `.opencode/agents/README.md`.
