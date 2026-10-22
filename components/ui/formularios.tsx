/* Componentes de formulário do sistema Canela: chips de escolha, controle segmentado, campo de texto e contador.
   Rótulo sempre acima do campo; o exemplo no placeholder nunca substitui o rótulo. */
import { useEffect, useId, useRef, useState, type CSSProperties, type HTMLAttributes, type KeyboardEvent, type ReactNode } from 'react';
import { mascaraData } from '../../lib/datas';
import { mascaraTelefone } from '../../lib/formatos';
import { cx, Icone } from './base';

export interface Opcao<T extends string> { valor: T; rotulo: string; icone?: string }

/* 4. Chips de escolha */
export function Chip({ selecionado, onClick, children, disabled }: { selecionado: boolean; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button type="button" className="cn-chip" aria-pressed={selecionado} onClick={onClick} disabled={disabled}>
      <Icone nome="check" className="cn-chip__check" />{children}
    </button>
  );
}

function Erro({ texto, id }: { texto?: string; id?: string }) {
  if (!texto) return null;
  return <p className="cn-field__help app-erro" id={id} role="alert"><Icone nome="error" />{texto}</p>;
}

/** Uma pergunta com chips: escolhe uma opção. */
export function Escolha<T extends string>({ rotulo, opcoes, valor, aoMudar, ajuda, erro, style }: {
  rotulo: string; opcoes: Opcao<T>[]; valor: T | null | undefined; aoMudar: (v: T) => void; ajuda?: string; erro?: string; style?: CSSProperties;
}) {
  const id = useId();
  return (
    <div className="app-pergunta" style={style}>
      <p className="cn-field__label" id={id}>{rotulo}</p>
      <div className="cn-chips" role="group" aria-labelledby={id}>
        {opcoes.map((o) => <Chip key={o.valor} selecionado={valor === o.valor} onClick={() => aoMudar(o.valor)}>{o.rotulo}</Chip>)}
      </div>
      {erro ? <Erro texto={erro} /> : ajuda && <p className="cn-field__help">{ajuda}</p>}
    </div>
  );
}

/** Uma pergunta com chips: marca várias. */
export function EscolhaVarias<T extends string>({ rotulo, opcoes, valores, aoMudar, ajuda }: {
  rotulo: string; opcoes: Opcao<T>[]; valores: T[]; aoMudar: (v: T[]) => void; ajuda?: string;
}) {
  const id = useId();
  const alternar = (v: T) => aoMudar(valores.includes(v) ? valores.filter((x) => x !== v) : [...valores, v]);
  return (
    <div className="app-pergunta">
      <p className="cn-field__label" id={id}>{rotulo}</p>
      <div className="cn-chips" role="group" aria-labelledby={id}>
        {opcoes.map((o) => <Chip key={o.valor} selecionado={valores.includes(o.valor)} onClick={() => alternar(o.valor)}>{o.rotulo}</Chip>)}
      </div>
      {ajuda && <p className="cn-field__help">{ajuda}</p>}
    </div>
  );
}

/* 5. Controle segmentado */
export function Segmentado<T extends string>({ rotulo, opcoes, valor, aoMudar, empilhado, erro }: {
  rotulo: string; opcoes: Opcao<T>[]; valor: T | null | undefined; aoMudar: (v: T) => void; empilhado?: boolean; erro?: string;
}) {
  const id = useId();
  return (
    <div className="app-pergunta">
      <p className="cn-field__label" id={id}>{rotulo}</p>
      <div className={cx('cn-seg', empilhado && 'cn-seg--empilhado')} role="group" aria-labelledby={id}>
        {opcoes.map((o) => (
          <button key={o.valor} type="button" className="cn-seg__opt" aria-pressed={valor === o.valor} onClick={() => aoMudar(o.valor)}>
            {o.icone && <Icone nome={o.icone} />}<span className="cn-seg__label">{o.rotulo}</span>
          </button>
        ))}
      </div>
      <Erro texto={erro} />
    </div>
  );
}

