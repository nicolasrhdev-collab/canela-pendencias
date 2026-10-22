/* Ações do app: cada uma devolve as escritas (ops) e a mensagem do aviso.
   Funções puras: recebem o banco atual e não gravam nada sozinhas. */
import type {
  Apto, Banco, Colecao, Compra, Config, Contato, Dado, Documento, Item, Modo, Op, OndePessoa, Pendencia, PendCompra,
  PendPagamento, PendServico, PendTarefa, Pessoa, Tipo, Urgencia,
} from '../types';
import { bancoVazio, COLECOES_LISTA } from '../types';
import { br } from './datas';
import { novoId, primeiroNome } from './formatos';
import { compraDoInventario, compraDoItem, contagem, contagemItem, hist, idsEmCanela, porId, situacao, type Coluna } from './regras';

export interface Ctx { db: Banco; eu: Pessoa; hoje: string; agora: string }
export interface Res { ops: Op[]; msg: string | null }

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const opP = (p: Pendencia): Op => ({ col: 'pendencias', id: p.id, data: p });
const opI = (i: Item): Op => ({ col: 'itens', id: i.id, data: i });
const del = (col: Colecao, id: string): Op => ({ col, id, data: null });
const nome = (c: Ctx) => primeiroNome(c.eu.nome);

function pend<T extends Pendencia>(c: Ctx, id: string): T {
  const p = porId(c.db.pendencias, id);
  if (!p) throw new Error('Pendência não encontrada');
  return clone(p) as T;
}

/* ——— Aplicar escritas num banco de cópia (para comparar o status antes e depois) ——— */
export function simular(db: Banco, ops: Op[]): Banco {
  const n: Banco = { ...db, pendencias: [...db.pendencias], itens: [...db.itens], pessoas: [...db.pessoas], contatos: [...db.contatos], documentos: [...db.documentos], dados: [...db.dados] };
  ops.forEach((o) => {
    if (o.col === 'acesso') return;
    if (o.col === 'config') { if (o.data) n.config = o.data as Config; return; }
    const lista = n[o.col] as { id: string }[];
    const i = lista.findIndex((x) => x.id === o.id);
    if (o.data) { if (i >= 0) lista[i] = o.data as { id: string }; else lista.push(o.data as { id: string }); }
    else if (i >= 0) lista.splice(i, 1);
  });
  return n;
}

/** Escritas que desfazem `ops` (volta cada documento ao que era antes). */
export function inverso(db: Banco, ops: Op[]): Op[] {
  const vistos = new Set<string>();
  const out: Op[] = [];
  ops.forEach((o) => {
    const k = o.col + '/' + o.id;
    if (vistos.has(k)) return;
    vistos.add(k);
    let antes: object | null = null;
    if (o.col === 'config') antes = db.config;
    else if (o.col === 'acesso') {
      const p = db.pessoas.find((x) => x.email === o.id);
      antes = p ? acessoDe(p) : null;
    } else antes = (db[o.col] as { id: string }[]).find((x) => x.id === o.id) ?? null;
    out.push({ col: o.col, id: o.id, data: antes ? clone(antes) : null });
  });
  return out;
}

const ROT: Record<Tipo, Record<Coluna, string>> = {
  compra: { pendente: 'Pendente', aguardando: 'Aguardando', concluido: 'Chegou' },
  tarefa: { pendente: 'Pendente', aguardando: 'Aguardando', concluido: 'Feita' },
  servico: { pendente: 'Pendente', aguardando: 'Agendado', concluido: 'Feito' },
  pagamento: { pendente: 'Pendente', aguardando: 'Aguardando', concluido: 'Pago' },
};

/**
 * Histórico só com mudanças de status: depois de qualquer ação, toda pendência que mudou de coluna
 * ganha um registro (menos as que a própria ação já anotou com uma frase melhor).
 */
function anotar(c: Ctx, ops: Op[], jaAnotadas: string[] = []): Op[] {
  const depois = simular(c.db, ops);
  const out = [...ops];
  depois.pendencias.forEach((np) => {
    if (jaAnotadas.includes(np.id)) return;
    const vp = porId(c.db.pendencias, np.id);
    if (!vp) return;
    const a = situacao(c.db, vp, c.hoje), b = situacao(depois, np, c.hoje);
    if (a.coluna === b.coluna) return;
    const direta = ops.some((o) => o.col === 'pendencias' && o.id === np.id);
    const peloInventario = np.tipo === 'compra' && ops.some((o) => o.col === 'itens' && o.id === np.itemId);
    const de = '“' + ROT[np.tipo][a.coluna] + '” para “' + ROT[np.tipo][b.coluna] + '”';
    let txt: string;
    if (direta) txt = nome(c) + ' mudou de ' + de + '.';
    else if (peloInventario) txt = nome(c) + ' mudou o inventário: de ' + de + '.';
    else if (np.tipo === 'tarefa' && a.bloqueio && !b.bloqueio) txt = 'Liberada sozinha: “' + (porId(depois.pendencias, a.bloqueio.depId)?.titulo ?? 'a compra') + '” chegou.';
    else if (np.tipo === 'tarefa' && !a.bloqueio && b.bloqueio) txt = 'Bloqueada de novo: ' + b.bloqueio.texto.charAt(0).toLowerCase() + b.bloqueio.texto.slice(1) + '.';
    else txt = 'Mudou sozinha de ' + de + '.';
    const upd = clone(np);
    upd.hist = [hist(txt, direta || peloInventario ? c.eu.id : null, c.agora), ...upd.hist];
    const i = out.findIndex((o) => o.col === 'pendencias' && o.id === np.id);
    if (i >= 0) out[i] = opP(upd); else out.push(opP(upd));
  });
  return out;
}

