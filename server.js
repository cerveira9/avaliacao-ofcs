const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

async function connectDB() {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log('[MongoDB] ✅ Conectado com sucesso');
    } catch (error) {
      console.error('[MongoDB] ❌ Erro ao conectar:', error.message);
      process.exit(1);
    }
  }
  
  connectDB();

const officerRoutes = require('./routes/officers');
const evaluationRoutes = require('./routes/evaluations');

app.use('/v1/api/officers', officerRoutes);
app.use('/v1/api/evaluations', evaluationRoutes);

const PORT = 5000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));