# MASTER PROMPT — STORY DECK
## Plataforma de construção de histórias com o deck ENTRELINHAS v4
### Extensão para Visual Studio Code

---

# 1. PAPEL E MISSÃO

Atue como um arquiteto de software sênior, especialista em desenvolvimento de extensões para Visual Studio Code, TypeScript, ferramentas de escrita criativa, engenharia de software e sistemas de Inteligência Artificial aplicados à criação literária.

Sua missão é projetar e desenvolver uma extensão para Visual Studio Code chamada provisoriamente **Story Deck**, utilizando como núcleo de construção narrativa o deck autoral ENTRELINHAS — Deck de Storytelling, versão 4.0.0.

O produto deverá permitir que um escritor construa a identidade e a estrutura de uma história através de cartas de storytelling, transformando escolhas criativas em elementos concretos de uma obra literária.

Não desenvolva somente um visualizador de cartas.

Desenvolva um ambiente interativo que conecte:

**Gêneros → Personagens → Motivações → Conflitos → Mundo → Narrativa → Estrutura → Técnicas → Cenas → Manuscrito.**

O escritor deverá conseguir começar com uma ideia vaga, descobrir possibilidades narrativas por meio das cartas e construir progressivamente a estrutura de sua obra.

O produto deverá ser complementar à extensão:

https://marketplace.visualstudio.com/items?itemName=baryo-dev.novel-assistant

O Novel Assistant será considerado a base para o processo de escrita e edição do manuscrito.

O Story Deck será responsável pela concepção, organização e planejamento narrativo.

As duas extensões deverão coexistir no mesmo workspace.

# 2. FONTE OFICIAL DE DADOS — ENTRELINHAS V4

O arquivo `deck_storytelling.json` é a fonte oficial e prioritária de todos os conteúdos narrativos da aplicação.

Antes de implementar qualquer funcionalidade:

1. Localize e leia integralmente o arquivo.
2. Inspecione o schema real.
3. Identifique todos os campos.
4. Analise todas as categorias.
5. Analise os tipos de cartas.
6. Analise as regras de seleção.
7. Analise os relacionamentos entre gêneros e subgêneros.
8. Verifique os dados de auditoria editorial.
9. Implemente um importador e validador que preservem o conteúdo original.

Não utilize o antigo arquivo `deck-small.json` como substituto do catálogo completo.

Não invente cartas.
Não remova cartas.
Não renomeie identificadores.
Não reescreva o conteúdo das cartas.
Não transforme definições de subgêneros em novas cartas independentes sem respeitar o modelo da versão 4.

O sistema deverá utilizar o conteúdo integral do arquivo.

## 2.1. Identificação do deck

O deck fornecido possui:

- deck_id: `entrelinhas-storytelling-v4`
- title: `ENTRELINHAS — Deck Autoral de Storytelling`
- version: `4.0.0`
- language: `pt-BR`
- card_count: `210`
- category_count: `17`

É um deck autoral cuja estrutura reúne definições de gêneros, exercícios criativos, técnicas narrativas, arquétipos, estruturas e alertas de execução.

Sua descrição editorial e seus princípios devem ser preservados.

## 2.2. Estrutura das categorias

A aplicação deverá carregar dinamicamente as 17 categorias existentes no JSON.

| ID | Categoria | Quantidade |
|---|---|---:|
| CAT-17 | Gêneros literários e narrativos | 32 |
| CAT-01 | Personagens e arquétipos | 9 |
| CAT-02 | Desejos e motivações | 10 |
| CAT-03 | Conflitos e obstáculos | 10 |
| CAT-04 | Emoções e dilemas | 10 |
| CAT-05 | Mundos e atmosfera | 10 |
| CAT-06 | Cenas e acontecimentos | 10 |
| CAT-07 | Segredos e revelações | 10 |
| CAT-08 | Reviravoltas e consequências | 10 |
| CAT-09 | Estrutura e ritmo | 10 |
| CAT-10 | Tipos de narradores e foco | 12 |
| CAT-11 | Arquétipos de função narrativa | 13 |
| CAT-12 | Arquétipos de motivação | 13 |
| CAT-13 | Estruturas e organização temporal | 15 |
| CAT-14 | Trama, preparação e revelação | 13 |
| CAT-15 | Técnicas de narrativa e perspectiva | 12 |
| CAT-16 | Estilo, linguagem e impacto | 11 |

Utilize os campos `id`, `name`, `short`, `color` e `description` de cada categoria.

As cores presentes no JSON deverão orientar a identidade visual das cartas e das categorias.

Não codifique manualmente essas categorias no frontend.

# 3. MODELO DE DADOS DAS CARTAS

Implemente o sistema respeitando os diferentes tipos e campos presentes no arquivo.

## 3.1. Campos comuns

Todas as 210 cartas possuem:

- id
- category_id
- category
- title
- prompt
- question
- suggested_use
- kind
- tags
- source_concept

O sistema deverá utilizar essas informações na interface e nos processos de construção da narrativa.

### Exemplo de apresentação

Carta ST-012 — A necessidade escondida.

Exibir:

**Descrição:** Por trás do objetivo declarado, existe uma necessidade emocional que o personagem evita admitir.

**Pergunta:** Que atitude revelaria essa necessidade sem que o personagem a confessasse?

**Aplicação:** Crie uma escolha em que atender ao desejo afaste o personagem da necessidade.

O exemplo acima é uma representação resumida. Na aplicação real, utilize integralmente o texto original do JSON.

## 3.2. Tipos de cartas

O campo `kind` define a natureza da carta.

Os tipos existentes são:

- `genre_definition`: definição de gênero narrativo.
- `creative_prompt`: estímulo para criação.
- `archetype`: arquétipo.
- `narrator`: tipo de narrador.
- `structure`: estrutura narrativa.
- `technique`: técnica narrativa.
- `craft_warning`: alerta de execução narrativa.

