const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User'); // ajuste o path se necessário
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI); // substitua pelo seu banco

(async () => {
  const existing = await User.findOne({ username: 'admin' });
  if (existing) {
    console.log('Usuário já existe');
    mongoose.disconnect();
    return;
  }

  const hashed = await bcrypt.hash('senha123', 10); // defina uma senha forte
  const user = new User({ username: 'admin', password: hashed, role: 'admin' });
  await user.save();
  console.log('Usuário admin criado com sucesso');
  mongoose.disconnect();
})();
