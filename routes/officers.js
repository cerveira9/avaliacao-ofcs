const express = require('express');
const router = express.Router();
const Officer = require('../models/Officer');

router.post('/cadastroOficial', async (req, res) => {
  const { name, rank, startDate } = req.body;
  const newOfficer = new Officer({ name, rank, startDate });
  await newOfficer.save();
  res.json(newOfficer);
});

router.get('/mostrarOficiais', async (req, res) => {
  const officers = await Officer.find();
  res.json(officers);
});

module.exports = router;