A interface deverá distinguir esses tipos visualmente e comportamentalmente.

Não trate todas as cartas como se fossem apenas perguntas ou exercícios.

Uma carta de estrutura deve auxiliar na organização da história.

Uma carta de narrador deve auxiliar na definição da voz e do foco narrativo.

Uma carta de arquétipo deve auxiliar na construção de funções e motivações dos personagens.

Uma carta de alerta deverá servir como instrumento de revisão e diagnóstico.

## 3.3. Campos adicionais das 178 cartas que não são gêneros

O deck fornece dois campos particularmente importantes:

- `genre_adaptation`
- `genre_relevant_axis`

Esses campos estão presentes nas 178 cartas não classificadas como `genre_definition`.

Eles orientam como cada carta pode ser interpretada dentro da experiência prometida pelo gênero da obra.

Exemplo:

Uma carta de motivação pode receber interpretações diferentes dependendo de a história ser um mistério, romance, aventura, horror ou thriller.

O sistema deverá utilizar essas orientações.

A IA deverá receber a carta original, seu eixo narrativo relevante e a orientação de adaptação ao gênero selecionado.

Não ignore esses campos durante a geração de premissas, personagens, cenas ou capítulos.

## 3.4. Campos específicos dos gêneros

As 32 cartas de gênero possuem informações adicionais:

- `source_concept`
- `genre_family`
- `genre_level`
- `reader_promise`
- `core_conventions`
- `story_engine`
- `pitfalls`
- `compatible_genres`
- `genre_selection_role`
- `sub_genre`
- `sub_genre_details`
- `merged_from`

Esses campos constituem o contrato de utilização das cartas de gênero.

A interface deverá permitir consultar:

1. O que define o gênero.
2. Qual experiência promete ao leitor.
3. Quais convenções normalmente o caracterizam.
4. Qual motor narrativo impulsiona a obra.
5. Quais riscos de execução devem ser observados.
6. Com quais outros gêneros pode ser combinado.
7. Quais subgêneros podem especificá-lo.

Não reduza uma carta de gênero a uma categoria ou uma etiqueta.

O gênero deverá influenciar diretamente a construção da narrativa.

## 3.5. Sistema de subgêneros

Este é um dos elementos mais importantes da versão 4.

O deck possui subgêneros consolidados em cartas-mãe.

Os campos são:

- `sub_genre`: lista compacta dos nomes dos subgêneros.
- `sub_genre_details`: definições detalhadas.

Cada objeto de `sub_genre_details` possui:

- `name`
- `source_card_id`
- `prompt`
- `question`
- `suggested_use`
- `reader_promise`
- `core_conventions`
- `pitfalls`
- `compatible_genres`

A interface deverá permitir que o usuário selecione subgêneros diretamente dentro da carta-mãe.

Exemplo:

Gênero: Thriller.

Subgêneros disponíveis:
- Psicológico.
- De ação.
- Jurídico.
- Médico e científico.
- Político.
- Conspiratório.

Ao selecionar um subgênero, o sistema deverá disponibilizar sua definição e suas orientações específicas.

Os subgêneros não deverão ser tratados como simples tags.

Cada subgênero poderá influenciar:
- O conflito.
- A natureza da ameaça.
- Os personagens.
- O ritmo.
- As técnicas narrativas.
- A atmosfera.
- As expectativas do leitor.

Preserve o `source_card_id` para rastreabilidade histórica.

Não adicione automaticamente as cartas históricas indicadas em `source_card_id` ao catálogo atual. O catálogo ativo é formado pelas 210 cartas presentes em `cards`.

## 3.6. Histórico de consolidação editorial

O arquivo também contém:

- `merged_from`
- `merged_cards`
- `merged_card_note`
- `editorial_audit`

Esses dados registram a consolidação de cartas da versão anterior.

Preserve essas informações.

Elas não devem aparecer como cartas adicionais no deck ativo, mas poderão ser utilizadas em consultas, auditorias e futuras atualizações.

# 4. PRINCÍPIOS EDITORIAIS OBRIGATÓRIOS

Respeite integralmente os princípios registrados em `editorial_principles`.

Em especial:

1. Gênero é promessa de experiência, não uma fórmula obrigatória.
2. Um gênero dominante organiza a promessa central.
3. Até dois gêneros secundários podem enriquecer a mistura.
4. Subgêneros são especificadores combináveis.
5. Arquétipos, narradores, técnicas, estrutura, gênero, tom, público e formato são dimensões diferentes.
6. Semelhanças temáticas não justificam tratar cartas diferentes como equivalentes.
7. Cartas de alerta indicam riscos de execução, não proibições artísticas.

O escritor deverá ter liberdade para manter, misturar ou subverter convenções.

A aplicação não deverá julgar uma história como inválida apenas porque ela não segue uma fórmula conhecida.

# 5. EXPERIÊNCIA CENTRAL DO PRODUTO

A experiência principal deverá ser dividida em dois grandes ambientes:

## AMBIENTE A — DECK STUDIO

Responsável por explorar cartas e descobrir possibilidades narrativas.

## AMBIENTE B — STORY BUILDER

Responsável por transformar as escolhas do Deck Studio em uma estrutura narrativa concreta.

O escritor poderá transitar livremente entre os ambientes.

As cartas selecionadas deverão permanecer vinculadas às decisões narrativas realizadas.

# 6. DECK STUDIO — EXPLORAÇÃO E SELEÇÃO DE CARTAS

Desenvolva uma experiência visual de navegação pelo deck.

## 6.1. Catálogo

Apresente:

- Todas as categorias.
- Quantidade de cartas por categoria.
- Cartas disponíveis.
- Tipos de cartas.
- Cartas selecionadas.
- Cartas favoritas.
- Campo de pesquisa.
- Filtros por categoria.
- Filtros por tipo.
- Filtros por tags.
- Consulta aos subgêneros.

Permita alternar entre:

