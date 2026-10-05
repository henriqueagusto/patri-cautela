import { z } from 'zod';

/** Texto opcional: string vazia vira null, para não gravar "" no banco. */
const opcional = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

const obrigatorio = (mensagem: string) => z.string().trim().min(1, mensagem);

/** Aceita "2026-09-30" (input date) ou ISO completo. */
const data = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v ? new Date(v.length === 10 ? `${v}T12:00:00` : v) : null))
  .refine((v) => v === null || !Number.isNaN(v.getTime()), 'Data inválida.');

const id = z.string().min(1);
const idOpcional = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido.'),
  senha: z.string().min(1, 'Informe a senha.'),
});

/* --- Equipamentos ---------------------------------------------------------- */

const camposEquipamento = {
  nome: obrigatorio('Dê um nome de uso ao equipamento.'),
  material: opcional,
  marca: opcional,
  modelo: opcional,
  numeroSerie: opcional,
  semNumeroSerie: z.boolean().default(false),
  fabricante: opcional,
  categoryId: z.string().min(1, 'Escolha uma categoria.'),
  situacao: z.enum(['DISPONIVEL', 'MANUTENCAO', 'BAIXADO']).default('DISPONIVEL'),
  estadoFisico: z.enum(['OTIMO', 'BOM', 'REGULAR', 'RUIM', 'DANIFICADO']).default('BOM'),
  locationId: z.string().min(1, 'Escolha onde o item fica guardado.'),
  foto: opcional,
  observacoes: opcional,
  aquisicao: data,
  valorAquisicao: z.number().nonnegative().optional().nullable(),
};

/** Número de série é obrigatório, a não ser que se declare que não existe. */
const exigeSerie = <T extends { numeroSerie: string | null; semNumeroSerie: boolean }>(v: T) =>
  v.semNumeroSerie || Boolean(v.numeroSerie);
const erroSerie = {
  message: 'Informe o número de série ou marque "Sem número de série".',
  path: ['numeroSerie'],
};

export const criarEquipamentoSchema = z
  .object({
    pr: z
      .string()
      .trim()
      .min(1, 'Informe o número de patrimônio.')
      .regex(/^\d+$/, 'O PR deve conter apenas números.'),
    ...camposEquipamento,
  })
  .refine(exigeSerie, erroSerie);

export const atualizarEquipamentoSchema = z
  .object(camposEquipamento)
  .refine(exigeSerie, erroSerie);

export const moverSchema = z.object({
  locationId: z.string().min(1, 'Escolha o novo local.'),
  observacao: opcional,
});

export const buscarSchema = z.object({
  q: z.string().optional().default(''),
  filtro: z
    .enum(['todos', 'disponivel', 'fora-da-sala', 'manutencao', 'atrasado', 'atencao', 'baixado'])
    .optional()
    .default('todos'),
  categoria: z.string().optional(),
  local: z.string().optional(),
  pessoa: z.string().optional(),
  pagina: z.coerce.number().int().min(1).optional().default(1),
  porPagina: z.coerce.number().int().min(1).max(200).optional().default(60),
});

export const historicoSchema = z.object({
  q: z.string().optional(),
  tipo: z
    .enum(['cadastro', 'edicao', 'movimentacao', 'saida', 'edicao_saida', 'devolucao'])
    .optional(),
  pessoa: z.string().optional(),
  usuario: z.string().optional(),
  equipamento: z.string().optional(),
  de: z.string().optional(),
  ate: z.string().optional(),
  pagina: z.coerce.number().int().min(1).optional().default(1),
});

/* --- Cautelas -------------------------------------------------------------- */

const estadoFisico = z.enum(['OTIMO', 'BOM', 'REGULAR', 'RUIM', 'DANIFICADO']);

const camposCautela = {
  responsavelId: z.string().min(1, 'Escolha quem vai receber os equipamentos.'),
  destinoId: idOpcional,
  destinoDetalhe: opcional,
  tecnicoTransporte: opcional,
  motivoId: idOpcional,
  retornoPrevisto: data,
  observacao: opcional,
};

export const cautelaSchema = z.object({
  itens: z.array(z.string().min(1)).min(1, 'Adicione ao menos um equipamento.'),
  ...camposCautela,
});

export const editarCautelaSchema = z.object(camposCautela);

export const adicionarItensSchema = z.object({
  itens: z.array(z.string().min(1)).min(1, 'Escolha ao menos um equipamento.'),
});

/** Tudo volta junto: a devolução é sempre da cautela inteira. */
export const devolverCautelaSchema = z.object({
  recebidoPor: obrigatorio('Informe quem recebeu os equipamentos.'),
  observacao: opcional,
  /** Estado de cada item na volta. Item não listado mantém o estado atual. */
  estados: z
    .array(z.object({ equipmentId: z.string().min(1), estadoFisico: estadoFisico }))
    .optional()
    .default([]),
});

