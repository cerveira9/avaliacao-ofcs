const express = require("express");
const router = express.Router();
const User = require("../models/User");
const {
	authenticateToken,
	requireAdmin,
} = require("../middleware/authMiddleware");

router.get(
	"/listarUsuarios",
	authenticateToken,
	requireAdmin,
	async (req, res) => {
		try {
			const users = await User.find({}, { password: 0 }).sort({
				officerName: 1,
			});
			res.json(users);
		} catch (error) {
			console.error("[ERRO LISTAR USUÁRIOS]", error.message);
			res.status(500).json({ error: "Erro ao buscar usuários." });
		}
	}
);

module.exports = router;
