/* Informações: dados do condomínio, contatos (tocar para ligar ou abrir o WhatsApp) e onde estão os documentos.
   Não guardamos senhas nem arquivos: só onde estão (link ou descrição). */
import { useState } from 'react';
import { useApp } from '../../app/contexto';
import { removerRegistro, salvarRegistro } from '../../lib/acoes';
import { digitos, ehCelular, linkValido, mascaraTelefone, normalizarLink, novoId, telHref, whatsHref } from '../../lib/formatos';
import type { Contato, Dado, Documento } from '../../types';
import { Acoes, Aviso, Avatar, Botao, BotaoLink, Campo, CampoTelefone, Icone } from '../ui';

type Aberto = null | { tipo: 'contato' | 'doc' | 'dado'; id: string | null };

const PALAVRAS_SENHA = /\b(senha|password|pin|cvv)\b/i;

export function Infos() {
  const { db } = useApp();
  const [aberto, setAberto] = useState<Aberto>(null);
  const fechar = () => setAberto(null);
  const contatos = [...db.contatos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))', gap: 'var(--space-4)', alignItems: 'start' }}>
      <section className="cn-card" aria-labelledby="inf-cont" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', padding: 'var(--space-5)' }}>
        <h2 className="title-medium" id="inf-cont" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><Icone nome="contacts" style={{ color: 'var(--primary)' }} />Contatos e telefones</h2>
        {!contatos.length && aberto?.tipo !== 'contato' && <p className="body-medium texto-apoio">Nenhum contato ainda. Adicione o marceneiro, a limpeza, a portaria…</p>}
        <ul className="app-lista">
          {contatos.map((x) => aberto?.tipo === 'contato' && aberto.id === x.id ? <li key={x.id}><FormContato atual={x} aoFechar={fechar} /></li> : (
            <li key={x.id}>
              <Avatar nome={x.nome} decorativo />
              <span className="app-lista__texto">
                <span className="title-small">{x.nome}</span>
                <span className="body-small texto-apoio">{x.papel || 'Contato'} · <span className="num">{x.fone}</span></span>
              </span>
              <span className="app-linha-botoes">
                <BotaoLink icone="call" href={telHref(x.fone)} aria-label={'Ligar para ' + x.nome} style={{ padding: '0 var(--space-4)' }}>Ligar</BotaoLink>
                {ehCelular(x.fone) && <BotaoLink icone="chat" href={whatsHref(x.fone)} target="_blank" rel="noopener noreferrer" aria-label={'Abrir o WhatsApp de ' + x.nome} style={{ padding: '0 var(--space-4)' }}>WhatsApp</BotaoLink>}
                <Botao variante="text" onClick={() => setAberto({ tipo: 'contato', id: x.id })} aria-label={'Editar ' + x.nome}>Editar</Botao>
              </span>
            </li>
          ))}
        </ul>
        {aberto?.tipo === 'contato' && !aberto.id ? <FormContato atual={null} aoFechar={fechar} />
          : !aberto && <div><Botao variante="text" icone="add" onClick={() => setAberto({ tipo: 'contato', id: null })}>Adicionar contato</Botao></div>}
      </section>

      <section className="cn-card" aria-labelledby="inf-docs" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', padding: 'var(--space-5)' }}>
        <h2 className="title-medium" id="inf-docs" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><Icone nome="folder_open" style={{ color: 'var(--primary)' }} />Documentos</h2>
        <p className="body-small texto-apoio">Só onde cada documento está: o link (Drive, e-mail) ou uma descrição. Não guarde arquivos nem senhas aqui.</p>
        {!db.documentos.length && aberto?.tipo !== 'doc' && <p className="body-medium texto-apoio">Nenhum documento ainda. Ex.: contrato, convenção do condomínio, manual do aquecedor.</p>}
        <ul className="app-lista">
          {db.documentos.map((x) => aberto?.tipo === 'doc' && aberto.id === x.id ? <li key={x.id}><FormDoc atual={x} aoFechar={fechar} /></li> : (
            <li key={x.id} style={{ flexWrap: 'nowrap' }}>
              <Icone nome="description" className="app-row__icone" />
              <span className="app-lista__texto">
                <span className="title-small">{x.nome}</span>
                {linkValido(x.onde)
                  ? <a className="body-small" href={x.onde} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)', minHeight: 'var(--size-touch)' }}>Abrir o documento<Icone nome="open_in_new" tamanho={16} /></a>
                  : <span className="body-small texto-apoio app-quebra">{x.onde || 'Sem descrição de onde está.'}</span>}
              </span>
              <Botao variante="text" onClick={() => setAberto({ tipo: 'doc', id: x.id })} aria-label={'Editar ' + x.nome}>Editar</Botao>
            </li>
          ))}
        </ul>
        {aberto?.tipo === 'doc' && !aberto.id ? <FormDoc atual={null} aoFechar={fechar} />
          : !aberto && <div><Botao variante="text" icone="add" onClick={() => setAberto({ tipo: 'doc', id: null })}>Adicionar documento</Botao></div>}
      </section>

      <section className="cn-card" aria-labelledby="inf-cond" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', padding: 'var(--space-5)' }}>
        <h2 className="title-medium" id="inf-cond" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><Icone nome="apartment" style={{ color: 'var(--primary)' }} />Dados do condomínio</h2>
        {!db.dados.length && aberto?.tipo !== 'dado' && <p className="body-medium texto-apoio">Nada anotado ainda. Ex.: endereço, telefone da portaria, horário para entregas.</p>}
        <dl style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', margin: 0 }}>
          {db.dados.map((x) => aberto?.tipo === 'dado' && aberto.id === x.id ? <FormDado key={x.id} atual={x} aoFechar={fechar} /> : (
            <div key={x.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', paddingBottom: 'var(--space-3)', borderBottom: '1px solid var(--outline-variant)' }}>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <dt className="label-medium texto-apoio">{x.rotulo}</dt>
                <dd className="body-large app-quebra" style={{ margin: 0 }}>
                  {digitos(x.valor).length >= 10 && digitos(x.valor).length <= 13 && /^[\d\s()+-]+$/.test(x.valor.trim())
                    ? <a className="num" href={telHref(x.valor)} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)', minHeight: 'var(--size-touch)' }}><Icone nome="call" tamanho={18} />{x.valor}</a> : x.valor}
                </dd>
              </div>
              <Botao variante="text" onClick={() => setAberto({ tipo: 'dado', id: x.id })} aria-label={'Editar ' + x.rotulo}>Editar</Botao>
            </div>
          ))}
        </dl>
        {aberto?.tipo === 'dado' && !aberto.id ? <FormDado atual={null} aoFechar={fechar} />
          : !aberto && <div><Botao variante="text" icone="add" onClick={() => setAberto({ tipo: 'dado', id: null })}>Adicionar informação</Botao></div>}
      </section>
    </div>
  );
}

