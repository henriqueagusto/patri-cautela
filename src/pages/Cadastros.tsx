import {
  Building2, DoorOpen, KeyRound, Pencil, Plus, Search, Shapes, UserRound,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  CheckboxField, ColorField, IconField, NumberField, SelectField, TextAreaField, TextField,
} from '../components/Form';
import { Overlay } from '../components/Overlay';
import { useToast } from '../components/Toast';
import { Avatar, Button, EmptyState } from '../components/ui';
import { api, mensagemDeErro } from '../lib/api';
import { dataCurta, normalizar } from '../lib/format';
import { CORES_CATEGORIA, ICONES_CATEGORIA, IconeCategoria } from '../lib/icons';
import { useAsync } from '../lib/useAsync';
import { useCatalog } from '../state/CatalogState';
import type { Categoria, Motivo, Pessoa, Setor, Usuario } from '../types/equipment';

const ABAS = [
  { slug: 'pessoas', rotulo: 'Pessoas', Icone: UserRound },
  { slug: 'setores', rotulo: 'Setores e destinos', Icone: Building2 },
  { slug: 'categorias', rotulo: 'Categorias', Icone: Shapes },
  { slug: 'motivos', rotulo: 'Motivos de saída', Icone: DoorOpen },
  { slug: 'usuarios', rotulo: 'Usuários', Icone: KeyRound },
];

export function Cadastros() {
  const { aba = 'pessoas' } = useParams();
  const { categorias, setores, motivos } = useCatalog();
  const pessoas = useAsync(() => api.pessoas(), []);
  const usuarios = useAsync(() => api.usuarios().catch(() => []), []);

  const contagem: Record<string, number | undefined> = {
    pessoas: pessoas.dados?.length,
    setores: setores.length,
    categorias: categorias.length,
    motivos: motivos.length,
    usuarios: usuarios.dados?.length,
  };

  return (
    <div className="container">
      <header className="page-header">
        <div className="page-header__text">
          <h1 className="title-page">Cadastros</h1>
          <p className="text-secondary text-sm">
            Pessoa é quem pega equipamento. Usuário é quem entra no sistema.
          </p>
        </div>
      </header>

      <nav className="tabs">
        {ABAS.map((a) => (
          <Link key={a.slug} to={`/cadastros/${a.slug}`} className={`tabs__tab${aba === a.slug ? ' tabs__tab--ativa' : ''}`}>
            <a.Icone size={16} strokeWidth={1.5} aria-hidden="true" />
            {a.rotulo}
            {contagem[a.slug] !== undefined && <span className="tabs__count">{contagem[a.slug]}</span>}
          </Link>
        ))}
      </nav>

      {aba === 'pessoas' && <Pessoas />}
      {aba === 'setores' && <Setores />}
      {aba === 'categorias' && <Categorias />}
      {aba === 'motivos' && <Motivos />}
      {aba === 'usuarios' && <Usuarios />}
    </div>
  );
}

function Barra({
  busca, setBusca, onNovo, rotulo, children,
}: {
  busca: string;
  setBusca: (v: string) => void;
  onNovo: () => void;
  rotulo: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="toolbar">
      <div className="toolbar__search field">
        <div className="field__control">
          <Search size={16} strokeWidth={1.5} aria-hidden="true" />
          <input className="field__input" placeholder="Buscar…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
      </div>
      {children}
      <Button variant="primary" icon={<Plus size={16} strokeWidth={1.5} />} onClick={onNovo}>{rotulo}</Button>
    </div>
  );
}

/* --- Pessoas -------------------------------------------------------------- */

