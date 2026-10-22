/* Detalhe da pendência: topo com o tipo e o menu ⋮, título e etiquetas, resumo (o número que importa),
   abas Detalhes e Histórico, e a ação principal presa embaixo. */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useApp } from '../../app/contexto';
import * as A from '../../lib/acoes';
import { br, deBR, dias, quandoTexto, somar } from '../../lib/datas';
import { brl, ehCelular, linkValido, normalizarLink, primeiroNome, telHref, valorDe, valorTexto, whatsHref } from '../../lib/formatos';
import { abertas, contagem, idAdm, meta, noLocal, porId, responsaveis, situacao, TIPOS, valorCompra } from '../../lib/regras';
import type { Apto, Pendencia, PendCompra, PendPagamento, PendServico, PendTarefa, Urgencia } from '../../types';
import {
  Acoes, Aviso, Avatar, BarraUnidades, Botao, BotaoIcone, Campo, CampoData, CampoTelefone, CampoValor, Detalhe,
  Escolha, EscolhaVarias, EtiquetaApto, EtiquetaUrgencia, Folha, Historico, Icone, ItemLink, ListaLinks, PerguntaContador,
  Status, Vazio,
} from '../ui';
import { FormCompra } from './FormCompra';
import { CRIAR_LIGADO, Indisponivel } from './NovaPendencia';

type Modo2 = null | 'comprar' | 'link' | 'obs' | 'resp' | 'editar' | 'feito' | 'agendar' | 'tarefaChegar' | 'comprovante' | { compra: string };
type FolhaChegou = { compraId: string; max: number; qtd: number };

const ONDE: Record<string, string> = { internet: 'Internet', local: 'Loja física', reaproveitado: 'Reaproveitado' };
const APTOS: { valor: Apto; rotulo: string }[] = [{ valor: '105', rotulo: '105' }, { valor: '306', rotulo: '306' }, { valor: 'Ambos', rotulo: 'Ambos' }];
const URGS: { valor: Urgencia; rotulo: string }[] = [{ valor: 'Essencial', rotulo: 'Sim' }, { valor: 'Normal', rotulo: 'Não' }];

function nomeCanela(pessoas: { nome: string; local: string }[]) {
  return pessoas.filter((x) => x.local === 'canela').map((x) => primeiroNome(x.nome)).join(' e ') || 'quem está em Canela';
}

export function DetalhePendencia({ id }: { id: string }) {
  const { db, hoje, celular, fazer, fechar, confirmar } = useApp();
  const idTitulo = useId();
  const [modo, setModo] = useState<Modo2>(null);
  const [aba, setAba] = useState<'detalhes' | 'historico'>('detalhes');
  const [folha, setFolha] = useState<FolhaChegou | null>(null);
  const p = porId(db.pendencias, id);

  if (!p) {
    return (
      <Detalhe idTitulo={idTitulo}>
        <Vazio titulo="Essa pendência não existe mais" texto="Ela pode ter sido excluída ou desfeita. Volte para a lista e escolha outra.">
          <Botao onClick={fechar}>Voltar para a lista</Botao>
        </Vazio>
      </Detalhe>
    );
  }

  const sit = situacao(db, p, hoje), T = TIPOS[p.tipo];
  const fecharModo = () => setModo(null);
  const formCompraAberto = modo === 'comprar' || (typeof modo === 'object' && modo !== null);

  const excluir = async () => {
    const extra = p.tipo === 'compra' ? ' O item também sai do inventário.' : '';
    const ok = await confirmar({ icone: 'delete', titulo: 'Excluir “' + p.titulo + '”?', texto: 'A pendência some para todo mundo.' + extra + ' Logo depois dá para desfazer.', acao: 'Excluir' });
    if (!ok) return;
    fazer((c) => A.excluirPendencia(c, p.id));
    fechar();
  };

  const menu = (
    <MenuMais rotulo="Mais opções" itens={[
      { icone: 'edit', rotulo: 'Editar informações', aoEscolher: () => { setAba('detalhes'); setModo('editar'); } },
      { icone: 'delete', rotulo: 'Excluir pendência', aoEscolher: excluir },
    ]} />
  );

  return (
    <article className="dt" aria-labelledby={idTitulo}>
      {!celular && (
        <header className="dt-top">
          <span className="dt-top__tipo"><Icone nome={T.icone} tamanho={18} />{T.rotulo}</span>
          {menu}
          <BotaoIcone icone="close" rotulo="Fechar" onClick={fechar} data-foco-inicial />
        </header>
      )}

      <div className="dt-corpo">
        <div className="dt-cabeca">
          <div className="dt-cabeca__linha">
            <h2 className="dt-titulo" id={idTitulo}>{p.titulo}</h2>
            {celular && menu}
          </div>
          <div className="dt-chips">
            <Status tom={sit.tom}>{sit.rotulo}</Status>
            <EtiquetaUrgencia urgencia={p.urgencia} />
            <EtiquetaApto apto={p.apto} />
          </div>
        </div>

        {modo === 'editar' ? <FormEditar p={p} aoFechar={fecharModo} /> : (
          <>
            <Resumo p={p} />

            <div className="dt-abas" role="tablist" aria-label="Partes da pendência">
              <button type="button" className="dt-aba" role="tab" aria-selected={aba === 'detalhes'} onClick={() => setAba('detalhes')}>Detalhes</button>
              <button type="button" className="dt-aba" role="tab" aria-selected={aba === 'historico'} onClick={() => setAba('historico')}>
                Histórico<span className="dt-aba__qtd">{p.hist.length}</span>
              </button>
            </div>

            {aba === 'detalhes' ? (
              <div className="dt-painel" role="tabpanel">
                {p.tipo === 'compra' && <SecaoCompra p={p} modo={modo} setModo={setModo} setFolha={setFolha} />}
                {p.tipo === 'tarefa' && <SecaoTarefa p={p} />}
                {p.tipo === 'servico' && <SecaoServico p={p} modo={modo} setModo={setModo} />}
                {p.tipo === 'pagamento' && <SecaoPagamento p={p} modo={modo} setModo={setModo} />}

                {(p.tipo !== 'compra' || p.links.length > 0 || (contagem(db, p).falta > 0 && !formCompraAberto)) && (
                  <SecaoLinks p={p} aberto={modo === 'link'} abrir={() => setModo('link')} fecharForm={fecharModo} />
                )}
                <SecaoObs p={p} aberto={modo === 'obs'} abrir={() => setModo('obs')} fecharForm={fecharModo} />
                <SecaoResp p={p} modo={modo} setModo={setModo} />
              </div>
            ) : (
              <div className="dt-painel" role="tabpanel">
                <Historico itens={p.hist.map((h) => ({ txt: h.txt, em: h.em, nome: h.quem ? porId(db.pessoas, h.quem)?.nome ?? 'Pessoa que saiu da lista' : null }))} />
              </div>
            )}
          </>
        )}
      </div>

      {modo === null && <Rodape p={p} setModo={setModo} setFolha={setFolha} />}

      {folha && (
        <Folha titulo="Marcar que chegou" texto={'Quantas unidades de “' + p.titulo + '” chegaram?'} aoFechar={() => setFolha(null)}>
          <PerguntaContador rotulo="Quantas chegaram?" valor={folha.qtd} min={1} max={folha.max} aoMudar={(q) => setFolha({ ...folha, qtd: q })}
            ajuda={'Foram compradas ' + folha.max + '. Se chegou só uma parte, o resto continua a caminho.'} />
          <Acoes empilhado>
            <Botao variante="outlined" onClick={() => setFolha(null)}>Cancelar</Botao>
            <Botao icone="check" onClick={() => { fazer((c) => A.marcarChegou(c, p.id, folha.compraId, folha.qtd)); setFolha(null); }}>Marcar que chegou</Botao>
          </Acoes>
        </Folha>
      )}
    </article>
  );
}

