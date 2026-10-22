/* "Já comprei" / "Editar compra" / "Registrar compra" do inventário: primeiro "Onde foi comprado?", depois só os campos dessa escolha.
   Sem pendência (`p` nulo), a compra do inventário cria a pendência de compra do item ao salvar. */
import { useState } from 'react';
import { useApp } from '../../app/contexto';
import { editarCompra, registrarCompra, registrarCompraDoItem, type DadosCompra } from '../../lib/acoes';
import { br, deBR } from '../../lib/datas';
import { brl, normalizarLink, primeiroNome, valorDe, valorTexto } from '../../lib/formatos';
import { contagem, contagemItem, porId } from '../../lib/regras';
import type { Compra, Item, LocalEntrega, OndeComprou, PendCompra } from '../../types';
import { Acoes, Aviso, Botao, Campo, CampoData, CampoValor, Escolha, PerguntaContador, Segmentado } from '../ui';

export function FormCompra({ p, item, compra, aoFechar, semTitulo }: {
  p: PendCompra | null; item?: Item | null; compra: Compra | null; aoFechar: () => void; semTitulo?: boolean;
}) {
  const { db, eu, fazer } = useApp();
  const cont = p ? contagem(db, p) : contagemItem(db, item!);
  const titulo = p ? p.titulo : item!.nome;
  const maxQtd = Math.max(1, compra ? compra.qtd + cont.falta : cont.falta);
  const nomeCanela = db.pessoas.filter((x) => x.local === 'canela').map((x) => primeiroNome(x.nome)).join(' e ') || 'quem está em Canela';

  const [onde, setOnde] = useState<OndeComprou | null>(compra?.onde ?? null);
  const [qtd, setQtd] = useState(compra?.qtd ?? Math.max(1, cont.falta));
  const [quem, setQuem] = useState(compra?.quem || (porId(db.pessoas, eu.id) ? eu.id : db.pessoas[0]?.id ?? ''));
  const [valor, setValor] = useState(compra ? valorTexto(compra.valor) : '');
  const [pag, setPag] = useState<'avista' | 'parcelado'>(compra?.pag ?? 'avista');
  const [parcelas, setParcelas] = useState(compra?.parcelas ?? 2);
  const [valorParcela, setValorParcela] = useState(compra?.valorParcela != null ? valorTexto(compra.valorParcela) : '');
  const [parcelaMexida, setParcelaMexida] = useState(compra?.valorParcela != null);
  const [link, setLink] = useState(compra?.link ?? '');
  const [entrega, setEntrega] = useState(compra?.entrega ? br(compra.entrega) : '');
  const [local, setLocal] = useState<LocalEntrega | null>(compra?.local ?? null);
  const [rastreioAberto, setRastreioAberto] = useState(!!compra?.rastreio);
  const [rastreio, setRastreio] = useState(compra?.rastreio ?? '');
  const [loja, setLoja] = useState(compra?.loja ?? '');
  const [frete, setFrete] = useState(compra && compra.frete ? valorTexto(compra.frete) : '');
  const [erros, setErros] = useState<Record<string, string>>({});

  const valorNum = valorDe(valor);
  const parcelaCalculada = valorNum ? valorNum / parcelas : null;
  const parcelaTexto = parcelaMexida ? valorParcela : parcelaCalculada ? valorTexto(Math.round(parcelaCalculada * 100) / 100) : '';
  const entregaIso = deBR(entrega);
  const limpa = (k: string) => setErros((e) => ({ ...e, [k]: '' }));

  const salvar = () => {
    const e: Record<string, string> = {};
    if (!onde) e.onde = 'Escolha onde foi comprado.';
    if (db.pessoas.length && !quem) e.quem = onde === 'reaproveitado' ? 'Escolha quem vai trazer.' : 'Escolha quem comprou.';
    if ((onde === 'internet' || onde === 'local') && !(valorNum && valorNum > 0)) e.valor = 'Digite quanto custou, ex.: 159,90.';
    if (onde === 'internet' || onde === 'reaproveitado') {
      if (!entregaIso) e.entrega = entrega ? 'Essa data não existe. Use DD/MM/AAAA, ex.: 25/10/2026.' : 'Digite a data no formato DD/MM/AAAA, ex.: 25/10/2026.';
      if (!local) e.local = 'Escolha onde vai chegar.';
    }
    if (onde === 'internet' && pag === 'parcelado' && parcelaMexida && !(valorDe(valorParcela) && valorDe(valorParcela)! > 0)) e.parcela = 'Digite o valor de cada parcela, ex.: 53,30.';
    if (onde === 'local' && !loja.trim()) e.loja = 'Escreva o nome da loja, ex.: Loja do centro.';
    if (Object.keys(e).length) { setErros(e); return; }
    const parcelado = onde === 'internet' && pag === 'parcelado';
    const dados: DadosCompra = {
      qtd, quem: quem || eu.id, onde: onde!, valor: onde === 'reaproveitado' ? 0 : valorNum || 0,
      pag: onde === 'internet' ? pag : 'avista', parcelas: parcelado ? parcelas : 2,
      valorParcela: parcelado ? (parcelaMexida ? valorDe(valorParcela) : parcelaCalculada ? Math.round(parcelaCalculada * 100) / 100 : null) : null,
      link: onde === 'internet' ? normalizarLink(link) : '',
      entrega: onde === 'local' ? null : entregaIso, local: onde === 'local' ? null : local,
      rastreio: onde === 'internet' && rastreioAberto ? rastreio.trim() : '', loja: onde === 'local' ? loja.trim() : '',
      frete: onde === 'reaproveitado' ? valorDe(frete) || 0 : 0,
    };
    if (compra && p) fazer((c) => editarCompra(c, p.id, compra.id, dados));
    else if (p) fazer((c) => registrarCompra(c, p.id, dados));
    else fazer((c) => registrarCompraDoItem(c, item!.id, dados));
    aoFechar();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {!semTitulo && <h3 className="cn-detail__section-title">{compra ? 'Editar compra' : 'Registrar compra'}</h3>}

      <Segmentado rotulo="Onde foi comprado?" valor={onde} erro={erros.onde} aoMudar={(v) => { setOnde(v); setErros({}); }}
        opcoes={[{ valor: 'internet', rotulo: 'Internet', icone: 'language' }, { valor: 'local', rotulo: 'Local', icone: 'storefront' }, { valor: 'reaproveitado', rotulo: 'Reaproveitado', icone: 'recycling' }]} />

      {onde && (
        <>
          {maxQtd > 1 && (
            <PerguntaContador rotulo="Quantas unidades você comprou?" valor={qtd} aoMudar={setQtd} min={1} max={maxQtd}
              ajuda={'Faltam ' + cont.falta + ' de ' + cont.precisa + '.'} />
          )}
          {db.pessoas.length > 0 && (
            <Escolha rotulo={onde === 'reaproveitado' ? 'Quem vai trazer?' : 'Quem comprou?'} valor={quem} erro={erros.quem}
              aoMudar={(v) => { setQuem(v); limpa('quem'); }}
              opcoes={db.pessoas.map((x) => ({ valor: x.id, rotulo: primeiroNome(x.nome) + (x.id === eu.id ? ' (você)' : '') }))} />
          )}
          {onde === 'reaproveitado' && <p className="body-small texto-apoio">Reaproveitado: vem de casa, de outra cidade.</p>}

          {(onde === 'internet' || onde === 'local') && (
            <CampoValor rotulo="Valor total pago" valor={valor} aoMudar={(v) => { setValor(v); limpa('valor'); }} erro={erros.valor} />
          )}

          {onde === 'internet' && (
            <>
              <Escolha rotulo="Forma de pagamento" valor={pag} aoMudar={setPag} opcoes={[{ valor: 'avista', rotulo: 'À vista' }, { valor: 'parcelado', rotulo: 'Parcelado' }]} />
              {pag === 'parcelado' && (
                <>
                  <PerguntaContador rotulo="Em quantas vezes?" valor={parcelas} min={2} max={24} rotuloMenos="Menos parcelas" rotuloMais="Mais parcelas"
                    aoMudar={(v) => { setParcelas(v); if (!parcelaMexida) setValorParcela(''); }} />
                  <CampoValor rotulo="Valor de cada parcela" valor={parcelaTexto} erro={erros.parcela} exemplo="Ex.: 53,30"
                    aoMudar={(v) => { setValorParcela(v); setParcelaMexida(true); limpa('parcela'); }}
                    ajuda={valorNum ? 'Calculamos dividindo o total (' + parcelas + 'x de ' + brl(valorNum / parcelas) + '). Mude se teve juros.' : 'Digite o valor total para ver quanto fica cada parcela.'} />
                </>
              )}
              <Campo rotulo="Link do produto (se tiver)" valor={link} aoMudar={setLink} icone="link" inputMode="url" exemplo="Ex.: https://loja.com.br/produto" ajuda="Ajuda quem for conferir a entrega." />
            </>
          )}

          {onde === 'local' && (
            <Campo rotulo="Onde comprou?" valor={loja} aoMudar={(v) => { setLoja(v); limpa('loja'); }} icone="storefront" exemplo="Ex.: Loja do centro de Canela" erro={erros.loja} />
          )}

          {(onde === 'internet' || onde === 'reaproveitado') && (
            <>
              <CampoData rotulo={onde === 'reaproveitado' ? 'Data prevista de chegada' : 'Data prevista de entrega'} valor={entrega} aoMudar={(v) => { setEntrega(v); limpa('entrega'); }} erro={erros.entrega} />
              <Escolha rotulo="Onde vai chegar?" valor={local} erro={erros.local} aoMudar={(v) => { setLocal(v); limpa('local'); }}
                opcoes={[{ valor: 'condominio', rotulo: 'Condomínio' }, { valor: 'agencia', rotulo: 'Agência' }]} />
              {local === 'agencia' && (
                <Aviso titulo="Retirada na agência">
                  Se passar de {entregaIso ? br(entregaIso) : 'a data prevista'} sem chegar, o sistema cria a tarefa “Retirar {titulo} na agência” para {nomeCanela}.
                </Aviso>
              )}
            </>
          )}

          {onde === 'reaproveitado' && (
            <CampoValor rotulo="Valor do frete" valor={frete} aoMudar={setFrete} exemplo="Ex.: 35,00" ajuda="Deixe em branco se não teve frete." />
          )}

          {onde === 'internet' && (rastreioAberto
            ? <Campo rotulo="Código de rastreio (se tiver)" valor={rastreio} aoMudar={setRastreio} icone="local_shipping" exemplo="Ex.: BR123456789BR" autoFocus={!compra} />
            : <div><Botao variante="text" icone="add" onClick={() => setRastreioAberto(true)}>Adicionar código de rastreio</Botao></div>)}
        </>
      )}

      <Acoes>
        <Botao variante="outlined" onClick={aoFechar}>Cancelar</Botao>
        <Botao icone="check" onClick={salvar}>Salvar compra</Botao>
      </Acoes>
    </div>
  );
}
