const mongoose = require('mongoose');

const officerSchema = new mongoose.Schema({
  name: String,
  rank: {
    type: String,
    enum: ['Cadete', 'Patrol Officer', 'Police Officer', 'Senior Officer', 'Deputy', 'Senior Deputy', 'Undersheriff / Deputy Chief', 'Sheriff / Chief of Police', "Tracker Ranger", "Deputy Marshal"]
  },
  startDate: Date,
  registerDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Officer', officerSchema);