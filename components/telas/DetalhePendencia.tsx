/* Detalhe da pendência: campos em etapas por tipo, links, observações, responsáveis e o histórico no fim. */
import { useId, useState } from 'react';
import { useApp } from '../../app/contexto';
import * as A from '../../lib/acoes';
import { br, deBR, dias, quandoTexto, somar } from '../../lib/datas';
import { brl, ehCelular, linkValido, normalizarLink, primeiroNome, telHref, valorDe, valorTexto, whatsHref } from '../../lib/formatos';
import { abertas, contagem, noLocal, porId, situacao, TIPOS, valorCompra } from '../../lib/regras';
import type { Apto, Modo, Pendencia, PendCompra, PendPagamento, PendServico, PendTarefa, Urgencia } from '../../types';
import {
  Acoes, Aviso, Avatar, BarraUnidades, Botao, BotaoIcone, BotaoLink, Campo, CampoData, CampoTelefone, CampoValor, Detalhe,
  Escolha, EscolhaVarias, EtiquetaApto, EtiquetaUrgencia, Folha, Historico, Icone, ItemLink, ListaLinks, Meta, PerguntaContador,
  RodapeDetalhe, SecaoDetalhe, Status, Vazio,
} from '../ui';
import { FormCompra } from './FormCompra';

type Modo2 = null | 'comprar' | 'link' | 'obs' | 'resp' | 'editar' | 'feito' | 'agendar' | 'tarefaChegar' | 'comprovante' | { compra: string };
type FolhaChegou = { compraId: string; max: number; qtd: number };

const ONDE: Record<string, string> = { internet: 'Internet', local: 'Loja física', reaproveitado: 'Reaproveitado' };
const APTOS: { valor: Apto; rotulo: string }[] = [{ valor: '105', rotulo: '105' }, { valor: '306', rotulo: '306' }, { valor: 'Ambos', rotulo: 'Ambos' }];
const URGS = (['Essencial', 'Útil', 'Extra'] as Urgencia[]).map((u) => ({ valor: u, rotulo: u }));
const MODOS: { valor: Modo; rotulo: string }[] = [{ valor: 'casa', rotulo: 'Dá para fazer de casa' }, { valor: 'presencial', rotulo: 'Presencial em Canela' }];

function nomeCanela(pessoas: { nome: string; local: string }[]) {
  return pessoas.filter((x) => x.local === 'canela').map((x) => primeiroNome(x.nome)).join(' e ') || 'quem está em Canela';
}

