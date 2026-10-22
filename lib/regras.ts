/* Regras de negócio: status de cada pendência, contagem do inventário, eventos do calendário e automações. */
import type { Apto, Banco, Compra, Item, Op, Pendencia, PendCompra, PendTarefa, Pessoa, RegistroHist, Tipo } from '../types';
import { br } from './datas';
import { brl } from './formatos';

export const TIPOS: Record<Tipo, { rotulo: string; icone: string }> = {
  compra: { rotulo: 'Compra', icone: 'shopping_cart' },
  tarefa: { rotulo: 'Tarefa', icone: 'task_alt' },
  servico: { rotulo: 'Serviço', icone: 'handyman' },
  pagamento: { rotulo: 'Pagamento', icone: 'payments' },
};

export type Coluna = 'pendente' | 'aguardando' | 'concluido';
export type TomStatus = Coluna | 'atrasado';
export const COLUNAS: { id: Coluna; titulo: string }[] = [
  { id: 'pendente', titulo: 'Pendente' },
  { id: 'aguardando', titulo: 'Aguardando' },
  { id: 'concluido', titulo: 'Concluído' },
];

const ROT_AGUARDANDO: Record<Tipo, string> = { compra: 'Aguardando', tarefa: 'Aguardando', servico: 'Agendado', pagamento: 'Aguardando' };
const ROT_CONCLUIDO: Record<Tipo, string> = { compra: 'Chegou', tarefa: 'Feita', servico: 'Feito', pagamento: 'Pago' };

export interface Situacao {
  coluna: Coluna;
  atrasado: boolean;
  bloqueio: { texto: string; depId: string } | null;
  rotulo: string;
  tom: TomStatus;
}

export function porId<T extends { id: string }>(lista: T[], id?: string | null): T | null {
  if (!id) return null;
  return lista.find((x) => x.id === id) ?? null;
}

export function localNome(l: string | null) { return l === 'agencia' ? 'Agência' : 'Condomínio'; }
/** "na agência" / "no condomínio", para frases como "Chega 25/10 na agência". */
export function noLocal(l: string | null) { return l === 'agencia' ? 'na agência' : 'no condomínio'; }

export interface Contagem { tem: number; cam: number; falta: number; precisa: number }

/** Falta comprar = precisa − tem − a caminho. */
export function contagem(db: Banco, p: PendCompra): Contagem {
  const it = porId(db.itens, p.itemId);
  const tem = it ? it.tem : 0, precisa = it ? it.precisa : 1;
  let cam = 0;
  (p.compras || []).forEach((c) => { if (!c.chegou) cam += c.qtd; });
  return { tem, cam, falta: Math.max(0, precisa - tem - cam), precisa };
}

/** Barra do card: a compra conta unidades; os outros tipos são uma unidade só, na cor da coluna em que estão. */
export function progresso(db: Banco, p: Pendencia, sit: Situacao): Contagem {
  if (p.tipo === 'compra') return contagem(db, p);
  return { tem: sit.coluna === 'concluido' ? 1 : 0, cam: sit.coluna === 'aguardando' ? 1 : 0, falta: sit.coluna === 'pendente' ? 1 : 0, precisa: 1 };
}

export function contagemItem(db: Banco, it: Item): Contagem {
  const p = compraDoItem(db, it.id);
  if (p) return contagem(db, p);
  return { tem: it.tem, cam: 0, falta: Math.max(0, it.precisa - it.tem), precisa: it.precisa };
}

export type TomItem = Coluna | 'nao-verificado';

/** Situação do item no inventário, nas mesmas cores das colunas do board. Cinza enquanto ninguém verificou no apê. */
export function estadoItem(c: Contagem, it: Item): { tom: TomItem; rotulo: string } {
  if (it.verificado === false) return { tom: 'nao-verificado', rotulo: 'Não verificado' };
  if (c.tem >= c.precisa) return { tom: 'concluido', rotulo: 'Completo' };
  if (c.falta > 0) return { tom: 'pendente', rotulo: c.falta === 1 ? 'Falta 1' : 'Faltam ' + c.falta };
  return { tom: 'aguardando', rotulo: 'A caminho' };
}

