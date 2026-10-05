import type { Prisma, TipoMovimentacao } from '@prisma/client';
import { Router, type Response } from 'express';
import {
  auditar,
  carregarLocais,
  caminhoTexto,
  existeNaBaseOficial,
  includeEquipamento,
  montarSearchText,
  obterSettings,
  subarvore,
} from '../lib/core.js';
import { autenticar, usuarioAtual, type UsuarioAutenticado } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/error.js';
import { normalizar, prisma } from '../prisma.js';
import { serializarEquipamento } from '../serializers.js';
import {
  atualizarEquipamentoSchema,
  buscarSchema,
  criarEquipamentoSchema,
  moverSchema,
} from '../validation.js';

export const equipmentsRouter = Router();
equipmentsRouter.use(autenticar);

/** Exclusão é lógica: toda listagem considera só os não excluídos. */
const ativos = { excluidoEm: null } satisfies Prisma.EquipmentWhereInput;
const FORA: Prisma.EquipmentWhereInput = { situacao: { in: ['FORA_DA_SALA', 'MANUTENCAO'] } };

const ROTULO_ESTADO: Record<string, string> = {
  OTIMO: 'Ótimo',
  BOM: 'Bom',
  REGULAR: 'Regular',
  RUIM: 'Ruim',
  DANIFICADO: 'Danificado',
};

async function carregarCompleto(id: string) {
  const item = await prisma.equipment.findFirst({
    where: { id, ...ativos },
    include: { ...includeEquipamento, historico: { orderBy: { data: 'desc' } } },
  });
  if (!item) throw new AppError(404, 'Não foi possível carregar este equipamento.');
  return item;
}

async function responder(res: Response, id: string, status = 200) {
  const [item, mapa] = await Promise.all([carregarCompleto(id), carregarLocais()]);
  res.status(status).json(serializarEquipamento(item, mapa));
}

/** Reconstrói o índice de busca de um item depois de qualquer escrita. */
export async function reindexarItem(id: string) {
  const [item, mapa] = await Promise.all([
    prisma.equipment.findUniqueOrThrow({ where: { id }, include: includeEquipamento }),
    carregarLocais(),
  ]);
  await prisma.equipment.update({
    where: { id },
    data: { searchText: montarSearchText(item, mapa) },
  });
}

async function registrar(
  equipmentId: string,
  usuario: UsuarioAutenticado,
  tipo: TipoMovimentacao,
  descricao: string,
  extra: Partial<Prisma.MovementUncheckedCreateInput> = {},
) {
  await prisma.movement.create({
    data: {
      equipmentId,
      tipo,
      descricao,
      usuarioId: usuario.id,
      usuarioNome: usuario.nome,
      ...extra,
    },
  });
}

/** O local precisa existir e, se for um local novo para o item, não pode estar arquivado. */
async function exigirLocal(id: string, localAtual?: string) {
  const local = await prisma.location.findUnique({ where: { id } });
  if (!local) throw new AppError(422, 'O local escolhido não existe mais.');
  if (local.arquivado && id !== localAtual) {
    throw new AppError(422, 'Este local está arquivado. Escolha outro ou desarquive-o em Locais.');
  }
}

/* --- Leitura --------------------------------------------------------------- */

equipmentsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { q, filtro, categoria, local, pessoa, pagina, porPagina } = buscarSchema.parse(
      req.query,
    );
    const agora = new Date();
    const mapa = await carregarLocais();

    const porFiltro: Record<string, Prisma.EquipmentWhereInput> = {
      todos: {},
      disponivel: { situacao: 'DISPONIVEL' },
      'fora-da-sala': { situacao: 'FORA_DA_SALA' },
      manutencao: { situacao: 'MANUTENCAO' },
      baixado: { situacao: 'BAIXADO' },
      atrasado: { ...FORA, retornoPrevisto: { lt: agora } },
      atencao: { estadoFisico: { in: ['RUIM', 'DANIFICADO'] } },
    };

    const tokens = normalizar(q).split(/\s+/).filter(Boolean);

    const where: Prisma.EquipmentWhereInput = {
      AND: [
        ativos,
        porFiltro[filtro] ?? {},
        categoria ? { categoryId: categoria } : {},
        local ? { locationId: { in: subarvore(mapa, local) } } : {},
        pessoa ? { responsavelId: pessoa } : {},
        ...tokens.map((token) => ({ searchText: { contains: token } })),
      ],
    };

    const [total, itens] = await Promise.all([
      prisma.equipment.count({ where }),
      prisma.equipment.findMany({
        where,
        include: includeEquipamento,
        orderBy: { nome: 'asc' },
        skip: (pagina - 1) * porPagina,
        take: porPagina,
      }),
    ]);

    const consulta = normalizar(q);
    const resultados = itens
      .map((item) => ({ item: serializarEquipamento(item, mapa), prExato: item.pr === consulta }))
      .sort((a, b) => Number(b.prExato) - Number(a.prExato));

    res.json({ total, pagina, porPagina, resultados });
  }),
);

