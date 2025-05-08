const express = require("express");
const router = express.Router();
const AuditLog = require("../models/AuditLog");
const {
	authenticateToken,
	requireAdmin,
} = require("../middleware/authMiddleware");

// GET /audit-logs?user=&action=&entity=&page=1&limit=10
router.get("/audit-logs", authenticateToken, requireAdmin, async (req, res) => {
	const { user, action, entity, search, page = 1, limit = 10 } = req.query;
	const filters = {};

	if (user) filters["user.id"] = user;
	if (action) filters.action = action;
	if (entity) filters["target.entity"] = entity;

	try {
		// Busca com filtros simples primeiro
		const baseLogs = await AuditLog.find(filters)
			.sort({ timestamp: -1 })
			.lean(); // Necessário para podermos manipular depois

		// Filtro adicional por busca textual
		const searchLower = search?.toLowerCase();
		const filteredLogs = searchLower
			? baseLogs.filter((log) => {
					return (
						log?.metadata?.name?.toLowerCase().includes(searchLower) ||
						log?.metadata?.officerName?.toLowerCase().includes(searchLower) ||
						log?.endpoint?.toLowerCase().includes(searchLower) ||
						log?.target?.entity?.toLowerCase().includes(searchLower) ||
						log?.action?.toLowerCase().includes(searchLower)
					);
			  })
			: baseLogs;

		// Paginação após o filtro por texto
		const paginated = filteredLogs.slice((page - 1) * limit, page * limit);

		res.json({
			page: Number(page),
			limit: Number(limit),
			totalPages: Math.ceil(filteredLogs.length / limit),
			totalResults: filteredLogs.length,
			results: paginated,
		});
	} catch (err) {
		console.error("[AUDIT LOG ERROR]", err.message);
		res.status(500).json({ error: "Erro ao buscar logs de auditoria." });
	}
});

module.exports = router;