export const listarCautelasSchema = z.object({
  status: z.enum(['abertas', 'encerradas', 'todas']).optional().default('abertas'),
  q: z.string().optional(),
  pessoa: z.string().optional(),
  pagina: z.coerce.number().int().min(1).optional().default(1),
});

/* --- Cadastros ------------------------------------------------------------- */

export const pessoaSchema = z.object({
  nome: obrigatorio('Informe o nome.'),
  matricula: opcional,
  email: opcional.refine((v) => !v || z.string().email().safeParse(v).success, 'E-mail inválido.'),
  telefone: opcional,
  ramal: opcional,
  foto: opcional,
  observacoes: opcional,
  setorId: idOpcional,
  ativo: z.boolean().optional(),
});

export const setorSchema = z.object({
  nome: obrigatorio('Informe o nome do setor.'),
  sigla: opcional,
  descricao: opcional,
  ativo: z.boolean().optional(),
});

export const categoriaSchema = z.object({
  nome: obrigatorio('Informe o nome da categoria.'),
  icone: z.string().min(1).default('package'),
  cor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida.'),
  descricao: opcional,
});

export const motivoSchema = z.object({
  nome: obrigatorio('Informe o motivo.'),
  prazoDias: z.number().int().min(0).max(3650).optional().nullable(),
  colocaEmManutencao: z.boolean().default(false),
  ativo: z.boolean().optional(),
});

export const localSchema = z.object({
  nome: obrigatorio('Informe o nome do local.'),
  tipo: obrigatorio('Informe o tipo (sala, armário, prateleira…).'),
  descricao: opcional,
  foto: opcional,
  parentId: idOpcional,
});

export const arquivarLocalSchema = z.object({
  arquivado: z.boolean({ required_error: 'Informe se o local deve ser arquivado.' }),
});

/** Criação em lote: "{prefixo} {n}" de `inicio` até `fim` (no máximo 50). */
export const locaisEmLoteSchema = z
  .object({
    parentId: idOpcional,
    tipo: obrigatorio('Informe o tipo (prateleira, gaveta…).'),
    prefixo: obrigatorio('Informe o nome base, ex.: Prateleira.'),
    inicio: z.coerce.number().int('Use números inteiros.').min(0, 'Comece em 0 ou mais.'),
    fim: z.coerce.number().int('Use números inteiros.').min(0, 'Termine em 0 ou mais.'),
  })
  .refine((d) => d.fim >= d.inicio, { message: 'O último número precisa ser maior ou igual ao primeiro.', path: ['fim'] })
  .refine((d) => d.fim - d.inicio < 50, { message: 'Crie no máximo 50 de uma vez.', path: ['fim'] });

/* --- Usuários e perfil ----------------------------------------------------- */

const senha = z.string().min(8, 'A senha precisa ter ao menos 8 caracteres.');

export const criarUsuarioSchema = z.object({
  nome: obrigatorio('Informe o nome.'),
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido.'),
  senha,
  papel: z.enum(['USUARIO', 'ADMINISTRADOR']).default('USUARIO'),
  personId: idOpcional,
});

export const atualizarUsuarioSchema = z.object({
  nome: z.string().trim().min(1).optional(),
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido.').optional(),
  papel: z.enum(['USUARIO', 'ADMINISTRADOR']).optional(),
  ativo: z.boolean().optional(),
  telefone: opcional.optional(),
  foto: opcional.optional(),
  personId: idOpcional.optional(),
});

export const redefinirSenhaSchema = z.object({ senha });

export const perfilSchema = z.object({
  nome: z.string().trim().min(1, 'Informe seu nome.').optional(),
  telefone: opcional.optional(),
  foto: opcional.optional(),
  preferencias: z
    .object({
      visualizacao: z.enum(['grid', 'lista']).optional(),
      paginaInicial: z.enum(['/', '/equipamentos', '/cautelas', '/favoritos']).optional(),
      densidade: z.enum(['confortavel', 'compacta']).optional(),
    })
    .optional(),
});

export const trocarSenhaSchema = z.object({
  atual: z.string().min(1, 'Informe a senha atual.'),
  nova: senha,
});

export const settingsSchema = z.object({
  nomeInstituicao: z.string().trim().min(1).optional(),
  subtitulo: z.string().trim().optional(),
  logo: opcional.optional(),
  horasRetornoProximo: z.number().int().min(1).max(720).optional(),
  prazoPadraoDias: z.number().int().min(1).max(365).optional(),
  regraBaseOficial: z
    .string()
    .optional()
    .refine((v) => {
      if (!v) return true;
      try {
        new RegExp(v);
        return true;
      } catch {
        return false;
      }
    }, 'Expressão inválida.'),
  exigirResponsavel: z.boolean().optional(),
  cabecalhoCautela: z.string().trim().min(1, 'O cabeçalho não pode ficar vazio.').optional(),
  cidadeCautela: z.string().trim().min(1).optional(),
  numeroInicialCautela: z.number().int().min(1).optional(),
  anoNumeroInicial: z.number().int().min(2000).max(2100).optional(),
});

export { id };
