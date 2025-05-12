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
const redis = require("../utils/redisClient");

/**
 * @swagger
 * /cadastrarAvaliacao:
 *   post:
 *     summary: Cadastrar uma nova avaliação
 *     tags: [Avaliações]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               officerId:
 *                 type: string
 *                 description: ID do oficial a ser avaliado
 *               skills:
 *                 type: object
 *                 description: Habilidades avaliadas
 *     responses:
 *       201:
 *         description: Avaliação criada com sucesso
 *       404:
 *         description: Oficial não encontrado
 *       500:
 *         description: Erro ao salvar avaliação
 */
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

        // Invalida o cache relacionado
        await redis.del("evaluations:recentEvaluatedOfficers"); // Invalida o cache de avaliações recentes
        await redis.del(`evaluations:officer:${officerId}`); // Invalida o cache das avaliações do oficial

        res.status(201).json(newEval);
    } catch (err) {
        console.error("[ERRO CADASTRO AVALIAÇÃO] - /cadastrarAvaliacao", err.message);
        res.status(500).json({ error: "Erro ao salvar avaliação." });
    }
});

/**
 * @swagger
 * /oficiaisAvaliadosRecentes:
 *   get:
 *     summary: Obter oficiais avaliados recentemente
 *     tags: [Avaliações]
 *     responses:
 *       200:
 *         description: Lista de oficiais avaliados recentemente
 *       500:
 *         description: Erro ao buscar oficiais avaliados
 */
router.get("/oficiaisAvaliadosRecentes", async (req, res) => {
    console.info("[INFO] - Buscando oficiais avaliados recentemente.");
    const cacheKey = "evaluations:recentEvaluatedOfficers"; // Chave única para o cache

    try {
        // Verifica se os dados estão no cache
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            console.info("[INFO] - Dados retornados do cache.");
            return res.status(200).json(JSON.parse(cachedData));
        }

        // Consulta o banco de dados se os dados não estiverem no cache
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

        // Armazena os dados no cache com um tempo de expiração (TTL)
        await redis.set(
            cacheKey,
            JSON.stringify(recentEvaluatedOfficers),
            "EX",
            60 * 5 // Expira em 5 minutos
        );

        console.info("[INFO] - Dados armazenados no cache.");
        res.status(200).json(recentEvaluatedOfficers);
    } catch (err) {
        console.error("[ERRO AVALIAÇÃO - /oficiaisAvaliadosRecentes]", err.message);
        res.status(500).json({ error: "Erro ao buscar oficiais avaliados." });
    }
});

/**
 * @swagger
 * /{officerId}:
 *   get:
 *     summary: Obter avaliações de um oficial específico
 *     tags: [Avaliações]
 *     parameters:
 *       - in: path
 *         name: officerId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do oficial
 *     responses:
 *       200:
 *         description: Lista de avaliações do oficial
 *       500:
 *         description: Erro ao buscar avaliações do oficial
 */
router.get("/:officerId", async (req, res) => {
    const { officerId } = req.params;
    const cacheKey = `evaluations:officer:${officerId}`; // Chave única para o cache

    try {
        // Verifica se os dados estão no cache
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            console.info("[INFO] - Dados retornados do cache.");
            return res.status(200).json(JSON.parse(cachedData));
        }

        // Consulta o banco de dados se os dados não estiverem no cache
        const evaluations = await Evaluation.find({ officer: officerId })
            .populate("evaluator", "officerName")
            .sort({ date: -1 });

        // Armazena os dados no cache com um tempo de expiração (TTL)
        await redis.set(cacheKey, JSON.stringify(evaluations), "EX", 60 * 5); // Expira em 5 minutos

        console.info("[INFO] - Dados armazenados no cache.");
        res.json(evaluations);
    } catch (err) {
        console.error(`[ERRO AVALIAÇÃO - /:officerId]`, err.message);
        res.status(500).json({ error: "Erro ao buscar avaliações do oficial." });
    }
});

/**
 * @swagger
 * /deletarAvaliacao/{id}:
 *   delete:
 *     summary: Deletar uma avaliação
 *     tags: [Avaliações]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da avaliação
 *     responses:
 *       200:
 *         description: Avaliação deletada com sucesso
 *       404:
 *         description: Avaliação não encontrada
 *       500:
 *         description: Erro ao deletar avaliação
 */
router.delete("/deletarAvaliacao/:id", authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;

    console.info(`[INFO] - Iniciando exclusão da avaliação com ID ${id}.`);
    try {
        const evaluation = await Evaluation.findById(id).populate("officer evaluator");
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

        // Invalida o cache relacionado
        await redis.del("evaluations:recentEvaluatedOfficers"); // Invalida o cache de avaliações recentes
        await redis.del(`evaluations:officer:${evaluation.officer._id}`); // Invalida o cache das avaliações do oficial

        console.info(`[INFO] - Avaliação com ID ${id} deletada com sucesso.`);
        res.json({ message: "Avaliação deletada com sucesso." });
    } catch (err) {
        console.error("[ERRO AVALIAÇÃO - /deletarAvaliacao/:id]", err.message);
        res.status(500).json({ error: "Erro ao deletar avaliação." });
    }
});

module.exports = router;