/* ——— Criar pendência ——— */
export interface NovaPendencia {
  tipo: Tipo; titulo: string; apto: Apto; urgencia: Urgencia; modo: Modo; resp: string[];
  qtd?: number; tarefaAoChegar?: string;
  prazo?: string | null; depende?: string | null;
  pessoa?: string; telefone?: string; valor?: number; quando?: 'dia' | 'ate'; data?: string | null;
  vencimento?: string;
}

export function criarPendencia(c: Ctx, n: NovaPendencia): Res & { id: string; coluna: Coluna } {
  const id = novoId(n.tipo.charAt(0));
  const base = {
    id, titulo: n.titulo.trim(), apto: n.apto, urgencia: n.urgencia, resp: n.resp.slice(), modo: n.modo,
    links: [], obs: '', criadoEm: c.agora, hist: [hist(nome(c) + ' criou a pendência.', c.eu.id, c.agora)],
  };
  const ops: Op[] = [];
  let p: Pendencia;
  if (n.tipo === 'compra') {
    const it: Item = { id: novoId('i'), nome: base.titulo, apto: n.apto, precisa: Math.max(1, n.qtd || 1), tem: 0, registros: [] };
    ops.push(opI(it));
    p = { ...base, tipo: 'compra', itemId: it.id, compras: [] };
    if (n.tarefaAoChegar && n.tarefaAoChegar.trim()) {
      const t: PendTarefa = {
        id: novoId('t'), tipo: 'tarefa', titulo: n.tarefaAoChegar.trim(), apto: n.apto, urgencia: n.urgencia, resp: idsEmCanela(c.db.pessoas),
        modo: 'presencial', links: [], obs: '', criadoEm: c.agora, prazo: null, depende: id, feito: false,
        hist: [hist(nome(c) + ' criou a tarefa para quando “' + base.titulo + '” chegar.', c.eu.id, c.agora)],
      };
      ops.push(opP(t));
    }
  } else if (n.tipo === 'tarefa') {
    p = { ...base, tipo: 'tarefa', prazo: n.prazo || null, depende: n.depende || null, feito: false };
  } else if (n.tipo === 'servico') {
    p = { ...base, tipo: 'servico', pessoa: (n.pessoa || '').trim(), telefone: (n.telefone || '').trim(), valor: n.valor || 0, quando: n.quando || 'ate', data: n.data || null, feito: false, pago: false };
  } else {
    p = { ...base, tipo: 'pagamento', valor: n.valor || 0, vencimento: n.vencimento || c.hoje, comprovante: '', pago: false };
  }
  ops.unshift(opP(p));
  const coluna = situacao(simular(c.db, ops), p, c.hoje).coluna;
  return { ops, msg: 'Pendência criada.', id, coluna };
}

/* ——— Comum a todos os tipos ——— */
export function editarPendencia(c: Ctx, id: string, patch: Partial<Pendencia>): Res {
  const p = { ...pend(c, id), ...patch } as Pendencia;
  const ops: Op[] = [opP(p)];
  if (p.tipo === 'compra') {
    const it = porId(c.db.itens, p.itemId);
    if (it && (it.nome !== p.titulo || it.apto !== p.apto)) ops.push(opI({ ...it, nome: p.titulo, apto: p.apto }));
  }
  return { ops: anotar(c, ops), msg: 'Pendência atualizada.' };
}

export function alternarResponsavel(c: Ctx, id: string): Res {
  const p = pend(c, id);
  const i = p.resp.indexOf(c.eu.id);
  if (i >= 0) p.resp.splice(i, 1); else p.resp.push(c.eu.id);
  return { ops: [opP(p)], msg: i >= 0 ? 'Você saiu dos responsáveis.' : 'Pronto: você é responsável.' };
}

export function definirResponsaveis(c: Ctx, id: string, resp: string[]): Res {
  const p = pend(c, id);
  p.resp = resp.slice();
  return { ops: [opP(p)], msg: 'Responsáveis atualizados.' };
}

