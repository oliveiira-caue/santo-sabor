# Santo Sabor — Cardápio Digital Completo

Cardápio digital completo da Santo Sabor, exatamente como foi construído
no Muse, pronto para hospedar de forma independente. Não é uma versão
cortada: tem todos os 10 sabores, pagamento, entrega, confirmação na
tela e envio automático do pedido para o Telegram.

## O que o cardápio faz

- 10 sabores, todos por R$ 15,00: Atum, Camarão, Dueto, Frango,
  Queijo e Presunto, Ricota, Ricota e Tomate Seco, Ricota e Peito de
  Peru, Salame e Tomate Seco. Cada um com foto e quantidade com
  botões − / + de 44×44px, com o total calculado na hora.
- Nome do cliente, entrega por motoboy (com endereço) ou retirada
  na loja.
- Pagamento obrigatório: PIX ou Dinheiro físico. Se for dinheiro,
  aparece o campo opcional “Troco para quanto?”, com o troco
  calculado na tela. O troco não pode ser menor que o total.
- Um único botão “Enviar pedido”. O pedido é enviado em segundo
  plano para o servidor, sem abrir Telegram, WhatsApp ou outro
  aplicativo. Na mesma página aparece “Seu pedido foi enviado”,
  com o resumo do pedido e o botão “Fazer novo pedido”.
- Se o envio falhar, a página mostra o erro e oferece “Tentar de
  novo” e “Copiar resumo do pedido”, sem redirecionar.
- O servidor salva o pedido em `data/orders.json` e envia a
  mensagem para o Telegram do bot Santo Sabor Pedidos
  (@santosaborpedidos_bot), no chat 8958239249.
- Layout mobile-first (testado a 390px e 360px): uma coluna,
  sem rolagem horizontal, fonte base de 16px, barra fixa embaixo
  com o total e o botão “Enviar pedido”, área segura para celular
  com notch, e zoom com os dedos permitido (não usamos
  `user-scalable=no`).

## Como funciona

1. O cliente abre o link, escolhe os sabores e a quantidade.
2. Preenche o nome, escolhe entrega ou retirada e o pagamento.
3. Aperta “Enviar pedido”.
4. O servidor (`server.js`) recebe o pedido em `POST /api/orders`,
   valida tudo (itens, total, endereço, pagamento e troco),
   salva em `data/orders.json` e chama a API do Telegram
   (`https://api.telegram.org/bot<token>/sendMessage`)
   para entregar a mensagem no chat da loja.
5. Você recebe no Telegram, na hora, sem o cliente precisar
   abrir outro aplicativo.

## Rodar no seu computador

Pré-requisito: Node.js 18 ou mais novo. Não precisa instalar
nada com npm, o projeto não tem dependências externas.

```bash
cd santo-sabor-completo
cp .env.example .env
# edite o arquivo .env e cole o token do bot
node server.js
```

Abra `http://localhost:3000` no navegador ou no celular.

Sem o token, o site abre normalmente e o pedido é salvo, mas
o envio ao Telegram falha com uma mensagem clara e a opção de
tentar de novo. Isso é de propósito: o pedido nunca se perde
em silêncio.

## O token do Telegram (importante)

O token do bot vem **somente** da variável de ambiente
`TELEGRAM_BOT_TOKEN`. Nunca coloque o token no código, no
README, em nenhum arquivo do projeto, em log ou em mensagem
de chat.

Como conseguir o token:

1. No Telegram, procure `@BotFather`, toque em Start e envie
   `/newbot`.
2. Dê um nome (ex.: Santo Sabor Pedidos) e um usuário
   terminado em `bot` (ex.: `santosaborpedidos_bot`).
3. O BotFather devolve o token. Guarde-o como senha.
4. Abra o bot criado e toque em Start.

O chat que recebe os pedidos é o `TELEGRAM_CHAT_ID`, que já
vem como `8958239249` no `.env.example`. Se for outra pessoa
que vai receber, troque esse número pelo chat id dela
(conseguido com o `@userinfobot` no Telegram).

## Hospedar no Render (recomendado)

O Render tem plano gratuito e roda o frontend e o backend
juntos, exatamente como no seu computador.

1. Crie uma conta no Render e suba este projeto para um
   repositório no GitHub (ou use o deploy pelo arquivo ZIP).
2. No Render, clique em New → Web Service e escolha o
   repositório.
3. Runtime: `Node`. Build Command: deixe em branco
   (não há build). Start Command: `node server.js`.
