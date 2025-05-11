const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const logAction = require("../utils/logAction");
const logger = require("../utils/logger"); // Assuming you have a logger utility

exports.login = async (req, res) => {
	logger.info("[LOGIN] Login attempt started");
	const { username, password } = req.body;

	try {
		const user = await User.findOne({ username });
		if (!user) {
			logger.warn("[LOGIN] User not found:", username);
			return res.status(401).json({ error: "Usuário não encontrado" });
		}

		const valid = await bcrypt.compare(password, user.password);
		if (!valid) {
			logger.warn("[LOGIN] Incorrect password for user:", username);
			return res.status(401).json({ error: "Senha incorreta" });
		}

		const token = jwt.sign(
			{ id: user._id, role: user.role },
			process.env.JWT_SECRET,
			{ expiresIn: "4h" }
		);

		await logAction({
			req,
			action: "login",
			user: { id: user._id, role: user.role },
			target: { entity: "User", id: user._id },
			metadata: { username },
		});

		logger.info("[LOGIN] Login successful for user:", username);
		res.json({ token, role: user.role });
	} catch (err) {
		logger.error("[LOGIN ERROR]", err.message);
		res.status(500).json({ error: "Erro no login." });
	}
};

exports.register = async (req, res) => {
	logger.info("[REGISTER] Registration attempt started");
	const { username, password, officerName, role } = req.body;

	if (!username || !password || !officerName || !role) {
		logger.warn("[REGISTER] Missing required fields");
		return res.status(400).json({ error: "Todos os campos são obrigatórios." });
	}

	try {
		const existingUser = await User.findOne({ username });
		if (existingUser) {
			logger.warn("[REGISTER] User already exists:", username);
			return res.status(400).json({ error: "Usuário já existe." });
		}

		const hashedPassword = await bcrypt.hash(password, 10);

		const newUser = new User({
			username,
			password: hashedPassword,
			officerName,
			role,
		});

		await newUser.save();

		await logAction({
			req,
			action: "register",
			user: req.user,
			target: { entity: "User", id: newUser._id },
			metadata: { username, officerName, role },
		});

		logger.info("[REGISTER] User registered successfully:", username);
		res.status(201).json({ message: "Usuário registrado com sucesso." });
	} catch (err) {
		logger.error("[REGISTER ERROR]", err.message);
		res.status(500).json({ error: "Erro no registro do usuário." });
	}
};

exports.changePassword = async (req, res) => {
	logger.info("[CHANGE PASSWORD] Password change attempt started");
	const { currentPassword, newPassword } = req.body;
	const userId = req.user.id;

	if (!currentPassword || !newPassword) {
		logger.warn("[CHANGE PASSWORD] Missing required fields");
		return res.status(400).json({ error: "Preencha todos os campos." });
	}

	try {
		const user = await User.findById(userId);
		if (!user) {
			logger.warn("[CHANGE PASSWORD] User not found:", userId);
			return res.status(404).json({ error: "Usuário não encontrado." });
		}

		const isMatch = await bcrypt.compare(currentPassword, user.password);
		if (!isMatch) {
			logger.warn("[CHANGE PASSWORD] Incorrect current password for user:", userId);
			return res.status(401).json({ error: "Senha atual incorreta." });
		}

		const hashed = await bcrypt.hash(newPassword, 10);
		user.password = hashed;
		await user.save();

		await logAction({
			req,
			action: "change_password",
			user: req.user,
			target: { entity: "User", id: user._id },
		});

		logger.info("[CHANGE PASSWORD] Password changed successfully for user:", userId);
		res.json({ message: "Senha alterada com sucesso." });
	} catch (err) {
		logger.error("[CHANGE PASSWORD ERROR]", err.message);
		res.status(500).json({ error: "Erro ao alterar a senha." });
	}
};
