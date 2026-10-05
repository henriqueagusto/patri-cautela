import { AlertTriangle, Check } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/** Toast discreto (§9.8). Nunca usar modal para confirmar sucesso. */

const DURACAO_PADRAO = 4000;
const DURACAO_COM_ACAO = 8000;

interface Toast {
  id: number;
  mensagem: string;
  tom: 'sucesso' | 'erro';
  acao?: { rotulo: string; executar: () => void };
}

interface ToastValue {
  sucesso: (mensagem: string, acao?: Toast['acao']) => void;
  erro: (mensagem: string) => void;
}

const ToastContext = createContext<ToastValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remover = useCallback((id: number) => {
    setToasts((atual) => atual.filter((t) => t.id !== id));
  }, []);

  const adicionar = useCallback(
    (mensagem: string, tom: Toast['tom'], acao?: Toast['acao']) => {
      const id = Date.now() + Math.random();
      setToasts((atual) => [...atual, { id, mensagem, tom, acao }]);
      window.setTimeout(
        () => remover(id),
        acao ? DURACAO_COM_ACAO : DURACAO_PADRAO,
      );
    },
    [remover],
  );

  const valor = useMemo<ToastValue>(
    () => ({
      sucesso: (mensagem, acao) => adicionar(mensagem, 'sucesso', acao),
      erro: (mensagem) => adicionar(mensagem, 'erro'),
    }),
    [adicionar],
  );

  return (
    <ToastContext.Provider value={valor}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast">
            <span
              className={`toast__icon toast__icon--${toast.tom}`}
              aria-hidden="true"
            >
              {toast.tom === 'sucesso' ? (
                <Check size={16} strokeWidth={2} />
              ) : (
                <AlertTriangle size={16} strokeWidth={1.5} />
              )}
            </span>
            <span className="toast__text">{toast.mensagem}</span>
            {toast.acao && (
              <button
                type="button"
                className="toast__action"
                onClick={() => {
                  toast.acao?.executar();
                  remover(toast.id);
                }}
              >
                {toast.acao.rotulo}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastValue {
  const contexto = useContext(ToastContext);
  if (!contexto) throw new Error('useToast precisa estar dentro de ToastProvider');
  return contexto;
}
