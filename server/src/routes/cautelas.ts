import { Prisma } from '@prisma/client';
import { Router } from 'express';
import {
  carregarLocais,
  caminhoTexto,
  includeEquipamento,
  obterSettings,
  type MapaLocais,
} from '../lib/core.js';
import { autenticar, usuarioAtual, type UsuarioAutenticado } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/error.js';
import { prisma } from '../prisma.js';
import { serializarEquipamento } from '../serializers.js';
import {
  adicionarItensSchema,
  cautelaSchema,
  devolverCautelaSchema,
  editarCautelaSchema,
  listarCautelasSchema,
} from '../validation.js';
import { reindexarItem } from './equipments.js';

/**
 * Cautela de equipamentos. Toda saída do acervo passa por aqui: uma cautela
 * reúne um ou mais itens entregues a uma pessoa, com uma única data de
 * devolução. Tudo volta junto. Numeração "numero/ano", recomeçando a cada ano.
 */
export const cautelasRouter = Router();
cautelasRouter.use(autenticar);

const includeCautela = {
  responsavel: { include: { setor: true } },
  destino: true,
  motivo: true,
  criadaPor: { select: { nome: true } },
  itens: {
    orderBy: { nome: 'asc' },
    include: { equipment: { include: includeEquipamento } },
  },
} satisfies Prisma.CautelaInclude;

type CautelaCompleta = Prisma.CautelaGetPayload<{ include: typeof includeCautela }>;

/** "300/2026" — como a cautela é identificada no papel e na tela. */
export const rotuloCautela = (c: { numero: number; ano: number }) => `${c.numero}/${c.ano}`;

function serializar(c: CautelaCompleta, mapa: MapaLocais) {
  const pendentes = c.itens.filter((i) => !i.devolvidoEm).length;
  return {
    id: c.id,
    numero: c.numero,
    ano: c.ano,
    status: c.fechadaEm ? 'encerrada' : 'aberta',
    responsavel: {
      id: c.responsavel.id,
      nome: c.responsavel.nome,
      matricula: c.responsavel.matricula ?? undefined,
      telefone: c.responsavel.telefone ?? undefined,
      ramal: c.responsavel.ramal ?? undefined,
      email: c.responsavel.email ?? undefined,
      foto: c.responsavel.foto ?? undefined,
      setor: c.responsavel.setor?.nome,
    },
    destino: c.destino ? { id: c.destino.id, nome: c.destino.nome } : undefined,
    destinoDetalhe: c.destinoDetalhe ?? undefined,
    motivo: c.motivo ? { id: c.motivo.id, nome: c.motivo.nome } : undefined,
    tecnicoTransporte: c.tecnicoTransporte ?? undefined,
    retornoPrevisto: c.retornoPrevisto?.toISOString(),
    observacao: c.observacao ?? undefined,
    criadaEm: c.criadaEm.toISOString(),
    criadaPor: c.criadaPor?.nome,
    fechadaEm: c.fechadaEm?.toISOString(),
    total: c.itens.length,
    pendentes,
    itens: c.itens.map((i) => ({
      id: i.id,
      equipmentId: i.equipmentId,
      pr: i.pr,
      nome: i.nome,
      marca: i.marca,
      modelo: i.modelo,
      numeroSerie: i.numeroSerie ?? undefined,
      devolvidoEm: i.devolvidoEm?.toISOString(),
      recebidoPor: i.recebidoPor ?? undefined,
      estadoDevolucao: i.estadoDevolucao?.toLowerCase(),
      equipamento: serializarEquipamento(i.equipment, mapa),
    })),
  };
}

async function carregar(id: string) {
  const c = await prisma.cautela.findUnique({ where: { id }, include: includeCautela });
  if (!c) throw new AppError(404, 'Cautela não encontrada.');
  return c;
}

async function responder(res: import('express').Response, id: string, status = 200) {
  const [c, mapa] = await Promise.all([carregar(id), carregarLocais()]);
  res.status(status).json(serializar(c, mapa));
}

/** Pessoa, destino e motivo existem? Devolve os registros para gravar os nomes. */
async function resolverReferencias(d: {
  responsavelId: string;
  destinoId: string | null;
  motivoId: string | null;
}) {
  const [pessoa, setor, motivo] = await Promise.all([
    prisma.person.findUnique({ where: { id: d.responsavelId } }),
    d.destinoId ? prisma.sector.findUnique({ where: { id: d.destinoId } }) : null,
    d.motivoId ? prisma.exitReason.findUnique({ where: { id: d.motivoId } }) : null,
  ]);
  if (!pessoa) throw new AppError(422, 'A pessoa escolhida não existe mais.');
  if (d.destinoId && !setor) throw new AppError(422, 'O destino escolhido não existe mais.');
  if (d.motivoId && !motivo) throw new AppError(422, 'O motivo escolhido não existe mais.');
  return { pessoa, setor, motivo };
}