function BotaoExcluir({ rotulo, aoExcluir }: { rotulo: string; aoExcluir: () => void }) {
  const { confirmar } = useApp();
  return <Botao variante="text" icone="delete" onClick={async () => { if (await confirmar({ icone: 'delete', titulo: 'Excluir “' + rotulo + '”?', texto: 'Some para todo mundo. Logo depois dá para desfazer.', acao: 'Excluir' })) aoExcluir(); }}>Excluir</Botao>;
}

function FormContato({ atual, aoFechar }: { atual: Contato | null; aoFechar: () => void }) {
  const { fazer } = useApp();
  const [nome, setNome] = useState(atual?.nome ?? '');
  const [papel, setPapel] = useState(atual?.papel ?? '');
  const [fone, setFone] = useState(atual ? mascaraTelefone(atual.fone) : '');
  const [erros, setErros] = useState<Record<string, string>>({});
  const salvar = () => {
    const e: Record<string, string> = {};
    if (!nome.trim()) e.nome = 'Escreva o nome da pessoa ou empresa.';
    if (digitos(fone).length < 10) e.fone = 'Digite o telefone com DDD, ex.: (54) 99999-0000.';
    if (Object.keys(e).length) { setErros(e); return; }
    const r: Contato = { id: atual?.id ?? novoId('ct'), nome: nome.trim(), papel: papel.trim(), fone: fone.trim() };
    fazer(() => salvarRegistro('contatos', r, atual ? 'Contato atualizado.' : 'Contato adicionado.'));
    aoFechar();
  };
  return (
    <div className="app-caixa" style={{ width: '100%' }}>
      <Campo rotulo="Nome da pessoa ou empresa" valor={nome} aoMudar={(v) => { setNome(v); setErros({}); }} exemplo="Ex.: Eletricista Marcos" erro={erros.nome} autoFocus />
      <Campo rotulo="O que faz" valor={papel} aoMudar={setPapel} exemplo="Ex.: Eletricista" />
      <CampoTelefone rotulo="Telefone com DDD" valor={fone} aoMudar={(v) => { setFone(v); setErros({}); }} erro={erros.fone} />
      <Acoes>
        {atual && <BotaoExcluir rotulo={atual.nome} aoExcluir={() => { fazer(() => removerRegistro('contatos', atual.id, 'Contato excluído.')); aoFechar(); }} />}
        <Botao variante="outlined" onClick={aoFechar}>Cancelar</Botao>
        <Botao onClick={salvar}>Salvar contato</Botao>
      </Acoes>
    </div>
  );
}

