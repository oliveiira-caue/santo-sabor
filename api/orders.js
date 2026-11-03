const crypto = require('crypto');
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '8958239249';
const MENU = [
  { id: 'atum', name: 'Atum', priceCents: 1500 },
  { id: 'camarao', name: 'Camarão', priceCents: 1500 },
  { id: 'dueto', name: 'Dueto', priceCents: 1500 },
  { id: 'frango', name: 'Frango', priceCents: 1500 },
  { id: 'queijo-presunto', name: 'Queijo e Presunto', priceCents: 1500 },
  { id: 'ricota', name: 'Ricota', priceCents: 1500 },
  { id: 'ricota-tomate-seco', name: 'Ricota e Tomate Seco', priceCents: 1500 },
  { id: 'ricota-peito-peru', name: 'Ricota e Peito de Peru', priceCents: 1500 },
  { id: 'salame', name: 'Salame', priceCents: 1500 },
  { id: 'tomate-seco', name: 'Tomate Seco', priceCents: 1500 }
];
function brl(cents) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
async function sendTelegram(order) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, error: 'TELEGRAM_BOT_TOKEN não configurado' };
  const lines = ['Novo pedido - Santo Sabor', ''];
  for (const item of order.items) {
    lines.push(item.quantity + 'x ' + item.name + ' - ' + brl(item.quantity * item.priceCents));
  }
  lines.push('');
  lines.push('Total: ' + brl(order.totalCents));
  lines.push('Cliente: ' + order.customerName);
  lines.push(order.delivery === 'entrega' ? 'Entrega: motoboy' : 'Retirada: na loja');
  if (order.delivery === 'entrega') lines.push('Endereço: ' + order.address);
  lines.push(order.payment === 'pix' ? 'Pagamento: PIX' : 'Pagamento: Dinheiro físico');
  if (order.payment === 'dinheiro' && order.changeForCents) {
    lines.push('Troco para: ' + brl(order.changeForCents) + ' (troco: ' + brl(order.changeForCents - order.totalCents) + ')');
  }
  if (order.notes) lines.push('Observações: ' + order.notes);
  try {
    const res = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: lines.join('\n') })
    });
    const data = await res.json().catch(function () { return {}; });
    if (!res.ok || !data.ok) return { ok: false, error: data.description || ('Telegram respondeu HTTP ' + res.status) };
    return { ok: true, messageId: data.result && data.result.message_id };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
}
module.exports = async function (req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const body = req.body || {};
  if (!Array.isArray(body.items) || body.items.length === 0) return res.status(400).json({ error: 'Escolha ao menos um sanduíche.' });
  let total = 0;
  const items = [];
  for (const raw of body.items) {
    const flavor = MENU.find(function (m) { return m.id === raw.id; });
    if (!flavor) return res.status(400).json({ error: 'Sabor inválido: ' + String(raw.id) });
    const qty = Number(raw.quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) return res.status(400).json({ error: 'Quantidade inválida para ' + flavor.name + '.' });
    total += qty * flavor.priceCents;
    items.push({ id: flavor.id, name: flavor.name, quantity: qty, priceCents: flavor.priceCents });
  }
  if (body.totalCents !== undefined && Number(body.totalCents) !== total) return res.status(400).json({ error: 'O total enviado não confere com os itens.' });
  const customerName = String(body.customerName || '').trim();
  if (!customerName) return res.status(400).json({ error: 'Informe o nome.' });
  if (body.delivery !== 'entrega' && body.delivery !== 'retirada') return res.status(400).json({ error: 'Escolha entrega ou retirada.' });
  const address = String(body.address || '').trim();
  if (body.delivery === 'entrega' && !address) return res.status(400).json({ error: 'Informe o endereço para entrega.' });
  if (body.payment !== 'pix' && body.payment !== 'dinheiro') return res.status(400).json({ error: 'Escolha a forma de pagamento.' });
  let changeForCents = null;
  if (body.payment === 'dinheiro' && body.changeForCents !== null && body.changeForCents !== undefined && body.changeForCents !== '') {
    changeForCents = Number(body.changeForCents);
    if (!Number.isFinite(changeForCents) || changeForCents < total) return res.status(400).json({ error: 'O valor do troco não pode ser menor que o total do pedido.' });
  }
  const order = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    items: items,
    totalCents: total,
    customerName: customerName,
    delivery: body.delivery,
    address: body.delivery === 'entrega' ? address : '',
    payment: body.payment,
    changeForCents: changeForCents,
    notes: String(body.notes || '').trim().slice(0, 300),
    telegramStatus: 'pending',
    telegramMessageId: null,
    telegramError: null
  };
  const result = await sendTelegram(order);
  order.telegramStatus = result.ok ? 'sent' : 'failed';
  order.telegramMessageId = result.ok ? result.messageId : null;
  order.telegramError = result.ok ? null : result.error;
  return res.status(201).json({ order: order });
};
