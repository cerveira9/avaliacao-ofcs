const mongoose = require("mongoose");
const getCollectionName = require('../utils/collectionName');

const evaluationSchema = new mongoose.Schema({
	officer: { type: mongoose.Schema.Types.ObjectId, ref: "Officer", index: true },
	evaluator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
	rankAtEvaluation: String,
	skills: {
		montarOcorrencia: Number,
		abordagem: Number,
		registroIdentidade: Number,
		negociacao: Number,
		efetuarPrisao: Number,
		posicionamentoPatrulha: Number,
		conhecimentoLeis: Number,
	},
	date: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model("Evaluation", evaluationSchema, getCollectionName('Evaluation'));
