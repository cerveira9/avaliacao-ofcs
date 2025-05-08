const mongoose = require('mongoose');
const getCollectionName = require('../utils/collectionName');

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true }, // 'create', 'update', 'delete', etc.
  method: { type: String },                 // HTTP method: 'GET', 'POST', etc.
  endpoint: { type: String },              // Endpoint chamado: '/officers/:id'

  user: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: String
  },

  target: {
    entity: String, // Ex: 'Officer'
    id: mongoose.Schema.Types.ObjectId
  },

  metadata: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuditLog', auditLogSchema, getCollectionName('AuditLog'));
