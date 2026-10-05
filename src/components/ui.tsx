import { Loader2, Star } from 'lucide-react';
import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { Tone } from '../lib/status';
import { iniciais, normalizar } from '../lib/format';
import { urlArquivo } from '../lib/api';

/* --- Botão (§9.1) -------------------------------------------------------- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  block?: boolean;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  block = false,
  children,
  className = '',
  disabled,
  ...rest
}: ButtonProps) {
  const classes = [
    'btn',
    `btn--${variant}`,
    size !== 'md' && `btn--${size}`,
    block && 'btn--block',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} disabled={disabled || loading} {...rest}>
      {loading ? <Loader2 size={16} className="btn__spinner" /> : icon}
      {children}
    </button>
  );
}

/* --- Badge de status (§9.3) ---------------------------------------------- */

interface BadgeProps {
  tone: Tone;
  children: ReactNode;
  size?: 'md' | 'lg';
  sobreFoto?: boolean;
}

export function Badge({ tone, children, size = 'md', sobreFoto = false }: BadgeProps) {
  return (
    <span
      className={`badge badge--${tone}${size === 'lg' ? ' badge--lg' : ''}${
        sobreFoto ? ' badge--photo' : ''
      }`}
    >
      <span className="badge__dot" aria-hidden="true" />
      {children}
    </span>
  );
}

/* --- Favorito (§10.6) ---------------------------------------------------- */

interface FavoriteButtonProps {
  ativo: boolean;
  onToggle: () => void;
  nome: string;
}

export function FavoriteButton({ ativo, onToggle, nome }: FavoriteButtonProps) {
  const [pulsando, setPulsando] = useState(false);

  return (
    <button
      type="button"
      className={`favorite${ativo ? ' favorite--on' : ''}${pulsando ? ' favorite--pulse' : ''}`}
      aria-pressed={ativo}
      aria-label={
        ativo ? `Remover ${nome} dos favoritos` : `Adicionar ${nome} aos favoritos`
      }
      onClick={(evento) => {
        evento.preventDefault();
        evento.stopPropagation();
        onToggle();
        setPulsando(true);
        window.setTimeout(() => setPulsando(false), 360);
      }}
    >
      <Star size={18} strokeWidth={1.5} fill={ativo ? 'currentColor' : 'none'} />
    </button>
  );
}

/* --- Empty state (§9.11) ------------------------------------------------- */

interface EmptyStateProps {
  icon: ReactNode;
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
}

export function EmptyState({ icon, titulo, descricao, acao }: EmptyStateProps) {
  return (
    <div className="empty">
      <span className="empty__icon">{icon}</span>
      <p className="empty__title">{titulo}</p>
      {descricao && <p>{descricao}</p>}
      {acao && <span className="empty__action">{acao}</span>}
    </div>
  );
}

/* --- Skeleton (§9.12) ---------------------------------------------------- */

export function Skeleton({ width, height }: { width?: string; height: string }) {
  return <div className="skeleton" style={{ width: width ?? '100%', height }} />;
}

/** Reproduz a estrutura real do card D: quadrado com faixa de informação. */
export function SkeletonCard() {
  return (
    <div className="skeleton-d">
      <div className="skeleton skeleton-d__photo" />
      <div className="skeleton-d__info">
        <Skeleton width="70%" height="16px" />
        <Skeleton width="45%" height="12px" />
      </div>
    </div>
  );
}

/* --- Destaque de correspondência (§10.2) --------------------------------- */

/**
 * Envolve em <mark> os trechos que correspondem aos tokens da busca.
 * Compara sobre o texto normalizado mas recorta do original, para não
 * perder acentuação na exibição.
 */
export function Highlight({ texto, termo }: { texto: string; termo: string }) {
  const tokens = normalizar(termo).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return <>{texto}</>;

  const alvo = normalizar(texto);
  const marcado = new Array<boolean>(texto.length).fill(false);

  for (const token of tokens) {
    let desde = 0;
    let indice = alvo.indexOf(token, desde);
    while (indice !== -1) {
      for (let i = indice; i < indice + token.length && i < marcado.length; i += 1) {
        marcado[i] = true;
      }
      desde = indice + token.length;
      indice = alvo.indexOf(token, desde);
    }
  }

  const partes: { texto: string; destaque: boolean }[] = [];
  let atual = '';
  let destaqueAtual = marcado[0] ?? false;

  for (let i = 0; i < texto.length; i += 1) {
    if (marcado[i] === destaqueAtual) {
      atual += texto[i];
    } else {
      partes.push({ texto: atual, destaque: destaqueAtual });
      atual = texto[i];
      destaqueAtual = marcado[i];
    }
  }
  if (atual) partes.push({ texto: atual, destaque: destaqueAtual });

  return (
    <>
      {partes.map((parte, i) =>
        parte.destaque ? (
          <mark key={i} className="match">
            {parte.texto}
          </mark>
        ) : (
          <span key={i}>{parte.texto}</span>
        ),
      )}
    </>
  );
}

/* --- Imagem enviada ------------------------------------------------------ */

/**
 * `<img>` de um arquivo enviado (foto, logo). Se o arquivo não carregar —
 * caminho antigo, disco do servidor apagado —, mostra `alternativa` em vez
 * de imagem quebrada. Nada é alterado no banco.
 */
export function ImagemArquivo({
  caminho,
  alternativa,
  alt = '',
  className,
  loading,
}: {
  caminho?: string | null;
  alternativa: ReactNode;
  alt?: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}) {
  const [falhou, setFalhou] = useState(false);
  useEffect(() => setFalhou(false), [caminho]);

  if (!caminho || falhou) return <>{alternativa}</>;
  return (
    <img
      src={urlArquivo(caminho)}
      alt={alt}
      className={className}
      loading={loading}
      onError={() => setFalhou(true)}
    />
  );
}

/* --- Avatar ------------------------------------------------------------- */

export function Avatar({
  nome,
  foto,
  size = 36,
}: {
  nome: string;
  foto?: string | null;
  size?: number;
}) {
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      aria-hidden="true"
    >
      <ImagemArquivo caminho={foto} alternativa={iniciais(nome)} />
    </span>
  );
}
