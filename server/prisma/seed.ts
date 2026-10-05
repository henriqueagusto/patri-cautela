import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

/**
 * Carga inicial SEGURA: só cria o que está faltando e nunca apaga nada.
 *
 * - Configurações: cria a linha padrão se não existir.
 * - Categorias e motivos: cria os comuns só se o cadastro estiver vazio.
 * - Administrador: cria só se não houver nenhum usuário.
 *
 * Pode rodar quantas vezes quiser, inclusive em produção. Para zerar um banco
 * de desenvolvimento existe `npm run db:zerar-local` (prisma/zerar.ts).
 */
const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@patri.local';
const ADMIN_SENHA = process.env.ADMIN_SENHA ?? 'patri123';

const CATEGORIAS = [
  { nome: 'Câmera', icone: 'camera', cor: '#7F77DD' },
  { nome: 'Áudio', icone: 'mic', cor: '#1D9E75' },
  { nome: 'Vídeo', icone: 'video', cor: '#D85A30' },
  { nome: 'Iluminação', icone: 'lightbulb', cor: '#EF9F27' },
  { nome: 'Informática', icone: 'laptop', cor: '#378ADD' },
  { nome: 'Monitor', icone: 'monitor', cor: '#5DCAA5' },
  { nome: 'Acessório', icone: 'package', cor: '#888780' },
];

const MOTIVOS = [
  { nome: 'Empréstimo', prazoDias: 7 },
  { nome: 'Evento', prazoDias: 2 },
  { nome: 'Gravação externa', prazoDias: 3 },
  { nome: 'Manutenção', prazoDias: 30, colocaEmManutencao: true },
];

export async function semear(cliente: PrismaClient = prisma) {
  const feito: string[] = [];

  if (!(await cliente.settings.findUnique({ where: { id: 1 } }))) {
    await cliente.settings.create({ data: { id: 1, anoNumeroInicial: new Date().getFullYear() } });
    feito.push('configurações padrão');
  }
  if ((await cliente.category.count()) === 0) {
    await cliente.category.createMany({ data: CATEGORIAS });
    feito.push(`${CATEGORIAS.length} categorias`);
  }
  if ((await cliente.exitReason.count()) === 0) {
    await cliente.exitReason.createMany({ data: MOTIVOS });
    feito.push(`${MOTIVOS.length} motivos`);
  }
  let adminCriado = false;
  if ((await cliente.user.count()) === 0) {
    await cliente.user.create({
      data: {
        nome: 'Administrador',
        email: ADMIN_EMAIL,
        senhaHash: await bcrypt.hash(ADMIN_SENHA, 10),
        papel: 'ADMINISTRADOR',
      },
    });
    adminCriado = true;
    feito.push('administrador');
  }

  if (feito.length === 0) {
    console.log('\nNada a fazer: o banco já tem dados. Nenhum registro foi alterado.\n');
    return;
  }
  console.log(`\nCriado: ${feito.join(', ')}. Nenhum registro existente foi alterado.`);
  if (adminCriado) {
    console.log(`  Acesso: ${ADMIN_EMAIL} / ${ADMIN_SENHA}`);
    console.log('  Troque a senha no primeiro acesso (Perfil → Segurança).');
  }
  console.log('');
}

// Executado direto (npm run db:seed) — e não importado por zerar.ts.
if (process.argv[1]?.replace(/\\/g, '/').endsWith('prisma/seed.ts')) {
  semear()
    .catch((erro) => {
      console.error(erro);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
