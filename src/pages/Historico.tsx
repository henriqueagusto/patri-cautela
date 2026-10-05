import { History as HistoryIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HistoryEvent } from '../components/HistoryEvent';
import { SelectField, TextField } from '../components/Form';
import { SearchInput } from '../components/Search';
import { Button, EmptyState, Skeleton } from '../components/ui';
import { api } from '../lib/api';
import { rotuloDia } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { useAppState } from '../state/AppState';
import type { EventoHistorico, Pessoa } from '../types/equipment';

const TIPOS = [
  { valor: 'saida', rotulo: 'Saídas' },
  { valor: 'devolucao', rotulo: 'Devoluções' },
  { valor: 'movimentacao', rotulo: 'Mudanças de lugar' },
  { valor: 'edicao_saida', rotulo: 'Saídas alteradas' },
  { valor: 'cadastro', rotulo: 'Cadastros' },
  { valor: 'edicao', rotulo: 'Edições' },
];

export function Historico() {
  const [params, setParams] = useSearchParams();
  const { versao } = useAppState();
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [termo, setTermo] = useState(params.get('q') ?? '');

  const filtros = {
    q: params.get('q') ?? '',
    tipo: params.get('tipo') ?? '',
    pessoa: params.get('pessoa') ?? '',
    equipamento: params.get('equipamento') ?? '',
    de: params.get('de') ?? '',
    ate: params.get('ate') ?? '',
  };

  useEffect(() => {
    void api.pessoas().then(setPessoas).catch(() => undefined);
  }, []);

  const consulta = useAsync(() => api.historico({ ...filtros, pagina: 1 }), [
    filtros.q, filtros.tipo, filtros.pessoa, filtros.equipamento, filtros.de, filtros.ate, versao,
  ]);

  function definir(chave: string, valor: string) {
    const p = new URLSearchParams(params);
    if (valor) p.set(chave, valor);
    else p.delete(chave);
    setParams(p, { replace: true });
  }

  const eventos = consulta.dados?.eventos ?? [];
  const grupos = eventos.reduce<Record<string, EventoHistorico[]>>((acc, ev) => {
    const dia = rotuloDia(ev.data);
    (acc[dia] ??= []).push(ev);
    return acc;
  }, {});
  const temFiltro = Object.values(filtros).some(Boolean);

  return (
    <div className="container">
      <header className="page-header">
        <div className="page-header__text">
          <h1 className="title-page">Histórico</h1>
          <p className="text-secondary text-sm tabular">
            {consulta.carregando ? 'Carregando…' : `${consulta.dados?.total ?? 0} movimentações`}
          </p>
        </div>
        {temFiltro && <Button onClick={() => setParams({}, { replace: true })}>Limpar filtros</Button>}
      </header>

      <div className="filters">
        <SearchInput
          valor={termo}
          placeholder="Equipamento, PR ou pessoa…"
          onChange={(v) => { setTermo(v); definir('q', v); }}
        />
        <SelectField
          label="Tipo" valor={filtros.tipo} onChange={(v) => definir('tipo', v)}
          placeholder="Todos os tipos" opcoes={TIPOS}
        />
        <SelectField
          label="Pessoa" valor={filtros.pessoa} onChange={(v) => definir('pessoa', v)}
          placeholder="Qualquer pessoa"
          opcoes={pessoas.map((p) => ({ valor: p.id, rotulo: p.nome }))}
        />
        <TextField label="De" opcional tipo="date" valor={filtros.de} onChange={(v) => definir('de', v)} />
        <TextField label="Até" opcional tipo="date" valor={filtros.ate} onChange={(v) => definir('ate', v)} />
      </div>

      {consulta.carregando && eventos.length === 0 ? (
        <div className="stack" style={{ gap: 'var(--space-2)' }}>
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} height="96px" />)}
        </div>
      ) : eventos.length === 0 ? (
        <EmptyState
          icon={<HistoryIcon size={24} strokeWidth={1.5} />}
          titulo={temFiltro ? 'Nada encontrado com esses filtros' : 'Nenhuma movimentação ainda'}
          descricao="Saídas, devoluções e mudanças de lugar aparecem aqui."
        />
      ) : (
        <div className="feed">
          {Object.entries(grupos).map(([dia, doDia]) => (
            <section key={dia} className="feed__day">
              <div className="feed__day-head">
                <h2 className="title-section">{dia}</h2>
                <span className="label tabular">{doDia.length}</span>
              </div>
              {doDia.map((ev) => (
                <HistoryEvent key={ev.id} evento={ev} equipamento={ev.equipamento} />
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