export function DetalhePendencia({ id }: { id: string }) {
  const { db, hoje, eu, fazer, fechar, confirmar } = useApp();
  const idTitulo = useId();
  const [modo, setModo] = useState<Modo2>(null);
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
  const souResp = p.resp.includes(eu.id);
  const fecharModo = () => setModo(null);
  const formCompraAberto = modo === 'comprar' || (typeof modo === 'object' && modo !== null);

  const excluir = async () => {
    const extra = p.tipo === 'compra' ? ' O item também sai do inventário.' : '';
    const ok = await confirmar({ icone: 'delete', titulo: 'Excluir “' + p.titulo + '”?', texto: 'A pendência some para todo mundo.' + extra + ' Logo depois dá para desfazer.', acao: 'Excluir' });
    if (!ok) return;
    fazer((c) => A.excluirPendencia(c, p.id));
    fechar();
  };

  return (
    <Detalhe idTitulo={idTitulo}>
      <div className="cn-detail__head">
        <div className="cn-detail__chips">
          <Status tom={sit.tom}>{sit.rotulo}</Status>
          <EtiquetaUrgencia urgencia={p.urgencia} />
          <EtiquetaApto apto={p.apto} />
        </div>
        <BotaoIcone icone="close" rotulo="Fechar" onClick={fechar} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        <Meta icone={T.icone}>{T.rotulo} · {p.modo === 'casa' ? 'dá para fazer de casa' : 'presencial em Canela'}</Meta>
        <h2 className="cn-detail__title" id={idTitulo} style={{ margin: 0 }}>{p.titulo}</h2>
      </div>

      {modo === 'editar' ? <FormEditar p={p} aoFechar={fecharModo} /> : (
        <>
          {p.tipo === 'compra' && <SecaoCompra p={p} modo={modo} setModo={setModo} setFolha={setFolha} />}
          {p.tipo === 'tarefa' && <SecaoTarefa p={p} />}
          {p.tipo === 'servico' && <SecaoServico p={p} modo={modo} setModo={setModo} />}
          {p.tipo === 'pagamento' && <SecaoPagamento p={p} modo={modo} setModo={setModo} />}

          {(p.tipo !== 'compra' || p.links.length > 0 || (contagem(db, p).falta > 0 && !formCompraAberto)) && (
            <SecaoLinks p={p} aberto={modo === 'link'} abrir={() => setModo('link')} fecharForm={fecharModo} />
          )}
          <SecaoObs p={p} aberto={modo === 'obs'} abrir={() => setModo('obs')} fecharForm={fecharModo} />

          <SecaoDetalhe titulo="Responsáveis">
            {p.resp.length > 0 ? (
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', margin: 0, padding: 0, listStyle: 'none' }}>
                {p.resp.map((r) => porId(db.pessoas, r)).filter((x): x is NonNullable<typeof x> => !!x).map((x) => (
                  <li key={x.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}><Avatar nome={x.nome} decorativo /><span className="body-medium">{x.nome}{x.id === eu.id ? ' (você)' : ''}</span></li>
                ))}
              </ul>
            ) : <p className="body-medium texto-apoio">Ninguém cuidando ainda.</p>}
            {modo === 'resp' ? <FormResp p={p} aoFechar={fecharModo} /> : (
              <div className="app-linha-botoes">
                <Botao variante="outlined" icone={souResp ? 'person_remove' : 'person_add'} onClick={() => fazer((c) => A.alternarResponsavel(c, p.id))}>{souResp ? 'Não sou mais responsável' : 'Sou responsável'}</Botao>
                {db.pessoas.length > 1 && <Botao variante="text" icone="group" onClick={() => setModo('resp')}>Escolher responsáveis</Botao>}
              </div>
            )}
          </SecaoDetalhe>

          <SecaoDetalhe titulo="Mais opções">
            <div className="app-linha-botoes">
              <Botao variante="text" icone="edit" onClick={() => setModo('editar')}>Editar informações</Botao>
              <Botao variante="text" icone="delete" onClick={excluir}>Excluir pendência</Botao>
            </div>
          </SecaoDetalhe>
        </>
      )}

      <SecaoDetalhe titulo="Histórico">
        <Historico itens={p.hist.map((h) => ({ txt: h.txt, em: h.em, nome: h.quem ? porId(db.pessoas, h.quem)?.nome ?? 'Pessoa que saiu da lista' : null }))} />
      </SecaoDetalhe>

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
    </Detalhe>
  );
}