export function excluirPendencia(c: Ctx, id: string): Res {
  const p = pend(c, id);
  const ops: Op[] = [del('pendencias', id)];
  if (p.tipo === 'compra') {
    const outra = c.db.pendencias.some((x) => x.id !== id && x.tipo === 'compra' && x.itemId === p.itemId);
    if (!outra && porId(c.db.itens, p.itemId)) ops.push(del('itens', p.itemId));
    c.db.pendencias.forEach((t) => { if (t.tipo === 'tarefa' && t.auto && t.origemPend === id) ops.push(del('pendencias', t.id)); });
  }
  if (p.tipo === 'tarefa' && p.origemCompra && p.origemPend) {
    const origem = porId(c.db.pendencias, p.origemPend);
    if (origem && origem.tipo === 'compra') {
      const o = clone(origem);
      const k = o.compras.find((x) => x.id === p.origemCompra);
      if (k) { k.semRetirada = true; ops.push(opP(o)); }
    }
  }
  return { ops: anotar(c, ops), msg: '“' + p.titulo + '” foi excluída.' };
}

export function adicionarLink(c: Ctx, id: string, l: { texto: string; url: string; preco: number | null }): Res {
  const p = pend(c, id);
  p.links.push({ id: novoId('l'), texto: l.texto.trim(), url: l.url.trim(), preco: l.preco, escolhido: false });
  return { ops: [opP(p)], msg: 'Sugestão de link adicionada.' };
}

export function escolherLink(c: Ctx, id: string, linkId: string): Res {
  const p = pend(c, id);
  const alvo = p.links.find((l) => l.id === linkId);
  const marcar = !!alvo && !alvo.escolhido;
  p.links.forEach((l) => { l.escolhido = marcar && l.id === linkId; });
  return { ops: [opP(p)], msg: marcar ? 'Link marcado como o escolhido.' : 'Link desmarcado.' };
}

export function removerLink(c: Ctx, id: string, linkId: string): Res {
  const p = pend(c, id);
  p.links = p.links.filter((l) => l.id !== linkId);
  return { ops: [opP(p)], msg: 'Link removido.' };
}

export function salvarObs(c: Ctx, id: string, obs: string): Res {
  const p = pend(c, id);
  p.obs = obs.trim();
  return { ops: [opP(p)], msg: p.obs ? 'Observações salvas.' : 'Observações apagadas.' };
}

/* ——— Compra ——— */
/** `quem` = quem comprou (escolhido no formulário; vazio = quem está registrando). */
export type DadosCompra = Omit<Compra, 'id' | 'chegou' | 'chegouEm' | 'data'>;

export function registrarCompra(c: Ctx, pendId: string, dados: DadosCompra): Res {
  const p = pend<PendCompra>(c, pendId);
  const antes = contagem(c.db, p);
  const quem = dados.quem || c.eu.id;
  p.compras.push({ ...dados, quem, id: novoId('k'), chegou: false, chegouEm: null, data: c.hoje });
  const outro = quem !== c.eu.id ? primeiroNome(porId(c.db.pessoas, quem)?.nome ?? '') : '';
  p.hist.unshift(hist(nome(c) + ' marcou que ' + (outro ? outro + ' comprou ' : 'comprou ') + dados.qtd + '.', c.eu.id, c.agora));
  const resto = antes.falta - dados.qtd;
  const msg = resto > 0 ? 'Compra salva. Ainda ' + (resto === 1 ? 'falta 1.' : 'faltam ' + resto + '.') : antes.tem >= antes.precisa ? 'Compra salva.' : 'Compra salva. Agora está em Aguardando.';
  return { ops: anotar(c, [opP(p)], [p.id]), msg };
}

/** Compra registrada pelo inventário: entra na pendência de compra do item (criada agora se ainda não existe). */
export function registrarCompraDoItem(c: Ctx, itemId: string, dados: DadosCompra): Res {
  const existente = compraDoItem(c.db, itemId);
  if (existente) return registrarCompra(c, existente.id, dados);
  const it = porId(c.db.itens, itemId);
  if (!it) return { ops: [], msg: null };
  const p = compraDoInventario(it, c.agora);
  p.hist = [hist(nome(c) + ' registrou uma compra pelo inventário.', c.eu.id, c.agora)];
  return registrarCompra({ ...c, db: simular(c.db, [opP(p)]) }, p.id, dados);
}

export function editarCompra(c: Ctx, pendId: string, compraId: string, dados: DadosCompra): Res {
  const p = pend<PendCompra>(c, pendId);
  const k = p.compras.find((x) => x.id === compraId);
  if (k) Object.assign(k, dados);
  return { ops: anotar(c, [opP(p)]), msg: 'Compra atualizada.' };
}

