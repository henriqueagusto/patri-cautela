import { Router } from 'express';
import {
  auditar,
  caminho,
  carregarLocais,
  reindexar,
  subarvore,
  type MapaLocais,
  type NoLocal,
} from '../lib/core.js';
import { autenticar, somenteAdmin, usuarioAtual } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/error.js';
import { normalizar, prisma } from '../prisma.js';
import { arquivarLocalSchema, localSchema, locaisEmLoteSchema } from '../validation.js';

/**
 * Árvore livre de locais. Devolvida plana (com parentId); a interface monta a
 * árvore. Cada nó traz quantos itens tem diretamente e no total (subárvore).
 *
 * Regras:
 * - Dois locais com o mesmo nome não podem ficar no mesmo nível (mesmo pai).
 * - Arquivar tira o local das listas e seletores sem apagar nada; vale para a
 *   subárvore inteira. Só é possível sem equipamentos guardados na subárvore.
 * - Dentro de um local arquivado não se cria nem se move nada.
 */
export const locationsRouter = Router();
locationsRouter.use(autenticar);

/* --- Regras compartilhadas ------------------------------------------------ */

/** Recusa nome repetido entre irmãos (mesmo pai), ignorando acento e caixa. */
async function exigirNomeLivre(nome: string, parentId: string | null, ignorarId?: string) {
  const irmaos = await prisma.location.findMany({
    where: { parentId, ...(ignorarId ? { id: { not: ignorarId } } : {}) },
    select: { nome: true, arquivado: true },
  });
  const alvo = normalizar(nome);
  const repetido = irmaos.find((i) => normalizar(i.nome) === alvo);
  if (!repetido) return;
  throw new AppError(
    409,
    repetido.arquivado
      ? `Já existe "${repetido.nome}" neste nível, arquivado. Desarquive-o em vez de criar outro.`
      : `Já existe "${repetido.nome}" neste nível. Use outro nome.`,
  );
}

/** O local de cima precisa existir e estar em uso. */
async function exigirPaiAtivo(parentId: string | null | undefined) {
  if (!parentId) return;
  const pai = await prisma.location.findUnique({ where: { id: parentId } });
  if (!pai) throw new AppError(422, 'O local de cima não existe mais.');
  if (pai.arquivado) throw new AppError(422, `"${pai.nome}" está arquivado. Desarquive-o antes.`);
}

/* --- Leitura -------------------------------------------------------------- */

locationsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const [locais, contagens] = await Promise.all([
      prisma.location.findMany({ orderBy: { nome: 'asc' } }),
      prisma.equipment.groupBy({
        by: ['locationId'],
        where: { excluidoEm: null },
        _count: { _all: true },
      }),
    ]);

    const diretos = new Map<string, number>(
      contagens.map((c): [string, number] => [c.locationId, c._count._all]),
    );
    const mapa: MapaLocais = new Map(
      locais.map((l): [string, NoLocal] => [
        l.id,
        { id: l.id, nome: l.nome, tipo: l.tipo, parentId: l.parentId },
      ]),
    );

    res.json(
      locais.map((local) => ({
        ...local,
        diretos: diretos.get(local.id) ?? 0,
        total: subarvore(mapa, local.id).reduce((s, id) => s + (diretos.get(id) ?? 0), 0),
      })),
    );
  }),
);

/** Tipos já usados — viram sugestões no formulário (Sala, Armário, Gaveta…). */
locationsRouter.get(
  '/types',
  asyncHandler(async (_req, res) => {
    const tipos = await prisma.location.findMany({ distinct: ['tipo'], select: { tipo: true } });
    const padrao = ['Prédio', 'Andar', 'Sala', 'Armário', 'Prateleira', 'Gaveta', 'Caixa'];
    res.json([...new Set([...padrao, ...tipos.map((t) => t.tipo)])]);
  }),
);

/**
 * Locais usados por último pelo usuário: onde ele cadastrou, moveu ou
 * recebeu de volta equipamentos. Não precisa de coluna nova — sai do histórico.
 */
locationsRouter.get(
  '/recent',
  asyncHandler(async (req, res) => {
    const usuario = usuarioAtual(req);
    const movimentos = await prisma.movement.findMany({
      where: {
        usuarioId: usuario.id,
        tipo: { in: ['CADASTRO', 'MOVIMENTACAO', 'DEVOLUCAO'] },
        equipment: { excluidoEm: null },
      },
      orderBy: { data: 'desc' },
      take: 60,
      select: { equipment: { select: { locationId: true } } },
    });

    const ids: string[] = [];
    for (const m of movimentos) {
      const id = m.equipment.locationId;
      if (!ids.includes(id)) ids.push(id);
      if (ids.length >= 12) break;
    }
    const ativos = await prisma.location.findMany({
      where: { id: { in: ids }, arquivado: false },
      select: { id: true },
    });
    const validos = new Set(ativos.map((l) => l.id));
    res.json(ids.filter((id) => validos.has(id)).slice(0, 6));
  }),
);

/* --- Escrita (administrador) ---------------------------------------------- */

locationsRouter.post(
  '/',
  somenteAdmin,
  asyncHandler(async (req, res) => {
    const dados = localSchema.parse(req.body);
    await exigirPaiAtivo(dados.parentId);
    await exigirNomeLivre(dados.nome, dados.parentId ?? null);

    const criado = await prisma.location.create({ data: dados });
    await auditar(usuarioAtual(req), 'Local', 'criou', `${criado.tipo} ${criado.nome}`, criado.id);
    res.status(201).json(criado);
  }),
);

