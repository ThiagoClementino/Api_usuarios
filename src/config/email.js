// src/config/email.js
const nodemailer = require("nodemailer");

/**
 * Função genérica para envio de e-mails.
 * @param {string} to - E-mail do destinatário.
 * @param {string} subject - Assunto do e-mail.
 * @param {string} text - Corpo do e-mail em texto puro.
 * @param {string} html - Corpo do e-mail em formato HTML.
 */
async function sendEmail(to, subject, text, html) {
  try {
    // Configuração do transporte de e-mail
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST, // Ex: smtp.gmail.com
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === "true", // true para 465, false para 587
      auth: {
        user: process.env.EMAIL_USER, // seu e-mail de envio
        pass: process.env.EMAIL_PASS, // sua senha ou app password
      },
    });

    // Detalhes da mensagem
    const mailOptions = {
      from: `"Suporte - Sistema de Usuários" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    };

    // Envio do e-mail
    await transporter.sendMail(mailOptions);
    console.log(`📧 E-mail enviado com sucesso para: ${to}`);
  } catch (error) {
    console.error("❌ Erro ao enviar e-mail:", error);
    throw new Error("Falha no envio do e-mail");
  }
}

module.exports = sendEmail;
