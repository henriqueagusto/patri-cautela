// Para o PATRI iniciado por servico.mjs (o serviço e o servidor).
//   node scripts/parar.mjs
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { EH_WINDOWS, PASTA_SERVIDOR, executar } from './lib.mjs';

const ARQUIVO_PID = join(PASTA_SERVIDOR, '.patri-servico.json');
if (!existsSync(ARQUIVO_PID)) {
  console.log('O PATRI não está rodando pelo serviço (nenhum registro encontrado).');
  process.exit(0);
}

const { servico, servidor } = JSON.parse(readFileSync(ARQUIVO_PID, 'utf8'));
const vivo = (pid) => {
  try { process.kill(pid, 0); return true; } catch (erro) { return erro.code === 'EPERM'; }
};

// O serviço primeiro (senão ele reinicia o servidor), depois o servidor.
for (const pid of [servico, servidor].filter(Boolean)) {
  if (!vivo(pid)) continue;
  if (EH_WINDOWS) executar('taskkill', ['/PID', String(pid), '/T', '/F']);
  else { try { process.kill(pid, 'SIGTERM'); } catch { /* já saiu */ } }
}

// Espera até 10 s o encerramento; quem não sair por bem é encerrado à força.
const pendentes = () => [servico, servidor].filter((pid) => pid && vivo(pid));
for (let i = 0; i < 20 && pendentes().length; i++) await new Promise((ok) => setTimeout(ok, 500));
if (!EH_WINDOWS) {
  for (const pid of pendentes()) { try { process.kill(pid, 'SIGKILL'); } catch { /* já saiu */ } }
  if (pendentes().length) await new Promise((ok) => setTimeout(ok, 500));
}
const restou = pendentes();
if (restou.length) {
  console.error(`Não consegui parar o(s) processo(s) ${restou.join(', ')}. Execute como administrador.`);
  process.exit(1);
}
rmSync(ARQUIVO_PID, { force: true });
console.log('PATRI parado.');