/** Vários locais irmãos de uma vez: "Prateleira 1" a "Prateleira 6". */
locationsRouter.post(
  '/batch',
  somenteAdmin,
  asyncHandler(async (req, res) => {
    const dados = locaisEmLoteSchema.parse(req.body);
    await exigirPaiAtivo(dados.parentId);

    const irmaos = await prisma.location.findMany({
      where: { parentId: dados.parentId ?? null },
      select: { nome: true },
    });
    const usados = new Set(irmaos.map((i) => normalizar(i.nome)));

    const nomes: string[] = [];
    const ignorados: string[] = [];
    for (let n = dados.inicio; n <= dados.fim; n++) {
      const nome = `${dados.prefixo} ${n}`;
      if (usados.has(normalizar(nome))) ignorados.push(nome);
      else nomes.push(nome);
    }
    if (nomes.length === 0) {
      throw new AppError(409, 'Todos esses nomes já existem neste nível.');
    }

    await prisma.location.createMany({
      data: nomes.map((nome) => ({ nome, tipo: dados.tipo, parentId: dados.parentId ?? null })),
    });
    await auditar(
      usuarioAtual(req),
      'Local',
      'criou',
      `${nomes.length} locais (${nomes[0]} a ${nomes[nomes.length - 1]})`,
    );
    res.status(201).json({ criados: nomes, ignorados });
  }),
);

locationsRouter.patch(
  '/:id',
  somenteAdmin,
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    const dados = localSchema.parse(req.body);
    const atual = await prisma.location.findUnique({ where: { id } });
    if (!atual) throw new AppError(404, 'Este local não existe mais.');

    const mapa = await carregarLocais();
    const novoPai = dados.parentId ?? null;

    // Impede mover um local para dentro dele mesmo ou de um descendente.
    if (novoPai && subarvore(mapa, id).includes(novoPai)) {
      throw new AppError(422, 'Um local não pode ficar dentro dele mesmo.');
    }
    if (novoPai !== atual.parentId) await exigirPaiAtivo(novoPai);
    await exigirNomeLivre(dados.nome, novoPai, id);

    const salvo = await prisma.location.update({
      where: { id },
      data: { ...dados, parentId: novoPai },
    });
    // Renomear ou mover muda o caminho de todos os itens da subárvore.
    await reindexar({ locationId: { in: subarvore(await carregarLocais(), id) } });

    const mudouDeLugar = novoPai !== atual.parentId;
    await auditar(
      usuarioAtual(req),
      'Local',
      'editou',
      mudouDeLugar
        ? `${salvo.tipo} ${salvo.nome} (agora em ${
            caminho(await carregarLocais(), novoPai).map((n) => n.nome).join(' › ') || 'nível principal'
          })`
        : `${salvo.tipo} ${salvo.nome}`,
      salvo.id,
    );
    res.json(salvo);
  }),
);

/**
 * Arquivar / desarquivar. Arquivar vale para a subárvore. Desarquivar reativa
 * a subárvore e também os locais de cima, para o caminho voltar a aparecer.
 */
locationsRouter.post(
  '/:id/archive',
  somenteAdmin,
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    const { arquivado } = arquivarLocalSchema.parse(req.body);
    const local = await prisma.location.findUnique({ where: { id } });
    if (!local) throw new AppError(404, 'Este local não existe mais.');

    const mapa = await carregarLocais();
    const ids = subarvore(mapa, id);

    if (arquivado) {
      const itens = await prisma.equipment.count({
        where: { locationId: { in: ids }, excluidoEm: null },
      });
      if (itens) {
        throw new AppError(
          409,
          `Há ${itens} equipamento(s) guardado(s) aqui ou nos locais de dentro. Mova-os antes de arquivar.`,
        );
      }
      await prisma.location.updateMany({ where: { id: { in: ids } }, data: { arquivado: true } });
    } else {
      const acima = caminho(mapa, id).map((n) => n.id);
      await prisma.location.updateMany({
        where: { id: { in: [...new Set([...ids, ...acima])] } },
        data: { arquivado: false },
      });
    }

    await auditar(
      usuarioAtual(req),
      'Local',
      arquivado ? 'arquivou' : 'desarquivou',
      `${local.tipo} ${local.nome}${ids.length > 1 ? ` e ${ids.length - 1} local(is) dentro` : ''}`,
      local.id,
    );
    res.json({ afetados: ids.length });
  }),
);

locationsRouter.delete(
  '/:id',
  somenteAdmin,
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    const [filhos, itens] = await Promise.all([
      prisma.location.count({ where: { parentId: id } }),
      prisma.equipment.count({ where: { locationId: id } }),
    ]);
    if (filhos) throw new AppError(409, 'Este local tem outros locais dentro. Remova-os ou mova-os antes.');
    if (itens) throw new AppError(409, `Há ${itens} equipamento(s) guardados aqui. Mova-os antes.`);

    const removido = await prisma.location.delete({ where: { id } });
    await auditar(usuarioAtual(req), 'Local', 'excluiu', `${removido.tipo} ${removido.nome}`, removido.id);
    res.status(204).end();
  }),
);
