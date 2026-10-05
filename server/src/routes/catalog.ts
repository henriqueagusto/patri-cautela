import { Router } from 'express';
import { auditar, reindexar } from '../lib/core.js';
import { autenticar, somenteAdmin, usuarioAtual } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/error.js';
import { prisma } from '../prisma.js';
import { categoriaSchema, motivoSchema, setorSchema } from '../validation.js';

/**
 * Cadastros simples: categorias, setores/destinos e motivos de saída.
 * Qualquer usuário lê (a interface precisa das listas); só administrador altera.
 */
export const catalogRouter = Router();
catalogRouter.use(autenticar);

/* --- Categorias ------------------------------------------------------------ */

catalogRouter.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const categorias = await prisma.category.findMany({
      orderBy: { nome: 'asc' },
      include: { _count: { select: { equipamentos: { where: { excluidoEm: null } } } } },
    });
    res.json(categorias.map(({ _count, ...c }) => ({ ...c, total: _count.equipamentos })));
  }),
);

catalogRouter.post(
  '/categories',
  somenteAdmin,
  asyncHandler(async (req, res) => {
    const dados = categoriaSchema.parse(req.body);
    const criada = await prisma.category.create({ data: dados });
    await auditar(usuarioAtual(req), 'Categoria', 'criou', criada.nome, criada.id);
    res.status(201).json(criada);
  }),
);

catalogRouter.patch(
  '/categories/:id',
  somenteAdmin,
  asyncHandler(async (req, res) => {
    const dados = categoriaSchema.parse(req.body);
    const atual = await prisma.category.findUniqueOrThrow({ where: { id: req.params.id } });
    const salva = await prisma.category.update({ where: { id: atual.id }, data: dados });
    if (atual.nome !== salva.nome) await reindexar({ categoryId: salva.id });
    await auditar(usuarioAtual(req), 'Categoria', 'editou', salva.nome, salva.id);
    res.json(salva);
  }),
);

catalogRouter.delete(
  '/categories/:id',
  somenteAdmin,
  asyncHandler(async (req, res) => {
    const emUso = await prisma.equipment.count({ where: { categoryId: req.params.id } });
    if (emUso) {
      throw new AppError(409, `Esta categoria tem ${emUso} equipamento(s). Mude-os antes de excluir.`);
    }
    const removida = await prisma.category.delete({ where: { id: req.params.id } });
    await auditar(usuarioAtual(req), 'Categoria', 'excluiu', removida.nome, removida.id);
    res.status(204).end();
  }),
);

/* --- Setores / destinos ---------------------------------------------------- */

catalogRouter.get(
  '/sectors',
  asyncHandler(async (_req, res) => {
    const setores = await prisma.sector.findMany({
      orderBy: { nome: 'asc' },
      include: { _count: { select: { pessoas: true, equipamentos: true } } },
    });
    res.json(
      setores.map(({ _count, ...s }) => ({
        ...s,
        pessoas: _count.pessoas,
        itensAgora: _count.equipamentos,
      })),
    );
  }),
);

catalogRouter.post(
  '/sectors',
  asyncHandler(async (req, res) => {
    // Qualquer usuário pode criar um destino durante a saída de um item.
    const dados = setorSchema.parse(req.body);
    const criado = await prisma.sector.create({ data: dados });
    await auditar(usuarioAtual(req), 'Setor', 'criou', criado.nome, criado.id);
    res.status(201).json(criado);
  }),
);

catalogRouter.patch(
  '/sectors/:id',
  somenteAdmin,
  asyncHandler(async (req, res) => {
    const dados = setorSchema.parse(req.body);
    const salvo = await prisma.sector.update({ where: { id: req.params.id }, data: dados });
    await reindexar({ destinoId: salvo.id });
    await auditar(usuarioAtual(req), 'Setor', 'editou', salvo.nome, salvo.id);
    res.json(salvo);
  }),
);

catalogRouter.delete(
  '/sectors/:id',
  somenteAdmin,
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    const [pessoas, itens, historico] = await Promise.all([
      prisma.person.count({ where: { setorId: id } }),
      prisma.equipment.count({ where: { destinoId: id } }),
      prisma.movement.count({ where: { setorId: id } }),
    ]);
    if (itens) throw new AppError(409, 'Há equipamentos neste destino agora. Devolva-os antes.');
    if (pessoas || historico) {
      const s = await prisma.sector.update({ where: { id }, data: { ativo: false } });
      await auditar(usuarioAtual(req), 'Setor', 'desativou', s.nome, s.id);
      return res.json({ desativado: true });
    }
    const removido = await prisma.sector.delete({ where: { id } });
    await auditar(usuarioAtual(req), 'Setor', 'excluiu', removido.nome, removido.id);
    res.status(204).end();
  }),
);

/* --- Motivos de saída ------------------------------------------------------ */

catalogRouter.get(
  '/reasons',
  asyncHandler(async (_req, res) => {
    res.json(await prisma.exitReason.findMany({ orderBy: { nome: 'asc' } }));
  }),
);

catalogRouter.post(
  '/reasons',
  somenteAdmin,
  asyncHandler(async (req, res) => {
    const dados = motivoSchema.parse(req.body);
    const criado = await prisma.exitReason.create({ data: dados });
    await auditar(usuarioAtual(req), 'Motivo de saída', 'criou', criado.nome, criado.id);
    res.status(201).json(criado);
  }),
);

catalogRouter.patch(
  '/reasons/:id',
  somenteAdmin,
  asyncHandler(async (req, res) => {
    const dados = motivoSchema.parse(req.body);
    const salvo = await prisma.exitReason.update({ where: { id: req.params.id }, data: dados });
    await auditar(usuarioAtual(req), 'Motivo de saída', 'editou', salvo.nome, salvo.id);
    res.json(salvo);
  }),
);

catalogRouter.delete(
  '/reasons/:id',
  somenteAdmin,
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    const usado = await prisma.movement.count({ where: { motivoId: id } });
    if (usado) {
      const m = await prisma.exitReason.update({ where: { id }, data: { ativo: false } });
      await auditar(usuarioAtual(req), 'Motivo de saída', 'desativou', m.nome, m.id);
      return res.json({ desativado: true });
    }
    const removido = await prisma.exitReason.delete({ where: { id } });
    await auditar(usuarioAtual(req), 'Motivo de saída', 'excluiu', removido.nome, removido.id);
    res.status(204).end();
  }),
);
