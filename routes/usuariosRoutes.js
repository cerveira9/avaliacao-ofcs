const express = require("express");
const router = express.Router();
const User = require("../models/User");
const {
	authenticateToken,
	requireAdmin,
} = require("../middleware/authMiddleware");

const logger = require("../utils/logger"); // Assuming you have a logger utility

/**
 * @swagger
 * /listarUsuarios:
 *   get:
 *     summary: Lista todos os usuários cadastrados.
 *     tags:
 *       - Usuários
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuários retornada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     description: ID do usuário.
 *                   officerName:
 *                     type: string
 *                     description: Nome do oficial.
 *                   email:
 *                     type: string
 *                     description: Email do usuário.
 *       401:
 *         description: Não autorizado. Token inválido ou ausente.
 *       403:
 *         description: Proibido. Apenas administradores podem acessar este recurso.
 *       500:
 *         description: Erro ao buscar usuários.
 */

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
