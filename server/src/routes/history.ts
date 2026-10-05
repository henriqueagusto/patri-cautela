import type { Prisma } from '@prisma/client';
import { Router } from 'express';
import { autenticar } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { prisma } from '../prisma.js';
import { serializarMovimento } from '../serializers.js';
import { historicoSchema } from '../validation.js';

export const historyRouter = Router();
historyRouter.use(autenticar);

const POR_PAGINA = 40;

/** Timeline global com filtros por pessoa, tipo, usuário, período e item. */
historyRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const f = historicoSchema.parse(req.query);

    const ate = f.ate ? new Date(`${f.ate}T23:59:59`) : undefined;
    const de = f.de ? new Date(`${f.de}T00:00:00`) : undefined;

    const where: Prisma.MovementWhereInput = {
      equipment: { excluidoEm: null },
      ...(f.tipo ? { tipo: f.tipo.toUpperCase() as Prisma.MovementWhereInput['tipo'] } : {}),
      ...(f.pessoa ? { pessoaId: f.pessoa } : {}),
      ...(f.usuario ? { usuarioId: f.usuario } : {}),
      ...(f.equipamento ? { equipmentId: f.equipamento } : {}),
      ...(de || ate ? { data: { gte: de, lte: ate } } : {}),
      ...(f.q
        ? {
            OR: [
              { equipment: { nome: { contains: f.q, mode: 'insensitive' } } },
              { equipment: { pr: { contains: f.q } } },
              { pessoaNome: { contains: f.q, mode: 'insensitive' } },
              { usuarioNome: { contains: f.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, eventos] = await Promise.all([
      prisma.movement.count({ where }),
      prisma.movement.findMany({
        where,
        orderBy: { data: 'desc' },
        skip: (f.pagina - 1) * POR_PAGINA,
        take: POR_PAGINA,
        include: {
          equipment: {
            select: { id: true, nome: true, pr: true, foto: true, category: true },
          },
        },
      }),
    ]);

    res.json({
      total,
      pagina: f.pagina,
      porPagina: POR_PAGINA,
      eventos: eventos.map((m) => ({
        ...serializarMovimento(m),
        equipamento: {
          id: m.equipment.id,
          nome: m.equipment.nome,
          pr: m.equipment.pr,
          foto: m.equipment.foto ?? undefined,
          categoria: {
            nome: m.equipment.category.nome,
            icone: m.equipment.category.icone,
            cor: m.equipment.category.cor,
          },
        },
      })),
    });
  }),
);
