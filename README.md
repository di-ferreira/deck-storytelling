# Story Deck — ENTRELINHAS

Extensão para VS Code que transforma o deck autoral **ENTRELINHAS v4** (210 cartas, 17 categorias) em um ambiente de concepção e planejamento narrativo. Complementar ao [Novel Assistant](https://marketplace.visualstudio.com/items?itemName=baryo-dev.novel-assistant), que continua sendo o ambiente preferencial de escrita do manuscrito.

## Status

**Fase 2 — Fundação concluída.** A extensão compila, empacota, ativa no Extension Development Host e carrega o deck real com validação de integridade. As fases seguintes (Deck Engine, Genre Builder, Story Builder, integração e IA) ainda serão implementadas.

## Desenvolvimento

```sh
npm install
npm run compile          # esbuild (host) + Vite (webview) + cópia do deck
npm test                 # 21 testes unitários ( integridade do deck, persistência, mensagens)
npm run compile:integration
npm run test:integration # requer download do VS Code de teste
npm run package          # gera o .vsix
```

Pressione **F5** no VS Code para abrir o Extension Development Host. Use a Activity Bar **Story Deck** ou o comando **Story Deck: Abrir Deck Studio**.

## Estrutura

```text
src/
├── extension/       # comandos, TreeViews, Webview, bootstrap
├── application/     # casos de uso, serviços e portas
├── domain/          # regras puras (sem dependência da API do VS Code)
├── infrastructure/  # deck, persistência, IA, integrações, logging
├── webview/         # React + Vite (Deck Studio)
└── shared/          # schemas Zod e protocolo de mensagens
resources/decks/     # cópia integral e somente leitura do deck oficial
docs/                # documentos de arquitetura
.opencode/agents/    # agentes de planejamento e implementação
tests/               # unit e integration
```

## Decisões de fundação

- O deck original `deck_storytelling.json` nunca é editado: ele é copiado para `resources/decks/entrelinhas-storytelling-v4.json` e carregado como recurso somente leitura.
- A validação é parametrizada por versão — as contagens da v4 são expectativas declaradas, não uma regra fixa para sempre.
- `compatible_genres` com rótulos não exatos gera **aviso**, nunca erro: são orientações consultivas.
- `source_card_id` é rastreabilidade histórica e não entra no catálogo ativo.
- Persistência em `.storydeck/*.json` e `Story/*.md`, com escrita atômica, fila de lock, watcher para alterações externas e criação idempotente (nenhum arquivo existente é sobrescrito).
- Webview com CSP restritivo, `localResourceRoots` limitado ao bundle e mensagens validadas com Zod nas duas direções. Nenhum comando arbitrário cruza a fronteira.
- Navegação hierárquica usa TreeViews nativas; o Deck Studio usa Webview.
- O Novel Assistant é detectado em runtime por `contributes.commands`; nenhum ID de comando é inventado.

## Agentes

Dois agentes do OpenCode estão em `.opencode/agents/`: `story-deck-planner` (arquitetura e decisões, sem editar o repositório) e `story-deck-developer` (implementação por fases com TDD). Veja `.opencode/agents/README.md`.
