# PATRI — Especificação de Design e UX

Documento normativo. Define a identidade visual, os componentes e o comportamento
de interface do PATRI.

> **Atualização v3 — direção Editorial.** A seção 17, no fim deste arquivo,
> substitui toda a parte visual do texto original (tema escuro, azul, "menos
> animação"). A seção 16 continua valendo para as regras de produto.

Os valores concretos (cor, espaçamento, raio, duração, tipografia) vivem em
`src/styles/tokens.css`. Este documento explica **quando e como** usá-los.
Quando os dois divergirem, o token vence — e este documento deve ser corrigido.

---

## 1. O produto

**PATRI** é o sistema interno de localização e controle de equipamentos patrimoniais.

A interface existe para responder duas perguntas, nessa ordem:

1. **Onde está este equipamento?**
2. Se não está no lugar dele: **com quem está e quando volta?**

Tudo que não ajuda a responder essas perguntas mais rápido é candidato a ser cortado.

**Usuário:** servidor ou terceirizado que precisa achar um equipamento agora,
frequentemente no celular, em pé, dentro da sala de equipamentos.

**Sucesso:** a pessoa digita, encontra e sabe onde ir sem abrir mais nada.

---

## 2. Princípios

1. **Menos elementos, melhor hierarquia.** Espaço vazio é ferramenta, não desperdício.
2. **Cada elemento justifica sua existência.** Nenhum card, gráfico, cor ou animação
   entra na tela por preencher espaço ou por "interface moderna tem isso".
3. **O equipamento é uma entidade real.** Foto, nome, PR, localização, situação.
   O nome vem antes do número.
4. **Velocidade é estética.** Se a animação faz esperar, ela está errada.
5. **Em conflito:** usabilidade > estética · clareza > quantidade de informação ·
   velocidade > animação · acessibilidade > efeito visual.

---

## 3. Personalidade

Sofisticado, tecnológico, institucional, confiável, organizado.

Não é: gamer, cyberpunk, neon, futurista, nem burocrático/ERP antigo.

A sensação alvo é *"um produto interno premium, cuidadosamente projetado"* — algo
que parece feito por um time de produto, não por um setor de TI sob prazo.

---

## 4. Cor

### 4.1 Tema

Dark premium. Não existe tema claro no MVP. A base é grafite (`--color-bg`,
`#0B0D10`), nunca preto absoluto.

### 4.2 Profundidade

A profundidade vem da diferença entre superfícies, não de sombra:

| Token | Uso |
| --- | --- |
| `--color-bg` | Fundo da aplicação |
| `--color-bg-sunken` | Sidebar, cabeçalho de tabela, áreas recuadas |
| `--color-surface` | Cards, painéis, linhas de lista |
| `--color-surface-elevated` | Hover de card, popover, conteúdo de modal |
| `--color-surface-raised` | Item selecionado, chip ativo, linha em foco |
| `--color-surface-field` | Fundo de input, select, textarea |

Regra: no máximo **dois saltos de superfície visíveis** ao mesmo tempo em uma
região. Card dentro de card dentro de card é proibido — use divisor e espaçamento.

### 4.3 Azul de identidade

`--color-accent` (`#5B8DEF`) significa **interação**. Aparece em:

ação primária · link · foco de campo · item ativo da navegação · seleção ·
indicador de aba ativa · ícone da marca.

Não aparece em: status, decoração, fundo de seção, ilustração, gráfico, borda
de card comum, título.

Se mais de ~5% da tela está azul, algo está errado.

**Contraste:** botão primário usa preenchimento azul com texto escuro
(`--color-on-accent`), não texto branco. Branco sobre `#5B8DEF` dá 2.9:1 e
reprova em AA. Escuro sobre azul dá 6.0:1. Não "corrigir" isso para branco.

### 4.4 Status

Duas camadas diferentes, que não devem ser confundidas: **situação** é um campo
armazenado; **condição** é derivada em tempo de leitura. Os rótulos são
específicos — "Indisponível" não existe na interface, porque não informa nada.

**Situação** — uma só por item, exclusiva, gravada no cadastro:

| Rótulo | Tratamento | Token |
| --- | --- | --- |
| Disponível | verde | `--color-success` |
| Fora da sala | neutro | `--color-neutral` |
| Em manutenção | vermelho | `--color-danger` |
| Baixado | neutro esmaecido | `--color-text-tertiary` |

**Condição** — derivada, pode acumular sobre a situação. Nunca é gravada:

| Rótulo | Tratamento | Quando |
| --- | --- | --- |
| Retorno próximo | âmbar | Fora da sala e prazo em ≤48h |
| Atrasado | vermelho | Fora da sala e prazo vencido |
| Atenção | âmbar | Estado físico Ruim/Danificado, ou divergência no último inventário |
| Não importado | neutro | PR cadastrado à mão, sem correspondência na base oficial |

**Por que separar:** "Atrasado" e "Atenção" não são situações — se virarem campo
no banco, alguém precisa lembrar de atualizar, e a interface passa a mentir. São
consequências de dados que já existem (prazo de retorno, estado físico, origem do
cadastro) e devem ser calculadas na leitura.

**Como exibir:**

- Card e linha de lista: badge da situação + **no máximo uma** condição, a mais
  severa (Atrasado > Retorno próximo > Atenção > Não importado).
- Ficha: situação em destaque, todas as condições aplicáveis logo abaixo.
- "Fora da sala" é neutro, não vermelho. Estar fora é operação normal; o vermelho
  precisa continuar significando "exige ação". A urgência vem do prazo.
- Status é sempre **ponto + rótulo em texto**. Nunca só o ponto, nunca só a cor.
- Áreas grandes preenchidas de verde/âmbar/vermelho não existem no PATRI: use
  ponto (8px, `--radius-full`), badge com `--color-*-bg` e `--color-*-border`,
  ou texto colorido.

**Filtros** (§10.2) espelham esse conjunto: Todos · Disponíveis · Fora da sala ·
Em manutenção · Atrasados · Atenção.

---

## 5. Tipografia

**Família única: IBM Plex Sans.** Escolhida por combinar as três palavras do
briefing — técnica na origem, institucional no peso, e com letterforms
suficientemente próprias para não parecer o sans padrão de qualquer produto.
Numerais tabulares nativos, o que importa aqui: o PR é dado central e aparece
em coluna o tempo todo.

Pesos permitidos: **400, 500, 600**. Nenhum outro.

### 5.1 Papéis

| Papel | Tamanho | Peso | Observação |
| --- | --- | --- | --- |
| Display (Home) | `--font-size-display` | 600 | `--letter-spacing-tight` |
| Nome na ficha | `--font-size-3xl` | 600 | `--letter-spacing-tight` |
| Título de página | `--font-size-2xl` | 600 | |
| Título de seção | `--font-size-xl` | 600 | |
| Nome em card/linha | `--font-size-lg` | 500 | máx. 2 linhas, com ellipsis |
| Corpo, input, botão | `--font-size-base` | 400/500 | |
| PR, dado secundário | `--font-size-sm` | 400 | tabular |
| Label, timestamp | `--font-size-caption` | 500 | `--color-text-tertiary` |
| Contador, unidade | `--font-size-micro` | 500 | tabular |

### 5.2 Regras

- Caixa alta apenas em badge de status na ficha e em cabeçalho de tabela, com
  `--letter-spacing-wide`. Em nenhum outro lugar.
- Não destacar uma única palavra do título com cor ou itálico.
- Não colocar rótulo tipográfico acima de conteúdo que já se explica.
- Linha de texto corrido: máximo `--max-line-length` (72ch).
- Todo número identificador ou comparável recebe `.tabular`.

### 5.3 Nome vs. PR

Correto:

```
Canon EOS R
PR 7210899
```

Errado:

```
7210899
Canon EOS R
```

O usuário pensa no equipamento antes de pensar no número. O PR é sempre
prefixado por `PR ` e sempre visualmente secundário — mas nunca escondido,
porque é o dado de conferência.

---

## 6. Forma, borda e elevação

**Raio** é hierarquia: componente maior, raio maior. Não aplicar o mesmo raio em
tudo — isso é o que faz uma interface parecer "coleção de caixas arredondadas".

`--radius-xs` checkbox · `--radius-sm` badge · `--radius-md` botão, input, linha ·
`--radius-lg` card, bloco · `--radius-xl` busca principal, modal ·
`--radius-full` ponto, avatar, pill.

**Borda** usa `--color-border`, próxima à superfície. Sempre 1px. Nunca brilhante,
nunca com gradiente. `--color-border-strong` só em hover de campo.

**Sombra** só onde algo flutua sobre o conteúdo: popover (`--shadow-md`), modal
(`--shadow-lg`), bottom sheet (`--shadow-sheet`), toast (`--shadow-md`).
Card não tem sombra. Card elevado muda de superfície.

**Glow** (`--color-accent-glow`, `--shadow-focus-soft`) é permitido em: anel de
foco do campo de busca principal e confirmação de ação importante. Mais nada.

---

## 7. Movimento

Toda animação responde a uma ação do usuário. Não existe animação de entrada de
seção, parallax, partícula, fundo animado, efeito 3D ou reveal ao rolar.

| Interação | Duração | Easing |
| --- | --- | --- |
| Cor de hover em texto/ícone | `--duration-instant` | `--ease-standard` |
| Hover/foco de botão, card, linha | `--duration-fast` | `--ease-standard` |
| Favoritar, toast, grid↔lista | `--duration-base` | `--ease-out` |
| Modal, bottom sheet, filtros | `--duration-slow` | `--ease-out` |

Animar apenas `opacity`, `transform`, `background-color`, `border-color`,
`box-shadow`. Nunca `width`, `height`, `top`, `left`.

`prefers-reduced-motion` já é tratado em `tokens.css` — não reimplementar.

---

## 8. Layout e navegação

### 8.1 Desktop (≥768px)

Sidebar fixa à esquerda, `--sidebar-width` (240px), fundo `--color-bg-sunken`.
Colapsável para `--sidebar-width-collapsed` (só ícones, com tooltip).

```
┌──────────┬────────────────────────────────────────────┐
│  PATRI   │                                            │
│          │   Título da página          [ações]        │
│  Equipa… │                                            │
│  Favori… │   ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │
│  Fora d… │   │ card │ │ card │ │ card │ │ card │      │
│  Histór… │   └──────┘ └──────┘ └──────┘ └──────┘      │
│  Lixeira │                                            │
│          │                                            │
│  ──────  │                                            │
│  Config… │                                            │
│  Usuário │                                            │
└──────────┴────────────────────────────────────────────┘
```

Ordem: Equipamentos · Favoritos · Fora da sala · Locais · Histórico · Lixeira ·
(divisor) · Configurações · Usuário (rodapé).

**Locais** entrou na navegação porque §10.7 exige que a hierarquia física seja
navegável, e o único caminho até ela seria a partir de uma ficha — o que obriga
o usuário a achar um equipamento antes de poder olhar um armário.

Item da sidebar: altura 40px, `--radius-md`, ícone `--icon-md` + rótulo
`--font-size-base`, gap `--gap-inline`, padding lateral `--space-3`.
Hover: `--color-surface`. **Ativo:** fundo `--color-accent-bg`, texto e ícone
`--color-accent-text`, e uma barra de 2px em `--color-accent` na borda esquerda.

Sem submenu no MVP. Não há header fixo: o título da página vive no fluxo do
conteúdo, com `--container-max` e `--container-pad`.

### 8.2 Mobile (<768px)

Não é o desktop encolhido. Navegação inferior fixa, `--bottom-nav-height`,
respeitando `env(safe-area-inset-bottom)`:

**Equipamentos · Favoritos · Fora da sala · Mais**

Ícone `--icon-lg` + rótulo `--font-size-micro`. Ativo em `--color-accent-text`.
"Mais" abre bottom sheet com Histórico, Lixeira, Configurações, Usuário.

A busca é acessível de qualquer tela: campo fixo no topo da lista de
equipamentos, e a Home abre com o campo já em destaque.

### 8.3 Grade de resultados

| Largura | Colunas |
| --- | --- |
| ≥1536px | 4 |
| ≥1280px | 4 |
| ≥1024px | 3 |
| ≥768px | 2 |
| <768px | 1 (card horizontal) |

Gap `--gap-grid`. Abaixo de 768px o card muda de forma, não só de tamanho — vira
horizontal, com miniatura `--photo-thumb` à esquerda. Duas colunas de card
vertical no celular tornam o nome e a localização ilegíveis.

### 8.4 Formulários

Duas colunas em ≥1024px, uma coluna abaixo. Largura máxima
`--container-narrow`. Ações fixas no rodapé do formulário em mobile.

---

## 9. Componentes

### 9.1 Botão

Altura `--control-height-md` (40px), `--radius-md`, padding lateral `--space-4`,
peso 500, gap `--gap-inline` para ícone.

| Variante | Fundo | Texto | Uso |
| --- | --- | --- | --- |
| Primário | `--color-accent` | `--color-on-accent` | Uma por tela, no máximo |
| Secundário | `--color-surface-raised` | `--color-text` | Ação de apoio |
| Ghost | transparente | `--color-text-secondary` | Ação terciária, ícone |
| Perigo | `--color-danger-solid` | `--color-on-danger` | Só destrutivo confirmado |

Estados obrigatórios em todas as variantes: `hover`, `active`, `focus-visible`,
`disabled` (`--color-text-disabled`, sem cursor pointer), `loading` (spinner
`--icon-sm` substituindo o ícone, rótulo mantido, botão não clicável).

Tamanhos: `--control-height-sm` para compactos, `--control-height-lg` para a ação
principal da ficha e para qualquer botão primário em mobile.

Não criar variantes além destas quatro.

### 9.2 Campo

Fundo `--color-surface-field`, borda `--color-border`, `--radius-md`, altura
`--control-height-md`, padding lateral `--space-3`.

- **Label persistente** acima do campo, `--font-size-caption`,
  `--color-text-tertiary`, gap `--gap-field`. Nunca só placeholder.
- Placeholder complementa, não explica: `--color-text-tertiary`.
- Hover: borda `--color-border-strong`.
- Foco: borda `--color-accent` + `--shadow-focus-soft`.
- Erro: borda `--color-danger` + mensagem abaixo em `--color-danger`,
  `--font-size-caption`, com o que fazer ("Informe o PR com 7 dígitos"),
  não o que aconteceu ("Campo inválido").
- Campo obrigatório: marcar os **opcionais**, não os obrigatórios, quando a
  maioria for obrigatória.

### 9.3 Badge de status

Altura 22px, `--radius-sm`, padding `0 --space-2`, `--font-size-caption`, peso 500.
Ponto de 6px `--radius-full` + rótulo. Fundo `--color-*-bg`, borda
`--color-*-border`, texto `--color-*`.

Na ficha, a versão grande: altura 28px, `--font-size-sm`, caixa alta com
`--letter-spacing-wide`.

### 9.4 Card de equipamento

`--color-surface`, borda `--color-border`, `--radius-lg`, sem sombra.
Hover: fundo `--color-surface-elevated` e borda `--color-border-strong`,
`--duration-fast`. Sem escala, sem levitação.

```
┌────────────────────────────┐
│                            │
│          FOTO 4:3          │
│                            │
├────────────────────────────┤
│ Canon EOS R             ★  │
│ PR 7210899                 │
│ ⌖ Armário A · Prateleira 03│
│ ● Disponível               │
└────────────────────────────┘
```

- Foto: `--photo-aspect-card`, `object-fit: cover`, fundo `--color-surface-photo`.
  Sem foto: ícone da categoria em `--color-text-tertiary`, centralizado. Nunca
  deformar a imagem.
- Conteúdo: padding `--space-4`, gap vertical `--space-1-5`.
- Nome: `--font-size-lg`, peso 500, `--color-text`, 2 linhas máx.
- PR: `--font-size-sm`, `--color-text-secondary`, tabular.
- Localização: `--font-size-sm`, `--color-text-secondary`, ícone `--icon-xs`.
- Estrela: alvo de 32px na linha do nome, alinhada à direita.

Card horizontal (mobile): miniatura `--photo-thumb` quadrada à esquerda com
`--radius-md`, conteúdo à direita, mesma ordem de informação.

### 9.5 Linha de lista

Altura 56px, `--radius-md`, hover `--color-surface`. Colunas:

`PR | Equipamento | Marca/Modelo | Localização | Situação`

PR tabular. Nome em `--color-text`, o resto em `--color-text-secondary`.
Divisor `--color-border-subtle` de 1px entre linhas, não borda completa.

### 9.6 Alternância grid/lista

Dois ícones-botão agrupados, `--control-height-sm`, `--radius-md`, fundo
`--color-surface`. Ativo: `--color-surface-raised` + ícone `--color-accent-text`.
Grid é o padrão. A escolha persiste por usuário.

### 9.7 Chip de filtro

Altura `--control-height-sm`, `--radius-full`, borda `--color-border`,
`--font-size-sm`. Ativo: fundo `--color-accent-bg`, borda `--color-accent-border`,
texto `--color-accent-text`. Contador opcional em `--font-size-micro`.

### 9.8 Toast

Canto inferior direito (desktop) / topo (mobile), `--color-surface-elevated`,
borda `--color-border`, `--radius-lg`, `--shadow-md`, largura máx. 380px.
Ícone de resultado + texto. Some em 4s. Entrada: fade + `translateY(8px)`,
`--duration-base`, `--ease-out`.

Nunca usar modal para confirmar sucesso.

### 9.9 Modal e bottom sheet

Modal (desktop): largura máx. 520px, `--radius-xl`, `--color-surface-elevated`,
`--shadow-lg`, backdrop `--color-surface-overlay`. Fecha com Esc, clique fora e
botão. Foco fica preso dentro dele.

Bottom sheet (mobile): `--radius-2xl` no topo, `--shadow-sheet`, arrastável para
fechar, altura conforme conteúdo até 85vh. Substitui o modal abaixo de 768px.

### 9.10 Timeline

Linha vertical de 1px `--color-border` à esquerda, marcador de 8px
`--radius-full` por evento. Data em `--font-size-caption` `--color-text-tertiary`,
descrição em `--font-size-sm` `--color-text`. Sem numeração — histórico é
cronologia, não sequência de passos.

### 9.11 Empty state

Ícone `--icon-xl` em `--color-text-tertiary`, título `--font-size-lg` peso 500,
uma linha de apoio em `--color-text-secondary`, e uma ação quando existir uma
ação óbvia. Padding vertical `--space-16`. Sem ilustração grande.

### 9.12 Skeleton

Blocos em `--color-surface-skeleton` com `--radius-xs`, shimmer sutil de 1.2s.
O skeleton reproduz a estrutura real da tela — grid de cards vira grid de
skeletons de card. Spinner só dentro de botão em `loading`.

---

## 10. Telas

### 10.1 Home

A Home **não é dashboard**. Sem gráfico de pizza, de barra, de linha. Sem parede
de indicadores.

Hierarquia, de cima para baixo:

1. **"Encontre um equipamento"** — `--font-size-display`, alinhado à esquerda
   dentro de `--container-max`, com `--space-16` de respiro acima.
2. **Campo de busca** — altura `--control-height-search`, largura máx.
   `--container-narrow`, `--radius-xl`, ícone de lupa `--icon-lg` à esquerda.
   Placeholder: *"Busque por PR, produto, marca ou modelo…"*
   Foco automático em desktop. Foco visual com `--shadow-focus-soft`.
3. **Atalhos** — Favoritos · Recentes · Locais. Componentes compactos em linha,
   `--control-height-sm`, `--radius-full`, texto + ícone. Não são cards coloridos.
4. **Indicadores** — uma linha de texto, discreta:
   `432 disponíveis · 18 fora da sala · 12 em manutenção`.
   Número em `--color-text` tabular, rótulo em `--color-text-secondary`,
   `--font-size-sm`. Cada um é um link para a lista filtrada.
5. **Acessados recentemente** — até 6 itens, lista compacta.
6. **Alertas**, apenas se houver algo atrasado ou vencendo.

Se não houver alerta, a seção não aparece. Espaço vazio é aceitável na Home.

### 10.2 Busca e resultados

A busca é o componente mais importante do produto e precisa **parecer** rápida.

- Resultados com debounce de 150ms, sem tela de carregamento cheia — skeleton
  apenas na área de resultados, mantendo o campo estável.
- Busca tolerante: `vostro`, `dell`, `notebook` e `5470` encontram
  `MICROCOMPUTADOR NOTEBOOK - DELL VOSTRO 5470`. Insensível a acento e caixa.
  Termo parcial e fora de ordem funcionam.
- PR exato: o item vai para o topo, destacado com borda `--color-accent-border`.
- Trecho correspondente destacado com `--color-accent-bg` no texto do resultado.
- Contagem acima da grade: `24 resultados`, `--font-size-sm`,
  `--color-text-secondary`.
- Sem resultado: empty state com o termo buscado e sugestão de remover filtros.

Filtros: chips horizontais no desktop (Todos · Disponíveis · Fora da sala ·
Em manutenção · Atrasados · Atenção), bottom sheet no mobile com botões "Limpar"
e "Aplicar". Filtros secundários — tipo, marca, localização, estado físico —
ficam atrás de "Mais filtros" nos dois casos.

### 10.3 Ficha do equipamento

A tela onde a pergunta é respondida. Ordem:

```
┌───────────────┬────────────────────────────────┐
│               │  Canon EOS R                 ★ │
│     FOTO      │  PR 7210899                    │
│     3:2       │  ● DISPONÍVEL                  │
│               │                                │
│               │  [ Mover item ]  [ Editar ]    │
└───────────────┴────────────────────────────────┘

  Localização
  Sala de Equipamentos → Armário A → Prateleira 03
  Ver equipamentos neste local →

  Estado físico          Situação            Responsável
  Bom                    Disponível          Nenhum

  Última movimentação
  Hoje · 14:32 — João moveu de Armário B para Armário A

  Informações
  Material · Marca · Modelo · Nº de série · Fabricante · …

  Histórico completo
  [timeline]
```

- **Localização** é a informação de maior destaque depois do nome. Renderizada
  como trilha hierárquica com separador em `--color-text-tertiary`, cada nível
  clicável, não como linha de tabela. O último nível em `--color-text`, os
  anteriores em `--color-text-secondary`.
- **Estado físico e situação são campos diferentes** e aparecem lado a lado,
  nunca fundidos. Estado físico descreve conservação; situação descreve
  disponibilidade.
- **Responsável** sem valor mostra "Nenhum" em `--color-text-tertiary`, discreto.
- **Informações patrimoniais** têm menos destaque que nome, localização, status e
  responsável. Grade de dois pares label/valor por linha em desktop.
- **Ação principal muda com o contexto:** "Mover item" quando está na sala,
  "Devolver item" quando está fora. Uma só ação primária, `--control-height-lg`.

Mobile: foto em largura total no topo (`--photo-aspect-detail`), nome e status
abaixo, ação principal fixa no rodapé.

### 10.4 Movimentação

Não é formulário burocrático. É uma sequência de perguntas curtas.

1. **Para onde este equipamento está indo?** — Sala → Armário → Prateleira,
   seleção encadeada.
2. **Quem está responsável?** — busca de pessoa, ou "Ninguém" quando é só
   mudança de lugar.
3. **Quando deve retornar?** — opcional; só aparece se sair da sala.
4. **Resumo antes de confirmar.**

```
  Item          Canon EOS R
  Origem        Armário A · Prateleira 03
  Destino       Armário B · Prateleira 02
  Responsável   Carlos Silva
  Retorno       05/09/2026

  [ Cancelar ]              [ Confirmar movimentação ]
```

Nada de importante fica escondido atrás de "ver detalhes". Após confirmar:
toast `✓ Equipamento movido` e volta para a ficha já atualizada.

Rótulo do botão e do toast usam o mesmo verbo — "Mover" produz "movido".

### 10.5 Fora da sala

Lista dos itens que saíram. Não é um dashboard separado.

Cada item mostra: equipamento · responsável · destino · saída · retorno previsto ·
situação do prazo (neutro / âmbar se ≤48h / vermelho se atrasado).

Ordenação padrão: mais atrasado primeiro. Ação inline: "Devolver".

### 10.6 Favoritos e Recentes

**Favoritos:** grade padrão, filtrada. Estrela alterna com animação de
`--duration-base` — preenchimento e um leve `scale(1.15)` que volta. Nada além.
Vazio: ícone de estrela, *"Nenhum favorito ainda"*, *"Marque equipamentos
importantes para acessá-los rapidamente."*, botão "Explorar equipamentos".

**Recentes:** lista compacta dos últimos consultados por aquele usuário. Ocupa
pouco espaço. Não precisa de página própria — vive na Home e no atalho.

### 10.7 Localizações e inventário

Cada nível (Sala, Armário, Prateleira) é navegável e entendível sozinho. A ação
**"Ver equipamentos neste local"** aparece em qualquer lugar onde uma
localização é exibida — é isso que transforma a hierarquia em navegação real.

**Modo inventário** (preparado, simples): lista os itens esperados no local, com
marcação manual.

```
Armário A · 12 itens esperados          7 conferidos

✓ 7210899   Canon EOS R
✓ 7210900   Tripé Manfrotto
⚠ 7210901   Microfone Rode          não encontrado
```

Sem leitura automática, sem QR Code — **QR Code não faz parte do produto.**

### 10.8 Histórico

Timeline cronológica, do mais recente para o mais antigo. Agrupada por dia com
cabeçalho fino (`Hoje`, `Ontem`, `28 de agosto`). Cada evento: hora, quem,
o que aconteceu, origem → destino quando aplicável.

### 10.9 Cadastro

Blocos com título de seção e divisor, não cards aninhados:

**Identificação** (PR, material, marca, modelo, nº de série) ·
**Estado** (estado físico, situação) ·
**Localização** (sala, armário, prateleira) ·
**Foto** (uma principal: adicionar, substituir, remover — §14.2) ·
**Observações** (campo livre).

Ao digitar um PR que não existe na base oficial, o campo não dá erro: mostra uma
nota inline em `--color-text-secondary` avisando que o item será marcado como
**Não importado** (§14.3). O cadastro segue normalmente.

Botão: **Salvar item**. Toast: `✓ Item salvo`.

### 10.10 Lixeira

Não é uma área perigosa — é onde se recupera algo. Tom neutro, sem vermelho na
moldura da página.

Mostra: item · data de exclusão · quem excluiu. Para administrador:
**Restaurar** (secundário) e **Excluir definitivamente** (perigo, com
confirmação em modal que nomeia o item).

Usuário comum vê a lixeira e o que está nela, mas sem as ações — com uma linha
explicando que restauração e exclusão definitiva são do administrador.

Toast ao excluir: `✓ Item enviado para a lixeira`, com ação "Desfazer" por 8s.

### 10.11 Alertas

Duas categorias apenas: **retorno próximo** (âmbar) e **retorno atrasado**
(vermelho). Aparecem na Home só quando existem, e na página Fora da sala.
Sem central de notificações, sem badge de contagem em tudo.

---

## 11. Voz da interface

Objetiva, direta, humana. Sem burocratês.

| Escrever | Não escrever |
| --- | --- |
| Mover item | Cadastrar movimentação patrimonial |
| Onde está? | Localização atual do ativo patrimonial |
| Quem está com o item? | Detentor atual |
| Salvar item | Submeter |
| Não foi possível carregar este equipamento. | Error 500 |

Regras:

- Frase em caixa normal, sem ponto final em rótulo de botão.
- Verbo no infinitivo em ação, particípio no resultado: "Mover" → "movido".
- Erro diz o que houve e o que fazer, e oferece a ação ("Tentar novamente").
  Erro não pede desculpas e não mostra código técnico.
- Empty state é convite para agir, não recado de sistema vazio.

---

## 12. Acessibilidade

Piso obrigatório, não item de melhoria:

- Contraste mínimo 4.5:1 para texto normal, 3:1 para texto grande e para
  fronteiras de componentes interativos.
- Cor nunca é o único portador de significado — status sempre tem rótulo.
- Foco de teclado sempre visível (`:focus-visible` já definido em `tokens.css`;
  nunca sobrescrever com `outline: none` sem substituto equivalente).
- Alvo tocável mínimo `--touch-target-min` (44px) em qualquer breakpoint.
- Toda imagem de equipamento tem `alt` com nome e PR.
- Modal e sheet prendem o foco e devolvem ao elemento de origem ao fechar.
- Mudança de resultado de busca é anunciada via região `aria-live="polite"`.
- `prefers-reduced-motion` respeitado.

---

## 13. O que não fazer

- Dashboard com gráficos de pizza, barra ou linha.
- Neon, glow dominante, estética gamer ou cyberpunk.
- Gradiente decorativo, sombra grande, efeito "floating".
- Card dentro de card dentro de card.
- Tabela com dezenas de colunas na tela principal.
- Animação longa, parallax, partícula, fundo animado, reveal ao rolar.
- Ícones de bibliotecas diferentes misturados; emoji como ícone da interface.
- Caixa alta em título ou em rótulo comum.
- Cor fora da paleta, espaçamento fora da escala, raio ou duração inventados.
- Home com parede de informação.
- **QR Code** — fora do escopo do produto.

---

## 14. Regras de produto (fechadas para o MVP)

### 14.1 Permissões

Dois papéis: **usuário** e **administrador**.

| Ação | Usuário | Administrador |
| --- | --- | --- |
| Buscar, ver ficha, ver histórico e localizações | ✓ | ✓ |
| Favoritar, ver recentes | ✓ | ✓ |
| Mover e devolver item | ✓ | ✓ |
| Cadastrar e editar item | ✓ | ✓ |
| Enviar item para a lixeira | ✓ | ✓ |
| Restaurar da lixeira | — | ✓ |
| Excluir definitivamente | — | ✓ |
| Gerenciar localizações e usuários | — | ✓ |

Ação sem permissão **não aparece**. Não renderizar botão desabilitado com
tooltip explicando que falta permissão — isso só ensina o usuário a se
frustrar. A exceção é quando a ausência confundiria: aí um texto curto explica
que a ação é do administrador.

### 14.2 Fotos

Upload manual, uma foto principal por equipamento. Sem importação em lote, sem
galeria, sem captura por câmera no MVP.

Aceitar JPEG, PNG e WebP até 5 MB. Redimensionar no cliente antes de enviar.
Sem foto, o card mostra o ícone da categoria em `--color-text-tertiary` sobre
`--color-surface-photo` — nunca um placeholder genérico de imagem quebrada.

Ações: adicionar, substituir, remover. Remover pede confirmação inline, não modal.

### 14.3 PR fora da base oficial

O cadastro manual é permitido. O item recebe a condição **Não importado**
(§4.4), exibida como badge neutro ao lado do PR na ficha e no card.

Na ficha, uma linha discreta em `--color-text-secondary`, `--font-size-sm`:
*"Cadastrado manualmente. Ainda não consta na base patrimonial oficial."*

Não bloquear nenhuma operação por causa disso — o item se comporta como
qualquer outro. A marcação é informativa, para conferência posterior, e some
sozinha quando o PR passar a existir na base.

### 14.4 Recentes

Por usuário, não por dispositivo. Últimos 20 equipamentos abertos, sem
repetição, mais recente primeiro. A Home mostra 6. Registra ao abrir a ficha,
não ao aparecer em resultado de busca.

### 14.5 O que continua fora do MVP

QR Code · leitura automática de inventário · galeria de fotos · notificações
push · tema claro · relatórios · exportação.

Item novo que apareça e não caiba em nada aqui entra nesta lista até ser
decidido — não é implementado por conta própria.

---

## 15. Manutenção deste documento

Mudança de direção visual é alteração deste arquivo + `tokens.css`, no mesmo
commit. Componente novo que não se encaixa em nada aqui é sinal de que a
especificação precisa crescer — não de que o componente pode divergir.


---

## 16. Decisões da v2 (prevalecem sobre o texto acima)

**Card de equipamento — direção "foto em destaque".** O card é a própria imagem,
em proporção 1:1, com nome, PR e localização sobrepostos numa faixa escura no
rodapé (`--photo-scrim`). Status e favorito ficam no topo, sobre a foto. Sem
foto, o fundo usa a cor da categoria e mostra o ícone dela. Isso substitui o
card vertical com foto 4:3 descrito em §9.4.

**Locais são uma árvore livre.** Não há níveis fixos de Sala → Armário →
Prateleira. O administrador cria a estrutura que existe de verdade, com o tipo
que quiser (prédio, sala, armário, gaveta, caixa), em quantos níveis precisar.
Cada equipamento aponta para um nó dessa árvore. Isso substitui os três campos
de texto descritos em §10.7 e a limitação registrada no README da v1.
A interface só **sugere** o tipo do próximo nível (Prédio → Sala → Armário →
Prateleira → Gaveta, ou o tipo mais usado entre os irmãos); nada é imposto.
Regras da árvore: nome não se repete no mesmo nível (sem acento e caixa);
local fora de uso é **arquivado**, não apagado — some das listas e seletores,
vale para a subárvore e só é possível sem equipamentos dentro. Prateleiras em
série se criam em lote ("Prateleira 1" a "Prateleira 6"). O seletor de local
mostra primeiro os usados por último pelo usuário e deixa o administrador
criar um local sem sair do formulário.

**Pessoa ≠ usuário.** Usuário faz login; pessoa é quem pode ficar com um
equipamento e não precisa de conta. Pessoas podem ser cadastradas durante o
próprio fluxo de saída.

**Mover item tem dois caminhos.** *Sair da sala* pede destino, responsável,
motivo e prazo. *Mudar de lugar* pede só o novo local. Uma saída em andamento
pode ser editada (responsável, prazo, destino, motivo), e a alteração vira um
evento no histórico.

**Categorias, setores e motivos são cadastros**, com nome, cor e ícone no caso
das categorias. Nada de listas fixas em código.

**Cautela de equipamentos.** Toda saída é uma cautela, espelho do formulário
oficial em papel. Fluxo pensado para tablet: adicionar itens por toque, escolher
quem recebe, emitir, imprimir. A tela "Fora da sala" foi substituída por
"Cautelas", agrupando por cautela em vez de item solto. Assinaturas só no papel.
Numeração `numero/ano`, recomeçando a cada ano. Uma data de devolução para
todos os itens, e a devolução é sempre da cautela inteira.

**Tablet e celular como plataforma principal.** Em telas de toque nenhum alvo
fica abaixo de 44px; campos usam 16px para o iOS não dar zoom; a navegação
inferior tem "Cautela" como ação central.

**Fora do escopo até segunda ordem:** modo de conferência de inventário
(descrito em §10.7 da v1, não reimplementado na v2), QR Code, tema claro,
relatórios e exportação.


---

## 17. Direção visual Editorial (v3 — prevalece sobre §3 a §9 e §13)

O tema escuro e sóbrio foi substituído por uma direção **Editorial**: clara,
com personalidade de revista e movimento. O objetivo mudou de "não chamar
atenção" para "impressionar sem atrapalhar o uso".

**Paleta.** Papel quente (`--paper-200`) como fundo, tinta quase preta
(`--ink-900`) para texto e contornos, violeta elétrico (`--violet-500`) para
toda interação, e blocos pastel (menta, lavanda, pêssego, manteiga, céu) para
destaques. Amarelo marca-texto (`--marker`) para a palavra que importa e para o
item ativo da navegação.

**Contorno e sombra "sticker".** Cards, painéis, botões e campos têm contorno
de 2px em tinta (`--border-ink`). A elevação é uma sombra sólida deslocada, sem
desfoque (`--shadow-offset`): no hover o elemento "descola" do papel.

**Tipografia.** Bricolage Grotesque (`--font-display`) em títulos, com peso
alto; IBM Plex Sans para texto e dados, com numerais tabulares.

**Movimento.** Permitido e desejado, desde que responda ao usuário ou marque
uma entrada: páginas sobem ao entrar, listas entram em cascata, números contam
até o valor, o marca-texto é "desenhado", botões e cards usam curva com mola
(`--ease-spring`), formas decorativas flutuam no fundo da Home e do login.
Nada disso atrasa a interação, e tudo desliga com `prefers-reduced-motion`.

**Estrutura em camadas.** `tokens.css` tem os valores; `base`, `layout`,
`components`, `pages`, `overlays` e `visual` têm a estrutura; `editorial.css`
é a camada de tema, carregada por último. Trocar de direção visual no futuro é
trocar essa camada e os tokens — não reescrever componentes.

**O que continua valendo:** status sempre com rótulo em texto, contraste AA,
alvos de toque de 44px, foco de teclado visível e a folha da cautela como
documento em preto e branco, fora do tema.