- Visualização em grade.
- Visualização detalhada.
- Visualização de cartas selecionadas.

## 6.2. Design das cartas

Cada carta deverá ter identidade visual própria.

Elementos visuais:

- Identificador.
- Título.
- Categoria.
- Cor da categoria.
- Tipo de carta.
- Resumo ou trecho da descrição.
- Indicador de seleção.
- Indicador de favorito.

Ao abrir uma carta, apresentar seu conteúdo integral.

O design deve lembrar um deck físico de storytelling, mas manter usabilidade dentro do VS Code.

A apresentação deverá aproveitar as cores do deck.

Não transforme a experiência em uma tabela administrativa.

## 6.3. Seleção

O escritor deverá conseguir:

- Selecionar uma carta.
- Desmarcar uma carta.
- Selecionar várias cartas.
- Marcar cartas como favoritas.
- Bloquear uma seleção.
- Substituir uma carta.
- Sortear cartas.
- Embaralhar.
- Salvar uma combinação.
- Criar uma nova versão da seleção.
- Consultar o histórico.

Não descarte escolhas do escritor durante a navegação.

Toda seleção deverá ser persistida.

## 6.4. Associação de cartas

Permita relacionar uma carta a:

- Uma decisão narrativa.
- Um gênero.
- Um personagem.
- Um ato.
- Um capítulo.
- Uma cena.

Uma carta não precisa ser aplicada à história inteira.

Por exemplo, um estímulo de conflito pode ser associado a um personagem específico, enquanto uma técnica narrativa pode ser aplicada somente a determinada cena.

Mantenha a rastreabilidade por identificador.

# 7. SISTEMA DE GÊNEROS — CONSTRUÇÃO DA IDENTIDADE LITERÁRIA

Implemente um fluxo exclusivo para a definição dos gêneros da obra.

Esse fluxo deverá respeitar exatamente as regras do deck.

## 7.1. Escolha do gênero dominante

O escritor deverá selecionar uma única carta de gênero como dominante.

O gênero dominante será responsável por estabelecer:

- A promessa principal ao leitor.
- O motor central da trama.
- As principais convenções.
- A experiência narrativa predominante.
- O tipo de recompensa ou resolução esperado.

Utilize os campos originais:

- reader_promise
- story_engine
- core_conventions
- pitfalls

## 7.2. Gêneros secundários

Permita selecionar de zero a dois gêneros secundários.

Eles poderão enriquecer a narrativa, adicionando motores de trama e convenções complementares.

A interface deverá exibir a contribuição de cada gênero secundário.

Não permita que a combinação elimine automaticamente a importância do gênero dominante.

## 7.3. Subgêneros

Após selecionar um gênero, permita selecionar um ou mais subgêneros disponíveis.

Exemplo:

Mistério
+ Thriller:
  - Psicológico
  - Conspiratório
+ Ficção científica:
  - Cyberpunk

O usuário poderá consultar a definição completa de cada subgênero antes de escolhê-lo.

As combinações deverão utilizar os dados reais de `compatible_genres` como orientações.

Esses relacionamentos não deverão funcionar como restrições absolutas.

## 7.4. Contrato de gênero

O sistema deverá apresentar cinco perguntas fundamentais, definidas no campo `usage.genre_contract`:

1. Promessa: que experiência o leitor espera receber?
2. Motor: que tipo de conflito faz a história avançar?
3. Convenções: que elementos ajudam o leitor a reconhecer o gênero?
4. Liberdade: quais convenções serão mantidas, combinadas ou subvertidas?
5. Recompensa: que tipo de resolução satisfaz a promessa narrativa?

As respostas deverão ser editáveis e persistidas na Story Bible.

## 7.5. Dimensões independentes

Depois de selecionar os gêneros, o usuário deverá definir:

- Tom.
- Atmosfera.
- Cenário.
- Público-alvo.
- Formato.
- Extensão aproximada.

O sistema deverá respeitar a distinção editorial do deck:

- Sombrio é tom.
- Medieval é contexto.
- YA é público.
- Mangá ou HQ é formato.

Não misture essas dimensões com a seleção de gêneros.

# 8. TIRAGENS PRONTAS — RECOMMENDED SPREADS

O arquivo apresenta quatro combinações recomendadas de cartas em `usage.recommended_spreads`.

Implemente essas tiragens como experiências prontas dentro do Deck Studio.

## 8.1. Identidade da obra

Seleção:

- 1 gênero dominante.
- 1 gênero secundário.
- 1 carta de tom ou atmosfera de CAT-05 ou CAT-16.

Objetivo:

Definir promessa, mistura e estilo.

## 8.2. Projeto de enredo

Seleção:

- 1 gênero dominante.
- 1 estrutura de CAT-13.
- 1 conflito de CAT-03.
- 1 carta de trama de CAT-14.

Objetivo:

Transformar o gênero em motor de acontecimentos.

## 8.3. Teste de coerência

Seleção:

- 1 gênero.
- 1 narrador de CAT-10.
- 1 técnica de CAT-15.
- 1 cena de CAT-06.

Objetivo:

Verificar se voz, técnica e cena entregam a experiência prometida.

## 8.4. Mistura de gêneros

Seleção:

- 2 cartas de gênero.
- 1 conflito.
- 1 carta de personagem.

Objetivo:

Descobrir o que cada gênero acrescenta e qual permanece dominante.

Cada tiragem deverá apresentar:

- Objetivo.
- Regras.
- Cartas necessárias.
- Cartas já selecionadas.
- Quantidade restante.
- Resultado.
- Possibilidade de salvar e retomar.

Crie um mecanismo extensível para futuras tiragens personalizadas.

Não codifique somente essas quatro tiragens.

# 9. STORY BUILDER — CONSTRUÇÃO DA HISTÓRIA

Depois da seleção das cartas, o escritor deverá conseguir transformar as escolhas em elementos literários.

A construção deverá ser progressiva, editável e não obrigatória.

