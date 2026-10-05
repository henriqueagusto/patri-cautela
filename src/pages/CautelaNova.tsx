import { ClipboardSignature, PackagePlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CamposCautela, ItemEscolhido, ItemPicker, dadosIniciais, payloadCautela, type DadosCautela,
} from '../components/CautelaForm';
import { useToast } from '../components/Toast';
import { Button, EmptyState } from '../components/ui';
import { api, mensagemDeErro } from '../lib/api';
import { numeroCautela } from '../lib/format';
import { useAppState } from '../state/AppState';
import { useCatalog } from '../state/CatalogState';
import type { Equipment } from '../types/equipment';

export function CautelaNova() {
  const [params] = useSearchParams();
  const navegar = useNavigate();
  const toast = useToast();
  const { invalidar } = useAppState();
  const { settings } = useCatalog();

  const [itens, setItens] = useState<Equipment[]>([]);
  const [dados, setDados] = useState<DadosCautela>(dadosIniciais(undefined, settings?.prazoPadraoDias));
  const [escolhendo, setEscolhendo] = useState(false);
  const [numero, setNumero] = useState<{ numero: number; ano: number }>();
  const [tentou, setTentou] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string>();

  useEffect(() => {
    void api.proximoNumeroCautela().then(setNumero).catch(() => undefined);
    const inicial = params.get('item');
    if (inicial) {
      void api.obter(inicial).then((item) => {
        if (item.situacao === 'disponivel') setItens([item]);
      }).catch(() => undefined);
    }
  }, [params]);

  const alterar = (d: Partial<DadosCautela>) => setDados((s) => ({ ...s, ...d }));

  async function emitir() {
    setTentou(true);
    setErro(undefined);
    if (!itens.length) return setErro('Adicione ao menos um equipamento.');
    if (!dados.responsavel) return setErro('Escolha quem vai receber os equipamentos.');

    setEnviando(true);
    try {
      const cautela = await api.criarCautela({ ...payloadCautela(dados), itens: itens.map((i) => i.id) });
      invalidar();
      toast.sucesso(`Cautela nº ${numeroCautela(cautela)} emitida`);
      navegar(`/cautelas/${cautela.id}?nova=1`, { replace: true });
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="container">
      <header className="page-header">
        <div className="page-header__text">
          <span className="tipo-tag">Cautela de equipamentos</span>
          <h1 className="title-page">
            Nova cautela {numero && <span className="marker tabular">nº {numeroCautela(numero)}</span>}
          </h1>
          <p className="text-secondary text-sm">
            Ao emitir, a folha sai preenchida para impressão. As assinaturas são no papel.
          </p>
        </div>
      </header>

      <div className="cautela-layout">
        <section className="panel">
          <div className="panel__head">
            <h2 className="title-section">Equipamentos</h2>
            <Button icon={<PackagePlus size={16} strokeWidth={1.5} />} onClick={() => setEscolhendo(true)}>
              Adicionar
            </Button>
          </div>
          {itens.length === 0 ? (
            <EmptyState
              icon={<PackagePlus size={24} strokeWidth={1.5} />}
              titulo="Nenhum equipamento ainda"
              descricao="Adicione todos os itens que a pessoa vai levar."
              acao={<Button variant="primary" onClick={() => setEscolhendo(true)}>Adicionar equipamentos</Button>}
            />
          ) : (
            <div className="stack" style={{ gap: 'var(--space-2)' }}>
              {itens.map((item) => (
                <ItemEscolhido key={item.id} item={item} onRemover={() => setItens((l) => l.filter((i) => i.id !== item.id))} />
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <h2 className="title-section">Dados da cautela</h2>
          <CamposCautela
            dados={dados}
            alterar={alterar}
            erroResponsavel={tentou && !dados.responsavel ? 'Escolha quem vai receber.' : undefined}
          />
        </section>
      </div>

      <div className="action-dock">
        <div className="action-dock__inner">
          <span className="text-sm text-secondary">
            {itens.length} {itens.length === 1 ? 'item' : 'itens'}
            {dados.responsavel && ` · para ${dados.responsavel.nome}`}
          </span>
          {erro && <span className="field__error">{erro}</span>}
          <div className="row" style={{ gap: 'var(--space-2)', marginLeft: 'auto' }}>
            <Button variant="ghost" onClick={() => navegar(-1)}>Cancelar</Button>
            <Button variant="primary" size="lg" loading={enviando} icon={<ClipboardSignature size={18} strokeWidth={1.5} />} onClick={() => void emitir()}>
              Emitir cautela
            </Button>
          </div>
        </div>
      </div>

      <ItemPicker
        aberto={escolhendo}
        onFechar={() => setEscolhendo(false)}
        jaEscolhidos={itens.map((i) => i.id)}
        onConfirmar={(novos) => setItens((l) => [...l, ...novos])}
      />
    </div>
  );
}
