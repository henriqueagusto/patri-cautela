import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

/** Erro de negócio com status HTTP e mensagem já escrita para o usuário. */
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Mensagens em português, sem jargão técnico (docs/PATRI-design.md §11).
 * O detalhe técnico vai para o log, não para a resposta.
 */
export function errorHandler(
  erro: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (erro instanceof AppError) {
    return res.status(erro.status).json({ mensagem: erro.message });
  }

  if (erro instanceof ZodError) {
    return res.status(422).json({
      mensagem: 'Alguns campos precisam ser corrigidos.',
      campos: erro.issues.map((problema) => ({
        campo: problema.path.join('.'),
        mensagem: problema.message,
      })),
    });
  }

  if (erro instanceof Prisma.PrismaClientKnownRequestError) {
    if (erro.code === 'P2002') {
      return res
        .status(409)
        .json({ mensagem: 'Já existe um registro com este valor.' });
    }
    if (erro.code === 'P2025') {
      return res.status(404).json({ mensagem: 'Registro não encontrado.' });
    }
  }

  console.error('[erro não tratado]', erro);
  return res
    .status(500)
    .json({ mensagem: 'Não foi possível concluir a operação. Tente novamente.' });
}

/** Envolve handlers async para que rejeições cheguem ao errorHandler. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    void fn(req, res, next).catch(next);
  };
}
