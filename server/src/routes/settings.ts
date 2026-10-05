import { Router } from 'express';
import { auditar, obterSettings } from '../lib/core.js';
import { autenticar, somenteAdmin, usuarioAtual } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { prisma } from '../prisma.js';
import { settingsSchema } from '../validation.js';

export const settingsRouter = Router();
settingsRouter.use(autenticar);

settingsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(await obterSettings());
  }),
);

settingsRouter.patch(
  '/',
  somenteAdmin,
  asyncHandler(async (req, res) => {
    const dados = settingsSchema.parse(req.body);
    await obterSettings();
    const salvo = await prisma.settings.update({ where: { id: 1 }, data: dados });
    await auditar(usuarioAtual(req), 'Configurações', 'editou', Object.keys(dados).join(', '));
    res.json(salvo);
  }),
);

/** Registro de auditoria dos cadastros e configurações. */
settingsRouter.get(
  '/audit',
  somenteAdmin,
  asyncHandler(async (req, res) => {
    const pagina = Math.max(1, Number(req.query.pagina) || 1);
    const [total, registros] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.findMany({ orderBy: { data: 'desc' }, skip: (pagina - 1) * 50, take: 50 }),
    ]);
    res.json({ total, pagina, registros });
  }),
);