const textoDestino = (setor: { nome: string } | null, detalhe: string | null) =>
  [setor?.nome, detalhe].filter(Boolean).join(' · ') || null;

/**
 * Coloca itens disponíveis dentro de uma cautela: marca como fora, grava o
 * snapshot para impressão e registra a saída no histórico de cada um.
 */
async function entregarItens(
  cautelaId: string,
  rotulo: string,
  equipmentIds: string[],
  usuario: UsuarioAutenticado,
) {
  const cautela = await prisma.cautela.findUniqueOrThrow({
    where: { id: cautelaId },
    include: { responsavel: true, destino: true, motivo: true },
  });

  const itens = await prisma.equipment.findMany({
    where: { id: { in: equipmentIds }, excluidoEm: null },
  });
  if (itens.length !== new Set(equipmentIds).size) {
    throw new AppError(422, 'Algum dos equipamentos escolhidos não existe mais.');
  }
  const indisponivel = itens.find((i) => i.situacao !== 'DISPONIVEL');
  if (indisponivel) {
    throw new AppError(409, `${indisponivel.nome} (PR ${indisponivel.pr}) não está disponível.`);
  }

  const mapa = await carregarLocais();
  const manutencao = cautela.motivo?.colocaEmManutencao ?? false;

  await prisma.$transaction(
    itens.flatMap((item) => [
      prisma.cautelaItem.create({
        data: {
          cautelaId,
          equipmentId: item.id,
          pr: item.pr,
          nome: item.nome,
          marca: item.marca,
          modelo: item.modelo,
          numeroSerie: item.semNumeroSerie ? null : item.numeroSerie,
        },
      }),
      prisma.equipment.update({
        where: { id: item.id },
        data: {
          situacao: manutencao ? 'MANUTENCAO' : 'FORA_DA_SALA',
          cautelaId,
          responsavelId: cautela.responsavelId,
          destinoId: cautela.destinoId,
          destinoDetalhe: cautela.destinoDetalhe,
          motivoId: cautela.motivoId,
          saidaEm: new Date(),
          retornoPrevisto: cautela.retornoPrevisto,
          saidaObservacao: cautela.observacao,
        },
      }),
      prisma.movement.create({
        data: {
          equipmentId: item.id,
          tipo: 'SAIDA',
          descricao: `Saiu pela cautela nº ${rotulo}`,
          usuarioId: usuario.id,
          usuarioNome: usuario.nome,
          origemCaminho: caminhoTexto(mapa, item.locationId),
          destinoCaminho: textoDestino(cautela.destino, cautela.destinoDetalhe),
          pessoaId: cautela.responsavelId,
          pessoaNome: cautela.responsavel.nome,
          setorId: cautela.destinoId,
          setorNome: cautela.destino?.nome,
          motivoId: cautela.motivoId,
          motivoNome: cautela.motivo?.nome,
          retornoPrevisto: cautela.retornoPrevisto,
          observacao: cautela.observacao,
        },
      }),
    ]),
  );

  for (const item of itens) await reindexarItem(item.id);
}

/* --- Leitura --------------------------------------------------------------- */

cautelasRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const f = listarCautelasSchema.parse(req.query);
    const [, numTexto, anoTexto] = f.q?.trim().match(/^(\d+)(?:\/(\d{4}))?$/) ?? [];
    const numero = numTexto ? Number(numTexto) : undefined;
    const ano = anoTexto ? Number(anoTexto) : undefined;

    const where: Prisma.CautelaWhereInput = {
      ...(f.status === 'abertas' ? { fechadaEm: null } : {}),
      ...(f.status === 'encerradas' ? { fechadaEm: { not: null } } : {}),
      ...(f.pessoa ? { responsavelId: f.pessoa } : {}),
      ...(f.q
        ? {
            OR: [
              ...(numero ? [{ numero, ...(ano ? { ano } : {}) }] : []),
              { responsavel: { nome: { contains: f.q, mode: 'insensitive' as const } } },
              { destino: { nome: { contains: f.q, mode: 'insensitive' as const } } },
              { destinoDetalhe: { contains: f.q, mode: 'insensitive' as const } },
              { itens: { some: { OR: [{ nome: { contains: f.q, mode: 'insensitive' as const } }, { pr: { contains: f.q } }] } } },
            ],
          }
        : {}),
    };

    const [total, cautelas, mapa] = await Promise.all([
      prisma.cautela.count({ where }),
      prisma.cautela.findMany({
        where,
        include: includeCautela,
        // Abertas: prazo mais urgente primeiro. Demais: mais recentes primeiro.
        orderBy:
          f.status === 'abertas'
            ? [{ retornoPrevisto: { sort: 'asc', nulls: 'last' } }, { ano: 'desc' }, { numero: 'desc' }]
            : [{ ano: 'desc' }, { numero: 'desc' }],
        skip: (f.pagina - 1) * 40,
        take: 40,
      }),
      carregarLocais(),
    ]);

    res.json({ total, cautelas: cautelas.map((c) => serializar(c, mapa)) });
  }),
);

