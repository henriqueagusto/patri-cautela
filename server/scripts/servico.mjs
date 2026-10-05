// Mantém o PATRI no ar. É este script que a tarefa do Windows inicia junto
// com o computador.
//
//   node scripts/servico.mjs
//
// - inicia o servidor (dist/src/index.js);
// - se ele cair, inicia de novo sozinho (espera curta, que cresce se as quedas
//   se repetirem);
// - grava tudo em um arquivo de log por mês;
// - uma vez por dia faz o backup automático.
import { spawn } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fazerBackup, ultimoBackup } from './backup.mjs';
import { PASTA_SERVIDOR, configuracao } from './lib.mjs';

const cfg = configuracao();
const ENTRADA = join(PASTA_SERVIDOR, 'dist', 'src', 'index.js');
const ARQUIVO_PID = join(PASTA_SERVIDOR, '.patri-servico.json');
const HORA_DO_BACKUP = Number(cfg.env.BACKUP_HORA ?? 12); // 0–23; meio-dia: o notebook costuma estar ligado
const UM_DIA = 24 * 60 * 60 * 1000;

mkdirSync(cfg.logs, { recursive: true });

function registrar(texto) {
  const agora = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const arquivo = join(cfg.logs, `patri-${agora.getFullYear()}-${p(agora.getMonth() + 1)}.log`);
  const linhas = String(texto).split(/\r?\n/).filter((l) => l.trim());
  if (!linhas.length) return;
  const prefixo = `[${agora.toLocaleString('pt-BR')}] `;
  try {
    appendFileSync(arquivo, linhas.map((l) => prefixo + l).join('\n') + '\n');
  } catch {
    /* disco cheio ou pasta inacessível: seguir rodando é mais importante que o log */
  }
  if (process.stdout.isTTY) console.log(linhas.join('\n'));
}

if (!existsSync(ENTRADA)) {
  registrar(`Servidor não compilado: falta ${ENTRADA}. Rode "npm run build" em server/.`);
  process.exit(1);
}

let filho;
let encerrando = false;
let esperaMs = 3000;

function gravarPid() {
  try {
    writeFileSync(ARQUIVO_PID, JSON.stringify({ servico: process.pid, servidor: filho?.pid ?? null }));
  } catch { /* só usado por parar.mjs */ }
}

function iniciar() {
  const comecou = Date.now();
  registrar('Iniciando o servidor…');
  filho = spawn(process.execPath, [ENTRADA], {
    cwd: PASTA_SERVIDOR,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  gravarPid();
  filho.stdout.on('data', (d) => registrar(d));
  filho.stderr.on('data', (d) => registrar(d));
  filho.on('error', (erro) => registrar(`Falha ao iniciar o servidor: ${erro.message}`));
  filho.on('exit', (codigo, sinal) => {
    filho = undefined;
    if (encerrando) return;
    // Ficou de pé mais de um minuto: a queda é isolada, volta rápido.
    // Caiu logo: aumenta a espera (até 30 s) para não girar em falso.
    esperaMs = Date.now() - comecou > 60_000 ? 3000 : Math.min(esperaMs * 2, 30_000);
    registrar(`O servidor parou (código ${codigo ?? '-'}${sinal ? `, sinal ${sinal}` : ''}). Nova tentativa em ${esperaMs / 1000} s.`);
    setTimeout(iniciar, esperaMs);
  });
}

function encerrar() {
  if (encerrando) return;
  encerrando = true;
  registrar('Encerrando o PATRI.');
  rmSync(ARQUIVO_PID, { force: true });
  if (!filho) process.exit(0);
  filho.once('exit', () => process.exit(0));
  filho.kill();
  // Se o servidor não sair por bem em 5 s, é encerrado à força — nunca fica órfão.
  setTimeout(() => { try { filho?.kill('SIGKILL'); } catch { /* já saiu */ } process.exit(0); }, 5000);
}
process.on('SIGINT', encerrar);
process.on('SIGTERM', encerrar);
process.on('SIGBREAK', encerrar);

/* --- Backup automático diário -------------------------------------------- */

function backupSeForHora() {
  try {
    const ultimo = ultimoBackup();
    const idade = ultimo ? Date.now() - ultimo.quando.getTime() : Infinity;
    const naHora = new Date().getHours() === HORA_DO_BACKUP && idade > 6 * 60 * 60 * 1000;
    // Passou mais de um dia sem cópia (notebook estava desligado na hora): faz agora.
    if (!naHora && idade < UM_DIA + 60 * 60 * 1000) return;
    const feito = fazerBackup({ tipo: 'auto', silencioso: true });
    registrar(`Backup automático concluído: ${feito.pasta}`);
  } catch (erro) {
    registrar(`Backup automático falhou: ${erro.message}`);
  }
}

iniciar();
// Primeira conferência dois minutos após ligar (dá tempo de o banco subir); depois, a cada 20 min.
setTimeout(backupSeForHora, 2 * 60 * 1000).unref();
setInterval(backupSeForHora, 20 * 60 * 1000).unref();
