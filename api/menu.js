const PRICE_CENTS = 1500;
const MENU = [
  { id: 'atum', name: 'Atum', priceCents: 1500, image: 'atum.jpg', description: 'Atum, alface, tomate e maionese leve.' },
  { id: 'camarao', name: 'Camarão', priceCents: 1500, image: 'camarao.jpg', description: 'Camarão, alface, tomate e molho leve.' },
  { id: 'dueto', name: 'Dueto', priceCents: 1500, image: 'dueto.jpg', description: 'Dois sabores em um só sanduíche, à escolha da casa.' },
  { id: 'frango', name: 'Frango', priceCents: 1500, image: 'frango.jpg', description: 'Frango desfiado, alface, tomate e requeijão.' },
  { id: 'queijo-presunto', name: 'Queijo e Presunto', priceCents: 1500, image: 'queijo-presunto.jpg', description: 'Queijo, presunto, alface e tomate.' },
  { id: 'ricota', name: 'Ricota', priceCents: 1500, image: 'ricota.jpg', description: 'Ricota temperada, alface e tomate.' },
  { id: 'ricota-tomate-seco', name: 'Ricota e Tomate Seco', priceCents: 1500, image: 'ricota-tomate-seco.jpg', description: 'Ricota, tomate seco e folhas verdes.' },
  { id: 'ricota-peito-peru', name: 'Ricota e Peito de Peru', priceCents: 1500, image: 'ricota-peito-peru.jpg', description: 'Ricota, peito de peru, alface e tomate.' },
  { id: 'salame', name: 'Salame', priceCents: 1500, image: 'salame.jpg', description: 'Salame, queijo, alface e tomate.' },
  { id: 'tomate-seco', name: 'Tomate Seco', priceCents: 1500, image: 'tomate-seco.jpg', description: 'Tomate seco, ricota e folhas verdes.' }
];
module.exports = function (req, res) {
  res.status(200).json({ menu: MENU });
};