export function excluirCompra(c: Ctx, pendId: string, compraId: string): Res {
  const p = pend<PendCompra>(c, pendId);
  p.compras = p.compras.filter((x) => x.id !== compraId);
  const ops: Op[] = [opP(p)];
  c.db.pendencias.forEach((t) => { if (t.tipo === 'tarefa' && t.auto && t.origemCompra === compraId && !t.feito) ops.push(del('pendencias', t.id)); });
  return { ops: anotar(c, ops), msg: 'Compra removida.' };
}

/** Chegou: soma no inventário, divide a compra se chegou só uma parte e conclui a retirada na agência. */
export function marcarChegou(c: Ctx, pendId: string, compraId: string, n: number): Res {
  const p = pend<PendCompra>(c, pendId);
  const k = p.compras.find((x) => x.id === compraId);
  if (!k) return { ops: [], msg: null };
  const tudo = n >= k.qtd;
  if (!tudo) {
    p.compras.push({ ...clone(k), id: novoId('k'), qtd: n, chegou: true, chegouEm: c.hoje });
    k.qtd -= n;
  } else { k.chegou = true; k.chegouEm = c.hoje; }
  p.hist.unshift(hist(nome(c) + ' marcou que ' + (n > 1 ? 'chegaram ' + n : 'chegou 1') + '.', c.eu.id, c.agora));
  const ops: Op[] = [opP(p)];
  const jaAnotadas = [p.id];
  const it = porId(c.db.itens, p.itemId);
  if (it) ops.push(opI({ ...it, tem: it.tem + n }));
  if (tudo) c.db.pendencias.forEach((t) => {
    if (t.tipo === 'tarefa' && t.origemCompra === compraId && !t.feito) {
      const nt = clone(t);
      nt.feito = true;
      nt.hist.unshift(hist('Concluída sozinha: a compra chegou.', null, c.agora));
      ops.push(opP(nt));
      jaAnotadas.push(nt.id);
    }
  });
  return { ops: anotar(c, ops, jaAnotadas), msg: (n > 1 ? 'Pronto: chegaram ' + n + '.' : 'Pronto: chegou.') + ' Já está no inventário.' };
}

export function criarTarefaAoChegar(c: Ctx, pendId: string, titulo: string): Res {
  const p = pend<PendCompra>(c, pendId);
  const t: PendTarefa = {
    id: novoId('t'), tipo: 'tarefa', titulo: titulo.trim(), apto: p.apto, urgencia: p.urgencia, resp: idsEmCanela(c.db.pessoas),
    modo: 'presencial', links: [], obs: '', criadoEm: c.agora, prazo: null, depende: p.id, feito: false,
    hist: [hist(nome(c) + ' criou a tarefa para quando “' + p.titulo + '” chegar.', c.eu.id, c.agora)],
  };
  return { ops: [opP(t)], msg: 'Tarefa criada. Ela libera quando a compra chegar.' };
}

/* ——— Tarefa ——— */
export function marcarTarefa(c: Ctx, id: string, feito: boolean): Res {
  const p = pend<PendTarefa>(c, id);
  p.feito = feito;
  p.hist.unshift(hist(nome(c) + (feito ? ' marcou como feita.' : ' reabriu a tarefa.'), c.eu.id, c.agora));
  return { ops: anotar(c, [opP(p)], [p.id]), msg: feito ? 'Tarefa marcada como feita.' : 'Tarefa reaberta.' };
}

/* ——— Serviço ——— */
export function agendarServico(c: Ctx, id: string, data: string): Res {
  const p = pend<PendServico>(c, id);
  p.quando = 'dia';
  p.data = data;
  p.hist.unshift(hist(nome(c) + ' agendou para ' + br(data) + '.', c.eu.id, c.agora));
  return { ops: anotar(c, [opP(p)], [p.id]), msg: 'Serviço agendado para ' + br(data) + '.' };
}

/** Feito e não pago → cria a pendência de pagamento. */
export function marcarServicoFeito(c: Ctx, id: string, pago: boolean, vencimento: string | null): Res {
  const p = pend<PendServico>(c, id);
  p.feito = true;
  p.pago = pago;
  p.hist.unshift(hist(nome(c) + ' marcou como feito' + (pago ? ' e pago.' : '.'), c.eu.id, c.agora));
  const ops: Op[] = [opP(p)];
  if (!pago) {
    const g: PendPagamento = {
      id: novoId('g'), tipo: 'pagamento', titulo: 'Pagar ' + (p.pessoa ? p.pessoa.split(' — ')[0] + ': ' : '') + p.titulo.charAt(0).toLowerCase() + p.titulo.slice(1),
      apto: p.apto, urgencia: 'Essencial', resp: [c.eu.id], modo: 'casa', links: [], obs: '', criadoEm: c.agora, auto: true,
      valor: p.valor, vencimento: vencimento || c.hoje, comprovante: '', pago: false, origemServico: p.id,
      hist: [hist('Criada sozinha: o serviço foi feito e ainda não foi pago.', null, c.agora)],
    };
    ops.push(opP(g));
  }
  return { ops: anotar(c, ops, [p.id]), msg: pago ? 'Serviço marcado como feito.' : 'Serviço feito. Criamos a pendência de pagamento.' };
}

