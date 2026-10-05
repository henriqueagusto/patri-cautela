// Traz os dados do PATRI que está no Render para este computador.
//
//   npm run migrar-do-render -- --origem "postgresql://…External Database URL…" --site "https://SEU-BACKEND.onrender.com"
//
// No Render, este script SÓ LÊ: copia o banco (pg_dump) e baixa as fotos.
// Nada é apagado nem alterado lá. O Render continua funcionando como antes.
//
// Neste computador:
//   1. guarda a cópia do Render na pasta de backups (fica como backup permanente);
//   2. se o banco local já tiver dados, faz backup dele e pede confirmação;
//   3. carrega a cópia no banco local, numa única transação;
//   4. baixa para a pasta de fotos os arquivos que ainda existirem no Render.
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fazerBackup } from './backup.mjs';
import {
  argumento, banco, carimbo, conexao, configuracao, contagens, executar, falhar, ferramentaPg, perguntar, sql,
  tamanhoLegivel,
} from './lib.mjs';

const cfg = configuracao();
const local = banco(cfg.DATABASE_URL);
if (!local.local) falhar(`O banco de destino (server/.env) precisa ser desta máquina, e é "${local.host}".`);

// O servidor não pode estar atendendo durante a troca do banco.
const noAr = await fetch(`http://127.0.0.1:${cfg.PORT}/api/health`, { signal: AbortSignal.timeout(3000) }).then(() => true, () => false);
if (noAr) falhar(`O PATRI está rodando na porta ${cfg.PORT}. Pare-o antes (windows\\parar.cmd) e inicie de novo depois.`);

const urlOrigem = argumento('origem') || (await perguntar('External Database URL do Render: '));
if (!urlOrigem) falhar('Informe a External Database URL (painel do Render → seu PostgreSQL → Connections).');
let origem;
try {
  origem = banco(urlOrigem);
} catch {
  falhar('A URL do banco do Render não parece válida. Ela começa com postgresql://');
}
if (origem.local) falhar('A origem informada é um banco local. Use a External Database URL do Render.');
// O Render exige conexão criptografada para acesso externo.
origem.ssl = origem.ssl || 'require';

const site = (argumento('site') || '').replace(/\/+$/, '');

/* --- 1. Copiar o banco do Render (somente leitura) ------------------------- */

const pasta = join(cfg.backups, `patri-${carimbo()}-render`);
mkdirSync(pasta, { recursive: true });
const dump = join(pasta, 'banco.dump');

console.log(`\nCopiando o banco do Render (${origem.host})… pode levar um minuto se ele estiver "dormindo".`);
const co = conexao(origem);
const copia = executar(ferramentaPg('pg_dump'), [...co.args, '-Fc', '--no-owner', '--no-acl', '-f', dump], {
  env: { ...co.env, PGCONNECT_TIMEOUT: '90' },
});
if (!copia.ok) {
  falhar(
    `Não consegui copiar o banco do Render:\n${copia.erro}\n\n` +
      '· "server version mismatch": instale neste computador um PostgreSQL igual ou mais novo que o do Render.\n' +
      '· Erro de conexão: confira a URL (tem que ser a External) e se o banco do Render ainda existe.\n' +
      'Nada foi alterado, nem lá nem aqui.',
  );
}
const lista = executar(ferramentaPg('pg_restore'), ['--list', dump]);
if (!lista.ok) falhar(`A cópia baixada está ilegível: ${lista.erro}`);

const doRender = contagens(origem);
writeFileSync(join(pasta, 'info.json'), JSON.stringify({ criadoEm: new Date().toISOString(), tipo: 'render', origem: origem.host, registros: doRender }, null, 2));
console.log(`Cópia guardada em ${pasta} (${tamanhoLegivel(statSync(dump).size)})`);
console.log(`  no Render: ${Object.entries(doRender).map(([t, n]) => `${t}=${n}`).join('  ')}`);

/* --- 2. Proteger o que já existe aqui ------------------------------------- */

let aqui;
try {
  aqui = contagens(local);
} catch (erro) {
  falhar(`Não consegui falar com o banco local "${local.nome}": ${erro.message}\nRode antes: npm run configurar`);
}
const tabelasLocais = sql(local, `select count(*) from information_schema.tables where table_schema='${local.schema}'`)[0] !== '0';
const dadosDeUso = aqui.equipments + aqui.people + aqui.locations + aqui.cautelas;

