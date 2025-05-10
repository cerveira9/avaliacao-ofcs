const express = require("express");
const router = express.Router();
const Officer = require("../models/Officer");
const { authenticateToken } = require("../middleware/authMiddleware");
const logAction = require("../utils/logAction");

router.post("/cadastroOficial", authenticateToken, async (req, res) => {
	const { name, rank, startDate } = req.body;
	const newOfficer = new Officer({ name, rank, startDate });
	await newOfficer.save();

	await logAction({
		req,
		action: "create",
		user: req.user, // vindo do middleware authenticateToken
		target: { entity: "Officer", id: newOfficer._id },
		metadata: { name, rank },
	});

	res.json(newOfficer);
});

router.get("/mostrarOficiais", async (req, res) => {
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

	const officers = await Officer.find();

	const ordered = officers.sort((a, b) => {
		const rankA = hierarchy.indexOf(a.rank);
		const rankB = hierarchy.indexOf(b.rank);
		return rankA - rankB;
	});

	res.json(ordered);
});

router.get("/promocoesRecentes", async (req, res) => {
	try {
		// Busca os oficiais ordenados pela data de promoção mais recente
		const recentPromotions = await Officer.find({ promotedAt: { $ne: null } }) // Filtra apenas oficiais que foram promovidos
			.sort({ promotedAt: -1 }) // Ordena pela data de promoção mais recente
			.limit(10) // Limita a 10 resultados
			.select("name rank promotedAt"); // Seleciona os campos necessários

		// Formata os dados para a resposta
		const formattedPromotions = recentPromotions.map((officer) => ({
			name: officer.name,
			newRank: officer.rank,
			promotedAt: officer.promotedAt,
		}));

		res.status(200).json(formattedPromotions);
	} catch (error) {
		console.error("Erro ao buscar promoções recentes:", error);
		res.status(500).json({ error: "Erro ao buscar promoções recentes" });
	}
});

router.put("/atualizarOficial/:id", authenticateToken, async (req, res) => {
	const { id } = req.params;
	const { name, rank, startDate } = req.body;

	try {
		const original = await Officer.findById(id);
		if (!original) {
			return res.status(404).json({ error: "Oficial não encontrado" });
		}

		// Detecta mudanças
		const changes = {};
		if (original.name !== name) {
			changes.name = { before: original.name, after: name };
		}
		if (original.rank !== rank) {
			changes.rank = { before: original.rank, after: rank };
		}
		if (
			new Date(original.startDate).toISOString() !==
			new Date(startDate).toISOString()
		) {
			changes.startDate = {
				before: new Date(original.startDate).toISOString(),
				after: new Date(startDate).toISOString(),
			};
		}

		// Atualiza
		const updatedOfficer = await Officer.findByIdAndUpdate(
			id,
			{ name, rank, startDate },
			{ new: true, runValidators: true }
		);

		// Loga somente se houve mudanças
		if (Object.keys(changes).length > 0) {
			await logAction({
				req,
				action: "update",
				user: req.user,
				target: { entity: "Officer", id: updatedOfficer._id },
				metadata: { changes, name },
			});
		}

		res.json(updatedOfficer);
	} catch (error) {
		console.error("[UPDATE ERROR] - /atualizarOficial/:id", error);
		res.status(500).json({ error: "Erro ao atualizar o oficial" });
	}
});

router.delete("/deletarOficial/:id", authenticateToken, async (req, res) => {
	const { id } = req.params;

	try {
		const deletedOfficer = await Officer.findByIdAndDelete(id);

		if (!deletedOfficer) {
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

		res.json({ message: "Oficial deletado com sucesso" });
	} catch (error) {
		console.error("[DELETE ERROR] - /deletarOficial/:id", error);
		res.status(500).json({ error: "Erro ao deletar o oficial" });
	}
});

router.put("/promoverOficial/:id", authenticateToken, async (req, res) => {
	const { id } = req.params;

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
		const officer = await Officer.findById(id);
		if (!officer)
			return res.status(404).json({ error: "Oficial não encontrado" });

		const currentRankIndex = hierarchy.indexOf(officer.rank);
		if (currentRankIndex === -1 || currentRankIndex === hierarchy.length - 1) {
			return res
				.status(400)
				.json({ error: "Oficial já está na patente mais alta" });
		}

		const oldRank = officer.rank;
		officer.rank = hierarchy[currentRankIndex + 1];
		officer.promotedAt = new Date();
		await officer.save();

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
		console.error("[PROMOTE ERROR] - /promoverOficial/:id", error);
		res.status(500).json({ error: "Erro ao promover oficial" });
	}
});

router.get("/totalOficiais", async (req, res) => {
	try {
		const total = await Officer.countDocuments();
		res.status(200).json({ total });
	} catch (error) {
		console.error("[ERROR] - /totalOficiais", error);
		res.status(500).json({ error: "Erro ao buscar total de oficiais" });
	}
});

module.exports = router;
