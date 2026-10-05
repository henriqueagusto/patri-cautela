import { Building2, ClipboardSignature, ScrollText, SlidersHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CheckboxField, NumberField, PhotoField, TextAreaField, TextField } from '../components/Form';
import { useToast } from '../components/Toast';
import { Button, Skeleton } from '../components/ui';
import { api, mensagemDeErro } from '../lib/api';
import { dataHoraRelativa } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { useCatalog } from '../state/CatalogState';
import type { Settings } from '../types/equipment';

const SECOES = [
  { slug: 'instituicao', rotulo: 'Instituição', Icone: Building2 },
  { slug: 'regras', rotulo: 'Regras de uso', Icone: SlidersHorizontal },
  { slug: 'cautela', rotulo: 'Cautela', Icone: ClipboardSignature },
  { slug: 'auditoria', rotulo: 'Auditoria', Icone: ScrollText },
];

export function Configuracoes() {
  const { settings, recarregar } = useCatalog();
  const toast = useToast();
  const [secao, setSecao] = useState('instituicao');
  const [f, setF] = useState<Settings | null>(settings);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => setF(settings), [settings]);

  async function salvar(campos: Partial<Settings>) {
    setSalvando(true);
    try {
      await api.salvarSettings(campos);
      await recarregar();
      toast.sucesso('Configurações salvas');
    } catch (e) {
      toast.erro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }

  async function enviarLogo(arquivo: File | undefined) {
    if (!arquivo) return void salvar({ logo: null });
    try {
      const { url } = await api.enviarFoto(arquivo);
      await salvar({ logo: url });
    } catch (e) {
      toast.erro(mensagemDeErro(e));
    }
  }

  if (!f) return <div className="container"><Skeleton height="200px" /></div>;

  return (
    <div className="container">
      <header className="page-header">
        <div className="page-header__text"><h1 className="title-page">Configurações</h1></div>
      </header>

      <div className="settings-layout">
        <nav className="settings-nav">
          {SECOES.map(({ slug, rotulo, Icone }) => (
            <button key={slug} type="button"
              className={`settings-nav__item${secao === slug ? ' settings-nav__item--ativo' : ''}`}
              onClick={() => setSecao(slug)}>
              <Icone size={16} strokeWidth={1.5} /> {rotulo}
            </button>
          ))}
        </nav>

        {secao === 'instituicao' && (
          <section className="settings-section">
            <div className="settings-section__head">
              <h2 className="title-section">Instituição</h2>
              <p className="setting__desc">Nome e logo aparecem no login e na barra lateral.</p>
            </div>
            <TextField label="Nome" valor={f.nomeInstituicao} onChange={(v) => setF({ ...f, nomeInstituicao: v })} />
            <TextField label="Subtítulo" opcional valor={f.subtitulo} onChange={(v) => setF({ ...f, subtitulo: v })} />
            <PhotoField foto={f.logo} vazio={<Building2 size={28} strokeWidth={1.5} />} onSelecionar={(a) => void enviarLogo(a)} />
            <div className="form__actions">
              <Button variant="primary" loading={salvando}
                onClick={() => void salvar({ nomeInstituicao: f.nomeInstituicao, subtitulo: f.subtitulo })}>
                Salvar
              </Button>
            </div>
          </section>
        )}

        {secao === 'regras' && (
          <section className="settings-section">
            <div className="settings-section__head">
              <h2 className="title-section">Regras de uso</h2>
              <p className="setting__desc">Valem para todo o sistema.</p>
            </div>
            <NumberField label="Aviso de retorno próximo" min={1} max={720} sufixo="horas antes"
              valor={f.horasRetornoProximo} onChange={(v) => setF({ ...f, horasRetornoProximo: Number(v) || 48 })}
              ajuda="Abaixo disso o item aparece em amarelo como “Retorno próximo”." />
            <NumberField label="Prazo padrão de empréstimo" min={1} max={365} sufixo="dias"
              valor={f.prazoPadraoDias} onChange={(v) => setF({ ...f, prazoPadraoDias: Number(v) || 7 })}
              ajuda="Usado quando o motivo escolhido não tem prazo próprio." />
            <TextField label="Regra do PR da base oficial" valor={f.regraBaseOficial}
              onChange={(v) => setF({ ...f, regraBaseOficial: v })}
              ajuda="Expressão regular. PRs fora dela entram marcados como “Não importado”. Padrão: ^72\d{5}$" />
            <CheckboxField label="Exigir responsável na saída"
              descricao="Impede registrar saída sem dizer com quem o equipamento ficou."
              marcado={f.exigirResponsavel} onChange={(v) => setF({ ...f, exigirResponsavel: v })} />
            <div className="form__actions">
              <Button variant="primary" loading={salvando} onClick={() => void salvar({
                horasRetornoProximo: f.horasRetornoProximo, prazoPadraoDias: f.prazoPadraoDias,
                regraBaseOficial: f.regraBaseOficial, exigirResponsavel: f.exigirResponsavel,
              })}>Salvar</Button>
            </div>
          </section>
        )}

        {secao === 'cautela' && (
          <section className="settings-section">
            <div className="settings-section__head">
              <h2 className="title-section">Cautela de equipamentos</h2>
              <p className="setting__desc">
                O que sai impresso na folha. O brasão da República sai fixo no topo, como no formulário oficial.
              </p>
            </div>
            <TextAreaField label="Cabeçalho" linhas={5} valor={f.cabecalhoCautela}
              onChange={(v) => setF({ ...f, cabecalhoCautela: v })}
              ajuda="Uma linha por nível. A primeira sai em negrito, como no formulário oficial." />
            <TextField label="Cidade" valor={f.cidadeCautela} onChange={(v) => setF({ ...f, cidadeCautela: v })}
              ajuda="Usada em “Brasília, __ de ____ de ____” na devolução." />
            <div className="form-grid">
              <NumberField label="Número inicial" min={1} valor={f.numeroInicialCautela}
                onChange={(v) => setF({ ...f, numeroInicialCautela: Number(v) || 1 })}
                ajuda="Para continuar de onde o papel parou." />
              <NumberField label="Vale para o ano" min={2000} max={2100} valor={f.anoNumeroInicial}
                onChange={(v) => setF({ ...f, anoNumeroInicial: Number(v) || new Date().getFullYear() })}
                ajuda="Nos anos seguintes a numeração recomeça em 1." />
            </div>
            <p className="field__help">
              A cautela sai como número/ano — por exemplo, {f.numeroInicialCautela}/{f.anoNumeroInicial}.
            </p>
            <div className="form__actions">
              <Button variant="primary" loading={salvando} onClick={() => void salvar({
                cabecalhoCautela: f.cabecalhoCautela, cidadeCautela: f.cidadeCautela,
                numeroInicialCautela: f.numeroInicialCautela,
                anoNumeroInicial: f.anoNumeroInicial,
              })}>Salvar</Button>
            </div>
          </section>
        )}

        {secao === 'auditoria' && <Auditoria />}
      </div>
    </div>
  );
}

function Auditoria() {
  const consulta = useAsync(() => api.auditoria(1), []);
  const registros = consulta.dados?.registros ?? [];

  return (
    <section className="settings-section" style={{ maxWidth: 'none' }}>
      <div className="settings-section__head">
        <h2 className="title-section">Auditoria</h2>
        <p className="setting__desc">Quem alterou cadastros, locais, usuários e configurações.</p>
      </div>
      {registros.length === 0 ? (
        <p className="text-secondary">Nenhuma alteração registrada ainda.</p>
      ) : (
        <div className="entity-list">
          {registros.map((r) => (
            <div key={r.id} className="audit-row">
              <span className="label">{dataHoraRelativa(r.data)}</span>
              <span className="text-sm">{r.usuarioNome}</span>
              <span className="text-sm text-secondary">{r.acao} {r.entidade.toLowerCase()} — {r.resumo}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
