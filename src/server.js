// Carrega as variáveis de ambiente do arquivo .env
require('dotenv').config();

const express = require('express');
const cors = require('cors'); // Importa o middleware CORS
const connectDB = require('./config/database');
const userRoutes = require('./routes/userRoutes');

// Cria uma instância do Express
const app = express();

// Conecta ao banco de dados
connectDB();

// Configuração do CORS
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'https://seu-frontend.vercel.app', // Substitua pelo seu domínio de produção
    'https://seu-dominio.com' // Substitua pelo seu domínio personalizado
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  credentials: true, // Permite cookies e credenciais
  optionsSuccessStatus: 200 // Para suportar navegadores legados
};

// Aplica o middleware CORS
app.use(cors(corsOptions));

// Middleware para parsing de JSON
app.use(express.json());

// Middleware para parsing de dados de formulário
app.use(express.urlencoded({ extended: true }));

// Middleware adicional para tratar preflight requests manualmente (backup)
app.use((req, res, next) => {
  // Permite requisições de qualquer origem (apenas para desenvolvimento)
  // Em produção, use apenas os domínios específicos
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Responde aos preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

// Rota de teste para verificar se o servidor está funcionando
app.get('/', (req, res) => {
  res.json({
    message: 'API funcionando!',
    cors: 'CORS configurado com sucesso!'
  });
});

// Rota de teste para CORS
app.get('/test-cors', (req, res) => {
  res.json({
    message: 'CORS está funcionando!',
    origin: req.headers.origin || 'Sem origin',
    timestamp: new Date().toISOString()
  });
});

// Usa as rotas de usuário
app.use('/api', userRoutes);

// Middleware para tratar rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada'
  });
});

// Middleware para tratar erros globais
app.use((error, req, res, next) => {
  console.error('Erro global:', error);
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// Define a porta do servidor
const PORT = process.env.PORT || 3000;

// Inicia o servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Acesse: http://localhost:${PORT}`);
  console.log('CORS configurado e funcionando!');
});