/* ——— Peças do layout ——— */

/** Seção: título com a ação ao lado, conteúdo embaixo. */
function Sec({ titulo, acao, children }: { titulo: string; acao?: ReactNode; children: ReactNode }) {
  return (
    <section className="dt-sec">
      <div className="dt-sec__topo"><h3 className="dt-sec__titulo">{titulo}</h3>{acao}</div>
      {children}
    </section>
  );
}

/** Botão ⋮ com um menu pequeno. Fecha ao escolher, ao tocar fora ou com Esc. */
function MenuMais({ rotulo, itens }: { rotulo: string; itens: { icone: string; rotulo: string; aoEscolher: () => void }[] }) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => { if (!raiz.current?.contains(e.target as Node)) setAberto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setAberto(false); } };
    document.addEventListener('pointerdown', fora);
    document.addEventListener('keydown', esc, true);
    return () => { document.removeEventListener('pointerdown', fora); document.removeEventListener('keydown', esc, true); };
  }, [aberto]);
  return (
    <span className="dt-menu-ancora" ref={raiz}>
      <BotaoIcone icone="more_vert" rotulo={rotulo} aria-haspopup="menu" aria-expanded={aberto} onClick={() => setAberto(!aberto)} />
      {aberto && (
        <ul className="cn-menu dt-menu" role="menu">
          {itens.map((x) => (
            <li key={x.rotulo} role="none">
              <button type="button" role="menuitem" className="cn-menu__item dt-menu__item" onClick={() => { setAberto(false); x.aoEscolher(); }}>
                <Icone nome={x.icone} />{x.rotulo}
              </button>
            </li>
          ))}
        </ul>
      )}
    </span>
  );
}

function IconeZap() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3.2a8.8 8.8 0 0 0-7.6 13.2L3.2 20.8l4.5-1.2A8.8 8.8 0 1 0 12 3.2z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9.2 7.6c-.3 0-.7.1-.9.5-.4.6-.7 1.4-.4 2.4.6 2 2.5 4 4.6 4.8 1 .4 1.8.2 2.4-.3.4-.3.5-.7.5-1 0-.2-.1-.3-.3-.4l-1.6-.8c-.2-.1-.4 0-.5.1l-.6.7c-.1.1-.3.2-.5.1-1-.4-1.9-1.3-2.3-2.3-.1-.2 0-.4.1-.5l.5-.6c.1-.2.2-.4.1-.6l-.7-1.7c-.1-.3-.2-.4-.4-.4h-.5z" fill="currentColor" />
    </svg>
  );
}

function LinhaResumo({ icone, texto, apoio, vencido }: { icone: string; texto: string; apoio?: string; vencido?: boolean }) {
  return (
    <div className={'dt-resumo__linha' + (vencido ? ' dt-resumo__linha--vencido' : '')}>
      <Icone nome={icone} />
      <span className="dt-resumo__texto"><span className="body-medium">{texto}</span>{apoio && <span className="body-small texto-apoio">{apoio}</span>}</span>
    </div>
  );
}

function Par({ rotulo, valor }: { rotulo: string; valor: string }) {
  return <div className="dt-par"><span className="label-medium texto-apoio">{rotulo}</span><span className="dt-numero num">{valor}</span></div>;
}

