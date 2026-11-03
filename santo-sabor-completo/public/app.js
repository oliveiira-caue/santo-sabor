// Santo Sabor — frontend do cardápio.
// Envia o pedido com fetch para POST /api/orders, sem redirecionar
// para Telegram, WhatsApp ou qualquer outro aplicativo.
'use strict';

const PRICE_CENTS = 1500;

const MENU = [
  { id: 'atum', name: 'Atum', image: 'atum.jpg', description: 'Atum, alface, tomate e maionese leve.' },
  { id: 'camarao', name: 'Camarão', image: 'camarao.jpg', description: 'Camarão, alface, tomate e molho leve.' },
  { id: 'dueto', name: 'Dueto', image: 'dueto.jpg', description: 'Dois sabores em um só sanduíche, à escolha da casa.' },
  { id: 'frango', name: 'Frango', image: 'frango.jpg', description: 'Frango desfiado, alface, tomate e requeijão.' },
  { id: 'queijo-presunto', name: 'Queijo e Presunto', image: 'queijo-presunto.jpg', description: 'Queijo, presunto, alface e tomate.' },
  { id: 'ricota', name: 'Ricota', image: 'ricota.jpg', description: 'Ricota temperada, alface e tomate.' },
  { id: 'ricota-tomate-seco', name: 'Ricota e Tomate Seco', image: 'ricota-tomate-seco.jpg', description: 'Ricota, tomate seco e folhas verdes.' },
  { id: 'ricota-peito-peru', name: 'Ricota e Peito de Peru', image: 'ricota-peito-peru.jpg', description: 'Ricota, peito de peru, alface e tomate.' },
  { id: 'salame', name: 'Salame', image: 'salame.jpg', description: 'Salame, queijo, alface e tomate.' },
  { id: 'tomate-seco', name: 'Tomate Seco', image: 'tomate-seco.jpg', description: 'Tomate seco, ricota e folhas verdes.' },
];

const quantities = {};
MENU.forEach((f) => { quantities[f.id] = 0; });
let lastOrder = null;
let lastPayload = null;

const $ = (id) => document.getElementById(id);

function brl(cents) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function totalCents() {
  return MENU.reduce((sum, f) => sum + quantities[f.id] * PRICE_CENTS, 0);
}

function selectedItems() {
  return MENU.filter((f) => quantities[f.id] > 0)
    .map((f) => ({ id: f.id, name: f.name, quantity: quantities[f.id], priceCents: PRICE_CENTS }));
}

function renderMenu() {
  const el = $('menu');
  el.innerHTML = '';
  MENU.forEach((f) => {
    const card = document.createElement('article');
    card.className = 'flavor';
    card.innerHTML = `
      <img src="assets/${f.image}" alt="Sanduíche de ${f.name}" loading="lazy" width="104" height="104">
      <div class="flavor-info">
        <h3>${f.name}</h3>
        <p>${f.description}</p>
        <span class="price">R$ 15,00</span>
        <div class="stepper">
          <button type="button" data-minus="${f.id}" aria-label="Remover um ${f.name}">−</button>
          <output aria-label="Quantidade de ${f.name}">${quantities[f.id]}</output>
          <button type="button" data-plus="${f.id}" aria-label="Adicionar um ${f.name}">+</button>
        </div>
      </div>`;
    el.appendChild(card);
  });
  el.querySelectorAll('[data-plus]').forEach((b) => b.addEventListener('click', () => {
    quantities[b.dataset.plus] = Math.min(20, quantities[b.dataset.plus] + 1);
    renderMenu(); updateTotals();
  }));
  el.querySelectorAll('[data-minus]').forEach((b) => b.addEventListener('click', () => {
    quantities[b.dataset.minus] = Math.max(0, quantities[b.dataset.minus] - 1);
    renderMenu(); updateTotals();
  }));
}

function changeForCents() {
  const raw = $('changeFor').value.trim().replace(',', '.');
  if (!raw) return null;
  const v = Math.round(Number(raw) * 100);
  return Number.isFinite(v) ? v : null;
}

