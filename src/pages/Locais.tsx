import {
  Archive,
  ArchiveRestore,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  ListPlus,
  MapPin,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { NumberField, TextAreaField, TextField } from '../components/Form';
import { ConfirmDialog, Overlay } from '../components/Overlay';
import { LocationPicker } from '../components/Pickers';
import { useToast } from '../components/Toast';
import { Button, EmptyState, Highlight } from '../components/ui';
import { api, mensagemDeErro } from '../lib/api';
import { caminhoCompleto, normalizar } from '../lib/format';
import { nomeRepetido, proximoNumero, sugerirTipo } from '../lib/locais';
import { useAsync } from '../lib/useAsync';
import { useAuth } from '../state/AuthState';
import { useCatalog } from '../state/CatalogState';
import type { Local } from '../types/equipment';

interface Lote {
  parentId: string | null;
  tipo: string;
  prefixo: string;
  /** O prefixo acompanha o tipo até o usuário mexer nele. */
  prefixoEditado: boolean;
  inicio: number | '';
  fim: number | '';
}

const LIMITE_LOTE = 50;

/** Árvore de locais: navegação à esquerda, detalhe e ações à direita. */
export function Locais() {
  const { locais, filhosDe, caminhoDe, recarregar } = useCatalog();
  const { ehAdmin } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const atualId = params.get('no');
  const atual = locais.find((l) => l.id === atualId) ?? null;

  const [editando, setEditando] = useState<Partial<Local> | null>(null);
  const [excluindo, setExcluindo] = useState<Local | null>(null);
  const [arquivando, setArquivando] = useState<Local | null>(null);
  const [lote, setLote] = useState<Lote | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const [busca, setBusca] = useState('');
  const [verArquivados, setVerArquivados] = useState(false);
  const tipos = useAsync(() => api.tiposDeLocal(), []);

  const porId = useMemo(() => new Map(locais.map((l) => [l.id, l])), [locais]);
  const opcoesFilhos = { incluirArquivados: verArquivados };
  const filhos = (id: string | null) => filhosDe(id, opcoesFilhos);

  const itens = useAsync(
    () => (atualId ? api.buscar({ local: atualId }) : Promise.resolve(null)),
    [atualId, locais.length],
  );

  /** Na busca: o que casa com o termo e todos os locais acima deles. */
  const termo = normalizar(busca);
  const visiveisNaBusca = useMemo(() => {
    if (!termo) return null;
    const ids = new Set<string>();
    for (const l of locais) {
      if (!verArquivados && l.arquivado) continue;
      if (!normalizar(l.nome).includes(termo) && !normalizar(l.tipo).includes(termo)) continue;
      let no: Local | undefined = l;
      while (no && !ids.has(no.id)) {
        ids.add(no.id);
        no = no.parentId ? porId.get(no.parentId) : undefined;
      }
    }
    return ids;
  }, [termo, locais, porId, verArquivados]);

  const comFilhos = locais.filter((l) => filhos(l.id).length > 0).map((l) => l.id);
  const tudoAberto = comFilhos.length > 0 && comFilhos.every((id) => abertos.has(id));

  function alternar(id: string) {
    setAbertos((a) => {
      const n = new Set(a);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function selecionar(id: string) {
    setParams({ no: id });
    // Garante que o caminho até o local escolhido fique aberto na árvore.
    setAbertos((a) => {
      const n = new Set(a);
      for (const no of caminhoDe(porId.get(id)?.parentId)) n.add(no.id);
      return n;
    });
  }

  /* --- Criar / editar ------------------------------------------------------ */

  function novoDentro(paiId: string | null) {
    const pai = paiId ? porId.get(paiId) : null;
    setEditando({ nome: '', tipo: sugerirTipo(pai, filhosDe(paiId)), parentId: paiId });
  }

  const irmaosDoEditado = editando
    ? filhosDe(editando.parentId ?? null, { incluirArquivados: true })
    : [];
  const repetido = editando?.nome?.trim()
    ? nomeRepetido(editando.nome, irmaosDoEditado, editando.id)
    : undefined;

  async function salvar() {
    if (!editando?.nome?.trim() || !editando.tipo?.trim() || repetido) return;
    setSalvando(true);
    try {
      const dados = {
        nome: editando.nome,
        tipo: editando.tipo,
        descricao: editando.descricao ?? null,
        parentId: editando.parentId ?? null,
      };
      const salvo = editando.id
        ? await api.atualizarLocal(editando.id, dados)
        : await api.criarLocal(dados);
      await recarregar();
      setEditando(null);
      if (salvo.parentId) setAbertos((a) => new Set(a).add(salvo.parentId!));
      toast.sucesso(editando.id ? 'Local atualizado' : 'Local criado');
    } catch (e) {
      toast.erro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }

  /* --- Lote ------------------------------------------------------------- */

  function abrirLote(paiId: string | null) {
    const pai = paiId ? porId.get(paiId) : null;
    const irmaos = filhosDe(paiId, { incluirArquivados: true });
    const tipo = sugerirTipo(pai, filhosDe(paiId)) || 'Prateleira';
    const inicio = proximoNumero(tipo, irmaos);
    setLote({ parentId: paiId, tipo, prefixo: tipo, prefixoEditado: false, inicio, fim: inicio + 3 });
  }

  const nomesDoLote = useMemo(() => {
    if (!lote || lote.inicio === '' || lote.fim === '' || !lote.prefixo.trim()) return [];
    if (lote.fim < lote.inicio || lote.fim - lote.inicio >= LIMITE_LOTE) return [];
    const irmaos = filhosDe(lote.parentId, { incluirArquivados: true });
    const nomes: { nome: string; existe: boolean }[] = [];
    for (let n = lote.inicio; n <= lote.fim; n++) {
      const nome = `${lote.prefixo.trim()} ${n}`;
      nomes.push({ nome, existe: Boolean(nomeRepetido(nome, irmaos)) });
    }
    return nomes;
  }, [lote, filhosDe]);

  const erroLote =
    lote && lote.inicio !== '' && lote.fim !== ''
      ? lote.fim < lote.inicio
        ? 'O último número precisa ser maior ou igual ao primeiro.'
        : lote.fim - lote.inicio >= LIMITE_LOTE
          ? `Crie no máximo ${LIMITE_LOTE} de uma vez.`
          : undefined
      : undefined;
  const novosNoLote = nomesDoLote.filter((n) => !n.existe).length;

  async function criarLote() {
    if (!lote || lote.inicio === '' || lote.fim === '' || !novosNoLote) return;
    setSalvando(true);
    try {
      const r = await api.criarLocaisEmLote({
        parentId: lote.parentId,
        tipo: lote.tipo.trim(),
        prefixo: lote.prefixo.trim(),
        inicio: lote.inicio,
        fim: lote.fim,
      });
      await recarregar();
      if (lote.parentId) setAbertos((a) => new Set(a).add(lote.parentId!));
      setLote(null);
      toast.sucesso(
        `${r.criados.length} ${r.criados.length === 1 ? 'local criado' : 'locais criados'}` +
          (r.ignorados.length ? ` · ${r.ignorados.length} já existia(m)` : ''),
      );
    } catch (e) {
      toast.erro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }

  /* --- Arquivar / excluir ---------------------------------------------------- */

  async function alternarArquivo(local: Local, arquivar: boolean) {
    try {
      await api.arquivarLocal(local.id, arquivar);
      await recarregar();
      toast.sucesso(arquivar ? 'Local arquivado' : 'Local desarquivado');
      if (arquivar && !verArquivados && atualId === local.id) setParams({}, { replace: true });
    } catch (e) {
      toast.erro(mensagemDeErro(e));
    } finally {
      setArquivando(null);
    }
  }

  async function excluir() {
    if (!excluindo) return;
    try {
      await api.excluirLocal(excluindo.id);
      await recarregar();
      if (atualId === excluindo.id) setParams({}, { replace: true });
      toast.sucesso('Local excluído');
    } catch (e) {
      toast.erro(mensagemDeErro(e));
    } finally {
      setExcluindo(null);
    }
  }

  /* --- Árvore ----------------------------------------------------------- */

  function Ramo({ id, nivel }: { id: string | null; nivel: number }) {
    const lista = filhos(id).filter((l) => !visiveisNaBusca || visiveisNaBusca.has(l.id));
    return (
      <>
        {lista.map((local) => {
          const temFilhos = filhos(local.id).some((f) => !visiveisNaBusca || visiveisNaBusca.has(f.id));
          const aberto = visiveisNaBusca ? temFilhos : abertos.has(local.id);
          return (
            <div key={local.id}>
              <div
                className={`tree__node${atualId === local.id ? ' tree__node--ativo' : ''}${
                  local.arquivado ? ' tree__node--arquivado' : ''
                }`}
                style={{ paddingLeft: `calc(var(--space-2) + ${nivel} * var(--space-4))` }}
              >
                <button
                  type="button"
                  className={`tree__toggle${aberto ? ' tree__toggle--aberto' : ''}`}
                  onClick={() => alternar(local.id)}
                  aria-label={aberto ? `Fechar ${local.nome}` : `Abrir ${local.nome}`}
                  aria-expanded={aberto}
                  disabled={Boolean(visiveisNaBusca)}
                  style={{ visibility: temFilhos ? 'visible' : 'hidden' }}
                >
                  <ChevronRight size={16} strokeWidth={1.5} />
                </button>
                <button type="button" className="tree__label truncate" onClick={() => selecionar(local.id)}>
                  <span><Highlight texto={local.nome} termo={busca} /></span>
                </button>
                {local.arquivado ? (
                  <span className="tree__tag">Arquivado</span>
                ) : (
                  <span className="tree__count">{local.total || ''}</span>
                )}
              </div>
              {aberto && <Ramo id={local.id} nivel={nivel + 1} />}
            </div>
          );
        })}
      </>
    );
  }

  const filhosDoAtual = atual ? filhos(atual.id) : [];
  const arquivadoPorCima = atual
    ? caminhoDe(atual.parentId).some((n) => porId.get(n.id)?.arquivado)
    : false;

  return (
    <div className="container">
      <header className="page-header">
        <div className="page-header__text">
          <h1 className="title-page">Locais</h1>
          <p className="text-secondary text-sm">
            Monte a estrutura física como ela existe: prédio, sala, armário, prateleira, gaveta…
          </p>
        </div>
        {ehAdmin && (
          <Button variant="primary" icon={<Plus size={16} strokeWidth={1.5} />} onClick={() => novoDentro(null)}>
            Novo local
          </Button>
        )}
      </header>

      {locais.length === 0 ? (
        <EmptyState
          icon={<MapPin size={24} strokeWidth={1.5} />}
          titulo="Nenhum local cadastrado"
          descricao="Comece pelo maior: um prédio ou a sala do acervo. Depois crie o que fica dentro."
          acao={ehAdmin ? <Button variant="primary" onClick={() => novoDentro(null)}>Criar o primeiro local</Button> : undefined}
        />
      ) : (
        <div className="tree-page">
          <div className="tree-page__nav">
            <div className="tree-tools">
              <div className="field__control">
                <Search size={16} strokeWidth={1.5} aria-hidden="true" />
                <input
                  className="field__input"
                  placeholder="Buscar local…"
                  aria-label="Buscar local na árvore"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>
              <div className="tree-tools__row">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={Boolean(busca) || comFilhos.length === 0}
                  icon={tudoAberto ? <ChevronsDownUp size={14} strokeWidth={1.5} /> : <ChevronsUpDown size={14} strokeWidth={1.5} />}
                  onClick={() => setAbertos(tudoAberto ? new Set() : new Set(comFilhos))}
                >
                  {tudoAberto ? 'Recolher tudo' : 'Expandir tudo'}
                </Button>
                <label className="tree-tools__check">
                  <input type="checkbox" checked={verArquivados} onChange={(e) => setVerArquivados(e.target.checked)} />
                  Mostrar arquivados
                </label>
              </div>
            </div>
            <nav className="tree" aria-label="Árvore de locais">
              {visiveisNaBusca && visiveisNaBusca.size === 0 ? (
                <p className="tree__empty">Nenhum local com “{busca}”.</p>
              ) : filhos(null).length === 0 ? (
                <p className="tree__empty">Todos os locais estão arquivados. Marque “Mostrar arquivados”.</p>
              ) : (
                <Ramo id={null} nivel={0} />
              )}
            </nav>
          </div>

          <div className="panel">
            {!atual ? (
              <p className="text-secondary">Escolha um local à esquerda para ver o que há dentro.</p>
            ) : (
              <>
                <div className="panel__head">
                  <div className="stack" style={{ gap: 'var(--space-1)' }}>
                    <span className="tipo-tag">{atual.tipo}</span>
                    <h2 className="title-section">{atual.nome}</h2>
                    <span className="entity__sub">{caminhoCompleto(caminhoDe(atual.parentId)) || 'Nível principal'}</span>
                  </div>
                  {ehAdmin && (
                    <div className="row" style={{ gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                      {!atual.arquivado && (
                        <>
                          <Button size="sm" icon={<Plus size={14} strokeWidth={1.5} />} onClick={() => novoDentro(atual.id)}>
                            Criar dentro
                          </Button>
                          <Button size="sm" icon={<ListPlus size={14} strokeWidth={1.5} />} onClick={() => abrirLote(atual.id)}>
                            Criar vários
                          </Button>
                        </>
                      )}
                      <Button size="sm" icon={<Pencil size={14} strokeWidth={1.5} />} onClick={() => setEditando(atual)}>Editar</Button>
                      {atual.arquivado ? (
                        <Button size="sm" icon={<ArchiveRestore size={14} strokeWidth={1.5} />} onClick={() => void alternarArquivo(atual, false)}>
                          Desarquivar
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" icon={<Archive size={14} strokeWidth={1.5} />} onClick={() => setArquivando(atual)}>
                          Arquivar
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" icon={<Trash2 size={14} strokeWidth={1.5} />} onClick={() => setExcluindo(atual)}>Excluir</Button>
                    </div>
                  )}
                </div>

                {atual.arquivado && (
                  <p className="text-secondary text-sm">
                    Arquivado: não aparece nos seletores nem na árvore.
                    {arquivadoPorCima
                      ? ' Desarquivar reativa também os locais de cima.'
                      : ' Desarquivar reativa também o que está dentro.'}
                  </p>
                )}
                {atual.descricao && <p className="text-secondary">{atual.descricao}</p>}

                <div className="row" style={{ gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  {atual.arquivado && <span className="pill">Arquivado</span>}
                  <span className="pill">{atual.diretos} item(ns) aqui</span>
                  <span className="pill">{atual.total} contando o que está dentro</span>
                  <span className="pill">{filhosDoAtual.length} local(is) dentro</span>
                </div>

                {filhosDoAtual.length > 0 && (
                  <div className="stack" style={{ gap: 'var(--space-3)' }}>
                    <span className="label">Dentro deste local</span>
                    <div className="children-grid">
                      {filhosDoAtual.map((f) => (
                        <button key={f.id} type="button" className="child-card" onClick={() => selecionar(f.id)}>
                          <span className="tipo-tag">{f.arquivado ? `${f.tipo} · arquivado` : f.tipo}</span>
                          <span className="entity__title">{f.nome}</span>
                          <span className="entity__sub tabular">{f.total} itens</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="stack" style={{ gap: 'var(--space-3)' }}>
                  <div className="section__head" style={{ margin: 0 }}>
                    <span className="label">Equipamentos guardados aqui</span>
                    <Link to={`/equipamentos?local=${atual.id}`} className="text-sm">Abrir na busca</Link>
                  </div>
                  {(itens.dados?.resultados.length ?? 0) === 0 ? (
                    <p className="text-secondary text-sm row" style={{ gap: 'var(--space-2)' }}>
                      <Package size={16} strokeWidth={1.5} /> Nenhum equipamento aqui ainda.
                    </p>
                  ) : (
                    <div className="entity-list">
                      {itens.dados!.resultados.slice(0, 12).map(({ item }) => (
                        <Link key={item.id} to={`/equipamento/${item.id}`} className="entity">
                          <span className="entity__body">
                            <span className="entity__title">{item.nome}</span>
                            <span className="entity__sub tabular">PR {item.pr}</span>
                          </span>
                          <ChevronRight size={16} strokeWidth={1.5} className="text-tertiary" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Criar / editar */}
      <Overlay
        aberto={Boolean(editando)}
        onFechar={() => setEditando(null)}
        titulo={editando?.id ? 'Editar local' : 'Novo local'}
        rodape={
          <>
            <Button variant="ghost" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button
              variant="primary"
              loading={salvando}
              disabled={!editando?.nome?.trim() || !editando?.tipo?.trim() || Boolean(repetido)}
              onClick={() => void salvar()}
            >
              Salvar
            </Button>
          </>
        }
      >
        {editando && (
          <>
            <TextField
              label="Nome"
              valor={editando.nome ?? ''}
              onChange={(v) => setEditando({ ...editando, nome: v })}
              placeholder="Armário A, Prateleira 3, Sala 12…"
              erro={
                repetido
                  ? repetido.arquivado
                    ? `Já existe "${repetido.nome}" neste nível, arquivado. Desarquive-o em vez de criar outro.`
                    : `Já existe "${repetido.nome}" neste nível. Use outro nome.`
                  : undefined
              }
            />
            <TextField
              label="Tipo" valor={editando.tipo ?? ''} onChange={(v) => setEditando({ ...editando, tipo: v })}
              lista={tipos.dados ?? []} ajuda="Prédio, sala, armário, prateleira, gaveta — o que fizer sentido."
            />
            <LocationPicker
              label="Fica dentro de"
              valor={editando.parentId ?? null}
              onChange={(id) => setEditando({ ...editando, parentId: id })}
              onEscolherRaiz={() => setEditando({ ...editando, parentId: null })}
              excluir={editando.id}
              permitirCriar={false}
              ajuda={editando.id ? 'Mudar aqui leva junto tudo o que está dentro, inclusive os equipamentos.' : undefined}
            />
            <TextAreaField label="Descrição" opcional linhas={2} valor={editando.descricao ?? ''} onChange={(v) => setEditando({ ...editando, descricao: v })} />
          </>
        )}
      </Overlay>

      {/* Criar vários */}
      <Overlay
        aberto={Boolean(lote)}
        onFechar={() => setLote(null)}
        titulo="Criar vários locais"
        rodape={
          <>
            <Button variant="ghost" onClick={() => setLote(null)}>Cancelar</Button>
            <Button
              variant="primary"
              loading={salvando}
              disabled={!novosNoLote || Boolean(erroLote) || !lote?.tipo.trim()}
              onClick={() => void criarLote()}
            >
              {novosNoLote ? `Criar ${novosNoLote}` : 'Criar'}
            </Button>
          </>
        }
      >
        {lote && (
          <>
            <p className="text-secondary text-sm">
              Dentro de: <strong>{caminhoCompleto(caminhoDe(lote.parentId)) || 'nível principal'}</strong>
            </p>
            <TextField
              label="Tipo"
              valor={lote.tipo}
              lista={tipos.dados ?? []}
              onChange={(v) =>
                setLote({ ...lote, tipo: v, prefixo: lote.prefixoEditado ? lote.prefixo : v })
              }
            />
            <TextField
              label="Nome base"
              valor={lote.prefixo}
              ajuda="Cada local recebe o nome base seguido do número."
              onChange={(v) => setLote({ ...lote, prefixo: v, prefixoEditado: true })}
            />
            <div className="range-fields">
              <NumberField label="Do número" valor={lote.inicio} min={0} onChange={(v) => setLote({ ...lote, inicio: v })} />
              <NumberField label="Até o número" valor={lote.fim} min={0} onChange={(v) => setLote({ ...lote, fim: v })} />
            </div>
            {erroLote ? (
              <span className="field__error">{erroLote}</span>
            ) : (
              nomesDoLote.length > 0 && (
                <div className="stack" style={{ gap: 'var(--space-2)' }}>
                  <span className="label">Serão criados</span>
                  <div className="batch-preview">
                    {nomesDoLote.map((n) => (
                      <span key={n.nome} className="pill" title={n.existe ? 'Já existe — será ignorado' : undefined}>
                        {n.existe ? <s>{n.nome}</s> : n.nome}
                      </span>
                    ))}
                  </div>
                  {nomesDoLote.some((n) => n.existe) && (
                    <span className="field__help">Os riscados já existem neste nível e serão ignorados.</span>
                  )}
                </div>
              )
            )}
          </>
        )}
      </Overlay>

      <ConfirmDialog
        aberto={Boolean(arquivando)}
        titulo="Arquivar local"
        descricao={`${arquivando?.nome ?? ''} e tudo o que está dentro dele saem das listas e dos seletores. Nada é apagado: o histórico continua e dá para desarquivar quando quiser. Só é possível arquivar sem equipamentos guardados.`}
        rotuloConfirmar="Arquivar"
        onCancelar={() => setArquivando(null)}
        onConfirmar={() => arquivando && void alternarArquivo(arquivando, true)}
      />

      <ConfirmDialog
        aberto={Boolean(excluindo)}
        titulo="Excluir local"
        descricao={`${excluindo?.nome ?? ''} será removido. Só é possível excluir locais vazios. Se o local só não é mais usado, prefira arquivar.`}
        rotuloConfirmar="Excluir"
        perigo
        onCancelar={() => setExcluindo(null)}
        onConfirmar={() => void excluir()}
      />
    </div>
  );
}
