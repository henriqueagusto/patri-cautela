import { normalizar } from './format';
import type { Local } from '../types/equipment';

/**
 * Sequência comum de níveis, só para SUGERIR o tipo do próximo local.
 * A árvore continua livre: o administrador pode digitar qualquer tipo.
 */
const PROXIMO_NIVEL: Record<string, string> = {
  predio: 'Sala',
  andar: 'Sala',
  sala: 'Armário',
  armario: 'Prateleira',
  estante: 'Prateleira',
  prateleira: 'Gaveta',
  gaveta: 'Caixa',
};

/**
 * Tipo sugerido para um local novo dentro de `pai`.
 * 1. Se já há locais nesse nível, repete o tipo mais usado entre eles.
 * 2. Senão, segue a sequência Prédio → Sala → Armário → Prateleira → Gaveta.
 * 3. No nível principal, sem nada ainda: Prédio.
 */
export function sugerirTipo(pai: Local | null | undefined, irmaos: Local[]): string {
  if (irmaos.length) {
    const contagem = new Map<string, number>();
    for (const i of irmaos) contagem.set(i.tipo, (contagem.get(i.tipo) ?? 0) + 1);
    return [...contagem.entries()].sort((a, b) => b[1] - a[1])[0]![0];
  }
  if (!pai) return 'Prédio';
  return PROXIMO_NIVEL[normalizar(pai.tipo)] ?? '';
}

/** Próximo número livre para "{prefixo} N" entre os irmãos (Prateleira 4 → 5). */
export function proximoNumero(prefixo: string, irmaos: Local[]): number {
  const base = normalizar(prefixo);
  let maior = 0;
  for (const i of irmaos) {
    const nome = normalizar(i.nome);
    if (!nome.startsWith(`${base} `)) continue;
    const n = Number(nome.slice(base.length + 1));
    if (Number.isInteger(n) && n > maior) maior = n;
  }
  return maior + 1;
}

/** Nome repetido no mesmo nível (mesma regra do servidor). */
export function nomeRepetido(nome: string, irmaos: Local[], ignorarId?: string): Local | undefined {
  const alvo = normalizar(nome);
  return irmaos.find((i) => i.id !== ignorarId && normalizar(i.nome) === alvo);
}
