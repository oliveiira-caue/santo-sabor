// Forwarder para permitir execução direta a partir da raiz do workspace
const path = require('path');
process.chdir(path.join(__dirname, 'santo-sabor-completo'));
require('./santo-sabor-completo/server.js');

