const express = require("express");
const router = express.Router();
const User = require("../models/User");
const {
	authenticateToken,
	requireAdmin,
} = require("../middleware/authMiddleware");

const logger = require("../utils/logger"); // Assuming you have a logger utility

router.get(
	"/listarUsuarios",
	authenticateToken,
	requireAdmin,
	async (req, res) => {
		logger.info("Received request to list users.");
		try {
			logger.info("Fetching users from the database...");
			const users = await User.find({}, { password: 0 }).sort({
				officerName: 1,
			});
			logger.info(`Successfully fetched ${users.length} users.`);
			res.json(users);
		} catch (error) {
			logger.error("[ERRO LISTAR USUÁRIOS]", error.message);
			res.status(500).json({ error: "Erro ao buscar usuários." });
		}
	}
);

module.exports = router;
