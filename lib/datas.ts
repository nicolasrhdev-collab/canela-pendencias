/* Datas no formato brasileiro. Internamente: AAAA-MM-DD (e AAAA-MM-DDTHH:MM:SS no histórico). */

export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

function d2(n: number) { return (n < 10 ? '0' : '') + n; }

export function paraData(s: string) {
  const [a, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(a, m - 1, d);
}
export function iso(dt: Date) { return dt.getFullYear() + '-' + d2(dt.getMonth() + 1) + '-' + d2(dt.getDate()); }
export function hojeIso() { return iso(new Date()); }
export function agoraIso() {
  const dt = new Date();
  return iso(dt) + 'T' + d2(dt.getHours()) + ':' + d2(dt.getMinutes()) + ':' + d2(dt.getSeconds());
}

/** AAAA-MM-DD → DD/MM/AAAA */
export function br(s?: string | null) {
  if (!s) return '';
  const [a, m, d] = s.slice(0, 10).split('-');
  return d + '/' + m + '/' + a;
}
/** Data e hora do histórico: 21/10/2026 às 14:32 */
export function dataHora(s: string) { return br(s) + (s.length > 10 ? ' às ' + s.slice(11, 16) : ''); }

/** DD/MM/AAAA → AAAA-MM-DD, ou null se a data não existe. */
export function deBR(t?: string | null): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(t || '').trim());
  if (!m) return null;
  const dt = new Date(+m[3], +m[2] - 1, +m[1]);
  if (dt.getDate() !== +m[1] || dt.getMonth() !== +m[2] - 1) return null;
  return iso(dt);
}

/** Coloca as barras sozinho enquanto a pessoa digita: 25102026 → 25/10/2026 */
export function mascaraData(t: string) {
  const n = String(t || '').replace(/\D/g, '').slice(0, 8);
  if (n.length > 4) return n.slice(0, 2) + '/' + n.slice(2, 4) + '/' + n.slice(4);
  if (n.length > 2) return n.slice(0, 2) + '/' + n.slice(2);
  return n;
}

export function dias(de: string, ate: string) { return Math.round((paraData(ate).getTime() - paraData(de).getTime()) / 86400000); }
export function somar(s: string, n: number) { const dt = paraData(s); dt.setDate(dt.getDate() + n); return iso(dt); }

export function quandoTexto(s: string, hoje: string) {
  const n = dias(hoje, s);
  if (n === 0) return 'Hoje';
  if (n === 1) return 'Amanhã';
  if (n === -1) return 'Ontem';
  if (n > 1) return 'Em ' + n + ' dias';
  return 'Há ' + -n + ' dias';
}

/** Terça, 21 de outubro */
export function diaExtenso(s: string) {
  const dt = paraData(s), w = SEMANA[dt.getDay()];
  return w.charAt(0).toUpperCase() + w.slice(1) + ', ' + dt.getDate() + ' de ' + MESES[dt.getMonth()];
}

/** Domingo da semana do dia. */
export function inicioSemana(s: string) { return somar(s, -paraData(s).getDay()); }