/* ——— Resumo: o que importa de cada tipo, em cima ——— */
function Resumo({ p }: { p: Pendencia }) {
  const { db, hoje, ir } = useApp();
  const sit = situacao(db, p, hoje), m = meta(p, sit, hoje);

  if (p.tipo === 'compra') {
    const c = contagem(db, p);
    return (
      <section className="dt-resumo" aria-label="Quantidade">
        <div className="dt-resumo__topo">
          <span className="label-medium texto-apoio">Quantidade</span>
          <Botao variante="text" icone="inventory_2" className="dt-btn-pequeno" onClick={() => ir('inventario', porId(db.itens, p.itemId) ? p.itemId : null)}>Ver no inventário</Botao>
        </div>
        <p className="dt-numero num">{c.tem} de {c.precisa}</p>
        <BarraUnidades tem={c.tem} caminho={c.cam} falta={c.falta} precisa={c.precisa} semTotal />
        <LinhaResumo icone={m.icone} texto={m.texto} vencido={m.vencido} />
      </section>
    );
  }
  if (p.tipo === 'tarefa') {
    return (
      <section className="dt-resumo" aria-label="Prazo">
        <Par rotulo="Prazo" valor={p.prazo ? br(p.prazo) : '—'} />
        {sit.bloqueio && !p.feito
          ? <LinhaResumo icone="lock" texto={sit.bloqueio.texto} />
          : <LinhaResumo icone={m.icone} texto={m.texto} apoio={p.prazo && !p.feito && !sit.atrasado ? quandoTexto(p.prazo, hoje) : undefined} vencido={m.vencido} />}
      </section>
    );
  }
  if (p.tipo === 'servico') {
    const linha = p.feito ? { icone: 'check_circle', texto: p.pago ? 'Feito e pago' : 'Feito · falta pagar' }
      : !p.data ? { icone: 'event_upcoming', texto: 'Sem data' }
      : sit.atrasado ? { icone: 'event_busy', texto: 'Atrasado há ' + -dias(hoje, p.data) + (dias(hoje, p.data) === -1 ? ' dia' : ' dias') }
      : { icone: 'event', texto: quandoTexto(p.data, hoje) };
    return (
      <section className="dt-resumo" aria-label="Data e valor">
        <div className="dt-grade">
          <Par rotulo={p.quando === 'dia' ? 'Data' : 'Fazer até'} valor={p.data ? br(p.data) : '—'} />
          <Par rotulo="Valor" valor={p.valor ? brl(p.valor) : '—'} />
        </div>
        <LinhaResumo icone={linha.icone} texto={linha.texto} vencido={sit.atrasado} />
      </section>
    );
  }
  const atraso = -dias(hoje, p.vencimento);
  const vencTexto = p.pago ? 'Pago' : sit.atrasado ? 'Venceu há ' + atraso + (atraso === 1 ? ' dia' : ' dias')
    : p.vencimento === hoje ? 'Vence hoje' : 'Vence ' + quandoTexto(p.vencimento, hoje).toLowerCase();
  return (
    <section className="dt-resumo" aria-label="Valor e vencimento">
      <div className="dt-grade">
        <Par rotulo="Valor" valor={brl(p.valor)} />
        <Par rotulo="Vencimento" valor={br(p.vencimento)} />
      </div>
      <LinhaResumo icone={p.pago ? 'check_circle' : sit.atrasado ? 'event_busy' : 'event'} texto={vencTexto} vencido={sit.atrasado} />
    </section>
  );
}

/* ——— Rodapé com a ação principal de cada tipo (fica preso embaixo) ——— */
function Rod({ children }: { children: ReactNode }) { return <footer className="dt-rodape cn-actions">{children}</footer>; }

function Rodape({ p, setModo, setFolha }: { p: Pendencia; setModo: (m: Modo2) => void; setFolha: (f: FolhaChegou) => void }) {
  const { db, hoje, fazer } = useApp();
  if (p.tipo === 'compra') {
    const c = contagem(db, p), ab = abertas(p);
    if (!ab.length && c.falta <= 0) return null;
    const chegou = () => { const k = ab[0]; if (k.qtd > 1) setFolha({ compraId: k.id, max: k.qtd, qtd: k.qtd }); else fazer((x) => A.marcarChegou(x, p.id, k.id, 1)); };
    return (
      <Rod>
        {c.falta > 0 && ab.length > 0 && <Botao variante="outlined" icone="add_shopping_cart" onClick={() => setModo('comprar')}>Já comprei mais</Botao>}
        {ab.length > 0 && <Botao icone="inventory" onClick={chegou}>Marcar que chegou</Botao>}
        {c.falta > 0 && !ab.length && <Botao icone="check" onClick={() => setModo('comprar')}>Já comprei</Botao>}
      </Rod>
    );
  }
  if (p.tipo === 'tarefa') {
    if (!p.feito && situacao(db, p, hoje).bloqueio) return null;
    return (
      <Rod>
        {p.feito
          ? <Botao variante="outlined" onClick={() => fazer((c) => A.marcarTarefa(c, p.id, false))}>Reabrir tarefa</Botao>
          : <Botao icone="check" onClick={() => fazer((c) => A.marcarTarefa(c, p.id, true))}>Marcar como feita</Botao>}
      </Rod>
    );
  }
  if (p.tipo === 'servico') {
    return (
      <Rod>
        {p.feito ? <Botao variante="outlined" onClick={() => fazer((c) => A.reabrirServico(c, p.id))}>Reabrir serviço</Botao> : (
          <>
            {!(p.quando === 'dia' && p.data) && <Botao variante="outlined" icone="event" onClick={() => setModo('agendar')}>Agendar dia</Botao>}
            <Botao icone="check" onClick={() => setModo('feito')}>Marcar como feito</Botao>
          </>
        )}
      </Rod>
    );
  }
  return (
    <Rod>
      {p.pago
        ? <Botao variante="outlined" onClick={() => fazer((c) => A.marcarPago(c, p.id, false))}>Marcar como não pago</Botao>
        : <Botao icone="check" onClick={() => fazer((c) => A.marcarPago(c, p.id, true))}>Marcar como pago</Botao>}
    </Rod>
  );
}

