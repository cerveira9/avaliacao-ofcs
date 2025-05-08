const mongoose = require('mongoose');
const getCollectionName = require('../utils/collectionName');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  officerName: { type: String, required: true },
  role: { type: String, enum: ['admin', 'federal'], default: 'federal' }
});

module.exports = mongoose.model('User', userSchema, getCollectionName('User'));
