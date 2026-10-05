import { Check, Plus, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FotoEquipamento } from './EquipmentCard';
import { CheckboxField, SelectField, TextAreaField, TextField } from './Form';
import { Overlay } from './Overlay';
import { PersonPicker, SectorPicker } from './Pickers';
import { Button } from './ui';
import { api } from '../lib/api';
import { caminhoCurto, emDias, formatarPr, paraInputData } from '../lib/format';
import { useCatalog } from '../state/CatalogState';
import type { Cautela, Equipment, Pessoa, Setor } from '../types/equipment';

/* --- Dados da cautela ---------------------------------------------------- */

export interface DadosCautela {
  responsavel: Pessoa | null;
  destino: Setor | null;
  destinoDetalhe: string;
  tecnicoTransporte: string;
  motivoId: string;
  semPrazo: boolean;
  retorno: string;
  observacao: string;
}

export function dadosIniciais(c?: Cautela, prazoPadrao = 7): DadosCautela {
  return {
    responsavel: c ? ({ ...c.responsavel, ativo: true } as Pessoa) : null,
    destino: c?.destino ? ({ ...c.destino, ativo: true } as Setor) : null,
    destinoDetalhe: c?.destinoDetalhe ?? '',
    tecnicoTransporte: c?.tecnicoTransporte ?? '',
    motivoId: c?.motivo?.id ?? '',
    semPrazo: Boolean(c && !c.retornoPrevisto),
    retorno: c?.retornoPrevisto ? paraInputData(c.retornoPrevisto) : paraInputData(emDias(prazoPadrao)),
    observacao: c?.observacao ?? '',
  };
}

export function payloadCautela(d: DadosCautela) {
  return {
    responsavelId: d.responsavel?.id,
    destinoId: d.destino?.id ?? null,
    destinoDetalhe: d.destinoDetalhe || null,
    tecnicoTransporte: d.tecnicoTransporte || null,
    motivoId: d.motivoId || null,
    retornoPrevisto: d.semPrazo || !d.retorno ? null : d.retorno,
    observacao: d.observacao || null,
  };
}

/** Os campos que vão para a folha, na ordem em que aparecem nela. */
export function CamposCautela({
  dados,
  alterar,
  erroResponsavel,
}: {
  dados: DadosCautela;
  alterar: (d: Partial<DadosCautela>) => void;
  erroResponsavel?: string;
}) {
  const { motivos, settings } = useCatalog();
  const [pessoas, setPessoas] = useState<string[]>([]);

  useEffect(() => {
    void api.pessoas().then((l) => setPessoas(l.map((p) => p.nome))).catch(() => undefined);
  }, []);

  function escolherMotivo(id: string) {
    const motivo = motivos.find((m) => m.id === id);
    const dias = motivo?.prazoDias ?? settings?.prazoPadraoDias ?? 7;
    alterar({ motivoId: id, retorno: paraInputData(emDias(dias)), semPrazo: false });
  }

  return (
    <div className="form-grid">
      <div style={{ gridColumn: '1 / -1' }}>
        <PersonPicker
          label="Usuário (quem recebe)"
          valor={dados.responsavel}
          onChange={(p) => alterar({ responsavel: p })}
          erro={erroResponsavel}
        />
      </div>
      <SectorPicker label="Local ou evento de uso" valor={dados.destino} onChange={(s) => alterar({ destino: s })} />
      <TextField
        label="Detalhe do local"
        opcional
        valor={dados.destinoDetalhe}
        onChange={(v) => alterar({ destinoDetalhe: v })}
        placeholder="Posse do ministro, bloco B…"
      />
      <SelectField
        label="Motivo"
        opcional
        valor={dados.motivoId}
        onChange={escolherMotivo}
        placeholder="Sem motivo específico"
        opcoes={motivos
          .filter((m) => m.ativo || m.id === dados.motivoId)
          .map((m) => ({ valor: m.id, rotulo: m.prazoDias ? `${m.nome} · ${m.prazoDias} dias` : m.nome }))}
      />
      <TextField
        label="Técnico responsável pelo transporte"
        opcional
        valor={dados.tecnicoTransporte}
        onChange={(v) => alterar({ tecnicoTransporte: v })}
        lista={pessoas}
      />
      {!dados.semPrazo && (
        <TextField label="Previsão de devolução" tipo="date" valor={dados.retorno} onChange={(v) => alterar({ retorno: v })} />
      )}
      <div className="field" style={{ justifyContent: 'flex-end' }}>
        <CheckboxField
          label="Sem prazo de devolução"
          marcado={dados.semPrazo}
          onChange={(v) => alterar({ semPrazo: v })}
        />
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <TextAreaField
          label="Observação"
          opcional
          linhas={2}
          valor={dados.observacao}
          onChange={(v) => alterar({ observacao: v })}
          placeholder="Acompanha bateria extra, cabo HDMI…"
        />
      </div>
    </div>
  );
}

