import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { obterSettings } from '../lib/core.js';
import { assinarToken } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/error.js';
import { prisma } from '../prisma.js';
import { loginSchema } from '../validation.js';

export const authRouter = Router();

/** Nome e logo da instituição para a tela de login. Público. */
authRouter.get(
  '/branding',
  asyncHandler(async (_req, res) => {
    const s = await obterSettings();
    res.json({ nomeInstituicao: s.nomeInstituicao, subtitulo: s.subtitulo, logo: s.logo });
  }),
);

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, senha } = loginSchema.parse(req.body);
    const usuario = await prisma.user.findUnique({ where: { email } });

    // Mesma mensagem para e-mail inexistente e senha errada.
    const invalido = new AppError(401, 'E-mail ou senha incorretos.');
    if (!usuario || !(await bcrypt.compare(senha, usuario.senhaHash))) throw invalido;
    if (!usuario.ativo) throw new AppError(403, 'Esta conta está desativada. Fale com o administrador.');

    await prisma.user.update({ where: { id: usuario.id }, data: { ultimoAcesso: new Date() } });

    const dados = { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel };
    res.json({ token: assinarToken(dados) });
  }),
);
