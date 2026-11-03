// Santo Sabor - recebe o pedido e manda pro Telegram, na Vercel.
// O token vem só da variável TELEGRAM_BOT_TOKEN, nunca fica no código.
const crypto = require('crypto');
const { MENU, PRICE_CENTS } = require('./menu');

const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '8958239249';

function brl(cents) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function telegramText(order) {
  const lines = [];
  lines.push('Novo pedido - Santo Sabor');
  lines.push('');
  for (const item of order.items) {
    lines.push(`${item.quantity}x ${item.name} - ${brl(item.quantity * item.priceCents)}`);
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
  lines.push(`Pedido #${order.id.slice(0, 8)}`);
  return lines.join('\n');
}

async function sendTelegram(order) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, error: 'TELEGRAM_BOT_TOKEN não configurado' };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: telegramText(order) }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) return { ok: false, error: data.description || `Telegram respondeu HTTP ${res.status}` };
    return { ok: true, messageId: data.result && data.result.message_id };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
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
  if (body.totalCents !== undefined && Number(body.totalCents) !== total) return 'O total enviado não confere com os itens.';
  const customerName = String(body.customerName || '').trim();
  if (!customerName) return 'Informe o nome.';
  if (body.delivery !== 'entrega' && body.delivery !== 'retirada') return 'Escolha entrega ou retirada.';
  const address = String(body.address || '').trim();
  if (body.delivery === 'entrega' && !address) return 'Informe o endereço para entrega.';
  if (body.payment !== 'pix' && body.payment !== 'dinheiro') return 'Escolha a forma de pagamento.';
  let changeForCents = null;
  if (body.payment === 'dinheiro' && body.changeForCents !== null && body.changeForCents !== undefined && body.changeForCents !== '') {
    changeForCents = Number(body.changeForCents);
    if (!Number.isFinite(changeForCents) || changeForCents < total) return 'O valor do troco não pode ser menor que o total do pedido.';
  }
  return {
    items, totalCents: total, customerName,
    delivery: body.delivery, address: body.delivery === 'entrega' ? address : '',
    payment: body.payment, changeForCents,
    notes: String(body.notes || '').trim().slice(0, 300),
  };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const valid = validateOrder(req.body);
  if (typeof valid === 'string') return res.status(400).json({ error: valid });
  const order = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...valid, telegramStatus: 'pending', telegramMessageId: null, telegramError: null };
  const result = await sendTelegram(order);
  order.telegramStatus = result.ok ? 'sent' : 'failed';
  order.telegramMessageId = result.ok ? result.messageId : null;
  order.telegramError = result.ok ? null : result.error;
  return res.status(201).json({ order });
};
