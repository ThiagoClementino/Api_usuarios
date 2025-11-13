const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Define o schema (estrutura) do usuário
const userSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: [true, "Nome é obrigatório"],
      trim: true,
      minlength: [2, "Nome deve ter pelo menos 2 caracteres"],
      maxlength: [50, "Nome deve ter no máximo 50 caracteres"],
    },
    email: {
      type: String,
      required: [true, "Email é obrigatório"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Por favor, insira um email válido",
      ],
    },
    telefone: {
      type: String,
      required: [true, "Telefone é obrigatório"],
      trim: true,
      match: [/^[\d\s\-\(\)\+]+$/, "Por favor, insira um telefone válido"],
    },
    senha: {
      type: String,
      required: [true, "Senha é obrigatória"],
      minlength: [6, "Senha deve ter pelo menos 6 caracteres"],
    },
    passorwordResetToken: String,
    passwordResetExpires: Date,
  },
  {
    // Adiciona campos createdAt e updatedAt automaticamente
    timestamps: true,
  }
);

// Middleware que executa antes de salvar o usuário
userSchema.pre("save", async function (next) {
  // Se a senha não foi modificada, pula para o próximo middleware
  if (!this.isModified("senha")) {
    return next();
  }

  try {
    // Gera um salt (valor aleatório) para tornar o hash mais seguro
    const salt = await bcrypt.genSalt(10);

    // Criptografa a senha usando o salt
    this.senha = await bcrypt.hash(this.senha, salt);

    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar senha fornecida com a senha criptografada
userSchema.methods.compararSenha = async function (senhaFornecida) {
  return await bcrypt.compare(senhaFornecida, this.senha);
};

// Método para remover a senha do objeto quando convertido para JSON
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.senha;
  return userObject;
};

// Cria e exporta o modelo User
const User = mongoose.model("User", userSchema);

module.exports = User;