## ETAPA 1 — IDENTIDADE DA OBRA

Informações:

- Título provisório.
- Descrição inicial.
- Gênero dominante.
- Gêneros secundários.
- Subgêneros.
- Tom.
- Atmosfera.
- Público.
- Formato.
- Cenário.
- Período.
- Extensão pretendida.

Permita deixar campos incompletos.

## ETAPA 2 — PREMISSA

Desenvolver:

- Ideia central.
- Logline.
- Premissa.
- Sinopse curta.
- Sinopse expandida.
- Tema central.
- Pergunta dramática.
- Proposta narrativa.
- Elemento diferenciador.

As cartas escolhidas deverão fornecer estímulos para essas decisões.

A IA poderá sugerir alternativas, mas o escritor deverá aprovar ou editar todas as propostas.

## ETAPA 3 — PERSONAGENS

Utilize as categorias:

- CAT-01: Personagens e arquétipos.
- CAT-02: Desejos e motivações.
- CAT-04: Emoções e dilemas.
- CAT-11: Arquétipos de função narrativa.
- CAT-12: Arquétipos de motivação.

O sistema deverá distinguir os papéis dramáticos dos modelos de motivação.

Permita construir:

### Ficha do personagem

- Nome.
- Idade, quando pertinente.
- Descrição.
- História pregressa.
- Papel na história.
- Desejo externo.
- Necessidade interna.
- Motivação.
- Medo.
- Ferida emocional.
- Contradições.
- Valores.
- Defeitos.
- Habilidades.
- Segredos.
- Relacionamentos.
- Arquétipos associados.
- Arco de transformação.

## ETAPA 4 — CONFLITOS

Utilize CAT-03 e CAT-04 como base.

Desenvolva:

- Conflito principal.
- Conflitos secundários.
- Obstáculos.
- Oposição.
- Dilemas morais.
- Pressões emocionais.
- Consequências.
- Escolhas difíceis.

Cada conflito deverá estar relacionado a um objetivo de personagem.

## ETAPA 5 — WORLD BUILDING

Utilize CAT-05.

Construa:

- Universo.
- Localizações.
- Regras.
- Cultura.
- Sociedade.
- Costumes.
- Economia.
- Política.
- Tecnologia.
- Elementos sobrenaturais, quando aplicável.
- Atmosfera.
- Características sensoriais.

As cartas deverão ajudar o autor a transformar os ambientes em elementos ativos da narrativa.

## ETAPA 6 — SEGREDOS E REVIRAVOLTAS

Utilize:

- CAT-07: Segredos e revelações.
- CAT-08: Reviravoltas e consequências.

Permita registrar:

- Segredo.
- Personagem que conhece a verdade.
- Personagens que desconhecem a verdade.
- Pistas.
- Momento de revelação.
- Consequências.
- Mudança na percepção do leitor.
- Preparação narrativa.

Para histórias de mistério, permita manter um registro da verdade factual da trama separado das informações disponíveis ao leitor.

Isso ajudará a evitar inconsistências na construção dos enigmas.

## ETAPA 7 — NARRADOR E PERSPECTIVA

Utilize CAT-10.

Permita escolher uma ou mais abordagens narrativas conforme as necessidades da obra.

O usuário deverá conseguir definir:

- Tipo de narrador.
- Primeira, segunda ou terceira pessoa.
- Foco narrativo.
- Nível de conhecimento.
- Confiabilidade.
- Alternância de perspectiva.
- Limites de informação.

Apresente as orientações das cartas selecionadas.

## ETAPA 8 — ESTRUTURA NARRATIVA

Utilize:

- CAT-09: Estrutura e ritmo.
- CAT-13: Estruturas e organização temporal.

O usuário deverá poder selecionar estruturas como:

- Estrutura de três atos.
- Jornada do Herói.
- Kishōtenketsu.
- Estrutura circular.
- Enredo episódico.
- Estrutura de montanha.
- In Media Res.
- Estrutura baseada em arcos de personagens.

Essas opções são exemplos das cartas existentes e não deverão ser impostas como modelos obrigatórios.

Permita combinar estruturas quando houver uma intenção narrativa coerente.

O escritor deverá conseguir:

- Criar atos.
- Reordenar atos.
- Definir objetivos dramáticos.
- Definir viradas.
- Relacionar conflitos.
- Criar linhas narrativas paralelas.
- Definir o clímax.
- Planejar a resolução.

## ETAPA 9 — TÉCNICAS NARRATIVAS

Utilize:

- CAT-14: Trama, preparação e revelação.
- CAT-15: Técnicas de narrativa e perspectiva.
- CAT-16: Estilo, linguagem e impacto.

As técnicas poderão ser vinculadas à história inteira, a um arco, capítulo ou cena.

Exemplos presentes no deck:

- Arma de Chekhov.
- Foreshadowing.
- Pista falsa.
- Setup and Payoff.
- Cliffhanger.
- Plot Twist.
- Flashback.
- Flashforward.
- Fluxo de consciência.
- Ironia dramática.
- Multiperspectiva.
- Subtexto.
- Show, Don't Tell.
- Diálogo com intenção.
- Descrição sensorial.
- Imagem simbólica.
- Epifania.

Não limite o sistema aos exemplos acima. Carregue todas as cartas disponíveis.

# 10. CONSTRUTOR DE CAPÍTULOS E CENAS

O construtor de capítulos e cenas deverá ser uma das principais ferramentas do Story Builder.

O usuário deverá poder visualizar a história como uma estrutura hierárquica ou como cartões organizáveis.

## 10.1. Atos

Cada ato deverá possuir:

- Identificador.
- Título.
- Objetivo.
- Descrição.
- Conflito.
- Personagens relacionados.
- Pontos de virada.
- Resultado esperado.

## 10.2. Capítulos

Cada capítulo deverá possuir:

