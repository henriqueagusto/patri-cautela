import { ArrowRightLeft, ClipboardSignature } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextAreaField } from './Form';
import { Overlay } from './Overlay';
import { LocationPicker } from './Pickers';
import { useToast } from './Toast';
import { Button } from './ui';
import { api, mensagemDeErro } from '../lib/api';
import { caminhoCompleto, formatarPr } from '../lib/format';
import { useAppState } from '../state/AppState';
import { useCatalog } from '../state/CatalogState';
import type { Equipment } from '../types/equipment';

/**
 * "Mover item": ou o equipamento sai (vira uma cautela) ou só muda de lugar
 * dentro do acervo. A saída é feita na tela de cautela, que aceita vários itens.
 */
export function MoveFlow({
  item,
  aberto,
  onFechar,
}: {
  item: Equipment;
  aberto: boolean;
  onFechar: () => void;
}) {
  const navegar = useNavigate();
  const { invalidar } = useAppState();
  const { caminhoDe } = useCatalog();
  const toast = useToast();

  const [etapa, setEtapa] = useState<'escolha' | 'lugar' | 'resumo'>('escolha');
  const [local, setLocal] = useState<string | null>(item.local.id);
  const [observacao, setObservacao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string>();

  useEffect(() => {
    if (!aberto) return;
    setEtapa('escolha');
    setLocal(item.local.id);
    setObservacao('');
    setErro(undefined);
  }, [aberto, item.local.id]);

  function continuar() {
    if (!local || local === item.local.id) {
      setErro('Escolha um local diferente do atual.');
      return;
    }
    setErro(undefined);
    setEtapa('resumo');
  }

  async function confirmar() {
    setEnviando(true);
    try {
      await api.mover(item.id, { locationId: local!, observacao: observacao || undefined });
      invalidar();
      toast.sucesso('Equipamento movido');
      onFechar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Overlay
      aberto={aberto}
      onFechar={onFechar}
      titulo="Mover item"
      rodape={
        etapa === 'escolha' ? undefined : (
          <>
            <Button variant="ghost" onClick={() => setEtapa(etapa === 'resumo' ? 'lugar' : 'escolha')}>
              Voltar
            </Button>
            {etapa === 'lugar' ? (
              <Button variant="primary" onClick={continuar}>Continuar</Button>
            ) : (
              <Button variant="primary" loading={enviando} onClick={() => void confirmar()}>
                Confirmar
              </Button>
            )}
          </>
        )
      }
    >
      {etapa === 'escolha' && (
        <>
          <p className="move__question">O que vai acontecer com o equipamento?</p>
          <div className="opt-list" style={{ maxHeight: 'none' }}>
            <button type="button" className="opt" onClick={() => navegar(`/cautelas/nova?item=${item.id}`)}>
              <ClipboardSignature size={22} strokeWidth={1.5} aria-hidden="true" />
              <span className="opt__body">
                <span className="opt__title">Vai sair — emitir cautela</span>
                <span className="opt__sub">Alguém leva. Dá para incluir outros itens na mesma cautela.</span>
              </span>
            </button>
            <button type="button" className="opt" onClick={() => setEtapa('lugar')}>
              <ArrowRightLeft size={22} strokeWidth={1.5} aria-hidden="true" />
              <span className="opt__body">
                <span className="opt__title">Vai mudar de lugar</span>
                <span className="opt__sub">Continua no acervo, só troca de sala, armário ou prateleira</span>
              </span>
            </button>
          </div>
        </>
      )}

      {etapa === 'lugar' && (
        <>
          <p className="move__question">Para qual local ele vai?</p>
          <LocationPicker
            label="Novo local de guarda"
            valor={local}
            onChange={setLocal}
            ajuda={`Hoje: ${caminhoCompleto(item.local.caminho)}`}
          />
          <TextAreaField label="Observação" opcional linhas={2} valor={observacao} onChange={setObservacao} />
        </>
      )}

      {etapa === 'resumo' && (
        <div className="summary">
          <div className="summary__row"><span className="label">Item</span><span className="summary__value">{item.nome} · {formatarPr(item.pr)}</span></div>
          <div className="summary__row"><span className="label">De</span><span className="summary__value">{caminhoCompleto(item.local.caminho)}</span></div>
          <div className="summary__row"><span className="label">Para</span><span className="summary__value">{caminhoCompleto(caminhoDe(local))}</span></div>
          {observacao && <div className="summary__row"><span className="label">Observação</span><span className="summary__value">{observacao}</span></div>}
        </div>
      )}

      {erro && <p className="field__error">{erro}</p>}
    </Overlay>
  );
}
