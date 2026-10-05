// Funções comuns aos scripts de operação do PATRI (servidor local).
// Node puro: não depende do Prisma nem do código compilado.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir, networkInterfaces } from 'node:os';
import { delimiter, dirname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

export const EH_WINDOWS = process.platform === 'win32';

/** Pasta server/ (onde ficam .env, dist e node_modules). */
export const PASTA_SERVIDOR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const ARQUIVO_ENV = join(PASTA_SERVIDOR, '.env');

/** Pasta padrão dos dados (fotos, backups, logs) — fora do código. */
export const PASTA_DADOS_PADRAO = EH_WINDOWS ? 'C:/PATRI-dados' : join(homedir(), 'patri-dados');

/** Lê server/.env sem depender de pacote. Não altera process.env. */
export function lerEnv(arquivo = ARQUIVO_ENV) {
  const valores = {};
  if (!existsSync(arquivo)) return valores;
  for (const linha of readFileSync(arquivo, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(linha);
    if (!m) continue;
    let valor = m[2];
    if (/^".*"$/.test(valor) || /^'.*'$/.test(valor)) valor = valor.slice(1, -1);
    valores[m[1]] = valor;
  }
  return valores;
}

/** Configuração efetiva: .env + padrões. Caminhos relativos são a partir de server/. */
export function configuracao() {
  const env = { ...lerEnv(), ...process.env };
  const caminho = (v, padrao) => resolve(PASTA_SERVIDOR, v || padrao);
  const uploads = caminho(env.UPLOAD_DIR, 'uploads');
  const dados = env.PATRI_DADOS ? caminho(env.PATRI_DADOS) : undefined;
  return {
    env,
    DATABASE_URL: env.DATABASE_URL,
    PORT: Number(env.PORT || 3333),
    uploads,
    backups: caminho(env.BACKUP_DIR, dados ? join(dados, 'backups') : 'backups'),
    logs: caminho(env.LOG_DIR, dados ? join(dados, 'logs') : 'logs'),
    manterBackups: Math.max(1, Number(env.BACKUP_MANTER || 14)),
  };
}

/**
 * Separa a DATABASE_URL do Prisma no que as ferramentas do PostgreSQL entendem.
 * O parâmetro `?schema=` é do Prisma; pg_dump/psql não o aceitam.
 */
export function banco(url) {
  if (!url) throw new Error('DATABASE_URL não está definida em server/.env.');
  const u = new URL(url);
  const schema = u.searchParams.get('schema') || 'public';
  const ssl = u.searchParams.get('sslmode');
  return {
    host: u.hostname,
    porta: u.port || '5432',
    usuario: decodeURIComponent(u.username),
    senha: decodeURIComponent(u.password),
    nome: decodeURIComponent(u.pathname.replace(/^\//, '')),
    schema,
    ssl,
    local: ['localhost', '127.0.0.1', '::1', '[::1]'].includes(u.hostname),
  };
}

/** Argumentos de conexão + ambiente (a senha vai por variável, nunca na linha de comando). */
export function conexao(b) {
  return {
    args: ['-h', b.host, '-p', String(b.porta), '-U', b.usuario, '-d', b.nome],
    env: { ...process.env, PGPASSWORD: b.senha, ...(b.ssl ? { PGSSLMODE: b.ssl } : {}), PGCONNECT_TIMEOUT: '15' },
  };
}

/** Localiza um executável do PostgreSQL (psql, pg_dump, pg_restore). */
export function ferramentaPg(nome) {
  const exe = EH_WINDOWS ? `${nome}.exe` : nome;
  const candidatos = [];
  if (process.env.PG_BIN) candidatos.push(join(process.env.PG_BIN, exe));
  for (const pasta of (process.env.PATH || '').split(delimiter)) if (pasta) candidatos.push(join(pasta, exe));
  if (EH_WINDOWS) {
    for (const raiz of [process.env.ProgramFiles, process.env['ProgramFiles(x86)']].filter(Boolean)) {
      const base = join(raiz, 'PostgreSQL');
      if (!existsSync(base)) continue;
      // Versão mais nova primeiro.
      for (const versao of readdirSync(base).sort((a, b) => Number(b) - Number(a))) {
        candidatos.push(join(base, versao, 'bin', exe));
      }
    }
  } else {
    for (const base of ['/usr/lib/postgresql', '/usr/pgsql', '/opt/homebrew/opt/libpq/bin', '/usr/local/opt/libpq/bin']) {
      if (!existsSync(base)) continue;
      candidatos.push(join(base, exe));
      for (const versao of readdirSync(base).sort((a, b) => Number(b) - Number(a))) candidatos.push(join(base, versao, 'bin', exe));
    }
  }
  const achado = candidatos.find((c) => existsSync(c) && statSync(c).isFile());
  if (!achado) {
    throw new Error(
      `Não encontrei o "${nome}" do PostgreSQL. Instale o PostgreSQL nesta máquina ` +
        `ou defina PG_BIN com a pasta "bin" dele (ex.: C:\\Program Files\\PostgreSQL\\17\\bin).`,
    );
  }
  return achado;
}

/** Executa um programa e devolve { ok, saida, erro }. Não lança. */
export function executar(programa, args, opcoes = {}) {
  const r = spawnSync(programa, args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, ...opcoes });
  return {
    ok: r.status === 0,
    codigo: r.status,
    saida: (r.stdout || '').trim(),
    erro: (r.stderr || '').trim() || (r.error ? r.error.message : ''),
  };
}

/** Consulta SQL de uma coluna/linha por registro (psql -At). */
export function sql(b, comando) {
  const c = conexao(b);
  const r = executar(ferramentaPg('psql'), [...c.args, '-At', '-v', 'ON_ERROR_STOP=1', '-c', comando], { env: c.env });
  if (!r.ok) throw new Error(r.erro || 'Falha ao consultar o banco.');
  return r.saida ? r.saida.split(/\r?\n/) : [];
}

/** Quantos registros existem nas tabelas principais (0 em tudo = banco vazio ou sem tabelas). */
export function contagens(b) {
  const tabelas = ['users', 'equipments', 'people', 'locations', 'cautelas', 'movements'];
  const existentes = sql(
    b,
    `select table_name from information_schema.tables where table_schema='${b.schema}' and table_name in (${tabelas.map((t) => `'${t}'`).join(',')})`,
  );
  const resultado = {};
  for (const t of tabelas) {
    resultado[t] = existentes.includes(t) ? Number(sql(b, `select count(*) from "${b.schema}"."${t}"`)[0]) : 0;
  }
  return resultado;
}

export function perguntar(texto) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((ok) => {
    let respondido = false;
    rl.question(texto, (r) => { respondido = true; rl.close(); ok(r.trim()); });
    // Entrada encerrada sem resposta (execução sem teclado): conta como resposta vazia.
    rl.on('close', () => { if (!respondido) ok(''); });
  });
}

/** Valor de `--nome valor` ou `--nome=valor` na linha de comando. */
export function argumento(nome) {
  const args = process.argv.slice(2);
  const i = args.findIndex((a) => a === `--${nome}` || a.startsWith(`--${nome}=`));
  if (i === -1) return undefined;
  if (args[i].includes('=')) return args[i].slice(args[i].indexOf('=') + 1);
  const proximo = args[i + 1];
  return proximo && !proximo.startsWith('--') ? proximo : '';
}
export const temArgumento = (nome) => argumento(nome) !== undefined;

export function carimbo(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export function enderecosNaRede() {
  return Object.values(networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
}

export function tamanhoLegivel(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

export function falhar(mensagem) {
  console.error(`\nERRO: ${mensagem}\n`);
  process.exit(1);
}