- Identificador.
- Número.
- Título.
- Descrição.
- Ato relacionado.
- Objetivo narrativo.
- Personagens.
- Localizações.
- Cenas.
- Status de desenvolvimento.

## 10.3. Cenas

Cada cena deverá possuir:

- Identificador.
- Título.
- Capítulo.
- Objetivo.
- Personagem focal.
- Personagens presentes.
- Localização.
- Momento cronológico.
- Conflito.
- Obstáculo.
- Tensão.
- Mudança de estado.
- Consequência.
- Gancho.
- Cartas associadas.

Sugestão de modelo:

**Objetivo → Pressão → Conflito → Escolha → Mudança.**

A carta ST-082, "Objetivo, pressão, mudança", poderá servir como inspiração para essa organização, mas não deverá se transformar em uma regra obrigatória para todas as cenas.

Permita movimentar cenas entre capítulos e atos.

As referências deverão continuar válidas depois da reorganização.

# 11. ALERTAS E AUDITORIA NARRATIVA

Implemente um módulo de revisão utilizando as cartas do tipo `craft_warning`.

O deck apresenta:

- ST-149: Deus Ex Machina — alerta.
- ST-150: Exposition Dump — alerta.

Essas cartas deverão ser utilizadas para ajudar o escritor a identificar riscos na história.

Crie um fluxo de auditoria que permita:

1. Selecionar um elemento da narrativa.
2. Executar uma verificação assistida.
3. Identificar riscos.
4. Explicar o motivo do alerta.
5. Apontar os trechos ou decisões relacionados.
6. Sugerir alternativas.
7. Permitir que o autor ignore ou aceite a recomendação.

No futuro, amplie a análise para:

- Coerência dos personagens.
- Continuidade temporal.
- Preparação e recompensa.
- Coerência de gênero.
- Contradições do universo.
- Arcos sem resolução.
- Pontas narrativas sem fechamento.

Os alertas nunca deverão ser apresentados como erros absolutos de autoria.

# 12. STORY BIBLE

Crie automaticamente uma Story Bible editável.

Ela deverá consolidar as informações da obra.

Organize por seções:

1. Identidade da obra.
2. Contrato de gênero.
3. Premissa e sinopse.
4. Temas.
5. Personagens.
6. Relacionamentos.
7. Conflitos.
8. Mundo.
9. Narrador e perspectiva.
10. Estrutura narrativa.
11. Atos.
12. Capítulos.
13. Cenas.
14. Técnicas escolhidas.
15. Segredos e revelações.
16. Decisões criativas.
17. Cartas utilizadas.

A Story Bible deverá ser gerada em Markdown e permanecer editável.

Não transforme o documento em um relatório estático.

Ele deverá acompanhar a evolução da obra.

# 13. ASSISTENTE DE INTELIGÊNCIA ARTIFICIAL

A Inteligência Artificial deverá ser um módulo opcional.

O sistema deverá funcionar integralmente sem IA.

Implemente uma arquitetura agnóstica de provedores.

## 13.1. Provedores

Comece com uma interface compatível com endpoints OpenAI.

Permita integrar:

- LM Studio.
- Ollama através de endpoint compatível.
- Outros servidores OpenAI-compatible.

Avalie futuramente integração com a API de modelos do próprio VS Code, quando pertinente.

## 13.2. Configurações

O usuário deverá configurar:

- Provedor.
- Endpoint.
- Modelo.
- API Key.
- Temperatura.
- Limite de saída.
- Timeout.
- Contexto.
- Preferência de processamento local.

Armazene credenciais utilizando SecretStorage.

Nunca salve chaves em arquivos do projeto.

## 13.3. Contexto narrativo

A IA deverá trabalhar com contexto seletivo.

Para gerar uma premissa, utilize:

- Gêneros escolhidos.
- Subgêneros.
- Cartas de personagem.
- Cartas de motivação.
- Cartas de conflito.
- Tom e atmosfera.
- Ideias fornecidas pelo escritor.

Para planejar uma cena, utilize:

- Gênero dominante.
- Gêneros secundários.
- Subgêneros relevantes.
- Personagens envolvidos.
- Objetivos.
- Conflitos.
- Estrutura.
- Cartas associadas.
- Continuidade necessária.

Não envie automaticamente todos os 210 conteúdos nem o manuscrito completo em cada requisição.

Monte um contexto relevante para cada tarefa.

## 13.4. Uso dos campos de adaptação

A IA deverá utilizar obrigatoriamente `genre_adaptation` e `genre_relevant_axis` das cartas que estiverem sendo aplicadas.

O objetivo é impedir que a IA sugira elementos desconectados da proposta central da obra.

Exemplo:

A carta de cliffhanger deve ser interpretada considerando a promessa do gênero.

A carta de subtexto deverá ser interpretada considerando a voz e o tipo de relação construídos.

A carta de estrutura deverá considerar o efeito narrativo desejado.

## 13.5. Especializações do assistente

Crie diferentes modos de atuação, não necessariamente agentes independentes.

- Arquiteto de histórias.
- Consultor de gênero.
- Desenvolvedor de personagens.
- Especialista em conflitos.
- Consultor de world building.
- Estruturador de enredos.
- Planejador de capítulos e cenas.
- Revisor de continuidade.
- Consultor de técnicas narrativas.

Esses modos deverão utilizar prompts especializados e compartilhar a mesma Story Bible.

Não crie agentes fixos sem possibilidade de evolução.

## 13.6. Regras da IA

- O escritor é o autor.
- A IA apresenta possibilidades.
- O escritor escolhe.
- A IA explica suas sugestões.
- As sugestões devem referenciar as cartas utilizadas.
- Nenhum conteúdo deve ser inserido automaticamente no manuscrito.
- Nenhum arquivo poderá ser sobrescrito sem autorização.
- O histórico das sugestões deverá ser consultável.

Ofereça três possibilidades criativas quando a tarefa pedir geração de alternativas, salvo quando o usuário especificar outra quantidade.