/** Próximo número — mostrado na tela antes de criar. */
cautelasRouter.get(
  '/next-number',
  asyncHandler(async (_req, res) => {
    const ano = new Date().getFullYear();
    res.json({ numero: await proximoNumero(ano), ano });
  }),
);

cautelasRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    await responder(res, req.params.id as string);
  }),
);

/**
 * Próximo número dentro do ano. Cada ano recomeça em 1; o número inicial
 * configurado só vale para o ano configurado (continuação do papel).
 */
async function proximoNumero(ano: number) {
  const [settings, ultimo] = await Promise.all([
    obterSettings(),
    prisma.cautela.aggregate({ where: { ano }, _max: { numero: true } }),
  ]);
  const piso = ano === settings.anoNumeroInicial ? settings.numeroInicialCautela : 1;
  return Math.max((ultimo._max.numero ?? 0) + 1, piso);
}

/* --- Criação --------------------------------------------------------------- */

cautelasRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const dados = cautelaSchema.parse(req.body);
    const usuario = usuarioAtual(req);
    await resolverReferencias(dados);

    // Duas cautelas criadas ao mesmo tempo disputam o número; o índice único
    // garante que só uma vence, e a outra tenta de novo com o seguinte.
    const ano = new Date().getFullYear();
    let criada: { id: string; numero: number; ano: number } | null = null;
    for (let tentativa = 0; tentativa < 3 && !criada; tentativa += 1) {
      try {
        criada = await prisma.cautela.create({
          data: {
            ano,
            numero: await proximoNumero(ano),
            responsavelId: dados.responsavelId,
            destinoId: dados.destinoId,
            destinoDetalhe: dados.destinoDetalhe,
            motivoId: dados.motivoId,
            tecnicoTransporte: dados.tecnicoTransporte,
            retornoPrevisto: dados.retornoPrevisto,
            observacao: dados.observacao,
            criadaPorId: usuario.id,
          },
          select: { id: true, numero: true, ano: true },
        });
      } catch (erro) {
        const conflito =
          erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002';
        if (!conflito) throw erro;
      }
    }
    if (!criada) throw new AppError(409, 'Não foi possível numerar a cautela. Tente novamente.');

    try {
      await entregarItens(criada.id, rotuloCautela(criada), dados.itens, usuario);
    } catch (erro) {
      // Sem itens a cautela não tem sentido: desfaz para não queimar o número.
      await prisma.cautela.delete({ where: { id: criada.id } });
      throw erro;
    }

    await responder(res, criada.id, 201);
  }),
);

/* --- Alterações ------------------------------------------------------------ */

/** Corrige responsável, destino, prazo, motivo, técnico e observação. */
cautelasRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const dados = editarCautelaSchema.parse(req.body);
    const usuario = usuarioAtual(req);
    const atual = await carregar(req.params.id as string);
    if (atual.fechadaEm) throw new AppError(409, 'Esta cautela já foi encerrada.');

    const { pessoa, setor, motivo } = await resolverReferencias(dados);

    const mudancas: string[] = [];
    if (dados.responsavelId !== atual.responsavelId) mudancas.push(`responsável para ${pessoa.nome}`);
    if (dados.destinoId !== atual.destinoId || dados.destinoDetalhe !== atual.destinoDetalhe) {
      mudancas.push('destino');
    }
    if (dados.retornoPrevisto?.getTime() !== atual.retornoPrevisto?.getTime()) {
      mudancas.push(
        dados.retornoPrevisto
          ? `prazo para ${dados.retornoPrevisto.toLocaleDateString('pt-BR')}`
          : 'removeu o prazo',
      );
    }
    if (dados.motivoId !== atual.motivoId) mudancas.push('motivo');
    if (dados.tecnicoTransporte !== atual.tecnicoTransporte) mudancas.push('técnico do transporte');

    const pendentes = atual.itens.filter((i) => !i.devolvidoEm);
    const descricao = `Alterou a cautela nº ${rotuloCautela(atual)}${mudancas.length ? `: ${mudancas.join(', ')}` : ''}`;

    await prisma.$transaction([
      prisma.cautela.update({
        where: { id: atual.id },
        data: {
          responsavelId: dados.responsavelId,
          destinoId: dados.destinoId,
          destinoDetalhe: dados.destinoDetalhe,
          motivoId: dados.motivoId,
          tecnicoTransporte: dados.tecnicoTransporte,
          retornoPrevisto: dados.retornoPrevisto,
          observacao: dados.observacao,
        },
      }),
      ...pendentes.flatMap((i) => [
        prisma.equipment.update({
          where: { id: i.equipmentId },
          data: {
            responsavelId: dados.responsavelId,
            destinoId: dados.destinoId,
            destinoDetalhe: dados.destinoDetalhe,
            motivoId: dados.motivoId,
            retornoPrevisto: dados.retornoPrevisto,
            saidaObservacao: dados.observacao,
          },
        }),
        prisma.movement.create({
          data: {
            equipmentId: i.equipmentId,
            tipo: 'EDICAO_SAIDA',
            descricao,
            usuarioId: usuario.id,
            usuarioNome: usuario.nome,
            destinoCaminho: textoDestino(setor, dados.destinoDetalhe),
            pessoaId: pessoa.id,
            pessoaNome: pessoa.nome,
            setorId: setor?.id,
            setorNome: setor?.nome,
            motivoId: motivo?.id,
            motivoNome: motivo?.nome,
            retornoPrevisto: dados.retornoPrevisto,
            observacao: dados.observacao,
          },
        }),
      ]),
    ]);

    for (const i of pendentes) await reindexarItem(i.equipmentId);
    await responder(res, atual.id);
  }),
);