/** Quanto custou: "R$ 159,90 à vista", "R$ 159,90 em 3x de R$ 53,30", "R$ 80,00 · Loja do centro" ou "Frete R$ 35,00". */
export function valorCompra(k: Compra): string {
  if (k.onde === 'reaproveitado') return 'Frete ' + brl(k.frete);
  if (k.onde === 'local') return brl(k.valor) + ' · ' + k.loja;
  return brl(k.valor) + (k.pag === 'parcelado' ? ' em ' + k.parcelas + 'x de ' + brl(k.valorParcela ?? k.valor / k.parcelas) : ' à vista');
}

const chaveNome = (n: string) => n.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
const ORDEM_APTO: Record<Apto, number> = { '105': 0, '306': 1, Ambos: 2 };

/** O mesmo item (mesmo nome, sem ligar para acento e maiúscula) em cada apê, para ver quanto tem em cada um. */
export function mesmoItemNosApes(db: Banco, it: Item): Item[] {
  const k = chaveNome(it.nome);
  return db.itens.filter((x) => chaveNome(x.nome) === k).sort((a, b) => ORDEM_APTO[a.apto] - ORDEM_APTO[b.apto]);
}

/** Opção "Todos" do inventário: junta o mesmo item (mesmo nome) dos apês num grupo só, na ordem 105, 306, Ambos. */
export function juntarPorNome<T extends { it: Item }>(lista: T[]): T[][] {
  const grupos = new Map<string, T[]>();
  lista.forEach((x) => {
    const k = chaveNome(x.it.nome), g = grupos.get(k);
    if (g) g.push(x); else grupos.set(k, [x]);
  });
  return [...grupos.values()].map((g) => g.sort((a, b) => ORDEM_APTO[a.it.apto] - ORDEM_APTO[b.it.apto]));
}

/** Situação do item junto: falta em algum apê (soma) > nenhum verificado > um verificado e outro não > a caminho > completo. */
export function estadoJunto(lista: { c: Contagem; e: { tom: TomItem } }[]): { tom: TomItem; rotulo: string } {
  const falta = lista.reduce((s, x) => s + (x.e.tom === 'pendente' ? x.c.falta : 0), 0);
  const nv = lista.filter((x) => x.e.tom === 'nao-verificado').length;
  if (falta > 0) return { tom: 'pendente', rotulo: falta === 1 ? 'Falta 1' : 'Faltam ' + falta };
  if (nv === lista.length) return { tom: 'nao-verificado', rotulo: 'Não verificado' };
  if (nv > 0) return { tom: 'nao-verificado', rotulo: 'Falta verificar' };
  if (lista.some((x) => x.e.tom === 'aguardando')) return { tom: 'aguardando', rotulo: 'A caminho' };
  return { tom: 'concluido', rotulo: 'Completo' };
}

export function compraDoItem(db: Banco, itemId: string): PendCompra | null {
  return (db.pendencias.find((x) => x.tipo === 'compra' && x.itemId === itemId) as PendCompra | undefined) ?? null;
}

export function abertas(p: PendCompra): Compra[] {
  return (p.compras || []).filter((c) => !c.chegou).sort((a, b) => ((a.entrega || '9') < (b.entrega || '9') ? -1 : 1));
}

export function situacao(db: Banco, p: Pendencia, hoje: string, prof = 0): Situacao {
  let coluna: Coluna = 'pendente', atrasado = false;
  let bloqueio: Situacao['bloqueio'] = null;
  if (p.tipo === 'compra') {
    const c = contagem(db, p);
    coluna = c.tem >= c.precisa ? 'concluido' : c.falta > 0 ? 'pendente' : 'aguardando';
    atrasado = coluna !== 'concluido' && p.compras.some((x) => !x.chegou && !!x.entrega && x.entrega < hoje);
  } else if (p.tipo === 'tarefa') {
    const dep = prof < 3 ? porId(db.pendencias, p.depende) : null;
    if (p.feito) coluna = 'concluido';
    else if (dep && situacao(db, dep, hoje, prof + 1).coluna !== 'concluido') {
      coluna = 'aguardando';
      bloqueio = { texto: 'Libera quando “' + dep.titulo + '” chegar', depId: dep.id };
    }
    atrasado = !p.feito && !!p.prazo && p.prazo < hoje;
  } else if (p.tipo === 'servico') {
    coluna = p.feito ? 'concluido' : p.quando === 'dia' && p.data ? 'aguardando' : 'pendente';
    atrasado = !p.feito && !!p.data && p.data < hoje;
  } else {
    coluna = p.pago ? 'concluido' : 'pendente';
    atrasado = !p.pago && !!p.vencimento && p.vencimento < hoje;
  }
  const rotulo = atrasado ? 'Atrasado' : coluna === 'concluido' ? ROT_CONCLUIDO[p.tipo] : coluna === 'aguardando' ? ROT_AGUARDANDO[p.tipo] : 'Pendente';
  return { coluna, atrasado, bloqueio, rotulo, tom: atrasado ? 'atrasado' : coluna };
}

