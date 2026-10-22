/* Detalhe do item junto (opção "Todos" do inventário): o mesmo item nos apês, com um bloco por apê.
   Cada bloco tem a própria ação (Verificar se está cinza, Registrar se já foi verificado) e abre o detalhe completo daquele apê. */
import { useId, useState } from 'react';
import { useApp } from '../../app/contexto';
import { excluirItens, renomearItens } from '../../lib/acoes';
import { br } from '../../lib/datas';
import { primeiroNome } from '../../lib/formatos';
import { compraDoItem, contagemItem, estadoItem, estadoJunto, mesmoItemNosApes, meta, porId, situacao } from '../../lib/regras';
import type { Item, Urgencia } from '../../types';
import { Acoes, BarraUnidades, Botao, BotaoIcone, Campo, Detalhe, EtiquetaApto, EtiquetaUrgencia, Icone, Meta, SecaoDetalhe, Status, Vazio } from '../ui';
import { FormRegistrar, FormVerificar } from './DetalheItem';

type ModoBloco = 'verificar' | 'registrar' | null;

const noApe = (it: Item) => (it.apto === 'Ambos' ? 'nos dois apês' : 'no ' + it.apto);

export function DetalheJunto({ id }: { id: string }) {
  const { db, fazer, fechar, confirmar } = useApp();
  const idTitulo = useId();
  const [aberto, setAberto] = useState<{ id: string; modo: Exclude<ModoBloco, null> } | null>(null);
  const [editando, setEditando] = useState(false);
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

  const membros = mesmoItemNosApes(db, it);
  const e = estadoJunto(membros.map((m) => { const c = contagemItem(db, m); return { c, e: estadoItem(c, m) }; }));
  /* A urgência mora na pendência de compra quando ela existe; sem pendência, vem do item. */
  const urgs = membros.map((m) => compraDoItem(db, m.id)?.urgencia ?? m.urgencia ?? null);
  const urgUnica = urgs.every((u) => u === urgs[0]) ? urgs[0] : null;
  const grupo = membros.find((m) => m.grupo)?.grupo;
  const fora = ['105', '306'].filter((a) => !membros.some((m) => m.apto === a || m.apto === 'Ambos'));
  const resumo = membros.length === 1
    ? (membros[0].apto === 'Ambos' ? 'Para os dois apês.' : 'Só no apê ' + membros[0].apto + '.') + ' Precisa de ' + membros[0].precisa + '.'
    : membros.every((m) => m.precisa === membros[0].precisa)
      ? 'Precisa de ' + membros[0].precisa + ' em cada apê (' + membros.reduce((s, m) => s + m.precisa, 0) + ' no total).'
      : 'Precisa de ' + membros.map((m) => m.precisa + ' ' + noApe(m)).join(' e ') + '.';

  const excluir = async () => {
    const ok = await confirmar({
      icone: 'delete', titulo: 'Tirar “' + it.nome + '” do inventário?', acao: 'Excluir',
      texto: (membros.length > 1 ? 'Sai de todos os apês, junto com as pendências de compra.' : 'A pendência de compra deste item também é excluída.') + ' Logo depois dá para desfazer.',
    });
    if (!ok) return;
    fazer((x) => excluirItens(x, membros.map((m) => m.id)));
    fechar();
  };

  return (
    <Detalhe idTitulo={idTitulo} className="app-detalhe--sem-rodape">
      <div className="cn-detail__head">
        <div className="cn-detail__chips">
          <Status tom={e.tom}>{e.rotulo}</Status>
          {membros.map((m) => <EtiquetaApto key={m.id} apto={m.apto} />)}
          {urgUnica && <EtiquetaUrgencia urgencia={urgUnica} />}
        </div>
        <BotaoIcone icone="close" rotulo="Fechar" onClick={fechar} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        <Meta icone="inventory_2">Inventário{grupo ? ' · ' + grupo : ''}</Meta>
        <h2 className="cn-detail__title" id={idTitulo} style={{ margin: 0 }}>{it.nome}</h2>
        <p className="body-medium texto-apoio num" style={{ marginTop: 'var(--space-1)' }}>{resumo}</p>
      </div>

      {editando ? <FormNome itens={membros} aoFechar={() => setEditando(false)} /> : (
        <>
          <SecaoDetalhe titulo="Em cada apê">
            {membros.map((m, i) => (
              <BlocoApe key={m.id} it={m} urgencia={urgUnica ? null : urgs[i]} modo={aberto?.id === m.id ? aberto.modo : null}
                aoModo={(modo) => setAberto(modo ? { id: m.id, modo } : null)} />
            ))}
            {fora.map((a) => <p key={a} className="body-medium texto-apoio">Apê {a}: não está no inventário.</p>)}
          </SecaoDetalhe>

          <SecaoDetalhe titulo="Mais opções">
            <div className="app-linha-botoes">
              <Botao variante="text" icone="edit" onClick={() => setEditando(true)}>Editar nome</Botao>
              <Botao variante="text" icone="delete" onClick={excluir}>Excluir item</Botao>
            </div>
          </SecaoDetalhe>
        </>
      )}
    </Detalhe>
  );
}