/* ——— Compra ——— */
function SecaoCompra({ p, modo, setModo, setFolha }: { p: PendCompra; modo: Modo2; setModo: (m: Modo2) => void; setFolha: (f: FolhaChegou) => void }) {
  const { db, hoje, fazer, abrir, confirmar } = useApp();
  const ab = abertas(p), chegaram = p.compras.filter((k) => k.chegou);
  const form = modo === 'comprar' || (typeof modo === 'object' && modo !== null);
  const editando = typeof modo === 'object' && modo !== null ? p.compras.find((k) => k.id === modo.compra) ?? null : null;
  const chegou = (kId: string, qtd: number) => { if (qtd > 1) setFolha({ compraId: kId, max: qtd, qtd }); else fazer((x) => A.marcarChegou(x, p.id, kId, 1)); };
  const remover = async (kId: string) => {
    if (await confirmar({ icone: 'remove_shopping_cart', titulo: 'Remover esta compra?', texto: 'Use quando a compra foi registrada por engano ou cancelada. Logo depois dá para desfazer.', acao: 'Remover' }))
      fazer((x) => A.excluirCompra(x, p.id, kId));
  };
  return (
    <>
      {ab.length > 0 && !form && (
        <Sec titulo="Compras a caminho">
          {ab.map((k) => {
            const atrasada = !!k.entrega && k.entrega < hoje;
            const tarefa = db.pendencias.find((t) => t.tipo === 'tarefa' && t.origemCompra === k.id);
            return (
              <div key={k.id} className="dt-compra">
                <div className="dt-compra__topo">
                  <span className="title-small">{k.qtd} {k.qtd > 1 ? 'unidades' : 'unidade'} · {ONDE[k.onde]}</span>
                  <MenuMais rotulo="Opções desta compra" itens={[
                    { icone: 'edit', rotulo: 'Editar compra', aoEscolher: () => setModo({ compra: k.id }) },
                    { icone: 'remove_shopping_cart', rotulo: 'Remover compra', aoEscolher: () => remover(k.id) },
                  ]} />
                </div>
                <ul className="dt-fatos">
                  <li><Icone nome="payments" tamanho={18} /><span className="num">{valorCompra(k)}</span></li>
                  <li className={atrasada ? 'dt-fatos__vencido' : undefined}>
                    <Icone nome={atrasada ? 'event_busy' : k.entrega ? 'local_shipping' : 'storefront'} tamanho={18} />
                    {k.entrega ? (atrasada ? 'Era para chegar ' : 'Entrega ') + br(k.entrega) + ' ' + noLocal(k.local) : 'Com quem comprou. Falta levar ao apê.'}
                  </li>
                  {k.rastreio && <li><Icone nome="qr_code_2" tamanho={18} /><span className="num">Rastreio {k.rastreio}</span></li>}
                  {k.link && <li><Icone nome="open_in_new" tamanho={18} /><a href={k.link} target="_blank" rel="noopener noreferrer">Ver o produto na loja</a></li>}
                  <li><Icone nome="person" tamanho={18} />{primeiroNome(porId(db.pessoas, k.quem)?.nome ?? 'Alguém')} · {br(k.data)}</li>
                </ul>
                {tarefa && (
                  <>
                    <Aviso>Passou da data e ainda não chegou. Foi criada a tarefa “Retirar na agência” para {nomeCanela(db.pessoas)}.</Aviso>
                    <div><Botao variante="text" icone="task_alt" className="dt-btn-pequeno" onClick={() => abrir(tarefa.id)}>Ver a tarefa de retirada</Botao></div>
                  </>
                )}
                {ab.length > 1 && <div><Botao variante="text" icone="inventory" className="dt-btn-pequeno" onClick={() => chegou(k.id, k.qtd)}>Marcar que chegou</Botao></div>}
              </div>
            );
          })}
        </Sec>
      )}

      {form && <section className="dt-sec"><FormCompra p={p} compra={editando} aoFechar={() => setModo(null)} /></section>}

      {chegaram.length > 0 && !form && (
        <Sec titulo="Já chegaram">
          <ul className="dt-lista">
            {chegaram.map((k) => (
              <li key={k.id} className="dt-item">
                <Icone nome="check_circle" style={{ color: 'var(--concluido-dot)' }} />
                <span className="dt-item__texto">
                  <span className="body-large">{k.qtd} {k.qtd > 1 ? 'unidades' : 'unidade'} · {ONDE[k.onde]}{k.onde !== 'reaproveitado' && k.valor ? ' · ' + brl(k.valor) : ''}</span>
                  <span className="body-small texto-apoio num">Entregue · {br(k.chegouEm)}</span>
                </span>
              </li>
            ))}
          </ul>
        </Sec>
      )}

      {!form && <SecaoDepois p={p} modo={modo} setModo={setModo} />}
    </>
  );
}

/* ——— Depois que chegar: lista no estilo do Google Tarefas ——— */
function SecaoDepois({ p, modo, setModo }: { p: PendCompra; modo: Modo2; setModo: (m: Modo2) => void }) {
  const { db, souAdm } = useApp();
  const [verFeitas, setVerFeitas] = useState(true);
  const depois = db.pendencias.filter((t): t is PendTarefa => t.tipo === 'tarefa' && t.depende === p.id);
  const abertasT = depois.filter((t) => !t.feito), feitas = depois.filter((t) => t.feito);
  if (!depois.length && !souAdm) return null;
  return (
    <Sec titulo="Depois que chegar">
      {modo === 'tarefaChegar' ? (
        CRIAR_LIGADO ? <FormTarefaChegar p={p} aoFechar={() => setModo(null)} /> : (
          <div className="dt-sec__caixa">
            <Indisponivel />
            <div><Botao variante="text" className="dt-btn-pequeno" onClick={() => setModo(null)}>Fechar</Botao></div>
          </div>
        )
      ) : souAdm && <button type="button" className="gt-add" onClick={() => setModo('tarefaChegar')}><Icone nome="add_task" />Adicionar tarefa</button>}
      {abertasT.length > 0 && <ul className="gt">{abertasT.map((t) => <ItemTarefa key={t.id} t={t} />)}</ul>}
      {!depois.length && <p className="body-medium texto-apoio dt-vazio">Nenhuma tarefa.</p>}
      {feitas.length > 0 && (
        <>
          <button type="button" className="gt-feitas" aria-expanded={verFeitas} onClick={() => setVerFeitas(!verFeitas)}>
            <Icone nome={verFeitas ? 'expand_more' : 'chevron_right'} />Concluídas ({feitas.length})
          </button>
          {verFeitas && <ul className="gt">{feitas.map((t) => <ItemTarefa key={t.id} t={t} />)}</ul>}
        </>
      )}
    </Sec>
  );
}

