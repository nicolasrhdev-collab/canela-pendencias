# Firebase e Google AI Studio

O login com Google e os dados compartilhados em tempo real vêm do **Firebase** (Authentication + Cloud Firestore). O app já tem todo o código pronto: falta só ligar um projeto Firebase a ele. Dá para fazer pelo **Google AI Studio** (caminho A) ou à mão no **Console do Firebase** (caminho B).

Enquanto `firebaseConfig.ts` estiver vazio, o app abre em modo de teste. Assim que estiver preenchido, a tela de entrada mostra **"Entrar com Google"**, e só entra quem está na lista de pessoas.

## Caminho A: Google AI Studio

### 1. Importar o projeto

1. Suba o projeto no GitHub ([Enviar para o GitHub](02-enviar-para-o-github.md)).
2. No [Google AI Studio](https://aistudio.google.com), abra o **Build**, toque no **+** (Add files) da caixa de mensagem e escolha **Import from GitHub**. Escolha o repositório `canela-pendencias`.

### 2. Ligar o Firebase sem reescrever o app

O agente do AI Studio, quando liga o Firebase, costuma criar o próprio arquivo de conexão (`/src/lib/firebase.ts`) e regras novas que deixam cada pessoa ver só os próprios dados. **Este app funciona diferente**: todo mundo da lista vê os mesmos dados. Por isso, cole esta mensagem para o agente:

```text
Este app já tem o código do Firebase pronto. Conecte o Cloud Firestore e o Authentication
(login com Google) sem reescrever o app:

1. Preencha o arquivo firebaseConfig.ts com a configuração do projeto Firebase
   (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId) e coloque em
   firestoreDatabaseId o ID do banco Firestore que você criar.
2. Não crie outro arquivo de conexão com o Firebase e não mude services/firebase.ts,
   services/banco.ts, App.tsx nem o resto do código.
3. Use as regras do arquivo firestore.rules exatamente como estão no repositório. Elas deixam
   entrar só quem está na lista de pessoas (coleção "acesso"); todos da lista veem os mesmos dados.
4. Ative o login com Google.
```

### 3. Conferir

- `firebaseConfig.ts` ficou preenchido, com o `firestoreDatabaseId` (o AI Studio cria o banco com o nome do app, e não o banco padrão).
- `firestore.rules` continua igual ao do repositório. Se o agente trocou, peça para voltar ao original.
- No [Console do Firebase](https://console.firebase.google.com), em Authentication → Método de login, o **Google** está ativado.
- Em Authentication → Configurações → **Domínios autorizados**, está o endereço onde o app abre (o da pré-visualização do AI Studio e o do app publicado).

### 4. Primeiro acesso e dados

1. Abra o app e entre com a **sua** conta Google antes de mandar o link para os outros. A primeira conta que entra vira a dona e a primeira pessoa da lista.
2. Traga os dados do modo de teste: Configurações → Backup → **Restaurar backup** e escolha o arquivo mais novo da pasta `backups/` ([Backup dos dados](04-backup.md)). A pessoa do modo de teste vira você sozinha, e o histórico continua no seu nome.
3. Adicione as pessoas: Configurações → Pessoas da montagem → "Adicionar pessoa" (nome, e-mail da conta Google e onde está). Quem está "Em Canela" recebe sozinho as tarefas de "Retirar … na agência".

### 5. Publicar

No AI Studio: **Share → Publish** (vai para o Cloud Run, no mesmo projeto Firebase). Depois, adicione o endereço publicado em **Domínios autorizados**.

### Limites do AI Studio

O banco criado pelo AI Studio fica numa cota gratuita compartilhada: cerca de **50 mil leituras e 40 mil gravações por dia** e 1 GiB guardado. Para o painel, sobra bastante. Se passar, o banco pausa até a meia-noite do horário do Pacífico (umas 5h em Brasília). Para tirar o limite, use **Upgrade database** no Console do Firebase.

### Problemas comuns

- **"Missing or insufficient permissions"** ou tela "O Firebase recusou o acesso": as regras não são as do `firestore.rules`. Peça ao agente para usar o arquivo do repositório.
- **A janela do Google não abre na pré-visualização:** abra o app numa aba nova (alguns navegadores bloqueiam o login dentro de quadros).
- **"Este endereço não está autorizado no Firebase":** falta o domínio em Domínios autorizados.

## Caminho B: Console do Firebase (à mão)

Faça uma vez só, no [Console do Firebase](https://console.firebase.google.com):

1. **Criar o projeto** → "Adicionar projeto" (o Google Analytics pode ficar desligado).
2. **App da Web** → na página do projeto, clique no ícone `</>`, dê um nome (ex.: Canela) e copie o bloco `firebaseConfig`.
3. Cole os valores em **`firebaseConfig.ts`** (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId). Deixe `firestoreDatabaseId` vazio para usar o banco padrão. Esses dados não são senha; quem protege os dados são as regras do passo 6.
4. **Login com Google** → Authentication → Começar → Método de login → **Google** → Ativar → Salvar.
5. **Banco** → Firestore Database → Criar banco de dados → escolha um local (ex.: `southamerica-east1`, São Paulo) → modo de produção.
6. **Regras** → Firestore Database → aba **Regras** → apague o que estiver lá, cole todo o conteúdo do arquivo **`firestore.rules`** e clique em **Publicar**.
7. **Domínios autorizados** → Authentication → Configurações → Domínios autorizados → adicione o endereço onde o app vai ficar. `localhost` já vem autorizado.
8. Siga o passo **4. Primeiro acesso e dados** do caminho A.

### Publicar no Firebase Hosting

O `firebase.json` já está configurado:

```bash
npm install -g firebase-tools
firebase login
firebase use --add
npm run build
firebase deploy
```

`firebase deploy` também publica as regras do `firestore.rules`.

## Formato do projeto para o AI Studio

O projeto segue o formato dos apps do AI Studio: `index.html` com mapa de importação (`importmap`, para rodar sem instalar pacotes), `index.tsx`, `App.tsx` e `metadata.json`. As versões do mapa de importação (React 19.3.1 e Firebase 12.19.0) são as mesmas do `package.json`. Se trocar uma, troque a outra. Com o Vite (`npm run dev`), o mapa não é usado.

## Fontes

- [Add Cloud Firestore and Authentication to your Google AI Studio app (Firebase)](https://firebase.google.com/docs/ai-assistance/ai-studio-integration)
- [Build apps in Google AI Studio](https://ai.google.dev/gemini-api/docs/aistudio-build-mode)
