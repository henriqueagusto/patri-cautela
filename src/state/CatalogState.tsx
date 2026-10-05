import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from '../lib/api';
import { definirJanelaRetorno } from '../lib/status';
import type { Categoria, Local, Motivo, NoCaminho, Settings, Setor } from '../types/equipment';

/**
 * Cadastros de apoio que a interface inteira consulta: configurações,
 * categorias, setores, motivos e locais. Carregados uma vez e recarregados
 * quando algum cadastro muda.
 */

interface CatalogValue {
  pronto: boolean;
  settings: Settings | null;
  categorias: Categoria[];
  setores: Setor[];
  motivos: Motivo[];
  locais: Local[];
  recarregar: () => Promise<void>;
  /** Caminho de um local, do mais amplo ao mais específico. */
  caminhoDe: (id: string | null | undefined) => NoCaminho[];
  /** Locais dentro de `id`, em ordem natural. Arquivados só se pedido. */
  filhosDe: (id: string | null, opcoes?: { incluirArquivados?: boolean }) => Local[];
}

const CatalogContext = createContext<CatalogValue | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [pronto, setPronto] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [motivos, setMotivos] = useState<Motivo[]>([]);
  const [locais, setLocais] = useState<Local[]>([]);

  const recarregar = useCallback(async () => {
    const [s, c, st, m, l] = await Promise.all([
      api.settings(),
      api.categorias(),
      api.setores(),
      api.motivos(),
      api.locais(),
    ]);
    definirJanelaRetorno(s.horasRetornoProximo);
    setSettings(s);
    setCategorias(c);
    setSetores(st);
    setMotivos(m);
    setLocais(l);
    setPronto(true);
  }, []);

  // Se a primeira carga falhar (servidor reiniciando, rede oscilando), tenta
  // de novo sozinho até conseguir — sem isso as telas ficavam sem configurações
  // até a pessoa recarregar a página.
  useEffect(() => {
    let cancelado = false;
    let espera: ReturnType<typeof setTimeout> | undefined;
    const tentar = () => {
      recarregar().catch(() => {
        if (cancelado) return;
        setPronto(true);
        espera = setTimeout(tentar, 4000);
      });
    };
    tentar();
    return () => {
      cancelado = true;
      clearTimeout(espera);
    };
  }, [recarregar]);

  const porId = useMemo(() => new Map(locais.map((l) => [l.id, l])), [locais]);

  const caminhoDe = useCallback(
    (id: string | null | undefined) => {
      const caminho: NoCaminho[] = [];
      const vistos = new Set<string>();
      let atual = id ? porId.get(id) : undefined;
      while (atual && !vistos.has(atual.id)) {
        vistos.add(atual.id);
        caminho.unshift({ id: atual.id, nome: atual.nome, tipo: atual.tipo });
        atual = atual.parentId ? porId.get(atual.parentId) : undefined;
      }
      return caminho;
    },
    [porId],
  );

  const filhosDe = useCallback(
    (id: string | null, opcoes?: { incluirArquivados?: boolean }) =>
      locais
        .filter((l) => l.parentId === id && (opcoes?.incluirArquivados || !l.arquivado))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true })),
    [locais],
  );

  const valor = useMemo<CatalogValue>(
    () => ({
      pronto,
      settings,
      categorias,
      setores,
      motivos,
      locais,
      recarregar,
      caminhoDe,
      filhosDe,
    }),
    [pronto, settings, categorias, setores, motivos, locais, recarregar, caminhoDe, filhosDe],
  );

  return <CatalogContext.Provider value={valor}>{children}</CatalogContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCatalog(): CatalogValue {
  const contexto = useContext(CatalogContext);
  if (!contexto) throw new Error('useCatalog precisa estar dentro de CatalogProvider');
  return contexto;
}
