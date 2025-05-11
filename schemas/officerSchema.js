const Joi = require("joi");

const officerSchema = Joi.object({
	name: Joi.string().min(3).max(50).required().messages({
		"string.empty": 'O campo "name" é obrigatório.',
		"string.min": 'O campo "name" deve ter no mínimo 3 caracteres.',
		"string.max": 'O campo "name" deve ter no máximo 50 caracteres.',
	}),
	rank: Joi.string()
		.valid(
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
			"Marshal"
		)
		.required()
		.messages({
			"any.only": 'O campo "rank" deve ser um dos valores permitidos.',
		}),
	startDate: Joi.date().iso().required().messages({
		"date.base": 'O campo "startDate" deve ser uma data válida.',
		"date.format": 'O campo "startDate" deve estar no formato ISO 8601.',
	}),
});

module.exports = officerSchema;
