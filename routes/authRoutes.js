const express = require('express');
const router = express.Router();
const { login, register } = require('../controllers/authController');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');
const { changePassword } = require('../controllers/authController');

router.post('/login', login);
router.post('/register', authenticateToken, requireAdmin, register);
router.post('/alterarSenha', authenticateToken, changePassword);

module.exports = router;