export function reabrirServico(c: Ctx, id: string): Res {
  const p = pend<PendServico>(c, id);
  p.feito = false;
  p.hist.unshift(hist(nome(c) + ' reabriu o serviço.', c.eu.id, c.agora));
  return { ops: anotar(c, [opP(p)], [p.id]), msg: 'Serviço reaberto.' };
}

/* ——— Pagamento ——— */
export function marcarPago(c: Ctx, id: string, pago: boolean): Res {
  const p = pend<PendPagamento>(c, id);
  p.pago = pago;
  p.hist.unshift(hist(nome(c) + (pago ? ' marcou como pago.' : ' marcou como não pago.'), c.eu.id, c.agora));
  const ops: Op[] = [opP(p)];
  const jaAnotadas = [p.id];
  if (p.origemServico) {
    const s = porId(c.db.pendencias, p.origemServico);
    if (s && s.tipo === 'servico' && s.pago !== pago) { const ns = clone(s); ns.pago = pago; ops.push(opP(ns)); jaAnotadas.push(ns.id); }
  }
  return { ops: anotar(c, ops, jaAnotadas), msg: pago ? 'Pagamento marcado como pago.' : 'Pagamento voltou para Pendente.' };
}

export function salvarComprovante(c: Ctx, id: string, link: string): Res {
  const p = pend<PendPagamento>(c, id);
  p.comprovante = link.trim();
  return { ops: [opP(p)], msg: p.comprovante ? 'Link do comprovante salvo.' : 'Link do comprovante removido.' };
}

/* ——— Inventário ——— */
export function criarItem(c: Ctx, dados: { nome: string; apto: Apto; precisa: number; tem: number }): Res {
  const it: Item = { id: novoId('i'), nome: dados.nome.trim(), apto: dados.apto, precisa: Math.max(1, dados.precisa), tem: Math.max(0, dados.tem), registros: [] };
  const ops: Op[] = [opI(it)];
  const falta = it.precisa - it.tem;
  if (falta > 0) ops.push(opP(compraDoInventario(it, c.agora)));
  return { ops, msg: falta > 0 ? 'Item adicionado. Criamos a pendência de compra.' : 'Item adicionado.' };
}

export function mudarItem(c: Ctx, id: string, patch: Partial<Pick<Item, 'tem' | 'precisa' | 'nome'>>): Res {
  const it = porId(c.db.itens, id);
  if (!it) return { ops: [], msg: null };
  const novo: Item = { ...it, ...patch, tem: Math.max(0, patch.tem ?? it.tem), precisa: Math.max(1, patch.precisa ?? it.precisa) };
  const ops: Op[] = [opI(novo)];
  const p = compraDoItem(c.db, id);
  let msg: string | null = null;
  if (!p && novo.verificado !== false && novo.precisa - novo.tem > 0) {
    ops.push(opP(compraDoInventario(novo, c.agora)));
    const f = novo.precisa - novo.tem;
    msg = (f === 1 ? 'Falta 1' : 'Faltam ' + f) + '. Criamos a pendência de compra.';
  }
  if (p && patch.nome && p.titulo !== patch.nome) ops.push(opP({ ...clone(p), titulo: patch.nome }));
  if (patch.nome) msg = 'Item atualizado.';
  return { ops: anotar(c, ops), msg };
}

/** Registrar normal: a quantidade entra direto em "Já tem" (pode passar do que precisa). A pendência de compra anota junto. */
export function registrarNoItem(c: Ctx, id: string, n: number): Res {
  const it = porId(c.db.itens, id);
  if (!it || n < 1) return { ops: [], msg: null };
  const novo: Item = { ...it, tem: it.tem + n, registros: [...it.registros, { id: novoId('r'), qtd: n, quem: c.eu.id, data: c.hoje }] };
  const ops: Op[] = [opI(novo)];
  const p = compraDoItem(c.db, id);
  if (p) {
    const np = clone(p);
    np.hist.unshift(hist(nome(c) + ' registrou ' + n + ' no inventário.', c.eu.id, c.agora));
    ops.push(opP(np));
  }
  const depois = contagemItem(simular(c.db, ops), novo);
  const msg = depois.tem >= depois.precisa ? 'Registrado. Item completo.' : depois.falta > 0 ? 'Registrado. Ainda ' + (depois.falta === 1 ? 'falta 1.' : 'faltam ' + depois.falta + '.') : 'Registrado. O resto está a caminho.';
  return { ops: anotar(c, ops, p ? [p.id] : []), msg };
}

