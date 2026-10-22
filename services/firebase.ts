/* Firebase: app, login com Google e Firestore com cache no aparelho (funciona com internet fraca). */
import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut, getRedirectResult,
  type Auth, type User,
} from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from '../firebaseConfig';

export const firebaseConfigurado = !!firebaseConfig.apiKey && !!firebaseConfig.projectId;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let fs: Firestore | null = null;

export function firebase() {
  if (!app) {
    const { firestoreDatabaseId, ...opcoes } = firebaseConfig;
    /* Banco com nome (o do Google AI Studio) ou o padrão, quando o nome está vazio. */
    const banco = firestoreDatabaseId || '(default)';
    app = initializeApp(opcoes);
    auth = getAuth(app);
    auth.languageCode = 'pt';
    try {
      fs = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }), ignoreUndefinedProperties: true }, banco);
    } catch {
      fs = initializeFirestore(app, { ignoreUndefinedProperties: true }, banco);
    }
  }
  return { app: app!, auth: auth!, fs: fs! };
}

export function ouvirLogin(cb: (u: User | null) => void) {
  const { auth } = firebase();
  getRedirectResult(auth).catch(() => undefined);
  return onAuthStateChanged(auth, cb);
}

/** Abre a janela do Google; se o navegador bloquear a janela, vai pela página inteira. */
export async function entrarComGoogle() {
  const { auth } = firebase();
  const provedor = new GoogleAuthProvider();
  provedor.setCustomParameters({ prompt: 'select_account' });
  try {
    await signInWithPopup(auth, provedor);
  } catch (e) {
    const code = (e as { code?: string }).code || '';
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') await signInWithRedirect(auth, provedor);
    else if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') throw e;
  }
}

export function sairDoGoogle() { return signOut(firebase().auth); }