function FormDoc({ atual, aoFechar }: { atual: Documento | null; aoFechar: () => void }) {
  const { fazer } = useApp();
  const [nome, setNome] = useState(atual?.nome ?? '');
  const [onde, setOnde] = useState(atual?.onde ?? '');
  const [erros, setErros] = useState<Record<string, string>>({});
  const salvar = () => {
    const e: Record<string, string> = {};
    if (!nome.trim()) e.nome = 'Escreva o nome do documento, ex.: Contrato do 105.';
    if (PALAVRAS_SENHA.test(onde)) e.onde = 'Não guarde senhas aqui. Escreva só onde está, ex.: “No Drive do Nicolas”.';
    if (Object.keys(e).length) { setErros(e); return; }
    const r: Documento = { id: atual?.id ?? novoId('dc'), nome: nome.trim(), onde: normalizarLink(onde) };
    fazer(() => salvarRegistro('documentos', r, atual ? 'Documento atualizado.' : 'Documento adicionado.'));
    aoFechar();
  };
  return (
    <div className="app-caixa" style={{ width: '100%' }}>
      <Campo rotulo="Nome do documento" valor={nome} aoMudar={(v) => { setNome(v); setErros({}); }} exemplo="Ex.: Contrato do 105" erro={erros.nome} autoFocus />
      <Campo rotulo="Onde está (link ou descrição)" valor={onde} aoMudar={(v) => { setOnde(v); setErros({}); }} icone="link" exemplo="Ex.: https://drive.google.com/… ou “Pasta azul na gaveta”" erro={erros.onde} />
      <Acoes>
        {atual && <BotaoExcluir rotulo={atual.nome} aoExcluir={() => { fazer(() => removerRegistro('documentos', atual.id, 'Documento excluído.')); aoFechar(); }} />}
        <Botao variante="outlined" onClick={aoFechar}>Cancelar</Botao>
        <Botao onClick={salvar}>Salvar documento</Botao>
      </Acoes>
    </div>
  );
}

function FormDado({ atual, aoFechar }: { atual: Dado | null; aoFechar: () => void }) {
  const { fazer } = useApp();
  const [rotulo, setRotulo] = useState(atual?.rotulo ?? '');
  const [valor, setValor] = useState(atual?.valor ?? '');
  const [erros, setErros] = useState<Record<string, string>>({});
  const salvar = () => {
    const e: Record<string, string> = {};
    if (!rotulo.trim()) e.rotulo = 'Escreva o que é, ex.: Portaria.';
    if (!valor.trim()) e.valor = 'Escreva a informação, ex.: (54) 3282-4400.';
    if (PALAVRAS_SENHA.test(rotulo + ' ' + valor)) e.valor = 'Não guarde senhas aqui. Anote só onde encontrar.';
    if (Object.keys(e).length) { setErros(e); return; }
    const r: Dado = { id: atual?.id ?? novoId('dd'), rotulo: rotulo.trim(), valor: valor.trim() };
    fazer(() => salvarRegistro('dados', r, atual ? 'Informação atualizada.' : 'Informação adicionada.'));
    aoFechar();
  };
  return (
    <div className="app-caixa">
      <Campo rotulo="O que é" valor={rotulo} aoMudar={(v) => { setRotulo(v); setErros({}); }} exemplo="Ex.: Portaria" erro={erros.rotulo} autoFocus />
      <Campo rotulo="Informação" valor={valor} aoMudar={(v) => { setValor(v); setErros({}); }} exemplo="Ex.: (54) 3282-4400" erro={erros.valor} multilinha />
      <Aviso icone="lock">Não guarde senhas aqui. Anote só onde encontrar.</Aviso>
      <Acoes>
        {atual && <BotaoExcluir rotulo={atual.rotulo} aoExcluir={() => { fazer(() => removerRegistro('dados', atual.id, 'Informação excluída.')); aoFechar(); }} />}
        <Botao variante="outlined" onClick={aoFechar}>Cancelar</Botao>
        <Botao onClick={salvar}>Salvar informação</Botao>
      </Acoes>
    </div>
  );
}