/** Verificar no apê: diz quanto tem. Sai do cinza e, se faltar, vira pendência de compra (com a urgência do item). */
export function verificarItem(c: Ctx, id: string, tem: number): Res {
  const it = porId(c.db.itens, id);
  if (!it) return { ops: [], msg: null };
  const { verificado: _, ...resto } = it;
  const novo: Item = { ...resto, tem: Math.max(0, tem), verificadoPor: c.eu.id, verificadoEm: c.hoje };
  const ops: Op[] = [opI(novo)];
  const falta = novo.precisa - novo.tem;
  if (falta > 0 && !compraDoItem(c.db, id)) {
    const p = compraDoInventario(novo, c.agora);
    p.hist = [hist(nome(c) + ' verificou no apê: tem ' + novo.tem + ' de ' + novo.precisa + '.', c.eu.id, c.agora)];
    ops.push(opP(p));
  }
  const msg = falta > 0 ? 'Verificado. ' + (falta === 1 ? 'Falta 1' : 'Faltam ' + falta) + ': criamos a pendência de compra.' : 'Verificado. Item completo.';
  return { ops: anotar(c, ops), msg };
}

export function excluirItem(c: Ctx, id: string): Res {
  const it = porId(c.db.itens, id);
  const ops: Op[] = [del('itens', id)];
  c.db.pendencias.forEach((p) => {
    if (p.tipo === 'compra' && p.itemId === id) {
      ops.push(del('pendencias', p.id));
      c.db.pendencias.forEach((t) => { if (t.tipo === 'tarefa' && t.auto && t.origemPend === p.id) ops.push(del('pendencias', t.id)); });
    }
  });
  return { ops: anotar(c, ops), msg: '“' + (it ? it.nome : 'Item') + '” saiu do inventário.' };
}

/** Várias ações seguidas como uma só (cada uma vê o banco já com as anteriores): o item junto dos dois apês. */
function emSequencia(c: Ctx, acoes: ((x: Ctx) => Res)[]): Op[] {
  let db = c.db;
  const ops: Op[] = [];
  acoes.forEach((a) => { const r = a({ ...c, db }); ops.push(...r.ops); db = simular(db, r.ops); });
  return ops;
}

export function renomearItens(c: Ctx, ids: string[], nome: string): Res {
  return { ops: emSequencia(c, ids.map((id) => (x: Ctx) => mudarItem(x, id, { nome: nome.trim() }))), msg: 'Item atualizado.' };
}

export function excluirItens(c: Ctx, ids: string[]): Res {
  const it = porId(c.db.itens, ids[0]);
  return { ops: emSequencia(c, ids.map((id) => (x: Ctx) => excluirItem(x, id))), msg: '“' + (it ? it.nome : 'Item') + '” saiu do inventário.' };
}

/* ——— Pessoas e acesso ——— */
export function acessoDe(p: Pessoa) { return { email: p.email, pessoaId: p.id, nome: p.nome }; }

export function adicionarPessoa(c: Ctx, dados: { nome: string; email: string; local: OndePessoa }): Res {
  const p: Pessoa = { id: novoId('p'), nome: dados.nome.trim(), email: dados.email.trim().toLowerCase(), local: dados.local };
  return { ops: [{ col: 'pessoas', id: p.id, data: p }, { col: 'acesso', id: p.email, data: acessoDe(p) }], msg: primeiroNome(p.nome) + ' entrou na lista.' };
}

export function editarPessoa(c: Ctx, id: string, dados: { nome: string; email: string; local: OndePessoa }): Res {
  const antes = porId(c.db.pessoas, id);
  if (!antes) return { ops: [], msg: null };
  const p: Pessoa = { ...antes, nome: dados.nome.trim(), email: dados.email.trim().toLowerCase(), local: dados.local };
  const ops: Op[] = [{ col: 'pessoas', id, data: p }];
  if (antes.email && antes.email !== p.email) ops.push(del('acesso', antes.email));
  ops.push({ col: 'acesso', id: p.email, data: acessoDe(p) });
  return { ops, msg: 'Dados de ' + primeiroNome(p.nome) + ' atualizados.' };
}

export function removerPessoa(c: Ctx, id: string): Res {
  const p = porId(c.db.pessoas, id);
  if (!p) return { ops: [], msg: null };
  const ops: Op[] = [del('pessoas', id)];
  if (p.email) ops.push(del('acesso', p.email));
  c.db.pendencias.forEach((x) => { if (x.resp.includes(id)) ops.push(opP({ ...clone(x), resp: x.resp.filter((r) => r !== id) })); });
  return { ops, msg: primeiroNome(p.nome) + ' saiu da lista.' };
}

/* ——— Configurações e Infos ——— */
export function mudarAbertura(c: Ctx, data: string | null): Res {
  return { ops: [{ col: 'config', id: 'geral', data: { ...c.db.config, abertura: data } }], msg: data ? 'Data de abertura mudou para ' + br(data) + '.' : 'Data de abertura apagada.' };
}

