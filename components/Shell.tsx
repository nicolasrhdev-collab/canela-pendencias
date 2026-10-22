/* Estrutura das telas: menu lateral no computador, navegação inferior no celular, Configurações no topo. */
import { useEffect, useRef } from 'react';
import { useApp } from '../app/contexto';
import { PREFIXO_JUNTO, type Tela } from '../app/rotas';
import { br } from '../lib/datas';
import { porId, TIPOS } from '../lib/regras';
import { Avatar, BarraTopo, Botao, BotaoIcone, ItemLateral, NavInferior, Painel, type ItemNav } from './ui';
import { Calendario } from './telas/Calendario';
import { Configuracoes } from './telas/Configuracoes';
import { DetalheItem } from './telas/DetalheItem';
import { DetalheJunto } from './telas/DetalheJunto';
import { DetalhePendencia } from './telas/DetalhePendencia';
import { Infos } from './telas/Infos';
import { Inicio } from './telas/Inicio';
import { Inventario } from './telas/Inventario';
import { NovaPendencia } from './telas/NovaPendencia';
import { Pendencias } from './telas/Pendencias';

const NAV: ItemNav[] = [
  { id: 'inicio', rotulo: 'Início', icone: 'home' },
  { id: 'pendencias', rotulo: 'Pendências', icone: 'checklist' },
  { id: 'inventario', rotulo: 'Inventário', icone: 'inventory_2' },
  { id: 'calendario', rotulo: 'Calendário', icone: 'calendar_month' },
  { id: 'infos', rotulo: 'Infos', icone: 'info' },
];

function TelaAtual({ tela }: { tela: Tela }) {
  switch (tela) {
    case 'pendencias': return <Pendencias />;
    case 'inventario': return <Inventario />;
    case 'calendario': return <Calendario />;
    case 'infos': return <Infos />;
    case 'config': return <Configuracoes />;
    default: return <Inicio />;
  }
}

export function Shell() {
  const { db, eu, souAdm, hoje, celular, rota, ir, fechar, abrirNova, tema } = useApp();
  const rolagem = useRef<HTMLDivElement>(null);
  const tela = rota.tela;
  /* No inventário, `p` pode ser um item junto ("todos:" + id), um item (detalhe do item) ou a pendência de compra aberta a partir dele. */
  const idJunto = tela === 'inventario' && rota.p?.startsWith(PREFIXO_JUNTO) ? rota.p.slice(PREFIXO_JUNTO.length) : null;
  const pDet = rota.p && !idJunto ? porId(db.pendencias, rota.p) : null;
  const ehItem = !!rota.p && tela === 'inventario' && !pDet;
  const itemDet = ehItem ? porId(db.itens, idJunto ?? rota.p) : null;
  const detalhe = !rota.p ? null
    : idJunto ? <DetalheJunto key={rota.p} id={idJunto} />
    : ehItem ? <DetalheItem key={rota.p} id={rota.p} /> : <DetalhePendencia key={rota.p} id={rota.p} />;
  const TIT: Record<Tela, string> = {
    inicio: 'Início', pendencias: 'Pendências', inventario: 'Inventário', calendario: 'Calendário',
    infos: celular ? 'Informações' : 'Informações importantes', config: 'Configurações',
  };

  useEffect(() => { rolagem.current?.scrollTo({ top: 0 }); }, [tela, celular ? rota.p : null]);

  const irPara = (id: string) => ir(id as Tela);
  const botaoTema = { rotulo: tema.resolvido === 'noturno' ? 'Modo claro' : 'Modo noturno', curto: tema.resolvido === 'noturno' ? 'Claro' : 'Noturno', icone: tema.resolvido === 'noturno' ? 'light_mode' : 'dark_mode' };

  if (celular) {
    const titulo = rota.p ? (ehItem ? 'Inventário' : pDet ? TIPOS[pDet.tipo].rotulo : 'Pendência') : TIT[tela];
    const voltar = rota.p ? fechar : tela === 'config' ? () => window.history.length > 1 ? window.history.back() : ir('inicio') : undefined;
    return (
      <div className="app app--celular">
        <BarraTopo titulo={titulo} voltar={voltar}>
          <Botao variante="text" icone={botaoTema.icone} aria-label={botaoTema.rotulo} onClick={tema.alternar} style={{ padding: '0 var(--space-3)' }}>{botaoTema.curto}</Botao>
          {tela !== 'config' && <BotaoIcone icone="settings" rotulo="Configurações" onClick={() => ir('config')} />}
        </BarraTopo>
        {souAdm && tela === 'pendencias' && !rota.p && db.pendencias.length > 0 && (
          <div className="app-acao-fixa"><Botao icone="add" larguraTotal onClick={abrirNova}>Criar pendência</Botao></div>
        )}
        <div className="app-rolagem" ref={rolagem}>
          <div className="app-conteudo">
            {detalhe ? <div className="app-detalhe-celular">{detalhe}</div> : <TelaAtual tela={tela} />}
            {souAdm && tela === 'pendencias' && !rota.p && !db.pendencias.length && (
              <div style={{ display: 'flex', justifyContent: 'center' }}><Botao icone="add" larguraTotal onClick={abrirNova} style={{ maxWidth: 360 }}>Criar pendência</Botao></div>
            )}
          </div>
        </div>
        <NavInferior itens={NAV} atual={tela} aoIr={irPara} />
        {rota.nova && <NovaPendencia />}
      </div>
    );
  }

  return (
    <div className="app">
      <nav className="app-lateral" aria-label="Principal">
        <div className="app-marca">
          <span className="cn-icon cn-icon--24" aria-hidden="true" style={{ color: 'var(--primary)' }}>cottage</span>
          <div className="app-marca__textos">
            <span className="title-medium">Canela · Pendências</span>
            <span className="body-small texto-apoio">Apês 105 e 306</span>
          </div>
        </div>
        {souAdm && <Botao icone="add" className="app-lateral__criar" onClick={abrirNova}>Criar pendência</Botao>}
        {NAV.map((x) => <ItemLateral key={x.id} item={x.id === 'infos' ? { ...x, rotulo: 'Informações' } : x} atual={tela === x.id} aoIr={() => irPara(x.id)} />)}
        <div className="app-lateral__espaco" />
        <Botao variante="outlined" icone={botaoTema.icone} onClick={tema.alternar}>{botaoTema.rotulo}</Botao>
        <div className="app-lateral__eu">
          <Avatar nome={eu.nome} />
          <span>
            <span className="body-small texto-apoio">Você entrou como</span>
            <span className="title-small">{eu.nome}</span>
          </span>
        </div>
      </nav>
      <main className="app-principal">
        <BarraTopo titulo={TIT[tela]} className="app-topo-pc">
          <span className="body-small texto-apoio app-topo-pc__hoje">Hoje: {br(hoje)}</span>
          <BotaoIcone icone="settings" rotulo="Configurações" selecionado={tela === 'config'} onClick={() => ir('config')} />
        </BarraTopo>
        <div className="app-rolagem" ref={rolagem}>
          <div className="app-conteudo"><TelaAtual tela={tela} /></div>
        </div>
      </main>
      {detalhe && (
        <Painel rotulo={ehItem ? 'Item do inventário' + (itemDet ? ': ' + itemDet.nome : '') : pDet ? TIPOS[pDet.tipo].rotulo + ': ' + pDet.titulo : 'Pendência'} aoFechar={fechar}>
          {detalhe}
        </Painel>
      )}
      {rota.nova && <NovaPendencia />}
    </div>
  );
}