/* ——— Rodapé com a ação principal de cada tipo (fica preso embaixo) ——— */
function Rodape({ p, setModo, setFolha }: { p: Pendencia; setModo: (m: Modo2) => void; setFolha: (f: FolhaChegou) => void }) {
  const { db, hoje, fazer } = useApp();
  if (p.tipo === 'compra') {
    const c = contagem(db, p), ab = abertas(p);
    if (!ab.length && c.falta <= 0) return null;
    const chegou = () => { const k = ab[0]; if (k.qtd > 1) setFolha({ compraId: k.id, max: k.qtd, qtd: k.qtd }); else fazer((x) => A.marcarChegou(x, p.id, k.id, 1)); };
    return (
      <RodapeDetalhe>
        {c.falta > 0 && ab.length > 0 && <Botao variante="outlined" icone="add_shopping_cart" onClick={() => setModo('comprar')}>Já comprei mais</Botao>}
        {ab.length > 0 && <Botao icone="inventory" onClick={chegou}>Marcar que chegou</Botao>}
        {c.falta > 0 && !ab.length && <Botao icone="check" onClick={() => setModo('comprar')}>Já comprei</Botao>}
      </RodapeDetalhe>
    );
  }
  if (p.tipo === 'tarefa') {
    if (!p.feito && situacao(db, p, hoje).bloqueio) return null;
    return (
      <RodapeDetalhe>
        {p.feito
          ? <Botao variante="outlined" onClick={() => fazer((c) => A.marcarTarefa(c, p.id, false))}>Reabrir tarefa</Botao>
          : <Botao icone="check" onClick={() => fazer((c) => A.marcarTarefa(c, p.id, true))}>Marcar como feita</Botao>}
      </RodapeDetalhe>
    );
  }
  if (p.tipo === 'servico') {
    return (
      <RodapeDetalhe>
        {p.feito ? <Botao variante="outlined" onClick={() => fazer((c) => A.reabrirServico(c, p.id))}>Reabrir serviço</Botao> : (
          <>
            {!(p.quando === 'dia' && p.data) && <Botao variante="outlined" icone="event" onClick={() => setModo('agendar')}>Agendar dia</Botao>}
            <Botao icone="check" onClick={() => setModo('feito')}>Marcar como feito</Botao>
          </>
        )}
      </RodapeDetalhe>
    );
  }
  return (
    <RodapeDetalhe>
      {p.pago
        ? <Botao variante="outlined" onClick={() => fazer((c) => A.marcarPago(c, p.id, false))}>Marcar como não pago</Botao>
        : <Botao icone="check" onClick={() => fazer((c) => A.marcarPago(c, p.id, true))}>Marcar como pago</Botao>}
    </RodapeDetalhe>
  );
}

