/* Configurações: pessoas e e-mails (quem pode entrar), data de abertura, tema e backup. */
import { useRef, useState } from 'react';
import { useApp } from '../../app/contexto';
import type { PrefTema } from '../../app/tema';
import { adicionarPessoa, editarPessoa, exportarBackup, importarBackup, mudarAbertura, removerPessoa } from '../../lib/acoes';
import { br, deBR, hojeIso } from '../../lib/datas';
import { emailValido, primeiroNome } from '../../lib/formatos';
import type { OndePessoa, Pessoa } from '../../types';
import { Acoes, Aviso, Avatar, Botao, Campo, CampoData, Escolha, Icone, Segmentado } from '../ui';

export function Configuracoes() {
  const { db, eu, email, modo, tema, sair, confirmar, fazer } = useApp();
  const [editando, setEditando] = useState<string | 'nova' | null>(null);

  const remover = async (p: Pessoa) => {
    const n = primeiroNome(p.nome);
    if (await confirmar({ icone: 'person_remove', titulo: 'Remover ' + n + ' da lista?', texto: n + ' deixa de entrar no app e de ser responsável pelas pendências. As pendências continuam no board.', acao: 'Remover' }))
      fazer((c) => removerPessoa(c, p.id));
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {modo === 'local' && (
          <Aviso icone="science" titulo="Modo de teste">Os dados ficam só neste navegador e ninguém mais vê. Para compartilhar em tempo real, configure o Firebase (veja o README do projeto).</Aviso>
        )}

        <section className="cn-card" aria-labelledby="cf-pessoas" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', padding: 'var(--space-5)' }}>
          <h2 className="title-medium" id="cf-pessoas" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><Icone nome="group" style={{ color: 'var(--primary)' }} />Pessoas da montagem</h2>
          <p className="body-small texto-apoio">Só entra no app quem está nesta lista, com o e-mail da conta Google.</p>
          <ul className="app-lista">
            {db.pessoas.map((p) => editando === p.id ? <li key={p.id}><FormPessoa atual={p} aoFechar={() => setEditando(null)} /></li> : (
              <li key={p.id}>
                <Avatar nome={p.nome} tamanho={36} decorativo />
                <span className="app-lista__texto">
                  <span className="title-small">{p.nome}{p.id === eu.id ? ' (você)' : ''}</span>
                  <span className="body-small texto-apoio">{p.email || 'Sem e-mail'} · {p.local === 'canela' ? 'Em Canela' : 'Em outra cidade'}</span>
                </span>
                <span className="app-linha-botoes">
                  <Botao variante="text" onClick={() => setEditando(p.id)} aria-label={'Editar ' + p.nome}>Editar</Botao>
                  {p.id !== eu.id && <Botao variante="text" onClick={() => remover(p)} aria-label={'Remover ' + p.nome}>Remover</Botao>}
                </span>
              </li>
            ))}
          </ul>
          {editando === 'nova' ? <FormPessoa atual={null} aoFechar={() => setEditando(null)} />
            : <div style={{ paddingTop: 'var(--space-2)' }}><Botao variante="outlined" icone="person_add" onClick={() => setEditando('nova')}>Adicionar pessoa</Botao></div>}
          <p className="body-small texto-apoio" style={{ paddingTop: 'var(--space-2)' }}>Quem está “Em Canela” recebe sozinho as tarefas de retirada na agência.</p>
        </section>

        <SecaoAbertura />

        <section className="cn-card" aria-labelledby="cf-tema" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', padding: 'var(--space-5)' }}>
          <h2 className="title-medium" id="cf-tema" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><Icone nome="contrast" style={{ color: 'var(--primary)' }} />Tema</h2>
          <Segmentado<PrefTema> rotulo="Como o app aparece neste aparelho?" valor={tema.pref} aoMudar={tema.definir}
            opcoes={[{ valor: 'auto', rotulo: 'Automático', icone: 'brightness_auto' }, { valor: 'claro', rotulo: 'Claro', icone: 'light_mode' }, { valor: 'noturno', rotulo: 'Noturno', icone: 'dark_mode' }]} />
          <p className="body-small texto-apoio">Automático segue o modo claro ou noturno do aparelho.</p>
        </section>

        <SecaoBackup />

        <section className="cn-card" aria-labelledby="cf-conta" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', padding: 'var(--space-5)' }}>
          <h2 className="title-medium" id="cf-conta" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><Icone nome="account_circle" style={{ color: 'var(--primary)' }} />Sua conta</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Avatar nome={eu.nome} tamanho={36} decorativo />
            <span className="app-lista__texto"><span className="title-small">{eu.nome}</span><span className="body-small texto-apoio">{modo === 'local' ? 'Modo de teste, sem login' : email}</span></span>
          </div>
          <div><Botao variante="outlined" icone="logout" onClick={sair}>{modo === 'local' ? 'Sair do modo de teste' : 'Sair da conta'}</Botao></div>
        </section>
      </div>
    </div>
  );
}

