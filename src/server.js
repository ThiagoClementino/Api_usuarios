// Carrega as variáveis de ambiente do arquivo .env
require('dotenv').config();

const express = require('express');
const cors = require('cors'); // Importa o middleware CORS
const connectDB = require('./config/database');
const userRoutes = require('./routes/userRoutes');

// Cria uma instância do Express
const app = express();

// Conecta ao banco de dados apenas se não estivermos em ambiente serverless
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  connectDB();
}

// Configuração do CORS
const corsOptions = {
  origin: function (origin, callback) {
    // Lista de origens permitidas
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'https://seu-frontend.vercel.app', // Substitua pelo seu domínio de produção
      'https://seu-dominio.com' // Substitua pelo seu domínio personalizado
    ];

    // Permite requisições sem origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Verifica se a origem está na lista permitida
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Em desenvolvimento, permite qualquer localhost
    if (process.env.NODE_ENV === 'development' && origin.includes('localhost')) {
      return callback(null, true);
    }
    
    return callback(new Error('Não permitido pelo CORS'));
  },
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
app.use(express.json({ limit: '10mb' }));

// Middleware para parsing de dados de formulário
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware para conectar ao banco em ambiente serverless
app.use(async (req, res, next) => {
  if (process.env.VERCEL && !global.mongooseConnection) {
    try {
      await connectDB();
      global.mongooseConnection = true;
    } catch (error) {
      console.error('Erro ao conectar ao MongoDB:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro de conexão com o banco de dados'
      });
    }
  }
  next();
});

// Middleware adicional para tratar preflight requests manualmente (backup)
app.use((req, res, next) => {
  // Headers CORS adicionais
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
    success: true,
    message: 'API funcionando!',
    cors: 'CORS configurado com sucesso!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Rota de teste para CORS
app.get('/test-cors', (req, res) => {
  res.json({
    success: true,
    message: 'CORS está funcionando!',
    origin: req.headers.origin || 'Sem origin',
    timestamp: new Date().toISOString()
  });
});

// Rota de health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Usa as rotas de usuário
app.use('/api', userRoutes);

// Middleware para tratar rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada',
    path: req.originalUrl,
    method: req.method
  });
});

// Middleware para tratar erros globais
app.use((error, req, res, next) => {
  console.error('Erro global:', error);
  
  // Se for erro de CORS
  if (error.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      message: 'Erro de CORS: Origem não permitida'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// Para ambiente serverless (Vercel), não iniciar o servidor
if (process.env.VERCEL) {
  module.exports = app;
} else {
  // Define a porta do servidor
  const PORT = process.env.PORT || 3000;

  // Inicia o servidor apenas em ambiente local
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
    console.log('CORS configurado e funcionando!');
  });
}

