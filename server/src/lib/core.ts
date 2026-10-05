import type { Prisma } from '@prisma/client';
import type { UsuarioAutenticado } from '../middleware/auth.js';
import { normalizar, prisma } from '../prisma.js';

/* --- Configurações -------------------------------------------------------- */

export async function obterSettings() {
  return prisma.settings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });
}

export function existeNaBaseOficial(pr: string, regra: string): boolean {
  try {
    return new RegExp(regra).test(pr.trim());
  } catch {
    return false;
  }
}

/* --- Árvore de locais ----------------------------------------------------- */

export interface NoLocal {
  id: string;
  nome: string;
  tipo: string;
  parentId: string | null;
}

export type MapaLocais = Map<string, NoLocal>;

/** A tabela de locais é pequena: carregar inteira é mais simples que CTE. */
export async function carregarLocais(): Promise<MapaLocais> {
  const locais = await prisma.location.findMany({
    select: { id: true, nome: true, tipo: true, parentId: true },
  });
  return new Map(locais.map((l) => [l.id, l]));
}

/** Do nível mais amplo ao mais específico. */
export function caminho(mapa: MapaLocais, id: string | null | undefined): NoLocal[] {
  const resultado: NoLocal[] = [];
  const vistos = new Set<string>();
  let atual = id ? mapa.get(id) : undefined;
  while (atual && !vistos.has(atual.id)) {
    vistos.add(atual.id);
    resultado.unshift(atual);
    atual = atual.parentId ? mapa.get(atual.parentId) : undefined;
  }
  return resultado;
}

export function caminhoTexto(mapa: MapaLocais, id: string | null | undefined): string {
  return caminho(mapa, id)
    .map((n) => n.nome)
    .join(' › ');
}

/** O próprio local e todos os descendentes. */
export function subarvore(mapa: MapaLocais, raiz: string): string[] {
  const filhos = new Map<string, string[]>();
  for (const no of mapa.values()) {
    if (!no.parentId) continue;
    filhos.set(no.parentId, [...(filhos.get(no.parentId) ?? []), no.id]);
  }
  const ids: string[] = [];
  const pilha = [raiz];
  while (pilha.length) {
    const id = pilha.pop()!;
    ids.push(id);
    pilha.push(...(filhos.get(id) ?? []));
  }
  return ids;
}

/* --- Busca ---------------------------------------------------------------- */

export const includeEquipamento = {
  category: true,
  responsavel: { include: { setor: true } },
  destino: true,
  motivo: true,
  cautela: { select: { id: true, numero: true, ano: true } },
} satisfies Prisma.EquipmentInclude;

type EquipamentoCompleto = Prisma.EquipmentGetPayload<{ include: typeof includeEquipamento }>;

export function montarSearchText(item: EquipamentoCompleto, mapa: MapaLocais): string {
  return normalizar(
    [
      item.pr,
      item.nome,
      item.material,
      item.marca,
      item.modelo,
      item.numeroSerie,
      item.fabricante,
      item.category.nome,
      caminho(mapa, item.locationId)
        .map((n) => n.nome)
        .join(' '),
      item.responsavel?.nome,
      item.destino?.nome,
      item.destinoDetalhe,
    ]
      .filter(Boolean)
      .join(' '),
  );
}

/**
 * Recalcula o texto de busca dos itens afetados por uma mudança.
 * Chamar depois de renomear/mover local, categoria, pessoa ou setor.
 */
export async function reindexar(where: Prisma.EquipmentWhereInput) {
  const [mapa, itens] = await Promise.all([
    carregarLocais(),
    prisma.equipment.findMany({ where, include: includeEquipamento }),
  ]);
  await prisma.$transaction(
    itens.map((item) =>
      prisma.equipment.update({
        where: { id: item.id },
        data: { searchText: montarSearchText(item, mapa) },
      }),
    ),
  );
}

/* --- Auditoria ------------------------------------------------------------ */

export async function auditar(
  usuario: UsuarioAutenticado,
  entidade: string,
  acao: 'criou' | 'editou' | 'excluiu' | 'restaurou' | 'desativou' | 'arquivou' | 'desarquivou',
  resumo: string,
  entidadeId?: string,
) {
  await prisma.auditLog.create({
    data: {
      usuarioId: usuario.id,
      usuarioNome: usuario.nome,
      entidade,
      entidadeId,
      acao,
      resumo,
    },
  });
}
