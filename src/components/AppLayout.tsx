import {
  Boxes, ClipboardList, ClipboardSignature, Clock, House, MapPin, MoreHorizontal,
  Package, Plus, Settings, Star, Trash2, Users,
} from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Avatar, Button, ImagemArquivo } from './ui';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { useAppState } from '../state/AppState';
import { useAuth } from '../state/AuthState';
import { useCatalog } from '../state/CatalogState';

const ICON = { size: 18, strokeWidth: 1.5 } as const;

function Sidebar() {
  const { favoritos, versao } = useAppState();
  const { usuario, ehAdmin } = useAuth();
  const { settings } = useCatalog();
  const indicadores = useAsync(() => api.indicadores(), [versao]);
  const abertas = useAsync(() => api.cautelas({ status: 'abertas' }), [versao]);

  const acervo = [
    { to: '/cautelas', rotulo: 'Cautelas', Icone: ClipboardList, contagem: abertas.dados?.total || undefined },
    { to: '/equipamentos', rotulo: 'Equipamentos', Icone: Package, contagem: indicadores.dados?.total },
    { to: '/favoritos', rotulo: 'Favoritos', Icone: Star, contagem: favoritos.size || undefined },
    { to: '/locais', rotulo: 'Locais', Icone: MapPin },
    { to: '/historico', rotulo: 'Histórico', Icone: Clock },
  ];

  const gestao = [
    { to: '/cadastros/pessoas', rotulo: 'Cadastros', Icone: Users },
    { to: '/lixeira', rotulo: 'Lixeira', Icone: Trash2 },
    { to: '/configuracoes', rotulo: 'Configurações', Icone: Settings },
  ];

  return (
    <aside className="sidebar">
      <Link to="/" className="sidebar__brand">
        <ImagemArquivo
          caminho={settings?.logo}
          className="sidebar__logo"
          alternativa={<span className="sidebar__mark" aria-hidden="true"><Boxes size={16} strokeWidth={1.5} /></span>}
        />
        <span className="sidebar__brand-text">
          <span className="sidebar__wordmark">PATRI</span>
          <span className="sidebar__org">{settings?.nomeInstituicao}</span>
        </span>
      </Link>

      <div style={{ padding: '0 var(--space-3) var(--space-4)' }}>
        <Link to="/cautelas/nova">
          <Button variant="primary" block icon={<Plus size={16} strokeWidth={1.5} />}>Nova cautela</Button>
        </Link>
      </div>

      <nav className="sidebar__nav" aria-label="Acervo">
        {acervo.map(({ to, rotulo, Icone, contagem }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `nav-item${isActive ? ' nav-item--active' : ''}`}>
            <Icone {...ICON} aria-hidden="true" />
            {rotulo}
            {contagem !== undefined && <span className="nav-item__count">{contagem}</span>}
          </NavLink>
        ))}
      </nav>

      {ehAdmin && (
        <>
          <p className="sidebar__section">Gestão</p>
          <nav className="sidebar__nav" aria-label="Gestão">
            {gestao.map(({ to, rotulo, Icone }) => (
              <NavLink key={to} to={to} className={({ isActive }) => `nav-item${isActive ? ' nav-item--active' : ''}`}>
                <Icone {...ICON} aria-hidden="true" />
                {rotulo}
              </NavLink>
            ))}
          </nav>
        </>
      )}

      <div className="sidebar__footer">
        <NavLink to="/perfil" className="sidebar__me">
          <Avatar nome={usuario?.nome ?? ''} foto={usuario?.foto} size={32} />
          <span className="sidebar__me-text">
            <span className="truncate">{usuario?.nome}</span>
            <span className="sidebar__org">{ehAdmin ? 'Administrador' : 'Usuário'}</span>
          </span>
        </NavLink>
      </div>
    </aside>
  );
}

/** Celular: a ação central é emitir cautela — o que mais se faz em campo. */
function BottomNav() {
  const itens = [
    { to: '/', rotulo: 'Início', Icone: House, end: true },
    { to: '/equipamentos', rotulo: 'Itens', Icone: Package },
    { to: '/cautelas/nova', rotulo: 'Cautela', Icone: ClipboardSignature, destaque: true },
    { to: '/cautelas', rotulo: 'Cautelas', Icone: ClipboardList, end: true },
    { to: '/mais', rotulo: 'Mais', Icone: MoreHorizontal },
  ];
  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      {itens.map(({ to, rotulo, Icone, end, destaque }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}${destaque ? ' bottom-nav__item--cta' : ''}`
          }
        >
          <span className="bottom-nav__icon"><Icone size={20} strokeWidth={1.5} aria-hidden="true" /></span>
          {rotulo}
        </NavLink>
      ))}
    </nav>
  );
}

export function AppLayout() {
  const { pathname } = useLocation();
  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        {/* A chave muda a cada rota: cada página entra com a própria animação. */}
        <div key={pathname} className="page-enter">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
