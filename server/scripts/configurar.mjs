// Primeira configuração do PATRI como servidor local.
//
//   npm run configurar
//
// O que faz, sem nunca apagar nada:
//   1. cria a pasta de dados (fotos, backups, logs) fora do código;
//   2. cria no PostgreSQL desta máquina o usuário "patri" e o banco "patri",
//      se ainda não existirem;
//   3. grava server/.env com senha e segredo aleatórios.
//
// Se server/.env já existe, ele é respeitado: nada é sobrescrito.
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  ARQUIVO_ENV, PASTA_DADOS_PADRAO, argumento, configuracao, executar, falhar, ferramentaPg, perguntar,
} from './lib.mjs';

const paraBarras = (c) => c.replace(/\\/g, '/');

if (existsSync(ARQUIVO_ENV)) {
  const cfg = configuracao();
  for (const pasta of [cfg.uploads, cfg.backups, cfg.logs]) mkdirSync(pasta, { recursive: true });
  console.log('\nserver/.env já existe — mantido como está. Pastas de dados conferidas:');
  console.log(`  fotos:   ${cfg.uploads}\n  backups: ${cfg.backups}\n  logs:    ${cfg.logs}\n`);
  process.exit(0);
}

const dados = paraBarras(resolve(argumento('dados') || PASTA_DADOS_PADRAO));
const hostPg = argumento('pg-host') || '127.0.0.1';
const portaPg = argumento('pg-porta') || '5432';
const adminPg = argumento('pg-admin') || 'postgres';
const nomeBanco = argumento('banco') || 'patri';
const usuarioBanco = argumento('usuario') || 'patri';
const porta = argumento('porta') || '3333';

console.log('\nConfiguração do PATRI neste computador\n');
console.log(`  Pasta de dados: ${dados}`);
console.log(`  PostgreSQL:     ${hostPg}:${portaPg} (administrador: ${adminPg})`);
console.log(`  Banco/usuário:  ${nomeBanco} / ${usuarioBanco}\n`);

const psql = ferramentaPg('psql');
const senhaAdmin =
  process.env.PATRI_SENHA_POSTGRES ??
  (await perguntar(`Senha do usuário "${adminPg}" do PostgreSQL (a que você definiu ao instalar): `));

const ambiente = { ...process.env, PGPASSWORD: senhaAdmin, PGCONNECT_TIMEOUT: '10' };
const admin = (comando, base = 'postgres') =>
  executar(psql, ['-h', hostPg, '-p', portaPg, '-U', adminPg, '-d', base, '-At', '-v', 'ON_ERROR_STOP=1', '-c', comando], { env: ambiente });

const teste = admin('select 1');
if (!teste.ok) {
  falhar(
    `Não consegui entrar no PostgreSQL como "${adminPg}".\n${teste.erro}\n\n` +
      'Confira se o serviço do PostgreSQL está rodando e se a senha está certa. Nada foi alterado.',
  );
}

// Identificadores simples, para não depender de aspas/escape.
for (const [rotulo, valor] of [['banco', nomeBanco], ['usuário', usuarioBanco]]) {
  if (!/^[a-z_][a-z0-9_]*$/.test(valor)) falhar(`Nome de ${rotulo} inválido: use só letras minúsculas, números e "_".`);
}

const senhaBanco = randomBytes(18).toString('hex');
const existeUsuario = admin(`select 1 from pg_roles where rolname='${usuarioBanco}'`).saida === '1';
const existeBanco = admin(`select 1 from pg_database where datname='${nomeBanco}'`).saida === '1';

// Usuário próprio do sistema, sem poderes de administrador.
const papel = admin(
  existeUsuario
    ? `alter role ${usuarioBanco} with login password '${senhaBanco}'`
    : `create role ${usuarioBanco} with login password '${senhaBanco}'`,
);
if (!papel.ok) falhar(`Não consegui ${existeUsuario ? 'atualizar' : 'criar'} o usuário "${usuarioBanco}": ${papel.erro}`);
console.log(existeUsuario ? `Usuário "${usuarioBanco}" já existia: senha redefinida.` : `Usuário "${usuarioBanco}" criado.`);

if (existeBanco) {
  console.log(`Banco "${nomeBanco}" já existe: mantido como está (nenhum dado tocado).`);
} else {
  const criar = admin(`create database ${nomeBanco} owner ${usuarioBanco} encoding 'UTF8'`);
  if (!criar.ok) falhar(`Não consegui criar o banco "${nomeBanco}": ${criar.erro}`);
  console.log(`Banco "${nomeBanco}" criado.`);
}

for (const sub of ['uploads', 'backups', 'logs']) mkdirSync(join(dados, sub), { recursive: true });

const env = `# PATRI — configuração deste computador. NÃO enviar para o GitHub.
# Gerado por "npm run configurar" em ${new Date().toLocaleString('pt-BR')}.

# Banco: só esta máquina (127.0.0.1) acessa o PostgreSQL.
DATABASE_URL="postgresql://${usuarioBanco}:${senhaBanco}@${hostPg}:${portaPg}/${nomeBanco}?schema=public"

# Segredo que assina os logins. Trocar este valor desloga todo mundo.
JWT_SECRET="${randomBytes(48).toString('hex')}"

# Endereço do sistema: http://IP-DESTE-COMPUTADOR:${porta}
PORT=${porta}
HOST=0.0.0.0

# O próprio servidor entrega as telas (frontend compilado na raiz: npm run build).
FRONTEND_DIR=../dist

# Dados fora do código: atualizar o sistema nunca toca nestas pastas.
PATRI_DADOS="${dados}"
UPLOAD_DIR="${dados}/uploads"
BACKUP_DIR="${dados}/backups"
LOG_DIR="${dados}/logs"

# Quantos backups automáticos (um por dia) manter.
BACKUP_MANTER=14

# Este é o banco de verdade: bloqueia o comando que zera o banco de testes.
PATRI_PRODUCAO=sim
`;
writeFileSync(ARQUIVO_ENV, env, { mode: 0o600 });

console.log(`\nConfiguração gravada em ${ARQUIVO_ENV}`);
console.log(`Pasta de dados criada em ${dados}\n`);