/* ——— Compra ——— */
function SecaoCompra({ p, modo, setModo, setFolha }: { p: PendCompra; modo: Modo2; setModo: (m: Modo2) => void; setFolha: (f: FolhaChegou) => void }) {
  const { db, hoje, fazer, abrir, ir, confirmar } = useApp();
  const sit = situacao(db, p, hoje);
  const c = contagem(db, p), ab = abertas(p), chegaram = p.compras.filter((k) => k.chegou);
  const form = modo === 'comprar' || (typeof modo === 'object' && modo !== null);
  const editando = typeof modo === 'object' && modo !== null ? p.compras.find((k) => k.id === modo.compra) ?? null : null;
  const depois = db.pendencias.filter((t): t is PendTarefa => t.tipo === 'tarefa' && t.depende === p.id);
  const chegou = (kId: string, qtd: number) => { if (qtd > 1) setFolha({ compraId: kId, max: qtd, qtd }); else fazer((x) => A.marcarChegou(x, p.id, kId, 1)); };
  const remover = async (kId: string) => {
    if (await confirmar({ icone: 'remove_shopping_cart', titulo: 'Remover esta compra?', texto: 'Use quando a compra foi registrada por engano ou cancelada. Logo depois dá para desfazer.', acao: 'Remover' }))
      fazer((x) => A.excluirCompra(x, p.id, kId));
  };
  return (
    <>
      <SecaoDetalhe titulo="Quantidade">
        {c.tem + c.cam > 0 ? <BarraUnidades tem={c.tem} caminho={c.cam} falta={c.falta} precisa={c.precisa} />
          : <p className="body-medium">Precisa de {c.precisa}. Ainda não tem nenhuma.</p>}
        {sit.coluna === 'concluido' && <Aviso sucesso icone="check_circle">Tudo certo: {c.tem} de {c.precisa} no apartamento. Já está no inventário.</Aviso>}
        <div><Botao variante="text" icone="inventory_2" onClick={() => ir('inventario', porId(db.itens, p.itemId) ? p.itemId : null)}>Ver no inventário</Botao></div>
      </SecaoDetalhe>

      {ab.length > 0 && !form && (
        <SecaoDetalhe titulo="Compras a caminho">
          {ab.map((k) => {
            const atrasada = !!k.entrega && k.entrega < hoje;
            const tarefa = db.pendencias.find((t) => t.tipo === 'tarefa' && t.origemCompra === k.id);
            return (
              <div key={k.id} className="app-bloco">
                <p className="title-small">{k.qtd} {k.qtd > 1 ? 'unidades' : 'unidade'} · {ONDE[k.onde]}</p>
                <p className="body-medium num">{valorCompra(k)}</p>
                <Meta icone={atrasada ? 'event_busy' : k.entrega ? 'local_shipping' : 'storefront'} vencido={atrasada}>
                  {k.entrega ? (atrasada ? 'Era para chegar ' : 'Chega ') + br(k.entrega) + ' ' + noLocal(k.local) : 'Está com quem comprou. Falta levar ao apê.'}
                </Meta>
                {k.rastreio && <p className="body-small texto-apoio num">Código de rastreio: {k.rastreio}</p>}
                {k.link && <a className="body-medium" href={k.link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>Ver o produto na loja</a>}
                <p className="body-small texto-apoio">Comprado por {primeiroNome(porId(db.pessoas, k.quem)?.nome ?? 'Alguém')} em {br(k.data)}</p>
                {tarefa && (
                  <>
                    <Aviso>Passou da data e ainda não chegou. O sistema criou a tarefa “Retirar na agência” para {nomeCanela(db.pessoas)}.</Aviso>
                    <div><Botao variante="text" icone="task_alt" onClick={() => abrir(tarefa.id)}>Ver a tarefa de retirada</Botao></div>
                  </>
                )}
                <div className="app-linha-botoes">
                  <Botao variante="text" icone="edit" onClick={() => setModo({ compra: k.id })}>Editar compra</Botao>
                  <Botao variante="text" icone="inventory" onClick={() => chegou(k.id, k.qtd)}>Marcar que chegou</Botao>
                  <Botao variante="text" icone="remove_shopping_cart" onClick={() => remover(k.id)}>Remover</Botao>
                </div>
              </div>
            );
          })}
        </SecaoDetalhe>
      )}

      {form && <section className="cn-detail__section"><FormCompra p={p} compra={editando} aoFechar={() => setModo(null)} /></section>}

      {chegaram.length > 0 && !form && (
        <SecaoDetalhe titulo="Já chegaram">
          <ul className="app-lista">
            {chegaram.map((k) => (
              <li key={k.id} style={{ padding: 'var(--space-2) 0' }}>
                <Icone nome="check_circle" style={{ color: 'var(--concluido-dot)' }} />
                <span className="app-lista__texto">
                  <span className="body-medium">{k.qtd} {k.qtd > 1 ? 'unidades' : 'unidade'} · {ONDE[k.onde]}{k.onde !== 'reaproveitado' && k.valor ? ' · ' + brl(k.valor) : ''}</span>
                  <span className="body-small texto-apoio">Chegou em {br(k.chegouEm)}</span>
                </span>
              </li>
            ))}
          </ul>
        </SecaoDetalhe>
      )}

      {!form && (
        <SecaoDetalhe titulo="Depois que chegar">
          {depois.length > 0 ? depois.map((t) => {
            const st = situacao(db, t, hoje);
            return (
              <button key={t.id} type="button" className="app-row" style={{ padding: 'var(--space-2) var(--space-3)' }} onClick={() => abrir(t.id)}>
                <Icone nome={st.bloqueio ? 'lock' : 'task_alt'} className="app-row__icone" />
                <span className="app-row__texto"><span className="title-small">{t.titulo}</span></span>
                <Status tom={st.tom} pequeno>{st.rotulo}</Status>
              </button>
            );
          }) : <p className="body-medium texto-apoio">Nenhuma tarefa esperando esta compra. Ex.: quadro → “Pendurar o quadro”.</p>}
          {modo === 'tarefaChegar' ? <FormTarefaChegar p={p} aoFechar={() => setModo(null)} />
            : <div><Botao variante="text" icone="add_task" onClick={() => setModo('tarefaChegar')}>Criar tarefa para quando chegar</Botao></div>}
        </SecaoDetalhe>
      )}
    </>
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
  return (
    <SecaoDetalhe titulo="Sobre a tarefa">
      <Meta icone={p.modo === 'casa' ? 'home' : 'location_on'} style={{ fontSize: 14, lineHeight: '20px', color: 'var(--on-surface)' }}>{p.modo === 'casa' ? 'Dá para fazer de casa' : 'Presencial em Canela'}</Meta>
      <Meta icone={sit.atrasado ? 'event_busy' : 'event'} vencido={sit.atrasado} style={{ fontSize: 14, lineHeight: '20px' }}>{p.prazo ? (sit.atrasado ? 'Venceu ' : 'Até ') + br(p.prazo) : 'Sem prazo'}</Meta>
      {sit.bloqueio && (
        <>
          <Aviso icone="lock" titulo="Ainda não dá para fazer">{sit.bloqueio.texto}.</Aviso>
          <div><Botao variante="text" icone="shopping_cart" onClick={() => abrir(sit.bloqueio!.depId)}>Ver a compra</Botao></div>
        </>
      )}
      {p.origemPend && (
        <>
          <Aviso>O sistema criou esta tarefa porque a encomenda passou da data e ainda não chegou na agência.</Aviso>
          {porId(db.pendencias, p.origemPend) && <div><Botao variante="text" icone="shopping_cart" onClick={() => abrir(p.origemPend!)}>Ver a compra</Botao></div>}
        </>
      )}
      {p.feito && <Aviso sucesso icone="check_circle">Tarefa feita.</Aviso>}
    </SecaoDetalhe>
  );
}

/* ——— Serviço ——— */
function SecaoServico({ p, modo, setModo }: { p: PendServico; modo: Modo2; setModo: (m: Modo2) => void }) {
  const { db, hoje, abrir } = useApp();
  const sit = situacao(db, p, hoje);
  const pg = db.pendencias.find((x): x is PendPagamento => x.tipo === 'pagamento' && x.origemServico === p.id);
  return (
    <SecaoDetalhe titulo="Quem vai fazer">
      <p className="body-large">{p.pessoa || 'Ainda sem nome'}</p>
      {p.telefone && (
        <div className="app-linha-botoes">
          <BotaoLink icone="call" href={telHref(p.telefone)}>Ligar: {p.telefone}</BotaoLink>
          {ehCelular(p.telefone) && <BotaoLink icone="chat" href={whatsHref(p.telefone)} target="_blank" rel="noopener noreferrer">WhatsApp</BotaoLink>}
        </div>
      )}
      <div className="app-grade-2">
        <div className="app-par"><span className="label-medium texto-apoio">Valor combinado</span><span className="body-large num">{p.valor ? brl(p.valor) : 'Não informado'}</span></div>
        <div className="app-par">
          <span className="label-medium texto-apoio">{p.quando === 'dia' ? 'Data agendada' : 'Fazer até'}</span>
          <span className="body-large num">{p.data ? br(p.data) : 'Sem data'}</span>
          {p.data && !p.feito && <Meta vencido={sit.atrasado}>{sit.atrasado ? 'Passou da data.' : quandoTexto(p.data, hoje)}</Meta>}
        </div>
      </div>
      {p.feito && <div><Status tom={p.pago ? 'concluido' : 'pendente'} pequeno>{p.pago ? 'Pago' : 'Ainda não foi pago'}</Status></div>}
      {pg && (
        <>
          <Aviso icone="payments" titulo="Pendência de pagamento criada">Pagamento de {brl(pg.valor)} · vence {br(pg.vencimento)}</Aviso>
          <div><Botao variante="text" icone="payments" onClick={() => abrir(pg.id)}>Ver o pagamento</Botao></div>
        </>
      )}
      {modo === 'feito' && <FormServicoFeito p={p} aoFechar={() => setModo(null)} />}
      {modo === 'agendar' && <FormAgendar p={p} aoFechar={() => setModo(null)} />}
    </SecaoDetalhe>
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
  const { db, hoje, fazer, abrir } = useApp();
  const sit = situacao(db, p, hoje);
  const atraso = -dias(hoje, p.vencimento);
  const vencTexto = p.pago ? 'Pago' : sit.atrasado ? 'Venceu há ' + atraso + (atraso === 1 ? ' dia' : ' dias')
    : p.vencimento === hoje ? 'Vence hoje' : 'Vence ' + quandoTexto(p.vencimento, hoje).toLowerCase();
  const valido = linkValido(p.comprovante);
  return (
    <SecaoDetalhe titulo="Pagamento">
      <div className="app-grade-2">
        <div className="app-par"><span className="label-medium texto-apoio">Valor</span><span className="title-large num">{brl(p.valor)}</span></div>
        <div className="app-par"><span className="label-medium texto-apoio">Vencimento</span><span className="title-large num">{br(p.vencimento)}</span><Meta vencido={sit.atrasado}>{vencTexto}</Meta></div>
      </div>
      <h4 className="title-small">Comprovante</h4>
      {modo === 'comprovante' ? <FormComprovante p={p} aoFechar={() => setModo(null)} /> : p.comprovante ? (
        <>
          <ListaLinks><ItemLink href={valido ? p.comprovante : '#'} texto={p.comprovante} icone="description" iconeFim={valido ? 'open_in_new' : undefined} /></ListaLinks>
          <div className="app-linha-botoes">
            <Botao variante="text" icone="edit" onClick={() => setModo('comprovante')}>Trocar link</Botao>
            <Botao variante="text" icone="link_off" onClick={() => fazer((c) => A.salvarComprovante(c, p.id, ''))}>Remover</Botao>
          </div>
        </>
      ) : (
        <>
          <p className="body-medium texto-apoio">Nenhum comprovante ainda. Guarde o arquivo no Drive ou no e-mail e cole o link aqui.</p>
          <div><Botao variante="outlined" icone="add_link" onClick={() => setModo('comprovante')}>Adicionar link do comprovante</Botao></div>
        </>
      )}
      {p.origemServico && porId(db.pendencias, p.origemServico) && <div><Botao variante="text" icone="handyman" onClick={() => abrir(p.origemServico!)}>Ver o serviço</Botao></div>}
    </SecaoDetalhe>
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
    <SecaoDetalhe titulo={p.tipo === 'compra' ? 'Sugestões de onde comprar' : 'Links de sugestão'}>
      {!p.links.length && <p className="body-medium texto-apoio">Ninguém sugeriu um link ainda.</p>}
      {p.links.length > 0 && (
        <ul className="app-lista">
          {p.links.map((l) => (
            <li key={l.id} style={{ padding: 'var(--space-2) 0', gap: 'var(--space-2)' }}>
              <span style={{ flex: '1 1 220px', minWidth: 0 }}>
                <ListaLinks><ItemLink href={l.url || '#'} texto={l.texto} preco={l.preco ? brl(l.preco) : undefined} icone={l.escolhido ? 'verified' : 'link'}
                  onClick={(e) => { if (!l.url) e.preventDefault(); }} /></ListaLinks>
              </span>
              <span className="app-linha-botoes" style={{ alignItems: 'center' }}>
                {l.escolhido && <Status tom="concluido" pequeno>Escolhido</Status>}
                <Botao variante="text" onClick={() => fazer((c) => A.escolherLink(c, p.id, l.id))}>{l.escolhido ? 'Desmarcar' : 'Marcar como escolhido'}</Botao>
                <BotaoIcone icone="delete" rotulo={'Remover ' + l.texto} onClick={() => remover(l.id)} />
              </span>
            </li>
          ))}
        </ul>
      )}
      {aberto ? (
        <div className="app-caixa">
          <Campo rotulo="Nome da loja e do produto" valor={texto} aoMudar={(v) => { setTexto(v); setErro(''); }} exemplo="Ex.: Loja de cama — toalha branca" erro={erro} autoFocus />
          <Campo rotulo="Link da página (se tiver)" valor={url} aoMudar={setUrl} icone="link" inputMode="url" exemplo="Ex.: https://loja.com.br/toalha" />
          <CampoValor rotulo="Preço (se souber)" valor={preco} aoMudar={setPreco} exemplo="Ex.: 39,90" larguraMax={240} />
          <Acoes>
            <Botao variante="outlined" onClick={fecharForm}>Cancelar</Botao>
            <Botao onClick={salvar}>Salvar link</Botao>
          </Acoes>
        </div>
      ) : <div><Botao variante="text" icone="add" onClick={abrir}>Adicionar link</Botao></div>}
    </SecaoDetalhe>
  );
}

/* ——— Observações ——— */
function SecaoObs({ p, aberto, abrir, fecharForm }: { p: Pendencia; aberto: boolean; abrir: () => void; fecharForm: () => void }) {
  const { fazer } = useApp();
  const [obs, setObs] = useState(p.obs);
  return (
    <SecaoDetalhe titulo="Observações">
      {aberto ? (
        <div className="app-caixa">
          <Campo rotulo="Observações" valor={obs} aoMudar={setObs} multilinha exemplo="Ex.: Cor branca, medir a janela antes" autoFocus />
          <Acoes>
            <Botao variante="outlined" onClick={() => { setObs(p.obs); fecharForm(); }}>Cancelar</Botao>
            <Botao icone="check" onClick={() => { fazer((c) => A.salvarObs(c, p.id, obs)); fecharForm(); }}>Salvar observações</Botao>
          </Acoes>
        </div>
      ) : (
        <>
          {p.obs ? <p className="body-medium app-quebra">{p.obs}</p> : <p className="body-medium texto-apoio">Nenhuma observação.</p>}
          <div><Botao variante="text" icone="edit_note" onClick={() => { setObs(p.obs); abrir(); }}>{p.obs ? 'Editar observações' : 'Escrever observação'}</Botao></div>
        </>
      )}
    </SecaoDetalhe>
  );
}

function FormResp({ p, aoFechar }: { p: Pendencia; aoFechar: () => void }) {
  const { db, eu, fazer } = useApp();
  const [resp, setResp] = useState<string[]>(p.resp);
  return (
    <div className="app-caixa">
      <EscolhaVarias rotulo="Quem vai cuidar?" valores={resp} aoMudar={setResp} ajuda="Pode marcar mais de uma pessoa ou deixar sem ninguém."
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
  const [modoP, setModoP] = useState<Modo>(p.modo);
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
    const base = { titulo: titulo.trim(), apto, urgencia: urg, modo: modoP };
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
    <section className="cn-detail__section">
      <h3 className="cn-detail__section-title">Editar informações</h3>
      <Campo rotulo="Nome" valor={titulo} aoMudar={(v) => { setTitulo(v); limpa('titulo'); }} erro={erros.titulo} />
      <Escolha rotulo="Para qual apartamento?" valor={apto} aoMudar={setApto} opcoes={APTOS} />
      <Escolha rotulo="Qual a urgência?" valor={urg} aoMudar={setUrg} opcoes={URGS} />
      <Escolha rotulo="Onde dá para fazer?" valor={modoP} aoMudar={setModoP} opcoes={MODOS} />
      {p.tipo === 'compra' && item && <PerguntaContador rotulo="Quantas precisa no total?" valor={precisa} min={1} max={99} aoMudar={setPrecisa} ajuda="Muda também no inventário." />}
      {p.tipo === 'tarefa' && <CampoData rotulo="Prazo (se tiver)" valor={prazo} aoMudar={(v) => { setPrazo(v); limpa('prazo'); }} erro={erros.prazo} />}
      {p.tipo === 'servico' && (
        <>
          <Campo rotulo="Nome da pessoa ou empresa" valor={pessoa} aoMudar={setPessoa} icone="person" exemplo="Ex.: Eletricista Marcos" />
          <CampoTelefone rotulo="Telefone" valor={tel} aoMudar={setTel} />
          <CampoValor rotulo="Valor combinado" valor={valor} aoMudar={(v) => { setValor(v); limpa('valor'); }} erro={erros.valor} exemplo="Ex.: 450,00" />
          <Escolha rotulo="Quando vai ser?" valor={quando} aoMudar={setQuando} opcoes={[{ valor: 'dia', rotulo: 'Dia marcado' }, { valor: 'ate', rotulo: 'Até um dia' }]} />
          <CampoData rotulo={quando === 'dia' ? 'Qual dia?' : 'Até qual dia?'} valor={data} aoMudar={(v) => { setData(v); limpa('data'); }} erro={erros.data} />
        </>
      )}
      {p.tipo === 'pagamento' && (
        <>
          <CampoValor rotulo="Quanto é?" valor={valor} aoMudar={(v) => { setValor(v); limpa('valor'); }} erro={erros.valor} exemplo="Ex.: 900,00" />
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
