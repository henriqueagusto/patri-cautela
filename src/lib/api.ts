import type {
  Cautela,
  CautelaResumo,
  Categoria,
  Equipment,
  EventoHistorico,
  ItemExcluido,
  Local,
  Motivo,
  Pessoa,
  RegistroAuditoria,
  Settings,
  Setor,
  Usuario,
} from '../types/equipment';

/**
 * Cliente da API. Único arquivo que faz fetch — componentes chamam funções.
 */

const BASE = import.meta.env.VITE_API_URL ?? '/api';
const CHAVE_TOKEN = 'patri.token';

export class ApiError extends Error {
  status: number;
  campos?: { campo: string; mensagem: string }[];

  constructor(status: number, message: string, campos?: { campo: string; mensagem: string }[]) {
    super(message);
    this.status = status;
    this.campos = campos;
  }
}

/**
 * Endereço de um arquivo enviado (foto, logo) para usar em `<img src>`.
 *
 * O servidor devolve e o banco guarda o caminho relativo `/uploads/<arquivo>`.
 * Esse caminho pertence ao backend, não ao site: em produção frontend e API
 * ficam em domínios diferentes, então ele precisa ganhar a base da API.
 * Endereços absolutos (http, data:, blob:) passam intactos.
 */
export function urlArquivo(caminho?: string | null): string | undefined {
  if (!caminho) return undefined;
  if (/^(https?:|data:|blob:)/i.test(caminho)) return caminho;
  if (caminho.startsWith('/uploads/')) return `${BASE.replace(/\/+$/, '')}${caminho}`;
  return caminho;
}

export const lerToken = () => localStorage.getItem(CHAVE_TOKEN);
export const guardarToken = (token: string) => localStorage.setItem(CHAVE_TOKEN, token);
export const limparToken = () => localStorage.removeItem(CHAVE_TOKEN);

/** Mensagem legível de qualquer erro, para toasts e formulários. */
export function mensagemDeErro(erro: unknown, padrao = 'Não foi possível concluir a operação.') {
  if (erro instanceof ApiError) return erro.campos?.[0]?.mensagem ?? erro.message;
  return padrao;
}

async function requisitar<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  const token = lerToken();
  const ehFormData = opcoes.body instanceof FormData;

  let resposta: Response;
  try {
    resposta = await fetch(`${BASE}${caminho}`, {
      ...opcoes,
      headers: {
        ...(ehFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...opcoes.headers,
      },
    });
  } catch {
    throw new ApiError(0, 'Não foi possível falar com o servidor. Verifique se ele está rodando.');
  }

  if (resposta.status === 204) return undefined as T;
  const corpo = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    if (resposta.status === 401) {
      limparToken();
      window.dispatchEvent(new Event('patri:sessao-expirada'));
    }
    throw new ApiError(
      resposta.status,
      corpo?.mensagem ?? 'Não foi possível concluir a operação.',
      corpo?.campos,
    );
  }
  return corpo as T;
}

const get = <T>(c: string) => requisitar<T>(c);
const post = <T>(c: string, dados?: unknown) =>
  requisitar<T>(c, { method: 'POST', body: dados === undefined ? undefined : JSON.stringify(dados) });
const patch = <T>(c: string, dados: unknown) =>
  requisitar<T>(c, { method: 'PATCH', body: JSON.stringify(dados) });
const put = <T>(c: string) => requisitar<T>(c, { method: 'PUT' });
const del = <T>(c: string) => requisitar<T>(c, { method: 'DELETE' });

