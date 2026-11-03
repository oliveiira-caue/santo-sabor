// Santo Sabor — backend completo (Node.js, sem dependências externas).
// Serve o cardápio em public/ e recebe pedidos em POST /api/orders,
// salvando o pedido em data/orders.json e enviando para o Telegram
// do bot Santo Sabor Pedidos (@santosaborpedidos_bot).
//
// O token do bot NUNCA fica no código: ele vem apenas da variável de
// ambiente TELEGRAM_BOT_TOKEN. Sem ele, o pedido é salvo com
// telegramStatus "failed" e o frontend mostra a opção de tentar de novo.
// Nenhum token é registrado em log.
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Carrega o arquivo .env, se existir, para que `node server.js` funcione
// sem precisar passar --env-file. O Node sozinho não lê .env.
(function loadEnv() {
  try {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  } catch (e) {
    console.error('Não foi possível ler o .env:', e.message);
  }
})();

const PORT = Number(process.env.PORT || 3000);
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '8958239249';
const DATA_FILE = path.join(__dirname, 'data', 'orders.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

const PRICE_CENTS = 1500; // R$ 15,00 por sanduíche

const MENU = [
  { id: 'atum', name: 'Atum', priceCents: PRICE_CENTS, image: 'atum.jpg', description: 'Atum, alface, tomate e maionese leve.' },
  { id: 'camarao', name: 'Camarão', priceCents: PRICE_CENTS, image: 'camarao.jpg', description: 'Camarão, alface, tomate e molho leve.' },
  { id: 'dueto', name: 'Dueto', priceCents: PRICE_CENTS, image: 'dueto.jpg', description: 'Dois sabores em um só sanduíche, à escolha da casa.' },
  { id: 'frango', name: 'Frango', priceCents: PRICE_CENTS, image: 'frango.jpg', description: 'Frango desfiado, alface, tomate e requeijão.' },
  { id: 'queijo-presunto', name: 'Queijo e Presunto', priceCents: PRICE_CENTS, image: 'queijo-presunto.jpg', description: 'Queijo, presunto, alface e tomate.' },
  { id: 'ricota', name: 'Ricota', priceCents: PRICE_CENTS, image: 'ricota.jpg', description: 'Ricota temperada, alface e tomate.' },
  { id: 'ricota-tomate-seco', name: 'Ricota e Tomate Seco', priceCents: PRICE_CENTS, image: 'ricota-tomate-seco.jpg', description: 'Ricota, tomate seco e folhas verdes.' },
  { id: 'ricota-peito-peru', name: 'Ricota e Peito de Peru', priceCents: PRICE_CENTS, image: 'ricota-peito-peru.jpg', description: 'Ricota, peito de peru, alface e tomate.' },
  { id: 'salame', name: 'Salame', priceCents: PRICE_CENTS, image: 'salame.jpg', description: 'Salame, queijo, alface e tomate.' },
  { id: 'tomate-seco', name: 'Tomate Seco', priceCents: PRICE_CENTS, image: 'tomate-seco.jpg', description: 'Tomate seco, ricota e folhas verdes.' },
];

function brl(cents) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function loadOrders() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

function saveOrders(orders) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(orders, null, 2) + '\n', 'utf8');
}

function updateOrder(id, patch) {
  const orders = loadOrders();
  const i = orders.findIndex((o) => o.id === id);
  if (i === -1) return null;
  orders[i] = { ...orders[i], ...patch };
  saveOrders(orders);
  return orders[i];
}

function telegramText(order) {
  const lines = [];
  lines.push('🧾 Novo pedido — Santo Sabor');
  lines.push('');
  for (const item of order.items) {
    lines.push(`• ${item.quantity}x ${item.name} — ${brl(item.quantity * item.priceCents)}`);
  }
  lines.push('');
  lines.push(`Total: ${brl(order.totalCents)}`);
  lines.push(`Cliente: ${order.customerName}`);
  lines.push(order.delivery === 'entrega' ? 'Entrega: motoboy' : 'Retirada: na loja');
  if (order.delivery === 'entrega') lines.push(`Endereço: ${order.address}`);
  lines.push(order.payment === 'pix' ? 'Pagamento: PIX' : 'Pagamento: Dinheiro físico');
  if (order.payment === 'dinheiro' && order.changeForCents) {
    lines.push(`Troco para: ${brl(order.changeForCents)} (troco: ${brl(order.changeForCents - order.totalCents)})`);
  }
  if (order.notes) lines.push(`Observações: ${order.notes}`);
  lines.push('');
  lines.push(`Pedido #${order.id.slice(0, 8)} · ${order.createdAt}`);
  return lines.join('\n');
}

async function sendTelegram(order) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { ok: false, error: 'TELEGRAM_BOT_TOKEN não configurado' };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: telegramText(order) }),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.description || `Telegram respondeu HTTP ${res.status}` };
    }
    return { ok: true, messageId: data.result && data.result.message_id };
  } catch (e) {
    return { ok: false, error: e.name === 'AbortError' ? 'Tempo esgotado ao falar com o Telegram' : String(e.message || e) };
  } finally {
    clearTimeout(timer);
  }
}

