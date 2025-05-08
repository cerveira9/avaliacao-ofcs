const AuditLog = require('../models/AuditLog');

async function logAction({ req, action, user, target, metadata = {} }) {
  try {
    await AuditLog.create({
      action,
      method: req?.method,
      endpoint: req?.originalUrl,
      user: {
        id: user.id,
        username: user.username
      },
      target,
      metadata
    });
  } catch (err) {
    console.error('[LOG ERROR]', err.message);
  }
}

module.exports = logAction;
