import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

/** Remove acento e caixa — mesma normalização usada no frontend. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
