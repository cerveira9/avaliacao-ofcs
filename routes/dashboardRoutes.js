const express = require("express");
const router = express.Router();
const Evaluation = require("../models/Evaluation");
const Officer = require("../models/Officer");

// Total de oficiais, avaliados, avaliações feitas, por habilidade
router.get("/analytics", async (req, res) => {
  try {
    const totalOfficers = await Officer.countDocuments();
    const totalEvaluations = await Evaluation.countDocuments();

    const evaluatedOfficers = await Evaluation.distinct("officer");

    const averageSkills = await Evaluation.aggregate([
      {
        $group: {
          _id: null,
          montarOcorrencia: { $avg: "$skills.montarOcorrencia" },
          abordagem: { $avg: "$skills.abordagem" },
          registroIdentidade: { $avg: "$skills.registroIdentidade" },
          negociacao: { $avg: "$skills.negociacao" },
          efetuarPrisao: { $avg: "$skills.efetuarPrisao" },
          posicionamentoPatrulha: { $avg: "$skills.posicionamentoPatrulha" },
          conhecimentoLeis: { $avg: "$skills.conhecimentoLeis" },
        }
      }
    ]);

    res.json({
      totalOfficers,
      totalEvaluations,
      evaluatedOfficers: evaluatedOfficers.length,
      averageSkills: averageSkills[0] || {}
    });
  } catch (err) {
    console.error("[DASHBOARD ANALYTICS]", err.message);
    res.status(500).json({ error: "Erro ao carregar dados do dashboard." });
  }
});

// Ranking dos melhores avaliados (com base na média de todas as habilidades)
router.get("/ranking", async (req, res) => {
  try {
    const ranking = await Evaluation.aggregate([
      {
        $addFields: {
          averageScore: {
            $avg: [
              "$skills.montarOcorrencia",
              "$skills.abordagem",
              "$skills.registroIdentidade",
              "$skills.negociacao",
              "$skills.efetuarPrisao",
              "$skills.posicionamentoPatrulha",
              "$skills.conhecimentoLeis",
            ]
          }
        }
      },
      {
        $group: {
          _id: "$officer",
          avgScore: { $avg: "$averageScore" },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { avgScore: -1 }
      },
      {
        $limit: 10
      },
      {
        $lookup: {
          from: "officers",
          localField: "_id",
          foreignField: "_id",
          as: "officer"
        }
      },
      {
        $unwind: "$officer"
      },
      {
        $project: {
          _id: 0,
          officerId: "$officer._id",
          name: "$officer.name",
          rank: "$officer.rank",
          avgScore: 1,
          evaluations: "$count"
        }
      }
    ]);

    res.json(ranking);
  } catch (err) {
    console.error("[DASHBOARD RANKING]", err.message);
    res.status(500).json({ error: "Erro ao calcular ranking." });
  }
});

module.exports = router;
