# PATRI — Instruções do projeto

Sistema interno de localização e controle de equipamentos patrimoniais.
A interface existe para responder, rápido: **onde está este equipamento?** e,
se não está na sala, **com quem está e quando volta?**

---

## Regra principal

Toda UI deste projeto segue **`docs/PATRI-design.md`** e usa os tokens de
**`src/styles/tokens.css`**.

Antes de criar ou alterar qualquer tela, componente ou estilo, leia os dois.
Não deduza a direção visual pelo código existente — a especificação é a fonte.

---

## Tokens: sem valores hardcoded

Proibido escrever literal em componente quando existe token:

| Não escrever | Escrever |
| --- | --- |
| `#14181E`, `rgb(20,24,30)` | `var(--color-surface)` |
| `16px`, `1rem` de espaçamento | `var(--space-4)` |
| `border-radius: 12px` | `var(--radius-lg)` |
| `transition: 200ms ease` | `var(--duration-base) var(--ease-out)` |
| `font-size: 15px` | `var(--font-size-base)` |
| `box-shadow: 0 4px 12px …` | `var(--shadow-md)` |
| classes de cor arbitrárias do framework | token correspondente |

Se o valor necessário não existe em `tokens.css`: **adicione o token primeiro**,
com nome semântico e comentário, e só então use. Não introduza uma cor, um
espaçamento, um raio ou uma duração fora das escalas definidas.

Componentes consomem apenas tokens **semânticos** (`--color-surface`,
`--color-accent`). Os primitivos (`--graphite-800`, `--blue-500`) existem só para
compor os semânticos.

---

## Não negociável

- **Tema claro Editorial** (v3). Papel, tinta, violeta e blocos pastel. Ver §17 do design doc.
- **Azul = interação.** Ação primária, link, foco, item ativo, seleção. Nunca
  status, decoração ou grandes áreas.
- **Botão primário é branco sobre violeta** (`--color-on-accent`, 6.4:1).
- **Status sempre tem rótulo em texto**, nunca só cor ou só ponto. Rótulos são
  específicos: Disponível · Fora da sala · Em manutenção · Baixado. "Indisponível"
  não existe na interface.
- **Situação é armazenada; condição é derivada.** Atrasado, Retorno próximo,
  Atenção e Não importado são calculados na leitura, nunca gravados como campo
  de status (`docs/PATRI-design.md` §4.4).
- **Nome do equipamento antes do PR.** `Canon EOS R` / `PR 7210899` — nunca o
  inverso.
- **Dois papéis: usuário e administrador** (§14.1). Ação sem permissão não é
  renderizada — não criar botão desabilitado com tooltip de permissão.
- **Sem QR Code.** Está fora do escopo do produto.
- **Sem gráficos.** A Home não é dashboard.
- **Foco de teclado sempre visível.** Nunca `outline: none` sem substituto.
- **Alvo tocável mínimo 44px** (`--touch-target-min`).

---

## Mobile é primeira classe

Não é o desktop encolhido. Abaixo de 768px o layout **reorganiza**: sidebar vira
navegação inferior, card vertical vira card horizontal, modal vira bottom sheet,
formulário vira coluna única, ação principal vai para o rodapé fixo.

Prioridade no celular: pesquisar → encontrar → ver localização → ver situação →
movimentar.

---

## Escrita da interface

Português direto, sem burocratês. "Mover item", não "Cadastrar movimentação
patrimonial". O verbo da ação vira o particípio do resultado: botão "Mover" →
toast "Equipamento movido". Erro diz o que fazer, não o código do erro.

---

## Ao gerar código

1. Leia `docs/PATRI-design.md` (seção relevante) e `src/styles/tokens.css`.
2. Verifique se o componente já existe antes de criar outro parecido.
3. Implemente todos os estados: hover, active, focus-visible, disabled, loading,
   vazio, erro. Um componente sem estados está incompleto.
4. Confira responsividade em **375 · 480 · 768 · 1024 · 1440 · 1536px**.
   As transições que importam são 768 (sidebar → navegação inferior, card
   vertical → horizontal, modal → bottom sheet) e 1024 (formulário de duas
   colunas para uma).
5. Não adicione elemento, cor, card ou animação que a especificação não peça.
   Em dúvida entre incluir e omitir: **omitir**.

## Escopo atual

Identidade visual e design system estabelecidos; regras de produto do MVP
fechadas em `docs/PATRI-design.md` §14.

O sistema em si (banco, API, autenticação, movimentação real) **ainda não foi
implementado**. Não presuma esquema de dados nem crie backend sem que isso seja
pedido. Fora do MVP: QR Code, leitura automática de inventário, galeria de
fotos, push, tema claro, relatórios, exportação.

---

## Backend

`server/` — Node 20, TypeScript strict, Express, Zod, Prisma, PostgreSQL 16.

- Toda rota valida entrada com Zod. Nada de `req.body` cru.
- Erros sobem via `AppError` ou Zod e são traduzidos em `middleware/error.ts`.
  Resposta ao usuário nunca traz stack, código Prisma ou jargão.
- `searchText` é reconstruído em **toda** escrita que toque campo buscável.
  Esquecer disso quebra a busca silenciosamente.
