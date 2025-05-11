const Joi = require('joi');

const evaluationSchema = Joi.object({
  officerId: Joi.string().required().messages({
    'string.empty': 'O campo "officerId" é obrigatório.',
  }),
  skills: Joi.object({
    montarOcorrencia: Joi.number().min(0).max(10).required(),
    abordagem: Joi.number().min(0).max(10).required(),
    registroIdentidade: Joi.number().min(0).max(10).required(),
    negociacao: Joi.number().min(0).max(10).required(),
    efetuarPrisao: Joi.number().min(0).max(10).required(),
    posicionamentoPatrulha: Joi.number().min(0).max(10).required(),
    conhecimentoLeis: Joi.number().min(0).max(10).required(),
  }).required().messages({
    'object.base': 'O campo "skills" deve ser um objeto com as habilidades.',
  }),
});

module.exports = evaluationSchema;