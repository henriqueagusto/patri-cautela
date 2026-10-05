import { ArrowLeft, CheckCircle2, PackagePlus, Pencil, Printer, Undo2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  CamposCautela, ItemEscolhido, ItemPicker, dadosIniciais, payloadCautela, type DadosCautela,
} from '../components/CautelaForm';
import { SelectField, TextAreaField, TextField } from '../components/Form';
import { Overlay } from '../components/Overlay';
import { useToast } from '../components/Toast';
import { Avatar, Button, EmptyState, Skeleton } from '../components/ui';
import { api, mensagemDeErro } from '../lib/api';
import { dataCurta, dataHoraRelativa, numeroCautela, prazoRelativo } from '../lib/format';
import { ESTADO_FISICO_LABEL } from '../lib/status';
import { useAsync } from '../lib/useAsync';
import { useAppState } from '../state/AppState';
import { useAuth } from '../state/AuthState';
import { useCatalog } from '../state/CatalogState';
import type { Cautela, EstadoFisico } from '../types/equipment';
import { prazoCautela } from './Cautelas';

export function CautelaDetalhe() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const navegar = useNavigate();
  const toast = useToast();
  const { versao, invalidar } = useAppState();
  const { settings } = useCatalog();

  const consulta = useAsync(() => api.cautela(id), [id, versao]);
  const c = consulta.dados;
  const recemEmitida = params.get('nova') === '1';

  const [devolvendo, setDevolvendo] = useState(false);
  const [editando, setEditando] = useState(false);
  const [adicionando, setAdicionando] = useState(false);

  if (consulta.carregando && !c) {
    return <div className="container"><Skeleton height="240px" /></div>;
  }
  if (!c) {
    return (
      <div className="container">
        <EmptyState icon={<Printer size={24} strokeWidth={1.5} />} titulo={consulta.erro ?? 'Cautela não encontrada.'}
          acao={<Button onClick={() => navegar('/cautelas')}>Ver cautelas</Button>} />
      </div>
    );
  }

  const aberta = c.status === 'aberta';
  const prazo = prazoCautela(c, settings?.horasRetornoProximo ?? 48);

  async function adicionar(ids: string[]) {
    try {
      await api.adicionarItensCautela(c!.id, ids);
      invalidar();
      toast.sucesso('Itens incluídos na cautela');
    } catch (e) {
      toast.erro(mensagemDeErro(e));
    }
  }

  return (
    <div className="container">
      <button type="button" className="detail__back" onClick={() => navegar('/cautelas')}>
        <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" /> Cautelas
      </button>

      {recemEmitida && (
        <div className="notice">
          <CheckCircle2 size={20} strokeWidth={1.5} aria-hidden="true" />
          <span className="notice__text">
            <strong>Cautela nº {numeroCautela(c)} emitida.</strong> Imprima a folha para colher as assinaturas.
          </span>
          <Link to={`/cautelas/${c.id}/imprimir`}><Button variant="primary" icon={<Printer size={16} strokeWidth={1.5} />}>Imprimir</Button></Link>
          <button type="button" className="icon-btn" aria-label="Dispensar" onClick={() => setParams({}, { replace: true })}>×</button>
        </div>
      )}

      <header className="page-header">
        <div className="page-header__text">
          <span className="tipo-tag">Cautela de equipamentos</span>
          <h1 className="title-page tabular">Cautela <span className="marker">nº {numeroCautela(c)}</span></h1>
          <p className="text-secondary text-sm">
            Emitida {dataHoraRelativa(c.criadaEm).toLowerCase()}{c.criadaPor && ` por ${c.criadaPor}`}
          </p>
        </div>
        <div className="row" style={{ gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <Link to={`/cautelas/${c.id}/imprimir`}>
            <Button icon={<Printer size={16} strokeWidth={1.5} />}>Imprimir</Button>
          </Link>
          {aberta && <Button icon={<Pencil size={16} strokeWidth={1.5} />} onClick={() => setEditando(true)}>Editar</Button>}
          {aberta && (
            <Button variant="primary" icon={<Undo2 size={16} strokeWidth={1.5} />} onClick={() => setDevolvendo(true)}>
              Registrar devolução
            </Button>
          )}
        </div>
      </header>

      <div className="cautela-layout">
        <section className={`holder${prazo === 'atrasada' ? ' holder--late' : prazo === 'proxima' ? ' holder--soon' : ''}`}>
          <Link to={`/pessoas/${c.responsavel.id}`} className="holder__person">
            <Avatar nome={c.responsavel.nome} foto={c.responsavel.foto} size={48} />
            <span className="stack" style={{ gap: 'var(--space-0-5)' }}>
              <span className="fact__value">{c.responsavel.nome}</span>
              <span className="entity__sub">
                {[c.responsavel.matricula && `PR ${c.responsavel.matricula}`, c.responsavel.ramal && `Ramal ${c.responsavel.ramal}`, c.responsavel.telefone].filter(Boolean).join(' · ') || 'Sem dados de contato'}
              </span>
            </span>
          </Link>
          <div className="holder__grid">
            <Fato rotulo="Local de uso" valor={[c.destino?.nome, c.destinoDetalhe].filter(Boolean).join(' · ') || '—'} />
            <Fato rotulo="Motivo" valor={c.motivo?.nome ?? '—'} />
            <Fato rotulo="Transporte" valor={c.tecnicoTransporte ?? '—'} />
            <Fato
              rotulo={aberta ? 'Devolução prevista' : 'Encerrada'}
              valor={aberta
                ? c.retornoPrevisto ? `${dataCurta(c.retornoPrevisto)} (${prazoRelativo(c.retornoPrevisto)})` : 'Sem prazo'
                : dataCurta(c.fechadaEm!)}
            />
          </div>
          {c.observacao && <p className="event__note">{c.observacao}</p>}
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2 className="title-section">
              Equipamentos <span className="text-tertiary tabular">· {c.total}</span>
            </h2>
            {aberta && (
              <Button size="sm" icon={<PackagePlus size={14} strokeWidth={1.5} />} onClick={() => setAdicionando(true)}>
                Incluir item
              </Button>
            )}
          </div>
          <div className="stack" style={{ gap: 'var(--space-2)' }}>
            {c.itens.map((i) => (
              <div key={i.id} className="stack" style={{ gap: 'var(--space-1)' }}>
                <Link to={`/equipamento/${i.equipmentId}`}><ItemEscolhido item={i.equipamento} /></Link>
                <span className={`text-sm ${i.devolvidoEm ? 'text-secondary' : ''}`} style={{ paddingLeft: 'var(--space-3)' }}>
                  {i.devolvidoEm
                    ? `Devolvido ${dataCurta(i.devolvidoEm)} · recebido por ${i.recebidoPor}${i.estadoDevolucao ? ` · voltou ${ESTADO_FISICO_LABEL[i.estadoDevolucao].toLowerCase()}` : ''}`
                    : 'Aguardando devolução'}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <DevolucaoDialog cautela={c} aberto={devolvendo} onFechar={() => setDevolvendo(false)} />
      <EditarDialog cautela={c} aberto={editando} onFechar={() => setEditando(false)} />
      <ItemPicker
        aberto={adicionando}
        onFechar={() => setAdicionando(false)}
        jaEscolhidos={c.itens.map((i) => i.equipmentId)}
        onConfirmar={(novos) => void adicionar(novos.map((n) => n.id))}
      />
    </div>
  );
}

function Fato({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="fact">
      <span className="label">{rotulo}</span>
      <span className="fact__value">{valor}</span>
    </div>
  );
}

const ESTADOS: EstadoFisico[] = ['otimo', 'bom', 'regular', 'ruim', 'danificado'];

/**
 * Devolução da cautela inteira: todos os itens voltam juntos, na mesma data.
 * Para cada um dá para registrar o estado em que voltou.
 */
function DevolucaoDialog({ cautela, aberto, onFechar }: { cautela: Cautela; aberto: boolean; onFechar: () => void }) {
  const { usuario } = useAuth();
  const { invalidar } = useAppState();
  const toast = useToast();
  const itens = cautela.itens.filter((i) => !i.devolvidoEm);

  const [estados, setEstados] = useState<Record<string, EstadoFisico>>({});
  const [recebidoPor, setRecebidoPor] = useState('');
  const [observacao, setObservacao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string>();

  useEffect(() => {
    if (!aberto) return;
    setEstados(Object.fromEntries(itens.map((i) => [i.equipmentId, i.equipamento.estadoFisico])));
    setRecebidoPor(usuario?.nome ?? '');
    setObservacao('');
    setErro(undefined);
  }, [aberto]); // eslint-disable-line react-hooks/exhaustive-deps

  async function confirmar() {
    setEnviando(true);
    try {
      await api.devolverCautela(cautela.id, {
        recebidoPor,
        observacao: observacao || null,
        estados: itens.map((i) => ({
          equipmentId: i.equipmentId,
          estadoFisico: (estados[i.equipmentId] ?? i.equipamento.estadoFisico).toUpperCase(),
        })),
      });
      invalidar();
      toast.sucesso(`Cautela nº ${numeroCautela(cautela)} encerrada`);
      onFechar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Overlay aberto={aberto} onFechar={onFechar} titulo={`Devolução · cautela nº ${numeroCautela(cautela)}`} largo
      rodape={<>
        <Button variant="ghost" onClick={onFechar}>Cancelar</Button>
        <Button variant="primary" loading={enviando} onClick={() => void confirmar()}>
          Devolver tudo e encerrar
        </Button>
      </>}>
      <p className="text-secondary text-sm">
        Os {itens.length} itens voltam juntos, com a data de hoje. Se algum voltou com problema, ajuste o estado dele.
      </p>
      <div className="stack" style={{ gap: 'var(--space-2)' }}>
        {itens.map((i) => (
          <div key={i.id} className="return-row">
            <span className="stack" style={{ gap: 'var(--space-0-5)' }}>
              <span className="entity__title">{i.nome}</span>
              <span className="entity__sub tabular">PR {i.pr}</span>
            </span>
            <SelectField
              label="Como voltou"
              valor={estados[i.equipmentId] ?? i.equipamento.estadoFisico}
              onChange={(v) => setEstados((s) => ({ ...s, [i.equipmentId]: v as EstadoFisico }))}
              opcoes={ESTADOS.map((e) => ({ valor: e, rotulo: ESTADO_FISICO_LABEL[e] }))}
            />
          </div>
        ))}
      </div>
      <TextField label="Quem recebeu" valor={recebidoPor} onChange={setRecebidoPor} ajuda="Nome que assina a devolução no papel." />
      <TextAreaField label="Observação" opcional linhas={2} valor={observacao} onChange={setObservacao} />
      {erro && <p className="field__error">{erro}</p>}
    </Overlay>
  );
}

function EditarDialog({ cautela, aberto, onFechar }: { cautela: Cautela; aberto: boolean; onFechar: () => void }) {
  const { invalidar } = useAppState();
  const toast = useToast();
  const [dados, setDados] = useState<DadosCautela>(dadosIniciais(cautela));
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string>();

  useEffect(() => {
    if (aberto) {
      setDados(dadosIniciais(cautela));
      setErro(undefined);
    }
  }, [aberto, cautela]);

  async function salvar() {
    setEnviando(true);
    try {
      await api.editarCautela(cautela.id, payloadCautela(dados));
      invalidar();
      toast.sucesso('Cautela atualizada');
      onFechar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Overlay aberto={aberto} onFechar={onFechar} titulo={`Editar cautela nº ${numeroCautela(cautela)}`} largo
      rodape={<>
        <Button variant="ghost" onClick={onFechar}>Cancelar</Button>
        <Button variant="primary" loading={enviando} onClick={() => void salvar()}>Salvar alterações</Button>
      </>}>
      <p className="text-secondary text-sm">
        As alterações ficam no histórico. Se já foi impressa, imprima de novo para a pasta.
      </p>
      <CamposCautela dados={dados} alterar={(d) => setDados((s) => ({ ...s, ...d }))} />
      {erro && <p className="field__error">{erro}</p>}
    </Overlay>
  );
}