function FormPessoa({ atual, aoFechar }: { atual: Pessoa | null; aoFechar: () => void }) {
  const { db, fazer } = useApp();
  const [nome, setNome] = useState(atual?.nome ?? '');
  const [mail, setMail] = useState(atual?.email ?? '');
  const [local, setLocal] = useState<OndePessoa>(atual?.local ?? 'fora');
  const [erros, setErros] = useState<Record<string, string>>({});
  const salvar = () => {
    const e: Record<string, string> = {};
    const m = mail.trim().toLowerCase();
    if (nome.trim().length < 2) e.nome = 'Escreva o nome e o sobrenome, ex.: Ana Pereira.';
    if (!emailValido(m)) e.email = 'Digite o e-mail da conta Google, ex.: ana@gmail.com.';
    else if (db.pessoas.some((p) => p.email === m && p.id !== atual?.id)) e.email = 'Esse e-mail já está na lista.';
    if (Object.keys(e).length) { setErros(e); return; }
    if (atual) fazer((c) => editarPessoa(c, atual.id, { nome, email: m, local }));
    else fazer((c) => adicionarPessoa(c, { nome, email: m, local }));
    aoFechar();
  };
  return (
    <div className="app-caixa" style={{ width: '100%' }}>
      <h3 className="title-small">{atual ? 'Editar ' + primeiroNome(atual.nome) : 'Adicionar pessoa'}</h3>
      <Campo rotulo="Nome e sobrenome" valor={nome} aoMudar={(v) => { setNome(v); setErros({}); }} icone="person" exemplo="Ex.: Ana Pereira" erro={erros.nome} autoFocus />
      <Campo rotulo="E-mail da conta Google" valor={mail} aoMudar={(v) => { setMail(v); setErros({}); }} icone="mail" tipo="email" inputMode="email" autoComplete="off" exemplo="Ex.: ana@gmail.com"
        erro={erros.email} ajuda="A pessoa entra no app com esta conta." />
      <Escolha rotulo="Onde a pessoa está?" valor={local} aoMudar={setLocal} opcoes={[{ valor: 'canela', rotulo: 'Está em Canela' }, { valor: 'fora', rotulo: 'Está em outra cidade' }]} />
      <Acoes>
        <Botao variante="outlined" onClick={aoFechar}>Cancelar</Botao>
        <Botao icone={atual ? 'check' : 'person_add'} onClick={salvar}>{atual ? 'Salvar' : 'Adicionar pessoa'}</Botao>
      </Acoes>
    </div>
  );
}

function SecaoAbertura() {
  const { db, fazer } = useApp();
  const [texto, setTexto] = useState(br(db.config.abertura));
  const [erro, setErro] = useState('');
  const salvar = () => {
    const x = deBR(texto);
    if (!x) { setErro('Essa data não existe. Use DD/MM/AAAA, ex.: 15/11/2026.'); return; }
    fazer((c) => mudarAbertura(c, x));
  };
  return (
    <section className="cn-card" aria-labelledby="cf-abertura" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', padding: 'var(--space-5)' }}>
      <h2 className="title-medium" id="cf-abertura" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><Icone nome="celebration" style={{ color: 'var(--primary)' }} />Data de abertura</h2>
      <CampoData rotulo="Quando os apês abrem para hóspedes?" valor={texto} aoMudar={(v) => { setTexto(v); setErro(''); }} erro={erro} exemplo="Ex.: 15/11/2026" aoEnter={salvar}
        ajuda={db.config.abertura ? 'Hoje está marcada para ' + br(db.config.abertura) + '.' : 'Ainda sem data.'} />
      <Acoes inicio><Botao icone="check" onClick={salvar}>Salvar data</Botao></Acoes>
    </section>
  );
}

function SecaoBackup() {
  const { db, fazer, confirmar, avisar, ctx } = useApp();
  const ref = useRef<HTMLInputElement>(null);
  const baixar = () => {
    const blob = new Blob([exportarBackup(db)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'canela-pendencias-backup-' + hojeIso() + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    avisar('Backup baixado.');
  };
  const escolher = async (arq: File | undefined) => {
    if (ref.current) ref.current.value = '';
    if (!arq) return;
    const texto = await arq.text();
    const teste = importarBackup(ctx(), texto);
    if ('erro' in teste) { avisar(teste.erro); return; }
    const ok = await confirmar({ icone: 'settings_backup_restore', titulo: 'Restaurar este backup?', texto: 'Todos os dados atuais serão trocados pelos do arquivo “' + arq.name + '”, para todo mundo. Logo depois dá para desfazer.', acao: 'Restaurar' });
    if (!ok) return;
    const r = fazer((c) => {
      const x = importarBackup(c, texto);
      return 'erro' in x ? { ops: [], msg: x.erro, erro: x.erro } : x;
    });
    if ('erro' in r && r.erro) avisar(r.erro as string);
  };
  return (
    <section className="cn-card" aria-labelledby="cf-backup" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', padding: 'var(--space-5)' }}>
      <h2 className="title-medium" id="cf-backup" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><Icone nome="backup" style={{ color: 'var(--primary)' }} />Backup</h2>
      <p className="body-medium texto-apoio">Baixe um arquivo com tudo (pendências, inventário, pessoas e infos). Guarde no Drive. Para voltar tudo como estava, restaure o arquivo.</p>
      <div className="app-linha-botoes">
        <Botao variante="outlined" icone="download" onClick={baixar}>Baixar backup</Botao>
        <span>
          <input ref={ref} type="file" accept="application/json,.json" className="app-arquivo" id="cf-arquivo" onChange={(e) => escolher(e.target.files?.[0])} />
          <label htmlFor="cf-arquivo" className="cn-btn cn-btn--text"><Icone nome="upload" />Restaurar backup</label>
        </span>
      </div>
    </section>
  );
}
