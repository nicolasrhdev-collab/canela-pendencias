/* Nova pendência — janela (pop-up) por cima da tela. Primeiro a lista do que adicionar;
   depois uma pergunta por vez: a próxima só aparece depois da resposta anterior. */
import { useState, type ReactNode } from 'react';
import { useApp } from '../../app/contexto';
import { criarPendencia } from '../../lib/acoes';
import { deBR } from '../../lib/datas';
import { primeiroNome, valorDe } from '../../lib/formatos';
import { situacao } from '../../lib/regras';
import type { Apto, Modo, Tipo, Urgencia } from '../../types';
import { Botao, Campo, CampoData, CampoTelefone, CampoValor, Chip, Escolha, Icone, Janela, PerguntaContador } from '../ui';

const TIPOS_NOVA: [Tipo, string, string, string][] = [
  ['compra', 'Compra', 'shopping_cart', 'Algo para comprar e levar ao apê'],
  ['tarefa', 'Tarefa', 'task_alt', 'Algo para fazer, sem custo'],
  ['servico', 'Serviço', 'handyman', 'Uma pessoa ou empresa que vamos contratar'],
  ['pagamento', 'Pagamento', 'payments', 'Um boleto ou conta para pagar'],
];
const PERGUNTA: Record<Tipo, string> = { compra: 'O que precisa comprar?', tarefa: 'O que precisa ser feito?', servico: 'Qual é o serviço?', pagamento: 'O que precisa ser pago?' };
const EXEMPLO: Record<Tipo, string> = { compra: 'Ex.: Toalha de banho', tarefa: 'Ex.: Pendurar os quadros', servico: 'Ex.: Instalar o chuveiro', pagamento: 'Ex.: Boleto do marceneiro' };
const TITULO: Record<Tipo, string> = { compra: 'Nova compra', tarefa: 'Nova tarefa', servico: 'Novo serviço', pagamento: 'Novo pagamento' };

function Passo({ n, children, id }: { n: number; children: ReactNode; id?: string }) {
  return <h2 className="title-medium app-pergunta-titulo" id={id}><span className="app-passo" aria-hidden="true">{n}</span>{children}</h2>;
}

