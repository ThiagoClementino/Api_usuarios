// Conecta ao banco apenas se não estivermos em ambiente serverless
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  connectDB();
}

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

// Para ambiente serverless (Vercel), não iniciar o servidor
if (process.env.VERCEL) {
  module.exports = app;
} else {
  // Inicia o servidor apenas em ambiente local
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}