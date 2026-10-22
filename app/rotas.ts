/* Navegação por endereço (#/pendencias?p=ID, #/inicio?nova=1). O botão Voltar do celular funciona. */
import { useCallback, useEffect, useState } from 'react';

export type Tela = 'inicio' | 'pendencias' | 'inventario' | 'calendario' | 'infos' | 'config';
const TELAS: Tela[] = ['inicio', 'pendencias', 'inventario', 'calendario', 'infos', 'config'];

/** `nova` = a janela "Nova pendência" aberta por cima da tela. */
export interface Rota { tela: Tela; p: string | null; nova: boolean }

/** `p` do item junto (opção "Todos" do inventário): este prefixo + o id de um dos itens. */
export const PREFIXO_JUNTO = 'todos:';

function ler(): Rota {
  const h = window.location.hash.replace(/^#\/?/, '');
  const [caminho, q] = h.split('?');
  if (caminho === 'nova') return { tela: 'pendencias', p: null, nova: true }; // endereço antigo
  const tela = (TELAS as string[]).includes(caminho) ? (caminho as Tela) : 'inicio';
  const busca = new URLSearchParams(q || '');
  const nova = busca.get('nova') === '1';
  return { tela, p: nova ? null : busca.get('p'), nova };
}
function endereco(r: Rota) { return '#/' + r.tela + (r.nova ? '?nova=1' : r.p ? '?p=' + encodeURIComponent(r.p) : ''); }

interface Estado { prof?: number }

export function useRota() {
  const [rota, setRota] = useState<Rota>(ler);
  useEffect(() => {
    const f = () => setRota(ler());
    window.addEventListener('popstate', f);
    window.addEventListener('hashchange', f);
    return () => { window.removeEventListener('popstate', f); window.removeEventListener('hashchange', f); };
  }, []);

  const ir = useCallback((tela: Tela, p: string | null = null, substituir = false) => {
    const atual = (window.history.state as Estado | null)?.prof ?? 0;
    const r = { tela, p, nova: false };
    if (substituir) window.history.replaceState({ prof: p ? atual : 0 }, '', endereco(r));
    else window.history.pushState({ prof: p ? atual + 1 : 0 }, '', endereco(r));
    setRota(r);
  }, []);

  /** Fecha o detalhe e volta para a lista de onde veio. */
  const fechar = useCallback((tela: Tela) => {
    const prof = (window.history.state as Estado | null)?.prof ?? 0;
    if (prof > 0) window.history.go(-prof);
    else { window.history.replaceState({ prof: 0 }, '', endereco({ tela, p: null, nova: false })); setRota({ tela, p: null, nova: false }); }
  }, []);

  /** Abre a janela "Nova pendência" por cima da tela atual. */
  const abrirNova = useCallback(() => {
    const atual = (window.history.state as Estado | null)?.prof ?? 0;
    const r = { ...ler(), p: null, nova: true };
    window.history.pushState({ prof: atual + 1 }, '', endereco(r));
    setRota(r);
  }, []);

  /** Fecha só a janela e volta exatamente para onde estava. */
  const fecharNova = useCallback(() => {
    const prof = (window.history.state as Estado | null)?.prof ?? 0;
    if (prof > 0) { window.history.back(); return; }
    const r = { ...ler(), nova: false };
    window.history.replaceState({ prof: 0 }, '', endereco(r));
    setRota(r);
  }, []);

  return { rota, ir, fechar, abrirNova, fecharNova };
}
