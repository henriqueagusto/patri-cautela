import { X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from './ui';

/** Abaixo de 768px o modal vira bottom sheet (§9.9). */
export function useEhMobile(): boolean {
  const [ehMobile, setEhMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768,
  );

  useEffect(() => {
    const consulta = window.matchMedia('(max-width: 767px)');
    const aoMudar = (evento: MediaQueryListEvent) => setEhMobile(evento.matches);
    consulta.addEventListener('change', aoMudar);
    setEhMobile(consulta.matches);
    return () => consulta.removeEventListener('change', aoMudar);
  }, []);

  return ehMobile;
}

interface OverlayProps {
  aberto: boolean;
  onFechar: () => void;
  titulo: string;
  children: ReactNode;
  rodape?: ReactNode;
  /** Largura máxima em desktop. Padrão 520px conforme §9.9. */
  largo?: boolean;
}

/**
 * Modal (desktop) / bottom sheet (mobile).
 * Fecha com Esc e clique fora; o foco fica preso dentro enquanto aberto.
 */
export function Overlay({
  aberto,
  onFechar,
  titulo,
  children,
  rodape,
  largo = false,
}: OverlayProps) {
  const painel = useRef<HTMLDivElement>(null);
  const origem = useRef<HTMLElement | null>(null);

  // onFechar costuma ser uma arrow inline no chamador, ou seja, muda de
  // identidade a cada render. Guardar em ref mantém o efeito abaixo preso
  // apenas a `aberto` — sem isso ele rodava a cada tecla digitada e devolvia
  // o foco para o primeiro elemento do painel (o botão de fechar).
  const fechar = useRef(onFechar);
  useEffect(() => {
    fechar.current = onFechar;
  });

  useEffect(() => {
    if (!aberto) return;

    origem.current = document.activeElement as HTMLElement;
    document.body.style.overflow = 'hidden';

    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        fechar.current();
        return;
      }
      if (evento.key !== 'Tab' || !painel.current) return;

      const focaveis = painel.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focaveis.length === 0) return;

      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];

      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    };

    document.addEventListener('keydown', aoTeclar);

    // Foco inicial no primeiro campo de verdade; só cai em botão se não houver
    // nenhum. Nunca no botão de fechar.
    window.setTimeout(() => {
      const corpo = painel.current?.querySelector('.overlay__body');
      const alvo =
        corpo?.querySelector<HTMLElement>('input:not([type="hidden"]), select, textarea') ??
        corpo?.querySelector<HTMLElement>('button');
      alvo?.focus();
    }, 0);

    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = '';
      origem.current?.focus();
    };
  }, [aberto]);

  if (!aberto) return null;

  return (
    <div
      className="overlay"
      onMouseDown={(evento) => {
        // Só fecha quando o clique começa no fundo — arrastar a seleção de um
        // texto para fora do painel não deve fechar o formulário.
        if (evento.target === evento.currentTarget) onFechar();
      }}
    >
      <div
        ref={painel}
        className={`overlay__panel${largo ? ' overlay__panel--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onMouseDown={(evento) => evento.stopPropagation()}
      >
        <div className="overlay__grip" aria-hidden="true" />
        <header className="overlay__header">
          <h2 className="title-section">{titulo}</h2>
          <button
            type="button"
            className="icon-btn"
            onClick={onFechar}
            aria-label="Fechar"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </header>
        <div className="overlay__body">{children}</div>
        {rodape && <footer className="overlay__footer">{rodape}</footer>}
      </div>
    </div>
  );
}

interface ConfirmProps {
  aberto: boolean;
  titulo: string;
  descricao: string;
  rotuloConfirmar: string;
  perigo?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

/** Confirmação para ações destrutivas ou irreversíveis (§10.10). */
export function ConfirmDialog({
  aberto,
  titulo,
  descricao,
  rotuloConfirmar,
  perigo = false,
  onConfirmar,
  onCancelar,
}: ConfirmProps) {
  return (
    <Overlay
      aberto={aberto}
      onFechar={onCancelar}
      titulo={titulo}
      rodape={
        <>
          <Button variant="ghost" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button variant={perigo ? 'danger' : 'primary'} onClick={onConfirmar}>
            {rotuloConfirmar}
          </Button>
        </>
      }
    >
      <p className="text-secondary">{descricao}</p>
    </Overlay>
  );
}
