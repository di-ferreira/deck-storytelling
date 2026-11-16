# Agentes do Story Deck — instalação e uso

Dois agentes customizados do **OpenCode V2**, desenhados para trabalhar em conjunto:

| Arquivo | ID do agente | Modo | Função |
|---|---|---|---|
| `story-deck-planner.md` | `story-deck-planner` | `primary` | Descoberta, arquitetura, decisões, documentação, critérios de teste. **Não edita o repositório** — só `~/.opencode/plan/**`. |
| `story-deck-developer.md` | `story-deck-developer` | `primary` | Implementação por fases, TDD, build, relatórios. Tem permissão de escrita no repositório. |

## Instalação (quando sair do modo de planejamento)

Copie os dois arquivos para a pasta de agentes do projeto:

```text
C:\Projetos\Extensão VS Code\.opencode\agents\
├── story-deck-planner.md
└── story-deck-developer.md
```

Também mova os seis documentos de arquitetura deste diretório para o repositório (o caminho exato fica a critério do planner — a proposta em `ARCHITECTURE.md` é `docs/`).

O OpenCode recarrega agentes automaticamente após salvar. Se não aparecerem, use `/reload`. Não é preciso reiniciar.

Opcional — tornar o planner o agente padrão de novas sessões em `opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "default_agent": "story-deck-planner"
}
```

## Como usar

1. Selecione `story-deck-planner` no seletor de agente (TUI) para discutir arquitetura, revisar documentos, decidir pendências ou encerrar uma fase de planejamento.
2. Selecione `story-deck-developer` para implementar a próxima fase. Ele lê os documentos do plano antes de codar.
3. Ciclo recomendado:

```
story-deck-planner  →  documenta decisões e critérios
        ↓  (troca de agente)
story-deck-developer →  implementa fase + testes + build
        ↓  (troca de agente)
story-deck-planner  →  valida resultado, atualiza plano, define próxima fase
```

Também é possível acioná-los por menção em uma sessão existente, por exemplo: "use o agente story-deck-planner para revisar a Fase 3".

## Por que dois agentes

- **Separação de responsabilidades:** quem decide não implementa; quem implementa não redefine a arquitetura sozinho.
- **Segurança:** o planner tem permissão de `edit` negada em todo o repositório, com exceção explícita de `~/.opencode/plan/**`.
- **Contexto:** cada agente carrega no próprio system prompt apenas o que precisa — referências de API para o planner, fluxo de TDD/build para o developer.
- **Rastreabilidade:** decisões ficam nos documentos de arquitetura; código e testes ficam no repositório.

## Referências incorporadas aos agentes

- Novel Assistant — https://marketplace.visualstudio.com/items?itemName=baryo-dev.novel-assistant
- VS Code Webview API — https://code.visualstudio.com/api/extension-guides/webview
- VS Code Tree View API — https://code.visualstudio.com/api/extension-guides/tree-view
- VS Code Custom Editor API — https://code.visualstudio.com/api/extension-guides/custom-editors
- Documentação de agentes do OpenCode — https://opencode.ai/docs/agents/
