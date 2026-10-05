import { MapPin, UserRound } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { StatusBadges } from './StatusBadges';
import { FavoriteButton, Highlight, ImagemArquivo } from './ui';
import { caminhoCurto, formatarPr, prazoRelativo } from '../lib/format';
import { IconeCategoria } from '../lib/icons';
import { useAppState } from '../state/AppState';
import type { Equipment } from '../types/equipment';

interface Props {
  item: Equipment;
  termo?: string;
  destacado?: boolean;
}

/** A cor da categoria entra como variável CSS — é dado, não valor de design. */
const corCategoria = (item: Equipment) => ({ '--cat': item.categoria.cor }) as CSSProperties;

/** Imagem do equipamento ou, na falta dela, o ícone sobre a cor da categoria. */
export function FotoEquipamento({
  item,
  tamanhoIcone = 56,
  className = '',
}: {
  item: Equipment;
  tamanhoIcone?: number;
  className?: string;
}) {
  return (
    <div className={`photo ${className}`} style={corCategoria(item)}>
      <ImagemArquivo
        caminho={item.foto}
        alt={`${item.nome} — ${formatarPr(item.pr)}`}
        loading="lazy"
        alternativa={<IconeCategoria nome={item.categoria.icone} size={tamanhoIcone} className="photo__icon" />}
      />
    </div>
  );
}

/** Linha de apoio do card: com quem está (se fora) ou onde fica. */
function linhaDeApoio(item: Equipment) {
  if (item.saida?.responsavel) {
    const prazo = item.saida.retornoPrevisto
      ? ` · volta ${prazoRelativo(item.saida.retornoPrevisto)}`
      : '';
    return { Icone: UserRound, texto: `${item.saida.responsavel.nome}${prazo}` };
  }
  return { Icone: MapPin, texto: caminhoCurto(item.local.caminho) };
}

/** Card da direção D: a foto é o card, a informação vem sobreposta. */
export function EquipmentCard({ item, termo = '', destacado = false }: Props) {
  const { ehFavorito, alternarFavorito } = useAppState();
  const apoio = linhaDeApoio(item);

  return (
    <Link
      to={`/equipamento/${item.id}`}
      className={`card-d${destacado ? ' card-d--match' : ''}`}
    >
      <FotoEquipamento item={item} />

      <span className="card-d__top">
        <span className="card-d__badges">
          <StatusBadges item={item} compacto sobreFoto />
        </span>
        <span className="card-d__fav">
          <FavoriteButton
            ativo={ehFavorito(item.id)}
            onToggle={() => void alternarFavorito(item.id)}
            nome={item.nome}
          />
        </span>
      </span>

      <span className="card-d__info">
        <span className="card-d__name clamp-2">
          <Highlight texto={item.nome} termo={termo} />
        </span>
        <span className="card-d__meta">
          <span className="tabular">
            <Highlight texto={formatarPr(item.pr)} termo={termo} />
          </span>
          <span className="card-d__dot" aria-hidden="true">·</span>
          <apoio.Icone size={13} strokeWidth={1.5} aria-hidden="true" />
          <span className="truncate">
            <Highlight texto={apoio.texto} termo={termo} />
          </span>
        </span>
      </span>
    </Link>
  );
}

/** Linha para o modo lista e para listas densas (pessoa, fora da sala). */
export function EquipmentRow({ item, termo = '' }: Props) {
  const { ehFavorito, alternarFavorito } = useAppState();
  const apoio = linhaDeApoio(item);

  return (
    <Link to={`/equipamento/${item.id}`} className="row-d">
      <FotoEquipamento item={item} tamanhoIcone={22} className="row-d__thumb" />
      <span className="row-d__main">
        <span className="row-d__name truncate">
          <Highlight texto={item.nome} termo={termo} />
        </span>
        <span className="row-d__sub truncate">
          <span className="tabular">
            <Highlight texto={formatarPr(item.pr)} termo={termo} />
          </span>
          {' · '}
          {item.categoria.nome}
        </span>
      </span>
      <span className="row-d__where truncate">
        <apoio.Icone size={14} strokeWidth={1.5} aria-hidden="true" />
        <Highlight texto={apoio.texto} termo={termo} />
      </span>
      <span className="row-d__status">
        <StatusBadges item={item} compacto />
      </span>
      <FavoriteButton
        ativo={ehFavorito(item.id)}
        onToggle={() => void alternarFavorito(item.id)}
        nome={item.nome}
      />
    </Link>
  );
}
