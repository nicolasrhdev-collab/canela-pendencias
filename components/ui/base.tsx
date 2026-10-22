/* Componentes básicos do sistema Canela: ícone, botões, status, pontos, etiquetas, avatar, card e metadados. */
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { iniciais, tom } from '../../lib/formatos';
import type { TomItem, TomStatus } from '../../lib/regras';
import { TIPOS } from '../../lib/regras';
import type { Apto, Tipo, Urgencia } from '../../types';

export function cx(...c: (string | false | null | undefined)[]) { return c.filter(Boolean).join(' '); }

/* Ícone — Material Symbols Outlined por ligadura */
export function Icone({ nome, tamanho, cheio, className, style }: { nome: string; tamanho?: 16 | 18 | 24; cheio?: boolean; className?: string; style?: CSSProperties }) {
  return <span className={cx('cn-icon', tamanho && 'cn-icon--' + tamanho, cheio && 'cn-icon--fill', className)} aria-hidden="true" style={style}>{nome}</span>;
}

/* 1. Botão */
type Variante = 'filled' | 'outlined' | 'text';
interface PropsBotao extends ButtonHTMLAttributes<HTMLButtonElement> { variante?: Variante; icone?: string; iconeFim?: string; larguraTotal?: boolean }
export function Botao({ variante = 'filled', icone, iconeFim, larguraTotal, className, children, type = 'button', ...resto }: PropsBotao) {
  return (
    <button type={type} className={cx('cn-btn', 'cn-btn--' + variante, larguraTotal && 'cn-btn--full', className)} {...resto}>
      {icone && <Icone nome={icone} />}{children}{iconeFim && <Icone nome={iconeFim} />}
    </button>
  );
}

interface PropsBotaoLink extends AnchorHTMLAttributes<HTMLAnchorElement> { variante?: Variante; icone?: string; larguraTotal?: boolean }
export function BotaoLink({ variante = 'outlined', icone, larguraTotal, className, children, ...resto }: PropsBotaoLink) {
  return (
    <a className={cx('cn-btn', 'cn-btn--' + variante, larguraTotal && 'cn-btn--full', className)} {...resto}>
      {icone && <Icone nome={icone} />}{children}
    </a>
  );
}

export function Acoes({ children, empilhado, inicio, className, style }: { children: ReactNode; empilhado?: boolean; inicio?: boolean; className?: string; style?: CSSProperties }) {
  return <div className={cx('cn-actions', empilhado && 'cn-actions--empilhado', className)} style={inicio ? { justifyContent: 'flex-start', ...style } : style}>{children}</div>;
}

/* 15. Botão de ícone — 40 px visível, 48 px de toque */
interface PropsBotaoIcone extends ButtonHTMLAttributes<HTMLButtonElement> { icone: string; rotulo: string; tonal?: boolean; selecionado?: boolean }
export function BotaoIcone({ icone, rotulo, tonal, selecionado, className, type = 'button', ...resto }: PropsBotaoIcone) {
  return (
    <button type={type} className={cx('cn-icon-btn', tonal && 'cn-icon-btn--tonal', className)} aria-label={rotulo} title={rotulo}
      aria-pressed={selecionado === undefined ? undefined : selecionado} {...resto}>
      <Icone nome={icone} />
    </button>
  );
}

/* 2. Chip de status e pontos — a cor sempre vem junto com o texto */
export function Status({ tom: t, pequeno, children }: { tom: TomStatus | TomItem; pequeno?: boolean; children: ReactNode }) {
  return <span className={cx('cn-status', pequeno && 'cn-status--sm', 'cn-status--' + t)}>{children}</span>;
}
export function Ponto({ tom: t }: { tom: TomStatus | TomItem | 'tem' | 'caminho' | 'falta' }) {
  return <span className={'cn-dot cn-dot--' + t} aria-hidden="true" />;
}

/* 3. Etiquetas de 20 px */
export function Etiquetas({ children }: { children: ReactNode }) { return <span className="cn-tags">{children}</span>; }
export function Etiqueta({ tom: t, icone, children }: { tom: 'apto' | Tipo; icone?: string; children: ReactNode }) {
  return <span className={'cn-tag cn-tag--' + t}>{icone && <Icone nome={icone} />}{children}</span>;
}
/** Só Essencial tem etiqueta: a bandeira amarela, sem texto (o nome fica para o leitor de tela e no passar do mouse). */
export function EtiquetaUrgencia({ urgencia }: { urgencia: Urgencia }) {
  if (urgencia !== 'Essencial') return null;
  return <span className="cn-tag cn-tag--essencial" role="img" aria-label="Essencial" title="Essencial"><Icone nome="flag" cheio /></span>;
}
export function EtiquetaTipo({ tipo }: { tipo: Tipo }) { return <Etiqueta tom={tipo} icone={TIPOS[tipo].icone}>{TIPOS[tipo].rotulo}</Etiqueta>; }
export function EtiquetaApto({ apto, comIcone = true }: { apto: Apto; comIcone?: boolean }) {
  return <Etiqueta tom="apto" icone={comIcone ? 'apartment' : undefined}>{apto}</Etiqueta>;
}

