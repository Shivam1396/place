const mongoose = require('mongoose');
module.exports = mongoose.model('Question', new mongoose.Schema({
  topic: { type: String, enum: ['aptitude', 'dsa', 'core', 'verbal'], required: true, index: true },
  subtopic: String,
  text: { type: String, required: true },
  options: { type: [String], validate: (v) => v.length >= 2 },
  answerIndex: { type: Number, required: true },
  difficulty: { type: Number, min: -2, max: 2, default: 0 },  // IRT 'b' parameter
  companyTags: [String],
  explanation: String,
}, { timestamps: true }));
