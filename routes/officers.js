const express = require("express");
const router = express.Router();
const Officer = require("../models/Officer");
const validate = require("../middleware/validate");
const officerSchema = require("../schemas/officerSchema");
const { authenticateToken } = require("../middleware/authMiddleware");
const logAction = require("../utils/logAction");
const logger = require("../utils/logger");

router.post(
	"/cadastroOficial",
	authenticateToken,
	validate(officerSchema),
	async (req, res) => {
		const { name, rank, startDate } = req.body;
		logger.info(`[CADASTRO OFICIAL] - /cadastroOficial - Requisição recebida`);
		try {
			logger.info(
				`[CADASTRO OFICIAL] - /cadastroOficial - Iniciando cadastro do oficial ${name}`
			);
			const newOfficer = new Officer({ name, rank, startDate });
			await newOfficer.save();

			await logAction({
				req,
				action: "create",
				user: req.user,
				target: { entity: "Officer", id: newOfficer._id },
				metadata: { name, rank },
			});

			logger.info(
				`[CADASTRO OFICIAL] - /cadastroOficial - Oficial ${name} cadastrado com sucesso`
			);
			res.status(201).json(newOfficer);
		} catch (error) {
			logger.error(
				`[CADASTRO OFICIAL] - /cadastroOficial - Erro ao cadastrar oficial: ${error.message}`
			);
			res.status(500).json({ error: "Erro ao cadastrar oficial." });
		}
	}
);

router.get("/mostrarOficiais", async (req, res) => {
	logger.info(`[MOSTRAR OFICIAIS] - /mostrarOficiais - Requisição recebida`);
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
		logger.info(`[MOSTRAR OFICIAIS] - /mostrarOficiais - Buscando oficiais`);
		const officers = await Officer.find();

		const ordered = officers.sort((a, b) => {
			const rankA = hierarchy.indexOf(a.rank);
			const rankB = hierarchy.indexOf(b.rank);
			return rankA - rankB;
		});

		logger.info(
			`[MOSTRAR OFICIAIS] - /mostrarOficiais - ${ordered.length} oficiais encontrados`
		);
		res.status(200).json(ordered);
	} catch (error) {
		logger.error(
			`[MOSTRAR OFICIAIS] - /mostrarOficiais - Erro ao buscar oficiais: ${error.message}`
		);
		res.status(500).json({ error: "Erro ao buscar oficiais" });
	}
});

router.get("/promocoesRecentes", async (req, res) => {
	logger.info(
		`[PROMOÇÕES RECENTES] - /promocoesRecentes - Requisição recebida`
	);
	try {
		logger.info(
			`[PROMOÇÕES RECENTES] - /promocoesRecentes - Buscando promoções recentes`
		);
		const recentPromotions = await Officer.find({ promotedAt: { $ne: null } })
			.sort({ promotedAt: -1 })
			.limit(10)
			.select("name rank promotedAt");

		const formattedPromotions = recentPromotions.map((officer) => ({
			name: officer.name,
			newRank: officer.rank,
			promotedAt: officer.promotedAt,
		}));

		logger.info(
			`[PROMOÇÕES RECENTES] - /promocoesRecentes - ${formattedPromotions.length} promoções recentes encontradas`
		);
		res.status(200).json(formattedPromotions);
	} catch (error) {
		logger.error(
			`[PROMOÇÕES RECENTES] - /promocoesRecentes - Erro ao buscar promoções recentes: ${error.message}`
		);
		res.status(500).json({ error: "Erro ao buscar promoções recentes" });
	}
});

router.put("/atualizarOficial/:id", authenticateToken, async (req, res) => {
	const { id } = req.params;
	const { name, rank, startDate } = req.body;
	logger.info(
		`[ATUALIZAR OFICIAL] - /atualizarOficial/:id - Requisição recebida para ID: ${id}`
	);

	try {
		logger.info(
			`[ATUALIZAR OFICIAL] - /atualizarOficial/:id - Buscando oficial`
		);
		const original = await Officer.findById(id);
		if (!original) {
			logger.error(
				`[ATUALIZAR OFICIAL][404] - /atualizarOficial/:id - Oficial não encontrado`
			);
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

		logger.info(
			`[ATUALIZAR OFICIAL] - /atualizarOficial/:id - Atualizando oficial`
		);
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
		logger.info(
			`[ATUALIZAR OFICIAL] - /atualizarOficial/:id - Oficial atualizado com sucesso`
		);
		res.status(200).json(updatedOfficer);
	} catch (error) {
		logger.error(
			`[ATUALIZAR OFICIAL][ERROR] - /atualizarOficial/:id - Erro ao atualizar oficial: ${error.message}`
		);
		res.status(500).json({ error: "Erro ao atualizar o oficial" });
	}
});

router.delete("/deletarOficial/:id", authenticateToken, async (req, res) => {
	const { id } = req.params;
	logger.info(
		`[DELETAR OFICIAL] - /deletarOficial/:id - Requisição recebida para ID: ${id}`
	);

	try {
		logger.info(`[DELETAR OFICIAL] - /deletarOficial/:id - Buscando oficial`);
		const deletedOfficer = await Officer.findByIdAndDelete(id);

		if (!deletedOfficer) {
			logger.error(
				`[DELETAR OFICIAL][404] - /deletarOficial/:id - Oficial não encontrado`
			);
			return res.status(404).json({ error: "Oficial não encontrado" });
		}

		await logAction({
			req,
			action: "delete",
			user: req.user,
			target: { entity: "Officer", id },
			metadata: {
				name: deletedOfficer.name,
				rank: deletedOfficer.rank,
				startDate: deletedOfficer.startDate,
			},
		});
		logger.info(
			`[DELETAR OFICIAL] - /deletarOficial/:id - Oficial deletado com sucesso`
		);
		res.status(200).json({ message: "Oficial deletado com sucesso" });
	} catch (error) {
		logger.error(
			`[DELETAR OFICIAL][ERROR] - /deletarOficial/:id - Erro ao deletar oficial: ${error.message}`
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

router.get("/totalOficiais", async (req, res) => {
	logger.info(`[TOTAL OFICIAIS] - /totalOficiais - Requisição recebida`);
	try {
		logger.info(
			`[TOTAL OFICIAIS] - /totalOficiais - Calculando total de oficiais`
		);
		const total = await Officer.countDocuments();
		logger.info(
			`[TOTAL OFICIAIS] - /totalOficiais - Total de oficiais: ${total}`
		);
		res.status(200).json({ total });
	} catch (error) {
		logger.error(
			`[TOTAL OFICIAIS][ERROR] - /totalOficiais - Erro ao buscar total de oficiais: ${error.message}`
		);
		res.status(500).json({ error: "Erro ao buscar total de oficiais" });
	}
});

module.exports = router;
