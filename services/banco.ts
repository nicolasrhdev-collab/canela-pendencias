/* Onde os dados moram: Firestore (compartilhado, em tempo real) ou o navegador (modo de teste).
   As duas versões têm a mesma cara: ouvir() recebe o banco inteiro a cada mudança; gravar() aplica escritas. */
import { collection, doc, getDoc, onSnapshot, writeBatch } from 'firebase/firestore';
import type { Banco, ColecaoLista, Op } from '../types';
import { bancoVazio, COLECOES_LISTA } from '../types';
import { normalizarBanco, simular } from '../lib/acoes';
import { firebase } from './firebase';

export interface Store {
  modo: 'firebase' | 'local';
  ouvir(cb: (db: Banco) => void, erro: (e: unknown) => void): () => void;
  gravar(ops: Op[]): Promise<void>;
}

const limpar = (o: object) => JSON.parse(JSON.stringify(o));

/* ——— Firestore ——— */
export function storeFirestore(): Store {
  const { fs } = firebase();
  return {
    modo: 'firebase',
    ouvir(cb, erro) {
      const bruto: Record<string, unknown> = {};
      const prontos = new Set<string>();
      const total = COLECOES_LISTA.length + 1;
      const emitir = () => { if (prontos.size >= total) cb(normalizarBanco(bruto)); };
      const subs = COLECOES_LISTA.map((col: ColecaoLista) =>
        onSnapshot(collection(fs, col), (snap) => {
          bruto[col] = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
          prontos.add(col);
          emitir();
        }, erro));
      subs.push(onSnapshot(doc(fs, 'config', 'geral'), (snap) => {
        bruto.config = snap.data() ?? {};
        prontos.add('config');
        emitir();
      }, erro));
      return () => subs.forEach((u) => u());
    },
    async gravar(ops) {
      for (let i = 0; i < ops.length; i += 450) {
        const lote = writeBatch(fs);
        ops.slice(i, i + 450).forEach((o) => {
          const ref = doc(fs, o.col, o.id);
          if (o.data) lote.set(ref, limpar(o.data)); else lote.delete(ref);
        });
        await lote.commit();
      }
    },
  };
}

export type Acesso = 'permitido' | 'sem-dono' | 'negado';

/** Confere se o e-mail está na lista. Sem dono ainda = primeiro acesso. */
export async function verificarAcesso(email: string): Promise<Acesso> {
  const { fs } = firebase();
  const meu = await getDoc(doc(fs, 'acesso', email));
  if (meu.exists()) return 'permitido';
  const dono = await getDoc(doc(fs, 'config', 'dono'));
  return dono.exists() ? 'negado' : 'sem-dono';
}

/** Primeiro acesso: quem entra primeiro vira o dono e a primeira pessoa da lista. */
export async function criarPrimeiroAcesso(email: string, ops: Op[]) {
  const { fs } = firebase();
  const lote = writeBatch(fs);
  lote.set(doc(fs, 'config', 'dono'), { email, em: new Date().toISOString() });
  ops.forEach((o) => { if (o.data) lote.set(doc(fs, o.col, o.id), limpar(o.data)); });
  await lote.commit();
}

/* ——— Modo de teste: tudo no localStorage deste navegador ——— */
const CHAVE = 'canela-teste-dados';

export function lerLocal(): Banco {
  try {
    const t = localStorage.getItem(CHAVE);
    return t ? normalizarBanco(JSON.parse(t)) : bancoVazio();
  } catch { return bancoVazio(); }
}

export function storeLocal(): Store {
  const ouvintes = new Set<(db: Banco) => void>();
  let atual = lerLocal();
  const avisar = () => ouvintes.forEach((f) => f(atual));
  window.addEventListener('storage', (e) => { if (e.key === CHAVE) { atual = lerLocal(); avisar(); } });
  return {
    modo: 'local',
    ouvir(cb) {
      ouvintes.add(cb);
      setTimeout(() => cb(atual), 0);
      return () => { ouvintes.delete(cb); };
    },
    async gravar(ops) {
      atual = simular(atual, ops);
      try { localStorage.setItem(CHAVE, JSON.stringify(atual)); } catch { /* sem espaço: segue só na memória */ }
      avisar();
    },
  };
}
