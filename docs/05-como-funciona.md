# Como o app funciona

## Pendências

Compra, serviço, tarefa e pagamento têm: título, tipo, apartamento (105, 306 ou Ambos), se é essencial (bandeira amarela; o resto não leva marca), responsáveis, "presencial" ou "dá para fazer de casa", links de sugestão (com o escolhido marcado) e observações.

| Tipo | Caminho do status |
|---|---|
| Compra | Pendente → Aguardando → Chegou |
| Serviço | Pendente → Agendado → Feito |
| Tarefa | Pendente → Feita (Aguardando com cadeado se depende de uma compra) |
| Pagamento | Pendente → Pago |
| Todos | **Atrasado** quando passa da data sem concluir |

O board abre filtrado no apê 306 (e no que é dos dois). "Limpar filtros" mostra tudo.

## Automações

- **Retirada na agência:** entrega na Agência que passou da data sem "Chegou" → cria "Retirar [item] na agência", presencial, para quem está em Canela. Quando a compra chega, a tarefa se conclui sozinha.
- **Tarefa quando chegar:** numa compra dá para criar a tarefa (ex.: quadro → "Pendurar o quadro"). Ela fica com cadeado ("Libera quando 'Quadro da sala' chegar") e libera sozinha.
- **Serviço feito e não pago** → cria a pendência de Pagamento com o vencimento informado.
- **Inventário:** falta = precisa − tem − a caminho. Se faltar, cria a pendência de compra. Compra registrada entra em "a caminho"; quando chega, passa para "tem".

As automações rodam no aparelho de quem estiver com o app aberto (não há servidor). Ex.: a tarefa de retirada aparece na primeira vez que alguém abrir o app depois da data. Os identificadores fixos evitam duplicar quando duas pessoas estão com o app aberto.

## Inventário

- **Não verificado (cinza):** item que ninguém conferiu no apê ainda. Fica só no inventário e não vira pendência. "Verificar" pergunta quantos tem: se faltar, cria a pendência de compra com a urgência do item; se tiver tudo, fica Completo. O filtro "Onde fica" (Cozinha, Banheiro…) ajuda a verificar cômodo por cômodo.
- **Itens juntos em "Todos":** com Apartamento em "Todos", o mesmo item (mesmo nome) dos dois apês vira um card só, com uma linha por apê ("4 de 6", "? de 6"). O status do card segue esta ordem: faltando em algum apê (soma) → nenhum verificado → "Falta verificar" (um verificado e outro não) → a caminho → completo. Tocar abre o detalhe junto: um bloco por apê com a própria ação (Verificar ou Registrar, que abrem ali mesmo), a pendência de compra daquele apê e "Ver detalhes do 105/306", que leva ao detalhe completo do item. Nos filtros 105 e 306 continua um card por apê.
- **Registrar:** no detalhe do item, **Registrar normal** só pede a quantidade (pode passar do que precisa) e soma direto em "tem". **Registrar compra** pede quem comprou, valor (à vista ou parcelado), link (se tiver), data de entrega e onde chega. Os dois atualizam junto a pendência de compra do item (se o item não tinha pendência, a compra cria uma). Cada registro vira um card (A caminho, Atrasado, Disponível) e "Em cada apê" mostra quanto tem do mesmo item no 105 e no 306.

## Histórico, desfazer e backup

- **Histórico:** cada pendência guarda só as mudanças de status, com data, hora e quem fez (ou "sozinha", pelo sistema). Edições de texto não entram.
- **Desfazer:** toda ação mostra um aviso com "Desfazer" por 6 segundos. Excluir sempre pede confirmação antes.
- **Backup:** Configurações → Backup → "Baixar backup" e "Restaurar backup" ([Backup dos dados](04-backup.md)).

## Infos

Contatos (tocar para ligar ou abrir o WhatsApp), onde estão os documentos (link ou descrição) e dados do condomínio. O app não guarda senhas nem arquivos.

## Login e acesso

- Com o Firebase ligado, a tela de entrada mostra **"Entrar com Google"**. Só entra quem está na lista de pessoas (Configurações → Pessoas).
- A primeira conta que entrar vira a dona e a primeira pessoa da lista. Depois disso ninguém mais consegue "se autoconvidar".
- E-mail fora da lista vê a tela "Seu e-mail não está na lista", com o botão para entrar com outra conta.
- Sem Firebase, o app abre em modo de teste ("Testar sem login") e guarda os dados só no navegador.
