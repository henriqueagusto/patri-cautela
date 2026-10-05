import type { NoCaminho } from '../types/equipment';

/** Remove acentos e caixa — mesma normalização usada no servidor. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export const formatarPr = (pr: string) => `PR ${pr}`;

/** "Sala 12 › Armário A › Prateleira 3" */
export const caminhoCompleto = (caminho: NoCaminho[]) => caminho.map((n) => n.nome).join(' › ');

/** Os dois níveis mais específicos — cabe em card. */
export const caminhoCurto = (caminho: NoCaminho[]) =>
  caminho
    .slice(-2)
    .map((n) => n.nome)
    .join(' · ') || 'Sem local';

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

function mesmoDia(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

export function rotuloDia(iso: string, agora = new Date()): string {
  const data = new Date(iso);
  const ontem = new Date(agora);
  ontem.setDate(ontem.getDate() - 1);
  if (mesmoDia(data, agora)) return 'Hoje';
  if (mesmoDia(data, ontem)) return 'Ontem';
  const base = `${data.getDate()} de ${MESES[data.getMonth()]}`;
  return data.getFullYear() === agora.getFullYear() ? base : `${base} de ${data.getFullYear()}`;
}

export const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export const dataCurta = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');

export const dataHoraRelativa = (iso: string) => `${rotuloDia(iso)} · ${hora(iso)}`;

/** Valor para <input type="date">. */
export const paraInputData = (d: Date | string) => {
  const data = typeof d === 'string' ? new Date(d) : d;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${data.getFullYear()}-${p(data.getMonth() + 1)}-${p(data.getDate())}`;
};

export const emDias = (dias: number) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d;
};

export function prazoRelativo(iso: string, agora = new Date()): string {
  const dias = Math.round((new Date(iso).getTime() - agora.getTime()) / 864e5);
  if (dias === 0) return 'hoje';
  if (dias === 1) return 'amanhã';
  if (dias === -1) return 'ontem';
  return dias > 0 ? `em ${dias} dias` : `há ${Math.abs(dias)} dias`;
}

export const moeda = (valor: number) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const iniciais = (nome: string) =>
  nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

/** Identificação da cautela, como no papel: "300/2026". */
export const numeroCautela = (c: { numero: number; ano: number }) => `${c.numero}/${c.ano}`;
