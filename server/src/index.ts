import { networkInterfaces } from 'node:os';
import { PASTA_FRONTEND, criarApp } from './app.js';
import { env } from './env.js';
import { prisma } from './prisma.js';
import { PASTA_UPLOADS } from './routes/uploads.js';

const esperar = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

/**
 * Confere o banco antes de aceitar requisição. Quando a máquina acaba de
 * ligar, o PostgreSQL pode demorar alguns segundos: tenta por até um minuto
 * antes de desistir, em vez de cair na primeira falha.
 */
async function verificarBanco() {
  const TENTATIVAS = 20;
  for (let n = 1; n <= TENTATIVAS; n++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      break;
    } catch {
      if (n === TENTATIVAS) {
        console.error('\nNão foi possível conectar ao banco.\n');
        console.error('  · O PostgreSQL está rodando? (serviço do Windows ou `docker compose up -d`)');
        console.error('  · As tabelas existem?        npm run setup');
        console.error('  · DATABASE_URL em server/.env está correto?\n');
        process.exit(1);
      }
      if (n === 1) console.log('Aguardando o banco de dados ficar disponível…');
      await esperar(3000);
    }
  }
  if ((await prisma.user.count()) === 0) {
    console.warn('\nNenhum usuário cadastrado. Rode `npm run db:seed` para criar o administrador.\n');
  }
}

/** Endereços IPv4 desta máquina na rede (para mostrar por onde acessar). */
function enderecosNaRede(): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i!.address);
}

await verificarBanco();

const servidor = criarApp().listen(env.PORT, env.HOST, () => {
  const oQue = PASTA_FRONTEND ? 'PATRI' : 'PATRI API';
  console.log(`\n${oQue} no ar — ${new Date().toLocaleString('pt-BR')}`);
  console.log(`  Nesta máquina:  http://localhost:${env.PORT}`);
  if (env.HOST === '0.0.0.0' || env.HOST === '::') {
    for (const ip of enderecosNaRede()) console.log(`  Na rede:        http://${ip}:${env.PORT}`);
  }
  console.log(`  Fotos em:       ${PASTA_UPLOADS}\n`);
});

servidor.on('error', (erro: NodeJS.ErrnoException) => {
  if (erro.code === 'EADDRINUSE') {
    console.error(`\nA porta ${env.PORT} já está em uso. O PATRI já está rodando? Ou troque PORT em server/.env.\n`);
  } else {
    console.error(erro);
  }
  process.exit(1);
});

let encerrando = false;
async function encerrar() {
  if (encerrando) return;
  encerrando = true;
  // Se algo travar o encerramento, sai mesmo assim em 3 s.
  setTimeout(() => process.exit(0), 3000).unref();
  servidor.close();
  // Não espera conexões ociosas dos navegadores: encerra na hora.
  servidor.closeAllConnections();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', encerrar);
process.on('SIGTERM', encerrar);
