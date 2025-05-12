const mongoose = require("mongoose");
const getCollectionName = require('../utils/collectionName');

const officerSchema = new mongoose.Schema({
	name: String,
	rank: {
		type: String,
		enum: [
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
		],
	},
	startDate: Date,
	registerDate: { type: Date, default: Date.now },
	promotedAt: { type: Date, default: null, index: true },
}, { timestamps: true });

module.exports = mongoose.model('Officer', officerSchema, getCollectionName('Officer'));
