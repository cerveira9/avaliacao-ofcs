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

	console.info("[INFO] - Iniciando cadastro de avaliação.");
	try {
		console.debug(`[DEBUG] - Buscando oficial com ID ${officerId}.`);
		const officer = await Officer.findById(officerId);
		if (!officer) {
			console.warn(`[WARN] - Oficial com ID ${officerId} não encontrado.`);
			return res.status(404).json({ error: "Oficial não encontrado." });
		}

		console.debug("[DEBUG] - Criando nova avaliação.");
		const newEval = new Evaluation({
			officer: officerId,
			evaluator: req.user.id,
			rankAtEvaluation: officer.rank,
			skills,
		});

		await newEval.save();
		console.info(`[INFO] - Avaliação criada com sucesso. ID: ${newEval._id}`);

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
	console.info("[INFO] - Buscando oficiais avaliados recentemente.");
	try {
		const evaluations = await Evaluation.find()
			.sort({ date: -1 })
			.limit(10)
			.populate({
				path: "officer",
				select: "name rank",
			})
			.populate({
				path: "evaluator",
				select: "officerName",
			});

		console.debug("[DEBUG] - Processando avaliações recentes.");
		const recentEvaluatedOfficers = evaluations
			.map((evaluation) => {
				if (!evaluation.officer || !evaluation.evaluator) {
					console.error(
						`[ERROR] - Avaliação com ID ${evaluation._id} possui dados incompletos.`
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
			.filter(Boolean);

		console.info("[INFO] - Oficiais avaliados recentemente obtidos com sucesso.");
		res.status(200).json(recentEvaluatedOfficers);
	} catch (err) {
		console.error("[ERRO AVALIAÇÃO - /oficiaisAvaliadosRecentes]", err.message);
		res.status(500).json({ error: "Erro ao buscar oficiais avaliados." });
	}
});

router.get("/:officerId", async (req, res) => {
	const { officerId } = req.params;
	console.info(`[INFO] - Buscando avaliações para o oficial com ID ${officerId}.`);
	try {
		const evaluations = await Evaluation.find({ officer: officerId })
			.populate("evaluator", "officerName")
			.sort({ date: -1 });

		console.info(`[INFO] - Avaliações para o oficial ${officerId} obtidas com sucesso.`);
		res.json(evaluations);
	} catch (err) {
		console.error(`[ERRO AVALIAÇÃO - /:officerId]`, err.message);
		res.status(500).json({ error: "Erro ao buscar avaliações do oficial." });
	}
});

router.delete(
	"/deletarAvaliacao/:id",
	authenticateToken,
	requireAdmin,
	async (req, res) => {
		const { id } = req.params;

		console.info(`[INFO] - Iniciando exclusão da avaliação com ID ${id}.`);
		try {
			const evaluation = await Evaluation.findById(id).populate(
				"officer evaluator"
			);
			if (!evaluation) {
				console.warn(`[WARN] - Avaliação com ID ${id} não encontrada.`);
				return res.status(404).json({ error: "Avaliação não encontrada." });
			}

			console.debug("[DEBUG] - Excluindo avaliação.");
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

			console.info(`[INFO] - Avaliação com ID ${id} deletada com sucesso.`);
			res.json({ message: "Avaliação deletada com sucesso." });
		} catch (err) {
			console.error("[ERRO AVALIAÇÃO - /deletarAvaliacao/:id]", err.message);
			res.status(500).json({ error: "Erro ao deletar avaliação." });
		}
	}
);

module.exports = router;
