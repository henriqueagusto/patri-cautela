import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ApiError, api, guardarToken, lerToken, limparToken } from '../lib/api';
import type { Usuario } from '../types/equipment';

interface AuthValue {
  usuario: Usuario | null;
  carregando: boolean;
  /** Há sessão guardada, mas o servidor não respondeu. Nova tentativa automática. */
  semConexao: boolean;
  ehAdmin: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => void;
  atualizarUsuario: (u: Usuario) => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [semConexao, setSemConexao] = useState(false);

  // Restaura a sessão ao abrir. Só um 401 encerra a sessão (o cliente da API
  // já apaga o token nesse caso). Se o servidor apenas não respondeu — está
  // reiniciando, a rede caiu —, o login é mantido e tenta-se de novo.
  useEffect(() => {
    if (!lerToken()) {
      setCarregando(false);
      return;
    }
    let cancelado = false;
    let espera: ReturnType<typeof setTimeout> | undefined;

    const tentar = () => {
      api
        .eu()
        .then((u) => {
          if (cancelado) return;
          setUsuario(u);
          setSemConexao(false);
        })
        .catch((erro) => {
          if (cancelado) return;
          const sessaoInvalida = erro instanceof ApiError && (erro.status === 401 || erro.status === 403);
          if (sessaoInvalida || !lerToken()) {
            limparToken();
            setSemConexao(false);
            return;
          }
          setSemConexao(true);
          espera = setTimeout(tentar, 4000);
        })
        .finally(() => {
          if (!cancelado) setCarregando(false);
        });
    };
    tentar();

    return () => {
      cancelado = true;
      clearTimeout(espera);
    };
  }, []);

  // Qualquer 401 da API derruba a sessão e volta para o login.
  useEffect(() => {
    const expirar = () => setUsuario(null);
    window.addEventListener('patri:sessao-expirada', expirar);
    return () => window.removeEventListener('patri:sessao-expirada', expirar);
  }, []);

  const entrar = useCallback(async (email: string, senha: string) => {
    const { token } = await api.login(email, senha);
    guardarToken(token);
    setUsuario(await api.eu());
  }, []);

  const sair = useCallback(() => {
    limparToken();
    setUsuario(null);
    setSemConexao(false);
  }, []);

  const valor = useMemo<AuthValue>(
    () => ({
      usuario,
      carregando,
      semConexao,
      ehAdmin: usuario?.papel === 'ADMINISTRADOR',
      entrar,
      sair,
      atualizarUsuario: setUsuario,
    }),
    [usuario, carregando, semConexao, entrar, sair],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthValue {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth precisa estar dentro de AuthProvider');
  return contexto;
}
