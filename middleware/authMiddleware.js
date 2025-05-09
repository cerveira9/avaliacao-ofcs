const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
	const authHeader = req.headers["authorization"];
	const token = authHeader && authHeader.split(" ")[1];

	if (!token) return res.sendStatus(401);

	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		req.user = decoded;
		next();
	} catch (err) {
		return res.status(401).json({ error: "Token expirado ou inválido" });
	}
}

function requireAdmin(req, res, next) {
	if (req.user.role !== "admin") return res.sendStatus(403);
	next();
}

module.exports = { authenticateToken, requireAdmin };
