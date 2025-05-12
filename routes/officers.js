const express = require("express");
const router = express.Router();
const Officer = require("../models/Officer");
const validate = require("../middleware/validate");
const officerSchema = require("../schemas/officerSchema");
const { authenticateToken } = require("../middleware/authMiddleware");
const logAction = require("../utils/logAction");
const logger = require("../utils/logger");
const redis = require("../utils/redisClient");

/**
 * @swagger
 * tags:
 *   name: Oficiais
 *   description: Gerenciamento de oficiais
 */

/**
 * @swagger
 * /officers/cadastroOficial:
 *   post:
 *     summary: Cadastra um novo oficial
 *     tags: [Oficiais]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               rank:
 *                 type: string
 *                 example: Cadete
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: 2025-04-01
 *     responses:
 *       201:
 *         description: Oficial cadastrado com sucesso
 *       500:
 *         description: Erro ao cadastrar oficial
 */
router.post(
	"/cadastroOficial",
	authenticateToken,
	validate(officerSchema),
	async (req, res) => {
		const { name, rank, startDate } = req.body;
		logger.info(`[CADASTRO OFICIAL] - /cadastroOficial - Requisição recebida`);
		try {
			const newOfficer = new Officer({ name, rank, startDate });
			await newOfficer.save();

			// Invalida o cache relacionado
			await redis.del("officers:all");
			await redis.del("officers:total");

			logger.info(
				`[CADASTRO OFICIAL] - Oficial ${name} cadastrado com sucesso`
			);
			res.status(201).json(newOfficer);
		} catch (error) {
			logger.error(
				`[CADASTRO OFICIAL] - Erro ao cadastrar oficial: ${error.message}`
			);
			res.status(500).json({ error: "Erro ao cadastrar oficial." });
		}
	}
);

/**
 * @swagger
 * /officers/mostrarOficiais:
 *   get:
 *     summary: Lista todos os oficiais
 *     tags: [Oficiais]
 *     responses:
 *       200:
 *         description: Lista de oficiais
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   rank:
 *                     type: string
 *                   startDate:
 *                     type: string
 *                     format: date
 *       500:
 *         description: Erro ao buscar oficiais
 */
router.get("/mostrarOficiais", async (req, res) => {
	const hierarchy = [
		"Cadete",
		"Patrol Officer",
		"Police Officer",
		"Senior Officer",
		"Deputy",
		"Senior Deputy",
		"Undersheriff",
		"Sheriff",
		"Forest Ranger",
		"Tracker Ranger",
		"Senior Ranger",
		"Captain Ranger",
		"Commissioner",
		"Deputy Marshal",
		"Marshal",
	];

	const cacheKey = "officers:all"; // Chave única para armazenar os dados no Redis

	try {
		// Verifica se os dados estão no cache
		const cachedData = await redis.get(cacheKey);
		if (cachedData) {
			logger.info("[MOSTRAR OFICIAIS] - Dados retornados do cache");
			return res.status(200).json(JSON.parse(cachedData));
		}

		// Consulta o banco de dados se os dados não estiverem no cache
		const officers = await Officer.find();

		// Ordena os oficiais pela hierarquia
		const ordered = officers.sort((a, b) => {
			const rankA = hierarchy.indexOf(a.rank);
			const rankB = hierarchy.indexOf(b.rank);
			return rankA - rankB;
		});

		// Armazena os dados no cache com um tempo de expiração (TTL)
		await redis.set(cacheKey, JSON.stringify(ordered), "EX", 60 * 5); // Expira em 5 minutos

		logger.info("[MOSTRAR OFICIAIS] - Dados armazenados no cache");
		res.status(200).json(ordered);
	} catch (error) {
		logger.error(
			`[MOSTRAR OFICIAIS] - Erro ao buscar oficiais: ${error.message}`
		);
		res.status(500).json({ error: "Erro ao buscar oficiais" });
	}
});

/**
 * @swagger
 * /officers/promocoesRecentes:
 *   get:
 *     summary: Lista as promoções recentes
 *     tags: [Oficiais]
 *     responses:
 *       200:
 *         description: Lista de promoções recentes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   newRank:
 *                     type: string
 *                   promotedAt:
 *                     type: string
 *                     format: date-time
 *       500:
 *         description: Erro ao buscar promoções recentes
 */