- Situação é coluna; condição (atrasado, atenção, não importado) é derivada.
  Nunca criar coluna para condição.
- Exclusão é lógica (`excluidoEm`). Toda consulta de listagem filtra
  `excluidoEm: null`.
- Ações restritas usam `somenteAdmin`. O frontend esconde o botão, mas a
  autorização de verdade é no servidor.

## Frontend com API

- `src/lib/api.ts` é o único arquivo que faz `fetch`. Componentes não montam URL.
- Páginas buscam o que precisam com `useAsync`; não guardar listas em estado
  global, que envelhecem.
- Depois de uma mutação, chamar `invalidar()` do `AppState` para as telas
  recarregarem.
- Estados obrigatórios em toda tela que busca dados: carregando (skeleton),
  erro (com "Tentar novamente") e vazio.

---

## Modelo atual (v2)

- **Pessoa** (quem pega o item) é diferente de **Usuário** (quem faz login).
  Nunca fundir os dois.
- **Locais** são uma árvore livre (`Location.parentId`), montada pelo
  administrador. Nada de níveis fixos no código.
- **Categorias, setores e motivos** são cadastros com CRUD. Nunca voltar a
  listar opções fixas em arquivo.
- **Toda saída é uma cautela** (`/cautelas`). Não existe saída avulsa de item.
  Mudança de lugar (`/equipments/:id/move`) não gera cautela.
- Cautela: identificada por `numero/ano` (único por ano), recomeça em 1 a cada
  ano; o número inicial configurado vale só para `anoNumeroInicial`. Uma data
  de devolução para todos os itens; **não existe devolução parcial** — tudo
  volta junto e a cautela encerra.
- Folha: segue o formulário oficial (modelo novo). Grade de 6 colunas; caixas
  do usuário sem rótulo: USUÁRIO (nome) + Ramal na 1ª linha; PR + Celular na 2ª;
  3ª linha em branco. PR da pessoa fica em `Person.matricula`; celular em
  `Person.telefone`. Definição da chefia. Brasão fixo em `public/brasao.png`.
  Bloco de assinaturas: duas caixas (cliente e recebedor), sempre em branco.
  `CautelaItem` guarda cópia de nome, marca, modelo, série e PR para a folha
  reimpressa sair igual à assinada. Não inventar campo que o papel não tem.
- **Assinatura nunca entra no sistema.** A folha impressa sai com as linhas de
  assinatura em branco. Pedido explícito da chefia.
- A folha (`CautelaImprimir`) é documento, não interface: usa os tokens
  `--print-*`, serifa e linhas pretas. Não aplicar o tema da interface nela.
- Dados de conta e senha: só administrador. `/me` aceita do usuário comum
  apenas `preferencias`.
- `searchText` é reconstruído em toda escrita que toque nome, local, categoria,
  responsável ou destino — inclusive ao renomear um local (reindexa a subárvore).
- **Locais arquivados** (`Location.arquivado`) somem das listas e seletores
  (`filhosDe` já filtra), valem para a subárvore e não recebem equipamento novo.
  Nome repetido entre irmãos é recusado no servidor e avisado no formulário.
- **Fotos e logos:** o banco guarda o caminho relativo `/uploads/<arquivo>`.
  Toda `<img>` de arquivo enviado passa por `ImagemArquivo` (ou `urlArquivo`),
  que completa com a base da API e cai no ícone/iniciais se o arquivo sumir.
  A pasta física é `UPLOAD_DIR` no servidor.
- **Banco em produção é intocável.** Nenhum script comum apaga dados:
  `setup` e `db:push` usam `prisma db push` sem `--force-reset` nem
  `--accept-data-loss`; o seed só cria o que falta. O único comando que apaga é
  `db:zerar-local`, que recusa banco remoto. Mudança de schema: mostrar o SQL
  antes e aplicar de forma deliberada (`docs/DEPLOY.md`).
- **Servidor local (notebook):** com `FRONTEND_DIR` definido, o backend entrega
  também as telas e a API fica **só em `/api`** (os endereços de tela, como
  `/cautelas`, são do frontend). Sem `FRONTEND_DIR`, a API responde na raiz e em
  `/api`. O frontend nunca grava endereço de servidor: usa `VITE_API_URL` ou
  `/api`. Operação (serviço, backup, restauração, migração) fica em
  `server/scripts/*.mjs`, Node puro; `windows/` só tem atalhos. Guia:
  `docs/SERVIDOR-LOCAL.md`.
- **Falha de rede não encerra sessão.** Só 401 apaga o token. Servidor fora do
  ar mostra aviso e reconecta sozinho (`AuthState`, `CatalogState`).
- Cor da categoria entra no CSS como variável `--cat` via `style`. É dado, não
  valor de design: não vira token.
- Direção visual: **Editorial** (§17). Contorno de tinta, sombra "sticker",
  marca-texto, animação com mola. O caráter mora em `styles/editorial.css`,
  carregada por último; estrutura fica nos outros arquivos de estilo.
- Animação é bem-vinda quando responde ao usuário ou marca entrada de tela.
  Sempre com os tokens de duração e curva, e sempre desligável por
  `prefers-reduced-motion`.
