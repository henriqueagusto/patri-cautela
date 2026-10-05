import { ArrowLeft, FileWarning, Printer } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, EmptyState, Skeleton } from '../components/ui';
import { api } from '../lib/api';
import { numeroCautela } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { useCatalog } from '../state/CatalogState';
import type { Cautela } from '../types/equipment';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho',
  'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** A folha precisa de pelo menos duas linhas de item, como o modelo em papel. */
const LINHAS_MINIMAS = 2;

/** Brasão da República, recortado do formulário oficial (arquivo em public/). */
const BRASAO = '/brasao.png';

/**
 * Reprodução da "Cautela de Equipamentos" oficial para imprimir e assinar.
 * As assinaturas ficam em branco de propósito: são colhidas no papel.
 */
export function CautelaImprimir() {
  const { id = '' } = useParams();
  const navegar = useNavigate();
  const { settings, recarregar: recarregarCatalogo } = useCatalog();
  const consulta = useAsync(() => api.cautela(id), [id]);
  const c = consulta.dados;

  // Falha ao buscar a cautela: diz o que houve e deixa tentar de novo, em vez
  // de ficar carregando para sempre.
  if (consulta.erro && !c) {
    return (
      <div className="print-page">
        <EmptyState
          icon={<FileWarning size={24} strokeWidth={1.5} />}
          titulo="Não foi possível abrir a cautela"
          descricao={consulta.erro}
          acao={
            <div className="row" style={{ gap: 'var(--space-2)' }}>
              <Button variant="ghost" onClick={() => navegar('/cautelas')}>Voltar para as cautelas</Button>
              <Button variant="primary" onClick={() => { consulta.recarregar(); void recarregarCatalogo().catch(() => undefined); }}>
                Tentar novamente
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  if (!c || !settings) {
    return <div className="print-page"><Skeleton height="600px" /></div>;
  }

  return (
    <div className="print-page">
      <div className="print-toolbar">
        <Button variant="ghost" icon={<ArrowLeft size={16} strokeWidth={1.5} />} onClick={() => navegar(`/cautelas/${c.id}`)}>
          Voltar
        </Button>
        <span className="text-sm text-secondary">Confira os dados antes de imprimir. As assinaturas são no papel.</span>
        <Button variant="primary" icon={<Printer size={16} strokeWidth={1.5} />} onClick={() => window.print()}>
          Imprimir
        </Button>
      </div>

      <Folha cautela={c} cabecalho={settings.cabecalhoCautela} cidade={settings.cidadeCautela} />
    </div>
  );
}

/**
 * A folha segue o formulário oficial (modelo novo): uma grade única de seis
 * colunas, para que as caixas do usuário e as colunas dos itens caiam nas
 * mesmas divisas do papel.
 *
 *   col:   1 (espec.)   2   3   4 (marca)   5 (série)   6 (patrimônio)
 *   usuário, 1ª linha:  [ USUÁRIO: nome ............... ] [ ramal ]
 *   usuário, 2ª linha:  [ PR ....... ] [ celular ....... ] [       ]
 *   usuário, 3ª linha:  [            ] [                 ] [       ]
 *
 * Caixas sem título, como no papel. Posição dos dados definida pela chefia.
 */
export function Folha({ cautela: c, cabecalho, cidade }: {
  cautela: Cautela;
  cabecalho: string;
  cidade: string;
}) {
  const [orgao, ...niveis] = cabecalho.split('\n').filter((l) => l.trim());
  const vazias = Math.max(0, LINHAS_MINIMAS - c.itens.length);
  const fechada = c.fechadaEm ? new Date(c.fechadaEm) : null;
  const r = c.responsavel;

  return (
    <article className="sheet" aria-label={`Cautela nº ${numeroCautela(c)}`}>
      <table className="sheet__table">
        <colgroup>
          <col className="sheet__c1" />
          <col className="sheet__c2" />
          <col className="sheet__c3" />
          <col className="sheet__c4" />
          <col className="sheet__c5" />
          <col className="sheet__c6" />
        </colgroup>
        <tbody>
          {/* Cabeçalho institucional */}
          <tr className="sheet__header">
            <td colSpan={2} className="sheet__org">
              <img
                src={BRASAO}
                alt=""
                className="sheet__brasao"
                // Se a imagem não carregar, some sem deixar marca na folha.
                onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
              />
              {orgao && <div className="sheet__orgao">{orgao}</div>}
              {niveis.map((n) => <div key={n} className="sheet__nivel">{n}</div>)}
            </td>
            <td colSpan={4} className="sheet__title-cell">
              <div className="sheet__title">CAUTELA DE EQUIPAMENTOS</div>
              <div className="sheet__numero">Nº {numeroCautela(c)}</div>
            </td>
          </tr>

          {/* Dados do usuário */}
          <tr className="sheet__user sheet__user--1">
            <td colSpan={5}>
              <span className="sheet__cap">USUÁRIO:</span>
              <span className="sheet__dado sheet__dado--nome">{r.nome}</span>
            </td>
            <td><span className="sheet__dado">{r.ramal}</span></td>
          </tr>
          <tr className="sheet__user sheet__user--2">
            <td colSpan={2}><span className="sheet__dado">{r.matricula}</span></td>
            <td colSpan={3}><span className="sheet__dado">{r.telefone}</span></td>
            <td />
          </tr>
          <tr className="sheet__user sheet__user--3">
            <td colSpan={2} />
            <td colSpan={3} />
            <td />
          </tr>

          {/* Equipamentos */}
          <tr className="sheet__head">
            <td>ESPECIFICAÇÃO DO EQUIPAMENTO</td>
            <td colSpan={2}>MODELO</td>
            <td>MARCA</td>
            <td>Nº DE SÉRIE</td>
            <td>PATRIMÔNIO</td>
          </tr>
          {c.itens.map((i) => (
            <tr key={i.id} className="sheet__item">
              <td>{i.nome}</td>
              <td colSpan={2}>{i.modelo}</td>
              <td>{i.marca}</td>
              <td className="sheet__serie">{i.numeroSerie ?? 'S/N'}</td>
              <td>{i.pr}</td>
            </tr>
          ))}
          {Array.from({ length: vazias }, (_, k) => (
            <tr key={`v${k}`} className="sheet__item">
              <td /><td colSpan={2} /><td /><td /><td />
            </tr>
          ))}

          {/* Assinaturas — sempre em branco, colhidas no papel */}
          <tr className="sheet__signs">
            <td>
              <div className="sheet__sign-box">
                <span className="sheet__sign-text">
                  RECEBI O EQUIPAMENTO ACIMA
                  <br />
                  RESPONSABILIZANDO-ME PELA GUARDA E ZELO.
                </span>
                <span className="sheet__line" />
                <span className="sheet__caption">ASSINATURA DO CLIENTE</span>
              </div>
            </td>
            <td colSpan={5}>
              <div className="sheet__sign-box">
                <span className="sheet__sign-text">RECEBI O EQUIPAMENTO ESPECIFICADO ACIMA</span>
                <span className="sheet__line" />
                <span className="sheet__caption">ASSINATURA LEGÍVEL DO RECEBEDOR</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="sheet__frame sheet__transport">
        <span>Técnico responsável pelo transporte:</span>
        <span className="sheet__fill">{c.tecnicoTransporte}</span>
      </div>

      <div className="sheet__cut" aria-hidden="true" />

      <div className="sheet__frame sheet__return">
        <div className="sheet__return-title">
          CAUTELA DE DEVOLUÇÃO DE EQUIPAMENTOS <span className="sheet__return-num">Nº {numeroCautela(c)}</span>
        </div>
        <p className="sheet__return-text">
          Recebi nesta data os equipamentos especificados na Cautela acima, estando o mesmo em perfeito funcionamento.
        </p>
        <p className="sheet__date">
          <span>{cidade},</span>
          <span className="sheet__blank">{fechada ? fechada.getDate() : ''}</span>
          <span>de</span>
          <span className="sheet__blank sheet__blank--mes">{fechada ? MESES[fechada.getMonth()] : ''}</span>
          <span>de</span>
          <span className="sheet__blank sheet__blank--ano">{fechada ? fechada.getFullYear() : ''}</span>
        </p>
        <p className="sheet__return-who">
          FUNCIONÁRIO DA ADMINISTRAÇÃO DO AUDITÓRIO, QUE RECEBEU O EQUIPAMENTO.
        </p>
        <span className="sheet__line sheet__line--return" />
      </div>
    </article>
  );
}