/* --- Seleção de itens ---------------------------------------------------- */

/**
 * Busca equipamentos disponíveis e marca vários de uma vez. Pensado para o
 * tablet: alvo de toque grande, busca por PR ou nome, confirmação única.
 */
export function ItemPicker({
  aberto,
  onFechar,
  onConfirmar,
  jaEscolhidos,
}: {
  aberto: boolean;
  onFechar: () => void;
  onConfirmar: (itens: Equipment[]) => void;
  jaEscolhidos: string[];
}) {
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState<Equipment[]>([]);
  const [marcados, setMarcados] = useState<Map<string, Equipment>>(new Map());
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (aberto) {
      setBusca('');
      setMarcados(new Map());
    }
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    setCarregando(true);
    const t = window.setTimeout(() => {
      void api
        .buscar({ q: busca, filtro: 'disponivel' })
        .then((r) => setResultados(r.resultados.map((x) => x.item)))
        .catch(() => setResultados([]))
        .finally(() => setCarregando(false));
    }, 180);
    return () => window.clearTimeout(t);
  }, [busca, aberto]);

  function alternar(item: Equipment) {
    setMarcados((m) => {
      const n = new Map(m);
      if (n.has(item.id)) n.delete(item.id);
      else n.set(item.id, item);
      return n;
    });
  }

  const disponiveis = resultados.filter((i) => !jaEscolhidos.includes(i.id));

  return (
    <Overlay
      aberto={aberto}
      onFechar={onFechar}
      titulo="Adicionar equipamentos"
      largo
      rodape={
        <>
          <Button variant="ghost" onClick={onFechar}>Cancelar</Button>
          <Button
            variant="primary"
            disabled={marcados.size === 0}
            onClick={() => {
              onConfirmar([...marcados.values()]);
              onFechar();
            }}
          >
            {marcados.size ? `Adicionar ${marcados.size}` : 'Adicionar'}
          </Button>
        </>
      }
    >
      <div className="field__control">
        <Search size={16} strokeWidth={1.5} aria-hidden="true" />
        <input
          className="field__input"
          placeholder="PR, nome, marca ou modelo…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          inputMode="search"
        />
      </div>
      <div className="opt-list pick-list">
        {!carregando && disponiveis.length === 0 && (
          <p className="text-secondary text-sm" style={{ padding: 'var(--space-4) var(--space-3)' }}>
            {busca ? 'Nenhum equipamento disponível com esse termo.' : 'Nenhum equipamento disponível no momento.'}
          </p>
        )}
        {disponiveis.map((item) => {
          const marcado = marcados.has(item.id);
          return (
            <button
              key={item.id}
              type="button"
              className={`opt${marcado ? ' opt--selecionado' : ''}`}
              aria-pressed={marcado}
              onClick={() => alternar(item)}
            >
              <FotoEquipamento item={item} tamanhoIcone={20} className="pick-list__thumb" />
              <span className="opt__body">
                <span className="opt__title">{item.nome}</span>
                <span className="opt__sub tabular">
                  {formatarPr(item.pr)} · {caminhoCurto(item.local.caminho)}
                </span>
              </span>
              <span className={`pick-list__check${marcado ? ' pick-list__check--on' : ''}`} aria-hidden="true">
                {marcado ? <Check size={16} strokeWidth={2} /> : <Plus size={16} strokeWidth={1.5} />}
              </span>
            </button>
          );
        })}
      </div>
    </Overlay>
  );
}

/** Linha de item escolhido, com botão de retirar. */
export function ItemEscolhido({ item, onRemover }: { item: Equipment; onRemover?: () => void }) {
  return (
    <div className="chosen">
      <FotoEquipamento item={item} tamanhoIcone={20} className="pick-list__thumb" />
      <span className="opt__body">
        <span className="opt__title">{item.nome}</span>
        <span className="opt__sub tabular">
          {formatarPr(item.pr)}
          {item.numeroSerie && ` · Série ${item.numeroSerie}`}
          {item.marca && ` · ${item.marca} ${item.modelo}`}
        </span>
      </span>
      {onRemover && (
        <button type="button" className="icon-btn icon-btn--touch" aria-label={`Retirar ${item.nome}`} onClick={onRemover}>
          <X size={18} strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
}