# 14. INTEGRAÇÃO COM NOVEL ASSISTANT

A extensão Novel Assistant será a ferramenta preferencial de escrita.

Página oficial:

https://marketplace.visualstudio.com/items?itemName=baryo-dev.novel-assistant

Sua descrição pública apresenta:

- Editor WYSIWYG personalizado.
- Estrutura de manuscrito.
- Gerenciamento de personagens.
- Gerenciamento de localizações.
- Linha do tempo.
- Pesquisas e notas.
- Contagem de palavras.
- Histórico de alterações.
- Comparação de versões.
- Inicialização automática de Git.

Utilize os diretórios documentados:

- `Manuscript`
- `Characters`
- `Locations`
- `Timeline`
- `Research`
- `Notes`

## 14.1. Estratégia de integração

Não recrie o editor WYSIWYG do Novel Assistant.

Não recrie seu sistema de histórico.

Não recrie suas funcionalidades de contagem de palavras.

Não modifique arquivos internos da extensão.

Não dependa de APIs privadas.

A integração deverá acontecer prioritariamente através do workspace e de arquivos compartilhados.

## 14.2. Detecção da extensão

Verifique se `baryo-dev.novel-assistant` está instalada.

Caso esteja:

- Identifique a versão.
- Inspecione seus comandos públicos registrados.
- Identifique a estrutura de projeto gerada.
- Verifique quais arquivos são reconhecidos pelo editor.
- Teste a compatibilidade em um workspace temporário.

Não invente identificadores de comandos.

Para executar um comando do Novel Assistant, descubra o ID real em seu package.json ou em `contributes.commands`.

Não presuma suporte a uma API de integração que não esteja documentada.

## 14.3. Criação de projetos

Ofereça dois fluxos:

**Fluxo A — Novel Assistant instalado**

Permitir criar o projeto usando o fluxo oficial do Novel Assistant, caso seja possível identificar e executar seu comando.

Depois, o Story Deck deverá adicionar seus arquivos e funcionalidades ao workspace existente.

**Fluxo B — Novel Assistant não instalado**

Criar uma estrutura de projeto compatível com os diretórios documentados.

O Story Deck deverá funcionar independentemente.

## 14.4. Organização complementar

Adicione ao projeto uma estrutura própria:

```text
.storydeck/
├── project.json
├── deck-selection.json
├── story-state.json
├── decisions.json
└── settings.json

Story/
├── premise.md
├── story-bible.md
├── genre-contract.md
├── outline.md
└── narrative-decisions.md
```

Os arquivos originais do Novel Assistant deverão permanecer intactos.

Não sobrescreva diretórios ou arquivos existentes.

Antes de definir a estrutura definitiva dos capítulos, teste como o Novel Assistant reconhece sua organização.

## 14.5. Fluxo de escrita

Depois do planejamento, permitir:

- Abrir um capítulo no editor.
- Abrir uma cena.
- Criar um novo capítulo.
- Consultar o planejamento enquanto escreve.
- Acessar personagens e localizações.
- Consultar as cartas vinculadas à cena.

A extensão deverá direcionar o escritor para o ambiente de escrita do Novel Assistant quando os comandos e formatos necessários forem efetivamente conhecidos.

Caso contrário, utilize a abertura normal de arquivos Markdown e mantenha a compatibilidade.

# 15. INTERFACE E EXPERIÊNCIA DO USUÁRIO

Desenvolva uma interface com identidade visual própria.

A interface deve transmitir a experiência de um estúdio criativo.

## 15.1. Navegação principal

Crie uma Activity Bar chamada Story Deck.

Organize:

**Dashboard**
- Projetos.
- Progresso narrativo.
- Últimas atividades.
- Acesso rápido.

**Deck Studio**
- Catálogo.
- Categorias.
- Cartas selecionadas.
- Favoritos.
- Tiragens.

**Genre Builder**
- Gênero dominante.
- Gêneros secundários.
- Subgêneros.
- Contrato de gênero.

**Story Builder**
- Premissa.
- Story Bible.
- Personagens.
- Conflitos.
- World Building.
- Estrutura.
- Capítulos.
- Cenas.

**AI Assistant**
- Consultoria narrativa.
- Geração de ideias.
- Planejamento.
- Revisão.

## 15.2. Experiência visual

Priorize:

- Cards visuais.
- Painéis de detalhes.
- Navegação por categorias.
- Indicadores de seleção.
- Organização por etapas.
- Visualização hierárquica.
- Kanban para organização de cenas, caso agregue valor.
- Busca rápida.
- Tema claro e escuro.
- Acessibilidade.
- Navegação por teclado.

Utilize as cores originais das categorias.

A interface deverá responder às variáveis de tema do VS Code.

## 15.3. Tecnologias de interface

Utilize:

- TypeScript.
- React, quando a complexidade da interface justificar.
- Vite.
- CSS modular.
- Lucide Icons.
- Componentes reutilizáveis.

Utilize Webview para o navegador interativo de cartas, Genre Builder e experiências visuais que realmente necessitem de uma interface personalizada.

Utilize TreeView e componentes nativos do VS Code para navegação hierárquica.

Não transforme toda a extensão em uma Webview.

# 16. ARQUITETURA DE SOFTWARE

Utilize Clean Architecture, separação de responsabilidades e módulos independentes.

## Stack

Extension Host:
- TypeScript.
- VS Code Extension API.
- Node.js compatível com a versão de VS Code suportada.

Frontend:
- React.
- TypeScript.
- Vite.

Validação:
- Zod.

Testes:
- Vitest.
- @vscode/test-electron.

Build:
- esbuild ou ferramenta equivalente para o Extension Host.
- Vite para a Webview.
- vsce para empacotamento.

## Organização sugerida

