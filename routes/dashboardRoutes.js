const express = require("express");
const router = express.Router();
const Evaluation = require("../models/Evaluation");
const Officer = require("../models/Officer");
const { authenticateToken } = require("../middleware/authMiddleware");
const logger = require("../utils/logger"); // Assuming you have a logger utility

/**
 * @swagger
 * /analytics:
 *   get:
 *     summary: Fetch dashboard analytics
 *     description: Returns total officers, total evaluations, evaluated officers, and average skills.
 *     responses:
 *       200:
 *         description: Successfully fetched analytics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalOfficers:
 *                   type: integer
 *                 totalEvaluations:
 *                   type: integer
 *                 evaluatedOfficers:
 *                   type: integer
 *                 averageSkills:
 *                   type: object
 *       500:
 *         description: Internal server error
 */
router.get("/analytics", async (req, res) => {
	logger.info("GET /analytics - Fetching dashboard analytics");
	try {
		const totalOfficers = await Officer.countDocuments();
		logger.info(`Total officers: ${totalOfficers}`);

		const totalEvaluations = await Evaluation.countDocuments();
		logger.info(`Total evaluations: ${totalEvaluations}`);

		const evaluatedOfficers = await Evaluation.distinct("officer");
		logger.info(`Total evaluated officers: ${evaluatedOfficers.length}`);

		const averageSkills = await Evaluation.aggregate([
			{
				$group: {
					_id: null,
					montarOcorrencia: { $avg: "$skills.montarOcorrencia" },
					abordagem: { $avg: "$skills.abordagem" },
					registroIdentidade: { $avg: "$skills.registroIdentidade" },
					negociacao: { $avg: "$skills.negociacao" },
					efetuarPrisao: { $avg: "$skills.efetuarPrisao" },
					posicionamentoPatrulha: { $avg: "$skills.posicionamentoPatrulha" },
					conhecimentoLeis: { $avg: "$skills.conhecimentoLeis" },
				},
			},
		]);
		logger.info("Average skills calculated");

		res.json({
			totalOfficers,
			totalEvaluations,
			evaluatedOfficers: evaluatedOfficers.length,
			averageSkills: averageSkills[0] || {},
		});
	} catch (err) {
		logger.error("[DASHBOARD ANALYTICS] Error:", err.message);
		res.status(500).json({ error: "Erro ao carregar dados do dashboard." });
	}
});

/**
 * @swagger
 * /analytics/{officerId}:
 *   get:
 *     summary: Fetch analytics for a specific officer
 *     description: Returns evaluations, ranks, and average skills for a specific officer.
 *     parameters:
 *       - in: path
 *         name: officerId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the officer
 *     responses:
 *       200:
 *         description: Successfully fetched officer analytics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 officerId:
 *                   type: string
 *                 totalEvaluations:
 *                   type: integer
 *                 ranks:
 *                   type: array
 *                   items:
 *                     type: string
 *                 evaluationsByRank:
 *                   type: object
 *                 averageSkills:
 *                   type: object
 *       500:
 *         description: Internal server error
 */
router.get("/analytics/:officerId", authenticateToken, async (req, res) => {
	const { officerId } = req.params;
	logger.info(`GET /analytics/${officerId} - Fetching analytics for officer`);

	try {
		const evaluations = await Evaluation.find({ officer: officerId });
		logger.info(`Found ${evaluations.length} evaluations for officer ${officerId}`);

		if (!evaluations.length) {
			logger.warn(`No evaluations found for officer ${officerId}`);
			return res.json({
				officerId,
				totalEvaluations: 0,
				ranks: [],
				averageSkills: {},
				evaluationsByRank: {},
			});
		}

		const groupedByRank = {};
		const evaluationsByRank = {};

		for (const evaluation of evaluations) {
			const rank = evaluation.rankAtEvaluation || "Desconhecido";
			if (!groupedByRank[rank]) {
				groupedByRank[rank] = [];
				evaluationsByRank[rank] = 0;
			}
			groupedByRank[rank].push(evaluation.skills);
			evaluationsByRank[rank]++;
		}
		logger.info("Grouped evaluations by rank");

		const average = (data) => {
			const result = {};
			const count = data.length;
			for (const skill of data) {
				for (const [key, value] of Object.entries(skill)) {
					result[key] = (result[key] || 0) + value;
				}
			}
			for (const key in result) result[key] = (result[key] / count).toFixed(2);
			return result;
		};

		const response = {
			officerId,
			totalEvaluations: evaluations.length,
			ranks: Object.keys(groupedByRank),
			evaluationsByRank,
			averageSkills: {
				geral: average(evaluations.map((e) => e.skills)),
			},
		};

		for (const [rank, evals] of Object.entries(groupedByRank)) {
			response.averageSkills[rank] = average(evals);
		}
		logger.info("Calculated average skills for officer");

		res.json(response);
	} catch (err) {
		logger.error("[DASHBOARD OFICIAL] Error:", err.message);
		res.status(500).json({ error: "Erro ao gerar estatísticas do oficial." });
	}
});

/**
 * @swagger
 * /ranking:
 *   get:
 *     summary: Fetch ranking of top officers
 *     description: Returns the top 10 officers based on average skill scores.
 *     responses:
 *       200:
 *         description: Successfully fetched ranking
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   officerId:
 *                     type: string
 *                   name:
 *                     type: string
 *                   rank:
 *                     type: string
 *                   avgScore:
 *                     type: number
 *                   evaluations:
 *                     type: integer
 *       500:
 *         description: Internal server error
 */
router.get("/ranking", async (req, res) => {
	logger.info("GET /ranking - Fetching ranking of top officers");
	try {
		const ranking = await Evaluation.aggregate([
			{
				$addFields: {
					averageScore: {
						$avg: [
							"$skills.montarOcorrencia",
							"$skills.abordagem",
							"$skills.registroIdentidade",
							"$skills.negociacao",
							"$skills.efetuarPrisao",
							"$skills.posicionamentoPatrulha",
							"$skills.conhecimentoLeis",
						],
					},
				},
			},
			{
				$group: {
					_id: "$officer",
					avgScore: { $avg: "$averageScore" },
					count: { $sum: 1 },
				},
			},
			{
				$sort: { avgScore: -1 },
			},
			{
				$limit: 10,
			},
			{
				$lookup: {
					from: "officers",
					localField: "_id",
					foreignField: "_id",
					as: "officer",
				},
			},
			{
				$unwind: "$officer",
			},
			{
				$project: {
					_id: 0,
					officerId: "$officer._id",
					name: "$officer.name",
					rank: "$officer.rank",
					avgScore: 1,
					evaluations: "$count",
				},
			},
		]);
		logger.info("Ranking calculated successfully");

		res.json(ranking);
	} catch (err) {
		logger.error("[DASHBOARD RANKING] Error:", err.message);
		res.status(500).json({ error: "Erro ao calcular ranking." });
	}
});

module.exports = router;
