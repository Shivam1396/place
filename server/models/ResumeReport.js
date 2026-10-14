const mongoose = require('mongoose');
module.exports = mongoose.model('ResumeReport', new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  targetRole: String,
  score: Number,
  matchedKeywords: [String],
  missingKeywords: [String],
  sections: mongoose.Schema.Types.Mixed,
  suggestions: [String],
}, { timestamps: true }));
