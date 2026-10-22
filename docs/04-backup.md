# Backup dos dados

O backup é um arquivo `.json` com tudo do painel: pendências, inventário, pessoas, contatos, documentos, dados do condomínio e a data de abertura.

## Por que fazer

No modo de teste os dados moram só no navegador. Se o navegador for limpo, eles somem. Foi o que aconteceu em 22/10/2026: o navegador da pré-visualização foi zerado, e os dados voltaram inteiros pelo arquivo de backup. Com o Firebase ligado, os dados ficam na nuvem, mas um backup de vez em quando continua sendo uma boa ideia.

## Baixar

Configurações (engrenagem no topo) → Backup → **Baixar backup**. O arquivo se chama `canela-pendencias-backup-AAAA-MM-DD.json`.

## Onde guardar

- Na pasta **`backups/`** do projeto. Ela **não vai para o GitHub** (está no `.gitignore` e fora da pasta pronta de envio), porque tem os dados dos apês.
- E uma cópia fora do computador (Google Drive, e-mail para você mesmo), para não depender de um aparelho só.

## Restaurar

Configurações → Backup → **Restaurar backup** → escolha o arquivo. O app pede confirmação, troca **todos** os dados pelos do arquivo e mostra "Desfazer" por alguns segundos.

Quem está restaurando continua na lista de pessoas, mesmo que não esteja no arquivo.

## Levar os dados do modo de teste para o Firebase

1. Ligue o Firebase e faça o primeiro acesso com a sua conta Google ([Firebase e Google AI Studio](03-firebase-e-ai-studio.md)).
2. Restaure o backup mais novo da pasta `backups/`.

A pessoa do modo de teste (`voce@modo-de-teste`) vira você sozinha: passa a ter o seu e-mail e o nome do seu primeiro acesso, com o mesmo identificador. Por isso o histórico, as verificações e as compras continuam no seu nome.

## Formato do arquivo

```json
{
  "app": "canela-pendencias",
  "versao": 1,
  "exportadoEm": "2026-10-22T12:00:00.000Z",
  "dados": {
    "pendencias": [],
    "itens": [],
    "pessoas": [],
    "contatos": [],
    "documentos": [],
    "dados": [],
    "config": { "abertura": null }
  }
}
```

O modelo de cada parte está em `types.ts`, o mesmo do Firestore.