4. Em Environment, adicione:
   - `TELEGRAM_BOT_TOKEN` = o token do bot
   - `TELEGRAM_CHAT_ID` = `8958239249`
   - `PORT` = deixe o Render definir (ele injeta a porta)
5. Clique em Deploy. O Render devolve um link, por exemplo
   `https://santo-sabor.onrender.com`. É esse link que você
   compartilha com os clientes.
6. Faça um pedido de teste e confira se chegou no Telegram.

Observação do plano gratuito do Render: o serviço pode
“dormir” depois de um tempo sem uso e demorar alguns segundos
para acordar no primeiro pedido do dia. Isso é normal no
plano gratuito. No plano pago ele fica sempre acordado.

## Hospedar na Vercel

A Vercel é ótima para sites estáticos, mas este projeto tem
um servidor Node que precisa ficar rodando. Há duas formas:

**Opção A — recomendada: Render para tudo.**
Use o passo anterior. É a forma mais simples e é a que
recomendamos.

**Opção B — Vercel + backend separado.**
1. Hospede o backend (`server.js`) no Render, como acima,
   e anote o endereço dele.
2. Na Vercel, importe o projeto como site estático da pasta
   `public/`. Neste caso o frontend precisa apontar para o
   backend do Render: edite `public/app.js` e troque os
   `fetch('/api/...')` por `fetch('https://SEU-BACKEND.onrender.com/api/...')`.
3. O arquivo `vercel.json` incluído neste projeto tenta rodar
   o `server.js` como função Node na Vercel, mas o suporte
   a servidor contínuo na Vercel é limitado; por isso a
   Opção A é a recomendada para este cardápio.

## Estrutura do projeto

```
santo-sabor-completo/
  server.js            Backend Node.js (sem dependências)
  package.json         Scripts (npm start = node server.js)
  vercel.json          Configuração opcional para a Vercel
  .env.example         Modelo das variáveis de ambiente
  .gitignore
  README.md
  data/
    orders.json        Pedidos salvos (criado na primeira venda)
  public/
    index.html         Página do cardápio
    styles.css         Estilo mobile-first
    app.js             Lógica do pedido, total, troco e envio
    assets/
      santo-sabor-mark.png   Asas verdes + auréola, fundo removido
      santo-sabor-logo.png   Logo completa, fundo removido
      atum.jpg, camarao.jpg, dueto.jpg, frango.jpg,
      queijo-presunto.jpg, ricota.jpg, ricota-tomate-seco.jpg,
      ricota-peito-peru.jpg, salame.jpg, tomate-seco.jpg
```

## Endpoints da API

- `GET /api/menu` — lista os 10 sabores e o preço.
- `GET /api/health` — diz se o Telegram está configurado.
- `POST /api/orders` — cria um pedido. Corpo em JSON:
  `{ items: [{id, quantity}], totalCents, customerName,
  delivery: "entrega" | "retirada", address, payment: "pix" | "dinheiro",
  changeForCents, notes }`. Responde `201` com o pedido e
  `telegramStatus` (`sent`, `failed` ou `pending`).
- `POST /api/orders/:id/retry` — tenta de novo o envio ao Telegram.
- `GET /api/orders/:id` e `GET /api/orders` — consulta pedidos salvos.

## Fotos

- 6 fotos de sanduíches: Unsplash (licença gratuita),
  `images.unsplash.com`, fotos de sanduíche natural.
  Atum, Frango, Queijo e Presunto, Ricota, Dueto e Tomate Seco.
- 4 fotos geradas para este projeto, no mesmo estilo de
  fotografia de comida: Camarão, Salame, Ricota e Tomate Seco
  e Ricota e Peito de Peru.
- Logo: imagem original da loja, enviada pelo dono. O fundo
  bege foi removido e o símbolo (asas + auréola) foi recortado
  para usar ao lado do nome no cabeçalho. A logo completa
  também está em `public/assets/santo-sabor-logo.png`.

## Trocar preços, sabores ou o número do Telegram

- Preço: troque `PRICE_CENTS` em `server.js` e o texto
  “R$ 15,00” em `public/index.html` e `public/app.js`.
- Sabores: edite a lista `MENU` em `server.js` e em
  `public/app.js`, e coloque a foto em `public/assets/`.
- Quem recebe no Telegram: troque `TELEGRAM_CHAT_ID` no
  arquivo `.env` (no Render, nas variáveis de ambiente).

## Licença

MIT. A logo Santo Sabor pertence à loja.
