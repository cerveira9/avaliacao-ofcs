const express = require("express");
const router = express.Router();
const AuditLog = require("../models/AuditLog");
const {
	authenticateToken,
	requireAdmin,
} = require("../middleware/authMiddleware");
const logger = require("../utils/logger"); // Assuming you have a logger utility

/**
 * @swagger
 * /audit-logs:
 *   get:
 *     summary: Retrieve audit logs with optional filters, search, and pagination.
 *     tags:
 *       - Audit Logs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: user
 *         schema:
 *           type: string
 *         description: Filter logs by user ID.
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter logs by action type.
 *       - in: query
 *         name: entity
 *         schema:
 *           type: string
 *         description: Filter logs by target entity.
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Perform a text search on logs.
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of results per page.
 *     responses:
 *       200:
 *         description: Successfully retrieved audit logs.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 page:
 *                   type: integer
 *                   description: Current page number.
 *                 limit:
 *                   type: integer
 *                   description: Number of results per page.
 *                 totalPages:
 *                   type: integer
 *                   description: Total number of pages.
 *                 totalResults:
 *                   type: integer
 *                   description: Total number of results.
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: Audit log entry.
 *       401:
 *         description: Unauthorized. Token is missing or invalid.
 *       403:
 *         description: Forbidden. Admin access is required.
 *       500:
 *         description: Internal server error.
 */

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
