import { Badge } from './ui';
import {
  CONDICAO_LABEL,
  CONDICAO_TONE,
  SITUACAO_LABEL,
  SITUACAO_TONE,
  condicaoPrincipal,
  derivarCondicoes,
} from '../lib/status';
import type { Equipment } from '../types/equipment';

/**
 * Situação + condições (§4.4). `compacto` mostra só a condição mais severa.
 * `sobreFoto` usa o fundo escuro translúcido, legível sobre qualquer imagem.
 */
export function StatusBadges({
  item,
  compacto = false,
  size = 'md',
  sobreFoto = false,
}: {
  item: Equipment;
  compacto?: boolean;
  size?: 'md' | 'lg';
  sobreFoto?: boolean;
}) {
  const condicoes = derivarCondicoes(item);
  const exibidas = compacto ? [condicaoPrincipal(condicoes)].filter(Boolean) : condicoes;

  return (
    <>
      <Badge tone={SITUACAO_TONE[item.situacao]} size={size} sobreFoto={sobreFoto}>
        {SITUACAO_LABEL[item.situacao]}
      </Badge>
      {exibidas.map((c) => (
        <Badge key={c} tone={CONDICAO_TONE[c!]} sobreFoto={sobreFoto}>
          {CONDICAO_LABEL[c!]}
        </Badge>
      ))}
    </>
  );
}
