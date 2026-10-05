import { Router } from 'express';
import { auditar, carregarLocais, includeEquipamento, reindexar } from '../lib/core.js';
import { autenticar, somenteAdmin, usuarioAtual } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/error.js';
import { prisma } from '../prisma.js';
import { serializarEquipamento, serializarMovimento } from '../serializers.js';
import { pessoaSchema } from '../validation.js';

/** Pessoas que podem ficar com equipamentos. Não precisam ter login. */
export const peopleRouter = Router();
peopleRouter.use(autenticar);

peopleRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q ?? '').trim();
    const pessoas = await prisma.person.findMany({
      where: q
        ? {
            OR: [
              { nome: { contains: q, mode: 'insensitive' } },
              { matricula: { contains: q, mode: 'insensitive' } },
            ],
          }
        : undefined,
      include: {
        setor: true,
        _count: { select: { comEle: { where: { excluidoEm: null } } } },
      },
      orderBy: [{ ativo: 'desc' }, { nome: 'asc' }],
    });
    res.json(pessoas.map(({ _count, ...p }) => ({ ...p, itensAgora: _count.comEle })));
  }),
);

peopleRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const pessoa = await prisma.person.findUnique({
      where: { id: req.params.id },
      include: {
        setor: true,
        usuario: { select: { id: true, email: true } },
        comEle: { where: { excluidoEm: null }, include: includeEquipamento },
        cautelas: {
          orderBy: { numero: 'desc' },
          take: 30,
          select: {
            id: true,
            numero: true,
            ano: true,
            criadaEm: true,
            fechadaEm: true,
            retornoPrevisto: true,
            _count: { select: { itens: true } },
            itens: { where: { devolvidoEm: null }, select: { id: true } },
          },
        },
        movimentos: {
          orderBy: { data: 'desc' },
          take: 50,
          include: { equipment: { select: { id: true, nome: true, pr: true } } },
        },
      },
    });
    if (!pessoa) throw new AppError(404, 'Pessoa não encontrada.');

    const mapa = await carregarLocais();
    const { comEle, movimentos, cautelas, ...dados } = pessoa;
    res.json({
      ...dados,
      cautelas: cautelas.map((c) => ({
        id: c.id,
        numero: c.numero,
        ano: c.ano,
        criadaEm: c.criadaEm.toISOString(),
        fechadaEm: c.fechadaEm?.toISOString(),
        retornoPrevisto: c.retornoPrevisto?.toISOString(),
        total: c._count.itens,
        pendentes: c.itens.length,
      })),
      itens: comEle.map((i) => serializarEquipamento(i, mapa)),
      historico: movimentos.map((m) => ({
        ...serializarMovimento(m),
        equipamento: m.equipment,
      })),
    });
  }),
);

/** Qualquer usuário cria pessoa — é o que permite cadastrar na hora da saída. */
peopleRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const dados = pessoaSchema.parse(req.body);
    const criada = await prisma.person.create({ data: dados, include: { setor: true } });
    await auditar(usuarioAtual(req), 'Pessoa', 'criou', criada.nome, criada.id);
    res.status(201).json({ ...criada, itensAgora: 0 });
  }),
);

peopleRouter.patch(
  '/:id',
  somenteAdmin,
  asyncHandler(async (req, res) => {
    const dados = pessoaSchema.parse(req.body);
    const salva = await prisma.person.update({
      where: { id: req.params.id },
      data: dados,
      include: { setor: true },
    });
    await reindexar({ responsavelId: salva.id });
    await auditar(usuarioAtual(req), 'Pessoa', 'editou', salva.nome, salva.id);
    res.json(salva);
  }),
);

peopleRouter.delete(
  '/:id',
  somenteAdmin,
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    const [comEle, historico] = await Promise.all([
      prisma.equipment.count({ where: { responsavelId: id, excluidoEm: null } }),
      prisma.movement.count({ where: { pessoaId: id } }),
    ]);
    if (comEle) {
      throw new AppError(409, `Esta pessoa está com ${comEle} equipamento(s). Registre a devolução antes.`);
    }
    // Quem já teve histórico é desativado, não apagado: o histórico continua legível.
    if (historico) {
      const p = await prisma.person.update({ where: { id }, data: { ativo: false } });
      await auditar(usuarioAtual(req), 'Pessoa', 'desativou', p.nome, p.id);
      return res.json({ desativado: true });
    }
    const removida = await prisma.person.delete({ where: { id } });
    await auditar(usuarioAtual(req), 'Pessoa', 'excluiu', removida.nome, removida.id);
    res.status(204).end();
  }),
);