/* 6. Campo de texto */
export interface PropsCampo {
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  exemplo?: string;
  icone?: string;
  prefixo?: string;
  ajuda?: string;
  erro?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode'];
  tipo?: string;
  multilinha?: boolean;
  larguraMax?: number;
  desabilitado?: boolean;
  autoFocus?: boolean;
  autoComplete?: string;
  /** O rótulo já aparece acima, como título da pergunta (ex.: passo 2 da Nova pendência). */
  idExterno?: string;
  formatar?: (v: string) => string;
  aoEnter?: () => void;
}

export function Campo(p: PropsCampo) {
  const idGerado = useId();
  const id = p.idExterno || idGerado;
  const idAjuda = id + '-ajuda';
  const aoMudar = (v: string) => p.aoMudar(p.formatar ? p.formatar(v) : v);
  const comum = {
    id, className: 'cn-field__input', value: p.valor, placeholder: p.exemplo, disabled: p.desabilitado, autoFocus: p.autoFocus,
    'aria-invalid': p.erro ? true : undefined, 'aria-describedby': p.erro || p.ajuda ? idAjuda : undefined,
  };
  return (
    <div className={cx('cn-field', p.erro && 'cn-field--erro', p.desabilitado && 'cn-field--desabilitado')} style={p.larguraMax ? { maxWidth: p.larguraMax } : undefined}>
      {!p.idExterno && <label className="cn-field__label" htmlFor={id}>{p.rotulo}</label>}
      <div className="cn-field__control">
        {p.icone && <Icone nome={p.icone} />}
        {p.prefixo && <span className="cn-field__affix">{p.prefixo}</span>}
        {p.multilinha
          ? <textarea {...comum} rows={3} onChange={(e) => aoMudar(e.target.value)} />
          : <input {...comum} type={p.tipo || 'text'} inputMode={p.inputMode} autoComplete={p.autoComplete}
              onChange={(e) => aoMudar(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && p.aoEnter) { e.preventDefault(); p.aoEnter(); } }} />}
      </div>
      {p.erro ? <p className="cn-field__help" id={idAjuda}><Icone nome="error" />{p.erro}</p>
        : p.ajuda ? <p className="cn-field__help" id={idAjuda}>{p.ajuda}</p> : null}
    </div>
  );
}

export function CampoData(p: Omit<PropsCampo, 'formatar' | 'inputMode' | 'icone'>) {
  return <Campo larguraMax={280} exemplo="Ex.: 25/10/2026" {...p} icone="event" inputMode="numeric" formatar={mascaraData} />;
}
export function CampoValor(p: Omit<PropsCampo, 'prefixo' | 'inputMode'>) {
  return <Campo larguraMax={280} exemplo="Ex.: 159,90" {...p} prefixo="R$" inputMode="decimal" />;
}
export function CampoTelefone(p: Omit<PropsCampo, 'formatar' | 'inputMode' | 'icone' | 'tipo'>) {
  return <Campo larguraMax={280} exemplo="Ex.: (54) 99999-0000" {...p} icone="call" inputMode="tel" tipo="tel" formatar={mascaraTelefone} />;
}

/* 6b. Menu suspenso: campo que abre uma lista flutuante (padrão listbox: setas, Enter, Esc, Home/End).
   `destacado` = filtro ligado. */
