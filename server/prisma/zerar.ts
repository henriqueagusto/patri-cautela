import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { semear } from './seed.js';

/**
 * APAGA TODOS OS DADOS e recria só o administrador e os cadastros-base.
 * Existe apenas para o banco de desenvolvimento (docker compose).
 *
 * Três travas, sem exceção:
 *   1. Recusa quando server/.env marca PATRI_PRODUCAO (o notebook-servidor:
 *      lá o banco "local" é o banco de verdade).
 *   2. O banco precisa estar na própria máquina (localhost / 127.0.0.1).
 *      Banco do Render ou qualquer endereço remoto: recusa sempre.
 *   3. É preciso confirmar explicitamente:
 *        CONFIRMAR_ZERAR=APAGAR-TUDO npm run db:zerar-local
 *      (Windows PowerShell: $env:CONFIRMAR_ZERAR="APAGAR-TUDO"; npm run db:zerar-local)
 *
 * Não usa `--force-reset`: a estrutura das tabelas nunca é derrubada.
 */
if (process.env.PATRI_PRODUCAO && !/^(0|nao|não|false|no)$/i.test(process.env.PATRI_PRODUCAO)) {
  console.error('\nRecusado: este computador está configurado como servidor do PATRI (PATRI_PRODUCAO em server/.env).');
  console.error('Aqui o banco local é o banco de verdade. Este comando não roda neste computador.\n');
  process.exit(1);
}

const url = process.env.DATABASE_URL ?? '';
let host = '';
try {
  host = new URL(url).hostname;
} catch {
  host = '';
}

if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(host)) {
  console.error(`\nRecusado: o banco em DATABASE_URL não é local (host: "${host || 'inválido'}").`);
  console.error('Este comando só zera o banco de desenvolvimento da própria máquina.\n');
  process.exit(1);
}
if (process.env.CONFIRMAR_ZERAR !== 'APAGAR-TUDO') {
  console.error('\nEste comando APAGA TODOS OS DADOS do banco local.');
  console.error('Para confirmar, rode:  CONFIRMAR_ZERAR=APAGAR-TUDO npm run db:zerar-local\n');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  console.log('Apagando todos os dados do banco local…');
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.recentAccess.deleteMany(),
    prisma.favorite.deleteMany(),
    prisma.movement.deleteMany(),
    prisma.cautelaItem.deleteMany(),
    prisma.equipment.updateMany({ data: { cautelaId: null } }),
    prisma.cautela.deleteMany(),
    prisma.equipment.deleteMany(),
    prisma.user.deleteMany(),
    prisma.person.deleteMany(),
    prisma.sector.deleteMany(),
    prisma.exitReason.deleteMany(),
    prisma.category.deleteMany(),
  ]);
  // Locais têm auto-relacionamento com Restrict: apagar das folhas para a raiz.
  while ((await prisma.location.count()) > 0) {
    await prisma.location.deleteMany({ where: { filhos: { none: {} } } });
  }
  await prisma.settings.deleteMany();
  await semear(prisma);
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