router.get("/promocoesRecentes", async (req, res) => {
	const cacheKey = "officers:recentPromotions"; // Chave única para o cache

	try {
		// Verifica se os dados estão no cache
		const cachedData = await redis.get(cacheKey);
		if (cachedData) {
			logger.info("[PROMOÇÕES RECENTES] - Dados retornados do cache");
			return res.status(200).json(JSON.parse(cachedData));
		}

		// Consulta o banco de dados se os dados não estiverem no cache
		const recentPromotions = await Officer.find({ promotedAt: { $ne: null } })
			.sort({ promotedAt: -1 })
			.limit(10)
			.select("name rank promotedAt");

		const formattedPromotions = recentPromotions.map((officer) => ({
			name: officer.name,
			newRank: officer.rank,
			promotedAt: officer.promotedAt,
		}));

		// Armazena os dados no cache com um tempo de expiração (TTL)
		await redis.set(
			cacheKey,
			JSON.stringify(formattedPromotions),
			"EX",
			60 * 5
		); // Expira em 5 minutos

		logger.info("[PROMOÇÕES RECENTES] - Dados armazenados no cache");
		res.status(200).json(formattedPromotions);
	} catch (error) {
		logger.error(
			`[PROMOÇÕES RECENTES] - Erro ao buscar promoções recentes: ${error.message}`
		);
		res.status(500).json({ error: "Erro ao buscar promoções recentes" });
	}
});

/**
 * @swagger
 * /officers/totalOficiais:
 *   get:
 *     summary: Retorna o total de oficiais cadastrados
 *     tags: [Oficiais]
 *     responses:
 *       200:
 *         description: Total de oficiais cadastrados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   example: 42
 *       500:
 *         description: Erro ao buscar total de oficiais
 */
router.get("/totalOficiais", async (req, res) => {
	const cacheKey = "officers:total"; // Chave única para o cache

	try {
		// Verifica se os dados estão no cache
		const cachedData = await redis.get(cacheKey);
		if (cachedData) {
			logger.info("[TOTAL OFICIAIS] - Dados retornados do cache");
			return res.status(200).json(JSON.parse(cachedData));
		}

		// Consulta o banco de dados se os dados não estiverem no cache
		const total = await Officer.countDocuments();

		// Armazena os dados no cache com um tempo de expiração (TTL)
		await redis.set(cacheKey, JSON.stringify({ total }), "EX", 60 * 5); // Expira em 5 minutos

		logger.info("[TOTAL OFICIAIS] - Dados armazenados no cache");
		res.status(200).json({ total });
	} catch (error) {
		logger.error(
			`[TOTAL OFICIAIS][ERROR] - Erro ao buscar total de oficiais: ${error.message}`
		);
		res.status(500).json({ error: "Erro ao buscar total de oficiais" });
	}
});

/**
 * @swagger
 * /officers/atualizarOficial/{id}:
 *   put:
 *     summary: Atualiza os dados de um oficial
 *     tags: [Oficiais]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do oficial
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               rank:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Oficial atualizado com sucesso
 *       404:
 *         description: Oficial não encontrado
 *       500:
 *         description: Erro ao atualizar o oficial
 */
router.put("/atualizarOficial/:id", authenticateToken, async (req, res) => {
	const { id } = req.params;
	const { name, rank, startDate } = req.body;
	logger.info(
		`[ATUALIZAR OFICIAL] - /:id - Requisição recebida para ID: ${id}`
	);

	try {
		logger.info(`[ATUALIZAR OFICIAL] - /:id - Buscando oficial`);
		const original = await Officer.findById(id);
		if (!original) {
			logger.error(`[ATUALIZAR OFICIAL][404] - /:id - Oficial não encontrado`);
			return res.status(404).json({ error: "Oficial não encontrado" });
		}

		const changes = {};
		if (original.name !== name)
			changes.name = { before: original.name, after: name };
		if (original.rank !== rank)
			changes.rank = { before: original.rank, after: rank };
		if (
			new Date(original.startDate).toISOString() !==
			new Date(startDate).toISOString()
		) {
			changes.startDate = {
				before: new Date(original.startDate).toISOString(),
				after: new Date(startDate).toISOString(),
			};
		}

		logger.info(`[ATUALIZAR OFICIAL] - /:id - Atualizando oficial`);
		const updatedOfficer = await Officer.findByIdAndUpdate(
			id,
			{ name, rank, startDate },
			{ new: true, runValidators: true }
		);

		if (Object.keys(changes).length > 0) {
			await logAction({
				req,
				action: "update",
				user: req.user,
				target: { entity: "Officer", id: updatedOfficer._id },
				metadata: { changes, name },
			});
		}

		// Invalida o cache relacionado
		await redis.del("officers:all"); // Invalida o cache da listagem de oficiais
		await redis.del("officers:total"); // Invalida o cache do total de oficiais
		await redis.del("officers:recentPromotions"); // Invalida o cache de promoções recentes

		logger.info(`[ATUALIZAR OFICIAL] - /:id - Oficial atualizado com sucesso`);
		res.status(200).json(updatedOfficer);
	} catch (error) {
		logger.error(
			`[ATUALIZAR OFICIAL][ERROR] - /:id - Erro ao atualizar oficial: ${error.message}`
		);
		res.status(500).json({ error: "Erro ao atualizar o oficial" });
	}
});

