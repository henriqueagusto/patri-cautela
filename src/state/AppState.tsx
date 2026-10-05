import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from '../lib/api';
import { useAuth } from './AuthState';
import type { Equipment, ViewMode } from '../types/equipment';

/**
 * Estado do usuário na sessão: favoritos, recentes e preferência de
 * visualização. Listagens NÃO ficam aqui — cada página busca o que precisa.
 */

interface AppStateValue {
  favoritos: Set<string>;
  itensFavoritos: Equipment[];
  ehFavorito: (id: string) => boolean;
  alternarFavorito: (id: string) => Promise<void>;
  recentes: Equipment[];
  registrarAcesso: (id: string) => Promise<void>;
  viewMode: ViewMode;
  setViewMode: (modo: ViewMode) => void;
  /** Incrementa a cada mutação; páginas observam para recarregar. */
  versao: number;
  invalidar: () => void;
}

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const { usuario, atualizarUsuario } = useAuth();
  const [itensFavoritos, setItensFavoritos] = useState<Equipment[]>([]);
  const [recentes, setRecentes] = useState<Equipment[]>([]);
  const [versao, setVersao] = useState(0);
  const [viewMode, definirViewMode] = useState<ViewMode>(
    usuario?.preferencias?.visualizacao ?? 'grid',
  );

  const invalidar = useCallback(() => setVersao((v) => v + 1), []);

  useEffect(() => {
    if (!usuario) return;
    void Promise.all([api.favoritos(), api.recentes()])
      .then(([f, r]) => {
        setItensFavoritos(f);
        setRecentes(r);
      })
      .catch(() => undefined);
  }, [usuario?.id, versao]); // eslint-disable-line react-hooks/exhaustive-deps

  /** A escolha vira preferência do usuário, salva no servidor. */
  const setViewMode = useCallback(
    (modo: ViewMode) => {
      definirViewMode(modo);
      void api
        .atualizarPerfil({ preferencias: { visualizacao: modo } })
        .then(atualizarUsuario)
        .catch(() => undefined);
    },
    [atualizarUsuario],
  );

  const favoritos = useMemo(() => new Set(itensFavoritos.map((i) => i.id)), [itensFavoritos]);
  const ehFavorito = useCallback((id: string) => favoritos.has(id), [favoritos]);

  /** Otimista: a estrela responde na hora e volta atrás se o servidor recusar. */
  const alternarFavorito = useCallback(
    async (id: string) => {
      const anterior = itensFavoritos;
      const estava = favoritos.has(id);
      setItensFavoritos((atual) =>
        estava ? atual.filter((i) => i.id !== id) : [...atual, { id } as Equipment],
      );
      try {
        if (estava) await api.desfavoritar(id);
        else await api.favoritar(id);
        setItensFavoritos(await api.favoritos());
      } catch {
        setItensFavoritos(anterior);
      }
    },
    [favoritos, itensFavoritos],
  );

  const registrarAcesso = useCallback(async (id: string) => {
    await api.registrarAcesso(id).catch(() => undefined);
    setRecentes(await api.recentes().catch(() => []));
  }, []);

  const valor = useMemo<AppStateValue>(
    () => ({
      favoritos,
      itensFavoritos,
      ehFavorito,
      alternarFavorito,
      recentes,
      registrarAcesso,
      viewMode,
      setViewMode,
      versao,
      invalidar,
    }),
    [
      favoritos,
      itensFavoritos,
      ehFavorito,
      alternarFavorito,
      recentes,
      registrarAcesso,
      viewMode,
      setViewMode,
      versao,
      invalidar,
    ],
  );

  return <AppStateContext.Provider value={valor}>{children}</AppStateContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppState(): AppStateValue {
  const contexto = useContext(AppStateContext);
  if (!contexto) throw new Error('useAppState precisa estar dentro de AppStateProvider');
  return contexto;
}