```text
src/
│
├── extension/
│   ├── extension.ts
│   ├── commands/
│   ├── providers/
│   ├── views/
│   ├── integrations/
│   └── lifecycle/
│
├── domain/
│   ├── deck/
│   ├── card/
│   ├── genre/
│   ├── story/
│   ├── character/
│   ├── narrative/
│   └── shared/
│
├── application/
│   ├── use-cases/
│   ├── services/
│   ├── dto/
│   └── interfaces/
│
├── infrastructure/
│   ├── persistence/
│   ├── filesystem/
│   ├── deck/
│   ├── ai/
│   ├── integrations/
│   └── logging/
│
├── webview/
│   └── src/
│       ├── components/
│       ├── features/
│       ├── hooks/
│       ├── stores/
│       ├── services/
│       └── styles/
│
└── shared/
    ├── types/
    ├── schemas/
    └── messages/

resources/
└── decks/
    └── entrelinhas-storytelling-v4.json

tests/
├── unit/
├── integration/
└── fixtures/
```

Ajuste a estrutura de acordo com as necessidades reais, sem criar abstrações desnecessárias.

## Separação de responsabilidades

Domain:
- Entidades.
- Regras.
- Validações de domínio.
- Relações entre cartas e decisões.

Application:
- Seleção de cartas.
- Seleção de gênero.
- Construção da premissa.
- Construção da Story Bible.
- Organização da história.

Infrastructure:
- Arquivos.
- JSON.
- Markdown.
- Provedores de IA.
- Integração com extensões.

Presentation:
- Webviews.
- TreeViews.
- Comandos.
- Componentes visuais.

A camada de domínio não deverá depender da API do VS Code.

# 17. PERSISTÊNCIA E CONSISTÊNCIA DOS DADOS

Os projetos deverão funcionar localmente.

Use JSON para os dados estruturados e Markdown para documentos narrativos.

O catálogo original deverá ser incorporado como recurso de leitura da extensão.

Não altere automaticamente o deck original quando um usuário editar uma carta.

Permita futuramente a criação de decks personalizados através de cópias e extensões.

## Dados a persistir

- Projeto.
- Versão do schema.
- Versão do deck.
- Cartas escolhidas.
- Gênero dominante.
- Gêneros secundários.
- Subgêneros selecionados.
- Tiragens realizadas.
- Decisões narrativas.
- Story Bible.
- Personagens.
- Atos.
- Capítulos.
- Cenas.
- Relacionamentos.
- Status de desenvolvimento.

## Regras

- Salvamento automático com proteção contra gravações concorrentes.
- Tratamento de alterações externas.
- Recuperação de estado.
- Migração de versões.
- Validação antes de persistir.
- Identificadores estáveis.
- Preservação de referências.
- Histórico de operações importantes.

Se o usuário editar os arquivos diretamente, não descarte suas alterações.

# 18. SEGURANÇA E QUALIDADE

Na implementação:

- Use Content Security Policy nas Webviews.
- Restrinja os recursos carregados.
- Valide mensagens entre Webview e Extension Host.
- Não exponha credenciais ao frontend desnecessariamente.
- Não execute comandos arbitrários vindos da Webview.
- Não sobrescreva conteúdo sem autorização.
- Armazene segredos no SecretStorage.
- Evite dependências desnecessárias.
- Trate erros de leitura, escrita e comunicação.
- Implemente logs sem conteúdo privado do manuscrito.

# 19. TESTES OBRIGATÓRIOS DO DECK

Antes de construir as interfaces, crie testes que garantam a integridade do ENTRELINHAS v4.

Validações iniciais esperadas:

- 210 cartas.
- 17 categorias.
- 32 cartas `genre_definition`.
- 89 cartas `creative_prompt`.
- 34 cartas `technique`.
- 26 cartas `archetype`.
- 15 cartas `structure`.
- 12 cartas `narrator`.
- 2 cartas `craft_warning`.

Verifique também:

- IDs únicos.
- Categorias válidas.
- Referências entre cartas e categorias.
- Integridade de `compatible_genres`.
- Correspondência entre `sub_genre` e `sub_genre_details`.
- Integridade de `source_card_id`.
- Preservação de `genre_adaptation`.
- Preservação de `genre_relevant_axis`.
- Integridade dos metadados de consolidação.
- Presença dos princípios editoriais.
- Integridade de `usage`.
- Integridade do `editorial_audit`.

Os valores acima são as expectativas específicas da versão 4.0.0.

Para versões futuras, implemente validação baseada em schema e metadados da versão, evitando criar uma aplicação que só aceite exatamente 210 cartas para sempre.

# 20. ROADMAP DE IMPLEMENTAÇÃO

Desenvolva o produto em etapas.

## FASE 1 — DISCOVERY E ARQUITETURA

- Inspecionar o repositório.
- Ler integralmente o deck.
- Documentar o modelo de dados.
- Identificar dependências.
- Investigar Novel Assistant.
- Definir a arquitetura.
- Criar plano técnico.

Entregáveis:
- ARCHITECTURE.md
- PRODUCT_SPEC.md
- DATA_MODEL.md
- DECK_SCHEMA.md
- INTEGRATION.md
- IMPLEMENTATION_PLAN.md

## FASE 2 — FUNDAÇÃO

- Configurar extensão.
- Configurar TypeScript.
- Configurar Webview.
- Registrar comandos.
- Criar navegação.
- Implementar persistência.
- Criar testes.

Resultado: extensão funcional no Extension Development Host.

## FASE 3 — DECK ENGINE

- Importar o ENTRELINHAS v4.
- Validar o catálogo.
- Implementar as 17 categorias.
- Implementar os sete tipos de cartas.
- Implementar subgêneros.
- Implementar filtros.
- Implementar busca.
- Implementar seleção.
- Implementar favoritos.
- Implementar sorteios.
- Implementar persistência.

Resultado: usuário consegue explorar e selecionar as 210 cartas.

## FASE 4 — GENRE BUILDER

