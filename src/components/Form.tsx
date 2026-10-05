import { ImagePlus, Trash2 } from 'lucide-react';
import { useId, useRef, type ComponentType, type ReactNode } from 'react';
import { ImagemArquivo } from './ui';

/**
 * Campos (§9.2): label persistente acima, placeholder só complementa,
 * erro diz o que fazer e não o que aconteceu.
 */

interface BaseProps {
  label: string;
  erro?: string;
  ajuda?: string;
  opcional?: boolean;
}

function Wrapper({
  label,
  erro,
  ajuda,
  opcional,
  id,
  children,
}: BaseProps & { id: string; children: ReactNode }) {
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
        {opcional && <span className="field__optional"> · opcional</span>}
      </label>
      <div className={`field__control${erro ? ' field__control--error' : ''}`}>
        {children}
      </div>
      {erro ? (
        <span className="field__error">{erro}</span>
      ) : (
        ajuda && <span className="field__help">{ajuda}</span>
      )}
    </div>
  );
}

interface TextFieldProps extends BaseProps {
  valor: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  tipo?: 'text' | 'date' | 'number' | 'password' | 'email' | 'tel';
  lista?: string[];
}

export function TextField({
  valor,
  onChange,
  placeholder,
  tipo = 'text',
  lista,
  ...base
}: TextFieldProps) {
  const id = useId();
  const listaId = `${id}-lista`;

  return (
    <Wrapper {...base} id={id}>
      <input
        id={id}
        type={tipo}
        className="field__input"
        value={valor}
        placeholder={placeholder}
        list={lista ? listaId : undefined}
        onChange={(evento) => onChange(evento.target.value)}
      />
      {lista && (
        <datalist id={listaId}>
          {lista.map((opcao) => (
            <option key={opcao} value={opcao} />
          ))}
        </datalist>
      )}
    </Wrapper>
  );
}

interface SelectFieldProps extends BaseProps {
  valor: string;
  onChange: (valor: string) => void;
  opcoes: { valor: string; rotulo: string }[];
  placeholder?: string;
  desabilitado?: boolean;
}

export function SelectField({
  valor,
  onChange,
  opcoes,
  placeholder = 'Selecione…',
  desabilitado = false,
  ...base
}: SelectFieldProps) {
  const id = useId();

  return (
    <Wrapper {...base} id={id}>
      <select
        id={id}
        className="field__input field__select"
        value={valor}
        disabled={desabilitado}
        onChange={(evento) => onChange(evento.target.value)}
      >
        <option value="">{placeholder}</option>
        {opcoes.map((opcao) => (
          <option key={opcao.valor} value={opcao.valor}>
            {opcao.rotulo}
          </option>
        ))}
      </select>
    </Wrapper>
  );
}

interface TextAreaFieldProps extends BaseProps {
  valor: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  linhas?: number;
}

export function TextAreaField({
  valor,
  onChange,
  placeholder,
  linhas = 4,
  ...base
}: TextAreaFieldProps) {
  const id = useId();

  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {base.label}
        {base.opcional && <span className="field__optional"> · opcional</span>}
      </label>
      <div className="field__control field__control--area">
        <textarea
          id={id}
          className="field__input"
          rows={linhas}
          value={valor}
          placeholder={placeholder}
          onChange={(evento) => onChange(evento.target.value)}
        />
      </div>
      {base.ajuda && <span className="field__help">{base.ajuda}</span>}
    </div>
  );
}

interface PhotoFieldProps {
  foto?: string | null;
  /** O que mostrar enquanto não há foto (ícone da categoria, iniciais…). */
  vazio: ReactNode;
  /** Recebe o arquivo escolhido, ou undefined ao remover. O envio é do pai. */
  onSelecionar: (arquivo: File | undefined) => void;
}