function query(params: Record<string, string | number | undefined>) {
  const q = new URLSearchParams();
  for (const [chave, valor] of Object.entries(params)) {
    if (valor !== undefined && valor !== '' && valor !== 'todos') q.set(chave, String(valor));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

export interface ResultadoBusca {
  item: Equipment;
  prExato: boolean;
}

export const api = {
  /* --- Sessão ---------------------------------------------------------- */
  branding: () =>
    get<{ nomeInstituicao: string; subtitulo: string; logo?: string | null }>('/auth/branding'),
  login: (email: string, senha: string) =>
    post<{ token: string }>('/auth/login', { email, senha }),
  eu: () => get<Usuario>('/me'),
  atualizarPerfil: (dados: Partial<Usuario>) => patch<Usuario>('/me', dados),
  trocarSenha: (atual: string, nova: string) => post<void>('/me/password', { atual, nova }),
  minhaAtividade: () =>
    get<{
      acoes: (EventoHistorico & { equipamento: { id: string; nome: string; pr: string } })[];
      comigo: Equipment[];
      totais: Record<string, number>;
    }>('/me/activity'),

  /* --- Equipamentos ---------------------------------------------------- */
  buscar: (p: {
    q?: string;
    filtro?: string;
    categoria?: string;
    local?: string;
    pessoa?: string;
    pagina?: number;
  }) =>
    get<{ total: number; pagina: number; porPagina: number; resultados: ResultadoBusca[] }>(
      `/equipments${query(p)}`,
    ),
  obter: (id: string) => get<Equipment>(`/equipments/${id}`),
  indicadores: () =>
    get<{
      total: number;
      disponiveis: number;
      foraDaSala: number;
      manutencao: number;
      atrasados: number;
    }>('/equipments/indicators'),
  alertas: () => get<Equipment[]>('/equipments/alerts'),
  cadastrar: (dados: Record<string, unknown>) => post<Equipment>('/equipments', dados),
  atualizar: (id: string, dados: Record<string, unknown>) =>
    patch<Equipment>(`/equipments/${id}`, dados),
  mover: (id: string, dados: { locationId: string; observacao?: string }) =>
    post<Equipment>(`/equipments/${id}/move`, dados),
  excluir: (id: string) => del<void>(`/equipments/${id}`),

  /* --- Cautelas ------------------------------------------------------- */
  cautelas: (p: { status?: string; q?: string; pessoa?: string } = {}) =>
    get<{ total: number; cautelas: Cautela[] }>(`/cautelas${query(p)}`),
  cautela: (id: string) => get<Cautela>(`/cautelas/${id}`),
  proximoNumeroCautela: () => get<{ numero: number; ano: number }>('/cautelas/next-number'),
  criarCautela: (dados: Record<string, unknown>) => post<Cautela>('/cautelas', dados),
  editarCautela: (id: string, dados: Record<string, unknown>) =>
    patch<Cautela>(`/cautelas/${id}`, dados),
  adicionarItensCautela: (id: string, itens: string[]) =>
    post<Cautela>(`/cautelas/${id}/items`, { itens }),
  devolverCautela: (id: string, dados: Record<string, unknown>) =>
    post<Cautela>(`/cautelas/${id}/return`, dados),

  /* --- Coleções do usuário ---------------------------------------------- */
  favoritos: () => get<Equipment[]>('/favorites'),
  favoritar: (id: string) => put<void>(`/favorites/${id}`),
  desfavoritar: (id: string) => del<void>(`/favorites/${id}`),
  recentes: () => get<Equipment[]>('/recents'),
  registrarAcesso: (id: string) => post<void>(`/recents/${id}`),
  lixeira: () => get<ItemExcluido[]>('/trash'),
  restaurar: (id: string) => post<void>(`/trash/${id}/restore`),
  excluirDefinitivamente: (id: string) => del<void>(`/trash/${id}`),

  /* --- Histórico ------------------------------------------------------- */
  historico: (p: Record<string, string | number | undefined>) =>
    get<{ total: number; pagina: number; porPagina: number; eventos: EventoHistorico[] }>(
      `/history${query(p)}`,
    ),

  /* --- Cadastros ------------------------------------------------------- */
  locais: () => get<Local[]>('/locations'),
  tiposDeLocal: () => get<string[]>('/locations/types'),
  criarLocal: (dados: Partial<Local>) => post<Local>('/locations', dados),
  atualizarLocal: (id: string, dados: Partial<Local>) => patch<Local>(`/locations/${id}`, dados),
  excluirLocal: (id: string) => del<void>(`/locations/${id}`),
  arquivarLocal: (id: string, arquivado: boolean) =>
    post<{ afetados: number }>(`/locations/${id}/archive`, { arquivado }),
  criarLocaisEmLote: (d: { parentId: string | null; tipo: string; prefixo: string; inicio: number; fim: number }) =>
    post<{ criados: string[]; ignorados: string[] }>('/locations/batch', d),
  locaisRecentes: () => get<string[]>('/locations/recent'),

  categorias: () => get<Categoria[]>('/categories'),
  criarCategoria: (d: Partial<Categoria>) => post<Categoria>('/categories', d),
  atualizarCategoria: (id: string, d: Partial<Categoria>) => patch<Categoria>(`/categories/${id}`, d),
  excluirCategoria: (id: string) => del<void>(`/categories/${id}`),

  setores: () => get<Setor[]>('/sectors'),
  criarSetor: (d: Partial<Setor>) => post<Setor>('/sectors', d),
  atualizarSetor: (id: string, d: Partial<Setor>) => patch<Setor>(`/sectors/${id}`, d),
  excluirSetor: (id: string) => del<{ desativado?: boolean } | void>(`/sectors/${id}`),

  motivos: () => get<Motivo[]>('/reasons'),
  criarMotivo: (d: Partial<Motivo>) => post<Motivo>('/reasons', d),
  atualizarMotivo: (id: string, d: Partial<Motivo>) => patch<Motivo>(`/reasons/${id}`, d),
  excluirMotivo: (id: string) => del<{ desativado?: boolean } | void>(`/reasons/${id}`),

  pessoas: (q?: string) => get<Pessoa[]>(`/people${query({ q })}`),
  pessoa: (id: string) =>
    get<
      Pessoa & {
        usuario?: { id: string; email: string } | null;
        itens: Equipment[];
        cautelas: CautelaResumo[];
        historico: (EventoHistorico & { equipamento: { id: string; nome: string; pr: string } })[];
      }
    >(`/people/${id}`),
  criarPessoa: (d: Partial<Pessoa>) => post<Pessoa>('/people', d),
  atualizarPessoa: (id: string, d: Partial<Pessoa>) => patch<Pessoa>(`/people/${id}`, d),
  excluirPessoa: (id: string) => del<{ desativado?: boolean } | void>(`/people/${id}`),

  usuarios: () => get<Usuario[]>('/users'),
  criarUsuario: (d: Record<string, unknown>) => post<Usuario>('/users', d),
  atualizarUsuario: (id: string, d: Record<string, unknown>) => patch<Usuario>(`/users/${id}`, d),
  redefinirSenha: (id: string, senha: string) => post<void>(`/users/${id}/password`, { senha }),

  settings: () => get<Settings>('/settings'),
  salvarSettings: (d: Partial<Settings>) => patch<Settings>('/settings', d),
  auditoria: (pagina = 1) =>
    get<{ total: number; pagina: number; registros: RegistroAuditoria[] }>(
      `/settings/audit?pagina=${pagina}`,
    ),

  /* --- Upload ---------------------------------------------------------- */
  enviarFoto: (arquivo: File) => {
    const corpo = new FormData();
    corpo.append('foto', arquivo);
    return requisitar<{ url: string }>('/uploads/photo', { method: 'POST', body: corpo });
  },
};