- Gênero dominante.
- Gêneros secundários.
- Subgêneros.
- Compatibilidade consultiva.
- Contrato de gênero.
- Dimensões complementares.
- Identidade narrativa.

Resultado: usuário consegue definir a promessa e a identidade de sua obra.

## FASE 5 — STORY BUILDER

- Premissa.
- Logline.
- Sinopse.
- Story Bible.
- Personagens.
- Conflitos.
- Mundo.
- Narradores.
- Estruturas.
- Atos.
- Capítulos.
- Cenas.
- Técnicas narrativas.

Resultado: cartas transformadas em estrutura narrativa editável.

## FASE 6 — NOVEL ASSISTANT

- Detecção da extensão.
- Compatibilidade de diretórios.
- Criação de arquivos.
- Identificação dos comandos públicos.
- Abertura do manuscrito.
- Testes em workspace compartilhado.
- Preservação da estrutura existente.

Resultado: integração funcional sem modificar a extensão de terceiros.

## FASE 7 — INTELIGÊNCIA ARTIFICIAL

- Interface de provedores.
- LM Studio.
- Ollama.
- Configurações.
- Gestão de contexto.
- Prompts especializados.
- Geração de premissas.
- Construção assistida.
- Análise de coerência.
- Revisão narrativa.

Resultado: assistente inteligente baseado nas cartas e na Story Bible.

## FASE 8 — FINALIZAÇÃO

- Testes unitários.
- Testes de integração.
- Testes de regressão.
- Testes de coexistência.
- Melhorias visuais.
- Acessibilidade.
- Documentação.
- Empacotamento VSIX.
- Validação em instalação limpa.

Resultado: extensão pronta para distribuição.

# 21. CRITÉRIOS DE ACEITAÇÃO DO MVP

O MVP será considerado funcional quando:

1. A extensão instalar corretamente no VS Code.
2. O ENTRELINHAS v4 for carregado integralmente.
3. As 17 categorias estiverem disponíveis.
4. As cartas puderem ser visualizadas e pesquisadas.
5. As cartas puderem ser selecionadas e desmarcadas.
6. Os sorteios funcionarem.
7. As escolhas forem persistidas.
8. As regras de gênero forem respeitadas.
9. Os subgêneros puderem ser escolhidos e consultados.
10. As quatro tiragens originais estiverem disponíveis.
11. O escritor conseguir construir uma premissa.
12. O escritor conseguir criar uma Story Bible.
13. Personagens, conflitos e estruturas puderem ser organizados.
14. Atos, capítulos e cenas puderem ser criados.
15. Os arquivos Markdown forem gerados corretamente.
16. O projeto puder coexistir com Novel Assistant.
17. Nenhum conteúdo existente for sobrescrito.
18. A extensão funcionar sem IA.
19. A persistência e as regras críticas estiverem cobertas por testes.

# 22. DIRETRIZES PARA O AGENTE DE DESENVOLVIMENTO

Não implemente tudo em uma única operação.

Trabalhe por fases.

Antes de cada fase:

- Leia a documentação existente.
- Verifique o que já foi implementado.
- Identifique as dependências.
- Defina os critérios de conclusão.

Durante cada fase:

- Implemente funcionalidades reais.
- Escreva testes.
- Execute testes.
- Corrija os erros.
- Atualize a documentação.
- Mantenha o build funcional.

Ao finalizar cada fase:

- Apresente as funcionalidades concluídas.
- Informe os arquivos criados ou modificados.
- Apresente o resultado dos testes.
- Identifique limitações restantes.
- Atualize o plano de implementação.

Não considere uma funcionalidade pronta só porque sua interface foi criada.

Ela precisa estar conectada à lógica, aos dados e à persistência.

Não utilize mock data para simular o funcionamento do deck real.

Dados fictícios só poderão existir em fixtures de testes.

Não invente comportamentos do Novel Assistant.

Quando houver alguma incerteza, investigue o recurso real antes de implementar a integração.

# 23. PRIMEIRA EXECUÇÃO — DISCOVERY

Na primeira execução deste master prompt, não implemente toda a aplicação imediatamente.

Realize exclusivamente a fase de descoberta e arquitetura.

Entregue:

1. Diagnóstico completo do repositório.
2. Análise integral do `deck_storytelling.json`.
3. Documentação do schema.
4. Mapa das 210 cartas.
5. Mapa das 17 categorias.
6. Análise das regras de gênero e subgênero.
7. Análise das tiragens recomendadas.
8. Diagnóstico da integração com Novel Assistant.
9. Arquitetura técnica.
10. Modelo de domínio.
11. Estrutura de diretórios.
12. Roadmap de desenvolvimento.
13. Critérios de testes.

Registre os resultados nos documentos especificados.

A arquitetura deverá ser clara e suficientemente detalhada para que a implementação possa começar sem decisões fundamentais pendentes.

---

# VISÃO FINAL DO PRODUTO

O Story Deck deverá ser uma ferramenta de criação literária que transforme o ENTRELINHAS em uma experiência interativa de construção de histórias.

O deck não deve ser apenas consultado.

Ele deve participar de todo o processo criativo.

Cada escolha deverá ajudar o escritor a responder a perguntas como:

- Que história estou contando?
- Que experiência desejo oferecer ao leitor?
- Quem conduz essa história?
- O que essas pessoas desejam?
- O que impede que consigam?
- Que mundo torna esse conflito possível?
- Como os acontecimentos se conectam?
- Que estrutura melhor expressa essa história?
- Como transformar tudo isso em capítulos e cenas?

A aplicação deverá conduzir o escritor por esse processo sem retirar sua liberdade criativa.

**O resultado esperado é uma conexão direta entre o deck ENTRELINHAS e a produção de um manuscrito real dentro do Visual Studio Code, utilizando o Novel Assistant como ambiente preferencial de escrita.**

O produto deverá ser modular, extensível, local-first, confiável e preparado para evoluir com novos decks e recursos de Inteligência Artificial.