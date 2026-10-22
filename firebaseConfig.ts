/*
 * Configuração do Firebase (Cloud Firestore + login com Google).
 *
 * Cole aqui os dados do seu app da Web, em:
 * Console do Firebase → Configurações do projeto (engrenagem) → Seus apps → SDK setup and configuration → Config.
 *
 * Esses dados não são senha: podem ficar no código. Quem protege os dados são as regras do Firestore
 * (arquivo firestore.rules), que só deixam entrar quem está na lista de pessoas.
 *
 * Enquanto apiKey e projectId estiverem vazios, o app abre em "modo de teste":
 * funciona sem login e guarda os dados só neste navegador.
 *
 * firestoreDatabaseId: deixe vazio para o banco padrão. O Google AI Studio cria um banco com nome próprio
 * (o ID do app): nesse caso, cole aqui esse nome (o "firestoreDatabaseId" da configuração que ele gera).
 */
export const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
  firestoreDatabaseId: '',
};
