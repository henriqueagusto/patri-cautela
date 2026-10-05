// Restaura um backup do PATRI (banco + fotos) NESTE computador.
//
//   npm run restaurar -- "C:/PATRI-dados/backups/patri-2026-10-05_120000-manual"
//   npm run restaurar -- --ultimo
//
// ATENÇÃO: substitui o conteúdo atual do banco pelo do backup. Por isso:
//   1. exige que o PATRI esteja parado;
//   2. faz antes uma cópia de segurança do estado atual;
//   3. pede a confirmação por escrito (RESTAURAR);
//   4. restaura numa única transação — se algo falhar, o banco fica como estava.
import { cpSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fazerBackup, ultimoBackup } from './backup.mjs';
import {
  argumento, banco, conexao, configuracao, contagens, executar, falhar, ferramentaPg, perguntar, temArgumento,
} from './lib.mjs';

const cfg = configuracao();
const b = banco(cfg.DATABASE_URL);

let pasta = process.argv.slice(2).find((a) => !a.startsWith('--') && a !== argumento('confirmar'));
if (temArgumento('ultimo')) pasta = ultimoBackup()?.pasta;
if (!pasta) falhar('Informe a pasta do backup, ou use --ultimo. Ex.: npm run restaurar -- "C:/PATRI-dados/backups/patri-…"');
pasta = resolve(pasta);
const dump = join(pasta, 'banco.dump');
if (!existsSync(dump)) falhar(`Não há "banco.dump" em ${pasta}. Essa pasta é mesmo um backup do PATRI?`);

const lista = executar(ferramentaPg('pg_restore'), ['--list', dump]);
if (!lista.ok) falhar(`O arquivo do backup está ilegível: ${lista.erro}`);

// O servidor não pode estar atendendo durante a troca do banco.
const noAr = await fetch(`http://127.0.0.1:${cfg.PORT}/api/health`, { signal: AbortSignal.timeout(3000) }).then(() => true, () => false);
if (noAr && !temArgumento('servidor-parado')) {
  falhar(`O PATRI está rodando na porta ${cfg.PORT}. Pare-o antes de restaurar (windows\\parar.cmd) e inicie de novo depois.`);
}

let atuais;
try {
  atuais = contagens(b);
} catch (erro) {
  falhar(`Não consegui falar com o banco "${b.nome}" em ${b.host}: ${erro.message}\nO PostgreSQL está rodando? O banco já foi criado (npm run configurar)?`);
}

const info = existsSync(join(pasta, 'info.json')) ? JSON.parse(readFileSync(join(pasta, 'info.json'), 'utf8')) : undefined;
console.log(`\nBackup: ${pasta}`);
if (info) console.log(`  feito em ${new Date(info.criadoEm).toLocaleString('pt-BR')} · ${info.fotos?.arquivos ?? 0} foto(s)`);
console.log(`\nBanco de destino: "${b.nome}" em ${b.host}`);
console.log(`  hoje ele tem: ${Object.entries(atuais).map(([t, n]) => `${t}=${n}`).join('  ')}`);
console.log('\nTudo o que está nesse banco será SUBSTITUÍDO pelo conteúdo do backup.');

const resposta = argumento('confirmar') ?? (await perguntar('Para continuar, digite RESTAURAR: '));
if (resposta !== 'RESTAURAR') falhar('Restauração cancelada. Nada foi alterado.');

// Cópia do estado atual, sempre, para poder voltar atrás.
try {
  const seguranca = fazerBackup({ tipo: 'antes-de-restaurar', silencioso: true });
  console.log(`\nCópia de segurança do estado atual: ${seguranca.pasta}`);
} catch (erro) {
  falhar(`Não consegui fazer a cópia de segurança do estado atual (${erro.message}). Restauração cancelada; nada foi alterado.`);
}

console.log('\nRestaurando o banco…');
const c = conexao(b);
const r = executar(
  ferramentaPg('pg_restore'),
  [...c.args, '--clean', '--if-exists', '--no-owner', '--no-acl', '--single-transaction', '--exit-on-error', dump],
  { env: c.env },
);
if (!r.ok) falhar(`A restauração falhou e foi desfeita — o banco continua como estava.\n${r.erro}`);

const origemFotos = join(pasta, 'uploads');
if (existsSync(origemFotos)) {
  mkdirSync(cfg.uploads, { recursive: true });
  // Copia por cima; fotos que já existem e não estão no backup são mantidas.
  cpSync(origemFotos, cfg.uploads, { recursive: true });
  console.log(`Fotos copiadas para ${cfg.uploads}`);
}

const depois = contagens(b);
console.log(`\nRestaurado. Agora o banco tem: ${Object.entries(depois).map(([t, n]) => `${t}=${n}`).join('  ')}`);
console.log('Inicie o PATRI novamente (windows\\iniciar.cmd).\n');
