/* Detalhe do item do inventário: quantidades, quanto tem em cada apê, um card por registro e "Registrar" (normal ou compra).
   O que se registra aqui mexe também na pendência de compra do item, e o que muda lá aparece aqui.
   Item não verificado (cinza): só "Verificar", que diz quanto tem no apê e cria a pendência de compra se faltar. */
import { useId, useState, type ReactNode } from 'react';
import { useApp } from '../../app/contexto';
import { excluirItem, mudarItem, registrarNoItem, verificarItem } from '../../lib/acoes';
import { br } from '../../lib/datas';
import { primeiroNome } from '../../lib/formatos';
import { abertas, compraDoItem, contagemItem, estadoItem, mesmoItemNosApes, meta, noLocal, porId, situacao, valorCompra, type TomStatus } from '../../lib/regras';
import type { Compra, Item, OndeComprou, PendCompra, RegistroItem } from '../../types';
import {
  Acoes, BarraUnidades, Botao, BotaoIcone, Campo, Detalhe, EtiquetaApto, EtiquetaUrgencia, Icone, Meta, PerguntaContador, RodapeDetalhe, SecaoDetalhe, Status, Vazio,
} from '../ui';
import { FormCompra } from './FormCompra';

type ModoItem = null | 'registrar' | 'editar' | 'verificar';

export function DetalheItem({ id }: { id: string }) {
  const { db, hoje, fazer, abrir, fechar, confirmar } = useApp();
  const idTitulo = useId();
  const [modo, setModo] = useState<ModoItem>(null);
  const it = porId(db.itens, id);

  if (!it) {
    return (
      <Detalhe idTitulo={idTitulo}>
        <Vazio titulo="Esse item não existe mais" texto="Ele pode ter sido excluído ou desfeito. Volte para o inventário e escolha outro.">
          <Botao onClick={fechar}>Voltar para o inventário</Botao>
        </Vazio>
      </Detalhe>
    );
  }

  const c = contagemItem(db, it), e = estadoItem(c, it), naoVerificado = e.tom === 'nao-verificado';
  const p = compraDoItem(db, it.id), ab = p ? abertas(p) : [];
  const sitP = p ? situacao(db, p, hoje) : null;
  const fecharModo = () => setModo(null);

  const excluir = async () => {
    const ok = await confirmar({ icone: 'delete', titulo: 'Tirar “' + it.nome + '” do inventário?', texto: 'A pendência de compra deste item também é excluída. Logo depois dá para desfazer.', acao: 'Excluir' });
    if (!ok) return;
    fazer((x) => excluirItem(x, it.id));
    fechar();
  };

  return (
    <Detalhe idTitulo={idTitulo}>
      <div className="cn-detail__head">
        <div className="cn-detail__chips">
          <Status tom={e.tom}>{e.rotulo}</Status>
          <EtiquetaApto apto={it.apto} />
          {it.urgencia && <EtiquetaUrgencia urgencia={it.urgencia} />}
        </div>
        <BotaoIcone icone="close" rotulo="Fechar" onClick={fechar} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        <Meta icone="inventory_2">Inventário{it.grupo ? ' · ' + it.grupo : ''}</Meta>
        <h2 className="cn-detail__title" id={idTitulo} style={{ margin: 0 }}>{it.nome}</h2>
      </div>

      {modo === 'registrar' ? <FormRegistrar it={it} p={p} aoFechar={fecharModo} />
        : modo === 'editar' ? <FormEditarItem it={it} aoFechar={fecharModo} />
        : modo === 'verificar' ? <FormVerificar it={it} aoFechar={fecharModo} /> : (
          <>
            <SecaoDetalhe titulo="Quantidade">
              <BarraUnidades tem={c.tem} caminho={c.cam} falta={c.falta} precisa={c.precisa} naoVerificado={naoVerificado} />
              {naoVerificado
                ? <p className="body-medium num">Precisa de {it.precisa}. Ainda não é pendência: vira compra só se faltar quando alguém verificar no apê.</p>
                : <p className="body-medium num">Precisa de {it.precisa}{it.tem > it.precisa ? ' · tem ' + (it.tem - it.precisa) + ' a mais' : ''}.</p>}
            </SecaoDetalhe>

            <SecaoApes it={it} />
            {!naoVerificado && <SecaoRegistros it={it} p={p} ab={ab} />}

            {p && sitP && (
              <SecaoDetalhe titulo="Pendência de compra">
                <button type="button" className="app-row" style={{ padding: 'var(--space-2) var(--space-3)' }} onClick={() => abrir(p.id)}>
                  <Icone nome="shopping_cart" className="app-row__icone" />
                  <span className="app-row__texto">
                    <span className="title-small">{p.titulo}</span>
                    <span className="body-small texto-apoio">{meta(p, sitP, hoje).texto}</span>
                  </span>
                  <Status tom={sitP.tom} pequeno>{sitP.rotulo}</Status>
                </button>
              </SecaoDetalhe>
            )}

            <SecaoDetalhe titulo="Mais opções">
              <div className="app-linha-botoes">
                <Botao variante="text" icone="edit" onClick={() => setModo('editar')}>Editar item</Botao>
                <Botao variante="text" icone="delete" onClick={excluir}>Excluir item</Botao>
              </div>
            </SecaoDetalhe>
          </>
        )}

      {modo === null && (
        <RodapeDetalhe>
          {naoVerificado
            ? <Botao icone="fact_check" onClick={() => setModo('verificar')}>Verificar</Botao>
            : <Botao icone="add" onClick={() => setModo('registrar')}>Registrar</Botao>}
        </RodapeDetalhe>
      )}
    </Detalhe>
  );
}

