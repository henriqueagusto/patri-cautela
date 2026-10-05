import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CheckboxField, FormBlock, PhotoField, SelectField, TextAreaField, TextField,
} from '../components/Form';
import { LocationPicker } from '../components/Pickers';
import { useToast } from '../components/Toast';
import { Button } from '../components/ui';
import { api, mensagemDeErro } from '../lib/api';
import { paraInputData } from '../lib/format';
import { IconeCategoria } from '../lib/icons';
import { ESTADO_FISICO_LABEL } from '../lib/status';
import { useAsync } from '../lib/useAsync';
import { useAppState } from '../state/AppState';
import { useCatalog } from '../state/CatalogState';
import type { EstadoFisico } from '../types/equipment';

const ESTADOS: EstadoFisico[] = ['otimo', 'bom', 'regular', 'ruim', 'danificado'];

const vazio = {
  pr: '', nome: '', material: '', marca: '', modelo: '', numeroSerie: '',
  semNumeroSerie: false, fabricante: '', categoryId: '', situacao: 'DISPONIVEL',
  estadoFisico: 'BOM', locationId: '', foto: '' as string | null, observacoes: '',
  aquisicao: '', valorAquisicao: '' as number | '',
};

export function EquipmentForm() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navegar = useNavigate();
  const toast = useToast();
  const { invalidar } = useAppState();
  const { categorias, settings } = useCatalog();

  const existente = useAsync(() => (id ? api.obter(id) : Promise.resolve(null)), [id]);
  const [f, setF] = useState(vazio);
  const [tentou, setTentou] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string>();

  useEffect(() => {
    const it = existente.dados;
    if (!it) return;
    setF({
      pr: it.pr, nome: it.nome, material: it.material, marca: it.marca, modelo: it.modelo,
      numeroSerie: it.numeroSerie ?? '', semNumeroSerie: it.semNumeroSerie,
      fabricante: it.fabricante, categoryId: it.categoria.id,
      situacao: it.situacao === 'manutencao' ? 'MANUTENCAO' : it.situacao === 'baixado' ? 'BAIXADO' : 'DISPONIVEL',
      estadoFisico: it.estadoFisico.toUpperCase(), locationId: it.local.id, foto: it.foto ?? '',
      observacoes: it.observacoes ?? '', aquisicao: it.aquisicao ? paraInputData(it.aquisicao) : '',
      valorAquisicao: it.valorAquisicao ?? '',
    });
  }, [existente.dados]);

  useEffect(() => {
    if (!editando && !f.categoryId && categorias[0]) setF((s) => ({ ...s, categoryId: categorias[0]!.id }));
  }, [categorias, editando, f.categoryId]);

  const set = (d: Partial<typeof vazio>) => setF((s) => ({ ...s, ...d }));

  const naBase = (() => {
    try {
      return new RegExp(settings?.regraBaseOficial ?? '^72\\d{5}$').test(f.pr.trim());
    } catch {
      return true;
    }
  })();

  const erroPr = tentou && !f.pr.trim() ? 'Informe o número de patrimônio.' : undefined;
  const erroNome = tentou && !f.nome.trim() ? 'Dê um nome de uso ao equipamento.' : undefined;
  const erroSerie = tentou && !f.semNumeroSerie && !f.numeroSerie.trim()
    ? 'Informe o número de série ou marque "Sem número de série".' : undefined;
  const erroLocal = tentou && !f.locationId ? 'Escolha onde o item fica guardado.' : undefined;

  async function enviarFoto(arquivo: File | undefined) {
    if (!arquivo) return set({ foto: '' });
    try {
      const { url } = await api.enviarFoto(arquivo);
      set({ foto: url });
    } catch (e) {
      toast.erro(mensagemDeErro(e));
    }
  }

  async function salvar() {
    setTentou(true);
    setErro(undefined);
    if (!f.pr.trim() || !f.nome.trim() || !f.locationId || (!f.semNumeroSerie && !f.numeroSerie.trim())) return;

    const dados = {
      nome: f.nome, material: f.material || null, marca: f.marca || null, modelo: f.modelo || null,
      numeroSerie: f.numeroSerie || null, semNumeroSerie: f.semNumeroSerie,
      fabricante: f.fabricante || null, categoryId: f.categoryId, situacao: f.situacao,
      estadoFisico: f.estadoFisico, locationId: f.locationId, foto: f.foto || null,
      observacoes: f.observacoes || null, aquisicao: f.aquisicao || null,
      valorAquisicao: f.valorAquisicao === '' ? null : Number(f.valorAquisicao),
    };

    setEnviando(true);
    try {
      const item = editando
        ? await api.atualizar(id!, dados)
        : await api.cadastrar({ ...dados, pr: f.pr.trim() });
      invalidar();
      toast.sucesso(editando ? 'Alterações salvas' : 'Item salvo');
      navegar(`/equipamento/${item.id}`);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  const categoria = categorias.find((c) => c.id === f.categoryId);

  return (
    <div className="container">
      <header className="page-header">
        <div className="page-header__text">
          <h1 className="title-page">{editando ? 'Editar equipamento' : 'Novo equipamento'}</h1>
          <p className="text-secondary text-sm">Campos sem “opcional” são obrigatórios.</p>
        </div>
      </header>

      <form className="form" onSubmit={(e) => { e.preventDefault(); void salvar(); }}>
        <FormBlock titulo="Identificação">
          <TextField
            label="PR" valor={f.pr} onChange={(v) => set({ pr: v })} placeholder="7210899" erro={erroPr}
            ajuda={!editando && f.pr.trim().length >= 5 && !naBase
              ? 'Este PR não consta na base oficial. O item será marcado como “Não importado”.' : undefined}
          />
          <TextField label="Nome de uso" valor={f.nome} onChange={(v) => set({ nome: v })} placeholder="Câmera Canon EOS R" erro={erroNome} />
          <TextField label="Número de série" valor={f.numeroSerie} onChange={(v) => set({ numeroSerie: v })} erro={erroSerie} />
          <div className="field">
            <CheckboxField
              label="Sem número de série"
              descricao="Para itens que realmente não têm série (cabos, suportes, tripés simples)."
              marcado={f.semNumeroSerie}
              onChange={(v) => set({ semNumeroSerie: v, numeroSerie: v ? '' : f.numeroSerie })}
            />
          </div>
          <SelectField
            label="Categoria" valor={f.categoryId} onChange={(v) => set({ categoryId: v })}
            opcoes={categorias.map((c) => ({ valor: c.id, rotulo: c.nome }))}
          />
          <TextField label="Marca" opcional valor={f.marca} onChange={(v) => set({ marca: v })} />
          <TextField label="Modelo" opcional valor={f.modelo} onChange={(v) => set({ modelo: v })} />
          <TextField label="Fabricante" opcional valor={f.fabricante} onChange={(v) => set({ fabricante: v })} />
          <TextField label="Material (descrição oficial)" opcional valor={f.material} onChange={(v) => set({ material: v })} />
        </FormBlock>

        <FormBlock titulo="Estado e guarda">
          <SelectField
            label="Estado físico" valor={f.estadoFisico} onChange={(v) => set({ estadoFisico: v })}
            opcoes={ESTADOS.map((e) => ({ valor: e.toUpperCase(), rotulo: ESTADO_FISICO_LABEL[e] }))}
            ajuda="Conservação — diferente da situação."
          />
          <SelectField
            label="Situação" valor={f.situacao} onChange={(v) => set({ situacao: v })}
            opcoes={[
              { valor: 'DISPONIVEL', rotulo: 'Disponível' },
              { valor: 'MANUTENCAO', rotulo: 'Em manutenção' },
              { valor: 'BAIXADO', rotulo: 'Baixado' },
            ]}
            ajuda="Disponibilidade. Saídas são registradas pelo botão Mover item."
          />
          <div style={{ gridColumn: '1 / -1' }}>
            <LocationPicker label="Onde fica guardado" valor={f.locationId || null} onChange={(v) => set({ locationId: v })} erro={erroLocal} />
          </div>
        </FormBlock>

        <FormBlock titulo="Foto">
          <div style={{ gridColumn: '1 / -1' }}>
            <PhotoField
              foto={f.foto}
              vazio={<IconeCategoria nome={categoria?.icone} size={32} />}
              onSelecionar={(a) => void enviarFoto(a)}
            />
          </div>
        </FormBlock>

        <FormBlock titulo="Patrimônio e observações">
          <TextField label="Data de aquisição" opcional tipo="date" valor={f.aquisicao} onChange={(v) => set({ aquisicao: v })} />
          <TextField
            label="Valor de aquisição" opcional tipo="number"
            valor={String(f.valorAquisicao)} onChange={(v) => set({ valorAquisicao: v === '' ? '' : Number(v) })}
          />
          <div style={{ gridColumn: '1 / -1' }}>
            <TextAreaField label="Observações" opcional valor={f.observacoes} onChange={(v) => set({ observacoes: v })} />
          </div>
        </FormBlock>

        {erro && <p className="field__error">{erro}</p>}

        <div className="form__actions">
          <Button variant="ghost" type="button" onClick={() => navegar(-1)}>Cancelar</Button>
          <Button variant="primary" type="submit" loading={enviando}>
            {editando ? 'Salvar alterações' : 'Salvar item'}
          </Button>
        </div>
      </form>
    </div>
  );
}