function ItemTarefa({ t }: { t: PendTarefa }) {
  const { db, hoje, fazer, abrir } = useApp();
  const st = situacao(db, t, hoje);
  const bloq = !!st.bloqueio && !t.feito;
  const nomes = responsaveis(db, t).ids.map((r) => primeiroNome(porId(db.pessoas, r)?.nome ?? '')).filter(Boolean).join(', ');
  return (
    <li className={'gt-item' + (t.feito ? ' gt-item--feito' : '')}>
      <button type="button" className={'gt-check' + (t.feito ? ' gt-check--feito' : '')} disabled={bloq}
        aria-label={bloq ? t.titulo + ': só depois que chegar' : (t.feito ? 'Reabrir ' : 'Concluir ') + t.titulo}
        onClick={() => fazer((c) => A.marcarTarefa(c, t.id, !t.feito))}>
        <Icone nome={t.feito ? 'check_circle' : 'radio_button_unchecked'} />
      </button>
      <span className="gt-corpo">
        <button type="button" className="gt-titulo gt-abrir" onClick={() => abrir(t.id)}>{t.titulo}</button>
        <span className="gt-det">Tarefa{nomes ? ' · ' + nomes : ''}</span>
        {!t.feito && (bloq || t.prazo) && (
          <span className="gt-chips">
            {t.prazo && <span className={'gt-chip' + (st.atrasado ? ' gt-chip--vencido' : '')}><Icone nome="event" /><span className="num">{br(t.prazo)}</span></span>}
            {bloq && <span className="gt-chip gt-chip--espera"><Icone nome="lock" />Aguarda entrega</span>}
          </span>
        )}
      </span>
    </li>
  );
}

function FormTarefaChegar({ p, aoFechar }: { p: PendCompra; aoFechar: () => void }) {
  const { fazer } = useApp();
  const [titulo, setTitulo] = useState('');
  const [erro, setErro] = useState('');
  const salvar = () => {
    if (titulo.trim().length < 2) { setErro('Escreva o que fazer, ex.: Pendurar o quadro.'); return; }
    fazer((c) => A.criarTarefaAoChegar(c, p.id, titulo));
    aoFechar();
  };
  return (
    <div className="app-caixa">
      <Campo rotulo="O que fazer quando chegar?" valor={titulo} aoMudar={(v) => { setTitulo(v); setErro(''); }} exemplo="Ex.: Pendurar o quadro" erro={erro} autoFocus aoEnter={salvar}
        ajuda="A tarefa fica com cadeado até a compra chegar." />
      <Acoes>
        <Botao variante="outlined" onClick={aoFechar}>Cancelar</Botao>
        <Botao icone="add_task" onClick={salvar}>Criar tarefa</Botao>
      </Acoes>
    </div>
  );
}

/* ——— Tarefa ——— */
function SecaoTarefa({ p }: { p: PendTarefa }) {
  const { db, hoje, abrir } = useApp();
  const sit = situacao(db, p, hoje);
  if (!sit.bloqueio && !p.origemPend) return null;
  return (
    <div className="dt-sec">
      {sit.bloqueio && !p.feito && (
        <>
          <Aviso icone="lock" titulo="Ainda não dá para fazer">{sit.bloqueio.texto}.</Aviso>
          <div><Botao variante="text" icone="shopping_cart" className="dt-btn-pequeno" onClick={() => abrir(sit.bloqueio!.depId)}>Ver a compra</Botao></div>
        </>
      )}
      {p.origemPend && (
        <>
          <Aviso>Criada sozinha: a encomenda passou da data e ainda não chegou na agência.</Aviso>
          {porId(db.pendencias, p.origemPend) && <div><Botao variante="text" icone="shopping_cart" className="dt-btn-pequeno" onClick={() => abrir(p.origemPend!)}>Ver a compra</Botao></div>}
        </>
      )}
    </div>
  );
}

/* ——— Serviço ——— */
function SecaoServico({ p, modo, setModo }: { p: PendServico; modo: Modo2; setModo: (m: Modo2) => void }) {
  const { db, abrir } = useApp();
  const pg = db.pendencias.find((x): x is PendPagamento => x.tipo === 'pagamento' && x.origemServico === p.id);
  const nome = p.pessoa || 'Sem nome';
  return (
    <>
      {modo === 'feito' && <FormServicoFeito p={p} aoFechar={() => setModo(null)} />}
      {modo === 'agendar' && <FormAgendar p={p} aoFechar={() => setModo(null)} />}
      <Sec titulo="Quem vai fazer">
        <ul className="dt-lista">
          <li className="dt-item">
            <Avatar nome={nome} tamanho={36} decorativo />
            <span className="dt-item__texto">
              <span className="body-large">{nome}</span>
              {p.telefone && <span className="body-small texto-apoio num">{p.telefone}</span>}
            </span>
            {p.telefone && <a className="cn-icon-btn" href={telHref(p.telefone)} aria-label={'Ligar para ' + nome} title="Ligar"><Icone nome="call" /></a>}
            {p.telefone && ehCelular(p.telefone) && (
              <a className="cn-icon-btn dt-zap" href={whatsHref(p.telefone)} target="_blank" rel="noopener noreferrer" aria-label={'Abrir WhatsApp de ' + nome} title="WhatsApp"><IconeZap /></a>
            )}
          </li>
        </ul>
      </Sec>
      {pg && (
        <ul className="dt-lista">
          <li>
            <button type="button" className="dt-item dt-item--botao" onClick={() => abrir(pg.id)}>
              <Icone nome="payments" className="dt-item__icone" />
              <span className="dt-item__texto">
                <span className="label-medium texto-apoio">Pagamento</span>
                <span className="body-large num">{brl(pg.valor)} · vence {br(pg.vencimento)}</span>
              </span>
              <Icone nome="chevron_right" className="dt-item__icone" />
            </button>
          </li>
        </ul>
      )}
    </>
  );
}

function FormServicoFeito({ p, aoFechar }: { p: PendServico; aoFechar: () => void }) {
  const { hoje, fazer } = useApp();
  const [pago, setPago] = useState<'sim' | 'nao' | null>(null);
  const [venc, setVenc] = useState(br(somar(hoje, 5)));
  const [erros, setErros] = useState<Record<string, string>>({});
  const confirmarFeito = () => {
    if (!pago) { setErros({ pago: 'Responda se o serviço já foi pago.' }); return; }
    const v = deBR(venc);
    if (pago === 'nao' && !v) { setErros({ venc: 'Essa data não existe. Use DD/MM/AAAA, ex.: 30/10/2026.' }); return; }
    fazer((c) => A.marcarServicoFeito(c, p.id, pago === 'sim', v));
    aoFechar();
  };
  return (
    <div className="app-caixa">
      <Escolha rotulo="O serviço já foi pago?" valor={pago} erro={erros.pago} aoMudar={(v) => { setPago(v); setErros({}); }}
        opcoes={[{ valor: 'sim', rotulo: 'Sim, já foi pago' }, { valor: 'nao', rotulo: 'Ainda não' }]} />
      {pago === 'nao' && (
        <CampoData rotulo="Até quando precisa pagar?" valor={venc} aoMudar={(v) => { setVenc(v); setErros({}); }} erro={erros.venc}
          ajuda="Vamos criar uma pendência de pagamento com esse vencimento." exemplo="Ex.: 30/10/2026" />
      )}
      <Acoes>
        <Botao variante="outlined" onClick={aoFechar}>Cancelar</Botao>
        <Botao icone="check" onClick={confirmarFeito}>Marcar como feito</Botao>
      </Acoes>
    </div>
  );
}

