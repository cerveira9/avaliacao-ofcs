const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const logAction = require("../utils/logAction");

exports.login = async (req, res) => {
	console.log("[LOGIN] Login attempt started");
	const { username, password } = req.body;

	try {
		const user = await User.findOne({ username });
		if (!user) {
			console.log("[LOGIN] User not found:", username);
			return res.status(401).json({ error: "Usuário não encontrado" });
		}

		const valid = await bcrypt.compare(password, user.password);
		if (!valid) {
			console.log("[LOGIN] Incorrect password for user:", username);
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

		console.log("[LOGIN] Login successful for user:", username);
		res.json({ token, role: user.role });
	} catch (err) {
		console.error("[LOGIN ERROR]", err.message);
		res.status(500).json({ error: "Erro no login." });
	}
};

exports.register = async (req, res) => {
	console.log("[REGISTER] Registration attempt started");
	const { username, password, officerName, role } = req.body;

	if (!username || !password || !officerName || !role) {
		console.log("[REGISTER] Missing required fields");
		return res.status(400).json({ error: "Todos os campos são obrigatórios." });
	}

	try {
		const existingUser = await User.findOne({ username });
		if (existingUser) {
			console.log("[REGISTER] User already exists:", username);
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

		console.log("[REGISTER] User registered successfully:", username);
		res.status(201).json({ message: "Usuário registrado com sucesso." });
	} catch (err) {
		console.error("[REGISTER ERROR]", err.message);
		res.status(500).json({ error: "Erro no registro do usuário." });
	}
};

exports.changePassword = async (req, res) => {
	console.log("[CHANGE PASSWORD] Password change attempt started");
	const { currentPassword, newPassword } = req.body;
	const userId = req.user.id;

	if (!currentPassword || !newPassword) {
		console.log("[CHANGE PASSWORD] Missing required fields");
		return res.status(400).json({ error: "Preencha todos os campos." });
	}

	try {
		const user = await User.findById(userId);
		if (!user) {
			console.log("[CHANGE PASSWORD] User not found:", userId);
			return res.status(404).json({ error: "Usuário não encontrado." });
		}

		const isMatch = await bcrypt.compare(currentPassword, user.password);
		if (!isMatch) {
			console.log("[CHANGE PASSWORD] Incorrect current password for user:", userId);
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

		console.log("[CHANGE PASSWORD] Password changed successfully for user:", userId);
		res.json({ message: "Senha alterada com sucesso." });
	} catch (err) {
		console.error("[CHANGE PASSWORD ERROR]", err.message);
		res.status(500).json({ error: "Erro ao alterar a senha." });
	}
};
