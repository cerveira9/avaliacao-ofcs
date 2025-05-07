const express = require('express');
const router = express.Router();
const { login, register } = require('../controllers/authController');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

router.post('/login', login);
router.post('/register', authenticateToken, requireAdmin, register);

module.exports = router;
