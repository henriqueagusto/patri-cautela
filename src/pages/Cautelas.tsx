import { CalendarClock, ClipboardList, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SearchInput } from '../components/Search';
import { Avatar, Button, EmptyState, Skeleton } from '../components/ui';
import { api } from '../lib/api';
import { dataCurta, prazoRelativo } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { useAppState } from '../state/AppState';
import { useCatalog } from '../state/CatalogState';
import type { Cautela } from '../types/equipment';

const ABAS = [
  { slug: 'abertas', rotulo: 'Abertas' },
  { slug: 'encerradas', rotulo: 'Encerradas' },
  { slug: 'todas', rotulo: 'Todas' },
];

/** Situação do prazo de uma cautela aberta: vencido, perto ou tranquilo. */
export function prazoCautela(c: Cautela, horasAviso: number) {
  if (c.status === 'encerrada' || !c.retornoPrevisto) return null;
  const horas = (new Date(c.retornoPrevisto).getTime() - Date.now()) / 36e5;
  if (horas < 0) return 'atrasada' as const;
  if (horas <= horasAviso) return 'proxima' as const;
  return 'ok' as const;
}

export function Cautelas() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? 'abertas';
  const { versao } = useAppState();
  const { settings } = useCatalog();
  const [termo, setTermo] = useState(params.get('q') ?? '');
  const [buscado, setBuscado] = useState(termo);

  useEffect(() => {
    const t = window.setTimeout(() => setBuscado(termo), 200);
    return () => window.clearTimeout(t);
  }, [termo]);

  const consulta = useAsync(() => api.cautelas({ status, q: buscado }), [status, buscado, versao]);
  const lista = consulta.dados?.cautelas ?? [];

  return (
    <div className="container">
      <header className="page-header">
        <div className="page-header__text">
          <h1 className="title-page">Cautelas</h1>
          <p className="text-secondary text-sm tabular">
            {consulta.carregando ? 'Carregando…' : `${consulta.dados?.total ?? 0} ${status === 'abertas' ? 'em aberto' : 'cautelas'}`}
          </p>
        </div>
        <Link to="/cautelas/nova">
          <Button variant="primary" icon={<Plus size={16} strokeWidth={1.5} />}>Nova cautela</Button>
        </Link>
      </header>

      <div className="results__search">
        <SearchInput valor={termo} onChange={setTermo} placeholder="Número (300 ou 300/2026), pessoa ou equipamento…" />
      </div>

      <nav className="tabs">
        {ABAS.map((a) => (
          <button key={a.slug} type="button" className={`tabs__tab${status === a.slug ? ' tabs__tab--ativa' : ''}`}
            onClick={() => setParams(a.slug === 'abertas' ? {} : { status: a.slug }, { replace: true })}>
            {a.rotulo}
          </button>
        ))}
      </nav>

      {consulta.carregando && !consulta.dados ? (
        <div className="stack" style={{ gap: 'var(--space-2)' }}>{[0, 1, 2].map((i) => <Skeleton key={i} height="92px" />)}</div>
      ) : lista.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={24} strokeWidth={1.5} />}
          titulo={status === 'abertas' ? 'Nenhuma cautela em aberto' : 'Nenhuma cautela encontrada'}
          descricao={status === 'abertas' ? 'Todos os equipamentos estão no acervo.' : 'Tente outro termo de busca.'}
          acao={status === 'abertas' ? <Link to="/cautelas/nova"><Button variant="primary">Emitir cautela</Button></Link> : undefined}
        />
      ) : (
        <div className="cautela-list">
          {lista.map((c) => <CautelaCard key={c.id} cautela={c} horasAviso={settings?.horasRetornoProximo ?? 48} />)}
        </div>
      )}
    </div>
  );
}

function CautelaCard({ cautela: c, horasAviso }: { cautela: Cautela; horasAviso: number }) {
  const prazo = prazoCautela(c, horasAviso);
  const nomes = c.itens.map((i) => i.nome);

  return (
    <Link to={`/cautelas/${c.id}`} className={`cautela-card${prazo === 'atrasada' ? ' cautela-card--late' : prazo === 'proxima' ? ' cautela-card--soon' : ''}`}>
      <span className="cautela-card__num tabular">
        <span className="tipo-tag">Nº</span>
        {c.numero}
        <span className="cautela-card__ano">{c.ano}</span>
      </span>
      <span className="cautela-card__body">
        <span className="row" style={{ gap: 'var(--space-2)', minWidth: 0 }}>
          <Avatar nome={c.responsavel.nome} foto={c.responsavel.foto} size={24} />
          <span className="entity__title truncate">{c.responsavel.nome}</span>
        </span>
        <span className="entity__sub truncate">
          {nomes.slice(0, 3).join(', ')}{nomes.length > 3 ? ` e mais ${nomes.length - 3}` : ''}
        </span>
        <span className="row" style={{ gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          {[c.destino?.nome, c.destinoDetalhe].filter(Boolean).length > 0 && (
            <span className="pill">{[c.destino?.nome, c.destinoDetalhe].filter(Boolean).join(' · ')}</span>
          )}
          <span className="pill">{c.total} {c.total === 1 ? 'item' : 'itens'}</span>
        </span>
      </span>
      <span className="cautela-card__side">
        {c.status === 'encerrada' ? (
          <span className="badge badge--success"><span className="badge__dot" />Encerrada</span>
        ) : (
          <span className={`badge badge--${prazo === 'atrasada' ? 'danger' : prazo === 'proxima' ? 'warning' : 'neutral'}`}>
            <span className="badge__dot" />
            {prazo === 'atrasada' ? 'Atrasada' : prazo === 'proxima' ? 'Vence em breve' : 'Aberta'}
          </span>
        )}
        <span className="text-sm text-secondary row tabular" style={{ gap: 'var(--space-1)' }}>
          <CalendarClock size={14} strokeWidth={1.5} />
          {c.status === 'encerrada'
            ? `encerrada ${dataCurta(c.fechadaEm!)}`
            : c.retornoPrevisto ? `volta ${prazoRelativo(c.retornoPrevisto)}` : 'sem prazo'}
        </span>
      </span>
    </Link>
  );
}
