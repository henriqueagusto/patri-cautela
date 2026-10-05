/**
 * Modelo de domínio do PATRI, no formato devolvido pela API.
 *
 * Situação é armazenada; condição é derivada na leitura (docs §4.4).
 */

export type Situacao = 'disponivel' | 'fora-da-sala' | 'manutencao' | 'baixado';
export type Condicao = 'atrasado' | 'retorno-proximo' | 'atencao' | 'nao-importado';
export type EstadoFisico = 'otimo' | 'bom' | 'regular' | 'ruim' | 'danificado';
export type Papel = 'USUARIO' | 'ADMINISTRADOR';
export type ViewMode = 'grid' | 'lista';

export type FiltroSlug =
  | 'todos'
  | 'disponivel'
  | 'fora-da-sala'
  | 'manutencao'
  | 'atrasado'
  | 'atencao'
  | 'baixado';

export type TipoMovimentacao =
  | 'cadastro'
  | 'edicao'
  | 'movimentacao'
  | 'saida'
  | 'edicao_saida'
  | 'devolucao';

export interface Categoria {
  id: string;
  nome: string;
  icone: string;
  cor: string;
  descricao?: string | null;
  total?: number;
}

export interface NoCaminho {
  id: string;
  nome: string;
  tipo: string;
}

export interface Local {
  id: string;
  nome: string;
  tipo: string;
  descricao?: string | null;
  foto?: string | null;
  parentId: string | null;
  /** Fora de uso: some das listas e seletores, mas continua no histórico. */
  arquivado: boolean;
  diretos: number;
  total: number;
}

export interface Setor {
  id: string;
  nome: string;
  sigla?: string | null;
  descricao?: string | null;
  ativo: boolean;
  pessoas?: number;
  itensAgora?: number;
}

export interface Pessoa {
  id: string;
  nome: string;
  /** PR da pessoa (número funcional). */
  matricula?: string | null;
  email?: string | null;
  /** Celular. */
  telefone?: string | null;
  ramal?: string | null;
  foto?: string | null;
  observacoes?: string | null;
  ativo: boolean;
  setorId?: string | null;
  setor?: Setor | null;
  itensAgora?: number;
}

export interface Motivo {
  id: string;
  nome: string;
  prazoDias?: number | null;
  colocaEmManutencao: boolean;
  ativo: boolean;
}

export interface Saida {
  responsavel?: { id: string; nome: string; foto?: string; telefone?: string; setor?: string };
  destino?: { id: string; nome: string };
  destinoDetalhe?: string;
  motivo?: { id: string; nome: string };
  cautela?: { id: string; numero: number; ano: number };
  saidaEm: string;
  retornoPrevisto?: string;
  observacao?: string;
}

export interface Movimentacao {
  id: string;
  data: string;
  tipo: TipoMovimentacao;
  descricao: string;
  usuario: string;
  origem?: string;
  destino?: string;
  pessoa?: { id?: string; nome: string };
  setor?: string;
  motivo?: string;
  retornoPrevisto?: string;
  observacao?: string;
}

export interface Equipment {
  id: string;
  pr: string;
  nome: string;
  material: string;
  marca: string;
  modelo: string;
  numeroSerie?: string;
  semNumeroSerie: boolean;
  fabricante: string;
  categoria: Categoria;
  situacao: Situacao;
  estadoFisico: EstadoFisico;
  local: { id: string; caminho: NoCaminho[] };
  saida?: Saida;
  importadoDaBaseOficial: boolean;
  foto?: string;
  observacoes?: string;
  aquisicao?: string;
  valorAquisicao?: number;
  historico: Movimentacao[];
}

export interface EventoHistorico extends Movimentacao {
  equipamento: {
    id: string;
    nome: string;
    pr: string;
    foto?: string;
    categoria?: { nome: string; icone: string; cor: string };
  };
}

export interface ItemExcluido {
  item: Equipment;
  excluidoEm: string;
  excluidoPor: string;
}

export interface Preferencias {
  visualizacao?: ViewMode;
  paginaInicial?: '/' | '/equipamentos' | '/cautelas' | '/favoritos';
  densidade?: 'confortavel' | 'compacta';
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  ativo?: boolean;
  foto?: string | null;
  telefone?: string | null;
  preferencias?: Preferencias;
  personId?: string | null;
  person?: { id: string; nome: string } | null;
  ultimoAcesso?: string | null;
  criadoEm?: string;
}

export interface Settings {
  nomeInstituicao: string;
  subtitulo: string;
  logo?: string | null;
  horasRetornoProximo: number;
  prazoPadraoDias: number;
  regraBaseOficial: string;
  exigirResponsavel: boolean;
  cabecalhoCautela: string;
  cidadeCautela: string;
  numeroInicialCautela: number;
  anoNumeroInicial: number;
}

export interface RegistroAuditoria {
  id: string;
  data: string;
  usuarioNome: string;
  entidade: string;
  acao: string;
  resumo: string;
}

/* --- Cautela ------------------------------------------------------------- */

export interface CautelaItem {
  id: string;
  equipmentId: string;
  pr: string;
  nome: string;
  marca: string;
  modelo: string;
  numeroSerie?: string;
  devolvidoEm?: string;
  recebidoPor?: string;
  estadoDevolucao?: EstadoFisico;
  equipamento: Equipment;
}

export interface Cautela {
  id: string;
  numero: number;
  ano: number;
  status: 'aberta' | 'encerrada';
  responsavel: {
    id: string;
    nome: string;
    matricula?: string;
    telefone?: string;
    ramal?: string;
    email?: string;
    foto?: string;
    setor?: string;
  };
  destino?: { id: string; nome: string };
  destinoDetalhe?: string;
  motivo?: { id: string; nome: string };
  tecnicoTransporte?: string;
  retornoPrevisto?: string;
  observacao?: string;
  criadaEm: string;
  criadaPor?: string;
  fechadaEm?: string;
  total: number;
  pendentes: number;
  itens: CautelaItem[];
}

export interface CautelaResumo {
  id: string;
  numero: number;
  ano: number;
  criadaEm: string;
  fechadaEm?: string;
  retornoPrevisto?: string;
  total: number;
  pendentes: number;
}
