import type { Movement, Prisma } from '@prisma/client';
import { caminho, type includeEquipamento, type MapaLocais } from './lib/core.js';

type EquipamentoCompleto = Prisma.EquipmentGetPayload<{ include: typeof includeEquipamento }> & {
  historico?: Movement[];
};

const slugSituacao = (s: string) => (s === 'FORA_DA_SALA' ? 'fora-da-sala' : s.toLowerCase());

/** Formato consumido pela interface. Enums viram slugs minúsculos. */
export function serializarEquipamento(item: EquipamentoCompleto, mapa: MapaLocais) {
  const foraDaSala = item.situacao === 'FORA_DA_SALA' || item.situacao === 'MANUTENCAO';

  return {
    id: item.id,
    pr: item.pr,
    nome: item.nome,
    material: item.material,
    marca: item.marca,
    modelo: item.modelo,
    numeroSerie: item.numeroSerie ?? undefined,
    semNumeroSerie: item.semNumeroSerie,
    fabricante: item.fabricante,
    categoria: {
      id: item.category.id,
      nome: item.category.nome,
      icone: item.category.icone,
      cor: item.category.cor,
    },
    situacao: slugSituacao(item.situacao),
    estadoFisico: item.estadoFisico.toLowerCase(),
    local: { id: item.locationId, caminho: caminho(mapa, item.locationId) },
    saida:
      foraDaSala && item.saidaEm
        ? {
            responsavel: item.responsavel
              ? {
                  id: item.responsavel.id,
                  nome: item.responsavel.nome,
                  foto: item.responsavel.foto ?? undefined,
                  telefone: item.responsavel.telefone ?? undefined,
                  setor: item.responsavel.setor?.nome,
                }
              : undefined,
            destino: item.destino ? { id: item.destino.id, nome: item.destino.nome } : undefined,
            destinoDetalhe: item.destinoDetalhe ?? undefined,
            motivo: item.motivo ? { id: item.motivo.id, nome: item.motivo.nome } : undefined,
            cautela: item.cautela ?? undefined,
            saidaEm: item.saidaEm.toISOString(),
            retornoPrevisto: item.retornoPrevisto?.toISOString(),
            observacao: item.saidaObservacao ?? undefined,
          }
        : undefined,
    importadoDaBaseOficial: item.importadoDaBaseOficial,
    foto: item.foto ?? undefined,
    observacoes: item.observacoes ?? undefined,
    aquisicao: item.aquisicao?.toISOString(),
    valorAquisicao: item.valorAquisicao ? Number(item.valorAquisicao) : undefined,
    historico: (item.historico ?? []).map(serializarMovimento),
  };
}

export function serializarMovimento(m: Movement) {
  return {
    id: m.id,
    data: m.data.toISOString(),
    tipo: m.tipo.toLowerCase(),
    descricao: m.descricao,
    usuario: m.usuarioNome,
    origem: m.origemCaminho ?? undefined,
    destino: m.destinoCaminho ?? undefined,
    pessoa: m.pessoaNome ? { id: m.pessoaId ?? undefined, nome: m.pessoaNome } : undefined,
    setor: m.setorNome ?? undefined,
    motivo: m.motivoNome ?? undefined,
    retornoPrevisto: m.retornoPrevisto?.toISOString(),
    observacao: m.observacao ?? undefined,
  };
}
