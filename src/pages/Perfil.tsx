import { ImagePlus, KeyRound, LogOut, UserRound } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { EquipmentRow } from '../components/EquipmentCard';
import { HistoryEvent } from '../components/HistoryEvent';
import { SelectField, TextField } from '../components/Form';
import { useToast } from '../components/Toast';
import { Avatar, Button } from '../components/ui';
import { api, mensagemDeErro } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { useAppState } from '../state/AppState';
import { useAuth } from '../state/AuthState';
import type { Preferencias } from '../types/equipment';

export function Perfil() {
  const { usuario, ehAdmin, sair, atualizarUsuario } = useAuth();
  const { versao } = useAppState();
  const toast = useToast();
  const arquivo = useRef<HTMLInputElement>(null);

  const [nome, setNome] = useState(usuario?.nome ?? '');
  const [telefone, setTelefone] = useState(usuario?.telefone ?? '');
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [salvando, setSalvando] = useState(false);

  const atividade = useAsync(() => api.minhaAtividade(), [versao]);

  async function salvarPerfil(dados: Record<string, unknown>) {
    setSalvando(true);
    try {
      atualizarUsuario(await api.atualizarPerfil(dados));
      toast.sucesso('Perfil atualizado');
    } catch (e) {
      toast.erro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }

  async function enviarFoto(f: File | undefined) {
    if (!f) return;
    try {
      const { url } = await api.enviarFoto(f);
      await salvarPerfil({ foto: url });
    } catch (e) {
      toast.erro(mensagemDeErro(e));
    }
  }

  async function trocarSenha() {
    if (nova.length < 8) return toast.erro('A nova senha precisa ter ao menos 8 caracteres.');
    try {
      await api.trocarSenha(atual, nova);
      setAtual('');
      setNova('');
      toast.sucesso('Senha alterada');
    } catch (e) {
      toast.erro(mensagemDeErro(e));
    }
  }

  function salvarPreferencia(p: Preferencias) {
    void salvarPerfil({ preferencias: p });
  }

  return (
    <div className="container">
      <header className="page-header">
        <div className="page-header__text"><h1 className="title-page">Meu perfil</h1></div>
        <Button icon={<LogOut size={16} strokeWidth={1.5} />} onClick={sair}>Sair da conta</Button>
      </header>

      <div className="profile-hero section">
        <span className="avatar-edit">
          <Avatar nome={usuario?.nome ?? ''} foto={usuario?.foto} size={72} />
          {ehAdmin && (
            <>
              <button type="button" className="avatar-edit__btn" aria-label="Trocar foto" onClick={() => arquivo.current?.click()}>
                <ImagePlus size={16} strokeWidth={1.5} />
              </button>
              <input ref={arquivo} type="file" accept="image/jpeg,image/png,image/webp" className="visually-hidden"
                onChange={(e) => void enviarFoto(e.target.files?.[0])} />
            </>
          )}
        </span>
        <div className="profile-hero__body">
          <span className="title-section">{usuario?.nome}</span>
          <span className="setting__desc">
            {usuario?.email} · {ehAdmin ? 'Administrador' : 'Usuário'}
          </span>
        </div>
        <div className="mini-stats">
          <span className="pill">{atividade.dados?.comigo.length ?? 0} sob minha responsabilidade</span>
          <span className="pill">{atividade.dados?.totais.saida ?? 0} saídas registradas</span>
        </div>
      </div>

      {ehAdmin ? (
        <section className="section">
          <div className="section__head"><h2 className="title-section">Dados</h2></div>
          <div className="settings-section">
            <TextField label="Nome" valor={nome} onChange={setNome} />
            <TextField label="Telefone" opcional tipo="tel" valor={telefone} onChange={setTelefone} />
            <div className="form__actions">
              <Button variant="primary" loading={salvando} onClick={() => void salvarPerfil({ nome, telefone })}>Salvar</Button>
            </div>
          </div>
        </section>
      ) : (
        <div className="notice section">
          <KeyRound size={20} strokeWidth={1.5} aria-hidden="true" />
          <span className="notice__text">
            Seus dados e sua senha são gerenciados pelo administrador. Para qualquer alteração, fale com ele.
          </span>
        </div>
      )}

      <section className="section">
        <div className="section__head"><h2 className="title-section">Preferências</h2></div>
        <div className="settings-section">
          <SelectField label="Visualização padrão" valor={usuario?.preferencias?.visualizacao ?? 'grid'}
            onChange={(v) => salvarPreferencia({ visualizacao: v as 'grid' | 'lista' })}
            opcoes={[{ valor: 'grid', rotulo: 'Grade com foto' }, { valor: 'lista', rotulo: 'Lista compacta' }]} />
          <SelectField label="Tela inicial" valor={usuario?.preferencias?.paginaInicial ?? '/'}
            onChange={(v) => salvarPreferencia({ paginaInicial: v as Preferencias['paginaInicial'] })}
            opcoes={[
              { valor: '/', rotulo: 'Buscar equipamento' },
              { valor: '/equipamentos', rotulo: 'Lista de equipamentos' },
              { valor: '/cautelas', rotulo: 'Cautelas' },
              { valor: '/favoritos', rotulo: 'Favoritos' },
            ]} />
        </div>
      </section>

      {ehAdmin && (
      <section className="section">
        <div className="section__head"><h2 className="title-section">Segurança</h2></div>
        <div className="settings-section">
          <TextField label="Senha atual" tipo="password" valor={atual} onChange={setAtual} />
          <TextField label="Nova senha" tipo="password" valor={nova} onChange={setNova} ajuda="Mínimo de 8 caracteres." />
          <div className="form__actions">
            <Button icon={<KeyRound size={16} strokeWidth={1.5} />} onClick={() => void trocarSenha()}>Alterar senha</Button>
          </div>
        </div>
      </section>
      )}

      {(atividade.dados?.comigo.length ?? 0) > 0 && (
        <section className="section">
          <div className="section__head"><h2 className="title-section">Sob minha responsabilidade</h2></div>
          <div className="rows-d">
            {atividade.dados!.comigo.map((item) => <EquipmentRow key={item.id} item={item} />)}
          </div>
        </section>
      )}

      {!usuario?.personId && (
        <p className="text-secondary text-sm">
          Sua conta ainda não está vinculada a uma pessoa do cadastro.{' '}
          {ehAdmin ? <Link to="/cadastros/usuarios">Vincular</Link> : 'Peça ao administrador para vincular.'}
        </p>
      )}

      <section className="section">
        <div className="section__head"><h2 className="title-section">Minhas últimas ações</h2></div>
        {(atividade.dados?.acoes.length ?? 0) === 0 ? (
          <p className="text-secondary text-sm row" style={{ gap: 'var(--space-2)' }}>
            <UserRound size={16} strokeWidth={1.5} /> Você ainda não registrou movimentações.
          </p>
        ) : (
          <div className="stack" style={{ gap: 'var(--space-2)' }}>
            {atividade.dados!.acoes.map((ev) => <HistoryEvent key={ev.id} evento={ev} equipamento={ev.equipamento} />)}
          </div>
        )}
      </section>
    </div>
  );
}