export interface Meta { icone: string; texto: string; vencido: boolean }

/** Linha "onde e quando" do card. */
export function meta(p: Pendencia, sit: Situacao, hoje: string): Meta {
  if (p.tipo === 'compra') {
    const ab = abertas(p)[0];
    if (sit.coluna === 'concluido') return { icone: 'check_circle', texto: 'Tudo no apê', vencido: false };
    if (ab && ab.entrega) {
      if (ab.entrega < hoje) return { icone: 'event_busy', texto: 'Era para chegar ' + br(ab.entrega) + ' · ' + localNome(ab.local), vencido: true };
      return { icone: 'local_shipping', texto: 'Chega ' + br(ab.entrega) + ' · ' + localNome(ab.local), vencido: false };
    }
    if (ab) return { icone: 'storefront', texto: 'Comprado, falta levar ao apê', vencido: false };
    return { icone: 'shopping_cart', texto: 'Falta comprar', vencido: false };
  }
  if (p.tipo === 'tarefa') {
    if (p.feito) return { icone: 'check_circle', texto: 'Feita', vencido: false };
    if (p.prazo) return p.prazo < hoje ? { icone: 'event_busy', texto: 'Venceu ' + br(p.prazo), vencido: true } : { icone: 'event', texto: 'Até ' + br(p.prazo), vencido: false };
    return { icone: 'event', texto: 'Sem prazo', vencido: false };
  }
  if (p.tipo === 'servico') {
    if (p.feito) return { icone: 'check_circle', texto: p.pago ? 'Feito e pago' : 'Feito', vencido: false };
    if (!p.data) return { icone: 'event', texto: 'Sem data marcada', vencido: false };
    if (p.data < hoje) return { icone: 'event_busy', texto: 'Venceu ' + br(p.data), vencido: true };
    return { icone: 'event', texto: (p.quando === 'dia' ? 'Agendado ' : 'Até ') + br(p.data), vencido: false };
  }
  if (p.pago) return { icone: 'check_circle', texto: 'Pago', vencido: false };
  if (p.vencimento < hoje) return { icone: 'event_busy', texto: 'Venceu ' + br(p.vencimento), vencido: true };
  return { icone: 'event', texto: 'Vence ' + br(p.vencimento), vencido: false };
}

export function ordem(p: Pendencia, sit: Situacao) { return (sit.atrasado ? 0 : 10) + (p.urgencia === 'Essencial' ? 0 : 1); }

export interface Evento {
  data: string;
  tipo: string;
  icone: string;
  titulo: string;
  pendId: string | null;
}

/** Entregas, chegadas, serviços agendados, datas limite, vencimentos e a abertura. */
export function eventos(db: Banco): Evento[] {
  const ev: Evento[] = [];
  if (db.config.abertura) ev.push({ data: db.config.abertura, tipo: 'Abertura dos apês', icone: 'celebration', titulo: 'Abertura para hóspedes', pendId: null });
  db.pendencias.forEach((p) => {
    if (p.tipo === 'compra') p.compras.forEach((c) => {
      if (!c.chegou && c.entrega) ev.push({ data: c.entrega, tipo: c.onde === 'reaproveitado' ? 'Chegada' : 'Entrega', icone: 'local_shipping', titulo: p.titulo + ' (' + c.qtd + ') · ' + localNome(c.local), pendId: p.id });
      if (c.chegou && c.chegouEm) ev.push({ data: c.chegouEm, tipo: 'Chegou', icone: 'check_circle', titulo: p.titulo + ' (' + c.qtd + ')', pendId: p.id });
    });
    if (p.tipo === 'tarefa' && p.prazo) ev.push({ data: p.prazo, tipo: 'Data limite', icone: 'event', titulo: p.titulo, pendId: p.id });
    if (p.tipo === 'servico' && p.data) ev.push({ data: p.data, tipo: p.quando === 'dia' ? 'Serviço agendado' : 'Data limite do serviço', icone: 'handyman', titulo: p.titulo, pendId: p.id });
    if (p.tipo === 'pagamento' && p.vencimento) ev.push({ data: p.vencimento, tipo: 'Vencimento', icone: 'payments', titulo: p.titulo + ' · ' + brl(p.valor), pendId: p.id });
  });
  return ev.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
}

