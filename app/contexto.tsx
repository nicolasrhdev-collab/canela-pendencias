/* Estado do app aberto: banco em tempo real, quem está usando, navegação, avisos com "Desfazer" e confirmações. */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Banco, Op, Pessoa } from '../types';
import { inverso, type Ctx, type Res } from '../lib/acoes';
import { agoraIso, hojeIso } from '../lib/datas';
import { automacoes, type Coluna } from '../lib/regras';
import type { Store } from '../services/banco';
import { Dialogo, Snackbar } from '../components/ui';
import { useRota, type Rota, type Tela } from './rotas';
import type { Tema } from './tema';

export interface Filtros { apto: string; tipo: string; urg: string; resp: string; status: string; casa: boolean }
export const FILTROS_VAZIOS: Filtros = { apto: 'todos', tipo: 'todos', urg: 'todos', resp: 'todos', status: 'todos', casa: false };
/** Como o board abre: só o apê 306 (e o que é dos dois). "Limpar filtros" volta para FILTROS_VAZIOS. */
export const FILTROS_INICIAIS: Filtros = { ...FILTROS_VAZIOS, apto: '306' };

/** Filtros do inventário (ficam aqui para não sumirem ao abrir e fechar um item no celular). `sit` usa as colunas: pendente = faltando.
    `grupo` = onde fica no apê; "sem" = itens sem lugar. */
export interface FiltrosInv { apto: string; sit: string; grupo: string }
export const FILTROS_INV_VAZIOS: FiltrosInv = { apto: 'todos', sit: 'todos', grupo: 'todos' };

interface Confirmacao { titulo: string; texto: string; acao: string; icone?: string }

export interface ValorApp {
  db: Banco;
  eu: Pessoa;
  email: string;
  hoje: string;
  celular: boolean;
  modo: Store['modo'];
  tema: Tema;
  ctx: () => Ctx;
  /** Roda uma ação, grava e mostra o aviso com "Desfazer". Devolve o resultado da ação. */
  fazer: <R extends Res>(acao: (c: Ctx) => R, opcoes?: { semDesfazer?: boolean }) => R;
  gravarDireto: (ops: Op[]) => void;
  avisar: (texto: string) => void;
  confirmar: (c: Confirmacao) => Promise<boolean>;
  rota: Rota;
  ir: (tela: Tela, p?: string | null, substituir?: boolean) => void;
  abrir: (id: string) => void;
  fechar: () => void;
  /** Janela "Nova pendência" por cima da tela atual. */
  abrirNova: () => void;
  fecharNova: () => void;
  filtros: Filtros;
  setFiltros: (f: Filtros) => void;
  filtrosInv: FiltrosInv;
  setFiltrosInv: (f: FiltrosInv) => void;
  aba: Coluna;
  setAba: (c: Coluna) => void;
  sair: () => void;
}

const Contexto = createContext<ValorApp | null>(null);
export function useApp() {
  const v = useContext(Contexto);
  if (!v) throw new Error('useApp fora do AppProvider');
  return v;
}

function useHoje() {
  const [hoje, setHoje] = useState(hojeIso);
  useEffect(() => {
    const t = window.setInterval(() => setHoje((h) => (h === hojeIso() ? h : hojeIso())), 60000);
    return () => window.clearInterval(t);
  }, []);
  return hoje;
}

interface Aviso { id: number; texto: string; desfazer: Op[] | null }

