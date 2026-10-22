# Rodar no computador

Precisa do [Node.js](https://nodejs.org) 20 ou mais novo.

```bash
npm install
npm run dev
```

Abre em http://localhost:3000.

## Modo de teste

Enquanto o Firebase não estiver configurado (`firebaseConfig.ts` vazio), o app abre em **modo de teste**: toque em "Testar sem login". Os dados ficam só naquele navegador.

> **Cuidado:** no modo de teste os dados moram no `localStorage` do navegador. Se o navegador for limpo, eles somem. Baixe um backup sempre que mexer em muita coisa (veja [Backup dos dados](04-backup.md)). Com o Firebase ligado, os dados ficam na nuvem e esse risco acaba.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Abre o app em http://localhost:3000 e recarrega sozinho a cada mudança |
| `npm run build` | Confere os tipos e gera a pasta `dist/` para publicar |
| `npm run preview` | Abre a versão de `dist/` para conferir antes de publicar |
| `npm run typecheck` | Só confere os tipos (TypeScript) |

## Pela pré-visualização do Claude

O arquivo `.claude/launch.json` tem a configuração `canela-dev`, que roda o mesmo `vite` na porta 3000 dentro do app do Claude.