function updateTotals() {
  const total = totalCents();
  const items = selectedItems();
  $('total').textContent = brl(total);
  $('stickyTotal').textContent = brl(total);
  $('stickyText').textContent = items.length
    ? items.map((i) => `${i.quantity}x ${i.name}`).join(', ')
    : 'Nenhum sanduíche escolhido';
  $('submitBtn').disabled = total === 0;
  const summary = $('summary');
  if (!items.length) {
    summary.textContent = 'Nenhum sanduíche escolhido ainda.';
  } else {
    summary.innerHTML = items.map((i) => `<div>${i.quantity}x ${i.name} — ${brl(i.quantity * PRICE_CENTS)}</div>`).join('')
      + `<div>Pagamento: ${paymentLabel()}</div>`
      + (changeLine() ? `<div>${changeLine()}</div>` : '');
  }
  updateChange();
}

function paymentLabel() {
  const p = document.querySelector('input[name="payment"]:checked');
  if (!p) return 'não escolhido';
  return p.value === 'pix' ? 'PIX' : 'Dinheiro físico';
}

function changeLine() {
  const cf = changeForCents();
  if (paymentLabel() !== 'Dinheiro físico' || cf === null) return '';
  return `Troco para ${brl(cf)} (troco: ${brl(cf - totalCents())})`;
}

function updateChange() {
  const isMoney = paymentLabel() === 'Dinheiro físico';
  $('changeBox').hidden = !isMoney;
  const cf = changeForCents();
  const el = $('changeResult');
  if (!isMoney || cf === null) { el.textContent = ''; return; }
  if (cf < totalCents()) {
    el.textContent = `O valor do troco (${brl(cf)}) não pode ser menor que o total (${brl(totalCents())}).`;
  } else {
    el.textContent = `Troco: ${brl(cf - totalCents())}`;
  }
}

function deliveryValue() {
  return (document.querySelector('input[name="delivery"]:checked') || {}).value || 'entrega';
}

function updateDelivery() {
  const isDelivery = deliveryValue() === 'entrega';
  $('addressField').style.display = isDelivery ? '' : 'none';
  $('address').required = isDelivery;
}

function orderSummaryText(order) {
  const lines = ['Pedido Santo Sabor'];
  order.items.forEach((i) => lines.push(`${i.quantity}x ${i.name} — ${brl(i.quantity * i.priceCents)}`));
  lines.push(`Total: ${brl(order.totalCents)}`);
  lines.push(`Cliente: ${order.customerName}`);
  lines.push(order.delivery === 'entrega' ? `Entrega por motoboy: ${order.address}` : 'Retirada na loja');
  lines.push(order.payment === 'pix' ? 'Pagamento: PIX' : 'Pagamento: Dinheiro físico');
  if (order.payment === 'dinheiro' && order.changeForCents) {
    lines.push(`Troco para ${brl(order.changeForCents)} (troco: ${brl(order.changeForCents - order.totalCents)})`);
  }
  return lines.join('\n');
}

