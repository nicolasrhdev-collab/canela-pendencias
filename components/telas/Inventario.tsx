/* Inventário: um card limpo por item, com filtros em menus suspensos como no board. Tocar no card abre o detalhe com "Registrar".
   Em "Todos" o mesmo item dos dois apês vira um card só, e o detalhe junto separa cada apê. */
import { useState } from 'react';
import { FILTROS_INV_VAZIOS, useApp, type FiltrosInv } from '../../app/contexto';
import { PREFIXO_JUNTO } from '../../app/rotas';
import { criarItem } from '../../lib/acoes';
import { contagemItem, estadoItem, estadoJunto, juntarPorNome } from '../../lib/regras';
import type { Apto } from '../../types';
import { Acoes, BarraUnidades, Botao, Campo, CardBoard, Cartao, Escolha, EtiquetaApto, Etiquetas, PerguntaContador, Seletor, Status, Vazio } from '../ui';

const APTOS: { valor: Apto; rotulo: string }[] = [{ valor: '105', rotulo: '105' }, { valor: '306', rotulo: '306' }, { valor: 'Ambos', rotulo: 'Ambos' }];

export function Inventario() {
  const { db, fazer, abrir, rota, filtrosInv: F, setFiltrosInv } = useApp();
  const [novo, setNovo] = useState(false);
  const [nome, setNome] = useState('');
  const [apto, setApto] = useState<Apto | null>(null);
  const [precisa, setPrecisa] = useState(1);
  const [tem, setTem] = useState(0);
  const [erros, setErros] = useState<Record<string, string>>({});

  /* Onde fica no apê: na ordem em que aparecem; "Outros" para os itens sem lugar (só se algum item tiver lugar). */
  const lugares = [...new Set(db.itens.map((i) => i.grupo).filter((g): g is string => !!g))];
  const opsLugar: [string, string][] = [['Todos', 'todos'], ...lugares.map((g): [string, string] => [g, g])];
  if (db.itens.some((i) => !i.grupo)) opsLugar.push(['Outros', 'sem']);
  const grupos: { id: keyof FiltrosInv; pergunta: string; ops: [string, string][] }[] = [
    { id: 'apto', pergunta: 'Apartamento', ops: [['Todos', 'todos'], ['105', '105'], ['306', '306'], ['Ambos', 'Ambos']] },
    { id: 'sit', pergunta: 'Situação', ops: [['Todas', 'todos'], ['Não verificado', 'nao-verificado'], ['Faltando', 'pendente'], ['A caminho', 'aguardando'], ['Completo', 'concluido']] },
    ...(lugares.length ? [{ id: 'grupo' as const, pergunta: 'Onde fica', ops: opsLugar }] : []),
  ];
  const ativos = grupos.filter((g) => F[g.id] !== 'todos').length;

  const doApto = db.itens
    .filter((i) => F.apto === 'todos' || i.apto === F.apto || (F.apto !== 'Ambos' && i.apto === 'Ambos'))
    .filter((i) => F.grupo === 'todos' || !lugares.length || (F.grupo === 'sem' ? !i.grupo : i.grupo === F.grupo))
    .map((it) => { const c = contagemItem(db, it); return { it, c, e: estadoItem(c, it) }; });
  /* "Todos": o mesmo item dos apês vira um card só, com uma linha por apê (o detalhe separa cada apê).
     Num apê só, cada item é um grupo de um. A situação filtra o grupo se algum apê se encaixar. */
  const juntos = F.apto === 'todos';
  const lista = juntos ? juntarPorNome(doApto).map((g) => ({ g, e: estadoJunto(g) })) : doApto.map((x) => ({ g: [x], e: x.e }));
  const completos = lista.filter((x) => x.e.tom === 'concluido').length;
  const naoVerificados = lista.filter((x) => x.g.some((y) => y.e.tom === 'nao-verificado')).length;
  const cards = lista.filter((x) => F.sit === 'todos' || x.g.some((y) => y.e.tom === F.sit)).sort((a, b) => a.g[0].it.nome.localeCompare(b.g[0].it.nome, 'pt-BR'));

  const abrirNovo = () => { setNovo(true); setNome(''); setApto(F.apto === 'todos' ? null : (F.apto as Apto)); setPrecisa(1); setTem(0); setErros({}); };
  const salvar = () => {
    const e: Record<string, string> = {};
    if (nome.trim().length < 2) e.nome = 'Escreva o nome do item, ex.: Toalha de rosto.';
    if (!apto) e.apto = 'Escolha o apartamento.';
    if (Object.keys(e).length) { setErros(e); return; }
    fazer((c) => criarItem(c, { nome, apto: apto!, precisa, tem: Math.min(tem, precisa) }));
    setNovo(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap', minHeight: 'var(--size-button)' }}>
        <p className="body-medium texto-apoio" style={{ flex: 1 }}>
          {completos} de {lista.length} {lista.length === 1 ? 'item completo' : 'itens completos'}
          {naoVerificados ? ' · ' + naoVerificados + (juntos ? ' para verificar' : naoVerificados === 1 ? ' não verificado' : ' não verificados') : ''}
        </p>
        {ativos > 0 && <Botao variante="text" icone="filter_alt_off" onClick={() => setFiltrosInv(FILTROS_INV_VAZIOS)}>Limpar filtros</Botao>}
        {!novo && db.itens.length > 0 && <Botao variante="outlined" icone="add" onClick={abrirNovo}>Adicionar item</Botao>}
      </div>

      {db.itens.length > 0 && (
        <section aria-label="Filtros" className={'app-filtros app-filtros--curto' + (grupos.length > 2 ? ' app-filtros--tres' : '')}>
          {grupos.map((g) => (
            <Seletor key={g.id} rotulo={g.pergunta} valor={F[g.id]} destacado={F[g.id] !== 'todos'}
              opcoes={g.ops.map(([rotulo, valor]) => ({ rotulo, valor }))} aoMudar={(v) => setFiltrosInv({ ...F, [g.id]: v })} />
          ))}
        </section>
      )}

      {novo && (
        <Cartao style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: 'var(--space-5)' }}>
          <h3 className="title-medium">Novo item</h3>
          <Campo rotulo="Nome do item" valor={nome} aoMudar={(v) => { setNome(v); setErros((x) => ({ ...x, nome: '' })); }} icone="inventory_2" exemplo="Ex.: Toalha de rosto" erro={erros.nome} autoFocus aoEnter={salvar} />
          <Escolha rotulo="Para qual apartamento?" valor={apto} opcoes={APTOS} erro={erros.apto} aoMudar={(v) => { setApto(v); setErros((x) => ({ ...x, apto: '' })); }} />
          <PerguntaContador rotulo="Quantos precisa?" valor={precisa} min={1} max={99} aoMudar={(v) => { setPrecisa(v); if (tem > v) setTem(v); }} />
          <PerguntaContador rotulo="Quantos já tem?" valor={tem} min={0} max={precisa} aoMudar={setTem} />
          <Acoes>
            <Botao variante="outlined" onClick={() => setNovo(false)}>Cancelar</Botao>
            <Botao icone="check" onClick={salvar}>Adicionar ao inventário</Botao>
          </Acoes>
        </Cartao>
      )}

      {!db.itens.length && !novo && (
        <Vazio titulo="Nenhum item no inventário ainda" texto="Adicione o que os apartamentos precisam ter, como toalhas, panelas e roupa de cama.">
          <Botao icone="add" onClick={abrirNovo}>Adicionar item</Botao>
        </Vazio>
      )}

      {db.itens.length > 0 && !cards.length && (
        <p className="body-medium texto-apoio" style={{ padding: 'var(--space-6) var(--space-2)', textAlign: 'center' }}>Nenhum item com estes filtros.</p>
      )}

      <div className="app-inv-grade">
        {cards.map(({ g, e }) => {
          const [{ it, c }] = g;
          return juntos ? (
            <CardBoard key={it.id} onClick={() => abrir(PREFIXO_JUNTO + it.id)} selecionado={g.some((x) => rota.p === x.it.id || rota.p === PREFIXO_JUNTO + x.it.id)}>
              <span className="app-inv-card__topo">
                <span className="cn-board-card__title">{it.nome}</span>
                <Status tom={e.tom} pequeno>{e.rotulo}</Status>
              </span>
              {g.map((x) => (
                <span key={x.it.id} className="app-inv-linha">
                  <EtiquetaApto apto={x.it.apto} comIcone={false} />
                  <BarraUnidades compacto semLegenda tem={x.c.tem} caminho={x.c.cam} falta={x.c.falta} precisa={x.c.precisa} naoVerificado={x.e.tom === 'nao-verificado'} />
                </span>
              ))}
            </CardBoard>
          ) : (
            <CardBoard key={it.id} onClick={() => abrir(it.id)} selecionado={rota.p === it.id}>
              {F.apto !== it.apto && <Etiquetas><EtiquetaApto apto={it.apto} /></Etiquetas>}
              <span className="app-inv-card__topo">
                <span className="cn-board-card__title">{it.nome}</span>
                <Status tom={e.tom} pequeno>{e.rotulo}</Status>
              </span>
              <BarraUnidades compacto semLegenda tem={c.tem} caminho={c.cam} falta={c.falta} precisa={c.precisa} naoVerificado={e.tom === 'nao-verificado'} />
            </CardBoard>
          );
        })}
      </div>
    </div>
  );
}
