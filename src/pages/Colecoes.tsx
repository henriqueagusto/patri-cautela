import { ClipboardList, Clock, MapPin, RotateCcw, Settings, Star, Trash2, UserRound, History } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EquipmentRow } from '../components/EquipmentCard';
import { HistoryEvent } from '../components/HistoryEvent';
import { ConfirmDialog } from '../components/Overlay';
import { ResultsView, ViewToggle } from '../components/Search';
import { useToast } from '../components/Toast';
import { Avatar, Button, EmptyState } from '../components/ui';
import { api, mensagemDeErro } from '../lib/api';
import { dataHoraRelativa, formatarPr, numeroCautela } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { useAppState } from '../state/AppState';
import { useAuth } from '../state/AuthState';
import type { ItemExcluido } from '../types/equipment';

export function Favoritos() {
  const { itensFavoritos } = useAppState();
  return (
    <div className="container">
      <header className="page-header">
        <div className="page-header__text"><h1 className="title-page">Favoritos</h1></div>
        {itensFavoritos.length > 0 && <ViewToggle />}
      </header>
      {itensFavoritos.length === 0 ? (
        <EmptyState icon={<Star size={24} strokeWidth={1.5} />} titulo="Nenhum favorito ainda"
          descricao="Marque equipamentos importantes para acessá-los rapidamente."
          acao={<Link to="/equipamentos"><Button>Explorar equipamentos</Button></Link>} />
      ) : (
        <ResultsView resultados={itensFavoritos.map((item) => ({ item, prExato: false }))} />
      )}
    </div>
  );
}

