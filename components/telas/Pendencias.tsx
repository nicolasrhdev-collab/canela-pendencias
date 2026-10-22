/* Pendências: board com Pendente, Aguardando e Concluído. No celular as colunas viram abas. */
import { useState } from 'react';
import { FILTROS_VAZIOS, useApp, type Filtros } from '../../app/contexto';
import { primeiroNome } from '../../lib/formatos';
import { COLUNAS, ordem, responsaveis, situacao } from '../../lib/regras';
import { CartaoPendencia } from '../CartaoPendencia';
import { Abas, Board, Botao, Coluna, Seletor, Vazio } from '../ui';

export function Pendencias() {
  const { db, souAdm, hoje, celular, filtros: F, setFiltros, aba, setAba, abrir, abrirNova, rota } = useApp();
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const pessoas = db.pessoas;

  const grupos: { id: keyof Filtros; pergunta: string; ops: [string, string][] }[] = [
    { id: 'apto', pergunta: 'Apartamento', ops: [['Todos', 'todos'], ['105', '105'], ['306', '306'], ['Ambos', 'Ambos']] },
    { id: 'tipo', pergunta: 'Tipo', ops: [['Todos', 'todos'], ['Compra', 'compra'], ['Tarefa', 'tarefa'], ['Serviço', 'servico'], ['Pagamento', 'pagamento']] },
    { id: 'urg', pergunta: 'Essencial', ops: [['Todas', 'todos'], ['Só essenciais', 'Essencial']] },
    { id: 'resp', pergunta: 'Responsável', ops: [['Todos', 'todos'] as [string, string], ...pessoas.map((p) => [primeiroNome(p.nome), p.id] as [string, string])] },
    { id: 'status', pergunta: 'Situação', ops: [['Todas', 'todos'], ['Pendente', 'pendente'], ['Aguardando', 'aguardando'], ['Concluído', 'concluido'], ['Atrasado', 'atrasado']] },
  ];
  const ativos = grupos.filter((g) => F[g.id] !== 'todos').length;

  const cards = db.pendencias
    .map((p) => ({ p, sit: situacao(db, p, hoje) }))
    .filter(({ p, sit }) => {
      if (F.apto !== 'todos' && !(p.apto === F.apto || (F.apto !== 'Ambos' && p.apto === 'Ambos'))) return false;
      if (F.tipo !== 'todos' && p.tipo !== F.tipo) return false;
      if (F.urg !== 'todos' && p.urgencia !== F.urg) return false;
      if (F.resp !== 'todos' && !responsaveis(db, p).ids.includes(F.resp)) return false;
      if (F.status === 'atrasado' && !sit.atrasado) return false;
      if (F.status !== 'todos' && F.status !== 'atrasado' && sit.coluna !== F.status) return false;
      return true;
    })
    .sort((a, b) => ordem(a.p, a.sit) - ordem(b.p, b.sit) || a.p.titulo.localeCompare(b.p.titulo, 'pt-BR'));

  const colunas = COLUNAS.map((k) => ({ ...k, cards: cards.filter((x) => x.sit.coluna === k.id) }));
  const visiveis = celular ? colunas.filter((k) => k.id === aba) : colunas;
  const mostrarFiltros = !celular || filtrosAbertos;

  if (!db.pendencias.length) {
    return (
      <Vazio titulo="Nenhuma pendência ainda" texto="Crie a primeira: uma compra, uma tarefa, um serviço ou um pagamento. Ela aparece aqui para todo mundo.">
        {!celular && souAdm && <Botao icone="add" onClick={abrirNova}>Criar pendência</Botao>}
      </Vazio>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap', minHeight: 'var(--size-button)' }}>
        <p className="body-medium texto-apoio" style={{ flex: 1 }}>{cards.length === 1 ? '1 pendência' : cards.length + ' pendências'}{ativos ? ' com estes filtros' : ''}</p>
        {ativos > 0 && <Botao variante="text" icone="filter_alt_off" onClick={() => setFiltros(FILTROS_VAZIOS)}>Limpar filtros</Botao>}
      </div>

      {celular && (
        <Botao variante="outlined" icone="tune" larguraTotal onClick={() => setFiltrosAbertos(!filtrosAbertos)} aria-expanded={filtrosAbertos}>
          {filtrosAbertos ? 'Esconder filtros' : ativos ? 'Mostrar filtros (' + ativos + (ativos === 1 ? ' ligado)' : ' ligados)') : 'Mostrar filtros'}
        </Botao>
      )}

      {mostrarFiltros && (
        <section aria-label="Filtros" className="app-filtros">
          {grupos.map((g) => (
            <Seletor key={g.id} rotulo={g.pergunta} valor={F[g.id]} destacado={F[g.id] !== 'todos'}
              opcoes={g.ops.map(([rotulo, valor]) => ({ rotulo, valor }))} aoMudar={(v) => setFiltros({ ...F, [g.id]: v })} />
          ))}
        </section>
      )}

      {celular && (
        <Abas rotulo="Situação" ativa={aba} aoMudar={setAba}
          abas={colunas.map((k) => ({ id: k.id, titulo: k.titulo, qtd: k.cards.length, tom: k.id, controla: 'lista-' + k.id }))} />
      )}

      <Board>
        {visiveis.map((k) => (
          <Coluna key={k.id} id={'lista-' + k.id} titulo={k.titulo} tom={k.id} qtd={k.cards.length} cabeca={!celular}
            estilo={celular ? { flex: '1 1 auto', width: 'auto', minWidth: 0 } : { flex: '1 1 0', width: 'auto', minWidth: 260 }}
            rodape={k.id === 'pendente' && !celular && souAdm ?<Botao variante="text" icone="add" onClick={abrirNova} style={{ justifyContent: 'flex-start', color: 'var(--on-primary-container)' }}>Criar pendência</Botao> : undefined}>
            {k.cards.map(({ p, sit }) => <CartaoPendencia key={p.id} db={db} p={p} sit={sit} hoje={hoje} aoAbrir={() => abrir(p.id)} selecionado={rota.p === p.id} />)}
            {k.cards.length === 0 && <p className="body-medium texto-apoio" style={{ padding: 'var(--space-4) var(--space-2)', textAlign: 'center' }}>{ativos ? 'Nada aqui com estes filtros.' : 'Nada aqui por enquanto.'}</p>}
          </Coluna>
        ))}
      </Board>
    </div>
  );
}