/* 9. Avatar com iniciais */
export function Avatar({ nome, tamanho = 32, decorativo }: { nome: string; tamanho?: 24 | 32 | 36; decorativo?: boolean }) {
  return (
    <span className={cx('cn-avatar', tamanho === 24 && 'cn-avatar--24', tamanho === 36 && 'cn-avatar--36', tom(nome))}
      role={decorativo ? undefined : 'img'} aria-hidden={decorativo ? true : undefined} aria-label={decorativo ? undefined : nome} title={decorativo ? undefined : nome}>
      {iniciais(nome)}
    </span>
  );
}
export function Avatares({ nomes, max = 3, tamanho = 24 }: { nomes: string[]; max?: number; tamanho?: 24 | 32 }) {
  const extra = nomes.length - max;
  return (
    <span className="cn-avatars">
      {nomes.slice(0, max).map((n, i) => <Avatar key={n + i} nome={n} tamanho={tamanho} />)}
      {extra > 0 && <span className={cx('cn-avatar cn-avatar--mais', tamanho === 24 && 'cn-avatar--24')} role="img" aria-label={'mais ' + extra}>+{extra}</span>}
    </span>
  );
}

/* Card base e linha de metadados */
export function Cartao({ children, className, style, titulo, ...resto }: { children: ReactNode; className?: string; style?: CSSProperties; titulo?: string; 'aria-labelledby'?: string }) {
  return <section className={cx('cn-card', className)} style={style} aria-label={titulo} {...resto}>{children}</section>;
}
export function Meta({ icone, vencido, children, style }: { icone?: string; vencido?: boolean; children: ReactNode; style?: CSSProperties }) {
  return <span className={cx('cn-meta', vencido && 'cn-meta--vencido')} style={style}>{icone && <Icone nome={icone} />}{children}</span>;
}

/* 13. Caixa de aviso e de sucesso */
export function Aviso({ icone = 'info', titulo, sucesso, children, papel }: { icone?: string; titulo?: string; sucesso?: boolean; children?: ReactNode; papel?: 'status' | 'note' | 'alert' }) {
  return (
    <div className={cx('cn-notice', sucesso && 'cn-notice--sucesso')} role={papel ?? (sucesso ? 'status' : 'note')}>
      <Icone nome={icone} />
      <p>{titulo && <strong className="cn-notice__title">{titulo}</strong>}{children}</p>
    </div>
  );
}

/* 18. Estado vazio — sempre com texto e um botão */
export function Vazio({ titulo, texto, children, arte = true }: { titulo: string; texto: string; children?: ReactNode; arte?: boolean }) {
  return (
    <div className="cn-empty">
      {arte && (
        <svg className="cn-empty__art" viewBox="0 0 120 96" aria-hidden="true">
          <rect className="a" x="8" y="20" width="104" height="68" rx="12" />
          <rect className="b" x="24" y="8" width="72" height="72" rx="8" />
          <rect className="e" x="24" y="8" width="72" height="12" rx="6" />
          <rect className="c" x="36" y="32" width="48" height="8" rx="4" />
          <rect className="c" x="36" y="48" width="32" height="8" rx="4" />
          <circle className="d" cx="88" cy="68" r="16" />
          <path className="s" d="M81 68l5 5 9-10" style={{ stroke: 'var(--on-primary)' }} />
        </svg>
      )}
      <h3 className="cn-empty__title">{titulo}</h3>
      <p className="cn-empty__text">{texto}</p>
      {children}
    </div>
  );
}

/* Linha tocável de lista */
export function Linha({ icone, titulo, sub, subVencido, fim, onClick }: { icone: string; titulo: ReactNode; sub?: ReactNode; subVencido?: boolean; fim?: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className="app-row" onClick={onClick}>
      <Icone nome={icone} className="app-row__icone" />
      <span className="app-row__texto">
        <span className="title-small">{titulo}</span>
        {sub && <span className={subVencido ? 'cn-meta cn-meta--vencido' : 'body-small texto-apoio num'}>{sub}</span>}
      </span>
      {fim}
    </button>
  );
}
