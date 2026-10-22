/* Card compacto estilo Trello: etiquetas, título, barra de progresso, onde e quando chega, responsáveis. */
import type { Banco, Pendencia } from '../types';
import { contagem, meta, porId, TIPOS, type Situacao } from '../lib/regras';
import { Avatares, BarraUnidades, CardBoard, EtiquetaApto, Etiquetas, EtiquetaUrgencia, Meta, Status } from './ui';

export function CartaoPendencia({ db, p, sit, hoje, aoAbrir, selecionado }: { db: Banco; p: Pendencia; sit: Situacao; hoje: string; aoAbrir: () => void; selecionado?: boolean }) {
  const T = TIPOS[p.tipo], m = meta(p, sit, hoje);
  const nomes = p.resp.map((id) => porId(db.pessoas, id)?.nome).filter((n): n is string => !!n);
  const c = p.tipo === 'compra' ? contagem(db, p) : null;
  return (
    <CardBoard onClick={aoAbrir} selecionado={selecionado}>
      <Etiquetas>
        <EtiquetaUrgencia urgencia={p.urgencia} />
        <EtiquetaApto apto={p.apto} />
        {sit.atrasado && <Status tom="atrasado" pequeno>Atrasado</Status>}
      </Etiquetas>
      <Meta icone={T.icone}>{T.rotulo}{p.modo === 'casa' ? ' · dá para fazer de casa' : ''}</Meta>
      <span className="cn-board-card__title">{p.titulo}</span>
      {c && <BarraUnidades compacto tem={c.tem} caminho={c.cam} falta={c.falta} precisa={c.precisa} />}
      {sit.bloqueio && <Meta icone="lock" style={{ color: 'var(--on-surface)' }}>{sit.bloqueio.texto}</Meta>}
      <span className="cn-board-card__foot">
        <Meta icone={m.icone} vencido={m.vencido}>{m.texto}</Meta>
        {nomes.length ? <Avatares nomes={nomes} /> : <span className="body-small texto-apoio">Sem responsável</span>}
      </span>
    </CardBoard>
  );
}