export function Seletor<T extends string>({ rotulo, opcoes, valor, aoMudar, destacado }: {
  rotulo: string; opcoes: Opcao<T>[]; valor: T; aoMudar: (v: T) => void; destacado?: boolean;
}) {
  const id = useId();
  const [aberto, setAberto] = useState(false);
  const [foco, setFoco] = useState(0);
  const raiz = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const atual = Math.max(0, opcoes.findIndex((o) => o.valor === valor));

  useEffect(() => {
    if (!aberto) return;
    lista.current?.focus({ preventScroll: true });
    const fora = (e: PointerEvent) => { if (!raiz.current?.contains(e.target as Node)) setAberto(false); };
    document.addEventListener('pointerdown', fora);
    return () => document.removeEventListener('pointerdown', fora);
  }, [aberto]);
  /* Mantém a opção em foco visível rolando só a lista, nunca a página. */
  useEffect(() => {
    const l = lista.current, op = l?.children[foco] as HTMLElement | undefined;
    if (!l || !op) return;
    if (op.offsetTop < l.scrollTop) l.scrollTop = op.offsetTop;
    else if (op.offsetTop + op.offsetHeight > l.scrollTop + l.clientHeight) l.scrollTop = op.offsetTop + op.offsetHeight - l.clientHeight;
  }, [aberto, foco]);

  const abrir = () => { setFoco(atual); setAberto(true); };
  const fechar = () => { setAberto(false); botao.current?.focus(); };
  const escolher = (i: number) => { aoMudar(opcoes[i].valor); fechar(); };
  const teclaBotao = (e: KeyboardEvent) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); abrir(); }
  };
  const teclaLista = (e: KeyboardEvent) => {
    if (e.key === 'Tab') { setAberto(false); return; }
    const ultimo = opcoes.length - 1;
    const acoes: Record<string, () => void> = {
      ArrowDown: () => setFoco((i) => Math.min(ultimo, i + 1)), ArrowUp: () => setFoco((i) => Math.max(0, i - 1)),
      Home: () => setFoco(0), End: () => setFoco(ultimo), Enter: () => escolher(foco), ' ': () => escolher(foco), Escape: fechar,
    };
    if (acoes[e.key]) { e.preventDefault(); acoes[e.key](); }
  };

  return (
    <div className={cx('cn-field', 'cn-select', destacado && 'cn-select--ativo', aberto && 'is-open')} ref={raiz}>
      <span className="cn-field__label" id={id + '-rotulo'}>{rotulo}</span>
      <div className="cn-field__control">
        <button ref={botao} id={id + '-botao'} type="button" className="cn-select__botao" aria-haspopup="listbox" aria-expanded={aberto}
          aria-labelledby={id + '-rotulo ' + id + '-botao'} onClick={() => (aberto ? setAberto(false) : abrir())} onKeyDown={teclaBotao}>
          {opcoes[atual]?.rotulo}
        </button>
        <Icone nome="expand_more" className="cn-select__seta" />
      </div>
      {aberto && (
        <ul ref={lista} className="cn-menu" role="listbox" tabIndex={-1} aria-labelledby={id + '-rotulo'}
          aria-activedescendant={id + '-op-' + foco} onKeyDown={teclaLista}>
          {opcoes.map((o, i) => (
            <li key={o.valor} id={id + '-op-' + i} role="option" aria-selected={i === atual}
              className={cx('cn-menu__item', i === foco && 'is-focus')} onClick={() => escolher(i)} onPointerMove={() => setFoco(i)}>
              <Icone nome="check" className="cn-menu__check" />{o.rotulo}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* 7. Contador de quantidade */
export function Contador({ valor, aoMudar, min = 0, max = Infinity, rotuloMenos = 'Diminuir', rotuloMais = 'Aumentar', idRotulo, desabilitado }: {
  valor: number; aoMudar: (v: number) => void; min?: number; max?: number; rotuloMenos?: string; rotuloMais?: string; idRotulo?: string; desabilitado?: boolean;
}) {
  return (
    <div className={cx('cn-counter', desabilitado && 'is-disabled')} role="group" aria-labelledby={idRotulo} style={{ alignSelf: 'flex-start' }}>
      <button type="button" className="cn-counter__btn" aria-label={rotuloMenos} disabled={desabilitado || valor <= min} onClick={() => aoMudar(Math.max(min, valor - 1))}><Icone nome="remove" /></button>
      <output className="cn-counter__value" aria-live="polite">{valor}</output>
      <button type="button" className="cn-counter__btn" aria-label={rotuloMais} disabled={desabilitado || valor >= max} onClick={() => aoMudar(Math.min(max, valor + 1))}><Icone nome="add" /></button>
    </div>
  );
}

/** Pergunta com contador: rótulo, contador e ajuda. */
export function PerguntaContador({ rotulo, ajuda, ...c }: { rotulo: string; ajuda?: string } & Omit<Parameters<typeof Contador>[0], 'idRotulo'>) {
  const id = useId();
  return (
    <div className="app-pergunta">
      <p className="cn-field__label" id={id}>{rotulo}</p>
      <Contador idRotulo={id} {...c} />
      {ajuda && <p className="cn-field__help num">{ajuda}</p>}
    </div>
  );
}
