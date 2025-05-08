const mongoose = require("mongoose");

const evaluationSchema = new mongoose.Schema({
	officer: { type: mongoose.Schema.Types.ObjectId, ref: "Officer" },
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
});

module.exports = mongoose.model("Evaluation", evaluationSchema);
