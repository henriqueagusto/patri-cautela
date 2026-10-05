import type { Condicao, Equipment, EstadoFisico, Situacao } from '../types/equipment';

export type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'muted';

export const SITUACAO_LABEL: Record<Situacao, string> = {
  disponivel: 'Disponível',
  'fora-da-sala': 'Fora da sala',
  manutencao: 'Em manutenção',
  baixado: 'Baixado',
};

export const SITUACAO_TONE: Record<Situacao, Tone> = {
  disponivel: 'success',
  'fora-da-sala': 'neutral',
  manutencao: 'danger',
  baixado: 'muted',
};

export const CONDICAO_LABEL: Record<Condicao, string> = {
  atrasado: 'Atrasado',
  'retorno-proximo': 'Retorno próximo',
  atencao: 'Atenção',
  'nao-importado': 'Não importado',
};

export const CONDICAO_TONE: Record<Condicao, Tone> = {
  atrasado: 'danger',
  'retorno-proximo': 'warning',
  atencao: 'warning',
  'nao-importado': 'neutral',
};

export const ESTADO_FISICO_LABEL: Record<EstadoFisico, string> = {
  otimo: 'Ótimo',
  bom: 'Bom',
  regular: 'Regular',
  ruim: 'Ruim',
  danificado: 'Danificado',
};

const SEVERIDADE: Condicao[] = ['atrasado', 'retorno-proximo', 'atencao', 'nao-importado'];

/** Janela de "retorno próximo" — vem das configurações; 48h por padrão. */
let horasRetornoProximo = 48;
export function definirJanelaRetorno(horas: number) {
  horasRetornoProximo = horas;
}

/** Condições calculadas na leitura. Nada aqui é gravado (§4.4). */
export function derivarCondicoes(item: Equipment, agora = new Date()): Condicao[] {
  const condicoes: Condicao[] = [];
  const prazo = item.saida?.retornoPrevisto;

  if (prazo && (item.situacao === 'fora-da-sala' || item.situacao === 'manutencao')) {
    const horas = (new Date(prazo).getTime() - agora.getTime()) / 36e5;
    if (horas < 0) condicoes.push('atrasado');
    else if (horas <= horasRetornoProximo) condicoes.push('retorno-proximo');
  }
  if (item.estadoFisico === 'ruim' || item.estadoFisico === 'danificado') condicoes.push('atencao');
  if (!item.importadoDaBaseOficial) condicoes.push('nao-importado');

  return condicoes;
}

export function condicaoPrincipal(condicoes: Condicao[]): Condicao | undefined {
  return SEVERIDADE.find((c) => condicoes.includes(c));
}
