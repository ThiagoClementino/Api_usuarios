require('dotenv').config();

// Importa o servidor Express
const app = require('./src/server');

// Exporta o app para o Vercel
module.exports = app;
