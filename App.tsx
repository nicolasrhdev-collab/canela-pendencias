/* Canela · Pendências — entrada do app: login, quem pode entrar e o banco em tempo real. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppProvider } from './app/contexto';
import { useMedia, useTema } from './app/tema';
import { Shell } from './components/Shell';
import { Carregando, TelaEntrar, TelaErro, TelaPrimeiroAcesso, TelaSemAcesso } from './components/telas/Entrada';
import { acessoDe, EMAIL_TESTE } from './lib/acoes';
import { agoraIso } from './lib/datas';
import { novoId } from './lib/formatos';
import { criarPrimeiroAcesso, lerLocal, storeFirestore, storeLocal, verificarAcesso, type Store } from './services/banco';
import { entrarComGoogle, firebaseConfigurado, ouvirLogin, sairDoGoogle } from './services/firebase';
import type { Banco, OndePessoa, Pessoa } from './types';

type Usuario = { email: string; nome: string };
type Fase =
  | { f: 'carregando' }
  | { f: 'fora'; erro?: string }
  | { f: 'primeiro'; u: Usuario }
  | { f: 'negado'; u: Usuario }
  | { f: 'erro'; u: Usuario; texto: string }
  | { f: 'dentro'; u: Usuario };

const TESTE_ATIVO = 'canela-teste-ativo';

function mensagemErro(e: unknown) {
  const code = (e as { code?: string })?.code || '';
  if (code === 'unavailable' || code === 'auth/network-request-failed') return 'Parece que está sem internet. Confira a conexão e tente de novo.';
  if (code === 'permission-denied') return 'O Firebase recusou o acesso. Confira se as regras do Firestore (arquivo firestore.rules) foram publicadas.';
  if (code === 'auth/unauthorized-domain') return 'Este endereço não está autorizado no Firebase. Adicione o domínio em Authentication → Configurações → Domínios autorizados.';
  return 'Algo deu errado ao abrir. Tente de novo em instantes.';
}

export default function App() {
  const tema = useTema();
  const celular = !useMedia('(min-width: 960px)');
  const [fase, setFase] = useState<Fase>({ f: 'carregando' });
  const [verificacao, setVerificacao] = useState(0);
  const store = useMemo<Store | null>(() => (fase.f === 'dentro' ? (firebaseConfigurado ? storeFirestore() : storeLocal()) : null), [fase.f]);
  const [db, setDb] = useState<Banco | null>(null);

  /* Login: Firebase (Google) ou modo de teste */
  useEffect(() => {
    if (!firebaseConfigurado) {
      try {
        if (localStorage.getItem(TESTE_ATIVO) === '1') {
          const u = { email: EMAIL_TESTE, nome: '' };
          setFase(lerLocal().pessoas.length ? { f: 'dentro', u } : { f: 'primeiro', u });
        } else setFase({ f: 'fora' });
      } catch { setFase({ f: 'fora' }); }
      return;
    }
    return ouvirLogin(async (user) => {
      if (!user || !user.email) { setFase({ f: 'fora' }); return; }
      const u = { email: user.email.toLowerCase(), nome: user.displayName || '' };
      try {
        const a = await verificarAcesso(u.email);
        setFase(a === 'permitido' ? { f: 'dentro', u } : a === 'sem-dono' ? { f: 'primeiro', u } : { f: 'negado', u });
      } catch (e) {
        console.error(e);
        setFase({ f: 'erro', u, texto: mensagemErro(e) });
      }
    });
  }, [verificacao]);

  /* Banco em tempo real enquanto está dentro */
  useEffect(() => {
    if (!store) { setDb(null); return; }
    return store.ouvir(setDb, (e) => {
      console.error(e);
      const code = (e as { code?: string })?.code;
      if (fase.f === 'dentro') setFase(code === 'permission-denied' ? { f: 'negado', u: fase.u } : { f: 'erro', u: fase.u, texto: mensagemErro(e) });
    });
  }, [store]); // eslint-disable-line react-hooks/exhaustive-deps

  const sair = useCallback(() => {
    if (firebaseConfigurado) sairDoGoogle();
    else { try { localStorage.removeItem(TESTE_ATIVO); } catch { /* */ } setFase({ f: 'fora' }); }
  }, []);

  const entrar = async () => {
    try { await entrarComGoogle(); } catch (e) { console.error(e); setFase({ f: 'fora', erro: mensagemErro(e) }); }
  };
  const testar = () => {
    try { localStorage.setItem(TESTE_ATIVO, '1'); } catch { /* */ }
    const u = { email: EMAIL_TESTE, nome: '' };
    setFase(lerLocal().pessoas.length ? { f: 'dentro', u } : { f: 'primeiro', u });
  };
  const primeiroAcesso = async (u: Usuario, nome: string, local: OndePessoa) => {
    const p: Pessoa = { id: novoId('p'), nome, email: u.email, local };
    const ops = [
      { col: 'pessoas' as const, id: p.id, data: p },
      { col: 'acesso' as const, id: p.email, data: acessoDe(p) },
      { col: 'config' as const, id: 'geral', data: { abertura: null, criadoEm: agoraIso() } },
    ];
    if (firebaseConfigurado) await criarPrimeiroAcesso(u.email, ops);
    else await storeLocal().gravar(ops);
    setFase({ f: 'dentro', u });
  };

  switch (fase.f) {
    case 'carregando': return <Carregando />;
    case 'fora': return <TelaEntrar configurado={firebaseConfigurado} erro={fase.erro} aoEntrar={entrar} aoTestar={testar} />;
    case 'primeiro': return <TelaPrimeiroAcesso nomeSugerido={fase.u.nome} email={firebaseConfigurado ? fase.u.email : ''} aoConfirmar={(n, l) => primeiroAcesso(fase.u, n, l)} aoSair={sair} />;
    case 'negado': return <TelaSemAcesso email={fase.u.email} aoSair={sair} />;
    case 'erro': return <TelaErro texto={fase.texto} aoTentar={() => { setFase({ f: 'carregando' }); setVerificacao((v) => v + 1); }} aoSair={sair} />;
    default:
      if (!db || !store) return <Carregando texto="Carregando as pendências…" />;
      return (
        <AppProvider store={store} db={db} email={fase.u.email} celular={celular} tema={tema} sair={sair}>
          <Shell />
        </AppProvider>
      );
  }
}
