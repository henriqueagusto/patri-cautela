import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { carregarLocais, includeEquipamento } from '../lib/core.js';
import { autenticar, somenteAdmin, usuarioAtual } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/error.js';
import { prisma } from '../prisma.js';
import { serializarEquipamento, serializarMovimento } from '../serializers.js';
import { perfilSchema, trocarSenhaSchema } from '../validation.js';

/** Dados do próprio usuário: perfil, senha, preferências, atividade. */
export const meRouter = Router();
meRouter.use(autenticar);

const camposPublicos = {
  id: true,
  nome: true,
  email: true,
  papel: true,
  foto: true,
  telefone: true,
  preferencias: true,
  personId: true,
  ultimoAcesso: true,
  criadoEm: true,
} as const;

meRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const eu = await prisma.user.findUnique({
      where: { id: usuarioAtual(req).id },
      select: camposPublicos,
    });
    if (!eu) throw new AppError(401, 'Sua sessão expirou. Faça login novamente.');
    res.json(eu);
  }),
);

meRouter.patch(
  '/',
  asyncHandler(async (req, res) => {
    const dados = perfilSchema.parse(req.body);
    const eu = usuarioAtual(req);
    const atual = await prisma.user.findUniqueOrThrow({ where: { id: eu.id } });

    // Dados da conta são do administrador. O usuário comum só ajusta as
    // próprias preferências de visualização.
    const mexeEmDados = dados.nome !== undefined || dados.telefone !== undefined || dados.foto !== undefined;
    if (mexeEmDados && eu.papel !== 'ADMINISTRADOR') {
      throw new AppError(403, 'Seus dados são alterados pelo administrador.');
    }

    const salvo = await prisma.user.update({
      where: { id: atual.id },
      data: {
        nome: dados.nome,
        telefone: dados.telefone,
        foto: dados.foto,
        preferencias: dados.preferencias
          ? { ...(atual.preferencias as object), ...dados.preferencias }
          : undefined,
      },
      select: camposPublicos,
    });
    res.json(salvo);
  }),
);

/** Só o administrador troca a própria senha por aqui; as demais são redefinidas em Usuários. */
meRouter.post(
  '/password',
  somenteAdmin,
  asyncHandler(async (req, res) => {
    const { atual, nova } = trocarSenhaSchema.parse(req.body);
    const eu = await prisma.user.findUniqueOrThrow({ where: { id: usuarioAtual(req).id } });

    if (!(await bcrypt.compare(atual, eu.senhaHash))) {
      throw new AppError(422, 'A senha atual não confere.');
    }
    await prisma.user.update({
      where: { id: eu.id },
      data: { senhaHash: await bcrypt.hash(nova, 10) },
    });
    res.status(204).end();
  }),
);

/** O que eu fiz recentemente e o que está sob minha responsabilidade. */
meRouter.get(
  '/activity',
  asyncHandler(async (req, res) => {
    const eu = await prisma.user.findUniqueOrThrow({ where: { id: usuarioAtual(req).id } });

    const [acoes, comigo, mapa, totais] = await Promise.all([
      prisma.movement.findMany({
        where: { usuarioId: eu.id },
        orderBy: { data: 'desc' },
        take: 15,
        include: { equipment: { select: { id: true, nome: true, pr: true } } },
      }),
      eu.personId
        ? prisma.equipment.findMany({
            where: { responsavelId: eu.personId, excluidoEm: null },
            include: includeEquipamento,
          })
        : Promise.resolve([]),
      carregarLocais(),
      prisma.movement.groupBy({
        by: ['tipo'],
        where: { usuarioId: eu.id },
        _count: { _all: true },
      }),
    ]);

    res.json({
      acoes: acoes.map((m) => ({ ...serializarMovimento(m), equipamento: m.equipment })),
      comigo: comigo.map((i) => serializarEquipamento(i, mapa)),
      totais: Object.fromEntries(totais.map((t) => [t.tipo.toLowerCase(), t._count._all])),
    });
  }),
);
