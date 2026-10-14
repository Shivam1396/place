const Question = require('../models/Question');
const TestAttempt = require('../models/TestAttempt');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { updateTheta, nextQuestion, thetaToPct } = require('../services/adaptive');

const safeQ = (q) => q && ({ _id: q._id, text: q.text, options: q.options, topic: q.topic, subtopic: q.subtopic });

exports.start = asyncHandler(async (req, res) => {
  const { topic, company } = req.body;
  const theta = req.user.abilities?.[topic] || 0;
  const q = await nextQuestion({ topic, company, theta, seenIds: [] });
  if (!q) return res.status(404).json({ message: 'No questions for this topic. Run npm run seed.' });
  const attempt = await TestAttempt.create({ user: req.user._id, topic, company, theta });
  res.status(201).json({ attemptId: attempt._id, question: safeQ(q), index: 1, total: attempt.maxQuestions });
});

exports.answer = asyncHandler(async (req, res) => {
  const attempt = await TestAttempt.findOne({ _id: req.params.id, user: req.user._id });
  if (!attempt || attempt.status === 'done') return res.status(400).json({ message: 'Attempt not active' });
  const { questionId, selected, timeSec = 0 } = req.body;
  const q = await Question.findById(questionId);
  const correct = q.answerIndex === selected;
  attempt.theta = updateTheta(attempt.theta, q.difficulty, correct, attempt.answers.length);
  attempt.answers.push({ question: q._id, selected, correct, timeSec, difficulty: q.difficulty, thetaAfter: attempt.theta });

  const feedback = { correct, correctIndex: q.answerIndex, explanation: q.explanation };
  if (attempt.answers.length >= attempt.maxQuestions) {
    attempt.status = 'done';
    attempt.score = thetaToPct(attempt.theta);
    // Blend into long-term ability (70% new evidence, 30% history)
    const prev = req.user.abilities[attempt.topic] || 0;
    req.user.abilities[attempt.topic] = req.user.testsTaken ? 0.3 * prev + 0.7 * attempt.theta : attempt.theta;
    req.user.testsTaken += 1;
    const today = new Date().toDateString();
    const last = req.user.lastActive && new Date(req.user.lastActive).toDateString();
    if (last !== today) {
      const y = new Date(Date.now() - 864e5).toDateString();
      req.user.streak = last === y ? req.user.streak + 1 : 1;
    }
    req.user.lastActive = new Date();
    await Promise.all([attempt.save(), req.user.save()]);
    const correctCount = attempt.answers.filter((a) => a.correct).length;
    return res.json({ ...feedback, done: true, score: attempt.score, correctCount, total: attempt.answers.length });
  }
  const next = await nextQuestion({ topic: attempt.topic, company: attempt.company, theta: attempt.theta, seenIds: attempt.answers.map((a) => a.question) });
  if (!next) { attempt.status = 'done'; attempt.score = thetaToPct(attempt.theta); await attempt.save(); return res.json({ ...feedback, done: true, score: attempt.score }); }
  await attempt.save();
  res.json({ ...feedback, done: false, question: safeQ(next), index: attempt.answers.length + 1, total: attempt.maxQuestions });
});

exports.history = asyncHandler(async (req, res) => {
  const items = await TestAttempt.find({ user: req.user._id, status: 'done' }).sort('-createdAt').limit(30).select('topic company score createdAt');
  res.json(items);
});