/** O mesmo item em cada apê (mesmo nome): quanto está disponível em cada um. Tocar abre o item do outro apê. */
function SecaoApes({ it }: { it: Item }) {
  const { db, abrir } = useApp();
  const nosApes = mesmoItemNosApes(db, it);
  const cobertos = new Set(nosApes.flatMap((x) => (x.apto === 'Ambos' ? ['105', '306'] : [x.apto])));
  const fora = ['105', '306'].filter((a) => !cobertos.has(a));
  if (nosApes.length < 2 && !fora.length) return null;
  return (
    <SecaoDetalhe titulo="Em cada apê">
      <div>
        {nosApes.map((x) => {
          const cx = contagemItem(db, x), ex = estadoItem(cx, x), atual = x.id === it.id;
          const conteudo = (
            <>
              <Icone nome={x.apto === 'Ambos' ? 'domain' : 'apartment'} className="app-row__icone" />
              <span className="app-row__texto">
                <span className="title-small">{x.apto === 'Ambos' ? 'Os dois apês' : 'Apê ' + x.apto}{atual ? ' (este)' : ''}</span>
                <span className="body-small texto-apoio num">{ex.tom === 'nao-verificado' ? 'Precisa de ' + cx.precisa : cx.tem + ' ' + (cx.tem === 1 ? 'disponível' : 'disponíveis') + ' de ' + cx.precisa + (cx.cam ? ' · ' + cx.cam + ' a caminho' : '')}</span>
              </span>
              <Status tom={ex.tom} pequeno>{ex.rotulo}</Status>
            </>
          );
          return atual
            ? <div key={x.id} className="app-row app-row--atual" style={{ padding: 'var(--space-2) var(--space-3)' }}>{conteudo}</div>
            : <button key={x.id} type="button" className="app-row" style={{ padding: 'var(--space-2) var(--space-3)' }} onClick={() => abrir(x.id)}>{conteudo}</button>;
        })}
      </div>
      {fora.map((a) => <p key={a} className="body-medium texto-apoio">Apê {a}: não está no inventário.</p>)}
    </SecaoDetalhe>
  );
}

const ONDE: Record<OndeComprou, string> = { internet: 'Compra pela internet', local: 'Compra em loja', reaproveitado: 'Reaproveitado' };

