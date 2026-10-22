# Enviar para o GitHub

O Google AI Studio importa projetos **pelo GitHub**. Então o caminho é: subir o projeto num repositório e depois importar esse repositório no AI Studio (veja [Firebase e Google AI Studio](03-firebase-e-ai-studio.md)).

## O que vai e o que não vai

| Vai para o GitHub | Fica fora |
|---|---|
| Código (`App.tsx`, `index.tsx`, `index.html`, `app/`, `components/`, `lib/`, `services/`, `styles/`, `types.ts`) | `node_modules/` (o AI Studio e o `npm install` baixam de novo) |
| Configuração (`package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `metadata.json`, `firebase.json`, `firestore.rules`, `firebaseConfig.ts`, `.gitignore`) | `dist/` (é gerada pelo `npm run build`) |
| Documentação (`README.md`, `docs/`) | `backups/`: **dados dos apês** (itens, pendências, nomes) |
| | `teste/` (arquivos de teste antigos) e `.claude/` (configuração local do Claude) |

> Crie o repositório como **privado**. O código não tem senha, mas não há motivo para deixá-lo público.

## Jeito 1: pelo site (sem instalar nada)

1. Abra https://github.com/new, dê o nome `canela-pendencias`, marque **Private** e clique em **Create repository**.
2. Na página do repositório vazio, clique em **uploading an existing file**.
3. Abra no Windows a pasta pronta **`C:\Users\nicol\Documents\Canela-para-GitHub`**. Ela já tem só o que deve subir, sem `backups/`, `node_modules/`, `dist/`, `teste/` e `.claude/`.
4. Selecione tudo o que está **dentro** dela (Ctrl+A) e arraste para a página do GitHub. As pastas vão junto.
5. Espere terminar de carregar e clique em **Commit changes**.

A pasta pronta é uma cópia do projeto do dia em que foi feita. Se o código mudar depois, peça para o Claude montar de novo, ou arraste da pasta do projeto pulando as pastas da coluna "Fica fora".

O site aceita até 100 arquivos por vez; o projeto tem cerca de 50.

## Jeito 2: com Git

Instale o Git (https://git-scm.com/download/win). Depois, na pasta do projeto:

```bash
git init
git add .
git commit -m "Canela · Pendências"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/canela-pendencias.git
git push -u origin main
```

O `.gitignore` já deixa de fora `node_modules/`, `dist/`, `backups/`, `teste/`, `.claude/` e arquivos `.env`.

## Depois de subir

Importe o repositório no Google AI Studio e ligue o Firebase: [Firebase e Google AI Studio](03-firebase-e-ai-studio.md).
