const express = require('express');
const User = require('../models/user');

// Cria um router do Express
const router = express.Router();

// Middleware específico para as rotas de usuário (adicional ao CORS global)
router.use((req, res, next) => {
  // Log para debug
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin || 'sem origin'}`);
  
  // Headers adicionais específicos para as rotas de usuário
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  next();
});

// Rota para criar um novo usuário
router.post('/register', async (req, res) => {
  try {
    console.log('📝 Tentativa de registro:', {
      body: req.body,
      headers: {
        'content-type': req.headers['content-type'],
        'origin': req.headers.origin,
        'user-agent': req.headers['user-agent']
      }
    });

    // Extrai os dados do corpo da requisição
    const { nome, email, telefone, senha, confirmarSenha } = req.body;

    // Validação básica dos campos obrigatórios
    if (!nome || !email || !telefone || !senha || !confirmarSenha) {
      return res.status(400).json({
        success: false,
        message: 'Todos os campos são obrigatórios',
        missingFields: {
          nome: !nome,
          email: !email,
          telefone: !telefone,
          senha: !senha,
          confirmarSenha: !confirmarSenha
        }
      });
    }

    // Verifica se as senhas coincidem
    if (senha !== confirmarSenha) {
      return res.status(400).json({
        success: false,
        message: 'As senhas não coincidem'
      });
    }

    // Validação adicional de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de email inválido'
      });
    }

    // Validação de telefone
    const telefoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;
    if (!telefoneRegex.test(telefone)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de telefone inválido. Use o formato (XX) XXXXX-XXXX'
      });
    }

    // Verifica se o usuário já existe
    const usuarioExistente = await User.findOne({ email });
    if (usuarioExistente) {
      return res.status(400).json({
        success: false,
        message: 'Usuário já existe com este email'
      });
    }

    // Cria um novo usuário
    const novoUsuario = new User({
      nome,
      email,
      telefone,
      senha
    });

    // Salva o usuário no banco de dados
    const usuarioSalvo = await novoUsuario.save();

    console.log('✅ Usuário criado com sucesso:', {
      id: usuarioSalvo._id,
      email: usuarioSalvo.email,
      nome: usuarioSalvo.nome
    });

    // Retorna sucesso (a senha é automaticamente removida pelo método toJSON)
    res.status(201).json({
      success: true,
      message: 'Usuário criado com sucesso',
      user: usuarioSalvo
    });

  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error);

    // Se for erro de validação do Mongoose
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Erro de validação',
        errors
      });
    }

    // Erro de duplicação (email já existe)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Este email já está cadastrado'
      });
    }

    // Erro genérico do servidor
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Rota para login do usuário
router.post('/login', async (req, res) => {
  try {
    console.log('🔐 Tentativa de login:', {
      email: req.body.email,
      origin: req.headers.origin
    });

    // Extrai email e senha do corpo da requisição
    const { email, senha } = req.body;

    // Validação básica
    if (!email || !senha) {
      return res.status(400).json({
        success: false,
        message: 'Email e senha são obrigatórios'
      });
    }

    // Busca o usuário pelo email (incluindo a senha para comparação)
    const usuario = await User.findOne({ email }).select('+senha');
    
    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }

    // Verifica se a senha está correta
    const senhaCorreta = await usuario.compararSenha(senha);
    
    if (!senhaCorreta) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }

    console.log('✅ Login realizado com sucesso:', {
      id: usuario._id,
      email: usuario.email
    });

    // Login bem-sucedido
    res.status(200).json({
      success: true,
      message: 'Login realizado com sucesso',
      user: {
        id: usuario._id,
        nome: usuario.nome,
        email: usuario.email,
        telefone: usuario.telefone
      }
    });

  } catch (error) {
    console.error('❌ Erro no login:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Rota para listar todos os usuários (opcional, para testes)
router.get('/users', async (req, res) => {
  try {
    const usuarios = await User.find({});
    res.status(200).json({
      success: true,
      count: usuarios.length,
      users: usuarios
    });
  } catch (error) {
    console.error('❌ Erro ao buscar usuários:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Rota para testar CORS especificamente
router.get('/test-cors', (req, res) => {
  res.json({
    success: true,
    message: 'CORS funcionando nas rotas de usuário!',
    origin: req.headers.origin || 'Sem origin',
    timestamp: new Date().toISOString()
  });
});

// Rota OPTIONS para todas as rotas (tratamento de preflight)
router.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

module.exports = router;