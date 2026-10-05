import { Router } from 'express';
import { carregarLocais, includeEquipamento } from '../lib/core.js';
import { autenticar, somenteAdmin, usuarioAtual } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/error.js';
import { prisma } from '../prisma.js';
import { serializarEquipamento } from '../serializers.js';

/** Favoritos e recentes (por usuário) e lixeira. */
export const collectionsRouter = Router();
collectionsRouter.use(autenticar);

const ativo = { excluidoEm: null };

collectionsRouter.get(
  '/favorites',
  asyncHandler(async (req, res) => {
    const [favoritos, mapa] = await Promise.all([
      prisma.favorite.findMany({
        where: { userId: usuarioAtual(req).id, equipment: ativo },
        include: { equipment: { include: includeEquipamento } },
        orderBy: { criadoEm: 'desc' },
      }),
      carregarLocais(),
    ]);
    res.json(favoritos.map((f) => serializarEquipamento(f.equipment, mapa)));
  }),
);

collectionsRouter.put(
  '/favorites/:equipmentId',
  asyncHandler(async (req, res) => {
    const userId = usuarioAtual(req).id;
    const equipmentId = req.params.equipmentId as string;
    await prisma.favorite.upsert({
      where: { userId_equipmentId: { userId, equipmentId } },
      create: { userId, equipmentId },
      update: {},
    });
    res.status(204).end();
  }),
);

collectionsRouter.delete(
  '/favorites/:equipmentId',
  asyncHandler(async (req, res) => {
    await prisma.favorite.deleteMany({
      where: { userId: usuarioAtual(req).id, equipmentId: req.params.equipmentId },
    });
    res.status(204).end();
  }),
);

collectionsRouter.get(
  '/recents',
  asyncHandler(async (req, res) => {
    const [acessos, mapa] = await Promise.all([
      prisma.recentAccess.findMany({
        where: { userId: usuarioAtual(req).id, equipment: ativo },
        include: { equipment: { include: includeEquipamento } },
        orderBy: { acessadoEm: 'desc' },
        take: 20,
      }),
      carregarLocais(),
    ]);
    res.json(acessos.map((a) => serializarEquipamento(a.equipment, mapa)));
  }),
);

collectionsRouter.post(
  '/recents/:equipmentId',
  asyncHandler(async (req, res) => {
    const userId = usuarioAtual(req).id;
    const equipmentId = req.params.equipmentId as string;
    await prisma.recentAccess.upsert({
      where: { userId_equipmentId: { userId, equipmentId } },
      create: { userId, equipmentId },
      update: { acessadoEm: new Date() },
    });
    res.status(204).end();
  }),
);

/* --- Lixeira --------------------------------------------------------------- */

collectionsRouter.get(
  '/trash',
  asyncHandler(async (_req, res) => {
    const [itens, mapa] = await Promise.all([
      prisma.equipment.findMany({
        where: { excluidoEm: { not: null } },
        include: { ...includeEquipamento, excluidoPor: { select: { nome: true } } },
        orderBy: { excluidoEm: 'desc' },
      }),
      carregarLocais(),
    ]);
    res.json(
      itens.map((i) => ({
        item: serializarEquipamento(i, mapa),
        excluidoEm: i.excluidoEm?.toISOString(),
        excluidoPor: i.excluidoPor?.nome ?? 'Desconhecido',
      })),
    );
  }),
);

collectionsRouter.post(
  '/trash/:id/restore',
  somenteAdmin,
  asyncHandler(async (req, res) => {
    const item = await prisma.equipment.findFirst({
      where: { id: req.params.id, excluidoEm: { not: null } },
    });
    if (!item) throw new AppError(404, 'Este item não está na lixeira.');
    await prisma.equipment.update({
      where: { id: item.id },
      data: { excluidoEm: null, excluidoPorId: null },
    });
    res.status(204).end();
  }),
);

collectionsRouter.delete(
  '/trash/:id',
  somenteAdmin,
  asyncHandler(async (req, res) => {
    const item = await prisma.equipment.findFirst({
      where: { id: req.params.id, excluidoEm: { not: null } },
    });
    if (!item) throw new AppError(404, 'Este item não está na lixeira.');
    await prisma.equipment.delete({ where: { id: item.id } });
    res.status(204).end();
  }),
);
