// Mostra se o PATRI está funcionando neste computador.
//   npm run status
import { existsSync, readdirSync } from 'node:fs';
import { ultimoBackup } from './backup.mjs';
import { configuracao, enderecosNaRede } from './lib.mjs';

const cfg = configuracao();
const base = `http://127.0.0.1:${cfg.PORT}`;
const linha = (ok, texto) => console.log(`  ${ok ? '[ OK ]' : '[FALHA]'} ${texto}`);
let problemas = 0;

console.log('\nPATRI — situação do servidor\n');

const saude = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(5000) })
  .then(async (r) => ({ status: r.status, corpo: await r.json().catch(() => ({})) }))
  .catch(() => undefined);

if (!saude) {
  linha(false, `Servidor não responde na porta ${cfg.PORT}. Inicie com windows\\iniciar.cmd e veja o log em ${cfg.logs}`);
  problemas++;
} else {
  linha(true, `Servidor respondendo na porta ${cfg.PORT}`);
  linha(saude.corpo.banco === true, saude.corpo.banco ? 'Banco de dados acessível' : 'Servidor no ar, mas SEM acesso ao banco (o PostgreSQL está rodando?)');
  if (!saude.corpo.banco) problemas++;

  const tela = await fetch(`${base}/`, { headers: { Accept: 'text/html' }, signal: AbortSignal.timeout(5000) })
    .then(async (r) => r.ok && (await r.text()).includes('<div id="root"'))
    .catch(() => false);
  linha(tela, tela ? 'Telas do sistema sendo entregues' : 'As telas não estão sendo entregues (rode "npm run build" na raiz e confira FRONTEND_DIR)');
  if (!tela) problemas++;
}

const fotos = existsSync(cfg.uploads) ? readdirSync(cfg.uploads).filter((n) => !n.startsWith('.')).length : -1;
linha(fotos >= 0, fotos >= 0 ? `Pasta de fotos: ${cfg.uploads} (${fotos} arquivo(s))` : `Pasta de fotos não existe: ${cfg.uploads}`);
if (fotos < 0) problemas++;

const ultimo = ultimoBackup();
const horas = ultimo ? (Date.now() - ultimo.quando.getTime()) / 36e5 : Infinity;
linha(horas < 48, ultimo ? `Último backup: ${ultimo.quando.toLocaleString('pt-BR')} (${ultimo.nome})` : `Nenhum backup ainda em ${cfg.backups}`);
if (horas >= 48) problemas++;

const ips = enderecosNaRede();
console.log('\n  Endereço para os outros aparelhos (mesmo Wi-Fi):');
if (ips.length) for (const ip of ips) console.log(`    http://${ip}:${cfg.PORT}`);
else console.log('    (este computador não está conectado a nenhuma rede agora)');
console.log('');
process.exit(problemas ? 1 : 0);
