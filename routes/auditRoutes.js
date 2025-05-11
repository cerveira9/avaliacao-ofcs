const express = require("express");
const router = express.Router();
const AuditLog = require("../models/AuditLog");
const {
	authenticateToken,
	requireAdmin,
} = require("../middleware/authMiddleware");
const logger = require("../utils/logger"); // Assuming you have a logger utility

// GET /audit-logs?user=&action=&entity=&page=1&limit=10
router.get("/audit-logs", authenticateToken, requireAdmin, async (req, res) => {
	const { user, action, entity, search, page = 1, limit = 10 } = req.query;
	const filters = {};

	logger.info("Received request to fetch audit logs", { query: req.query });

	if (user) {
		filters["user.id"] = user;
		logger.debug("Filter applied for user", { user });
	}
	if (action) {
		filters.action = action;
		logger.debug("Filter applied for action", { action });
	}
	if (entity) {
		filters["target.entity"] = entity;
		logger.debug("Filter applied for entity", { entity });
	}

	try {
		logger.info("Fetching audit logs from database", { filters });
		const baseLogs = await AuditLog.find(filters)
			.sort({ timestamp: -1 })
			.lean();

		logger.info("Audit logs fetched successfully", { count: baseLogs.length });

		// Filtro adicional por busca textual
		const searchLower = search?.toLowerCase();
		const filteredLogs = searchLower
			? baseLogs.filter((log) => {
					const matches =
						log?.metadata?.name?.toLowerCase().includes(searchLower) ||
						log?.metadata?.officerName?.toLowerCase().includes(searchLower) ||
						log?.endpoint?.toLowerCase().includes(searchLower) ||
						log?.target?.entity?.toLowerCase().includes(searchLower) ||
						log?.action?.toLowerCase().includes(searchLower);

					if (matches) {
						logger.debug("Log matched search filter", { log });
					}
					return matches;
			  })
			: baseLogs;

		logger.info("Logs filtered by search", { search, count: filteredLogs.length });

		// Paginação após o filtro por texto
		const paginated = filteredLogs.slice((page - 1) * limit, page * limit);

		logger.info("Logs paginated", {
			page: Number(page),
			limit: Number(limit),
			totalPages: Math.ceil(filteredLogs.length / limit),
			totalResults: filteredLogs.length,
		});

		res.json({
			page: Number(page),
			limit: Number(limit),
			totalPages: Math.ceil(filteredLogs.length / limit),
			totalResults: filteredLogs.length,
			results: paginated,
		});
	} catch (err) {
		logger.error("Error fetching audit logs", { error: err.message });
		res.status(500).json({ error: "Erro ao buscar logs de auditoria." });
	}
});

module.exports = router;
