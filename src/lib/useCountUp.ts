import { useEffect, useState } from 'react';

/**
 * Número que "sobe" até o valor final ao aparecer. Respeita
 * prefers-reduced-motion: nesse caso mostra o valor direto.
 */
export function useCountUp(alvo: number, duracao = 900): number {
  const [valor, setValor] = useState(0);

  useEffect(() => {
    const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (semMovimento || alvo === 0) {
      setValor(alvo);
      return;
    }

    let inicio: number | null = null;
    let quadro = 0;
    const passo = (agora: number) => {
      inicio ??= agora;
      const p = Math.min((agora - inicio) / duracao, 1);
      setValor(Math.round(alvo * (1 - Math.pow(1 - p, 3))));
      if (p < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [alvo, duracao]);

  return valor;
}
