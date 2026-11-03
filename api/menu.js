// Santo Sabor - cardápio para a Vercel
const PRICE_CENTS = 1500;

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

module.exports = (req, res) => {
  res.status(200).json({ menu: MENU });
};
module.exports.MENU = MENU;
module.exports.PRICE_CENTS = PRICE_CENTS;