/** Uma foto principal: adicionar, substituir, remover (§14.2). */
export function PhotoField({ foto, vazio, onSelecionar }: PhotoFieldProps) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className="photo-field">
      <div className="photo-field__preview">
        <ImagemArquivo caminho={foto} alt="Pré-visualização da foto" alternativa={vazio} />
      </div>

      <div className="photo-field__actions">
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={() => input.current?.click()}
        >
          <ImagePlus size={16} strokeWidth={1.5} />
          {foto ? 'Substituir foto' : 'Adicionar foto'}
        </button>
        {foto && (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => onSelecionar(undefined)}
          >
            <Trash2 size={16} strokeWidth={1.5} />
            Remover
          </button>
        )}
        <span className="field__help">JPEG, PNG ou WebP, até 5 MB.</span>
      </div>

      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="visually-hidden"
        onChange={(evento) => onSelecionar(evento.target.files?.[0])}
      />
    </div>
  );
}

/** Bloco de formulário com título e divisor — não card aninhado (§10.9). */
export function FormBlock({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  return (
    <section className="form-block">
      <h2 className="form-block__title">{titulo}</h2>
      <div className="form-grid">{children}</div>
    </section>
  );
}

/* --- Campos adicionais ---------------------------------------------------- */

export function CheckboxField({
  label,
  descricao,
  marcado,
  onChange,
}: {
  label: string;
  descricao?: string;
  marcado: boolean;
  onChange: (valor: boolean) => void;
}) {
  return (
    <label className="check">
      <input type="checkbox" checked={marcado} onChange={(e) => onChange(e.target.checked)} />
      <span className="check__body">
        <span>{label}</span>
        {descricao && <span className="field__help">{descricao}</span>}
      </span>
    </label>
  );
}

export function NumberField({
  label,
  valor,
  onChange,
  min,
  max,
  sufixo,
  ajuda,
  opcional,
}: {
  label: string;
  valor: number | '';
  onChange: (valor: number | '') => void;
  min?: number;
  max?: number;
  sufixo?: string;
  ajuda?: string;
  opcional?: boolean;
}) {
  const id = useId();
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
        {opcional && <span className="field__optional"> · opcional</span>}
      </label>
      <div className="field__control">
        <input
          id={id}
          type="number"
          className="field__input tabular"
          value={valor}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        />
        {sufixo && <span className="text-sm text-tertiary">{sufixo}</span>}
      </div>
      {ajuda && <span className="field__help">{ajuda}</span>}
    </div>
  );
}

export function ColorField({
  label,
  valor,
  cores,
  onChange,
}: {
  label: string;
  valor: string;
  cores: string[];
  onChange: (cor: string) => void;
}) {
  return (
    <div className="field">
      <span className="label">{label}</span>
      <div className="color-grid" role="radiogroup" aria-label={label}>
        {cores.map((cor) => (
          <button
            key={cor}
            type="button"
            role="radio"
            aria-checked={valor === cor}
            aria-label={cor}
            className={`color-opt${valor === cor ? ' color-opt--on' : ''}`}
            style={{ backgroundColor: cor }}
            onClick={() => onChange(cor)}
          />
        ))}
      </div>
    </div>
  );
}

export function IconField({
  label,
  valor,
  opcoes,
  onChange,
}: {
  label: string;
  valor: string;
  opcoes: { nome: string; Icone: ComponentType<{ size?: number; strokeWidth?: number }> }[];
  onChange: (icone: string) => void;
}) {
  return (
    <div className="field">
      <span className="label">{label}</span>
      <div className="icon-grid" role="radiogroup" aria-label={label}>
        {opcoes.map(({ nome, Icone }) => (
          <button
            key={nome}
            type="button"
            role="radio"
            aria-checked={valor === nome}
            aria-label={nome}
            className={`icon-opt${valor === nome ? ' icon-opt--on' : ''}`}
            onClick={() => onChange(nome)}
          >
            <Icone size={18} strokeWidth={1.5} />
          </button>
        ))}
      </div>
    </div>
  );
}
