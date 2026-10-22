/* Valores em R$, telefones, nomes e iniciais. */

const TONS = ['', 'cn-avatar--t2', 'cn-avatar--t3'];

/** 1234.56 → R$ 1.234,56 */
export function brl(v: number | null | undefined) {
  return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Texto digitado → número. Aceita 1.234,56 · 1234,56 · 39.90 · 450 */
export function valorDe(t?: string | null): number | null {
  let s = String(t || '').replace(/[^\d,.]/g, '');
  if (!s) return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/\.\d{1,2}$/.test(s)) { const i = s.lastIndexOf('.'); s = s.slice(0, i).replace(/\./g, '') + s.slice(i); }
  else s = s.replace(/\./g, '');
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

/** Número → texto para o campo (sem R$): 159.9 → 159,90 */
export function valorTexto(v: number | null | undefined) {
  return v == null ? '' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function iniciais(nome: string) {
  const p = String(nome || '').trim().split(/\s+/).filter(Boolean);
  if (!p.length) return '?';
  const b = p.length > 1 ? p[p.length - 1].charAt(0) : p[0].charAt(1);
  return (p[0].charAt(0) + b).toUpperCase();
}

/** Tom do avatar: sempre o mesmo para o mesmo nome. */
export function tom(nome: string) {
  let h = 0;
  for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) >>> 0;
  return TONS[h % TONS.length];
}

export function primeiroNome(nome: string) { return String(nome || '').trim().split(/\s+/)[0] || 'Alguém'; }
export function digitos(t: string) { return String(t || '').replace(/\D/g, ''); }

function comPais(fone: string) {
  const n = digitos(fone);
  return n.length > 11 && n.startsWith('55') ? n : '55' + n;
}
export function telHref(fone: string) { return 'tel:+' + comPais(fone); }
export function whatsHref(fone: string) { return 'https://wa.me/' + comPais(fone); }
/** Celular tem 11 dígitos com DDD (o 3º é 9). Só celular abre no WhatsApp. */
export function ehCelular(fone: string) { const n = digitos(fone).replace(/^55(?=\d{11}$)/, ''); return n.length === 11 && n.charAt(2) === '9'; }

/** (54) 99999-0000 enquanto digita */
export function mascaraTelefone(t: string) {
  const n = digitos(t).slice(0, 11);
  if (n.length <= 2) return n.length ? '(' + n : '';
  if (n.length <= 6) return '(' + n.slice(0, 2) + ') ' + n.slice(2);
  if (n.length <= 10) return '(' + n.slice(0, 2) + ') ' + n.slice(2, 6) + '-' + n.slice(6);
  return '(' + n.slice(0, 2) + ') ' + n.slice(2, 7) + '-' + n.slice(7);
}

export function plural(n: number, um: string, varios: string) { return n + ' ' + (n === 1 ? um : varios); }

export function linkValido(url: string) { return /^https?:\/\/\S+$/i.test(url.trim()); }
/** Coloca https:// quando a pessoa digita só o endereço. */
export function normalizarLink(url: string) {
  const u = url.trim();
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  if (/^[\w-]+(\.[\w-]+)+(\/|$)/.test(u)) return 'https://' + u;
  return u;
}

export function novoId(prefixo: string) {
  return prefixo + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function emailValido(e: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()); }
