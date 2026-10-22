# Onde está cada coisa

```
index.html, index.tsx, App.tsx    entrada do app, login e acesso
firebaseConfig.ts                 dados do seu projeto Firebase (vazio = modo de teste)
firestore.rules                   regras: só quem está na lista entra
firebase.json                     publicação no Firebase Hosting e regras
metadata.json                     nome e descrição do app (Google AI Studio)
styles/tema.css                   tokens do sistema Canela (claro e noturno)
styles/componentes.css            componentes cn-* do sistema de design
styles/app.css                    peças do app (app-*) e estrutura das telas
components/ui/                    componentes React do sistema de design
components/telas/                 Início, Pendências, Detalhe, Nova, Inventário (detalhe do item e detalhe junto),
                                  Calendário, Infos, Configurações, Entrada (login)
components/Shell.tsx              menu lateral (PC), navegação inferior (celular), topo
app/                              contexto (desfazer, avisos, automações), rotas e tema
lib/                              regras de status, ações, datas e formatos (R$, DD/MM/AAAA)
services/                         Firebase/Firestore e modo de teste
types.ts                          modelo de dados (igual no Firestore e no backup)
docs/                             estes guias
backups/                          backups dos dados (fica fora do GitHub)
```

## Coleções no Firestore

`pendencias`, `itens`, `pessoas`, `contatos`, `documentos`, `dados`, `config/geral` (data de abertura), `config/dono` (quem fez o primeiro acesso) e `acesso/{e-mail}` (lista de quem pode entrar, mantida pelo app junto com Pessoas).

## Endereços (rotas)

| Endereço | Tela |
|---|---|
| `#/inicio` | Início |
| `#/pendencias?p=<id>` | Board com o detalhe de uma pendência aberto |
| `#/inventario?p=<id>` | Inventário com o detalhe de um item |
| `#/inventario?p=todos:<id>` | Inventário com o detalhe junto (o item nos dois apês) |
| `#/calendario`, `#/infos`, `#/config` | Calendário, Informações e Configurações |
| `?nova=1` | Janela "Nova pendência" por cima da tela |
