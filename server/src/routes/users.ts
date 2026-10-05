import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { auditar } from '../lib/core.js';
import { autenticar, somenteAdmin, usuarioAtual } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/error.js';
import { prisma } from '../prisma.js';
import {
  atualizarUsuarioSchema,
  criarUsuarioSchema,
  redefinirSenhaSchema,
} from '../validation.js';

/** Contas de acesso ao sistema. Só administrador. */
export const usersRouter = Router();
usersRouter.use(autenticar, somenteAdmin);

const campos = {
  id: true,
  nome: true,
  email: true,
  papel: true,
  ativo: true,
  foto: true,
  ultimoAcesso: true,
  criadoEm: true,
  person: { select: { id: true, nome: true } },
} as const;

usersRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(
      await prisma.user.findMany({ select: campos, orderBy: [{ ativo: 'desc' }, { nome: 'asc' }] }),
    );
  }),
);

usersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const dados = criarUsuarioSchema.parse(req.body);
    if (await prisma.user.findUnique({ where: { email: dados.email } })) {
      throw new AppError(409, 'Já existe uma conta com este e-mail.');
    }
    const criado = await prisma.user.create({
      data: {
        nome: dados.nome,
        email: dados.email,
        papel: dados.papel,
        personId: dados.personId,
        senhaHash: await bcrypt.hash(dados.senha, 10),
      },
      select: campos,
    });
    await auditar(usuarioAtual(req), 'Usuário', 'criou', `${criado.nome} (${criado.email})`, criado.id);
    res.status(201).json(criado);
  }),
);

/** Garante que o sistema nunca fique sem administrador ativo. */
async function garantirOutroAdmin(id: string) {
  const outros = await prisma.user.count({
    where: { papel: 'ADMINISTRADOR', ativo: true, id: { not: id } },
  });
  if (!outros) throw new AppError(409, 'O sistema precisa de pelo menos um administrador ativo.');
}

usersRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    const dados = atualizarUsuarioSchema.parse(req.body);
    const atual = await prisma.user.findUniqueOrThrow({ where: { id } });

    const perdeAdmin =
      atual.papel === 'ADMINISTRADOR' &&
      ((dados.papel && dados.papel !== 'ADMINISTRADOR') || dados.ativo === false);
    if (perdeAdmin) await garantirOutroAdmin(id);

    const salvo = await prisma.user.update({ where: { id }, data: dados, select: campos });
    await auditar(usuarioAtual(req), 'Usuário', 'editou', `${salvo.nome} (${salvo.email})`, salvo.id);
    res.json(salvo);
  }),
);

usersRouter.post(
  '/:id/password',
  asyncHandler(async (req, res) => {
    const { senha } = redefinirSenhaSchema.parse(req.body);
    const salvo = await prisma.user.update({
      where: { id: req.params.id },
      data: { senhaHash: await bcrypt.hash(senha, 10) },
    });
    await auditar(usuarioAtual(req), 'Usuário', 'editou', `Redefiniu a senha de ${salvo.nome}`, salvo.id);
    res.status(204).end();
  }),
);
