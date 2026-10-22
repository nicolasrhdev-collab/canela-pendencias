/* Início: contagem até a abertura, % das essenciais por apê, atrasados, o que chega em 7 dias e pagamentos a vencer. */
import { useState } from 'react';
import { useApp, FILTROS_VAZIOS } from '../../app/contexto';
import { mudarAbertura } from '../../lib/acoes';
import { br, deBR, diaExtenso, dias, quandoTexto, somar } from '../../lib/datas';
import { brl, primeiroNome } from '../../lib/formatos';
import { localNome, meta, situacao, TIPOS } from '../../lib/regras';
import { Acoes, Aviso, Botao, CampoData, Cartao, Etiqueta, Icone, Linha, Status, Vazio } from '../ui';

export function Inicio() {
  const { db, eu, hoje, abrir, abrirNova, ir, fazer, setFiltros } = useApp();
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState('');

  const ab = db.config.abertura;
  const n = ab ? dias(hoje, ab) : null;
  const lista = db.pendencias.map((p) => ({ p, sit: situacao(db, p, hoje) }));

  const aptos = (['105', '306'] as const).map((a) => {
    const es = lista.filter((x) => x.p.urgencia === 'Essencial' && (x.p.apto === a || x.p.apto === 'Ambos'));
    const ok = es.filter((x) => x.sit.coluna === 'concluido').length;
    const pct = es.length ? Math.round((ok * 100) / es.length) : 0;
    return { a, pct, ok, total: es.length };
  });
  const atrasados = lista.filter((x) => x.sit.atrasado);
  const limite = somar(hoje, 7);
  const chegando: { id: string; titulo: string; sub: string; data: string }[] = [];
  lista.forEach(({ p }) => {
    if (p.tipo !== 'compra') return;
    p.compras.forEach((k) => {
      if (!k.chegou && k.entrega && k.entrega >= hoje && k.entrega <= limite)
        chegando.push({ id: p.id, titulo: p.titulo, data: k.entrega, sub: k.qtd + (k.qtd > 1 ? ' unidades' : ' unidade') + ' · ' + localNome(k.local) + ' · ' + br(k.entrega) });
    });
  });
  chegando.sort((x, y) => (x.data < y.data ? -1 : 1));
  const pags = lista.filter((x) => x.p.tipo === 'pagamento' && !x.p.pago).sort((x, y) => ((x.p as { vencimento: string }).vencimento < (y.p as { vencimento: string }).vencimento ? -1 : 1));
  const total = pags.reduce((t, x) => t + (x.p.tipo === 'pagamento' ? x.p.valor : 0), 0);

  const editar = () => { setTexto(br(ab)); setErro(''); setEditando(true); };
  const salvar = () => {
    const x = deBR(texto);
    if (!x) { setErro('Essa data não existe. Use DD/MM/AAAA, ex.: 15/11/2026.'); return; }
    fazer((c) => mudarAbertura(c, x));
    setEditando(false);
  };
  const verEssenciais = (a: string) => { setFiltros({ ...FILTROS_VAZIOS, apto: a, urg: 'Essencial' }); ir('pendencias'); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        <h2 className="headline-medium">Olá, {primeiroNome(eu.nome)}</h2>
        <p className="body-medium texto-apoio">Hoje é {diaExtenso(hoje).toLowerCase()} de {hoje.slice(0, 4)}</p>
      </div>

      {db.pendencias.length === 0 && (
        <Cartao>
          <Vazio titulo="Nada para organizar ainda" texto="Comece criando a primeira pendência: uma compra, uma tarefa, um serviço ou um pagamento.">
            <Botao icone="add" onClick={abrirNova}>Criar pendência</Botao>
          </Vazio>
        </Cartao>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: 'var(--space-4)' }}>
        <section className="cn-card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', padding: 'var(--space-5)' }} aria-labelledby="ini-contagem">
          <h3 className="title-medium" id="ini-contagem" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><Icone nome="celebration" style={{ color: 'var(--primary)' }} />Abertura dos apês</h3>
          {ab && n !== null ? (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                {n !== 0 && <span className="display-medium">{Math.abs(n)}</span>}
                <span className="title-medium">{n > 1 ? 'dias para abrir' : n === 1 ? 'dia para abrir' : n === 0 ? 'Abre hoje' : n === -1 ? 'dia desde a abertura' : 'dias desde a abertura'}</span>
              </div>
              <p className="body-medium texto-apoio">Abertura: {diaExtenso(ab).toLowerCase()} · {br(ab)}</p>
            </>
          ) : <p className="body-medium texto-apoio">Ainda não tem data de abertura. Defina para ver quantos dias faltam.</p>}
          {!editando && <div><Botao variante="outlined" icone="edit_calendar" onClick={editar}>{ab ? 'Mudar data' : 'Definir data'}</Botao></div>}
          {editando && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <CampoData rotulo="Nova data de abertura" valor={texto} aoMudar={(v) => { setTexto(v); setErro(''); }} exemplo="Ex.: 15/11/2026" erro={erro} larguraMax={480} autoFocus aoEnter={salvar} />
              <Acoes inicio>
                <Botao variante="outlined" onClick={() => setEditando(false)}>Cancelar</Botao>
                <Botao icone="check" onClick={salvar}>Salvar data</Botao>
              </Acoes>
            </div>
          )}
        </section>

        {aptos.map((x) => (
          <section key={x.a} className="cn-card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', padding: 'var(--space-5)' }}>
            <h3 className="title-medium" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><Etiqueta tom="apto" icone="apartment">{x.a}</Etiqueta>Essenciais prontas</h3>
            <span className="display-medium">{x.pct}%</span>
            <div className="app-pct" role="img" aria-label={'Apê ' + x.a + ': ' + x.pct + '% das essenciais prontas'}><div className="app-pct__fill" style={{ width: x.pct + '%' }} /></div>
            <p className="body-medium texto-apoio">{x.total ? x.ok + ' de ' + x.total + ' essenciais prontas' : 'Nenhuma pendência essencial ainda.'}</p>
            <div><Botao variante="text" icone="checklist" onClick={() => verEssenciais(x.a)}>Ver essenciais do {x.a}</Botao></div>
          </section>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 'var(--space-4)', alignItems: 'start' }}>
        <section className="cn-card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', padding: 'var(--space-5) var(--space-3) var(--space-3)' }} aria-labelledby="ini-atrasados">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: '0 var(--space-2)' }}>
            <h3 className="title-medium" id="ini-atrasados" style={{ flex: 1 }}>Atrasados</h3>
            {atrasados.length > 0 && <Status tom="atrasado" pequeno>{atrasados.length} {atrasados.length === 1 ? 'atrasado' : 'atrasados'}</Status>}
          </div>
          {atrasados.length === 0 && <div style={{ margin: '0 var(--space-2)' }}><Aviso sucesso icone="check_circle">Nada atrasado. Tudo em dia.</Aviso></div>}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {atrasados.map(({ p, sit }) => (
              <Linha key={p.id} icone={TIPOS[p.tipo].icone} titulo={p.titulo} sub={meta(p, sit, hoje).texto} subVencido onClick={() => abrir(p.id)}
                fim={<Etiqueta tom="apto">{p.apto}</Etiqueta>} />
            ))}
          </div>
        </section>

        <section className="cn-card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', padding: 'var(--space-5) var(--space-3) var(--space-3)' }} aria-labelledby="ini-chegando">
          <h3 className="title-medium" id="ini-chegando" style={{ padding: '0 var(--space-2)' }}>Chega nos próximos 7 dias</h3>
          {chegando.length === 0 && <p className="body-medium texto-apoio" style={{ padding: '0 var(--space-2)' }}>Nenhuma entrega prevista para esta semana.</p>}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {chegando.map((r, i) => (
              <Linha key={r.id + i} icone="local_shipping" titulo={r.titulo} sub={r.sub} onClick={() => abrir(r.id)}
                fim={<span className="label-medium" style={{ color: 'var(--on-surface)', whiteSpace: 'nowrap' }}>{quandoTexto(r.data, hoje)}</span>} />
            ))}
          </div>
          <div style={{ padding: '0 var(--space-1)' }}><Botao variante="text" icone="calendar_month" onClick={() => ir('calendario')}>Ver no calendário</Botao></div>
        </section>

        <section className="cn-card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', padding: 'var(--space-5) var(--space-3) var(--space-3)' }} aria-labelledby="ini-pagamentos">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 var(--space-2)' }}>
            <h3 className="title-medium" id="ini-pagamentos">Pagamentos a vencer</h3>
            {pags.length > 0 && <p className="body-small texto-apoio num">Total a pagar: {brl(total)}</p>}
          </div>
          {pags.length === 0 && <p className="body-medium texto-apoio" style={{ padding: '0 var(--space-2)' }}>Nenhum pagamento em aberto.</p>}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {pags.map(({ p, sit }) => p.tipo === 'pagamento' && (
              <Linha key={p.id} icone="payments" titulo={p.titulo} sub={brl(p.valor) + ' · vence ' + br(p.vencimento)} onClick={() => abrir(p.id)}
                fim={(
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-1)' }}>
                    <Status tom={sit.tom} pequeno>{sit.rotulo}</Status>
                    <span className="body-small texto-apoio" style={{ whiteSpace: 'nowrap' }}>{quandoTexto(p.vencimento, hoje)}</span>
                  </span>
                )} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
