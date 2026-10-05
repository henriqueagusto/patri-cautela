import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  ChevronRight,
  History,
  MoveRight,
  Pencil,
  Phone,
  Trash2,
  Undo2,
} from 'lucide-react';
import { useEffect, useState, type CSSProperties } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FotoEquipamento } from '../components/EquipmentCard';
import { HistoryEvent } from '../components/HistoryEvent';
import { MoveFlow } from '../components/MoveFlow';
import { ConfirmDialog } from '../components/Overlay';
import { StatusBadges } from '../components/StatusBadges';
import { useToast } from '../components/Toast';
import { Avatar, Button, EmptyState, FavoriteButton, Skeleton } from '../components/ui';
import { api, mensagemDeErro } from '../lib/api';
import { dataCurta, dataHoraRelativa, formatarPr, moeda, numeroCautela, prazoRelativo } from '../lib/format';
import { IconeCategoria } from '../lib/icons';
import { ESTADO_FISICO_LABEL, derivarCondicoes } from '../lib/status';
import { useAsync } from '../lib/useAsync';
import { useAppState } from '../state/AppState';
import { useAuth } from '../state/AuthState';
import type { Equipment } from '../types/equipment';

export function EquipmentDetail() {
  const { id = '' } = useParams();
  const navegar = useNavigate();
  const toast = useToast();
  const { ehAdmin } = useAuth();
  const { ehFavorito, alternarFavorito, registrarAcesso, invalidar, versao } = useAppState();

  const consulta = useAsync(() => api.obter(id), [id, versao]);
  const item = consulta.dados;

  const [movendo, setMovendo] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  /** Recentes é registrado ao abrir a ficha, não ao aparecer na busca. */
  useEffect(() => {
    if (id) void registrarAcesso(id);
  }, [id, registrarAcesso]);

  if (consulta.carregando && !item) {
    return (
      <div className="container">
        <div className="detail-d">
          <Skeleton height="320px" />
          <div className="stack" style={{ gap: 'var(--space-3)' }}>
            <Skeleton width="30%" height="22px" />
            <Skeleton width="70%" height="36px" />
            <Skeleton width="40%" height="16px" />
          </div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="container">
        <EmptyState
          icon={<History size={24} strokeWidth={1.5} />}
          titulo={consulta.erro ?? 'Não foi possível carregar este equipamento.'}
          descricao="Ele pode ter sido removido ou o endereço está incorreto."
          acao={<Button onClick={() => navegar('/equipamentos')}>Ver equipamentos</Button>}
        />
      </div>
    );
  }

  const emSaida = item.situacao === 'fora-da-sala' || item.situacao === 'manutencao';
  const baixado = item.situacao === 'baixado';

  async function excluir() {
    try {
      await api.excluir(item!.id);
      setExcluindo(false);
      invalidar();
      toast.sucesso(
        'Item enviado para a lixeira',
        ehAdmin
          ? { rotulo: 'Desfazer', executar: () => void api.restaurar(item!.id).then(invalidar) }
          : undefined,
      );
      navegar('/equipamentos');
    } catch (e) {
      setExcluindo(false);
      toast.erro(mensagemDeErro(e));
    }
  }

  const cautela = item.saida?.cautela;
  const acaoPrincipal = emSaida && cautela ? (
    <Button variant="primary" size="lg" icon={<Undo2 size={18} strokeWidth={1.5} />} onClick={() => navegar(`/cautelas/${cautela.id}`)}>
      Ver cautela nº {numeroCautela(cautela)}
    </Button>
  ) : (
    <Button variant="primary" size="lg" disabled={baixado} icon={<MoveRight size={18} strokeWidth={1.5} />} onClick={() => setMovendo(true)}>
      Mover item
    </Button>
  );

  return (
    <div className="container">
      <button type="button" className="detail__back" onClick={() => navegar(-1)}>
        <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" /> Voltar
      </button>

      <div className="detail-d">
        <FotoEquipamento item={item} tamanhoIcone={96} className="detail-d__photo" />

        <div className="detail-d__head">
          <span className="detail-d__category" style={{ '--cat': item.categoria.cor } as CSSProperties}>
            <IconeCategoria nome={item.categoria.icone} size={14} /> {item.categoria.nome}
          </span>

          <div className="detail__title-row">
            <div className="stack" style={{ gap: 'var(--space-1)', minWidth: 0 }}>
              <h1 className="detail__name">{item.nome}</h1>
              <span className="detail__pr">
                {formatarPr(item.pr)}
                {item.numeroSerie && ` · Série ${item.numeroSerie}`}
              </span>
            </div>
            <FavoriteButton ativo={ehFavorito(item.id)} onToggle={() => void alternarFavorito(item.id)} nome={item.nome} />
          </div>

          <div className="detail__badges">
            <StatusBadges item={item} size="lg" />
          </div>

          {!item.importadoDaBaseOficial && (
            <p className="detail__note">Cadastrado manualmente. Ainda não consta na base patrimonial oficial.</p>
          )}

          <div className="detail__actions">
            {acaoPrincipal}
            <Link to={`/equipamentos/${item.id}/editar`}>
              <Button size="lg" icon={<Pencil size={16} strokeWidth={1.5} />}>Editar</Button>
            </Link>
            <Button size="lg" variant="ghost" icon={<Trash2 size={16} strokeWidth={1.5} />} onClick={() => setExcluindo(true)}>
              Excluir
            </Button>
          </div>

          {/* Onde fica — resposta à primeira pergunta do produto. */}
          <div className="stack" style={{ gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
            <span className="label">{emSaida ? 'Local de guarda (para onde volta)' : 'Onde está'}</span>
            <nav className="trail" aria-label="Localização">
              {item.local.caminho.map((no, i) => {
                const ultimo = i === item.local.caminho.length - 1;
                return (
                  <span key={no.id} className="row" style={{ gap: 'var(--space-2)' }}>
                    <Link to={`/locais?no=${no.id}`} className={`trail__level${ultimo ? ' trail__level--last' : ''}`} title={no.tipo}>
                      {no.nome}
                    </Link>
                    {!ultimo && <ChevronRight size={16} strokeWidth={1.5} className="trail__sep" aria-hidden="true" />}
                  </span>
                );
              })}
            </nav>
            <Link to={`/equipamentos?local=${item.local.id}`} className="row text-sm" style={{ gap: 'var(--space-1)' }}>
              Ver equipamentos neste local <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>

      {emSaida && item.saida && (
        <section className="section">
          <div className="section__head">
            <h2 className="title-section">{item.situacao === 'manutencao' ? 'Em manutenção' : 'Com quem está'}</h2>
            {cautela && (
              <Link to={`/cautelas/${cautela.id}`} className="text-sm">
                Cautela nº {numeroCautela(cautela)} — devolver ou editar
              </Link>
            )}
          </div>
          <Responsavel item={item} />
        </section>
      )}

      <section className="section">
        <div className="facts">
          <div className="fact">
            <span className="label">Estado físico</span>
            <span className="fact__value">{ESTADO_FISICO_LABEL[item.estadoFisico]}</span>
          </div>
          <div className="fact">
            <span className="label">Categoria</span>
            <span className="fact__value">{item.categoria.nome}</span>
          </div>
          <div className="fact">
            <span className="label">Última movimentação</span>
            <span className="fact__value">{item.historico[0] ? dataHoraRelativa(item.historico[0].data) : '—'}</span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="title-section">Informações</h2>
        </div>
        <dl className="specs">
          <Spec rotulo="PR" valor={item.pr} tabular />
          <Spec rotulo="Número de série" valor={item.semNumeroSerie ? 'Sem número de série' : item.numeroSerie ?? '—'} tabular />
          <Spec rotulo="Material" valor={item.material} />
          <Spec rotulo="Marca" valor={item.marca} />
          <Spec rotulo="Modelo" valor={item.modelo} />
          <Spec rotulo="Fabricante" valor={item.fabricante} />
          {item.aquisicao && <Spec rotulo="Aquisição" valor={dataCurta(item.aquisicao)} tabular />}
          {item.valorAquisicao !== undefined && <Spec rotulo="Valor de aquisição" valor={moeda(item.valorAquisicao)} tabular />}
          {item.observacoes && <Spec rotulo="Observações" valor={item.observacoes} />}
        </dl>
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="title-section">Histórico</h2>
          <Link to={`/historico?equipamento=${item.id}`} className="text-sm">Abrir no histórico</Link>
        </div>
        <div className="stack" style={{ gap: 'var(--space-2)' }}>
          {item.historico.map((ev) => <HistoryEvent key={ev.id} evento={ev} />)}
        </div>
      </section>

      <div className="detail__spacer" aria-hidden="true" />
      <div className="detail__actionbar">{acaoPrincipal}</div>

      <MoveFlow item={item} aberto={movendo} onFechar={() => setMovendo(false)} />
      <ConfirmDialog
        aberto={excluindo}
        titulo="Enviar para a lixeira"
        descricao={`${item.nome} sai da listagem, mas continua recuperável na lixeira${ehAdmin ? '.' : ' — a restauração é feita pelo administrador.'}`}
        rotuloConfirmar="Enviar para a lixeira"
        onCancelar={() => setExcluindo(false)}
        onConfirmar={() => void excluir()}
      />
    </div>
  );
}

function Responsavel({ item }: { item: Equipment }) {
  const s = item.saida!;
  const condicoes = derivarCondicoes(item);
  const classe = condicoes.includes('atrasado') ? ' holder--late' : condicoes.includes('retorno-proximo') ? ' holder--soon' : '';

  return (
    <div className={`holder${classe}`}>
      {s.responsavel ? (
        <Link to={`/pessoas/${s.responsavel.id}`} className="holder__person">
          <Avatar nome={s.responsavel.nome} foto={s.responsavel.foto} size={48} />
          <span className="stack" style={{ gap: 'var(--space-0-5)' }}>
            <span className="fact__value">{s.responsavel.nome}</span>
            <span className="entity__sub">{s.responsavel.setor ?? 'Sem setor'}</span>
          </span>
          {s.responsavel.telefone && (
            <span className="pill" style={{ marginLeft: 'auto' }}>
              <Phone size={12} strokeWidth={1.5} style={{ marginRight: 4 }} /> {s.responsavel.telefone}
            </span>
          )}
        </Link>
      ) : (
        <span className="text-secondary">Sem responsável registrado</span>
      )}
      <div className="holder__grid">
        <div className="fact">
          <span className="label">Para onde foi</span>
          <span className="fact__value">{[s.destino?.nome, s.destinoDetalhe].filter(Boolean).join(' · ') || '—'}</span>
        </div>
        <div className="fact">
          <span className="label">Saiu</span>
          <span className="fact__value">{dataHoraRelativa(s.saidaEm)}</span>
        </div>
        <div className="fact">
          <span className="label">Volta</span>
          <span className="fact__value row" style={{ gap: 'var(--space-1-5)' }}>
            <CalendarClock size={16} strokeWidth={1.5} />
            {s.retornoPrevisto ? `${dataCurta(s.retornoPrevisto)} (${prazoRelativo(s.retornoPrevisto)})` : 'Sem prazo'}
          </span>
        </div>
        {s.motivo && (
          <div className="fact">
            <span className="label">Motivo</span>
            <span className="fact__value">{s.motivo.nome}</span>
          </div>
        )}
      </div>
      {s.observacao && <p className="event__note">{s.observacao}</p>}
    </div>
  );
}

function Spec({ rotulo, valor, tabular = false }: { rotulo: string; valor: string; tabular?: boolean }) {
  return (
    <div className="spec">
      <dt className="label">{rotulo}</dt>
      <dd className={`spec__value${tabular ? ' tabular' : ''}`}>{valor || '—'}</dd>
    </div>
  );
}
