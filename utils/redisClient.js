const Redis = require("ioredis");
require('dotenv').config();

// Configuração para o Redis na nuvem
const redis = new Redis({
  host: process.env.REDIS_HOST, // Substitua pelo host do Redis na nuvem
  port: process.env.REDIS_PORT, // Substitua pela porta fornecida
  password: process.env.REDIS_PASSWORD, // Substitua pela senha fornecida
});

redis.on("connect", () => {
  console.log("[Redis] ✅ Conectado ao servidor Redis na nuvem");
});

redis.on("error", (err) => {
  console.error("[Redis] ❌ Erro ao conectar ao Redis:", err.message);
});

module.exports = redis;