/** Um apê: quanto tem, se foi verificado, a pendência de compra e a ação daquele apê (o formulário abre dentro do bloco). */
function BlocoApe({ it, urgencia, modo, aoModo }: { it: Item; urgencia: Urgencia | null; modo: ModoBloco; aoModo: (m: ModoBloco) => void }) {
  const { db, hoje, abrir } = useApp();
  const c = contagemItem(db, it), e = estadoItem(c, it), naoVerificado = e.tom === 'nao-verificado';
  const p = compraDoItem(db, it.id), sitP = p ? situacao(db, p, hoje) : null;
  const titulo = it.apto === 'Ambos' ? 'Os dois apês' : 'Apê ' + it.apto;

  return (
    <section className="app-bloco app-bloco--ape" aria-label={titulo}>
      <div className="app-bloco__topo">
        <Icone nome={it.apto === 'Ambos' ? 'domain' : 'apartment'} className="app-row__icone" />
        <h4 className="title-medium" style={{ flex: 1, minWidth: 0 }}>{titulo}</h4>
        {urgencia && <EtiquetaUrgencia urgencia={urgencia} />}
        <Status tom={e.tom} pequeno>{e.rotulo}</Status>
      </div>
      <BarraUnidades tem={c.tem} caminho={c.cam} falta={c.falta} precisa={c.precisa} naoVerificado={naoVerificado} />
      {it.verificadoEm && (
        <p className="body-small texto-apoio">Verificado por {primeiroNome(porId(db.pessoas, it.verificadoPor ?? '')?.nome ?? 'Alguém')} em {br(it.verificadoEm)}.</p>
      )}
      {naoVerificado && modo !== 'verificar' && <p className="body-small texto-apoio">Ainda não é pendência: vira compra só se faltar quando alguém verificar.</p>}
      {p && sitP && sitP.coluna !== 'concluido' && (
        <button type="button" className="app-row app-row--caixa" onClick={() => abrir(p.id)}>
          <Icone nome="shopping_cart" className="app-row__icone" />
          <span className="app-row__texto">
            <span className="title-small">Pendência de compra</span>
            <span className="body-small texto-apoio">{meta(p, sitP, hoje).texto}</span>
          </span>
          <Status tom={sitP.tom} pequeno>{sitP.rotulo}</Status>
        </button>
      )}
      {modo === 'verificar' ? <FormVerificar it={it} aoFechar={() => aoModo(null)} caixa />
        : modo === 'registrar' ? <FormRegistrar it={it} p={p} aoFechar={() => aoModo(null)} caixa />
        : (
          <div className="app-linha-botoes">
            {naoVerificado
              ? <Botao icone="fact_check" onClick={() => aoModo('verificar')}>Verificar</Botao>
              : <Botao variante="outlined" icone="add" onClick={() => aoModo('registrar')}>Registrar</Botao>}
            <Botao variante="text" iconeFim="chevron_right" onClick={() => abrir(it.id)}>Ver detalhes {it.apto === 'Ambos' ? 'do item' : 'do ' + it.apto}</Botao>
          </div>
        )}
    </section>
  );
}

/** O nome muda em todos os apês juntos (e nas pendências de compra), para continuarem sendo o mesmo item. */
function FormNome({ itens, aoFechar }: { itens: Item[]; aoFechar: () => void }) {
  const { fazer } = useApp();
  const [nome, setNome] = useState(itens[0].nome);
  const [erro, setErro] = useState('');

  const salvar = () => {
    if (nome.trim().length < 2) { setErro('Escreva o nome do item, ex.: Toalha de rosto.'); return; }
    if (nome.trim() !== itens[0].nome) fazer((x) => renomearItens(x, itens.map((m) => m.id), nome));
    aoFechar();
  };

  return (
    <section className="cn-detail__section">
      <h3 className="cn-detail__section-title">Editar nome</h3>
      <Campo rotulo="Nome do item" valor={nome} aoMudar={(v) => { setNome(v); setErro(''); }} icone="inventory_2" erro={erro} aoEnter={salvar} autoFocus
        ajuda={itens.length > 1 ? 'Muda em todos os apês. A quantidade de cada apê fica em “Ver detalhes”.' : undefined} />
      <Acoes>
        <Botao variante="outlined" onClick={aoFechar}>Cancelar</Botao>
        <Botao icone="check" onClick={salvar}>Salvar nome</Botao>
      </Acoes>
    </section>
  );
}
