const mongoose = require('mongoose');
module.exports = mongoose.model('InterviewSession', new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  role: String,
  type: { type: String, enum: ['technical', 'hr', 'behavioral'], default: 'technical' },
  company: String,
  messages: [{ role: { type: String, enum: ['user', 'assistant'] }, content: String }],
  status: { type: String, enum: ['active', 'done'], default: 'active' },
  feedback: { score: Number, strengths: [String], improvements: [String], summary: String },
}, { timestamps: true }));
