const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const logAction = require("../utils/logAction");

exports.login = async (req, res) => {
	const { username, password } = req.body;

	const user = await User.findOne({ username });
	if (!user) return res.status(401).json({ error: "Usuário não encontrado" });

	const valid = await bcrypt.compare(password, user.password);
	if (!valid) return res.status(401).json({ error: "Senha incorreta" });

	const token = jwt.sign(
		{ id: user._id, role: user.role },
		process.env.JWT_SECRET,
		{ expiresIn: "8h" }
	);

	await logAction({
		req,
		action: "login",
		user: { id: user._id, role: user.role },
		target: { entity: "User", id: user._id },
		metadata: { username },
	});

	res.json({ token, role: user.role });
};

exports.register = async (req, res) => {
	const { username, password, officerName, role } = req.body;

	if (!username || !password || !officerName || !role) {
		return res.status(400).json({ error: "Todos os campos são obrigatórios." });
	}

	try {
		const existingUser = await User.findOne({ username });
		if (existingUser)
			return res.status(400).json({ error: "Usuário já existe." });

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

		res.status(201).json({ message: "Usuário registrado com sucesso." });
	} catch (err) {
		console.error("[ERRO REGISTER]", err.message);
		res.status(500).json({ error: "Erro no registro do usuário." });
	}
};

exports.changePassword = async (req, res) => {
	const { currentPassword, newPassword } = req.body;
	const userId = req.user.id;

	if (!currentPassword || !newPassword) {
		return res.status(400).json({ error: "Preencha todos os campos." });
	}

	try {
		const user = await User.findById(userId);
		if (!user)
			return res.status(404).json({ error: "Usuário não encontrado." });

		const isMatch = await bcrypt.compare(currentPassword, user.password);
		if (!isMatch)
			return res.status(401).json({ error: "Senha atual incorreta." });

		const hashed = await bcrypt.hash(newPassword, 10);
		user.password = hashed;
		await user.save();

		await logAction({
			req,
			action: "change_password",
			user: req.user,
			target: { entity: "User", id: user._id },
		});

		res.json({ message: "Senha alterada com sucesso." });
	} catch (err) {
		console.error("[ERRO ALTERAR SENHA]", err.message);
		res.status(500).json({ error: "Erro ao alterar a senha." });
	}
};
