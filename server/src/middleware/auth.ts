import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../env.js';
import { AppError } from './error.js';
import type { Papel } from '@prisma/client';

export interface UsuarioAutenticado {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
}

declare global {
  namespace Express {
    interface Request {
      usuario?: UsuarioAutenticado;
    }
  }
}

export function assinarToken(usuario: UsuarioAutenticado): string {
  return jwt.sign(usuario, env.JWT_SECRET, { expiresIn: '7d' });
}

export function autenticar(req: Request, _res: Response, next: NextFunction) {
  const cabecalho = req.headers.authorization;

  if (!cabecalho?.startsWith('Bearer ')) {
    throw new AppError(401, 'Faça login para continuar.');
  }

  try {
    req.usuario = jwt.verify(cabecalho.slice(7), env.JWT_SECRET) as UsuarioAutenticado;
    next();
  } catch {
    throw new AppError(401, 'Sua sessão expirou. Faça login novamente.');
  }
}

/** Restringe a rota ao administrador (docs/PATRI-design.md §14.1). */
export function somenteAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.usuario?.papel !== 'ADMINISTRADOR') {
    throw new AppError(403, 'Esta ação é do administrador.');
  }
  next();
}

export function usuarioAtual(req: Request): UsuarioAutenticado {
  if (!req.usuario) throw new AppError(401, 'Faça login para continuar.');
  return req.usuario;
}