export function hist(txt: string, quem: string | null, em: string): RegistroHist { return { txt, quem, em }; }
export function idsEmCanela(pessoas: Pessoa[]) { return pessoas.filter((p) => p.local === 'canela').map((p) => p.id); }

/** O adm: o marcado nas configurações, senão a primeira pessoa da lista. */
export function idAdm(db: Banco): string | null {
  const a = db.config.adm;
  if (a && db.pessoas.some((p) => p.id === a)) return a;
  return db.pessoas[0]?.id ?? null;
}

/** Quem cuida de verdade: os marcados ou, sem ninguém, o adm. Nunca fica sem ninguém. */
export function responsaveis(db: Banco, p: Pendencia): { ids: string[]; doAdm: boolean } {
  const ids = p.resp.filter((r) => db.pessoas.some((x) => x.id === r));
  if (ids.length) return { ids, doAdm: false };
  const adm = idAdm(db);
  return { ids: adm ? [adm] : [], doAdm: true };
}

/**
 * Automações que dependem só do estado (rodam em todo aparelho; os ids fixos evitam duplicar):
 * - retirada: entrega na Agência que passou da data sem "Chegou" → tarefa "Retirar [item] na agência" para quem está em Canela;
 * - inventário: item verificado com falta e sem pendência de compra → cria a pendência de compra.
 */
export function automacoes(db: Banco, hoje: string, agora: string): Op[] {
  const ops: Op[] = [];
  const existe = (id: string) => db.pendencias.some((x) => x.id === id);
  const canela = idsEmCanela(db.pessoas);
  db.pendencias.forEach((p) => {
    if (p.tipo !== 'compra') return;
    p.compras.forEach((c) => {
      if (c.chegou || c.semRetirada || c.onde === 'local' || c.local !== 'agencia' || !c.entrega || c.entrega >= hoje) return;
      const id = 'retirada_' + c.id;
      if (existe(id)) return;
      const t: PendTarefa = {
        id, tipo: 'tarefa', titulo: 'Retirar ' + p.titulo + ' na agência', apto: p.apto, urgencia: 'Essencial', resp: canela,
        modo: 'presencial', links: [], obs: '', criadoEm: agora, auto: true,
        prazo: hoje, depende: null, feito: false, origemCompra: c.id, origemPend: p.id,
        hist: [hist('Criada sozinha: passou de ' + br(c.entrega) + ' e ainda não chegou na agência.', null, agora)],
      };
      ops.push({ col: 'pendencias', id, data: t });
    });
  });
  db.itens.forEach((it) => {
    if (it.verificado === false || it.precisa - it.tem <= 0 || compraDoItem(db, it.id)) return;
    const id = 'inv_' + it.id;
    if (existe(id)) return;
    ops.push({ col: 'pendencias', id, data: compraDoInventario(it, agora) });
  });
  return ops;
}

export function compraDoInventario(it: Item, agora: string): PendCompra {
  return {
    id: 'inv_' + it.id, tipo: 'compra', itemId: it.id, titulo: it.nome, apto: it.apto, urgencia: it.urgencia ?? 'Normal', resp: [], modo: 'casa',
    links: [], obs: '', compras: [], criadoEm: agora, auto: true,
    hist: [hist('Criada sozinha pelo inventário: ' + (it.precisa - it.tem === 1 ? 'falta 1.' : 'faltam ' + (it.precisa - it.tem) + '.'), null, agora)],
  };
}
