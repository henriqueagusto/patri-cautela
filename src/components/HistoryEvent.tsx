import {
  ArrowRight, DoorOpen, FilePlus2, Pencil, Undo2, Wrench, type LucideIcon,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { hora } from '../lib/format';
import type { Movimentacao, TipoMovimentacao } from '../types/equipment';

/** Cada tipo de evento tem ícone e cor próprios (§10.8). */
const ESTILO: Record<TipoMovimentacao, { Icone: LucideIcon; cor: string; rotulo: string }> = {
  cadastro: { Icone: FilePlus2, cor: 'var(--color-accent)', rotulo: 'Cadastro' },
  edicao: { Icone: Pencil, cor: 'var(--color-text-tertiary)', rotulo: 'Edição' },
  movimentacao: { Icone: ArrowRight, cor: 'var(--color-accent)', rotulo: 'Mudou de lugar' },
  saida: { Icone: DoorOpen, cor: 'var(--color-warning)', rotulo: 'Saída' },
  edicao_saida: { Icone: Pencil, cor: 'var(--color-warning)', rotulo: 'Saída alterada' },
  devolucao: { Icone: Undo2, cor: 'var(--color-success)', rotulo: 'Devolução' },
};

export function HistoryEvent({
  evento,
  equipamento,
}: {
  evento: Movimentacao;
  equipamento?: { id: string; nome: string; pr: string };
}) {
  const estilo = ESTILO[evento.tipo] ?? ESTILO.edicao;
  const Icone = evento.motivo?.toLowerCase().includes('manuten') ? Wrench : estilo.Icone;

  return (
    <article className="event" style={{ '--ev': estilo.cor } as CSSProperties}>
      <span className="event__icon">
        <Icone size={18} strokeWidth={1.5} aria-hidden="true" />
      </span>
      <div className="event__body">
        <div className="event__head">
          <span className="event__title">
            <strong>{evento.usuario}</strong> · {evento.descricao.toLowerCase()}
          </span>
          <span className="label tabular">{hora(evento.data)}</span>
        </div>

        {equipamento && (
          <Link to={`/equipamento/${equipamento.id}`} className="event__item">
            {equipamento.nome} · <span className="tabular">PR {equipamento.pr}</span>
          </Link>
        )}

        {(evento.origem || evento.destino) && (
          <p className="event__path">
            {evento.origem && <span>{evento.origem}</span>}
            {evento.origem && evento.destino && <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />}
            {evento.destino && <span className="event__path-to">{evento.destino}</span>}
          </p>
        )}

        {(evento.pessoa || evento.motivo || evento.retornoPrevisto) && (
          <p className="event__facts">
            {evento.pessoa && <span className="pill">Com {evento.pessoa.nome}</span>}
            {evento.motivo && <span className="pill">{evento.motivo}</span>}
            {evento.retornoPrevisto && (
              <span className="pill">Volta {new Date(evento.retornoPrevisto).toLocaleDateString('pt-BR')}</span>
            )}
          </p>
        )}

        {evento.observacao && <p className="event__note">{evento.observacao}</p>}
      </div>
    </article>
  );
}
