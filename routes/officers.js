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
  const hierarchy = [
    'Cadete',
    'Patrol Officer',
    'Police Officer',
    'Senior Officer',
    'Deputy',
    'Senior Deputy',
    'Undersheriff / Deputy Chief',
    'Sheriff / Chief of Police',
    'Forest Ranger',
    'Tracker Ranger',
    'Senior Ranger',
    'Captain Ranger',
    'Commissioner',
    'Deputy Marshal',
    'Marshal'
  ];

  const officers = await Officer.find();

  const ordered = officers.sort((a, b) => {
    const rankA = hierarchy.indexOf(a.rank);
    const rankB = hierarchy.indexOf(b.rank);
    return rankA - rankB;
  });

  res.json(ordered);
});

router.put('/atualizarOficial/:id', async (req, res) => {
  const { id } = req.params;
  const { name, rank, startDate } = req.body;

  try {
    const updatedOfficer = await Officer.findByIdAndUpdate(
      id,
      { name, rank, startDate },
      { new: true, runValidators: true }
    );

    if (!updatedOfficer) {
      return res.status(404).json({ error: 'Oficial não encontrado' });
    }

    res.json(updatedOfficer);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar o oficial' });
  }
});

router.delete('/deletarOficial/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const deletedOfficer = await Officer.findByIdAndDelete(id);

    if (!deletedOfficer) {
      return res.status(404).json({ error: 'Oficial não encontrado' });
    }

    res.json({ message: 'Oficial deletado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar o oficial' });
  }
});

module.exports = router;