# Canela · Pendências

Painel simples para organizar a montagem dos apartamentos de temporada **105** e **306** em Canela: compras, tarefas, serviços e pagamentos, inventário (com o que já foi verificado em cada apê), calendário e informações importantes. Tudo em português, pensado primeiro para o celular.

- **Login com Google** e dados compartilhados em tempo real pelo **Firebase (Cloud Firestore)**. Só entra quem está na lista de pessoas.
- Sem Firebase, abre em **modo de teste**: os dados ficam só naquele navegador.
- O app não usa IA nem a API do Gemini.

## Começar rápido

Precisa do [Node.js](https://nodejs.org) 20 ou mais novo.

```bash
npm install
npm run dev
```

Abre em http://localhost:3000.

## Documentação

| Guia | Para quê |
|---|---|
| [Rodar no computador](docs/01-rodar-no-computador.md) | Instalar, abrir, modo de teste e os comandos do projeto |
| [Enviar para o GitHub](docs/02-enviar-para-o-github.md) | Subir o projeto pelo site (sem instalar nada) ou com Git, e o que fica de fora |
| [Firebase e Google AI Studio](docs/03-firebase-e-ai-studio.md) | Ligar o login com Google e os dados compartilhados, pelo AI Studio ou à mão |
| [Backup dos dados](docs/04-backup.md) | Baixar, guardar, restaurar e levar os dados do modo de teste para o Firebase |
| [Como o app funciona](docs/05-como-funciona.md) | Status, automações, inventário, verificação, itens juntos e acesso |
| [Onde está cada coisa](docs/06-estrutura-do-codigo.md) | Pastas, arquivos, coleções do Firestore e endereços |
| [Sistema de design](docs/07-sistema-de-design.md) | O que foi adaptado do design Canela e por quê |

## Caminho para colocar no ar

1. [Enviar para o GitHub](docs/02-enviar-para-o-github.md) (repositório privado, sem a pasta `backups/`).
2. Importar no Google AI Studio e ligar o Firebase com a mensagem pronta de [Firebase e Google AI Studio](docs/03-firebase-e-ai-studio.md).
3. Entrar com a sua conta Google (vira a dona) e restaurar o backup mais novo ([Backup dos dados](docs/04-backup.md)).
4. Adicionar as pessoas em Configurações → Pessoas e mandar o link.
