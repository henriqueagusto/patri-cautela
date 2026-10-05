# PATRI

Sistema interno de localização e controle de equipamentos patrimoniais.

React + TypeScript (frontend) · Node + Express + Prisma + PostgreSQL (backend).
Feito para tablet e celular, instalável como app.
Sistema **zerado**: nenhum equipamento de demonstração, pronto para uso real.

---

## Rodar

Requisitos: **Node 20+** e **Docker Desktop**.

```bash
docker compose up -d          # banco

cd server
copy .env.example .env        # Windows (Linux/macOS: cp .env.example .env)
npm install
npm run setup                 # cria as tabelas e o administrador (não apaga nada)
npm run dev                   # http://localhost:3333

# outro terminal, na raiz
npm install
npm run dev                   # http://localhost:5173
```

Acesso inicial: **admin@patri.local** / **patri123** — troque a senha no primeiro
acesso em Perfil → Segurança. Para usar outro e-mail/senha, defina `ADMIN_EMAIL`
e `ADMIN_SENHA` antes do `npm run setup`.

---

## Usar no tablet ou celular

O PATRI é instalável como app: abre em tela cheia, com ícone na tela inicial.

- **Android (Chrome):** menu ⋮ → *Instalar app*.
- **iPad / iPhone (Safari):** compartilhar → *Adicionar à Tela de Início*.

A instalação no Android exige HTTPS. Em rede interna sem certificado, use o
atalho do navegador ou publique o sistema atrás de um HTTPS da instituição.

---

## Primeiros passos no sistema

1. **Locais** — monte a estrutura física: prédio, sala, armário, prateleira,
   gaveta. Quantos níveis quiser, com os nomes que você usa. Prateleiras em
   série: **Criar vários**. Local fora de uso: **Arquivar** (não apaga nada).
2. **Cadastros → Categorias** — já vêm sete, editáveis (nome, cor e ícone).
3. **Cadastros → Setores** — para onde os equipamentos vão (auditório, evento).
4. **Cadastros → Pessoas** — quem pode ficar com equipamento. Não precisa ter login.
5. **Cadastros → Usuários** — contas de acesso, com papel usuário ou administrador.
6. **Novo equipamento** — PR, nome, número de série, categoria, foto e local.
7. **Configurações → Instituição** — nome e logo do sistema (login e barra lateral).
   O brasão da cautela é fixo, igual ao formulário oficial.
8. **Configurações → Cautela** — confira o cabeçalho, o número inicial (300) e
   o ano em que ele vale.
9. **Cadastros → Pessoas** — preencha **PR**, **ramal** e **celular**: são os
   dados que saem impressos na cautela.

---

## Como o sistema pensa

**Pessoa ≠ usuário.** Usuário faz login. Pessoa é quem pega o equipamento —
pode ser cadastrada na hora da saída, sem sair do fluxo.

**Toda saída é uma cautela.** Uma cautela reúne um ou mais equipamentos
entregues a uma pessoa, com **uma única data de devolução para todos**. Ao
emitir, o sistema gera a folha idêntica ao formulário oficial, preenchida, com
as assinaturas em branco — elas são colhidas no papel, que fica no arquivo.
Na folha: nome e ramal na primeira linha, PR e celular na segunda.

**Tudo volta junto.** A devolução encerra a cautela inteira, registrando quem
recebeu e em que estado cada item voltou.

**Numeração por ano.** A cautela é identificada como número/ano — `300/2026`.
Cada ano novo recomeça em `1`. O número inicial (300) vale só para o ano
configurado em Configurações → Cautela.

**Mudar de lugar** é outra coisa: o item continua no acervo, só troca de sala,
armário ou prateleira. Não gera cautela.

**Permissões.** Dados de conta e senhas são alterados só pelo administrador,
em Cadastros → Usuários. O usuário comum vê o próprio perfil e ajusta apenas
as preferências de visualização.

**Situação é gravada; condição é calculada.** Disponível, Fora da sala, Em
manutenção e Baixado são colunas. Atrasado, Retorno próximo, Atenção e Não
importado são derivados na leitura — não existe rotina para esquecer de rodar.

**Busca tolerante.** Cada item guarda um texto normalizado com nome, PR, marca,
modelo, série, categoria, caminho do local e responsável. `vostro`, `dell`,
`armário a` e `carlos` encontram o que deveriam.

**Exclusão é lógica.** Vai para a lixeira, recuperável. Só o administrador
restaura ou apaga de vez.

**Tudo é configurável.** Prazos, janela de aviso de retorno, regra do PR da base
oficial, exigir responsável, nome e logo da instituição. Toda alteração de
cadastro fica registrada em Configurações → Auditoria.

---

## Estrutura

```
patri/
├─ docs/PATRI-design.md   especificação de design (normativa)
├─ CLAUDE.md              regras do projeto
├─ docker-compose.yml     PostgreSQL 16
├─ src/                   frontend
│  ├─ lib/api.ts          único arquivo que faz fetch
│  ├─ state/              sessão, catálogos, favoritos
│  └─ styles/tokens.css   design system
└─ server/
   ├─ prisma/schema.prisma
   └─ src/routes/
```

## Comandos

```bash
cd server
npm run db:studio       # inspecionar o banco
npm run db:push         # aplica mudanças do schema; recusa se houver perda de dados
npm run db:seed         # cria só o que falta (admin, categorias, motivos); não apaga nada
npm run db:zerar-local  # APAGA TUDO — só banco local, pede confirmação explícita
```

**Servidor local (notebook Windows, acesso pelo Wi-Fi):
[docs/SERVIDOR-LOCAL.md](docs/SERVIDOR-LOCAL.md)** — instalação, início
automático, backup, restauração e migração dos dados do Render.

Publicação no Render: [docs/DEPLOY.md](docs/DEPLOY.md).
