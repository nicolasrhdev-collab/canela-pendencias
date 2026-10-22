/* Canela · Pendências — modelo de dados (o mesmo no Firestore, no modo de teste e no backup). */

export type Apto = '105' | '306' | 'Ambos';
/** Só existe uma prioridade marcada: Essencial (bandeira amarela). O resto é Normal, sem etiqueta. */
export type Urgencia = 'Essencial' | 'Normal';
export type Tipo = 'compra' | 'tarefa' | 'servico' | 'pagamento';
export type Modo = 'presencial' | 'casa';
export type LocalEntrega = 'condominio' | 'agencia';
export type OndeComprou = 'internet' | 'local' | 'reaproveitado';
export type OndePessoa = 'canela' | 'fora';

export interface Pessoa {
  id: string;
  nome: string;
  email: string;
  local: OndePessoa;
}

export interface LinkSugestao {
  id: string;
  texto: string;
  url: string;
  preco: number | null;
  escolhido: boolean;
}

/** Histórico: só mudanças de status. `quem` nulo = feito sozinho pelo sistema. `em` = AAAA-MM-DDTHH:MM:SS. */
export interface RegistroHist {
  txt: string;
  quem: string | null;
  em: string;
}

/** Uma compra registrada dentro de uma pendência de compra (pode haver várias, compras parciais). */
export interface Compra {
  id: string;
  qtd: number;
  onde: OndeComprou;
  valor: number;
  pag: 'avista' | 'parcelado';
  parcelas: number;
  valorParcela: number | null;
  link: string;
  entrega: string | null;
  local: LocalEntrega | null;
  rastreio: string;
  loja: string;
  frete: number;
  chegou: boolean;
  chegouEm: string | null;
  quem: string;
  data: string;
  /** A pessoa apagou a tarefa de retirada desta compra: não criar de novo. */
  semRetirada?: boolean;
}

interface Base {
  id: string;
  tipo: Tipo;
  titulo: string;
  apto: Apto;
  urgencia: Urgencia;
  resp: string[];
  modo: Modo;
  links: LinkSugestao[];
  obs: string;
  hist: RegistroHist[];
  criadoEm: string;
  auto?: boolean;
}

export interface PendCompra extends Base {
  tipo: 'compra';
  itemId: string;
  compras: Compra[];
}

export interface PendTarefa extends Base {
  tipo: 'tarefa';
  prazo: string | null;
  /** Pendência de compra que precisa chegar antes (tarefa fica bloqueada). */
  depende: string | null;
  feito: boolean;
  /** Tarefa de retirada criada sozinha a partir de uma compra. */
  origemCompra?: string | null;
  origemPend?: string | null;
}

export interface PendServico extends Base {
  tipo: 'servico';
  pessoa: string;
  telefone: string;
  valor: number;
  quando: 'dia' | 'ate';
  data: string | null;
  feito: boolean;
  pago: boolean;
}

export interface PendPagamento extends Base {
  tipo: 'pagamento';
  valor: number;
  vencimento: string;
  /** Link do comprovante (não guardamos arquivos). */
  comprovante: string;
  pago: boolean;
  origemServico?: string | null;
}

export type Pendencia = PendCompra | PendTarefa | PendServico | PendPagamento;

/** Um "Registrar normal" do inventário: unidades que entraram direto em "tem". `data` = AAAA-MM-DD. */
export interface RegistroItem {
  id: string;
  qtd: number;
  quem: string;
  data: string;
}

export interface Item {
  id: string;
  nome: string;
  apto: Apto;
  precisa: number;
  tem: number;
  /** Só os registros normais; as compras ficam na pendência de compra do item. */
  registros: RegistroItem[];
  /** Falso = ainda não verificado no apê: fica cinza e não vira pendência. Sem o campo = verificado. */
  verificado?: boolean;
  /** Quem verificou e quando (AAAA-MM-DD). */
  verificadoPor?: string;
  verificadoEm?: string;
  /** Urgência da pendência de compra que o item cria quando falta. Sem o campo = Normal. */
  urgencia?: Urgencia;
  /** Onde fica no apê (Cozinha, Banheiro…), para filtrar o inventário. */
  grupo?: string;
}

export interface Contato {
  id: string;
  nome: string;
  papel: string;
  fone: string;
}

/** Só onde o documento está: link ou descrição. Nunca o arquivo nem senhas. */
export interface Documento {
  id: string;
  nome: string;
  onde: string;
}

/** Dados úteis do condomínio (endereço, portaria, horário de entregas…). */
export interface Dado {
  id: string;
  rotulo: string;
  valor: string;
}

export interface Config {
  abertura: string | null;
  /** Pessoa adm: cuida de toda pendência até alguém se oferecer. Sem o campo = a primeira pessoa da lista. */
  adm?: string | null;
}

export interface Banco {
  pendencias: Pendencia[];
  itens: Item[];
  pessoas: Pessoa[];
  contatos: Contato[];
  documentos: Documento[];
  dados: Dado[];
  config: Config;
}

export type Colecao = 'pendencias' | 'itens' | 'pessoas' | 'contatos' | 'documentos' | 'dados' | 'config' | 'acesso';

/** Uma escrita: grava o documento inteiro (data) ou apaga (data = null). */
export interface Op {
  col: Colecao;
  id: string;
  data: object | null;
}

export const COLECOES_LISTA = ['pendencias', 'itens', 'pessoas', 'contatos', 'documentos', 'dados'] as const;
export type ColecaoLista = (typeof COLECOES_LISTA)[number];

export function bancoVazio(): Banco {
  return { pendencias: [], itens: [], pessoas: [], contatos: [], documentos: [], dados: [], config: { abertura: null } };
}
