const companies = require('../config/companies');
const { thetaToPct } = require('./adaptive');

const TOPICS = ['aptitude', 'dsa', 'core', 'verbal'];
const W = { aptitude: 0.2, dsa: 0.25, core: 0.15, verbal: 0.1 };      // tests = 70%
const W_EXTRA = { interview: 0.15, resume: 0.1, consistency: 0.05 };  // = 30%

exports.TOPICS = TOPICS;
exports.topicPcts = (u) => Object.fromEntries(TOPICS.map((t) => [t, thetaToPct(u.abilities?.[t] || 0)]));

exports.readiness = (u) => {
  const p = exports.topicPcts(u);
  const tests = TOPICS.reduce((s, t) => s + p[t] * W[t], 0);
  const consistency = Math.min(100, (u.streak || 0) * 10 + Math.min(u.testsTaken || 0, 10) * 5);
  const score = tests + (u.interviewScore || 0) * W_EXTRA.interview +
    (u.resumeScore || 0) * W_EXTRA.resume + consistency * W_EXTRA.consistency;
  return Math.round(score);
};

/** Performance prediction: logistic model over readiness + CGPA. Coefficients are a
 *  transparent baseline - swap with a trained model (scikit-learn microservice) later. */
exports.predictPlacement = (u) => {
  const r = exports.readiness(u);
  const z = -5.2 + 0.065 * r + 0.25 * (u.cgpa || 6) + 0.01 * (u.interviewScore || 0);
  return Math.round((1 / (1 + Math.exp(-z))) * 100);
};

exports.skillGap = (u, company) => {
  const target = companies[company || u.targetCompany] || companies.TCS;
  const p = exports.topicPcts(u);
  return TOPICS.map((t) => ({ topic: t, current: p[t], target: target[t], gap: Math.max(0, target[t] - p[t]) }))
    .sort((a, b) => b.gap - a.gap);
};

exports.companyFit = (u) => {
  const p = exports.topicPcts(u);
  return Object.entries(companies).map(([name, tg]) => ({
    company: name,
    fit: Math.round(100 * TOPICS.reduce((s, t) => s + Math.min(1, p[t] / tg[t]), 0) / TOPICS.length),
  })).sort((a, b) => b.fit - a.fit);
};

/** Recommendation engine: allocates weekly hours proportional to the skill gap. */
const RESOURCES = {
  aptitude: ['Quant: percentages, ratios, time & work', 'Logical reasoning: puzzles, seating', 'Timed sectional tests'],
  dsa: ['Arrays & strings', 'Trees, graphs, DP', 'Solve 5 problems/week on LeetCode'],
  core: ['DBMS & SQL', 'OS & CN basics', 'OOP concepts'],
  verbal: ['Reading comprehension', 'Grammar & sentence correction', 'Email/essay writing'],
};
exports.roadmap = (u, company, weeklyHours = 12) => {
  const gaps = exports.skillGap(u, company);
  const total = gaps.reduce((s, g) => s + g.gap, 0) || 1;
  const plan = gaps.map((g) => ({
    topic: g.topic, gap: g.gap,
    hoursPerWeek: g.gap ? Math.max(1, Math.round((g.gap / total) * weeklyHours)) : 1,
    focus: RESOURCES[g.topic],
  }));
  if ((u.interviewScore || 0) < 60) plan.push({ topic: 'mock interviews', gap: 0, hoursPerWeek: 2, focus: ['2 AI mock interviews / week'] });
  if ((u.resumeScore || 0) < 70) plan.push({ topic: 'resume', gap: 0, hoursPerWeek: 1, focus: ['Run the ATS checker and fix missing keywords'] });
  return plan;
};
