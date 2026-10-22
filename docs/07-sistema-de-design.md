# Sistema de design

O visual segue o sistema de design **Canela** (arquivo HTML de referência): os tokens estão em `styles/tema.css` (modo claro e noturno) e os componentes em `styles/componentes.css` + `components/ui/`. As peças próprias do app ficam em `styles/app.css` (classes `app-*`).

## O que foi adaptado (e por quê)

1. **Detalhe no computador em painel lateral** (o protótipo usava a página inteira): o board continua visível atrás. O painel usa a mesma superfície, sombra e raio da folha inferior. No celular o detalhe abre em tela cheia, como no protótipo.
2. **Rodapé de ações do detalhe preso embaixo** enquanto rola: o botão principal ("Já comprei", "Marcar que chegou"…) fica sempre à vista e o histórico continua no fim.
3. **"Criar pendência" fixo no celular**, logo abaixo da barra superior da tela Pendências, para ficar sempre visível. No PC ele fica no menu lateral.
4. **Telas de entrada** (Entrar com Google, primeiro acesso, e-mail fora da lista, sem internet): não existiam no HTML; montadas com card, campo, chips e botões do sistema. A tela de login avisa, com um cadeado, que só entra quem está na lista.
5. **"Quem está usando agora" virou o login**, e a tela "Responsáveis" foi para Configurações → Pessoas (nome, e-mail e onde está).
6. **Configurações no topo** (engrenagem), com o tema em três opções (Automático, Claro, Noturno) no controle segmentado. O botão rápido claro/noturno do protótipo continua na barra.
7. **Inventário com card limpo** (nome, situação e barra): tocar abre o detalhe do item, igual ao das pendências (painel lateral no PC, tela cheia no celular), com "Registrar" preso embaixo. "A caminho" não se mexe à mão, porque vem das compras registradas.
8. **Legenda da barra** com o texto da especificação ("3 tem · 4 a caminho · 5 faltam" e "3 de 12").
9. **Status com o nome de cada tipo** (Agendado, Chegou, Feito, Feita, Pago), como pede a especificação, nas mesmas cores do protótipo.
10. **Filtros do board em menus suspensos** (o protótipo usava chips): cabem numa linha só no computador e o filtro ligado fica destacado. Inclui o filtro "Situação". O inventário usa os mesmos menus (Apartamento, Situação e Onde fica).
11. **Comprovante como link** (o protótipo anexava arquivo): o app não guarda documentos.
12. **Valor da parcela editável**: calculado sozinho, mas pode mudar se teve juros.
13. **Calendário**: o card "Próximos compromissos" virou a lista da semana do dia escolhido; no celular o nome do mês fica numa linha e os botões em outra.
14. **Arte do estado vazio**: o HTML define as classes da ilustração, mas não trazia o desenho; foi feito um SVG simples com essas classes.
15. **Sem senhas**: o exemplo de "senha do Wi-Fi" saiu e os campos de Infos avisam se alguém tentar escrever uma senha.
16. **WhatsApp** com o ícone "chat" (o Material Symbols não tem o logo) e só para celulares.
17. **Área segura do iPhone** na navegação inferior.
18. A fonte "Google Sans" continua no token como no HTML, mas o Google Fonts não a oferece; o texto cai para Roboto, igual ao HTML.
19. Abaixo de 960 px de largura o app usa o layout de celular (navegação inferior e abas).
20. **Componentes mais compactos no computador** (a partir de 960 px): botões, campos, chips e menu lateral ficam mais baixos, porque ali se usa mouse. Os textos não mudam e o celular continua com os tamanhos de toque.
21. **Nova pendência em janela (pop-up)** por cima da tela atual, em vez de uma página: primeiro a lista do que adicionar (Compra, Tarefa, Serviço, Pagamento), depois as perguntas, uma por vez. No celular a janela sobe de baixo, como a folha, e o botão Voltar fecha. Ao criar, continua na mesma tela.
22. **Inventário em "Todos" com itens juntos**: aprovado num protótipo antes de entrar no app. O card ganha uma linha por apê (etiqueta, barra e total) e o detalhe junto usa um bloco por apê (`app-bloco`), com o formulário de Verificar ou Registrar aberto dentro do bloco (`app-caixa`).
23. **Status "Não verificado" em cinza** (`cn-status--nao-verificado`): usa os tons neutros do tema, com a barra toda cinza e o total "? de 6".