/** Um card por registro: compras a caminho (ou atrasadas), compras que chegaram, registros normais e o que já tinha sem registro. */
function SecaoRegistros({ it, p, ab }: { it: Item; p: PendCompra | null; ab: Compra[] }) {
  const { db, hoje } = useApp();
  const nomeDe = (id: string) => primeiroNome(porId(db.pessoas, id)?.nome ?? 'Alguém');
  const quemComprou = (k: Compra) => (k.onde === 'reaproveitado' ? 'Quem traz: ' + nomeDe(k.quem) : 'Comprado por ' + nomeDe(k.quem) + ' em ' + br(k.data));
  const chegaram = p ? p.compras.filter((k) => k.chegou) : [];
  const disponiveis: { data: string; k: Compra | null; r: RegistroItem | null }[] = [
    ...chegaram.map((k) => ({ data: k.chegouEm || k.data, k, r: null })),
    ...it.registros.map((r) => ({ data: r.data, k: null, r })),
  ].sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
  /* "tem" que não vem de nenhum registro: o que já tinha ao criar o item ou o que foi ajustado em "Editar item". */
  const semRegistro = it.tem - it.registros.reduce((s, r) => s + r.qtd, 0) - chegaram.reduce((s, k) => s + k.qtd, 0);

  return (
    <SecaoDetalhe titulo="Registros">
      {!ab.length && !disponiveis.length && semRegistro <= 0
        ? <p className="body-medium texto-apoio">Nada registrado ainda. Use “Registrar” quando comprar ou quando já tiver no apê.</p>
        : (
          <ul className="app-registros">
            {ab.map((k) => {
              const atrasada = !!k.entrega && k.entrega < hoje;
              return (
                <CardRegistro key={k.id} tom={atrasada ? 'atrasado' : 'aguardando'} rotulo={atrasada ? 'Atrasado' : 'A caminho'} qtd={k.qtd}>
                  <p className="body-medium">{ONDE[k.onde]} · <span className="num">{valorCompra(k)}</span></p>
                  <Meta icone={atrasada ? 'event_busy' : k.entrega ? 'local_shipping' : 'storefront'} vencido={atrasada}>
                    {k.entrega ? (atrasada ? 'Era para chegar ' : 'Chega ') + br(k.entrega) + ' ' + noLocal(k.local) : 'Está com quem comprou. Falta levar ao apê.'}
                  </Meta>
                  {k.rastreio && <p className="body-small texto-apoio num">Código de rastreio: {k.rastreio}</p>}
                  <p className="body-small texto-apoio">{quemComprou(k)}</p>
                  {k.link && <a className="body-medium" href={k.link} target="_blank" rel="noopener noreferrer">Ver o produto na loja</a>}
                </CardRegistro>
              );
            })}
            {disponiveis.map(({ k, r }) => k ? (
              <CardRegistro key={k.id} tom="concluido" rotulo="Disponível" qtd={k.qtd}>
                <p className="body-medium">{ONDE[k.onde]} · <span className="num">{valorCompra(k)}</span></p>
                <Meta icone="check_circle">Chegou em {br(k.chegouEm)}</Meta>
                <p className="body-small texto-apoio">{quemComprou(k)}</p>
              </CardRegistro>
            ) : r && (
              <CardRegistro key={r.id} tom="concluido" rotulo="Disponível" qtd={r.qtd}>
                <p className="body-medium">Registro normal</p>
                <p className="body-small texto-apoio">Registrado por {nomeDe(r.quem)} em {br(r.data)}</p>
              </CardRegistro>
            ))}
            {semRegistro > 0 && (
              <CardRegistro tom="concluido" rotulo="Disponível" qtd={semRegistro}>
                <p className="body-medium">Já tinha</p>
                <p className="body-small texto-apoio">{it.verificadoEm ? 'Estava no apê na verificação.' : 'Sem registro: já estava no apê ou foi ajustado em “Editar item”.'}</p>
              </CardRegistro>
            )}
          </ul>
        )}
      {semRegistro < 0 && <p className="body-small texto-apoio">Ajustado em “Editar item”: {-semRegistro} a menos do que os registros.</p>}
      {it.verificadoEm && <p className="body-small texto-apoio">Verificado no apê por {nomeDe(it.verificadoPor ?? '')} em {br(it.verificadoEm)}.</p>}
    </SecaoDetalhe>
  );
}

function CardRegistro({ tom, rotulo, qtd, children }: { tom: TomStatus; rotulo: string; qtd: number; children: ReactNode }) {
  return (
    <li className="app-bloco">
      <div className="app-registro__topo">
        <Status tom={tom} pequeno>{rotulo}</Status>
        <span className="title-small num">{qtd} {qtd === 1 ? 'unidade' : 'unidades'}</span>
      </div>
      {children}
    </li>
  );
}

const COMO: ['normal' | 'compra', string, string, string][] = [
  ['normal', 'Registrar normal', 'inventory', 'Só a quantidade. Entra direto em “Já tem”.'],
  ['compra', 'Registrar compra', 'shopping_cart', 'Quem comprou, valor, link e entrega. Fica “A caminho” até chegar.'],
];

/** Registrar normal (só a quantidade, pode passar do que precisa) ou registrar compra (os detalhes, na pendência de compra).
    `caixa`: dentro do bloco do apê, no detalhe do item junto. */