type Registro = Contato | Documento | Dado;
export function salvarRegistro(col: 'contatos' | 'documentos' | 'dados', r: Registro, msg: string): Res {
  return { ops: [{ col, id: r.id, data: r }], msg };
}
export function removerRegistro(col: 'contatos' | 'documentos' | 'dados', id: string, msg: string): Res {
  return { ops: [del(col, id)], msg };
}

/* ——— Backup ——— */
export function exportarBackup(db: Banco) {
  return JSON.stringify({ app: 'canela-pendencias', versao: 1, exportadoEm: new Date().toISOString(), dados: db }, null, 2);
}

/** E-mail de quem usa o app no modo de teste (sem Firebase). */
export const EMAIL_TESTE = 'voce@modo-de-teste';

/** Troca todos os dados pelos do arquivo. Quem está importando continua na lista.
    Backup do modo de teste aberto com login do Google: a pessoa do teste vira quem está importando
    (mesmo id, então histórico, verificações e compras continuam no nome dela). */
export function importarBackup(c: Ctx, texto: string): Res | { erro: string } {
  let bruto: unknown;
  try { bruto = JSON.parse(texto); } catch { return { erro: 'Esse arquivo não é um backup do app. Escolha o arquivo .json que você baixou em "Baixar backup".' }; }
  const dados = (bruto && typeof bruto === 'object' && 'dados' in bruto ? (bruto as { dados: unknown }).dados : bruto) as Partial<Banco> | null;
  if (!dados || typeof dados !== 'object' || !Array.isArray(dados.pendencias)) return { erro: 'Esse arquivo não é um backup do app. Escolha o arquivo .json que você baixou em "Baixar backup".' };
  const novo = normalizarBanco(dados);
  const doTeste = novo.pessoas.find((p) => p.email === EMAIL_TESTE);
  if (doTeste && c.eu.email && c.eu.email !== EMAIL_TESTE && !novo.pessoas.some((p) => p.email === c.eu.email)) {
    Object.assign(doTeste, { email: c.eu.email, nome: c.eu.nome, local: c.eu.local });
  }
  if (c.eu.email && !novo.pessoas.some((p) => p.email === c.eu.email)) novo.pessoas.push(clone(c.eu));
  const ops: Op[] = [];
  COLECOES_LISTA.forEach((col) => {
    const ids = new Set((novo[col] as { id: string }[]).map((x) => x.id));
    (c.db[col] as { id: string }[]).forEach((x) => { if (!ids.has(x.id)) ops.push(del(col, x.id)); });
    (novo[col] as { id: string }[]).forEach((x) => ops.push({ col, id: x.id, data: x }));
  });
  ops.push({ col: 'config', id: 'geral', data: novo.config });
  const emails = new Set(novo.pessoas.map((p) => p.email).filter(Boolean));
  c.db.pessoas.forEach((p) => { if (p.email && !emails.has(p.email)) ops.push(del('acesso', p.email)); });
  novo.pessoas.forEach((p) => { if (p.email) ops.push({ col: 'acesso', id: p.email, data: acessoDe(p) }); });
  return { ops, msg: 'Backup restaurado: ' + novo.pendencias.length + ' pendências e ' + novo.itens.length + ' itens.' };
}

