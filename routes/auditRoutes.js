const express = require("express");
const router = express.Router();
const AuditLog = require("../models/AuditLog");
const {
	authenticateToken,
	requireAdmin,
} = require("../middleware/authMiddleware");

// GET /audit-logs?user=&action=&entity=&page=1&limit=10
router.get("/audit-logs", authenticateToken, requireAdmin, async (req, res) => {
	const { user, action, entity, page = 1, limit = 10 } = req.query;
	const filters = {};

	if (user) filters["user.id"] = user;
	if (action) filters.action = action;
	if (entity) filters["target.entity"] = entity;

	try {
		const logs = await AuditLog.find(filters)
			.sort({ timestamp: -1 })
			.skip((page - 1) * limit)
			.limit(Number(limit));

		const total = await AuditLog.countDocuments(filters);

		res.json({
			page: Number(page),
			limit: Number(limit),
			totalPages: Math.ceil(total / limit),
			totalResults: total,
			results: logs,
		});
	} catch (err) {
		console.error("[AUDIT LOG ERROR]", err.message);
		res.status(500).json({ error: "Erro ao buscar logs de auditoria." });
	}
});

module.exports = router;
