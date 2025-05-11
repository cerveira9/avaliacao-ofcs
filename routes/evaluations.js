const express = require("express");
const router = express.Router();
const Evaluation = require("../models/Evaluation");
const Officer = require("../models/Officer");
const validate = require("../middleware/validate");
const evaluationSchema = require("../schemas/evaluationSchema");
const {
	authenticateToken,
	requireAdmin,
} = require("../middleware/authMiddleware");
const logAction = require("../utils/logAction");

router.post("/cadastrarAvaliacao", authenticateToken, validate(evaluationSchema), async (req, res) => {
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
			user: req.user,
			target: { entity: "Evaluation", id: newEval.officer },
			metadata: {
				officerName: officer.name,
				scores: skills,
			},
		});

		res.status(201).json(newEval);
	} catch (err) {
		console.error("[ERRO CADASTRO AVALIAÇÃO] - /cadastrarAvaliacao", err.message);
		res.status(500).json({ error: "Erro ao salvar avaliação." });
	}
});

router.get("/oficiaisAvaliadosRecentes", async (req, res) => {
	try {
		const evaluations = await Evaluation.find()
			.sort({ date: -1 }) // Ordena pela data mais recente
			.limit(10)
			.populate({
				path: "officer",
				select: "name rank", // Seleciona apenas os campos necessários
			})
			.populate({
				path: "evaluator",
				select: "officerName", // Seleciona apenas o nome do avaliador
			});

		// Verifica se os dados foram populados corretamente
		const recentEvaluatedOfficers = evaluations
			.map((evaluation) => {
				if (!evaluation.officer || !evaluation.evaluator) {
					console.error(
						`Erro: Avaliação com ID ${evaluation._id} possui dados incompletos.`
					);
					return null;
				}

				return {
					name: evaluation.officer.name,
					rank: evaluation.officer.rank,
					date: evaluation.date,
					evaluator: evaluation.evaluator.officerName,
				};
			})
			.filter(Boolean); // Remove avaliações com dados incompletos

		res.status(200).json(recentEvaluatedOfficers);
	} catch (err) {
		console.error("[ERRO AVALIAÇÃO - ]", err.message);
		res.status(500).json({ error: "Erro ao buscar oficiais avaliados." });
	}
});

router.get("/:officerId", async (req, res) => {
	const evaluations = await Evaluation.find({ officer: req.params.officerId })
		.populate("evaluator", "officerName")
		.sort({ date: -1 });

	res.json(evaluations);
});

router.delete(
	"/deletarAvaliacao/:id",
	authenticateToken,
	requireAdmin,
	async (req, res) => {
		const { id } = req.params;

		try {
			const evaluation = await Evaluation.findById(id).populate(
				"officer evaluator"
			);
			if (!evaluation) {
				return res.status(404).json({ error: "Avaliação não encontrada." });
			}

			// Substituir evaluation.remove() por deleteOne
			await Evaluation.deleteOne({ _id: id });

			await logAction({
				req,
				action: "delete",
				user: req.user,
				target: { entity: "Evaluation", id: evaluation._id },
				metadata: {
					officerName: evaluation.officer?.name || "Desconhecido",
					scores: evaluation.skills || {},
					evaluator: evaluation.evaluator?.officerName || "Desconhecido",
				},
			});

			res.json({ message: "Avaliação deletada com sucesso." });
		} catch (err) {
			console.error("[ERRO AVALIAÇÃO - /deletarAvaliacao/:id]", err.message);
			res.status(500).json({ error: "Erro ao deletar avaliação." });
		}
	}
);

module.exports = router;
