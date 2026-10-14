const mongoose = require('mongoose');
module.exports = mongoose.model('TestAttempt', new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  topic: String,
  company: String,
  theta: Number,                 // running ability estimate
  maxQuestions: { type: Number, default: 10 },
  status: { type: String, enum: ['active', 'done'], default: 'active' },
  answers: [{
    question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
    selected: Number, correct: Boolean, timeSec: Number, difficulty: Number, thetaAfter: Number,
  }],
  score: Number,                 // 0-100 at the end
}, { timestamps: true }));