function Pessoas() {
  const { setores } = useCatalog();
  const toast = useToast();
  const navegar = useNavigate();
  const [busca, setBusca] = useState('');
  const [versao, setVersao] = useState(0);
  const lista = useAsync(() => api.pessoas(), [versao]);
  const [edit, setEdit] = useState<Partial<Pessoa> | null>(null);

  const [recorte, setRecorte] = useState<'todas' | 'com-itens' | 'inativas'>('todas');

  const filtradas = (lista.dados ?? [])
    .filter((p) => normalizar(p.nome).includes(normalizar(busca)))
    .filter((p) =>
      recorte === 'com-itens' ? Boolean(p.itensAgora) : recorte === 'inativas' ? !p.ativo : p.ativo,
    );

  async function salvar() {
    if (!edit?.nome?.trim()) return;
    try {
      if (edit.id) await api.atualizarPessoa(edit.id, edit);
      else await api.criarPessoa(edit);
      setEdit(null);
      setVersao((v) => v + 1);
      toast.sucesso('Pessoa salva');
    } catch (e) {
      toast.erro(mensagemDeErro(e));
    }
  }

  return (
    <>
      <Barra busca={busca} setBusca={setBusca} onNovo={() => setEdit({ ativo: true })} rotulo="Nova pessoa">
        <div className="chips">
          {([['todas', 'Ativas'], ['com-itens', 'Com equipamento'], ['inativas', 'Inativas']] as const).map(
            ([slug, rotulo]) => (
              <button key={slug} type="button" className={`chip${recorte === slug ? ' chip--active' : ''}`}
                aria-pressed={recorte === slug} onClick={() => setRecorte(slug)}>
                {rotulo}
              </button>
            ),
          )}
        </div>
      </Barra>
      {filtradas.length === 0 ? (
        <EmptyState icon={<UserRound size={24} strokeWidth={1.5} />} titulo="Nenhuma pessoa cadastrada"
          descricao="Cadastre quem pode ficar com equipamentos. Não precisa ter login." />
      ) : (
        <div className="entity-list">
          {filtradas.map((p) => (
            <div key={p.id} className={`entity${p.ativo ? '' : ' entity--inativo'}`}>
              <Avatar nome={p.nome} foto={p.foto} size={40} />
              <span className="entity__body">
                <button type="button" className="entity__title" style={{ textAlign: 'left' }} onClick={() => navegar(`/pessoas/${p.id}`)}>
                  {p.nome}
                </button>
                <span className="entity__sub">
                  {[p.matricula && `PR ${p.matricula}`, p.ramal && `Ramal ${p.ramal}`, p.telefone, p.setor?.nome].filter(Boolean).join(' · ') || 'Sem dados de contato'}
                </span>
              </span>
              <span className="entity__side">
                {Boolean(p.itensAgora) && <span className="pill pill--accent">{p.itensAgora} com ela</span>}
                <Button size="sm" onClick={() => setEdit(p)}>Editar</Button>
              </span>
            </div>
          ))}
        </div>
      )}

      <Overlay aberto={Boolean(edit)} onFechar={() => setEdit(null)} titulo={edit?.id ? 'Editar pessoa' : 'Nova pessoa'} largo
        rodape={<><Button variant="ghost" onClick={() => setEdit(null)}>Cancelar</Button><Button variant="primary" onClick={() => void salvar()}>Salvar</Button></>}>
        {edit && (
          <div className="form-grid">
            <TextField label="Nome completo" valor={edit.nome ?? ''} onChange={(v) => setEdit({ ...edit, nome: v })} />
            <TextField label="PR" opcional valor={edit.matricula ?? ''} onChange={(v) => setEdit({ ...edit, matricula: v })} ajuda="Sai impresso na cautela, abaixo do nome." />
            <TextField label="Ramal" opcional tipo="tel" valor={edit.ramal ?? ''} onChange={(v) => setEdit({ ...edit, ramal: v })} ajuda="Sai ao lado do nome, na cautela." />
            <TextField label="Celular" opcional tipo="tel" valor={edit.telefone ?? ''} onChange={(v) => setEdit({ ...edit, telefone: v })} />
            <TextField label="E-mail" opcional tipo="email" valor={edit.email ?? ''} onChange={(v) => setEdit({ ...edit, email: v })} />
            <SelectField label="Setor" opcional valor={edit.setorId ?? ''} onChange={(v) => setEdit({ ...edit, setorId: v })}
              placeholder="Sem setor" opcoes={setores.filter((s) => s.ativo).map((s) => ({ valor: s.id, rotulo: s.nome }))} />
            <div style={{ gridColumn: '1 / -1' }}>
              <TextAreaField label="Observações" opcional linhas={2} valor={edit.observacoes ?? ''} onChange={(v) => setEdit({ ...edit, observacoes: v })} />
            </div>
            {edit.id && (
              <CheckboxField label="Ativa" descricao="Pessoas inativas não aparecem na hora de registrar saída."
                marcado={edit.ativo ?? true} onChange={(v) => setEdit({ ...edit, ativo: v })} />
            )}
          </div>
        )}
      </Overlay>
    </>
  );
}

