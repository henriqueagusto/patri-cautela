# PATRI — Publicação no Render

Guia de publicação e de proteção dos dados. Vale para a configuração atual
(Render, plano Free) e para a futura mudança de plano.

---

## 1. Configuração dos serviços

### Backend — Web Service (`patri-cautela`)

| Campo | Valor |
| --- | --- |
| Root Directory | `server` |
| Build Command | `npm install --include=dev && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/health` |

Variáveis de ambiente:

| Variável | Valor |
| --- | --- |
| `DATABASE_URL` | Internal Database URL do Postgres do Render |
| `JWT_SECRET` | texto longo e aleatório (não trocar depois: desloga todo mundo) |
| `CORS_ORIGIN` | `https://patri-cautela-1.onrender.com` |
| `UPLOAD_DIR` | vazio no Free. Com disco pago: `/var/data/uploads` |

`npm run build` já roda `prisma generate`. Nenhum dos dois toca no banco.

### Frontend — Static Site (`patri-cautela-1`)

| Campo | Valor |
| --- | --- |
| Root Directory | *(vazio — raiz do repositório)* |
| Build Command | `npm install && npm run build` |
| Publish Directory | `dist` |
| Variável `VITE_API_URL` | `https://patri-cautela.onrender.com` |
| Redirects/Rewrites | Source `/*` → Destination `/index.html` → **Rewrite** |

A regra de rewrite faz o link direto de uma tela (ex.: `/cautelas/123`) abrir
em vez de dar 404.

---

## 2. O que NUNCA pode estar no Build ou no Start

- `--force-reset` — derruba todas as tabelas.
- `--accept-data-loss` — aceita apagar colunas/tabelas com dados.
- `prisma migrate reset` ou `prisma migrate dev` — o projeto usa `db push`; esses
  comandos tentam recriar o banco.
- `npm run db:zerar-local` — apaga tudo (e de qualquer forma recusa banco remoto).

> **Atenção:** até a versão anterior, `npm run setup` continha
> `--force-reset`. Se o Build ou o Start do Render usava `npm run setup`, cada
> deploy apagava o banco. Agora `setup` é seguro, mas ele não precisa estar no
> Render: use os comandos da tabela acima.

Scripts do `server/package.json` e o que fazem:

| Script | Toca no banco? |
| --- | --- |
| `build`, `start`, `dev` | não |
| `db:push` | aplica o schema; **recusa** se houver perda de dados |
| `db:seed` | só cria o que falta (configurações, categorias, motivos, admin se não houver usuário) |
| `setup` | `generate` + `db:push` + `db:seed` — seguro |
| `db:zerar-local` | **apaga tudo** — só banco em `localhost`, com `CONFIRMAR_ZERAR=APAGAR-TUDO` |

---

## 3. Mudança de banco desta versão: coluna `arquivado` em locais

Única alteração de schema: locais ganham a marca de arquivado.

```prisma
model Location {
  // …
  arquivado Boolean @default(false)
}
```

SQL equivalente:

```sql
ALTER TABLE "locations" ADD COLUMN "arquivado" BOOLEAN NOT NULL DEFAULT false;
```

- Só **adiciona** uma coluna. Nenhuma linha é apagada ou alterada.
- Todos os locais existentes ficam com `arquivado = false` (continuam visíveis).
- No PostgreSQL 11+ é instantâneo: não reescreve a tabela.
- O backend **antigo** continua funcionando com a coluna nova (ele a ignora).
  O backend **novo** precisa dela. Por isso: aplicar a coluna **antes** do deploy.

### Passo a passo (do seu computador, uma vez)

Pegue a **External Database URL** no painel do Postgres no Render.

```bash
cd server
npm install

# PowerShell:  $env:DATABASE_URL="postgresql://…external…"
# bash/macOS:  export DATABASE_URL="postgresql://…external…"

# 1) Ver o SQL que seria aplicado — só leitura, não altera nada
npx prisma migrate diff --from-url "$env:DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script
#    (bash: troque "$env:DATABASE_URL" por "$DATABASE_URL")
#    Deve mostrar apenas o ALTER TABLE acima. Se mostrar DROP, pare.

# 2) Cópia de segurança (o Postgres Free não tem backup automático)
pg_dump "$env:DATABASE_URL" -Fc -f patri-backup.dump

# 3) Aplicar — sem flags; se houvesse perda de dados, o Prisma recusaria
npx prisma db push --skip-generate
```

Depois disso, faça o commit/push do código e o deploy do backend e do frontend.

---

## 4. Fotos

O banco guarda o caminho relativo da foto (`/uploads/<arquivo>.jpg`). O
frontend completa esse caminho com o endereço da API, então a imagem é pedida
ao backend, e não ao site estático — era isso que gerava o 404.

**Limite do plano Free:** o disco do Web Service é temporário. Todo deploy,
reinício ou hibernação apaga os arquivos enviados. O caminho no banco continua
lá, mas o arquivo não; a interface mostra o ícone da categoria (ou as
iniciais) no lugar, sem imagem quebrada. Nada no banco é alterado.

Para as fotos persistirem, o backend precisa de um **disco persistente**
(plano pago, abaixo). Até lá, fotos enviadas somem no próximo deploy/reinício.

---

## 5. Disponibilidade 24/7 — o que sai do Free

| Serviço | Hoje (Free) | Para 24/7 | Por quê |
| --- | --- | --- | --- |
| Frontend (Static Site) | Free | **continua Free** | site estático não hiberna |
| Backend (Web Service) | Free | **Starter** | Free hiberna após 15 min sem uso (~1 min para acordar) e não aceita disco |
| Disco das fotos | — | **Disk 1 GB** no backend | fotos deixam de sumir |
| Banco (PostgreSQL) | Free | **Basic** | o Postgres Free **expira 30 dias após a criação** (+14 dias para upgrade), sem backup |

Ao mudar o backend para Starter:

1. Em *Disks*, adicione um disco: Mount Path `/var/data`, 1 GB.
2. Defina `UPLOAD_DIR=/var/data/uploads`.
3. Deploy. As fotos enviadas a partir daí ficam no disco.

Ao mudar o banco para um plano pago, use **Upgrade** no próprio banco: os dados
são mantidos. Não crie um banco novo pelo Blueprint.

Preços e limites mudam; confira em render.com/pricing antes de contratar.