export function AppProvider({ store, db, email, celular, tema, sair, children }: {
  store: Store; db: Banco; email: string; celular: boolean; tema: Tema; sair: () => void; children: ReactNode;
}) {
  const hoje = useHoje();
  const { rota, ir, fechar: fecharRota, abrirNova, fecharNova } = useRota();
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [pergunta, setPergunta] = useState<(Confirmacao & { responder: (ok: boolean) => void }) | null>(null);
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIAIS);
  const [filtrosInv, setFiltrosInv] = useState<FiltrosInv>(FILTROS_INV_VAZIOS);
  const [aba, setAba] = useState<Coluna>('pendente');
  const timer = useRef<number>(0);
  const dbRef = useRef(db);
  dbRef.current = db;

  const eu = useMemo<Pessoa>(() => db.pessoas.find((p) => p.email === email) ?? { id: 'sem-cadastro', nome: email.split('@')[0] || 'Você', email, local: 'fora' }, [db.pessoas, email]);
  const euRef = useRef(eu);
  euRef.current = eu;

  const mostrar = useCallback((texto: string, desfazer: Op[] | null) => {
    window.clearTimeout(timer.current);
    const id = Date.now();
    setAviso({ id, texto, desfazer });
    timer.current = window.setTimeout(() => setAviso((a) => (a && a.id === id ? null : a)), 6000);
  }, []);
  const avisar = useCallback((texto: string) => mostrar(texto, null), [mostrar]);

  const gravarDireto = useCallback((ops: Op[]) => {
    if (!ops.length) return;
    store.gravar(ops).catch((e) => {
      console.error(e);
      mostrar('Não deu para salvar. Confira a internet e tente de novo.', null);
    });
  }, [store, mostrar]);

  const ctx = useCallback((): Ctx => ({ db: dbRef.current, eu: euRef.current, hoje: hojeIso(), agora: agoraIso() }), []);

  const fazer = useCallback(<R extends Res>(acao: (c: Ctx) => R, opcoes?: { semDesfazer?: boolean }): R => {
    const c = ctx();
    const r = acao(c);
    if (!r.ops.length) return r;
    const inv = opcoes?.semDesfazer ? null : inverso(c.db, r.ops);
    gravarDireto(r.ops);
    if (r.msg) mostrar(r.msg, inv);
    return r;
  }, [ctx, gravarDireto, mostrar]);

  const desfazer = () => {
    if (!aviso?.desfazer) return;
    gravarDireto(aviso.desfazer);
    mostrar('Pronto, desfeito.', null);
  };

  const confirmar = useCallback((c: Confirmacao) => new Promise<boolean>((responder) => setPergunta({ ...c, responder })), []);

  /* Automações (retirada na agência, compra criada pelo inventário). Os ids fixos evitam duplicar entre aparelhos. */
  const tentadas = useRef(new Set<string>());
  useEffect(() => {
    if (eu.id === 'sem-cadastro') return;
    const ops = automacoes(db, hoje, agoraIso()).filter((o) => !tentadas.current.has(o.id));
    if (!ops.length) return;
    ops.forEach((o) => tentadas.current.add(o.id));
    gravarDireto(ops);
  }, [db, hoje, eu.id, gravarDireto]);

  const abrir = useCallback((id: string) => ir(rota.tela, id), [ir, rota.tela]);
  const fechar = useCallback(() => fecharRota(rota.tela), [fecharRota, rota.tela]);

  const valor: ValorApp = {
    db, eu, email, hoje, celular, modo: store.modo, tema, ctx, fazer, gravarDireto, avisar, confirmar,
    rota, ir, abrir, fechar, abrirNova, fecharNova, filtros, setFiltros, filtrosInv, setFiltrosInv, aba, setAba, sair,
  };

  return (
    <Contexto.Provider value={valor}>
      {children}
      {aviso && <Snackbar key={aviso.id} texto={aviso.texto} celular={celular} aoDesfazer={aviso.desfazer ? desfazer : undefined} aoFechar={() => setAviso(null)} />}
      {pergunta && (
        <Dialogo icone={pergunta.icone} titulo={pergunta.titulo} texto={pergunta.texto} acao={pergunta.acao} perigo
          aoConfirmar={() => { pergunta.responder(true); setPergunta(null); }}
          aoCancelar={() => { pergunta.responder(false); setPergunta(null); }} />
      )}
    </Contexto.Provider>
  );
}
