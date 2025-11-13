// Carrega as variáveis de ambiente do arquivo .env
require("dotenv").config();
const cors = require("cors"); // 1. Importe o pacote cors
const express = require("express");
const connectDB = require("./config/database");
const userRoutes = require("./routes/userRoutes");

// Cria uma instância do Express
const app = express();
app.use(cors());
// Conecta ao banco de dados
connectDB();

// Middleware para parsing de JSON
app.use(express.json());

// Middleware para parsing de dados de formulário
app.use(express.urlencoded({ extended: true }));

// Rota de teste para verificar se o servidor está funcionando
app.get("/", (req, res) => {
  console.log(
    `Mais informações, leia o README desta aplicação através do link: https://github.com/ThiagoClementino/Api_usuarios.git`
  );
  res.send("API funcionando corretamente!");
});

// Usa as rotas de usuário
app.use("/api", userRoutes);

// Define a porta do servidor
const PORT = process.env.PORT || 5000;

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando, acesse: http://localhost:${PORT}`);
});
