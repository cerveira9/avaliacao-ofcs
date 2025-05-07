const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });
  if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Senha incorreta' });

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({ token, role: user.role });
};

exports.register = async (req, res) => {
  const { username, password, officerName, role } = req.body;

  if (!username || !password || !officerName || !role) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ error: 'Usuário já existe.' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      password: hashedPassword,
      officerName,
      role
    });

    await newUser.save();
    res.status(201).json({ message: 'Usuário registrado com sucesso.' });
  } catch (err) {
    console.error('[ERRO REGISTER]', err.message);
    res.status(500).json({ error: 'Erro no registro do usuário.' });
  }
};
