const express = require("express");
const router = express.Router();
const User = require("../models/user");
const sendEmail = require("../config/email");
const crypto = require("crypto");

// =================================================================
// ROTAS DE AUTENTICAÇÃO (REGISTRO E LOGIN) - Mantidas
// =================================================================

router.post("/register", async (req, res) => {
  try {
    // Extrai os dados do corpo da requisição
    const { nome, email, telefone, senha, confirmarSenha } = req.body;

    // Validação básica dos campos obrigatórios
    if (!nome || !email || !telefone || !senha || !confirmarSenha) {
      return res.status(400).json({
        success: false,
        message: "Todos os campos são obrigatórios",
      });
    }

    // Verifica se as senhas coincidem
    if (senha !== confirmarSenha) {
      return res.status(400).json({
        success: false,
        message: "As senhas não coincidem",
      });
    }

    // Verifica se o usuário já existe
    const usuarioExistente = await User.findOne({ email });
    if (usuarioExistente) {
      return res.status(400).json({
        success: false,
        message: "Usuário já existe com este email",
      });
    }

    // Cria um novo usuário
    const novoUsuario = new User({
      nome,
      email,
      telefone,
      senha,
    });

    // Salva o usuário no banco de dados
    const usuarioSalvo = await novoUsuario.save();

    // Retorna sucesso (a senha é automaticamente removida pelo método toJSON)
    res.status(201).json({
      success: true,
      message: "Usuário criado com sucesso",
      user: usuarioSalvo,
    });
  } catch (error) {
    console.error("Erro ao criar usuário:", error);

    // Se for erro de validação do Mongoose
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Erro de validação",
        errors,
      });
    }

    // Erro genérico do servidor
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    // Extrai email e senha do corpo da requisição
    const { email, senha } = req.body;

    // Validação básica
    if (!email || !senha) {
      return res.status(400).json({
        success: false,
        message: "Email e senha são obrigatórios",
      });
    }

    // Busca o usuário pelo email (incluindo a senha para comparação)
    const usuario = await User.findOne({ email }).select("+senha");

    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: "Credenciais inválidas",
      });
    }

    // Verifica se a senha está correta
    const senhaCorreta = await usuario.compararSenha(senha);

    if (!senhaCorreta) {
      return res.status(401).json({
        success: false,
        message: "Credenciais inválidas",
      });
    }

    // Login bem-sucedido
    res.status(200).json({
      success: true,
      message: "Login realizado com sucesso",
      user: {
        id: usuario._id,
        nome: usuario.nome,
        email: usuario.email,
        telefone: usuario.telefone,
      },
    });
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
});

router.get("/users", async (req, res) => {
  try {
    const usuarios = await User.find({});
    res.status(200).json({
      success: true,
      count: usuarios.length,
      users: usuarios,
    });
  } catch (error) {
    console.error("Erro ao buscar usuários:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
});

// =================================================================
// ROTAS DE RECUPERAÇÃO DE SENHA - CORRIGIDAS
// =================================================================

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "O email é obrigatório para recuperação de senha.",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      // PRÁTICA DE SEGURANÇA: Retorna uma mensagem genérica para não revelar se o email existe ou não
      return res.status(200).json({
        success: true,
        message:
          "Se o email estiver registrado, você receberá um link de recuperação de senha.",
      });
    }

    // 1. Gera o token de recuperação e salva no usuário
    const resetToken = user.createPasswordResetToken();
    // O { validateBeforeSave: false } é crucial, pois estamos salvando campos que não são obrigatórios no schema principal
    await user.save({ validateBeforeSave: false });

    // 2. Envia o email com o link de recuperação
    // CORREÇÃO: Usa a variável de ambiente FRONTEND_URL para a URL base
    const frontendURL = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetURL = `${frontendURL}/reset-password/${resetToken}`;

    const message = `Você solicitou a recuperação de senha. Use o link a seguir para redefinir sua senha: ${resetURL}\n\nEste link é válido por 1 hora.`;
    const htmlMessage = `<p>Você solicitou a recuperação de senha.</p><p>Use o link a seguir para redefinir sua senha: <a href="${resetURL}">${resetURL}</a></p><p>Este link é válido por 1 hora.</p>`;

    try {
      await sendEmail(user.email, "Recuperação de Senha", message, htmlMessage);

      res.status(200).json({
        success: true,
        message: "Link de recuperação de senha enviado para o seu email.",
      });
    } catch (err) {
      // Se o envio falhar, limpamos os campos de token para que o usuário possa tentar novamente
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      console.error("Erro ao enviar email de recuperação:", err);
      return res.status(500).json({
        success: false,
        message: "Houve um erro ao enviar o email. Tente novamente mais tarde.",
      });
    }
  } catch (error) {
    console.error("Erro na solicitação de recuperação de senha:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor.",
    });
  }
});

router.patch("/reset-password/:token", async (req, res) => {
  try {
    // A lógica de busca do token já estava correta, pois o erro de digitação
    // estava no modelo (user.js), que já foi corrigido.
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Token inválido ou expirado.",
      });
    }

    // 3. Valida a nova senha
    const { senha, confirmarSenha } = req.body;

    if (!senha || !confirmarSenha) {
      return res.status(400).json({
        success: false,
        message: "Nova senha e confirmação são obrigatórias.",
      });
    }

    if (senha !== confirmarSenha) {
      return res.status(400).json({
        success: false,
        message: "As senhas não coincidem.",
      });
    }

    if (senha.length < 6) {
      return res.status(400).json({
        success: false,
        message: "A senha deve ter pelo menos 6 caracteres.",
      });
    }

    // A senha será automaticamente criptografada pelo middleware 'pre("save")' no modelo User
    user.senha = senha;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Senha redefinida com sucesso.",
    });
  } catch (error) {
    console.error("Erro na redefinição de senha:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor.",
    });
  }
});

module.exports = router;
