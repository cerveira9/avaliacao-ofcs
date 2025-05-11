const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const logger = require("./utils/logger");

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

const PORT = 5000;
app.listen(PORT, () => logger.info(`Servidor rodando na porta ${PORT}`));

module.exports = app;