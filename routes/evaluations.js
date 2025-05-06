const express = require('express');
const router = express.Router();
const Evaluation = require('../models/Evaluation');

router.post('/cadastrarAvaliacao', async (req, res) => {
  const { officerId, skills } = req.body;
  const newEval = new Evaluation({ officer: officerId, skills });
  await newEval.save();
  res.json(newEval);
});

router.get('/:officerId', async (req, res) => {
  const evaluations = await Evaluation.find({ officer: req.params.officerId });
  res.json(evaluations);
});

module.exports = router;