function FormAgendar({ p, aoFechar }: { p: PendServico; aoFechar: () => void }) {
  const { fazer } = useApp();
  const [data, setData] = useState(p.data ? br(p.data) : '');
  const [erro, setErro] = useState('');
  const salvar = () => {
    const v = deBR(data);
    if (!v) { setErro('Essa data não existe. Use DD/MM/AAAA, ex.: 27/10/2026.'); return; }
    fazer((c) => A.agendarServico(c, p.id, v));
    aoFechar();
  };
  return (
    <div className="app-caixa">
      <CampoData rotulo="Qual dia ficou marcado?" valor={data} aoMudar={(v) => { setData(v); setErro(''); }} erro={erro} autoFocus aoEnter={salvar} />
      <Acoes>
        <Botao variante="outlined" onClick={aoFechar}>Cancelar</Botao>
        <Botao icone="event_available" onClick={salvar}>Salvar dia</Botao>
      </Acoes>
    </div>
  );
}

/* ——— Pagamento ——— */
function SecaoPagamento({ p, modo, setModo }: { p: PendPagamento; modo: Modo2; setModo: (m: Modo2) => void }) {
  const { db, fazer, abrir } = useApp();
  const valido = linkValido(p.comprovante);
  const serv = p.origemServico ? porId(db.pendencias, p.origemServico) : null;
  const acao = modo === 'comprovante' ? undefined : p.comprovante
    ? <MenuMais rotulo="Opções do comprovante" itens={[
        { icone: 'edit', rotulo: 'Trocar link', aoEscolher: () => setModo('comprovante') },
        { icone: 'link_off', rotulo: 'Remover', aoEscolher: () => fazer((c) => A.salvarComprovante(c, p.id, '')) },
      ]} />
    : <Botao variante="text" icone="add_link" className="dt-btn-pequeno" onClick={() => setModo('comprovante')}>Adicionar</Botao>;
  return (
    <>
      <Sec titulo="Comprovante" acao={acao}>
        {modo === 'comprovante' ? <FormComprovante p={p} aoFechar={() => setModo(null)} />
          : p.comprovante ? <ListaLinks><ItemLink href={valido ? p.comprovante : '#'} texto={p.comprovante} icone="description" iconeFim={valido ? 'open_in_new' : undefined} /></ListaLinks>
          : <p className="body-medium texto-apoio dt-vazio">Nenhum comprovante.</p>}
      </Sec>
      {serv && (
        <ul className="dt-lista">
          <li>
            <button type="button" className="dt-item dt-item--botao" onClick={() => abrir(serv.id)}>
              <Icone nome="handyman" className="dt-item__icone" />
              <span className="dt-item__texto"><span className="label-medium texto-apoio">Serviço</span><span className="body-large">{serv.titulo}</span></span>
              <Icone nome="chevron_right" className="dt-item__icone" />
            </button>
          </li>
        </ul>
      )}
    </>
  );
}

function FormComprovante({ p, aoFechar }: { p: PendPagamento; aoFechar: () => void }) {
  const { fazer } = useApp();
  const [link, setLink] = useState(p.comprovante);
  const [erro, setErro] = useState('');
  const salvar = () => {
    const l = normalizarLink(link);
    if (!linkValido(l)) { setErro('Cole o link completo, ex.: https://drive.google.com/…'); return; }
    fazer((c) => A.salvarComprovante(c, p.id, l));
    aoFechar();
  };
  return (
    <div className="app-caixa">
      <Campo rotulo="Link do comprovante" valor={link} aoMudar={(v) => { setLink(v); setErro(''); }} icone="link" inputMode="url" exemplo="Ex.: https://drive.google.com/…" erro={erro} autoFocus aoEnter={salvar} />
      <Acoes>
        <Botao variante="outlined" onClick={aoFechar}>Cancelar</Botao>
        <Botao icone="check" onClick={salvar}>Salvar link</Botao>
      </Acoes>
    </div>
  );
}

