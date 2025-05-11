const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const logger = require("./utils/logger");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

const app = express();
app.use(cors());
app.use(express.json());

async function connectDB() {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      logger.info('[MongoDB] ✅ Conectado com sucesso');
    } catch (error) {
      logger.error('[MongoDB] ❌ Erro ao conectar:', error.message);
      process.exit(1);
    }
  }
  
  connectDB();

const officerRoutes = require('./routes/officers');
const evaluationRoutes = require('./routes/evaluations');
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const auditRoutes = require('./routes/auditRoutes');
const usuariosRoutes = require('./routes/usuariosRoutes');

app.use('/v1/api/officers', officerRoutes);
app.use('/v1/api/evaluations', evaluationRoutes);
app.use('/v1/api/auth', authRoutes);
app.use('/v1/api/dashboard', dashboardRoutes);
app.use('/v1/api/audit', auditRoutes);
app.use('/v1/api/users', usuariosRoutes);

app.get("/", (req, res) => {
  res.status(200).send("Servidor funcionando!");
});

// Configuração do Swagger
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Sistema de Avaliação de Oficiais",
      version: "1.0.0",
      description: "API para gestão de oficiais e avaliações de desempenho",
    },
    servers: [
      {
        url: "https://be-oficiais.onrender.com/v1/api",
        description: "Servidor de Desenvolvimento",
      },
    ],
  },
  apis: ["./routes/*.js"], // Caminho para os arquivos de rotas
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

logger.info("Swagger UI disponível em https://be-oficiais.onrender.com/api-docs");

const PORT = 5000;
app.listen(PORT, () => logger.info(`Servidor rodando na porta ${PORT}`));

module.exports = app;