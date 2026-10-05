import { ChevronRight, CornerLeftUp, History, MapPin, Plus, Search, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Overlay } from './Overlay';
import { TextField } from './Form';
import { useToast } from './Toast';
import { Avatar, Button } from './ui';
import { api, mensagemDeErro } from '../lib/api';
import { caminhoCompleto, normalizar } from '../lib/format';
import { nomeRepetido, sugerirTipo } from '../lib/locais';
import { useAuth } from '../state/AuthState';
import { useCatalog } from '../state/CatalogState';
import type { Local, Pessoa, Setor } from '../types/equipment';

/* --- Seletor de local ---------------------------------------------------- */

/**
 * Escolha de local navegando pela árvore (como pastas) ou buscando pelo nome.
 * Qualquer nível pode ser escolhido — não só as folhas. Locais arquivados não
 * aparecem. No topo, os locais usados por último; administrador cria um local
 * novo ali mesmo, sem sair do formulário.
 */
export function LocationPicker({
  label,
  valor,
  onChange,
  erro,
  ajuda,
  excluir,
  onEscolherRaiz,
  permitirCriar = true,
}: {
  label: string;
  valor: string | null;
  onChange: (id: string) => void;
  erro?: string;
  ajuda?: string;
  /** Esconde um local e seus descendentes (evita mover algo para dentro de si). */
  excluir?: string;
  /** Mostra a opção "Nível principal" (sem local acima) — usado ao editar um local. */
  onEscolherRaiz?: () => void;
  /** Permite ao administrador criar um local novo dentro do seletor. */
  permitirCriar?: boolean;
}) {
  const { caminhoDe, filhosDe, locais, recarregar } = useCatalog();
  const { ehAdmin } = useAuth();
  const toast = useToast();
  const [aberto, setAberto] = useState(false);
  const [atual, setAtual] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [recentes, setRecentes] = useState<string[]>([]);
  const [novo, setNovo] = useState<{ nome: string; tipo: string } | null>(null);
  const [criando, setCriando] = useState(false);

  const bloqueados = useMemo(() => {
    if (!excluir) return new Set<string>();
    const ids = new Set([excluir]);
    let mudou = true;
    while (mudou) {
      mudou = false;
      for (const l of locais) {
        if (l.parentId && ids.has(l.parentId) && !ids.has(l.id)) {
          ids.add(l.id);
          mudou = true;
        }
      }
    }
    return ids;
  }, [excluir, locais]);

  const porId = useMemo(() => new Map(locais.map((l) => [l.id, l])), [locais]);
  const caminhoValor = caminhoDe(valor);
  const trilha = caminhoDe(atual);
  const ativos = locais.filter((l) => !l.arquivado && !bloqueados.has(l.id));

  const opcoes = busca
    ? ativos.filter((l) => normalizar(l.nome).includes(normalizar(busca)))
    : filhosDe(atual).filter((l) => !bloqueados.has(l.id));

  const listaRecentes = recentes
    .map((id) => porId.get(id))
    .filter((l): l is Local => Boolean(l && !l.arquivado && !bloqueados.has(l.id)));
  const podeCriar = ehAdmin && permitirCriar && !busca;

  function abrir() {
    // Abre já dentro do nível pai do valor atual, para ajustes rápidos.
    const pai = valor ? porId.get(valor)?.parentId ?? null : null;
    setAtual(pai);
    setBusca('');
    setNovo(null);
    setAberto(true);
    api.locaisRecentes().then(setRecentes, () => setRecentes([]));
  }

  function escolher(id: string) {
    onChange(id);
    setAberto(false);
  }

  function entrar(id: string | null) {
    setAtual(id);
    setNovo(null);
  }

  function iniciarCriacao() {
    setNovo({ nome: '', tipo: sugerirTipo(atual ? porId.get(atual) : null, filhosDe(atual)) });
  }

  async function criar() {
    if (!novo) return;
    const nome = novo.nome.trim();
    if (!nome || !novo.tipo.trim()) return;
    const repetido = nomeRepetido(nome, filhosDe(atual, { incluirArquivados: true }));
    if (repetido) {
      toast.erro(`Já existe "${repetido.nome}" neste nível.`);
      return;
    }
    setCriando(true);
    try {
      const criado = await api.criarLocal({ nome, tipo: novo.tipo.trim(), parentId: atual });
      await recarregar();
      toast.sucesso('Local criado');
      // Entra no local novo: dá para guardar ali ou criar outro nível dentro.
      entrar(criado.id);
    } catch (e) {
      toast.erro(mensagemDeErro(e));
    } finally {
      setCriando(false);
    }
  }

  function Opcao({ local, comCaminho = false }: { local: Local; comCaminho?: boolean }) {
    const temFilhos = filhosDe(local.id).some((f) => !bloqueados.has(f.id));
    return (
      <div className="row" style={{ gap: 'var(--space-1)' }}>
        <button
          type="button"
          className={`opt${valor === local.id ? ' opt--selecionado' : ''}`}
          onClick={() => escolher(local.id)}
        >
          <MapPin size={18} strokeWidth={1.5} aria-hidden="true" />
          <span className="opt__body">
            <span className="opt__title">{local.nome}</span>
            <span className="opt__sub">
              <span className="tipo-tag">{local.tipo}</span>
              {comCaminho && ` · ${caminhoCompleto(caminhoDe(local.parentId)) || 'nível principal'}`}
              {!comCaminho && local.total > 0 && ` · ${local.total} itens`}
            </span>
          </span>
        </button>
        {temFilhos && !comCaminho && (
          <button
            type="button"
            className="opt__go"
            aria-label={`Abrir ${local.nome}`}
            onClick={() => entrar(local.id)}
          >
            <ChevronRight size={18} strokeWidth={1.5} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="field">
      <span className="label">{label}</span>
      <button
        type="button"
        className={`picker-trigger${valor ? '' : ' picker-trigger--vazio'}${
          erro ? ' picker-trigger--erro' : ''
        }`}
        onClick={abrir}
      >
        <MapPin size={16} strokeWidth={1.5} aria-hidden="true" />
        <span className="picker-trigger__text truncate">
          {valor ? caminhoCompleto(caminhoValor) : onEscolherRaiz ? 'Nível principal' : 'Escolher local…'}
        </span>
        <ChevronRight size={16} strokeWidth={1.5} aria-hidden="true" />
      </button>
      {erro ? (
        <span className="field__error">{erro}</span>
      ) : (
        ajuda && <span className="field__help">{ajuda}</span>
      )}

      <Overlay aberto={aberto} onFechar={() => setAberto(false)} titulo={label}>
        <div className="field__control">
          <Search size={16} strokeWidth={1.5} aria-hidden="true" />
          <input
            className="field__input"
            placeholder="Buscar local pelo nome…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        {!busca && (
          <nav className="crumbs" aria-label="Nível atual">
            <button type="button" className={`crumbs__item${atual ? '' : ' crumbs__item--atual'}`} onClick={() => entrar(null)}>
              Todos os locais
            </button>
            {trilha.map((no, i) => (
              <span key={no.id} className="row" style={{ gap: 'var(--space-1)' }}>
                <ChevronRight size={14} className="crumbs__sep" aria-hidden="true" />
                <button
                  type="button"
                  className={`crumbs__item${i === trilha.length - 1 ? ' crumbs__item--atual' : ''}`}
                  onClick={() => entrar(no.id)}
                >
                  {no.nome}
                </button>
              </span>
            ))}
          </nav>
        )}

        <div className="opt-list">
          {!busca && !atual && onEscolherRaiz && (
            <button
              type="button"
              className={`opt${valor ? '' : ' opt--selecionado'}`}
              onClick={() => {
                onEscolherRaiz();
                setAberto(false);
              }}
            >
              <CornerLeftUp size={18} strokeWidth={1.5} aria-hidden="true" />
              <span className="opt__body">
                <span className="opt__title">Nível principal</span>
                <span className="opt__sub">Não fica dentro de nenhum outro local</span>
              </span>
            </button>
          )}

          {!busca && atual && (
            <button type="button" className="opt" onClick={() => escolher(atual)}>
              <CornerLeftUp size={18} strokeWidth={1.5} aria-hidden="true" />
              <span className="opt__body">
                <span className="opt__title">
                  {onEscolherRaiz ? 'Colocar dentro de' : 'Guardar aqui, em'} {trilha.at(-1)?.nome}
                </span>
                <span className="opt__sub">Sem escolher um nível mais específico</span>
              </span>
            </button>
          )}

          {!busca && !atual && listaRecentes.length > 0 && (
            <>
              <span className="label opt-list__label">
                <History size={14} strokeWidth={1.5} aria-hidden="true" /> Usados por último
              </span>
              {listaRecentes.map((local) => (
                <Opcao key={`r-${local.id}`} local={local} comCaminho />
              ))}
              <span className="label opt-list__label">Navegar</span>
            </>
          )}

          {opcoes.length === 0 && !novo && (
            <p className="text-secondary text-sm" style={{ padding: 'var(--space-4) var(--space-3)' }}>
              {ativos.length === 0 && !atual
                ? 'Nenhum local cadastrado ainda.'
                : busca
                  ? 'Nenhum local com esse nome.'
                  : 'Não há locais dentro deste. Escolha "Guardar aqui".'}
            </p>
          )}

          {opcoes.map((local) => (
            <Opcao key={local.id} local={local} comCaminho={Boolean(busca)} />
          ))}
        </div>

        {podeCriar &&
          (novo ? (
            <div className="quick-create">
              <span className="label">
                Novo local {atual ? `em ${trilha.at(-1)?.nome}` : 'no nível principal'}
              </span>
              <div className="quick-create__fields">
                <TextField label="Nome" valor={novo.nome} onChange={(v) => setNovo({ ...novo, nome: v })} placeholder="Sala 12, Armário A…" />
                <TextField label="Tipo" valor={novo.tipo} onChange={(v) => setNovo({ ...novo, tipo: v })} lista={TIPOS_COMUNS} />
              </div>
              <div className="row" style={{ gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                <Button size="sm" variant="ghost" onClick={() => setNovo(null)}>Cancelar</Button>
                <Button
                  size="sm"
                  variant="primary"
                  loading={criando}
                  disabled={!novo.nome.trim() || !novo.tipo.trim()}
                  onClick={() => void criar()}
                >
                  Criar
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="ghost" icon={<Plus size={14} strokeWidth={1.5} />} onClick={iniciarCriacao}>
              Criar local {atual ? `dentro de ${trilha.at(-1)?.nome}` : 'no nível principal'}
            </Button>
          ))}
      </Overlay>
    </div>
  );
}

const TIPOS_COMUNS = ['Prédio', 'Andar', 'Sala', 'Armário', 'Prateleira', 'Gaveta', 'Caixa'];

/* --- Seletor de pessoa (com cadastro na hora) ----------------------------- */

export function PersonPicker({
  valor,
  onChange,
  erro,
  label = 'Com quem fica',
}: {
  valor: Pessoa | null;
  onChange: (pessoa: Pessoa | null) => void;
  erro?: string;
  label?: string;
}) {
  const { setores } = useCatalog();
  const toast = useToast();
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [criando, setCriando] = useState(false);
  const [nova, setNova] = useState({ nome: '', matricula: '', ramal: '', telefone: '', setorId: '' });
  const [salvando, setSalvando] = useState(false);

  async function abrir() {
    setAberto(true);
    setCriando(false);
    setBusca('');
    setPessoas(await api.pessoas().catch(() => []));
  }

  const filtradas = pessoas.filter(
    (p) =>
      p.ativo &&
      (normalizar(p.nome).includes(normalizar(busca)) ||
        (p.matricula ?? '').includes(busca)),
  );

  async function criar() {
    if (!nova.nome.trim()) return;
    setSalvando(true);
    try {
      const criada = await api.criarPessoa({
        nome: nova.nome,
        matricula: nova.matricula || null,
        telefone: nova.telefone || null,
        ramal: nova.ramal || null,
        setorId: nova.setorId || null,
      });
      onChange(criada);
      setAberto(false);
      toast.sucesso('Pessoa cadastrada');
    } catch (e) {
      toast.erro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="field">
      <span className="label">{label}</span>
      <button
        type="button"
        className={`picker-trigger${valor ? '' : ' picker-trigger--vazio'}${erro ? ' picker-trigger--erro' : ''}`}
        onClick={() => void abrir()}
      >
        {valor ? <Avatar nome={valor.nome} foto={valor.foto} size={24} /> : <UserRound size={16} strokeWidth={1.5} />}
        <span className="picker-trigger__text truncate">{valor ? valor.nome : 'Escolher pessoa…'}</span>
        <ChevronRight size={16} strokeWidth={1.5} aria-hidden="true" />
      </button>
      {erro && <span className="field__error">{erro}</span>}

      <Overlay
        aberto={aberto}
        onFechar={() => setAberto(false)}
        titulo={criando ? 'Nova pessoa' : label}
        rodape={
          criando ? (
            <>
              <Button variant="ghost" onClick={() => setCriando(false)}>Voltar</Button>
              <Button variant="primary" loading={salvando} disabled={!nova.nome.trim()} onClick={() => void criar()}>
                Cadastrar e escolher
              </Button>
            </>
          ) : undefined
        }
      >
        {criando ? (
          <div className="form-grid form-grid--full">
            <TextField label="Nome completo" valor={nova.nome} onChange={(v) => setNova({ ...nova, nome: v })} />
            <TextField label="PR" opcional valor={nova.matricula} onChange={(v) => setNova({ ...nova, matricula: v })} />
            <TextField label="Ramal" opcional tipo="tel" valor={nova.ramal} onChange={(v) => setNova({ ...nova, ramal: v })} />
            <TextField label="Celular" opcional tipo="tel" valor={nova.telefone} onChange={(v) => setNova({ ...nova, telefone: v })} />
            <div className="field">
              <label className="label" htmlFor="nova-setor">Setor <span className="field__optional">· opcional</span></label>
              <div className="field__control">
                <select id="nova-setor" className="field__input field__select" value={nova.setorId} onChange={(e) => setNova({ ...nova, setorId: e.target.value })}>
                  <option value="">Sem setor</option>
                  {setores.filter((s) => s.ativo).map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="field__control">
              <Search size={16} strokeWidth={1.5} aria-hidden="true" />
              <input className="field__input" placeholder="Nome ou PR…" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
            <div className="opt-list">
              <button type="button" className="opt" onClick={() => { setNova({ nome: busca, matricula: '', ramal: '', telefone: '', setorId: '' }); setCriando(true); }}>
                <Plus size={18} strokeWidth={1.5} aria-hidden="true" />
                <span className="opt__body">
                  <span className="opt__title">{busca ? `Cadastrar "${busca}"` : 'Cadastrar nova pessoa'}</span>
                  <span className="opt__sub">Sem sair desta tela</span>
                </span>
              </button>
              {filtradas.map((p) => (
                <button key={p.id} type="button" className={`opt${valor?.id === p.id ? ' opt--selecionado' : ''}`} onClick={() => { onChange(p); setAberto(false); }}>
                  <Avatar nome={p.nome} foto={p.foto} size={32} />
                  <span className="opt__body">
                    <span className="opt__title">{p.nome}</span>
                    <span className="opt__sub">
                      {[p.setor?.nome, p.matricula && `PR ${p.matricula}`, p.ramal && `Ramal ${p.ramal}`, p.itensAgora ? `${p.itensAgora} item(ns) com ela agora` : null].filter(Boolean).join(' · ') || 'Sem setor'}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </Overlay>
    </div>
  );
}

/* --- Seletor de destino/setor (com cadastro na hora) --------------------- */

export function SectorPicker({
  valor,
  onChange,
  erro,
  label = 'Para onde vai',
}: {
  valor: Setor | null;
  onChange: (setor: Setor | null) => void;
  erro?: string;
  label?: string;
}) {
  const { setores, recarregar } = useCatalog();
  const toast = useToast();
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');

  const filtrados = setores.filter((s) => s.ativo && normalizar(s.nome).includes(normalizar(busca)));

  async function criar() {
    try {
      const criado = await api.criarSetor({ nome: busca.trim() });
      await recarregar();
      onChange(criado);
      setAberto(false);
      toast.sucesso('Destino cadastrado');
    } catch (e) {
      toast.erro(mensagemDeErro(e));
    }
  }

  return (
    <div className="field">
      <span className="label">{label}</span>
      <button
        type="button"
        className={`picker-trigger${valor ? '' : ' picker-trigger--vazio'}${erro ? ' picker-trigger--erro' : ''}`}
        onClick={() => { setBusca(''); setAberto(true); }}
      >
        <MapPin size={16} strokeWidth={1.5} aria-hidden="true" />
        <span className="picker-trigger__text truncate">{valor ? valor.nome : 'Escolher setor ou destino…'}</span>
        <ChevronRight size={16} strokeWidth={1.5} aria-hidden="true" />
      </button>
      {erro && <span className="field__error">{erro}</span>}

      <Overlay aberto={aberto} onFechar={() => setAberto(false)} titulo={label}>
        <div className="field__control">
          <Search size={16} strokeWidth={1.5} aria-hidden="true" />
          <input className="field__input" placeholder="Auditório, Secretaria, Evento…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <div className="opt-list">
          {busca.trim() && !setores.some((s) => normalizar(s.nome) === normalizar(busca)) && (
            <button type="button" className="opt" onClick={() => void criar()}>
              <Plus size={18} strokeWidth={1.5} aria-hidden="true" />
              <span className="opt__body">
                <span className="opt__title">Cadastrar "{busca.trim()}"</span>
                <span className="opt__sub">Novo setor ou destino</span>
              </span>
            </button>
          )}
          {filtrados.length === 0 && !busca && (
            <p className="text-secondary text-sm" style={{ padding: 'var(--space-4) var(--space-3)' }}>
              Nenhum destino cadastrado. Digite o nome para criar o primeiro.
            </p>
          )}
          {filtrados.map((s) => (
            <button key={s.id} type="button" className={`opt${valor?.id === s.id ? ' opt--selecionado' : ''}`} onClick={() => { onChange(s); setAberto(false); }}>
              <MapPin size={18} strokeWidth={1.5} aria-hidden="true" />
              <span className="opt__body">
                <span className="opt__title">{s.nome}</span>
                {s.descricao && <span className="opt__sub">{s.descricao}</span>}
              </span>
            </button>
          ))}
        </div>
      </Overlay>
    </div>
  );
}