if (dadosDeUso > 0) {
  console.log(`\nO banco deste computador JÁ TEM dados: ${Object.entries(aqui).map(([t, n]) => `${t}=${n}`).join('  ')}`);
  console.log('Continuar SUBSTITUI esses dados pelos do Render (antes, é feito um backup deles).');
  const resposta = argumento('confirmar') ?? (await perguntar('Para substituir, digite SUBSTITUIR: '));
  if (resposta !== 'SUBSTITUIR') falhar('Migração interrompida. O banco local não foi alterado. A cópia do Render ficou guardada.');
}
if (tabelasLocais && Object.values(aqui).some((n) => n > 0)) {
  const seguranca = fazerBackup({ tipo: 'antes-de-migrar', silencioso: true });
  console.log(`Backup do banco local antes da troca: ${seguranca.pasta}`);
}

/* --- 3. Carregar no banco local ------------------------------------------ */

console.log('\nCarregando os dados no banco local…');
const cl = conexao(local);
const carga = executar(
  ferramentaPg('pg_restore'),
  [...cl.args, '--clean', '--if-exists', '--no-owner', '--no-acl', '--single-transaction', '--exit-on-error', dump],
  { env: cl.env },
);
if (!carga.ok) falhar(`A carga falhou e foi desfeita — o banco local continua como estava.\n${carga.erro}`);

const depois = contagens(local);
const iguais = Object.keys(doRender).every((t) => doRender[t] === depois[t]);
console.log(`  aqui agora: ${Object.entries(depois).map(([t, n]) => `${t}=${n}`).join('  ')}`);
console.log(iguais ? '  Conferido: as quantidades batem com as do Render.' : '  ATENÇÃO: as quantidades NÃO batem com as do Render. Não desative o Render; me avise.');

/* --- 4. Fotos ----------------------------------------------------------------- */

const caminhos = sql(
  local,
  `select foto from equipments where foto like '/uploads/%'
   union select foto from people where foto like '/uploads/%'
   union select foto from users where foto like '/uploads/%'
   union select foto from locations where foto like '/uploads/%'
   union select logo from settings where logo like '/uploads/%'`,
);
mkdirSync(cfg.uploads, { recursive: true });
let baixadas = 0;
let jaTinha = 0;
const perdidas = [];

if (caminhos.length && !site) {
  console.log(`\nHá ${caminhos.length} foto(s) citada(s) no banco. Para tentar baixá-las, rode de novo com --site "https://SEU-BACKEND.onrender.com".`);
} else {
  if (caminhos.length) console.log(`\nBaixando ${caminhos.length} foto(s) de ${site}…`);
  for (const caminho of caminhos) {
    const nome = basename(caminho);
    const destino = join(cfg.uploads, nome);
    if (existsSync(destino)) { jaTinha++; continue; }
    try {
      const r = await fetch(`${site}${caminho}`, { signal: AbortSignal.timeout(90_000) });
      const tipo = r.headers.get('content-type') || '';
      if (!r.ok || !tipo.startsWith('image/')) throw new Error(String(r.status));
      writeFileSync(destino, Buffer.from(await r.arrayBuffer()));
      baixadas++;
    } catch {
      perdidas.push(nome);
    }
  }
  if (caminhos.length) {
    console.log(`  baixadas: ${baixadas}   já estavam aqui: ${jaTinha}   não existem mais no Render: ${perdidas.length}`);
    if (perdidas.length) {
      writeFileSync(join(pasta, 'fotos-nao-encontradas.txt'), perdidas.join('\n') + '\n');
      console.log('  O Render apaga as fotos a cada reinício; essas precisam ser enviadas de novo pela tela do equipamento.');
      console.log(`  Lista em ${join(pasta, 'fotos-nao-encontradas.txt')}`);
    }
  }
}

console.log('\nPróximo passo:  npm run db:push   (ajusta a estrutura do banco para esta versão; não apaga dados)');
console.log('Depois inicie o PATRI e confira os dados antes de desativar qualquer coisa no Render.\n');
process.exit(iguais ? 0 : 2);