/* ——— Links de sugestão (vários, com o escolhido marcado) ——— */
function SecaoLinks({ p, aberto, abrir, fecharForm }: { p: Pendencia; aberto: boolean; abrir: () => void; fecharForm: () => void }) {
  const { fazer, confirmar } = useApp();
  const [texto, setTexto] = useState('');
  const [url, setUrl] = useState('');
  const [preco, setPreco] = useState('');
  const [erro, setErro] = useState('');
  const salvar = () => {
    if (!texto.trim()) { setErro('Escreva o nome da loja e do produto, ex.: Loja de cama — toalha branca.'); return; }
    fazer((c) => A.adicionarLink(c, p.id, { texto, url: normalizarLink(url), preco: valorDe(preco) }));
    setTexto(''); setUrl(''); setPreco('');
    fecharForm();
  };
  const remover = async (lid: string) => {
    if (await confirmar({ icone: 'link_off', titulo: 'Remover este link?', texto: 'Logo depois dá para desfazer.', acao: 'Remover' })) fazer((c) => A.removerLink(c, p.id, lid));
  };
  return (
    <Sec titulo={p.tipo === 'compra' ? 'Onde comprar' : 'Links'}
      acao={!aberto && <Botao variante="text" icone="add_link" className="dt-btn-pequeno" onClick={abrir}>Adicionar</Botao>}>
      {!p.links.length && !aberto && <p className="body-medium texto-apoio dt-vazio">Nenhum link.</p>}
      {p.links.length > 0 && (
        <ul className="dt-lista">
          {p.links.map((l) => (
            <li key={l.id} className="dt-link">
              <Icone nome={l.escolhido ? 'verified' : 'link'} className="dt-item__icone" />
              <span className="dt-link__texto">
                {l.url ? <a href={l.url} target="_blank" rel="noopener noreferrer">{l.texto}</a> : <span className="body-large">{l.texto}</span>}
                {(l.escolhido || l.preco) && <span className="body-small texto-apoio num">{[l.escolhido ? 'Escolhido' : '', l.preco ? brl(l.preco) : ''].filter(Boolean).join(' · ')}</span>}
              </span>
              <MenuMais rotulo={'Opções de ' + l.texto} itens={[
                { icone: l.escolhido ? 'remove_done' : 'verified', rotulo: l.escolhido ? 'Desmarcar' : 'Marcar como escolhido', aoEscolher: () => fazer((c) => A.escolherLink(c, p.id, l.id)) },
                { icone: 'delete', rotulo: 'Remover', aoEscolher: () => remover(l.id) },
              ]} />
            </li>
          ))}
        </ul>
      )}
      {aberto && (
        <div className="app-caixa">
          <Campo rotulo="Nome da loja e do produto" valor={texto} aoMudar={(v) => { setTexto(v); setErro(''); }} exemplo="Ex.: Loja de cama — toalha branca" erro={erro} autoFocus />
          <Campo rotulo="Link da página (se tiver)" valor={url} aoMudar={setUrl} icone="link" inputMode="url" exemplo="Ex.: https://loja.com.br/toalha" />
          <CampoValor rotulo="Preço (se souber)" valor={preco} aoMudar={setPreco} exemplo="Ex.: 39,90" larguraMax={240} />
          <Acoes>
            <Botao variante="outlined" onClick={fecharForm}>Cancelar</Botao>
            <Botao onClick={salvar}>Salvar link</Botao>
          </Acoes>
        </div>
      )}
    </Sec>
  );
}

/* ——— Observações ——— */
function SecaoObs({ p, aberto, abrir, fecharForm }: { p: Pendencia; aberto: boolean; abrir: () => void; fecharForm: () => void }) {
  const { fazer } = useApp();
  const [obs, setObs] = useState(p.obs);
  return (
    <Sec titulo="Observações" acao={!aberto && <BotaoIcone icone="edit_note" rotulo={p.obs ? 'Editar observações' : 'Escrever observação'} onClick={() => { setObs(p.obs); abrir(); }} />}>
      {aberto ? (
        <div className="app-caixa">
          <Campo rotulo="Observações" valor={obs} aoMudar={setObs} multilinha exemplo="Ex.: Cor branca, medir a janela antes" autoFocus />
          <Acoes>
            <Botao variante="outlined" onClick={() => { setObs(p.obs); fecharForm(); }}>Cancelar</Botao>
            <Botao icone="check" onClick={() => { fazer((c) => A.salvarObs(c, p.id, obs)); fecharForm(); }}>Salvar observações</Botao>
          </Acoes>
        </div>
      ) : p.obs ? <p className="body-medium app-quebra">{p.obs}</p> : <p className="body-medium texto-apoio dt-vazio">Nenhuma observação.</p>}
    </Sec>
  );
}

/* ——— Responsável: o adm cuida até alguém se oferecer ——— */
function SecaoResp({ p, modo, setModo }: { p: Pendencia; modo: Modo2; setModo: (m: Modo2) => void }) {
  const { db, eu, fazer } = useApp();
  const quem = responsaveis(db, p), adm = idAdm(db);
  const souResp = quem.ids.includes(eu.id);
  const sairPode = p.resp.includes(eu.id) && !(eu.id === adm && p.resp.length === 1);
  const acao = modo === 'resp' ? undefined
    : sairPode ? <Botao variante="text" icone="person_remove" className="dt-btn-pequeno" onClick={() => fazer((c) => A.naoVouCuidar(c, p.id))}>Não vou mais cuidar</Botao>
    : !souResp ? <Botao variante="outlined" icone="person_add" className="dt-btn-pequeno" onClick={() => fazer((c) => A.vouCuidar(c, p.id))}>{eu.id === adm ? 'Assumir' : 'Vou cuidar'}</Botao>
    : undefined;
  return (
    <Sec titulo="Responsável" acao={acao}>
      <ul className="dt-lista">
        {quem.ids.map((r) => porId(db.pessoas, r)).filter((x): x is NonNullable<typeof x> => !!x).map((x) => (
          <li key={x.id} className="dt-item">
            <Avatar nome={x.nome} decorativo />
            <span className="dt-item__texto">
              <span className="body-large">{x.nome}{x.id === eu.id ? ' (você)' : ''}</span>
              {quem.doAdm && <span className="body-small texto-apoio">Adm · padrão</span>}
            </span>
          </li>
        ))}
      </ul>
      {modo === 'resp' ? <FormResp p={p} aoFechar={() => setModo(null)} />
        : db.pessoas.length > 1 && <div><Botao variante="text" icone="group" className="dt-btn-pequeno" onClick={() => setModo('resp')}>Escolher responsáveis</Botao></div>}
    </Sec>
  );
}

function FormResp({ p, aoFechar }: { p: Pendencia; aoFechar: () => void }) {
  const { db, eu, fazer } = useApp();
  const [resp, setResp] = useState<string[]>(p.resp);
  return (
    <div className="app-caixa">
      <EscolhaVarias rotulo="Quem vai cuidar?" valores={resp} aoMudar={setResp} ajuda="Pode marcar mais de uma pessoa. Sem ninguém marcado, fica com o adm."
        opcoes={db.pessoas.map((x) => ({ valor: x.id, rotulo: primeiroNome(x.nome) + (x.id === eu.id ? ' (você)' : '') }))} />
      <Acoes>
        <Botao variante="outlined" onClick={aoFechar}>Cancelar</Botao>
        <Botao icone="check" onClick={() => { fazer((c) => A.definirResponsaveis(c, p.id, resp)); aoFechar(); }}>Salvar responsáveis</Botao>
      </Acoes>
    </div>
  );
}