function showError(message, canRetry) {
  const box = $('errorBox');
  box.hidden = false;
  box.innerHTML = '';
  const p = document.createElement('p');
  p.textContent = message;
  box.appendChild(p);
  if (canRetry) {
    const retry = document.createElement('button');
    retry.type = 'button'; retry.className = 'btn btn-small'; retry.textContent = 'Tentar de novo';
    retry.addEventListener('click', () => submitOrder(true));
    box.appendChild(retry);
  }
  const copy = document.createElement('button');
  copy.type = 'button'; copy.className = 'btn btn-small'; copy.textContent = 'Copiar resumo do pedido';
  copy.addEventListener('click', async () => {
    const text = lastPayload ? orderSummaryText({
      items: lastPayload.items, totalCents: lastPayload.totalCents,
      customerName: lastPayload.customerName, delivery: lastPayload.delivery,
      address: lastPayload.address, payment: lastPayload.payment,
      changeForCents: lastPayload.changeForCents,
    }) : 'Pedido Santo Sabor';
    try { await navigator.clipboard.writeText(text); copy.textContent = 'Resumo copiado!'; }
    catch (e) { copy.textContent = 'Não foi possível copiar'; }
  });
  box.appendChild(copy);
  box.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function showConfirmation(order) {
  $('order-form').hidden = true;
  document.querySelector('.sticky-bar').style.display = 'none';
  const conf = $('confirmation');
  conf.hidden = false;
  $('confirmationSummary').innerHTML = `
    <div>${order.items.map((i) => `${i.quantity}x ${i.name} — ${brl(i.quantity * i.priceCents)}`).join('<br>')}</div>
    <p><strong>Total: ${brl(order.totalCents)}</strong></p>
    <p>Cliente: ${order.customerName}</p>
    <p>${order.delivery === 'entrega' ? `Entrega por motoboy: ${order.address}` : 'Retirada na loja'}</p>
    <p>${order.payment === 'pix' ? 'Pagamento: PIX' : 'Pagamento: Dinheiro físico'}</p>
    ${order.payment === 'dinheiro' && order.changeForCents ? `<p>Troco para ${brl(order.changeForCents)} (troco: ${brl(order.changeForCents - order.totalCents)})</p>` : ''}`;
  conf.scrollIntoView({ behavior: 'smooth' });
}

async function submitOrder(isRetry) {
  const items = selectedItems();
  const total = totalCents();
  if (!items.length) { showError('Escolha ao menos um sanduíche.', false); return; }
  const customerName = $('customerName').value.trim();
  if (!customerName) { showError('Informe o nome.', false); $('customerName').focus(); return; }
  const delivery = deliveryValue();
  const address = $('address').value.trim();
  if (delivery === 'entrega' && !address) { showError('Informe o endereço para entrega.', false); $('address').focus(); return; }
  const paymentEl = document.querySelector('input[name="payment"]:checked');
  if (!paymentEl) { showError('Escolha a forma de pagamento: PIX ou dinheiro físico.', false); return; }
  const cf = changeForCents();
  if (paymentEl.value === 'dinheiro' && cf !== null && cf < total) {
    showError(`O valor do troco (${brl(cf)}) não pode ser menor que o total (${brl(total)}).`, false);
    return;
  }
  const payload = {
    items, totalCents: total, customerName, delivery,
    address: delivery === 'entrega' ? address : '',
    payment: paymentEl.value, changeForCents: paymentEl.value === 'dinheiro' ? cf : null,
    notes: $('notes').value.trim(),
  };
  lastPayload = payload;
  $('errorBox').hidden = true;
  const btn = $('submitBtn');
  btn.disabled = true; btn.textContent = 'Enviando...';
  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
    const order = data.order;
    if (order.telegramStatus !== 'sent') {
      lastOrder = order;
      throw new Error(order.telegramError
        ? `O pedido foi salvo, mas não chegou ao Telegram: ${order.telegramError}. Tente de novo.`
        : 'O pedido foi salvo, mas não chegou ao Telegram. Tente de novo.');
    }
    lastOrder = order;
    showConfirmation(order);
  } catch (e) {
    showError(`Não foi possível enviar o pedido. ${e.message}`, true);
  } finally {
    btn.disabled = totalCents() === 0;
    btn.textContent = 'Enviar pedido';
  }
}

function resetOrder() {
  MENU.forEach((f) => { quantities[f.id] = 0; });
  $('customerName').value = '';
  $('address').value = '';
  $('notes').value = '';
  $('changeFor').value = '';
  document.querySelectorAll('input[name="payment"]').forEach((r) => { r.checked = false; });
  document.querySelector('input[name="delivery"][value="entrega"]').checked = true;
  $('errorBox').hidden = true;
  $('confirmation').hidden = true;
  $('order-form').hidden = false;
  document.querySelector('.sticky-bar').style.display = '';
  lastOrder = null; lastPayload = null;
  renderMenu(); updateDelivery(); updateTotals();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.addEventListener('DOMContentLoaded', () => {
  renderMenu();
  updateDelivery();
  updateTotals();
  document.querySelectorAll('input[name="delivery"]').forEach((r) => r.addEventListener('change', updateDelivery));
  document.querySelectorAll('input[name="payment"]').forEach((r) => r.addEventListener('change', updateTotals));
  $('changeFor').addEventListener('input', updateTotals);
  $('submitBtn').addEventListener('click', () => submitOrder(false));
  $('newOrderBtn').addEventListener('click', resetOrder);
  // Tenta carregar o cardápio da API; se falhar, usa o cardápio embutido.
  fetch('/api/menu').then((r) => r.json()).then((d) => {
    if (d && Array.isArray(d.menu) && d.menu.length === 10) { /* menu da API confere com o embutido */ }
  }).catch(() => {});
});
