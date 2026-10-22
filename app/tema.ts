/* Tema: segue o aparelho por padrão; a pessoa pode fixar claro ou noturno (guardado neste aparelho). */
import { useCallback, useEffect, useState } from 'react';

export type PrefTema = 'auto' | 'claro' | 'noturno';
const CHAVE = 'canela-tema';
const mq = () => window.matchMedia('(prefers-color-scheme: dark)');

function ler(): PrefTema {
  try { const v = localStorage.getItem(CHAVE); return v === 'claro' || v === 'noturno' ? v : 'auto'; } catch { return 'auto'; }
}

export interface Tema { pref: PrefTema; resolvido: 'claro' | 'noturno'; definir: (p: PrefTema) => void; alternar: () => void }

export function useTema(): Tema {
  const [pref, setPref] = useState<PrefTema>(ler);
  const [escuro, setEscuro] = useState(() => mq().matches);
  useEffect(() => {
    const m = mq(), f = () => setEscuro(m.matches);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  const resolvido = pref === 'auto' ? (escuro ? 'noturno' : 'claro') : pref;
  useEffect(() => {
    document.documentElement.setAttribute('data-tema', resolvido);
    const cor = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', cor);
  }, [resolvido]);
  const definir = useCallback((p: PrefTema) => {
    setPref(p);
    try { if (p === 'auto') localStorage.removeItem(CHAVE); else localStorage.setItem(CHAVE, p); } catch { /* sem armazenamento */ }
  }, []);
  const alternar = useCallback(() => definir(resolvido === 'noturno' ? 'claro' : 'noturno'), [definir, resolvido]);
  return { pref, resolvido, definir, alternar };
}

export function useMedia(consulta: string) {
  const [ok, setOk] = useState(() => window.matchMedia(consulta).matches);
  useEffect(() => {
    const m = window.matchMedia(consulta), f = () => setOk(m.matches);
    m.addEventListener('change', f);
    f();
    return () => m.removeEventListener('change', f);
  }, [consulta]);
  return ok;
}