equipmentsRouter.get(
  '/indicators',
  asyncHandler(async (_req, res) => {
    const agora = new Date();
    const [total, disponiveis, foraDaSala, manutencao, atrasados] = await Promise.all([
      prisma.equipment.count({ where: ativos }),
      prisma.equipment.count({ where: { ...ativos, situacao: 'DISPONIVEL' } }),
      prisma.equipment.count({ where: { ...ativos, situacao: 'FORA_DA_SALA' } }),
      prisma.equipment.count({ where: { ...ativos, situacao: 'MANUTENCAO' } }),
      prisma.equipment.count({ where: { ...ativos, ...FORA, retornoPrevisto: { lt: agora } } }),
    ]);
    res.json({ total, disponiveis, foraDaSala, manutencao, atrasados });
  }),
);

equipmentsRouter.get(
  '/alerts',
  asyncHandler(async (_req, res) => {
    const settings = await obterSettings();
    const limite = new Date(Date.now() + settings.horasRetornoProximo * 36e5);
    const [itens, mapa] = await Promise.all([
      prisma.equipment.findMany({
        where: { ...ativos, ...FORA, retornoPrevisto: { not: null, lte: limite } },
        include: includeEquipamento,
        orderBy: { retornoPrevisto: 'asc' },
      }),
      carregarLocais(),
    ]);
    res.json(itens.map((i) => serializarEquipamento(i, mapa)));
  }),
);

equipmentsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    await responder(res, req.params.id as string);
  }),
);

/* --- Cadastro e edição ----------------------------------------------------- */

equipmentsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const dados = criarEquipamentoSchema.parse(req.body);
    const usuario = usuarioAtual(req);
    const settings = await obterSettings();

    if (await prisma.equipment.findUnique({ where: { pr: dados.pr } })) {
      throw new AppError(409, 'Já existe um equipamento com este PR.');
    }
    await exigirLocal(dados.locationId);

    const naBase = existeNaBaseOficial(dados.pr, settings.regraBaseOficial);

    const criado = await prisma.equipment.create({
      data: {
        pr: dados.pr,
        nome: dados.nome,
        material: dados.material ?? dados.nome.toUpperCase(),
        marca: dados.marca ?? '',
        modelo: dados.modelo ?? '',
        numeroSerie: dados.semNumeroSerie ? null : dados.numeroSerie,
        semNumeroSerie: dados.semNumeroSerie,
        fabricante: dados.fabricante ?? '',
        categoryId: dados.categoryId,
        situacao: dados.situacao,
        estadoFisico: dados.estadoFisico,
        locationId: dados.locationId,
        importadoDaBaseOficial: naBase,
        foto: dados.foto,
        observacoes: dados.observacoes,
        aquisicao: dados.aquisicao,
        valorAquisicao: dados.valorAquisicao ?? null,
      },
    });

    const mapa = await carregarLocais();
    await registrar(
      criado.id,
      usuario,
      'CADASTRO',
      naBase ? 'Cadastrou o equipamento' : 'Cadastrou o equipamento manualmente',
      { destinoCaminho: caminhoTexto(mapa, dados.locationId) },
    );
    await reindexarItem(criado.id);
    await responder(res, criado.id, 201);
  }),
);

equipmentsRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const dados = atualizarEquipamentoSchema.parse(req.body);
    const usuario = usuarioAtual(req);
    const atual = await carregarCompleto(req.params.id as string);
    await exigirLocal(dados.locationId, atual.locationId);

    const alteracoes: string[] = [];
    if (dados.nome !== atual.nome) alteracoes.push('nome');
    if (dados.categoryId !== atual.categoryId) alteracoes.push('categoria');
    if (dados.estadoFisico !== atual.estadoFisico) {
      alteracoes.push(`estado físico para ${ROTULO_ESTADO[dados.estadoFisico]}`);
    }
    if (dados.situacao !== atual.situacao && atual.situacao === 'DISPONIVEL') {
      alteracoes.push('situação');
    }
    if (dados.locationId !== atual.locationId) alteracoes.push('local de guarda');
    if ((dados.foto ?? null) !== atual.foto) alteracoes.push('foto');

    const mapa = await carregarLocais();
    const emSaida = atual.situacao === 'FORA_DA_SALA' || atual.situacao === 'MANUTENCAO';

    await prisma.equipment.update({
      where: { id: atual.id },
      data: {
        nome: dados.nome,
        material: dados.material ?? atual.material,
        marca: dados.marca ?? '',
        modelo: dados.modelo ?? '',
        numeroSerie: dados.semNumeroSerie ? null : dados.numeroSerie,
        semNumeroSerie: dados.semNumeroSerie,
        fabricante: dados.fabricante ?? '',
        categoryId: dados.categoryId,
        // Item com saída em andamento só muda de situação pela devolução.
        situacao: emSaida ? atual.situacao : dados.situacao,
        estadoFisico: dados.estadoFisico,
        locationId: dados.locationId,
        foto: dados.foto,
        observacoes: dados.observacoes,
        aquisicao: dados.aquisicao,
        valorAquisicao: dados.valorAquisicao ?? null,
      },
    });

    await registrar(
      atual.id,
      usuario,
      'EDICAO',
      alteracoes.length ? `Editou ${alteracoes.join(', ')}` : 'Editou os dados do equipamento',
      dados.locationId !== atual.locationId
        ? {
            origemCaminho: caminhoTexto(mapa, atual.locationId),
            destinoCaminho: caminhoTexto(mapa, dados.locationId),
          }
        : {},
    );
    await reindexarItem(atual.id);
    await responder(res, atual.id);
  }),
);

/* --- Movimentação dentro do acervo ----------------------------------------- */

/** Troca o local de guarda. Não é saída: o item continua disponível. */
equipmentsRouter.post(
  '/:id/move',
  asyncHandler(async (req, res) => {
    const dados = moverSchema.parse(req.body);
    const usuario = usuarioAtual(req);
    const atual = await carregarCompleto(req.params.id as string);
    await exigirLocal(dados.locationId);

    if (dados.locationId === atual.locationId) {
      throw new AppError(422, 'O equipamento já está neste local.');
    }

    const mapa = await carregarLocais();
    await prisma.equipment.update({
      where: { id: atual.id },
      data: { locationId: dados.locationId },
    });
    await registrar(atual.id, usuario, 'MOVIMENTACAO', 'Mudou o equipamento de lugar', {
      origemCaminho: caminhoTexto(mapa, atual.locationId),
      destinoCaminho: caminhoTexto(mapa, dados.locationId),
      observacao: dados.observacao,
    });
    await reindexarItem(atual.id);
    await responder(res, atual.id);
  }),
);

/* --- Exclusão -------------------------------------------------------------- */

equipmentsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const usuario = usuarioAtual(req);
    const atual = await carregarCompleto(req.params.id as string);

    if (atual.cautela) {
      throw new AppError(
        409,
        `Este item está na cautela nº ${atual.cautela.numero}/${atual.cautela.ano}. Registre a devolução antes de excluir.`,
      );
    }

    await prisma.equipment.update({
      where: { id: atual.id },
      data: { excluidoEm: new Date(), excluidoPorId: usuario.id },
    });
    await auditar(usuario, 'Equipamento', 'excluiu', `${atual.nome} (PR ${atual.pr})`, atual.id);
    res.status(204).end();
  }),
);
