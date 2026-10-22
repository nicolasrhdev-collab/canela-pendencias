/* Barra de progresso por unidade, board (colunas, abas, card), detalhe com histórico e lista de links. */
import { useRef, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { dataHora } from '../../lib/datas';
import { Avatar, cx, Icone, Ponto } from './base';
import type { TomStatus } from '../../lib/regras';

/* 8. Barra de progresso por unidade: um pedaço por unidade (verde tem, azul a caminho, cinza falta).
   Acima de 24 unidades vira blocos proporcionais. Com `precisa`, o total é o que precisa (ex.: "6 de 4" quando tem a mais).
   `naoVerificado`: item que ninguém verificou no apê, tudo cinza-claro e "? de 6".
   `semTotal`: sem o "3 de 12" na legenda (quando o número já aparece grande acima).
   `rotulo`: o que o leitor de tela fala no lugar da contagem (tarefa, serviço e pagamento não contam unidades). */
export function BarraUnidades({ tem, caminho, falta, precisa, compacto, semLegenda, semTotal, naoVerificado, rotulo }: { tem: number; caminho: number; falta: number; precisa?: number; compacto?: boolean; semLegenda?: boolean; semTotal?: boolean; naoVerificado?: boolean; rotulo?: string }) {
  if (naoVerificado) {
    const n = precisa ?? tem + caminho + falta, resumo = '? de ' + n;
    const barra = (
      <span className="cn-progress__bar" role="img" aria-label={'Não verificado: precisa de ' + n}>
        {n > 24 ? <span className="cn-progress__seg" /> : Array.from({ length: n }, (_, i) => <span key={i} className="cn-progress__seg" />)}
      </span>
    );
    if (compacto) return <span className="cn-progress cn-progress--compacto">{barra}<span className="cn-progress__legend"><span className="cn-progress__total">{resumo}</span></span></span>;
    return <div className="cn-progress">{barra}<div className="cn-progress__legend"><span className="cn-progress__key"><Ponto tom="nao-verificado" />Ainda não verificado no apê</span><span className="cn-progress__total">{resumo}</span></div></div>;
  }
  const total = tem + caminho + falta, junto = total > 24;
  const segs: { cls: string; grow: number }[] = [];
  const por = (tipo: string, n: number) => {
    if (!n) return;
    if (junto) segs.push({ cls: 'cn-progress__seg cn-progress__seg--' + tipo, grow: n });
    else for (let i = 0; i < n; i++) segs.push({ cls: 'cn-progress__seg cn-progress__seg--' + tipo, grow: 1 });
  };
  por('tem', tem); por('caminho', caminho); por('falta', falta);
  if (!segs.length) segs.push({ cls: 'cn-progress__seg', grow: 1 });
  const resumo = tem + ' de ' + (precisa ?? total);
  const aria = resumo + ': ' + tem + ' já tem, ' + caminho + ' a caminho, ' + falta + (falta === 1 ? ' falta' : ' faltam');
  const barra = <span className="cn-progress__bar" role="img" aria-label={rotulo ?? aria}>{segs.map((s, i) => <span key={i} className={s.cls} style={{ flexGrow: s.grow }} />)}</span>;
  const chaves = (
    <>
      <span className="cn-progress__key"><Ponto tom="tem" />{tem} tem</span>
      <span className="cn-progress__key"><Ponto tom="caminho" />{caminho} a caminho</span>
      <span className="cn-progress__key"><Ponto tom="falta" />{falta} {falta === 1 ? 'falta' : 'faltam'}</span>
    </>
  );
  if (compacto) {
    const linha = <span className="cn-progress cn-progress--compacto">{barra}<span className="cn-progress__legend"><span className="cn-progress__total">{resumo}</span></span></span>;
    if (semLegenda) return linha;
    return (
      <>
        {linha}
        <span className="cn-progress__legend" style={{ gap: 'var(--space-1) var(--space-3)' }}>{chaves}</span>
      </>
    );
  }
  return (
    <div className="cn-progress">
      {barra}
      <div className="cn-progress__legend">{chaves}{!semTotal && <span className="cn-progress__total">{resumo}</span>}</div>
    </div>
  );
}

/* 12. Board, colunas e abas do celular */
export function Board({ children }: { children: ReactNode }) { return <div className="cn-board">{children}</div>; }

export function Coluna({ id, titulo, tom, qtd, cabeca = true, children, rodape, estilo }: {
  id: string; titulo: string; tom: TomStatus; qtd: number; cabeca?: boolean; children: ReactNode; rodape?: ReactNode; estilo?: CSSProperties;
}) {
  return (
    <section className="cn-col" id={id} aria-label={titulo} style={estilo} role={cabeca ? undefined : 'tabpanel'}>
      {cabeca && <div className="cn-col__head"><Ponto tom={tom} /><h3 className="cn-col__title">{titulo}</h3><span className="cn-col__count">{qtd}</span></div>}
      <div className="cn-col__list">{children}</div>
      {rodape}
    </section>
  );
}

export function Abas<T extends string>({ rotulo, abas, ativa, aoMudar }: { rotulo: string; abas: { id: T; titulo: string; qtd: number; tom: TomStatus; controla: string }[]; ativa: T; aoMudar: (id: T) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const teclado = (e: KeyboardEvent, i: number) => {
    const k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!k) return;
    e.preventDefault();
    const j = (i + k + abas.length) % abas.length;
    refs.current[j]?.focus();
    aoMudar(abas[j].id);
  };
  return (
    <div className="cn-tabs" role="tablist" aria-label={rotulo}>
      {abas.map((a, i) => (
        <button key={a.id} ref={(el) => { refs.current[i] = el; }} type="button" className="cn-tab" role="tab" aria-selected={a.id === ativa} aria-controls={a.controla}
          tabIndex={a.id === ativa ? 0 : -1} onClick={() => aoMudar(a.id)} onKeyDown={(e) => teclado(e, i)}>
          <span className="cn-tab__top"><Ponto tom={a.tom} />{a.qtd}</span>{a.titulo}
        </button>
      ))}
    </div>
  );
}

/* 10. Card compacto do board */
export function CardBoard({ children, onClick, selecionado }: { children: ReactNode; onClick: () => void; selecionado?: boolean }) {
  return <button type="button" className="cn-board-card" aria-current={selecionado ? true : undefined} onClick={onClick}>{children}</button>;
}

/* 11. Card de detalhe e histórico */
export function Detalhe({ children, idTitulo, className }: { children: ReactNode; idTitulo: string; className?: string }) {
  return <article className={cx('cn-detail', className)} aria-labelledby={idTitulo}>{children}</article>;
}
export function SecaoDetalhe({ titulo, children, acao }: { titulo: string; children: ReactNode; acao?: ReactNode }) {
  return (
    <section className="cn-detail__section">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <h3 className="cn-detail__section-title" style={{ flex: 1 }}>{titulo}</h3>{acao}
      </div>
      {children}
    </section>
  );
}
export function RodapeDetalhe({ children }: { children: ReactNode }) { return <div className="cn-detail__foot cn-actions">{children}</div>; }

export interface ItemHistorico { txt: string; em: string; nome: string | null }
export function Historico({ itens }: { itens: ItemHistorico[] }) {
  return (
    <ol className="cn-history">
      {itens.map((h, i) => (
        <li key={i}>
          {h.nome
            ? <Avatar nome={h.nome} tamanho={24} decorativo />
            : <span className="cn-avatar cn-avatar--24 cn-avatar--t3" aria-hidden="true"><Icone nome="autorenew" tamanho={16} /></span>}
          <div><p className="body-medium">{h.txt}</p><time dateTime={h.em}>{dataHora(h.em)}</time></div>
        </li>
      ))}
    </ol>
  );
}

/* 14. Lista de links */
export function ListaLinks({ children }: { children: ReactNode }) { return <ul className="cn-links">{children}</ul>; }
export function ItemLink({ href, texto, preco, icone = 'link', iconeFim, onClick }: { href: string; texto: string; preco?: string; icone?: string; iconeFim?: string; onClick?: (e: MouseEvent) => void }) {
  const externo = /^https?:/i.test(href);
  return (
    <li>
      <a className="cn-links__item" href={href} target={externo ? '_blank' : undefined} rel={externo ? 'noopener noreferrer' : undefined} onClick={onClick}>
        <Icone nome={icone} /><span className="cn-links__text">{texto}</span>
        {preco && <span className="cn-links__price">{preco}</span>}
        {iconeFim && <Icone nome={iconeFim} />}
      </a>
    </li>
  );
}
