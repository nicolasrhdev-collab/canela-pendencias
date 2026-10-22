/* 16–18. Barra superior, navegação, diálogo, folha inferior, painel lateral e snackbar. */
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Botao, cx, Icone } from './base';

/* Camadas abertas, da mais antiga para a de cima. Só a de cima responde ao teclado. */
const pilha: object[] = [];

/** Foco preso dentro da camada, Esc fecha e o foco volta para onde estava. */
function useCamada<T extends HTMLElement>(aoFechar: () => void) {
  const ref = useRef<T>(null);
  const fechar = useRef(aoFechar);
  fechar.current = aoFechar;
  useEffect(() => {
    const eu = {};
    pilha.push(eu);
    const antes = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const focaveis = () => Array.from(el?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])') ?? []);
    const primeiro = el?.querySelector<HTMLElement>('[data-foco-inicial]') ?? focaveis()[0];
    primeiro?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (pilha[pilha.length - 1] !== eu) return;
      if (e.key === 'Escape') { e.stopPropagation(); fechar.current(); return; }
      if (e.key !== 'Tab') return;
      const f = focaveis();
      if (!f.length) return;
      const i = f.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    };
    document.addEventListener('keydown', tecla, true);
    return () => {
      document.removeEventListener('keydown', tecla, true);
      const i = pilha.indexOf(eu);
      if (i >= 0) pilha.splice(i, 1);
      antes?.focus?.();
    };
  }, []);
  return ref;
}

/* 17. Diálogo — confirmação antes de excluir */
export function Dialogo({ icone, titulo, texto, acao, aoConfirmar, aoCancelar, perigo }: {
  icone?: string; titulo: string; texto: ReactNode; acao: string; aoConfirmar: () => void; aoCancelar: () => void; perigo?: boolean;
}) {
  const id = useId();
  const ref = useCamada<HTMLDivElement>(aoCancelar);
  return (
    <div className="cn-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) aoCancelar(); }}>
      <div className="cn-dialog" role="alertdialog" aria-modal="true" aria-labelledby={id} ref={ref}>
        {icone && <Icone nome={icone} tamanho={24} className="cn-dialog__icon" />}
        <h2 className="cn-dialog__title" id={id}>{titulo}</h2>
        <p className="cn-dialog__text">{texto}</p>
        <div className="cn-dialog__actions">
          <Botao variante="text" onClick={aoCancelar} data-foco-inicial={perigo ? true : undefined}>Cancelar</Botao>
          <Botao onClick={aoConfirmar}>{acao}</Botao>
        </div>
      </div>
    </div>
  );
}

/* 17. Folha inferior */
export function Folha({ titulo, texto, children, aoFechar }: { titulo: string; texto?: ReactNode; children: ReactNode; aoFechar: () => void }) {
  const id = useId();
  const ref = useCamada<HTMLDivElement>(aoFechar);
  return (
    <div className="cn-scrim cn-scrim--folha" onMouseDown={(e) => { if (e.target === e.currentTarget) aoFechar(); }}>
      <div className="cn-sheet" role="dialog" aria-modal="true" aria-labelledby={id} ref={ref}>
        <span className="cn-sheet__handle" aria-hidden="true" />
        <h2 className="cn-sheet__title" id={id}>{titulo}</h2>
        {texto && <p className="cn-sheet__text">{texto}</p>}
        {children}
      </div>
    </div>
  );
}

/** Janela (pop-up) para formulários: topo e rodapé fixos, o meio rola. No celular sobe de baixo, como a folha.
    `fecharFora` = tocar fora fecha (desligue quando já tem algo preenchido). */
