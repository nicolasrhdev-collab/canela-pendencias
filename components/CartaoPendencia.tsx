/* Card compacto estilo Trello: etiquetas em cima (tipo, apê, bandeira de essencial), título, onde e quando, barra de progresso sempre e, embaixo dela, quem cuida. */
import type { Banco, Pendencia } from '../types';
import { primeiroNome } from '../lib/formatos';
import { meta, porId, progresso, responsaveis, type Situacao } from '../lib/regras';
import { Avatar, BarraUnidades, CardBoard, EtiquetaApto, Etiquetas, EtiquetaTipo, EtiquetaUrgencia, Meta, Status } from './ui';

/** "Ana", "Ana e Rui" ou "Ana, Rui e mais 2". */
function quemCuida(nomes: string[]) {
  const n = nomes.map(primeiroNome);
  return n.length <= 2 ? n.join(' e ') : n.slice(0, 2).join(', ') + ' e mais ' + (n.length - 2);
}

export function CartaoPendencia({ db, p, sit, hoje, aoAbrir, selecionado }: { db: Banco; p: Pendencia; sit: Situacao; hoje: string; aoAbrir: () => void; selecionado?: boolean }) {
  const m = meta(p, sit, hoje), c = progresso(db, p, sit);
  const nomes = responsaveis(db, p).ids.map((id) => porId(db.pessoas, id)?.nome).filter((n): n is string => !!n);
  return (
    <CardBoard onClick={aoAbrir} selecionado={selecionado}>
      <Etiquetas>
        <EtiquetaTipo tipo={p.tipo} />
        <EtiquetaApto apto={p.apto} />
        <EtiquetaUrgencia urgencia={p.urgencia} />
        {sit.atrasado && <Status tom="atrasado" pequeno>Atrasado</Status>}
      </Etiquetas>
      <span className="cn-board-card__title">{p.titulo}</span>
      <Meta icone={m.icone} vencido={m.vencido}>{m.texto}</Meta>
      {sit.bloqueio && <Meta icone="lock" style={{ color: 'var(--on-surface)' }}>{sit.bloqueio.texto}</Meta>}
      <BarraUnidades compacto semLegenda tem={c.tem} caminho={c.cam} falta={c.falta} precisa={c.precisa} rotulo={p.tipo === 'compra' ? undefined : sit.rotulo} />
      {nomes.length > 0 && (
        <span className="app-card-resp">
          <span className="cn-avatars">{nomes.slice(0, 3).map((n, i) => <Avatar key={n + i} nome={n} tamanho={24} decorativo />)}</span>
          <span className="app-card-resp__nomes">{quemCuida(nomes)}</span>
        </span>
      )}
    </CardBoard>
  );
}
