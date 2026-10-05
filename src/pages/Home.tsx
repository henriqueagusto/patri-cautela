import { AlertTriangle, ArrowRight, Check, ClipboardSignature, Clock, MapPin, Star, Timer } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EquipmentCard, FotoEquipamento } from '../components/EquipmentCard';
import { SearchInput } from '../components/Search';
import { Avatar, Skeleton } from '../components/ui';
import { api } from '../lib/api';
import { caminhoCurto, formatarPr, prazoRelativo } from '../lib/format';
import { derivarCondicoes } from '../lib/status';
import { useAsync } from '../lib/useAsync';
import { useCountUp } from '../lib/useCountUp';
import { useAppState } from '../state/AppState';
import { useAuth } from '../state/AuthState';
import { useCatalog } from '../state/CatalogState';
import type { Equipment } from '../types/equipment';

function saudacao() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

export function Home() {
  const [termo, setTermo] = useState('');
  const navegar = useNavigate();
  const { usuario, ehAdmin } = useAuth();
  const { recentes, versao } = useAppState();
  const { locais, settings } = useCatalog();

  const indicadores = useAsync(() => api.indicadores(), [versao]);
  const alertas = useAsync(() => api.alertas(), [versao]);
  const primeiroNome = usuario?.nome.split(' ')[0];
  const vazio = indicadores.dados?.total === 0;

  return (
    <div className="container">
      <header className="hero-d">
        <span className="hero-d__eyebrow">
          {saudacao()}, {primeiroNome} · {settings?.nomeInstituicao}
        </span>
        <span className="hero-d__shapes" aria-hidden="true">
          <span className="hero-d__shape hero-d__shape--1" />
          <span className="hero-d__shape hero-d__shape--2" />
          <span className="hero-d__shape hero-d__shape--3" />
        </span>
        <h1 className="display">
          Encontre um <span className="marker">equipamento</span>
        </h1>

        <form
          className="hero-d__search"
          onSubmit={(e) => {
            e.preventDefault();
            if (termo.trim()) navegar(`/equipamentos?q=${encodeURIComponent(termo.trim())}`);
          }}
        >
          <SearchInput valor={termo} onChange={setTermo} hero autoFocus />
        </form>

        <div className="home__shortcuts">
          <Link to="/cautelas/nova" className="shortcut shortcut--cta">
            <ClipboardSignature size={16} strokeWidth={1.5} aria-hidden="true" /> Nova cautela
          </Link>
          <Link to="/favoritos" className="shortcut">
            <Star size={16} strokeWidth={1.5} aria-hidden="true" /> Favoritos
          </Link>
          <Link to="/recentes" className="shortcut">
            <Clock size={16} strokeWidth={1.5} aria-hidden="true" /> Recentes
          </Link>
          <Link to="/locais" className="shortcut">
            <MapPin size={16} strokeWidth={1.5} aria-hidden="true" /> Locais
          </Link>
        </div>

        {indicadores.carregando && !indicadores.dados ? (
          <div className="stats">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} height="84px" />)}
          </div>
        ) : (
          indicadores.dados && !vazio && (
            <div className="stats">
              <Stat to="/equipamentos?filtro=disponivel" valor={indicadores.dados.disponiveis} rotulo="disponíveis" cor="var(--color-success)" />
              <Stat to="/cautelas" valor={indicadores.dados.foraDaSala} rotulo="em cautela" cor="var(--color-text-secondary)" />
              <Stat to="/equipamentos?filtro=manutencao" valor={indicadores.dados.manutencao} rotulo="em manutenção" cor="var(--color-danger)" />
              <Stat to="/equipamentos?filtro=atrasado" valor={indicadores.dados.atrasados} rotulo="atrasados" cor="var(--color-warning)" />
            </div>
          )
        )}
      </header>

      {/* Sistema recém-instalado: guia os primeiros passos em vez de mostrar nada. */}
      {vazio && (
        <section className="section">
          <div className="section__head">
            <h2 className="title-section">Primeiros passos</h2>
          </div>
          <div className="onboarding">
            <Passo
              n={1}
              feito={locais.length > 0}
              titulo="Monte seus locais"
              texto="Prédios, salas, armários e prateleiras — do jeito que existem de verdade."
              to="/locais"
              visivel={ehAdmin}
            />
            <Passo
              n={2}
              feito={false}
              titulo="Cadastre os equipamentos"
              texto="Com foto, número de série e o local onde cada um fica guardado."
              to="/equipamentos/novo"
              visivel
            />
            <Passo
              n={3}
              feito={false}
              titulo="Convide a equipe"
              texto="Crie contas para quem vai usar o sistema e cadastre as pessoas que pegam itens."
              to="/cadastros/usuarios"
              visivel={ehAdmin}
            />
          </div>
        </section>
      )}

      {alertas.dados && alertas.dados.length > 0 && (
        <section className="section">
          <div className="section__head">
            <h2 className="title-section">Precisa de atenção</h2>
            <Link to="/cautelas" className="text-sm">Ver cautelas</Link>
          </div>
          <div className="alerts">
            {alertas.dados.map((item) => <AlertaItem key={item.id} item={item} />)}
          </div>
        </section>
      )}

      {recentes.length > 0 && (
        <section className="section">
          <div className="section__head">
            <h2 className="title-section">Acessados recentemente</h2>
            <Link to="/recentes" className="text-sm">Ver todos</Link>
          </div>
          <div className="grid-d">
            {recentes.slice(0, 5).map((item) => <EquipmentCard key={item.id} item={item} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ to, valor, rotulo, cor }: { to: string; valor: number; rotulo: string; cor: string }) {
  const animado = useCountUp(valor);
  return (
    <Link to={to} className="stat">
      <span className="stat__value tabular">{animado}</span>
      <span className="stat__label">
        <span className="stat__dot" style={{ color: cor }} aria-hidden="true" />
        {rotulo}
      </span>
    </Link>
  );
}

function Passo({
  n, feito, titulo, texto, to, visivel,
}: { n: number; feito: boolean; titulo: string; texto: string; to: string; visivel: boolean }) {
  if (!visivel) return null;
  return (
    <Link to={to} className={`onboarding__step${feito ? ' onboarding__step--done' : ''}`}>
      <span className="onboarding__num">{feito ? <Check size={16} strokeWidth={2} /> : n}</span>
      <span className="stack" style={{ gap: 'var(--space-1)' }}>
        <span className="entity__title">{titulo}</span>
        <span className="entity__sub">{texto}</span>
        <span className="row text-sm" style={{ gap: 'var(--space-1)', color: 'var(--color-accent-text)' }}>
          {feito ? 'Feito' : 'Começar'} <ArrowRight size={14} strokeWidth={1.5} />
        </span>
      </span>
    </Link>
  );
}

function AlertaItem({ item }: { item: Equipment }) {
  const atrasado = derivarCondicoes(item).includes('atrasado');
  const Icone = atrasado ? AlertTriangle : Timer;
  const r = item.saida?.responsavel;

  return (
    <Link to={`/equipamento/${item.id}`} className="alert">
      <FotoEquipamento item={item} tamanhoIcone={18} className="row-d__thumb" />
      <span className="alert__body">
        <span className="alert__title truncate">{item.nome}</span>
        <span className="alert__meta truncate">
          {formatarPr(item.pr)} · {caminhoCurto(item.local.caminho)}
        </span>
      </span>
      {r && <Avatar nome={r.nome} foto={r.foto} size={28} />}
      <span className={`alert__icon alert__icon--${atrasado ? 'danger' : 'warning'} row text-sm`} style={{ gap: 'var(--space-1)' }}>
        <Icone size={16} strokeWidth={1.5} aria-hidden="true" />
        {item.saida?.retornoPrevisto &&
          (atrasado ? `venceu ${prazoRelativo(item.saida.retornoPrevisto)}` : `volta ${prazoRelativo(item.saida.retornoPrevisto)}`)}
      </span>
    </Link>
  );
}