/* ——— Normalização (dados antigos, backups e documentos incompletos) ——— */
const APTOS: Apto[] = ['105', '306', 'Ambos'];
const URGS: Urgencia[] = ['Essencial', 'Útil', 'Extra'];
const s = (v: unknown, d = '') => (typeof v === 'string' ? v : d);
const nOu = (v: unknown, d = 0) => (typeof v === 'number' && isFinite(v) ? v : d);
const dOu = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export function normalizarPendencia(x: Record<string, unknown>): Pendencia | null {
  const tipo = x.tipo as Tipo;
  if (!['compra', 'tarefa', 'servico', 'pagamento'].includes(tipo) || typeof x.id !== 'string') return null;
  const base = {
    id: x.id, titulo: s(x.titulo, 'Sem título'), apto: APTOS.includes(x.apto as Apto) ? (x.apto as Apto) : 'Ambos',
    urgencia: URGS.includes(x.urgencia as Urgencia) ? (x.urgencia as Urgencia) : 'Útil', resp: arr<string>(x.resp).filter((r) => typeof r === 'string'),
    modo: x.modo === 'casa' ? 'casa' : 'presencial', obs: s(x.obs), criadoEm: s(x.criadoEm), auto: !!x.auto,
    links: arr<Record<string, unknown>>(x.links).map((l) => ({ id: s(l.id) || novoId('l'), texto: s(l.texto), url: s(l.url), preco: typeof l.preco === 'number' ? l.preco : null, escolhido: !!l.escolhido })),
    hist: arr<Record<string, unknown>>(x.hist).map((h) => ({ txt: s(h.txt), quem: typeof h.quem === 'string' ? h.quem : null, em: s(h.em) || s(h.data) })),
  } as const;
  if (tipo === 'compra') {
    return {
      ...base, tipo, itemId: s(x.itemId),
      compras: arr<Record<string, unknown>>(x.compras).map((k) => ({
        id: s(k.id) || novoId('k'), qtd: Math.max(1, nOu(k.qtd, 1)), onde: (['internet', 'local', 'reaproveitado'].includes(k.onde as string) ? k.onde : 'internet') as Compra['onde'],
        valor: nOu(k.valor), pag: k.pag === 'parcelado' ? 'parcelado' : 'avista', parcelas: Math.max(2, nOu(k.parcelas, 2)), valorParcela: typeof k.valorParcela === 'number' ? k.valorParcela : null,
        link: s(k.link), entrega: dOu(k.entrega), local: k.local === 'agencia' ? 'agencia' : k.local === 'condominio' ? 'condominio' : null,
        rastreio: s(k.rastreio), loja: s(k.loja), frete: nOu(k.frete), chegou: !!k.chegou, chegouEm: dOu(k.chegouEm), quem: s(k.quem), data: dOu(k.data) || '', semRetirada: !!k.semRetirada,
      })),
    };
  }
  if (tipo === 'tarefa') return { ...base, tipo, prazo: dOu(x.prazo), depende: typeof x.depende === 'string' ? x.depende : null, feito: !!x.feito, origemCompra: typeof x.origemCompra === 'string' ? x.origemCompra : null, origemPend: typeof x.origemPend === 'string' ? x.origemPend : null };
  if (tipo === 'servico') return { ...base, tipo, pessoa: s(x.pessoa), telefone: s(x.telefone), valor: nOu(x.valor), quando: x.quando === 'dia' ? 'dia' : 'ate', data: dOu(x.data), feito: !!x.feito, pago: !!x.pago };
  return { ...base, tipo: 'pagamento', valor: nOu(x.valor), vencimento: dOu(x.vencimento) || '', comprovante: s(x.comprovante), pago: !!x.pago, origemServico: typeof x.origemServico === 'string' ? x.origemServico : null };
}

export function normalizarBanco(d: Partial<Banco> | Record<string, unknown>): Banco {
  const b = bancoVazio();
  const r = d as Record<string, unknown>;
  b.pendencias = arr<Record<string, unknown>>(r.pendencias).map(normalizarPendencia).filter((x): x is Pendencia => !!x);
  b.itens = arr<Record<string, unknown>>(r.itens).filter((i) => typeof i.id === 'string').map((i) => ({ id: i.id as string, nome: s(i.nome, 'Item'), apto: APTOS.includes(i.apto as Apto) ? (i.apto as Apto) : 'Ambos', precisa: Math.max(1, nOu(i.precisa, 1)), tem: Math.max(0, nOu(i.tem)),
    registros: arr<Record<string, unknown>>(i.registros).filter((x) => typeof x.id === 'string').map((x) => ({ id: x.id as string, qtd: Math.max(1, nOu(x.qtd, 1)), quem: s(x.quem), data: dOu(x.data) || '' })),
    ...(i.verificado === false ? { verificado: false } : {}),
    ...(typeof i.verificadoPor === 'string' ? { verificadoPor: i.verificadoPor } : {}),
    ...(dOu(i.verificadoEm) ? { verificadoEm: dOu(i.verificadoEm)! } : {}),
    ...(URGS.includes(i.urgencia as Urgencia) ? { urgencia: i.urgencia as Urgencia } : {}),
    ...(s(i.grupo).trim() ? { grupo: s(i.grupo).trim() } : {}),
  }));
  b.pessoas = arr<Record<string, unknown>>(r.pessoas).filter((p) => typeof p.id === 'string').map((p) => ({ id: p.id as string, nome: s(p.nome, 'Sem nome'), email: s(p.email).toLowerCase(), local: p.local === 'canela' ? 'canela' : 'fora' }));
  b.contatos = arr<Record<string, unknown>>(r.contatos).filter((x) => typeof x.id === 'string').map((x) => ({ id: x.id as string, nome: s(x.nome), papel: s(x.papel), fone: s(x.fone) }));
  b.documentos = arr<Record<string, unknown>>(r.documentos).filter((x) => typeof x.id === 'string').map((x) => ({ id: x.id as string, nome: s(x.nome), onde: s(x.onde) }));
  b.dados = arr<Record<string, unknown>>(r.dados).filter((x) => typeof x.id === 'string').map((x) => ({ id: x.id as string, rotulo: s(x.rotulo), valor: s(x.valor) }));
  const cfg = (r.config || {}) as Record<string, unknown>;
  b.config = { abertura: dOu(cfg.abertura) };
  return b;
}