/* ——— Editar informações ——— */
function FormEditar({ p, aoFechar }: { p: Pendencia; aoFechar: () => void }) {
  const { db, fazer } = useApp();
  const [titulo, setTitulo] = useState(p.titulo);
  const [apto, setApto] = useState<Apto>(p.apto);
  const [urg, setUrg] = useState<Urgencia>(p.urgencia);
  const item = p.tipo === 'compra' ? porId(db.itens, p.itemId) : null;
  const [precisa, setPrecisa] = useState(item?.precisa ?? 1);
  const [prazo, setPrazo] = useState(p.tipo === 'tarefa' ? br(p.prazo) : '');
  const [pessoa, setPessoa] = useState(p.tipo === 'servico' ? p.pessoa : '');
  const [tel, setTel] = useState(p.tipo === 'servico' ? p.telefone : '');
  const [valor, setValor] = useState(p.tipo === 'servico' || p.tipo === 'pagamento' ? valorTexto(p.valor) : '');
  const [quando, setQuando] = useState<'dia' | 'ate'>(p.tipo === 'servico' ? p.quando : 'ate');
  const [data, setData] = useState(p.tipo === 'servico' ? br(p.data) : p.tipo === 'pagamento' ? br(p.vencimento) : '');
  const [erros, setErros] = useState<Record<string, string>>({});
  const msgData = 'Essa data não existe. Use DD/MM/AAAA, ex.: 25/10/2026.';
  const limpa = (k: string) => setErros((x) => ({ ...x, [k]: '' }));

  const salvar = () => {
    const e: Record<string, string> = {};
    if (titulo.trim().length < 2) e.titulo = 'Escreva um nome com pelo menos 2 letras.';
    const vPrazo = deBR(prazo), vData = deBR(data), vValor = valorDe(valor);
    if (p.tipo === 'tarefa' && prazo && !vPrazo) e.prazo = msgData;
    if (p.tipo === 'servico' && data && !vData) e.data = msgData;
    if (p.tipo === 'servico' && valor && vValor == null) e.valor = 'Digite só números, ex.: 450,00.';
    if (p.tipo === 'pagamento' && !(vValor && vValor > 0)) e.valor = 'Digite quanto é, ex.: 900,00.';
    if (p.tipo === 'pagamento' && !vData) e.data = msgData;
    if (Object.keys(e).length) { setErros(e); return; }
    const base = { titulo: titulo.trim(), apto, urgencia: urg };
    let patch: Partial<Pendencia> = base;
    if (p.tipo === 'tarefa') patch = { ...base, prazo: vPrazo } as Partial<PendTarefa>;
    if (p.tipo === 'servico') patch = { ...base, pessoa: pessoa.trim(), telefone: tel.trim(), valor: vValor || 0, quando, data: vData } as Partial<PendServico>;
    if (p.tipo === 'pagamento') patch = { ...base, valor: vValor || 0, vencimento: vData! } as Partial<PendPagamento>;
    fazer((c) => {
      const r = A.editarPendencia(c, p.id, patch);
      if (!(p.tipo === 'compra' && item && precisa !== item.precisa)) return r;
      // A quantidade mora no item do inventário: aplica o nome novo e a quantidade juntos.
      const c2 = { ...c, db: A.simular(c.db, r.ops) };
      const r2 = A.mudarItem(c2, item.id, { precisa });
      const ops = [...r.ops.filter((o) => !r2.ops.some((x) => x.col === o.col && x.id === o.id)), ...r2.ops];
      return { ops, msg: r.msg };
    });
    aoFechar();
  };

  return (
    <section className="dt-sec dt-sec--form">
      <h3 className="dt-sec__titulo">Editar informações</h3>
      <Campo rotulo="Nome" valor={titulo} aoMudar={(v) => { setTitulo(v); limpa('titulo'); }} erro={erros.titulo} />
      <Escolha rotulo="Para qual apartamento?" valor={apto} aoMudar={setApto} opcoes={APTOS} />
      <Escolha rotulo="É essencial?" valor={urg} aoMudar={setUrg} opcoes={URGS} ajuda="Essencial: precisa estar pronto antes de abrir os apês. Ganha a bandeira amarela." />
      {p.tipo === 'compra' && item && <PerguntaContador rotulo="Quantas precisa no total?" valor={precisa} min={1} max={99} aoMudar={setPrecisa} ajuda="Muda também no inventário." />}
      {p.tipo === 'tarefa' && <CampoData rotulo="Prazo (se tiver)" valor={prazo} aoMudar={(v) => { setPrazo(v); limpa('prazo'); }} erro={erros.prazo} />}
      {p.tipo === 'servico' && (
        <>
          <Campo rotulo="Nome da pessoa ou empresa" valor={pessoa} aoMudar={setPessoa} icone="person" exemplo="Ex.: Eletricista Marcos" />
          <CampoTelefone rotulo="Telefone" valor={tel} aoMudar={setTel} />
          <CampoValor rotulo="Valor" valor={valor} aoMudar={(v) => { setValor(v); limpa('valor'); }} erro={erros.valor} exemplo="Ex.: 450,00" />
          <Escolha rotulo="Quando vai ser?" valor={quando} aoMudar={setQuando} opcoes={[{ valor: 'dia', rotulo: 'Dia marcado' }, { valor: 'ate', rotulo: 'Até um dia' }]} />
          <CampoData rotulo={quando === 'dia' ? 'Data' : 'Até quando'} valor={data} aoMudar={(v) => { setData(v); limpa('data'); }} erro={erros.data} />
        </>
      )}
      {p.tipo === 'pagamento' && (
        <>
          <CampoValor rotulo="Valor" valor={valor} aoMudar={(v) => { setValor(v); limpa('valor'); }} erro={erros.valor} exemplo="Ex.: 900,00" />
          <CampoData rotulo="Vencimento" valor={data} aoMudar={(v) => { setData(v); limpa('data'); }} erro={erros.data} />
        </>
      )}
      <Acoes>
        <Botao variante="outlined" onClick={aoFechar}>Cancelar</Botao>
        <Botao icone="check" onClick={salvar}>Salvar mudanças</Botao>
      </Acoes>
    </section>
  );
}
