/* Calendário: mês com entregas, chegadas, serviços, datas limite e vencimentos; tocar no dia mostra os itens; lista da semana. */
import { useState } from 'react';
import { useApp } from '../../app/contexto';
import { br, diaExtenso, inicioSemana, iso, MESES, paraData, quandoTexto, somar } from '../../lib/datas';
import { eventos, porId, situacao, type Evento } from '../../lib/regras';
import { Botao, Icone, Status } from '../ui';

export function Calendario() {
  const { db, hoje, celular, abrir, ir } = useApp();
  const [dia, setDia] = useState(hoje);
  const [mes, setMes] = useState(() => { const d = paraData(hoje); return { ano: d.getFullYear(), mes: d.getMonth() }; });

  const evs = eventos(db);
  const porDia: Record<string, Evento[]> = {};
  evs.forEach((e) => { (porDia[e.data] = porDia[e.data] || []).push(e); });

  const ini = new Date(mes.ano, mes.mes, 1).getDay(), total = new Date(mes.ano, mes.mes + 1, 0).getDate();
  const celulas: (string | null)[] = [];
  for (let i = 0; i < ini; i++) celulas.push(null);
  for (let d = 1; d <= total; d++) celulas.push(iso(new Date(mes.ano, mes.mes, d)));
  while (celulas.length % 7) celulas.push(null);

  const mudarMes = (delta: number) => setMes(({ ano, mes: m }) => { let n = m + delta, a = ano; if (n < 0) { n = 11; a--; } if (n > 11) { n = 0; a++; } return { ano: a, mes: n }; });
  const escolher = (d: string) => { setDia(d); const x = paraData(d); setMes({ ano: x.getFullYear(), mes: x.getMonth() }); };
  const irHoje = () => escolher(hoje);
  const doDia = porDia[dia] || [];
  const seg = inicioSemana(dia);
  const semana = Array.from({ length: 7 }, (_, i) => somar(seg, i));
  const temNaSemana = semana.some((d) => (porDia[d] || []).length);
  const nomeMes = MESES[mes.mes];

  const linha = (e: Evento, i: number, comData?: boolean) => {
    const p = porId(db.pendencias, e.pendId), sit = p ? situacao(db, p, hoje) : null;
    return (
      <button key={e.tipo + e.titulo + i} type="button" className="app-row" onClick={() => (p ? abrir(p.id) : ir('inicio'))}>
        <Icone nome={e.icone} className="app-row__icone" />
        <span className="app-row__texto" style={{ gap: 2 }}>
          <span className="label-medium texto-apoio">{e.tipo}{comData ? ' · ' + br(e.data) : ''}</span>
          <span className="title-small">{e.titulo}</span>
        </span>
        {sit && <Status tom={sit.tom} pequeno>{sit.rotulo}</Status>}
      </button>
    );
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 'var(--space-6)' }}>
      <section aria-labelledby="cal-mes" style={{ flex: '2 1 520px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
          <h2 className="title-large" id="cal-mes" style={{ flex: celular ? '1 1 100%' : '1 1 160px' }} aria-live="polite">{nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)} de {mes.ano}</h2>
          <Botao variante="text" icone="chevron_left" onClick={() => mudarMes(-1)}>Anterior</Botao>
          <Botao variante="outlined" onClick={irHoje}>Hoje</Botao>
          <Botao variante="text" iconeFim="chevron_right" onClick={() => mudarMes(1)}>Próximo</Botao>
        </div>
        {celular && <p className="body-small texto-apoio">O número embaixo do dia mostra quantas coisas estão marcadas. Toque no dia para ver.</p>}
        <div className="app-dias" aria-hidden="true">
          {(celular ? ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] : ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']).map((d, i) => <span key={i} className="label-medium texto-apoio" style={{ textAlign: 'center', padding: '4px 0' }}>{d}</span>)}
        </div>
        <div className="app-dias">
          {celulas.map((d, i) => {
            if (!d) return <div key={'v' + i} aria-hidden="true" />;
            const lista = porDia[d] || [];
            const num = Number(d.slice(8));
            return (
              <button key={d} type="button" className={'app-dia' + (d === hoje ? ' app-dia--hoje' : '')} aria-pressed={dia === d} onClick={() => setDia(d)}
                aria-label={num + ' de ' + nomeMes + (lista.length ? ', ' + lista.length + (lista.length > 1 ? ' compromissos' : ' compromisso') : ', nada marcado')}>
                <span className="app-dia__num">{num}</span>
                <span className="app-dia__ev">{lista.length ? (celular ? String(lista.length) : lista[0].tipo + ': ' + lista[0].titulo) : ''}</span>
                {!celular && <span className="app-dia__ev">{lista[1] ? lista[1].tipo + ': ' + lista[1].titulo : ''}</span>}
                {!celular && <span className="app-dia__ev">{lista.length > 2 ? '+' + (lista.length - 2) + ' mais' : ''}</span>}
              </button>
            );
          })}
        </div>
      </section>

      <div style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <section className="cn-card" aria-labelledby="cal-dia" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', padding: 'var(--space-5) var(--space-3) var(--space-3)' }}>
          <h2 className="title-medium" id="cal-dia" style={{ padding: '0 var(--space-2)' }}>{diaExtenso(dia)} · {br(dia)}</h2>
          {!doDia.length && <p className="body-medium texto-apoio" style={{ padding: '0 var(--space-2)' }}>Nada marcado neste dia.</p>}
          <div style={{ display: 'flex', flexDirection: 'column' }}>{doDia.map((e, i) => linha(e, i))}</div>
        </section>

        <section className="cn-card" aria-labelledby="cal-semana" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', padding: 'var(--space-5) var(--space-3) var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', padding: '0 0 0 var(--space-2)', flexWrap: 'wrap' }}>
            <h2 className="title-medium" id="cal-semana" style={{ flex: '1 1 160px' }}>Semana de {br(seg).slice(0, 5)} a {br(somar(seg, 6)).slice(0, 5)}</h2>
            <span style={{ display: 'flex' }}>
              <button type="button" className="cn-icon-btn" aria-label="Semana anterior" title="Semana anterior" onClick={() => escolher(somar(dia, -7))}><Icone nome="chevron_left" /></button>
              <button type="button" className="cn-icon-btn" aria-label="Próxima semana" title="Próxima semana" onClick={() => escolher(somar(dia, 7))}><Icone nome="chevron_right" /></button>
            </span>
          </div>
          {!temNaSemana && <p className="body-medium texto-apoio" style={{ padding: '0 var(--space-2)' }}>Nada marcado nesta semana.</p>}
          {semana.map((d) => {
            const lista = porDia[d] || [];
            if (!lista.length) return null;
            return (
              <div key={d} style={{ display: 'flex', flexDirection: 'column' }}>
                <p className="label-medium" style={{ padding: 'var(--space-2) var(--space-2) 0', color: d === hoje ? 'var(--primary)' : 'var(--on-surface)' }}>{diaExtenso(d)} · {quandoTexto(d, hoje)}</p>
                {lista.map((e, i) => linha(e, i))}
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}
