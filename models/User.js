const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  officerName: { type: String, required: true },
  role: { type: String, enum: ['admin', 'federal'], default: 'federal' }
});

module.exports = mongoose.model('User', userSchema);
