import { WifiOff } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { Button, EmptyState } from './components/ui';
import { Cadastros } from './pages/Cadastros';
import { CautelaDetalhe } from './pages/CautelaDetalhe';
import { CautelaImprimir } from './pages/CautelaImprimir';
import { CautelaNova } from './pages/CautelaNova';
import { Cautelas } from './pages/Cautelas';
import { Colecoes } from './pages/rotas';
import { Configuracoes } from './pages/Configuracoes';
import { EquipmentDetail } from './pages/EquipmentDetail';
import { EquipmentForm } from './pages/EquipmentForm';
import { Historico } from './pages/Historico';
import { Home } from './pages/Home';
import { Locais } from './pages/Locais';
import { Login } from './pages/Login';
import { Perfil } from './pages/Perfil';
import { SearchResults } from './pages/SearchResults';
import { AppStateProvider } from './state/AppState';
import { useAuth } from './state/AuthState';
import { CatalogProvider } from './state/CatalogState';

export default function App() {
  const { usuario, carregando, semConexao } = useAuth();
  const navegar = useNavigate();
  const { pathname } = useLocation();
  const redirecionado = useRef(false);

  // Tela inicial preferida do usuário: aplicada uma vez, ao abrir o sistema.
  useEffect(() => {
    const inicial = usuario?.preferencias?.paginaInicial;
    if (!usuario || redirecionado.current) return;
    redirecionado.current = true;
    if (inicial && inicial !== '/' && pathname === '/') navegar(inicial, { replace: true });
  }, [usuario, pathname, navegar]);

  if (carregando) return <div className="app-loading" aria-busy="true" />;
  // Sessão guardada, mas o servidor não respondeu: avisa e continua tentando,
  // em vez de jogar a pessoa de volta para o login.
  if (!usuario && semConexao) {
    return (
      <div className="app-offline" role="status">
        <EmptyState
          icon={<WifiOff size={24} strokeWidth={1.5} />}
          titulo="Sem resposta do servidor"
          descricao="O PATRI está tentando reconectar sozinho. Confira se este aparelho está no Wi-Fi certo e se o servidor está ligado."
          acao={<Button variant="primary" onClick={() => window.location.reload()}>Tentar agora</Button>}
        />
      </div>
    );
  }
  if (!usuario) return <Login />;

  return (
    <CatalogProvider>
      <AppStateProvider>
        <Routes>
          {/* A folha de impressão fica fora do layout: é só o papel. */}
          <Route path="/cautelas/:id/imprimir" element={<CautelaImprimir />} />
          <Route element={<AppLayout />}>
            <Route path="/cautelas" element={<Cautelas />} />
            <Route path="/cautelas/nova" element={<CautelaNova />} />
            <Route path="/cautelas/:id" element={<CautelaDetalhe />} />
            <Route index element={<Home />} />
            <Route path="/equipamentos" element={<SearchResults />} />
            <Route path="/equipamentos/novo" element={<EquipmentForm />} />
            <Route path="/equipamentos/:id/editar" element={<EquipmentForm />} />
            <Route path="/equipamento/:id" element={<EquipmentDetail />} />
            <Route path="/favoritos" element={<Colecoes.Favoritos />} />
            <Route path="/fora-da-sala" element={<Navigate to="/cautelas" replace />} />
            <Route path="/recentes" element={<Colecoes.Recentes />} />
            <Route path="/locais" element={<Locais />} />
            <Route path="/historico" element={<Historico />} />
            <Route path="/pessoas/:id" element={<Colecoes.PessoaDetalhe />} />
            <Route path="/cadastros/:aba" element={<Cadastros />} />
            <Route path="/lixeira" element={<Colecoes.Lixeira />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="/mais" element={<Colecoes.Mais />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AppStateProvider>
    </CatalogProvider>
  );
}
