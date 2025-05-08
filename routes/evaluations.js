const express = require("express");
const router = express.Router();
const Evaluation = require("../models/Evaluation");
const Officer = require("../models/Officer");
const { authenticateToken } = require("../middleware/authMiddleware");
const logAction = require("../utils/logAction");

router.post("/cadastrarAvaliacao", authenticateToken, async (req, res) => {
	const { officerId, skills } = req.body;

	try {
		const officer = await Officer.findById(officerId);
		if (!officer)
			return res.status(404).json({ error: "Oficial não encontrado." });

		const newEval = new Evaluation({
			officer: officerId,
			evaluator: req.user.id,
			rankAtEvaluation: officer.rank,
			skills,
		});

		await newEval.save();

		await logAction({
			req,
			action: "create",
			user: req.user, // vindo do middleware authenticateToken
			target: { entity: "Evaluation", id: newEval._id },
			metadata: { score: skills },
		});

		res.json(newEval);
	} catch (err) {
		console.error("[ERRO AVALIAÇÃO]", err.message);
		res.status(500).json({ error: "Erro ao salvar avaliação." });
	}
});

router.get("/:officerId", async (req, res) => {
	const evaluations = await Evaluation.find({ officer: req.params.officerId })
		.populate("evaluator", "officerName")
		.sort({ date: -1 });

	res.json(evaluations);
});

module.exports = router;