export function FormRegistrar({ it, p, aoFechar, caixa }: { it: Item; p: PendCompra | null; aoFechar: () => void; caixa?: boolean }) {
  const { db, fazer } = useApp();
  const idGrupo = useId();
  const c = contagemItem(db, it);
  const [como, setComo] = useState<'normal' | 'compra' | null>(null);
  const [qtd, setQtd] = useState(Math.max(1, c.falta));

  const salvar = () => { fazer((x) => registrarNoItem(x, it.id, qtd)); aoFechar(); };

  return (
    <section className={caixa ? 'app-caixa' : 'cn-detail__section'}>
      <h3 className={caixa ? 'title-small' : 'cn-detail__section-title'} id={idGrupo}>Como quer registrar?</h3>
      <div role="group" aria-labelledby={idGrupo} className="app-opcoes">
        {COMO.map(([v, rotulo, icone, desc]) => (
          <button key={v} type="button" className="app-opcao" aria-pressed={como === v} onClick={() => setComo(v)}>
            <Icone nome={icone} />
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span className="title-small">{rotulo}</span><span className="body-small">{desc}</span></span>
          </button>
        ))}
      </div>

      {como === 'normal' && (
        <>
          <PerguntaContador rotulo="Quantas unidades?" valor={qtd} min={1} max={999} aoMudar={setQtd} rotuloMenos="Menos unidades" rotuloMais="Mais unidades"
            ajuda={'Já tem ' + it.tem + ' de ' + it.precisa + '. Vai ficar com ' + (it.tem + qtd) + '.'} />
          <Acoes>
            <Botao variante="outlined" onClick={aoFechar}>Cancelar</Botao>
            <Botao icone="check" onClick={salvar}>Registrar</Botao>
          </Acoes>
        </>
      )}
      {como === 'compra' && <FormCompra p={p} item={it} compra={null} aoFechar={aoFechar} semTitulo />}
      {!como && <Acoes><Botao variante="outlined" onClick={aoFechar}>Cancelar</Botao></Acoes>}
    </section>
  );
}

/** Verificar no apê: quantos tem. Se faltar, vira pendência de compra com a urgência do item.
    `caixa`: dentro do bloco do apê, no detalhe do item junto (a pergunta diz qual apê). */
export function FormVerificar({ it, aoFechar, caixa }: { it: Item; aoFechar: () => void; caixa?: boolean }) {
  const { fazer } = useApp();
  const [tem, setTem] = useState(0);
  const falta = it.precisa - tem;
  const salvar = () => { fazer((x) => verificarItem(x, it.id, tem)); aoFechar(); };
  const resultado = falta > 0
    ? (falta === 1 ? 'Falta 1' : 'Faltam ' + falta) + ': vira pendência de compra' + (it.urgencia === 'Essencial' ? ' (essencial)' : '') + '.'
    : 'Fica completo.';

  return (
    <section className={caixa ? 'app-caixa' : 'cn-detail__section'}>
      {!caixa && <h3 className="cn-detail__section-title">Verificar no apê</h3>}
      <PerguntaContador rotulo={!caixa ? 'Quantos tem no apê?' : it.apto === 'Ambos' ? 'Quantos tem nos dois apês?' : 'Quantos tem no ' + it.apto + '?'} valor={tem} min={0} max={999} aoMudar={setTem} rotuloMenos="Menos unidades" rotuloMais="Mais unidades"
        ajuda={'Precisa de ' + it.precisa + '. ' + resultado} />
      <div><Botao variante="text" icone="done_all" onClick={() => setTem(it.precisa)}>Tem todos ({it.precisa})</Botao></div>
      <Acoes>
        <Botao variante="outlined" onClick={aoFechar}>Cancelar</Botao>
        <Botao icone="check" onClick={salvar}>Salvar verificação</Botao>
      </Acoes>
    </section>
  );
}

/** Nome e quantidades (para corrigir). A quantidade que precisa muda também na pendência de compra. */
function FormEditarItem({ it, aoFechar }: { it: Item; aoFechar: () => void }) {
  const { fazer } = useApp();
  const [nome, setNome] = useState(it.nome);
  const [precisa, setPrecisa] = useState(it.precisa);
  const [tem, setTem] = useState(it.tem);
  const [erro, setErro] = useState('');

  const salvar = () => {
    if (nome.trim().length < 2) { setErro('Escreva o nome do item, ex.: Toalha de rosto.'); return; }
    const patch = { precisa, tem, ...(nome.trim() !== it.nome ? { nome: nome.trim() } : {}) };
    fazer((x) => { const r = mudarItem(x, it.id, patch); return { ...r, msg: r.msg ?? 'Item atualizado.' }; });
    aoFechar();
  };

  return (
    <section className="cn-detail__section">
      <h3 className="cn-detail__section-title">Editar item</h3>
      <Campo rotulo="Nome do item" valor={nome} aoMudar={(v) => { setNome(v); setErro(''); }} icone="inventory_2" erro={erro} aoEnter={salvar} />
      <PerguntaContador rotulo="Quantas precisa no total?" valor={precisa} min={1} max={99} aoMudar={setPrecisa} ajuda="Muda também na pendência de compra." />
      <PerguntaContador rotulo="Quantas já tem no apê?" valor={tem} min={0} max={999} aoMudar={setTem} ajuda="Use para corrigir. O que chegar, registre em “Registrar”." />
      <Acoes>
        <Botao variante="outlined" onClick={aoFechar}>Cancelar</Botao>
        <Botao icone="check" onClick={salvar}>Salvar mudanças</Botao>
      </Acoes>
    </section>
  );
}
