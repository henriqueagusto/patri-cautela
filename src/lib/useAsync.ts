import { useCallback, useEffect, useState } from 'react';
import { ApiError } from './api';

/**
 * Busca dados com estados de carregamento e erro.
 * Existe para que toda página trate loading e falha do mesmo jeito.
 */
export function useAsync<T>(
  buscar: () => Promise<T>,
  dependencias: unknown[] = [],
): {
  dados: T | undefined;
  carregando: boolean;
  erro: string | undefined;
  recarregar: () => void;
} {
  const [dados, setDados] = useState<T>();
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string>();
  const [tentativa, setTentativa] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const executar = useCallback(buscar, dependencias);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    setErro(undefined);

    executar()
      .then((resultado) => {
        if (!cancelado) setDados(resultado);
      })
      .catch((problema) => {
        if (cancelado) return;
        setErro(
          problema instanceof ApiError
            ? problema.message
            : 'Não foi possível carregar estes dados.',
        );
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [executar, tentativa]);

  return {
    dados,
    carregando,
    erro,
    recarregar: () => setTentativa((n) => n + 1),
  };
}