function validateOrder(body) {
  if (!body || typeof body !== 'object') return 'Pedido inválido.';
  if (!Array.isArray(body.items) || body.items.length === 0) return 'Escolha ao menos um sanduíche.';
  let total = 0;
  const items = [];
  for (const raw of body.items) {
    const flavor = MENU.find((m) => m.id === raw.id);
    if (!flavor) return `Sabor inválido: ${String(raw.id)}`;
    const qty = Number(raw.quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) return `Quantidade inválida para ${flavor.name}.`;
    total += qty * flavor.priceCents;
    items.push({ id: flavor.id, name: flavor.name, quantity: qty, priceCents: flavor.priceCents });
  }
  if (body.totalCents !== undefined && Number(body.totalCents) !== total) {
    return 'O total enviado não confere com os itens.';
  }
  const customerName = String(body.customerName || '').trim();
  if (!customerName) return 'Informe o nome.';
  if (body.delivery !== 'entrega' && body.delivery !== 'retirada') return 'Escolha entrega ou retirada.';
  const address = String(body.address || '').trim();
  if (body.delivery === 'entrega' && !address) return 'Informe o endereço para entrega.';
  if (body.payment !== 'pix' && body.payment !== 'dinheiro') return 'Escolha a forma de pagamento.';
  let changeForCents = null;
  if (body.payment === 'dinheiro' && body.changeForCents !== null && body.changeForCents !== undefined && body.changeForCents !== '') {
    changeForCents = Number(body.changeForCents);
    if (!Number.isFinite(changeForCents) || changeForCents < total) {
      return 'O valor do troco não pode ser menor que o total do pedido.';
    }
  }
  return {
    items, totalCents: total, customerName,
    delivery: body.delivery, address: body.delivery === 'entrega' ? address : '',
    payment: body.payment, changeForCents,
    notes: String(body.notes || '').trim().slice(0, 300),
  };
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; if (raw.length > 200000) req.destroy(); });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(new Error('JSON inválido')); }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.ico': 'image/x-icon' };

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const file = path.normalize(path.join(PUBLIC_DIR, urlPath));
  if (!file.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Não encontrado'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'public, max-age=3600' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    if (req.method === 'GET' && url.pathname === '/api/menu') {
      return sendJson(res, 200, { menu: MENU });
    }
    if (req.method === 'GET' && url.pathname === '/api/health') {
      return sendJson(res, 200, { ok: true, telegramConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN) });
    }
    if (req.method === 'POST' && url.pathname === '/api/orders') {
      const body = await readJson(req).catch(() => null);
      if (body === null) return sendJson(res, 400, { error: 'JSON inválido.' });
      const valid = validateOrder(body);
      if (typeof valid === 'string') return sendJson(res, 400, { error: valid });
      const order = {
        id: crypto.randomUUID(), createdAt: new Date().toISOString(),
        ...valid, telegramStatus: 'pending', telegramMessageId: null, telegramError: null,
      };
      const orders = loadOrders();
      orders.push(order);
      saveOrders(orders);
      // Envio ao Telegram em segundo plano, sem travar a resposta por muito tempo.
      // Aqui aguardamos o envio com timeout curto para o frontend saber se deu certo.
      const result = await sendTelegram(order);
      const updated = updateOrder(order.id, result.ok
        ? { telegramStatus: 'sent', telegramMessageId: result.messageId || null }
        : { telegramStatus: 'failed', telegramError: result.error });
      return sendJson(res, 201, { order: updated });
    }
    if (req.method === 'POST' && /^\/api\/orders\/[^/]+\/retry$/.test(url.pathname)) {
      const id = url.pathname.split('/')[3];
      const orders = loadOrders();
      const order = orders.find((o) => o.id === id);
      if (!order) return sendJson(res, 404, { error: 'Pedido não encontrado.' });
      const result = await sendTelegram(order);
      const updated = updateOrder(id, result.ok
        ? { telegramStatus: 'sent', telegramMessageId: result.messageId || null, telegramError: null }
        : { telegramStatus: 'failed', telegramError: result.error });
      return sendJson(res, 200, { order: updated });
    }
    if (req.method === 'GET' && /^\/api\/orders\/[^/]+$/.test(url.pathname)) {
      const id = url.pathname.split('/')[3];
      const order = loadOrders().find((o) => o.id === id);
      if (!order) return sendJson(res, 404, { error: 'Pedido não encontrado.' });
      return sendJson(res, 200, { order });
    }
    if (req.method === 'GET' && url.pathname === '/api/orders') {
      return sendJson(res, 200, { orders: loadOrders().slice(-50).reverse() });
    }
    if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(req, res);
    res.writeHead(405); return res.end('Method not allowed');
  } catch (e) {
    console.error('Erro interno:', e.message);
    return sendJson(res, 500, { error: 'Erro interno do servidor.' });
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Erro: a porta ${PORT} já está em uso por outro processo.`);
    console.error(`Encerre o processo anterior ou defina outra porta via PORT=${PORT + 1}.`);
  } else {
    console.error('Erro no servidor:', err.message);
  }
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`Santo Sabor rodando em http://localhost:${PORT}`);
  console.log(`Telegram configurado: ${process.env.TELEGRAM_BOT_TOKEN ? 'sim' : 'não (defina TELEGRAM_BOT_TOKEN)'}`);
});