/** Inclui mais itens numa cautela ainda aberta ("esqueci o cabo"). */
cautelasRouter.post(
  '/:id/items',
  asyncHandler(async (req, res) => {
    const { itens } = adicionarItensSchema.parse(req.body);
    const atual = await carregar(req.params.id as string);
    if (atual.fechadaEm) throw new AppError(409, 'Esta cautela já foi encerrada.');

    const jaNaCautela = new Set(atual.itens.map((i) => i.equipmentId));
    const novos = itens.filter((id) => !jaNaCautela.has(id));
    if (novos.length) await entregarItens(atual.id, rotuloCautela(atual), novos, usuarioAtual(req));

    await responder(res, atual.id);
  }),
);

/**
 * Devolução da cautela inteira. Todos os itens voltam juntos, na mesma data,
 * e a cautela é encerrada. Cada item pode registrar o estado em que voltou.
 */
cautelasRouter.post(
  '/:id/return',
  asyncHandler(async (req, res) => {
    const dados = devolverCautelaSchema.parse(req.body);
    const usuario = usuarioAtual(req);
    const atual = await carregar(req.params.id as string);
    if (atual.fechadaEm) throw new AppError(409, 'Esta cautela já foi encerrada.');

    const estados = new Map(dados.estados.map((e): [string, typeof e.estadoFisico] => [e.equipmentId, e.estadoFisico]));
    const pendentes = atual.itens.filter((i) => !i.devolvidoEm);
    const mapa = await carregarLocais();
    const agora = new Date();
    const rotulo = rotuloCautela(atual);

    await prisma.$transaction([
      ...pendentes.flatMap((item) => {
        const equip = item.equipment;
        const estado = estados.get(item.equipmentId) ?? equip.estadoFisico;
        const avaria = estado !== equip.estadoFisico;

        return [
          prisma.cautelaItem.update({
            where: { id: item.id },
            data: { devolvidoEm: agora, recebidoPor: dados.recebidoPor, estadoDevolucao: estado },
          }),
          prisma.equipment.update({
            where: { id: item.equipmentId },
            data: {
              situacao: 'DISPONIVEL',
              estadoFisico: estado,
              cautelaId: null,
              responsavelId: null,
              destinoId: null,
              destinoDetalhe: null,
              motivoId: null,
              saidaEm: null,
              retornoPrevisto: null,
              saidaObservacao: null,
            },
          }),
          prisma.movement.create({
            data: {
              equipmentId: item.equipmentId,
              tipo: 'DEVOLUCAO',
              descricao: `Devolvido pela cautela nº ${rotulo}, recebido por ${dados.recebidoPor}`,
              usuarioId: usuario.id,
              usuarioNome: usuario.nome,
              origemCaminho: textoDestino(atual.destino, atual.destinoDetalhe),
              destinoCaminho: caminhoTexto(mapa, equip.locationId),
              pessoaId: atual.responsavelId,
              pessoaNome: atual.responsavel.nome,
              observacao:
                [avaria ? `Voltou em estado ${estado.toLowerCase()}` : null, dados.observacao]
                  .filter(Boolean)
                  .join('. ') || null,
            },
          }),
        ];
      }),
      prisma.cautela.update({ where: { id: atual.id }, data: { fechadaEm: agora } }),
    ]);

    for (const item of pendentes) await reindexarItem(item.equipmentId);
    await responder(res, atual.id);
  }),
);