export function Janela({ titulo, voltar, aoFechar, rodape, celular, fecharFora = true, children }: {
  titulo: string; voltar?: () => void; aoFechar: () => void; rodape?: ReactNode; celular?: boolean; fecharFora?: boolean; children: ReactNode;
}) {
  const id = useId();
  const ref = useCamada<HTMLDivElement>(aoFechar);
  return (
    <div className={cx('cn-scrim', celular && 'cn-scrim--folha')} onMouseDown={(e) => { if (fecharFora && e.target === e.currentTarget) aoFechar(); }}>
      <div className={cx('app-janela', celular && 'app-janela--celular')} role="dialog" aria-modal="true" aria-labelledby={id} ref={ref}>
        {celular && <span className="cn-sheet__handle" aria-hidden="true" />}
        <div className={cx('app-janela__topo', voltar && 'app-janela__topo--voltar')}>
          {voltar && <button type="button" className="cn-icon-btn" aria-label="Voltar" title="Voltar" onClick={voltar}><Icone nome="arrow_back" /></button>}
          <h2 className="app-janela__titulo" id={id}>{titulo}</h2>
          <button type="button" className="cn-icon-btn" aria-label="Fechar" title="Fechar" onClick={aoFechar}><Icone nome="close" /></button>
        </div>
        <div className="app-janela__corpo">{children}</div>
        {rodape && <div className="app-janela__rodape cn-actions">{rodape}</div>}
      </div>
    </div>
  );
}

/** Painel lateral do computador (adaptado da folha: mesma superfície, sombra e raio). */
export function Painel({ rotulo, children, aoFechar }: { rotulo: string; children: ReactNode; aoFechar: () => void }) {
  const ref = useCamada<HTMLDivElement>(aoFechar);
  return (
    <div className="app-painel-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) aoFechar(); }}>
      <div className="app-painel" role="dialog" aria-modal="true" aria-label={rotulo} ref={ref}>{children}</div>
    </div>
  );
}

/* 18. Snackbar — aviso curto com "Desfazer" */
export function Snackbar({ texto, aoDesfazer, aoFechar, celular }: { texto: string; aoDesfazer?: () => void; aoFechar: () => void; celular?: boolean }) {
  return (
    <div className={cx('cn-snackbar cn-snackbar--fixo', celular && 'app-snack-celular')} role="status" aria-live="polite">
      <span className="cn-snackbar__text">{texto}</span>
      {aoDesfazer && <button type="button" className="cn-snackbar__action" onClick={aoDesfazer}>Desfazer</button>}
      <button type="button" className="cn-snackbar__action" onClick={aoFechar}>Fechar</button>
    </div>
  );
}

/* 16. Barra superior */
export function BarraTopo({ titulo, voltar, children, className }: { titulo: string; voltar?: () => void; children?: ReactNode; className?: string }) {
  return (
    <header className={cx('cn-topbar', className)}>
      {voltar && <button type="button" className="cn-icon-btn" aria-label="Voltar" title="Voltar" onClick={voltar}><Icone nome="arrow_back" /></button>}
      <h1 className="cn-topbar__title">{titulo}</h1>
      {children}
    </header>
  );
}

export interface ItemNav { id: string; rotulo: string; icone: string }

/* 16. Navegação inferior do celular */
export function NavInferior({ itens, atual, aoIr }: { itens: ItemNav[]; atual: string; aoIr: (id: string) => void }) {
  return (
    <nav className="cn-navbar" aria-label="Principal">
      {itens.map((x) => (
        <button key={x.id} type="button" className="cn-nav__item app-nav-botao" aria-current={atual === x.id ? 'page' : undefined} onClick={() => aoIr(x.id)}>
          <span className="cn-nav__pill"><Icone nome={x.icone} /></span>{x.rotulo}
        </button>
      ))}
    </nav>
  );
}

/* Menu lateral do computador */
export function ItemLateral({ item, atual, aoIr }: { item: ItemNav; atual: boolean; aoIr: () => void }) {
  return (
    <button type="button" className="app-side-item" aria-current={atual ? 'page' : undefined} onClick={aoIr}>
      <Icone nome={item.icone} />{item.rotulo}
    </button>
  );
}