/* --- Setores -------------------------------------------------------------- */

function Setores() {
  const { setores, recarregar } = useCatalog();
  const toast = useToast();
  const [busca, setBusca] = useState('');
  const [edit, setEdit] = useState<Partial<Setor> | null>(null);

  const filtrados = setores.filter((s) => normalizar(s.nome).includes(normalizar(busca)));

  async function salvar() {
    if (!edit?.nome?.trim()) return;
    try {
      if (edit.id) await api.atualizarSetor(edit.id, edit);
      else await api.criarSetor(edit);
      await recarregar();
      setEdit(null);
      toast.sucesso('Setor salvo');
    } catch (e) {
      toast.erro(mensagemDeErro(e));
    }
  }

  return (
    <>
      <Barra busca={busca} setBusca={setBusca} onNovo={() => setEdit({ ativo: true })} rotulo="Novo setor" />
      {filtrados.length === 0 ? (
        <EmptyState icon={<Building2 size={24} strokeWidth={1.5} />} titulo="Nenhum setor cadastrado"
          descricao="Auditório, Secretaria, Estúdio — os lugares para onde os equipamentos vão." />
      ) : (
        <div className="reg-grid">
          {filtrados.map((s) => (
            <article key={s.id} className={`reg-card${s.ativo ? '' : ' entity--inativo'}`}>
              <span className="reg-card__face reg-card__face--neutro">
                <Building2 size={26} strokeWidth={1.5} />
              </span>
              <span className="reg-card__body">
                <span className="entity__title">{s.nome}{s.sigla && <span className="text-tertiary"> · {s.sigla}</span>}</span>
                <span className="entity__sub">{s.descricao || 'Sem descrição'}</span>
                <span className="row" style={{ gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                  <span className="pill">{s.pessoas ?? 0} pessoa(s)</span>
                  {Boolean(s.itensAgora) && <span className="pill pill--accent">{s.itensAgora} item(ns) lá</span>}
                </span>
              </span>
              <span className="reg-card__acoes">
                <Button size="sm" icon={<Pencil size={14} strokeWidth={1.5} />} onClick={() => setEdit(s)}>Editar</Button>
              </span>
            </article>
          ))}
        </div>
      )}

      <Overlay aberto={Boolean(edit)} onFechar={() => setEdit(null)} titulo={edit?.id ? 'Editar setor' : 'Novo setor'}
        rodape={<><Button variant="ghost" onClick={() => setEdit(null)}>Cancelar</Button><Button variant="primary" onClick={() => void salvar()}>Salvar</Button></>}>
        {edit && (
          <>
            <TextField label="Nome" valor={edit.nome ?? ''} onChange={(v) => setEdit({ ...edit, nome: v })} />
            <TextField label="Sigla" opcional valor={edit.sigla ?? ''} onChange={(v) => setEdit({ ...edit, sigla: v })} />
            <TextAreaField label="Descrição" opcional linhas={2} valor={edit.descricao ?? ''} onChange={(v) => setEdit({ ...edit, descricao: v })} />
            {edit.id && <CheckboxField label="Ativo" marcado={edit.ativo ?? true} onChange={(v) => setEdit({ ...edit, ativo: v })} />}
          </>
        )}
      </Overlay>
    </>
  );
}

/* --- Categorias ----------------------------------------------------------- */

function Categorias() {
  const { categorias, recarregar } = useCatalog();
  const toast = useToast();
  const [busca, setBusca] = useState('');
  const [edit, setEdit] = useState<Partial<Categoria> | null>(null);

  const filtradas = categorias.filter((c) => normalizar(c.nome).includes(normalizar(busca)));
  const opcoesIcone = Object.entries(ICONES_CATEGORIA).map(([nome, Icone]) => ({ nome, Icone }));

  async function salvar() {
    if (!edit?.nome?.trim()) return;
    try {
      const dados = { nome: edit.nome, icone: edit.icone ?? 'package', cor: edit.cor ?? CORES_CATEGORIA[0]!, descricao: edit.descricao ?? null };
      if (edit.id) await api.atualizarCategoria(edit.id, dados);
      else await api.criarCategoria(dados);
      await recarregar();
      setEdit(null);
      toast.sucesso('Categoria salva');
    } catch (e) {
      toast.erro(mensagemDeErro(e));
    }
  }

  async function excluir(id: string) {
    try {
      await api.excluirCategoria(id);
      await recarregar();
      toast.sucesso('Categoria excluída');
    } catch (e) {
      toast.erro(mensagemDeErro(e));
    }
  }

  return (
    <>
      <Barra busca={busca} setBusca={setBusca} onNovo={() => setEdit({ icone: 'package', cor: CORES_CATEGORIA[0] })} rotulo="Nova categoria" />
      <p className="text-secondary text-sm" style={{ marginBottom: 'var(--space-4)' }}>
        A cor e o ícone aparecem no card do equipamento quando ele não tem foto.
      </p>
      <div className="reg-grid">
        {filtradas.map((c) => (
          <article key={c.id} className="reg-card" style={{ '--cat': c.cor } as React.CSSProperties}>
            <span className="reg-card__face">
              <IconeCategoria nome={c.icone} size={30} />
            </span>
            <span className="reg-card__body">
              <span className="entity__title">{c.nome}</span>
              <span className="entity__sub tabular">{c.total ?? 0} equipamento(s)</span>
            </span>
            <span className="reg-card__acoes">
              <Button size="sm" icon={<Pencil size={14} strokeWidth={1.5} />} onClick={() => setEdit(c)}>Editar</Button>
              {!c.total && <Button size="sm" variant="ghost" onClick={() => void excluir(c.id)}>Excluir</Button>}
            </span>
          </article>
        ))}
      </div>

      <Overlay aberto={Boolean(edit)} onFechar={() => setEdit(null)} titulo={edit?.id ? 'Editar categoria' : 'Nova categoria'} largo
        rodape={<><Button variant="ghost" onClick={() => setEdit(null)}>Cancelar</Button><Button variant="primary" onClick={() => void salvar()}>Salvar</Button></>}>
        {edit && (
          <>
            <TextField label="Nome" valor={edit.nome ?? ''} onChange={(v) => setEdit({ ...edit, nome: v })} placeholder="Câmera, Áudio, Informática…" />
            <ColorField label="Cor" valor={edit.cor ?? ''} cores={CORES_CATEGORIA} onChange={(v) => setEdit({ ...edit, cor: v })} />
            <IconField label="Ícone" valor={edit.icone ?? 'package'} opcoes={opcoesIcone} onChange={(v) => setEdit({ ...edit, icone: v })} />
            <p className="field__help">A cor aparece no card do equipamento quando ele não tem foto.</p>
          </>
        )}
      </Overlay>
    </>
  );
}

/* --- Motivos -------------------------------------------------------------- */

function Motivos() {
  const { motivos, recarregar } = useCatalog();
  const toast = useToast();
  const [busca, setBusca] = useState('');
  const [edit, setEdit] = useState<Partial<Motivo> | null>(null);

  const filtrados = motivos.filter((m) => normalizar(m.nome).includes(normalizar(busca)));

  async function salvar() {
    if (!edit?.nome?.trim()) return;
    try {
      const dados = {
        nome: edit.nome,
        prazoDias: edit.prazoDias ?? null,
        colocaEmManutencao: edit.colocaEmManutencao ?? false,
        ativo: edit.ativo ?? true,
      };
      if (edit.id) await api.atualizarMotivo(edit.id, dados);
      else await api.criarMotivo(dados);
      await recarregar();
      setEdit(null);
      toast.sucesso('Motivo salvo');
    } catch (e) {
      toast.erro(mensagemDeErro(e));
    }
  }

  return (
    <>
      <Barra busca={busca} setBusca={setBusca} onNovo={() => setEdit({ ativo: true, prazoDias: 7 })} rotulo="Novo motivo" />
      <div className="entity-list">
        {filtrados.map((m) => (
          <div key={m.id} className={`entity${m.ativo ? '' : ' entity--inativo'}`}>
            <span className="entity__body">
              <span className="entity__title">{m.nome}</span>
              <span className="entity__sub">
                {m.prazoDias ? `Prazo padrão de ${m.prazoDias} dias` : 'Sem prazo padrão'}
                {m.colocaEmManutencao && ' · marca como em manutenção'}
              </span>
            </span>
            <span className="entity__side"><Button size="sm" onClick={() => setEdit(m)}>Editar</Button></span>
          </div>
        ))}
      </div>

      <Overlay aberto={Boolean(edit)} onFechar={() => setEdit(null)} titulo={edit?.id ? 'Editar motivo' : 'Novo motivo'}
        rodape={<><Button variant="ghost" onClick={() => setEdit(null)}>Cancelar</Button><Button variant="primary" onClick={() => void salvar()}>Salvar</Button></>}>
        {edit && (
          <>
            <TextField label="Nome" valor={edit.nome ?? ''} onChange={(v) => setEdit({ ...edit, nome: v })} placeholder="Empréstimo, Evento, Manutenção…" />
            <NumberField label="Prazo padrão" opcional min={0} max={365} sufixo="dias"
              valor={edit.prazoDias ?? ''} onChange={(v) => setEdit({ ...edit, prazoDias: v === '' ? null : v })}
              ajuda="Sugere a data de retorno na hora da saída." />
            <CheckboxField label="Marca o item como “Em manutenção”"
              descricao="Use para o motivo de envio à oficina."
              marcado={edit.colocaEmManutencao ?? false} onChange={(v) => setEdit({ ...edit, colocaEmManutencao: v })} />
            {edit.id && <CheckboxField label="Ativo" marcado={edit.ativo ?? true} onChange={(v) => setEdit({ ...edit, ativo: v })} />}
          </>
        )}
      </Overlay>
    </>
  );
}

/* --- Usuários ------------------------------------------------------------- */

function Usuarios() {
  const toast = useToast();
  const [versao, setVersao] = useState(0);
  const [busca, setBusca] = useState('');
  const lista = useAsync(() => api.usuarios(), [versao]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [edit, setEdit] = useState<(Partial<Usuario> & { senha?: string }) | null>(null);
  const [senhaDe, setSenhaDe] = useState<Usuario | null>(null);
  const [novaSenha, setNovaSenha] = useState('');

  useEffect(() => { void api.pessoas().then(setPessoas).catch(() => undefined); }, []);

  const filtrados = (lista.dados ?? []).filter((u) => normalizar(u.nome).includes(normalizar(busca)));

  async function salvar() {
    if (!edit?.nome?.trim() || !edit.email?.trim()) return;
    try {
      if (edit.id) {
        await api.atualizarUsuario(edit.id, {
          nome: edit.nome, email: edit.email, telefone: edit.telefone ?? null,
          papel: edit.papel, ativo: edit.ativo, personId: edit.personId ?? null,
        });
      } else {
        await api.criarUsuario({ nome: edit.nome, email: edit.email, senha: edit.senha, papel: edit.papel ?? 'USUARIO', personId: edit.personId ?? null });
      }
      setEdit(null);
      setVersao((v) => v + 1);
      toast.sucesso('Usuário salvo');
    } catch (e) {
      toast.erro(mensagemDeErro(e));
    }
  }

  async function redefinir() {
    if (!senhaDe || novaSenha.length < 8) return;
    try {
      await api.redefinirSenha(senhaDe.id, novaSenha);
      setSenhaDe(null);
      setNovaSenha('');
      toast.sucesso('Senha redefinida');
    } catch (e) {
      toast.erro(mensagemDeErro(e));
    }
  }

  return (
    <>
      <Barra busca={busca} setBusca={setBusca} onNovo={() => setEdit({ papel: 'USUARIO' })} rotulo="Novo usuário" />
      <div className="entity-list">
        {filtrados.map((u) => (
          <div key={u.id} className={`entity${u.ativo ? '' : ' entity--inativo'}`}>
            <Avatar nome={u.nome} foto={u.foto} size={40} />
            <span className="entity__body">
              <span className="entity__title">{u.nome}</span>
              <span className="entity__sub">
                {u.email} · {u.ultimoAcesso ? `último acesso ${dataCurta(u.ultimoAcesso)}` : 'nunca entrou'}
              </span>
            </span>
            <span className="entity__side">
              <span className={`pill${u.papel === 'ADMINISTRADOR' ? ' pill--accent' : ''}`}>
                {u.papel === 'ADMINISTRADOR' ? 'Administrador' : 'Usuário'}
              </span>
              <Button size="sm" onClick={() => setEdit(u)}>Editar</Button>
              <Button size="sm" variant="ghost" onClick={() => setSenhaDe(u)}>Senha</Button>
            </span>
          </div>
        ))}
      </div>

      <Overlay aberto={Boolean(edit)} onFechar={() => setEdit(null)} titulo={edit?.id ? 'Editar usuário' : 'Novo usuário'} largo
        rodape={<><Button variant="ghost" onClick={() => setEdit(null)}>Cancelar</Button><Button variant="primary" onClick={() => void salvar()}>Salvar</Button></>}>
        {edit && (
          <div className="form-grid">
            <TextField label="Nome" valor={edit.nome ?? ''} onChange={(v) => setEdit({ ...edit, nome: v })} />
            <TextField label="E-mail" tipo="email" valor={edit.email ?? ''} onChange={(v) => setEdit({ ...edit, email: v })} />
            <TextField label="Telefone" opcional tipo="tel" valor={edit.telefone ?? ''} onChange={(v) => setEdit({ ...edit, telefone: v })} />
            {!edit.id && (
              <TextField label="Senha inicial" tipo="password" valor={edit.senha ?? ''} onChange={(v) => setEdit({ ...edit, senha: v })} ajuda="Mínimo de 8 caracteres." />
            )}
            <SelectField label="Papel" valor={edit.papel ?? 'USUARIO'} onChange={(v) => setEdit({ ...edit, papel: v as Usuario['papel'] })}
              opcoes={[{ valor: 'USUARIO', rotulo: 'Usuário' }, { valor: 'ADMINISTRADOR', rotulo: 'Administrador' }]}
              ajuda="Administrador gerencia cadastros, locais, usuários e a lixeira." />
            <SelectField label="Vincular à pessoa" opcional valor={edit.personId ?? ''} onChange={(v) => setEdit({ ...edit, personId: v })}
              placeholder="Sem vínculo" opcoes={pessoas.map((p) => ({ valor: p.id, rotulo: p.nome }))}
              ajuda="Permite ver no perfil o que está sob responsabilidade dele." />
            {edit.id && <CheckboxField label="Conta ativa" marcado={edit.ativo ?? true} onChange={(v) => setEdit({ ...edit, ativo: v })} />}
          </div>
        )}
      </Overlay>

      <Overlay aberto={Boolean(senhaDe)} onFechar={() => setSenhaDe(null)} titulo={`Redefinir senha de ${senhaDe?.nome ?? ''}`}
        rodape={<><Button variant="ghost" onClick={() => setSenhaDe(null)}>Cancelar</Button><Button variant="primary" onClick={() => void redefinir()}>Redefinir</Button></>}>
        <TextField label="Nova senha" tipo="password" valor={novaSenha} onChange={setNovaSenha}
          erro={novaSenha && novaSenha.length < 8 ? 'A senha precisa ter ao menos 8 caracteres.' : undefined}
          ajuda="Mínimo de 8 caracteres. Informe a nova senha à pessoa pessoalmente." />
      </Overlay>
    </>
  );
}
