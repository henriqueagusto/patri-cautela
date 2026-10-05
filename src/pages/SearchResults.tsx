import { Plus, SearchX, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Overlay, useEhMobile } from '../components/Overlay';
import { LocationPicker } from '../components/Pickers';
import { ResultsView, SearchInput, ViewToggle } from '../components/Search';
import { Button, EmptyState } from '../components/ui';
import { api } from '../lib/api';
import { caminhoCurto } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { useAppState } from '../state/AppState';
import { useCatalog } from '../state/CatalogState';
import type { FiltroSlug } from '../types/equipment';

const FILTROS: { slug: FiltroSlug; rotulo: string }[] = [
  { slug: 'todos', rotulo: 'Todos' },
  { slug: 'disponivel', rotulo: 'Disponíveis' },
  { slug: 'fora-da-sala', rotulo: 'Fora da sala' },
  { slug: 'manutencao', rotulo: 'Em manutenção' },
  { slug: 'atrasado', rotulo: 'Atrasados' },
  { slug: 'atencao', rotulo: 'Atenção' },
  { slug: 'baixado', rotulo: 'Baixados' },
];

export function SearchResults() {
  const [params, setParams] = useSearchParams();
  const termoUrl = params.get('q') ?? '';
  const filtro = (params.get('filtro') as FiltroSlug) ?? 'todos';
  const categoria = params.get('categoria') ?? '';
  const local = params.get('local') ?? '';

  const { versao } = useAppState();
  const { categorias, caminhoDe } = useCatalog();
  const ehMobile = useEhMobile();
  const [painel, setPainel] = useState(false);
  const [termo, setTermo] = useState(termoUrl);
  const [buscado, setBuscado] = useState(termoUrl);

  useEffect(() => setTermo(termoUrl), [termoUrl]);
  useEffect(() => {
    const t = window.setTimeout(() => setBuscado(termo), 150);
    return () => window.clearTimeout(t);
  }, [termo]);

  const busca = useAsync(
    () => api.buscar({ q: buscado, filtro, categoria, local }),
    [buscado, filtro, categoria, local, versao],
  );

  function definir(chave: string, valor: string) {
    const p = new URLSearchParams(params);
    if (!valor || valor === 'todos') p.delete(chave);
    else p.set(chave, valor);
    setParams(p, { replace: true });
  }

  const resultados = busca.dados?.resultados ?? [];
  const total = busca.dados?.total ?? 0;
  const temFiltro = filtro !== 'todos' || categoria || local;

  const chipsSituacao = (
    <div className="chips" role="group" aria-label="Filtrar por situação">
      {FILTROS.map(({ slug, rotulo }) => (
        <button
          key={slug}
          type="button"
          className={`chip${filtro === slug ? ' chip--active' : ''}`}
          aria-pressed={filtro === slug}
          onClick={() => definir('filtro', slug)}
        >
          {rotulo}
        </button>
      ))}
    </div>
  );

  const filtrosExtras = (
    <div className="form-grid">
      <div className="field">
        <label className="label" htmlFor="f-cat">Categoria</label>
        <div className="field__control">
          <select id="f-cat" className="field__input field__select" value={categoria} onChange={(e) => definir('categoria', e.target.value)}>
            <option value="">Todas as categorias</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
      </div>
      <LocationPicker label="Local (inclui o que está dentro)" valor={local || null} onChange={(id) => definir('local', id)} permitirCriar={false} />
    </div>
  );

  return (
    <div className="container">
      <header className="page-header">
        <div className="page-header__text">
          <h1 className="title-page">Equipamentos</h1>
          <p className="text-secondary text-sm tabular">
            {busca.carregando ? 'Buscando…' : `${total} ${total === 1 ? 'resultado' : 'resultados'}`}
          </p>
        </div>
        <Link to="/equipamentos/novo">
          <Button variant="primary" icon={<Plus size={16} strokeWidth={1.5} />}>Novo equipamento</Button>
        </Link>
      </header>

      <div className="results__search">
        <SearchInput
          valor={termo}
          onChange={(v) => {
            setTermo(v);
            definir('q', v);
          }}
        />
      </div>

      <div className="results__toolbar">
        {ehMobile ? (
          <button type="button" className={`chip${temFiltro ? ' chip--active' : ''}`} onClick={() => setPainel(true)}>
            <SlidersHorizontal size={14} strokeWidth={1.5} aria-hidden="true" /> Filtros
          </button>
        ) : (
          chipsSituacao
        )}
        <div className="row" style={{ gap: 'var(--space-2)' }}>
          {!ehMobile && (
            <Button size="sm" variant={categoria || local ? 'secondary' : 'ghost'} icon={<SlidersHorizontal size={14} strokeWidth={1.5} />} onClick={() => setPainel(true)}>
              Mais filtros
            </Button>
          )}
          <ViewToggle />
        </div>
      </div>

      {(categoria || local) && (
        <div className="chips" style={{ marginBottom: 'var(--space-4)' }}>
          {categoria && (
            <button type="button" className="chip chip--active" onClick={() => definir('categoria', '')}>
              {categorias.find((c) => c.id === categoria)?.nome} <X size={12} />
            </button>
          )}
          {local && (
            <button type="button" className="chip chip--active" onClick={() => definir('local', '')}>
              {caminhoCurto(caminhoDe(local))} <X size={12} />
            </button>
          )}
        </div>
      )}

      <Overlay
        aberto={painel}
        onFechar={() => setPainel(false)}
        titulo="Filtrar"
        rodape={
          <>
            <Button variant="ghost" onClick={() => setParams(termoUrl ? { q: termoUrl } : {}, { replace: true })}>
              Limpar filtros
            </Button>
            <Button variant="primary" onClick={() => setPainel(false)}>Ver resultados</Button>
          </>
        }
      >
        {ehMobile && chipsSituacao}
        {filtrosExtras}
      </Overlay>

      <div className="section">
        {busca.erro ? (
          <EmptyState icon={<SearchX size={24} strokeWidth={1.5} />} titulo={busca.erro} acao={<Button onClick={busca.recarregar}>Tentar novamente</Button>} />
        ) : !busca.carregando && resultados.length === 0 ? (
          <EmptyState
            icon={<SearchX size={24} strokeWidth={1.5} />}
            titulo={termo ? `Nada encontrado para "${termo}"` : temFiltro ? 'Nenhum equipamento com esses filtros' : 'Nenhum equipamento cadastrado'}
            descricao={termo || temFiltro ? 'Verifique a escrita ou remova os filtros.' : 'Cadastre o primeiro equipamento do acervo.'}
            acao={
              termo || temFiltro ? (
                <Button onClick={() => setParams({}, { replace: true })}>Limpar busca e filtros</Button>
              ) : (
                <Link to="/equipamentos/novo"><Button variant="primary">Cadastrar equipamento</Button></Link>
              )
            }
          />
        ) : (
          <ResultsView resultados={resultados} termo={buscado} carregando={busca.carregando} />
        )}
      </div>
    </div>
  );
}
