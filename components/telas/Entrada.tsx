/* Telas antes de entrar: login com Google, primeiro acesso, e-mail fora da lista, sem internet e carregando. */
import { useState, type ReactNode } from 'react';
import type { OndePessoa } from '../../types';
import { Aviso, Botao, Campo, Escolha, Icone } from '../ui';

function Marca() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
      <Icone nome="cottage" tamanho={24} style={{ color: 'var(--primary)' }} />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span className="title-medium">Canela · Pendências</span>
        <span className="body-small texto-apoio">Apês 105 e 306</span>
      </div>
    </div>
  );
}

function Moldura({ children }: { children: ReactNode }) {
  return <main className="app-entrada"><section className="cn-card">{children}</section></main>;
}

export function Carregando({ texto = 'Abrindo…' }: { texto?: string }) {
  return <div className="app-carregando" role="status"><Icone nome="progress_activity" tamanho={24} /><span className="body-medium">{texto}</span></div>;
}

export function TelaEntrar({ aoEntrar, aoTestar, configurado, erro }: { aoEntrar: () => void; aoTestar: () => void; configurado: boolean; erro?: string }) {
  const [indo, setIndo] = useState(false);
  return (
    <Moldura>
      <Marca />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <h1 className="headline-small">Montagem dos apês</h1>
        <p className="body-medium texto-apoio">Compras, tarefas, serviços e pagamentos dos apartamentos 105 e 306, em um lugar só e atualizado para todo mundo.</p>
      </div>
      {configurado ? (
        <>
          {erro && <Aviso icone="error" papel="alert">{erro}</Aviso>}
          <Botao icone="login" larguraTotal disabled={indo} onClick={async () => { setIndo(true); try { await aoEntrar(); } finally { setIndo(false); } }}>Entrar com Google</Botao>
          <p className="body-small texto-apoio" style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
            <Icone nome="lock" tamanho={16} />
            <span>Só entra quem está na lista da montagem. Se o seu e-mail ainda não estiver, peça para alguém adicionar em Configurações → Pessoas.</span>
          </p>
        </>
      ) : (
        <>
          <Aviso icone="science" titulo="O Firebase ainda não foi configurado">Dá para testar o app neste aparelho. Os dados ficam só neste navegador até o Firebase ser ligado (veja o README).</Aviso>
          <Botao icone="play_arrow" larguraTotal onClick={aoTestar}>Testar sem login</Botao>
        </>
      )}
    </Moldura>
  );
}

export function TelaPrimeiroAcesso({ nomeSugerido, email, aoConfirmar, aoSair }: { nomeSugerido: string; email: string; aoConfirmar: (nome: string, local: OndePessoa) => Promise<void>; aoSair: () => void }) {
  const [nome, setNome] = useState(nomeSugerido);
  const [local, setLocal] = useState<OndePessoa | null>(null);
  const [erro, setErro] = useState('');
  const [indo, setIndo] = useState(false);
  const comecar = async () => {
    if (nome.trim().length < 2) { setErro('Escreva seu nome e sobrenome, ex.: Ana Pereira.'); return; }
    if (!local) { setErro('Responda onde você está.'); return; }
    setIndo(true);
    try { await aoConfirmar(nome.trim(), local); } catch { setErro('Não deu para salvar. Confira a internet e tente de novo.'); setIndo(false); }
  };
  return (
    <Moldura>
      <Marca />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <h1 className="headline-small">Primeiro acesso</h1>
        <p className="body-medium texto-apoio">Você é a primeira pessoa a entrar. Confira seu nome; depois você adiciona as outras pessoas em Configurações.</p>
        {email && <p className="body-small texto-apoio">Conta: {email}</p>}
      </div>
      <Campo rotulo="Seu nome e sobrenome" valor={nome} aoMudar={(v) => { setNome(v); setErro(''); }} icone="person" exemplo="Ex.: Ana Pereira" />
      <Escolha rotulo="Onde você está?" valor={local} aoMudar={(v) => { setLocal(v); setErro(''); }} erro={erro}
        opcoes={[{ valor: 'canela', rotulo: 'Estou em Canela' }, { valor: 'fora', rotulo: 'Estou em outra cidade' }]} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <Botao icone="check" larguraTotal disabled={indo} onClick={comecar}>Começar a usar</Botao>
        <Botao variante="text" larguraTotal onClick={aoSair}>Voltar</Botao>
      </div>
    </Moldura>
  );
}

export function TelaSemAcesso({ email, aoSair }: { email: string; aoSair: () => void }) {
  return (
    <Moldura>
      <Marca />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <h1 className="headline-small">Seu e-mail não está na lista</h1>
        <p className="body-medium texto-apoio">A conta <strong>{email}</strong> ainda não pode entrar. Peça para alguém da montagem abrir Configurações → Pessoas e adicionar este e-mail.</p>
      </div>
      <Botao variante="outlined" icone="switch_account" larguraTotal onClick={aoSair}>Entrar com outra conta</Botao>
    </Moldura>
  );
}

export function TelaErro({ texto, aoTentar, aoSair }: { texto: string; aoTentar: () => void; aoSair: () => void }) {
  return (
    <Moldura>
      <Marca />
      <Aviso icone="wifi_off" titulo="Não deu para abrir" papel="alert">{texto}</Aviso>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <Botao icone="refresh" larguraTotal onClick={aoTentar}>Tentar de novo</Botao>
        <Botao variante="text" larguraTotal onClick={aoSair}>Sair</Botao>
      </div>
    </Moldura>
  );
}