/**
 * @swagger
 * /officers/deletarOficial/{id}:
 *   delete:
 *     summary: Deleta um oficial
 *     tags: [Oficiais]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do oficial
 *     responses:
 *       200:
 *         description: Oficial deletado com sucesso
 *       404:
 *         description: Oficial não encontrado
 *       500:
 *         description: Erro ao deletar o oficial
 */
router.delete("/deletarOficial/:id", authenticateToken, async (req, res) => {
	const { id } = req.params;
	logger.info(`[DELETAR OFICIAL] - Requisição recebida para ID: ${id}`);

	try {
		const deletedOfficer = await Officer.findByIdAndDelete(id);

		if (!deletedOfficer) {
			return res.status(404).json({ error: "Oficial não encontrado" });
		}

		// Invalida o cache relacionado
		await redis.del("officers:all");
		await redis.del("officers:total");

		logger.info(`[DELETAR OFICIAL] - Oficial deletado com sucesso`);
		res.status(200).json({ message: "Oficial deletado com sucesso" });
	} catch (error) {
		logger.error(
			`[DELETAR OFICIAL][ERROR] - Erro ao deletar oficial: ${error.message}`
		);
		res.status(500).json({ error: "Erro ao deletar o oficial" });
	}
});

router.put("/promoverOficial/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    logger.info(
        `[PROMOVER OFICIAL] - /promoverOficial/:id - Requisição recebida para ID: ${id}`
    );

    const hierarchy = [
        "Cadete",
        "Patrol Officer",
        "Police Officer",
        "Senior Officer",
        "Deputy",
        "Senior Deputy",
        "Undersheriff / Deputy Chief",
        "Sheriff / Chief of Police",
        "Forest Ranger",
        "Tracker Ranger",
        "Senior Ranger",
        "Captain Ranger",
        "Commissioner",
        "Deputy Marshal",
        "Marshal",
    ];

    try {
        logger.info(`[PROMOVER OFICIAL] - /promoverOficial/:id - Buscando oficial`);
        const officer = await Officer.findById(id);
        if (!officer) {
            logger.error(
                `[PROMOVER OFICIAL][404] - /promoverOficial/:id - Oficial não encontrado`
            );
            return res.status(404).json({ error: "Oficial não encontrado" });
        }

        const currentRankIndex = hierarchy.indexOf(officer.rank);
        if (currentRankIndex === -1 || currentRankIndex === hierarchy.length - 1) {
            logger.warn(
                `[PROMOVER OFICIAL][400] - /promoverOficial/:id - Oficial já está na patente mais alta`
            );
            return res
                .status(400)
                .json({ error: "Oficial já está na patente mais alta" });
        }

        const oldRank = officer.rank;
        officer.rank = hierarchy[currentRankIndex + 1];
        officer.promotedAt = new Date();
        await officer.save();

        logger.info(
            `[PROMOVER OFICIAL] - /promoverOficial/:id - Oficial promovido de ${oldRank} para ${officer.rank}`
        );
        await logAction({
            req,
            action: "promote",
            user: req.user,
            target: { entity: "Officer", id: officer._id },
            metadata: {
                oldRank,
                newRank: officer.rank,
                name: officer.name,
                promotedAt: officer.promotedAt,
            },
        });

        // Invalida o cache relacionado
        await redis.del("officers:all"); // Invalida o cache da listagem de oficiais
        await redis.del("officers:total"); // Invalida o cache do total de oficiais
        await redis.del("officers:recentPromotions"); // Invalida o cache de promoções recentes

        res.json({
            message: "Promoção realizada com sucesso",
            newRank: officer.rank,
        });
    } catch (error) {
        logger.error(
            `[PROMOVER OFICIAL][ERROR] - /promoverOficial/:id - Erro ao promover oficial: ${error.message}`
        );
        res.status(500).json({ error: "Erro ao promover oficial" });
    }
});

module.exports = router;
