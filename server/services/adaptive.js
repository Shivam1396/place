/**
 * Adaptive testing engine (1-parameter IRT / Rasch model).
 * P(correct) = 1 / (1 + e^-(theta - b)).  Ability is updated after each answer
 * with a shrinking step size; the next question is the unseen one whose
 * difficulty b is closest to the current theta (max information).
 */
const Question = require('../models/Question');

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const prob = (theta, b) => 1 / (1 + Math.exp(-(theta - b)));

exports.updateTheta = (theta, b, correct, n) => {
  const k = 1.2 / Math.sqrt(n + 1);                 // step shrinks as evidence grows
  return clamp(theta + k * ((correct ? 1 : 0) - prob(theta, b)), -3, 3);
};

exports.nextQuestion = async ({ topic, company, theta, seenIds }) => {
  const base = { topic, _id: { $nin: seenIds } };
  let pool = await Question.find(company ? { ...base, companyTags: company } : base);
  if (!pool.length) pool = await Question.find(base);          // fall back to any company
  if (!pool.length) return null;
  pool.sort((a, b) => Math.abs(a.difficulty - theta) - Math.abs(b.difficulty - theta));
  const top = pool.slice(0, 3);                                 // slight randomness
  return top[Math.floor(Math.random() * top.length)];
};

exports.thetaToPct = (t) => Math.round(((clamp(t, -3, 3) + 3) / 6) * 100);
