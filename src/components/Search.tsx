import { LayoutGrid, List, Search as SearchIcon, X } from 'lucide-react';
import { EquipmentCard, EquipmentRow } from './EquipmentCard';
import { SkeletonCard } from './ui';
import type { ResultadoBusca } from '../lib/api';
import { useAppState } from '../state/AppState';
import type { ViewMode } from '../types/equipment';

export function SearchInput({
  valor,
  onChange,
  hero = false,
  autoFocus = false,
  placeholder = 'Busque por PR, nome, marca, modelo, local ou pessoa…',
}: {
  valor: string;
  onChange: (valor: string) => void;
  hero?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  return (
    <div className={`field${hero ? ' search--hero' : ''}`}>
      <label className="visually-hidden" htmlFor="busca">
        Buscar equipamento
      </label>
      <div className="field__control">
        <SearchIcon size={hero ? 20 : 16} strokeWidth={1.5} aria-hidden="true" />
        <input
          id="busca"
          type="search"
          className="field__input"
          placeholder={placeholder}
          value={valor}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
        />
        {valor && (
          <button type="button" className="icon-btn" aria-label="Limpar busca" onClick={() => onChange('')}>
            <X size={16} strokeWidth={1.5} />
          </button>
        )}
      </div>
    </div>
  );
}

export function ViewToggle() {
  const { viewMode, setViewMode } = useAppState();
  const opcoes: { modo: ViewMode; rotulo: string; Icone: typeof LayoutGrid }[] = [
    { modo: 'grid', rotulo: 'Ver em grade', Icone: LayoutGrid },
    { modo: 'lista', rotulo: 'Ver em lista', Icone: List },
  ];
  return (
    <div className="view-toggle" role="group" aria-label="Modo de visualização">
      {opcoes.map(({ modo, rotulo, Icone }) => (
        <button
          key={modo}
          type="button"
          className={`view-toggle__btn${viewMode === modo ? ' view-toggle__btn--active' : ''}`}
          aria-label={rotulo}
          aria-pressed={viewMode === modo}
          onClick={() => setViewMode(modo)}
        >
          <Icone size={16} strokeWidth={1.5} />
        </button>
      ))}
    </div>
  );
}

export function ResultsView({
  resultados,
  termo = '',
  carregando = false,
  modo,
}: {
  resultados: ResultadoBusca[];
  termo?: string;
  carregando?: boolean;
  modo?: ViewMode;
}) {
  const { viewMode } = useAppState();
  const efetivo = modo ?? viewMode;

  if (carregando && resultados.length === 0) {
    return (
      <div className="grid-d" aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (efetivo === 'lista') {
    return (
      <div className={`rows-d${carregando ? ' is-refreshing' : ''}`}>
        {resultados.map(({ item }) => (
          <EquipmentRow key={item.id} item={item} termo={termo} />
        ))}
      </div>
    );
  }

  return (
    <div className={`grid-d${carregando ? ' is-refreshing' : ''}`}>
      {resultados.map(({ item, prExato }) => (
        <EquipmentCard key={item.id} item={item} termo={termo} destacado={prExato} />
      ))}
    </div>
  );
}