export function NovaPendencia() {
  const { db, eu, hoje, celular, fazer, fecharNova, setAba } = useApp();
  const [tipo, setTipo] = useState<Tipo | null>(null);
  const [nome, setNome] = useState('');
  const [apto, setApto] = useState<Apto | null>(null);
  const [urg, setUrg] = useState<Urgencia | null>(null);
  const [modo, setModo] = useState<Modo | null>(null);
  const [qtd, setQtd] = useState(1);
  const [aoChegar, setAoChegar] = useState<'sim' | 'nao' | null>(null);
  const [tarefaChegar, setTarefaChegar] = useState('');
  const [depende, setDepende] = useState<'sim' | 'nao' | null>(null);
  const [depId, setDepId] = useState<string | null>(null);
  const [prazo, setPrazo] = useState('');
  const [pessoa, setPessoa] = useState('');
  const [telefone, setTelefone] = useState('');
  const [valor, setValor] = useState('');
  const [quando, setQuando] = useState<'dia' | 'ate' | null>(null);
  const [data, setData] = useState('');
  const [resp, setResp] = useState<string[]>([]);
  const [erros, setErros] = useState<Record<string, string>>({});
  const limpa = (k: string) => setErros((e) => ({ ...e, [k]: '' }));

  const abertas = db.pendencias.filter((p) => p.tipo === 'compra' && situacao(db, p, hoje).coluna !== 'concluido');
  const temNome = nome.trim().length >= 2;
  const espOk = !!modo && (
    tipo === 'compra' ? aoChegar === 'nao' || (aoChegar === 'sim' && tarefaChegar.trim().length >= 2)
      : tipo === 'tarefa' ? depende === 'nao' || (depende === 'sim' && !!depId)
        : tipo === 'servico' ? !!pessoa.trim() && !!quando
          : tipo === 'pagamento' ? !!valor.trim() && !!data.trim() : false);
  const p3 = !!tipo && temNome, p4 = p3 && !!apto, p5 = p4 && !!urg, p6 = p5 && espOk;
  const alternar = (id: string) => setResp((r) => (r.includes(id) ? r.filter((x) => x !== id) : [...r, id]));

  const criar = () => {
    const e: Record<string, string> = {};
    const msgData = 'Essa data não existe. Use DD/MM/AAAA, ex.: 25/10/2026.';
    const vData = deBR(data), vPrazo = deBR(prazo), vValor = valorDe(valor);
    if (tipo === 'tarefa' && prazo && !vPrazo) e.prazo = msgData;
    if (tipo === 'servico' && !vData) e.data = data ? msgData : 'Digite a data no formato DD/MM/AAAA, ex.: 27/10/2026.';
    if (tipo === 'servico' && valor && vValor == null) e.valor = 'Digite só números, ex.: 450,00.';
    if (tipo === 'pagamento' && !(vValor && vValor > 0)) e.valor = 'Digite quanto é, ex.: 900,00.';
    if (tipo === 'pagamento' && !vData) e.data = msgData;
    if (Object.keys(e).length) { setErros(e); return; }
    const r = fazer((c) => criarPendencia(c, {
      tipo: tipo!, titulo: nome, apto: apto!, urgencia: urg!, modo: modo!, resp,
      qtd, tarefaAoChegar: tipo === 'compra' && aoChegar === 'sim' ? tarefaChegar : undefined,
      prazo: vPrazo, depende: tipo === 'tarefa' && depende === 'sim' ? depId : null,
      pessoa, telefone, valor: vValor || 0, quando: quando || 'ate', data: vData, vencimento: vData || undefined,
    }));
    setAba(r.coluna);
    fecharNova();
  };

  if (!tipo) {
    return (
      <Janela titulo="Nova pendência" aoFechar={fecharNova} celular={celular}>
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <p className="body-medium texto-apoio" id="nv-1">O que você quer adicionar?</p>
          <div role="group" aria-labelledby="nv-1" className="app-opcoes-lista">
            {TIPOS_NOVA.map(([t, rotulo, icone, desc], i) => (
              <button key={t} type="button" className="app-row" data-foco-inicial={i === 0 ? true : undefined} onClick={() => { setTipo(t); setErros({}); }}>
                <span className="app-bolha"><Icone nome={icone} /></span>
                <span className="app-row__texto"><span className="title-small">{rotulo}</span><span className="body-small texto-apoio">{desc}</span></span>
                <Icone nome="chevron_right" className="app-row__icone" />
              </button>
            ))}
          </div>
        </section>
      </Janela>
    );
  }

  return (
    <Janela titulo={TITULO[tipo]} voltar={() => { setTipo(null); setErros({}); }} aoFechar={fecharNova} celular={celular} fecharFora={false}
      rodape={<><Botao variante="outlined" onClick={fecharNova}>Cancelar</Botao>{p6 && <Botao icone="add" onClick={criar}>Criar pendência</Botao>}</>}>
      <p className="body-medium texto-apoio">Responda uma pergunta de cada vez. A próxima aparece sozinha.</p>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <Passo n={1}><label htmlFor="nv-nome">{PERGUNTA[tipo]}</label></Passo>
        <Campo idExterno="nv-nome" rotulo={PERGUNTA[tipo]} valor={nome} aoMudar={setNome} exemplo={EXEMPLO[tipo]} autoFocus ajuda="Escreva como você procuraria na loja ou falaria para alguém." />
      </section>

      {p3 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }} aria-labelledby="nv-3">
          <Passo n={2} id="nv-3">Para qual apartamento?</Passo>
          <div className="cn-chips" role="group" aria-labelledby="nv-3">
            {(['105', '306', 'Ambos'] as Apto[]).map((a) => <Chip key={a} selecionado={apto === a} onClick={() => setApto(a)}>{a}</Chip>)}
          </div>
        </section>
      )}

      {p4 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }} aria-labelledby="nv-4">
          <Passo n={3} id="nv-4">Qual a urgência?</Passo>
          <div className="cn-chips" role="group" aria-labelledby="nv-4">
            {(['Essencial', 'Útil', 'Extra'] as Urgencia[]).map((u) => <Chip key={u} selecionado={urg === u} onClick={() => setUrg(u)}>{u}</Chip>)}
          </div>
          <p className="body-small texto-apoio">Essencial: precisa estar pronto antes de abrir. Útil: ajuda bastante. Extra: se der tempo.</p>
        </section>
      )}

      {p5 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }} aria-labelledby="nv-5">
          <Passo n={4} id="nv-5">Detalhes</Passo>
          <Escolha rotulo="Onde dá para fazer?" valor={modo} aoMudar={setModo}
            ajuda={tipo === 'compra' ? 'De casa: dá para comprar pela internet, de longe.' : undefined}
            opcoes={[{ valor: 'casa', rotulo: 'De casa' }, { valor: 'presencial', rotulo: 'Presencial em Canela' }]} />

          {modo && tipo === 'compra' && (
            <>
              <PerguntaContador rotulo="Quantas precisa?" valor={qtd} min={1} max={99} aoMudar={setQtd} ajuda="O item também entra no inventário do apê." />
              <Escolha rotulo="Quer criar uma tarefa para quando chegar?" valor={aoChegar} aoMudar={setAoChegar}
                ajuda="Ex.: quadro → “Pendurar o quadro”. A tarefa fica com cadeado até chegar."
                opcoes={[{ valor: 'nao', rotulo: 'Não' }, { valor: 'sim', rotulo: 'Sim' }]} />
              {aoChegar === 'sim' && <Campo rotulo="O que fazer quando chegar?" valor={tarefaChegar} aoMudar={setTarefaChegar} exemplo="Ex.: Pendurar o quadro" />}
            </>
          )}

          {modo && tipo === 'tarefa' && (
            <>
              <Escolha rotulo="Só dá para fazer depois que uma compra chegar?" valor={depende} aoMudar={(v) => { setDepende(v); setDepId(null); }}
                opcoes={[{ valor: 'nao', rotulo: 'Não' }, { valor: 'sim', rotulo: 'Sim' }]} />
              {depende === 'sim' && (
                <div className="app-pergunta">
                  <p className="cn-field__label" id="nv-deplista">Qual compra?</p>
                  {!abertas.length && <p className="body-medium texto-apoio">Nenhuma compra em aberto agora.</p>}
                  <div role="group" aria-labelledby="nv-deplista" className="app-opcoes-lista">
                    {abertas.map((p) => (
                      <button key={p.id} type="button" className="app-row" aria-pressed={depId === p.id} onClick={() => setDepId(p.id)}>
                        <Icone nome="shopping_cart" className="app-row__icone" />
                        <span className="app-row__texto"><span className="body-medium">{p.titulo} · {p.apto}</span></span>
                        {depId === p.id && <Icone nome="check" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <CampoData rotulo="Prazo (se tiver)" valor={prazo} aoMudar={(v) => { setPrazo(v); limpa('prazo'); }} erro={erros.prazo} exemplo="Ex.: 05/11/2026" />
            </>
          )}

          {modo && tipo === 'servico' && (
            <>
              <Campo rotulo="Nome da pessoa ou empresa" valor={pessoa} aoMudar={setPessoa} icone="person" exemplo="Ex.: Eletricista Marcos" />
              <CampoTelefone rotulo="Telefone" valor={telefone} aoMudar={setTelefone} />
              <CampoValor rotulo="Valor combinado" valor={valor} aoMudar={(v) => { setValor(v); limpa('valor'); }} erro={erros.valor} exemplo="Ex.: 450,00" />
              <Escolha rotulo="Quando vai ser?" valor={quando} aoMudar={setQuando} opcoes={[{ valor: 'dia', rotulo: 'Dia marcado' }, { valor: 'ate', rotulo: 'Até um dia' }]} />
              {quando && <CampoData rotulo={quando === 'dia' ? 'Qual dia?' : 'Até qual dia?'} valor={data} aoMudar={(v) => { setData(v); limpa('data'); }} erro={erros.data} exemplo="Ex.: 27/10/2026" />}
            </>
          )}

          {modo && tipo === 'pagamento' && (
            <>
              <CampoValor rotulo="Quanto é?" valor={valor} aoMudar={(v) => { setValor(v); limpa('valor'); }} erro={erros.valor} exemplo="Ex.: 900,00" />
              {valor.trim() && <CampoData rotulo="Vencimento" valor={data} aoMudar={(v) => { setData(v); limpa('data'); }} erro={erros.data} exemplo="Ex.: 05/11/2026" />}
            </>
          )}
        </section>
      )}

      {p6 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }} aria-labelledby="nv-6">
          <Passo n={5} id="nv-6">Quem vai cuidar?</Passo>
          <div className="cn-chips" role="group" aria-labelledby="nv-6">
            <Chip selecionado={resp.includes(eu.id)} onClick={() => alternar(eu.id)}>Sou responsável ({primeiroNome(eu.nome)})</Chip>
            {db.pessoas.filter((x) => x.id !== eu.id).map((x) => <Chip key={x.id} selecionado={resp.includes(x.id)} onClick={() => alternar(x.id)}>{primeiroNome(x.nome)}</Chip>)}
          </div>
          <p className="body-small texto-apoio">Pode deixar sem ninguém e decidir depois.</p>
        </section>
      )}
    </Janela>
  );
}
