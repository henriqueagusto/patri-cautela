import { Boxes } from 'lucide-react';
import { useState } from 'react';
import { TextField } from '../components/Form';
import { Button, ImagemArquivo } from '../components/ui';
import { api, mensagemDeErro } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { useAuth } from '../state/AuthState';

export function Login() {
  const { entrar } = useAuth();
  const marca = useAsync(() => api.branding(), []);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  async function submeter() {
    setErro(undefined);
    setEnviando(true);
    try {
      await entrar(email, senha);
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível entrar. Tente novamente.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login">
      <span className="login__shape login__shape--1" aria-hidden="true" />
      <span className="login__shape login__shape--2" aria-hidden="true" />
      <span className="login__shape login__shape--3" aria-hidden="true" />
      <span className="login__shape login__shape--4" aria-hidden="true" />
      <form className="login__card" onSubmit={(e) => { e.preventDefault(); void submeter(); }}>
        <div className="login__brand">
          <ImagemArquivo
            caminho={marca.dados?.logo}
            className="sidebar__logo"
            alternativa={<span className="sidebar__mark" aria-hidden="true"><Boxes size={16} strokeWidth={1.5} /></span>}
          />
          <span className="sidebar__wordmark">PATRI</span>
        </div>

        <div className="login__head">
          <h1 className="title-page">{marca.dados?.nomeInstituicao ?? 'Entrar'}</h1>
          <p className="text-secondary text-sm">{marca.dados?.subtitulo ?? 'Controle e localização de equipamentos'}</p>
        </div>

        <TextField label="E-mail" tipo="email" valor={email} onChange={setEmail} placeholder="voce@instituicao.gov.br" />
        <TextField label="Senha" tipo="password" valor={senha} onChange={setSenha} />

        {erro && <p className="field__error">{erro}</p>}

        <Button variant="primary" size="lg" block type="submit" loading={enviando}>Entrar</Button>
      </form>
    </div>
  );
}
