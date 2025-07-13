const express = require('express');
const User = require('../models/user');


// Cria um router do Express
const router = express.Router();


// Rota para criar um novo usuário
router.post('/register', async (req, res) => {
  try {
    // Extrai os dados do corpo da requisição
    const { nome, email, telefone, senha, confirmarSenha } = req.body;

    // Validação básica dos campos obrigatórios
    if (!nome || !email || !telefone || !senha || !confirmarSenha) {
      return res.status(400).json({
        success: false,
        message: 'Todos os campos são obrigatórios'
      });
    }

    // Verifica se as senhas coincidem
    if (senha !== confirmarSenha) {
      return res.status(400).json({
        success: false,
        message: 'As senhas não coincidem'
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

    // Retorna sucesso (a senha é automaticamente removida pelo método toJSON)
    res.status(201).json({
      success: true,
      message: 'Usuário criado com sucesso',
      user: usuarioSalvo
    });

  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    
    // Se for erro de validação do Mongoose
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Erro de validação',
        errors
      });
    }

    // Erro genérico do servidor
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Rota para login do usuário
router.post('/login', async (req, res) => {
  try {
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
    console.error('Erro no login:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
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
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

module.exports = router;