export function Recentes() {
  const { recentes } = useAppState();
  return (
    <div className="container">
      <header className="page-header">
        <div className="page-header__text"><h1 className="title-page">Acessados recentemente</h1></div>
      </header>
      {recentes.length === 0 ? (
        <EmptyState icon={<Clock size={24} strokeWidth={1.5} />} titulo="Nada por aqui ainda"
          descricao="Os equipamentos que você abrir aparecem nesta lista." />
      ) : (
        <div className="rows-d">
          {recentes.map((item) => <EquipmentRow key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}

export function Lixeira() {
  const { ehAdmin } = useAuth();
  const { versao, invalidar } = useAppState();
  const toast = useToast();
  const consulta = useAsync(() => api.lixeira(), [versao]);
  const [alvo, setAlvo] = useState<ItemExcluido | null>(null);
  const itens = consulta.dados ?? [];

  async function acao(fn: () => Promise<unknown>, mensagem: string) {
    try {
      await fn();
      invalidar();
      toast.sucesso(mensagem);
    } catch (e) {
      toast.erro(mensagemDeErro(e));
    }
  }

  return (
    <div className="container">
      <header className="page-header">
        <div className="page-header__text">
          <h1 className="title-page">Lixeira</h1>
          {!ehAdmin && <p className="text-secondary text-sm">Restaurar e excluir de vez são ações do administrador.</p>}
        </div>
      </header>
      {itens.length === 0 ? (
        <EmptyState icon={<Trash2 size={24} strokeWidth={1.5} />} titulo="A lixeira está vazia"
          descricao="Itens excluídos ficam aqui até serem restaurados ou removidos de vez." />
      ) : (
        <div className="entity-list">
          {itens.map((e) => (
            <div key={e.item.id} className="entity">
              <span className="entity__body">
                <span className="entity__title">{e.item.nome}</span>
                <span className="entity__sub">
                  {formatarPr(e.item.pr)} · excluído {dataHoraRelativa(e.excluidoEm).toLowerCase()} por {e.excluidoPor}
                </span>
              </span>
              {ehAdmin && (
                <span className="entity__side">
                  <Button size="sm" icon={<RotateCcw size={14} strokeWidth={1.5} />}
                    onClick={() => void acao(() => api.restaurar(e.item.id), 'Item restaurado')}>Restaurar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setAlvo(e)}>Excluir de vez</Button>
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog aberto={Boolean(alvo)} titulo="Excluir definitivamente"
        descricao={alvo ? `${alvo.item.nome} (${formatarPr(alvo.item.pr)}) será removido para sempre, junto com o histórico. Não tem volta.` : ''}
        rotuloConfirmar="Excluir para sempre" perigo onCancelar={() => setAlvo(null)}
        onConfirmar={() => { if (alvo) void acao(() => api.excluirDefinitivamente(alvo.item.id), 'Item excluído'); setAlvo(null); }} />
    </div>
  );
}

export function Mais() {
  const { ehAdmin } = useAuth();
  const itens = [
    { to: '/favoritos', rotulo: 'Favoritos', Icone: Star, admin: false },
    { to: '/locais', rotulo: 'Locais', Icone: MapPin, admin: false },
    { to: '/recentes', rotulo: 'Acessados recentemente', Icone: Clock, admin: false },
    { to: '/historico', rotulo: 'Histórico', Icone: History, admin: false },
    { to: '/cadastros/pessoas', rotulo: 'Cadastros', Icone: UserRound, admin: true },
    { to: '/lixeira', rotulo: 'Lixeira', Icone: Trash2, admin: false },
    { to: '/configuracoes', rotulo: 'Configurações', Icone: Settings, admin: true },
    { to: '/perfil', rotulo: 'Meu perfil', Icone: UserRound, admin: false },
  ].filter((i) => !i.admin || ehAdmin);

  return (
    <div className="container">
      <header className="page-header">
        <div className="page-header__text"><h1 className="title-page">Mais</h1></div>
      </header>
      <nav className="menu-list section">
        {itens.map(({ to, rotulo, Icone }) => (
          <Link key={to} to={to} className="menu-list__item">
            <Icone size={18} strokeWidth={1.5} aria-hidden="true" /> {rotulo}
          </Link>
        ))}
      </nav>
    </div>
  );
}

/** Ficha da pessoa: o que está com ela agora e o que já pegou. */
export function PessoaDetalhe() {
  const { id = '' } = useParams();
  const navegar = useNavigate();
  const consulta = useAsync(() => api.pessoa(id), [id]);
  const p = consulta.dados;

  if (!p) {
    return (
      <div className="container">
        <EmptyState icon={<UserRound size={24} strokeWidth={1.5} />}
          titulo={consulta.erro ?? 'Carregando…'}
          acao={<Button onClick={() => navegar('/cadastros/pessoas')}>Ver pessoas</Button>} />
      </div>
    );
  }

  return (
    <div className="container">
      <header className="page-header">
        <div className="profile-hero" style={{ width: '100%' }}>
          <Avatar nome={p.nome} foto={p.foto} size={64} />
          <div className="profile-hero__body">
            <h1 className="title-page">{p.nome}</h1>
            <p className="text-secondary text-sm">
              {[p.matricula && `PR ${p.matricula}`, p.ramal && `Ramal ${p.ramal}`, p.telefone, p.setor?.nome].filter(Boolean).join(' · ') || 'Sem dados de contato'}
            </p>
          </div>
          <span className="pill pill--accent">{p.itens.length} item(ns) agora</span>
        </div>
      </header>

      {p.cautelas.length > 0 && (
        <section className="section">
          <div className="section__head"><h2 className="title-section">Cautelas</h2></div>
          <div className="entity-list">
            {p.cautelas.map((c) => (
              <Link key={c.id} to={`/cautelas/${c.id}`} className="entity">
                <ClipboardList size={18} strokeWidth={1.5} aria-hidden="true" />
                <span className="entity__body">
                  <span className="entity__title tabular">Nº {numeroCautela(c)}</span>
                  <span className="entity__sub">
                    {c.total} item(ns) · emitida {dataHoraRelativa(c.criadaEm).toLowerCase()}
                  </span>
                </span>
                <span className={`badge badge--${c.fechadaEm ? 'success' : 'neutral'}`}>
                  <span className="badge__dot" />
                  {c.fechadaEm ? 'Encerrada' : `${c.pendentes} pendente(s)`}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section__head"><h2 className="title-section">Está com</h2></div>
        {p.itens.length === 0 ? (
          <p className="text-secondary">Nenhum equipamento com esta pessoa no momento.</p>
        ) : (
          <div className="rows-d">{p.itens.map((item) => <EquipmentRow key={item.id} item={item} />)}</div>
        )}
      </section>

      <section className="section">
        <div className="section__head"><h2 className="title-section">Histórico</h2></div>
        <div className="stack" style={{ gap: 'var(--space-2)' }}>
          {p.historico.map((ev) => <HistoryEvent key={ev.id} evento={ev} equipamento={ev.equipamento} />)}
        </div>
      </section>
    </div>
  );
}
