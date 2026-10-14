const User = require('../models/User');
const TestAttempt = require('../models/TestAttempt');
const asyncHandler = require('../utils/asyncHandler');
const S = require('../services/scoring');

exports.student = asyncHandler(async (req, res) => {
  const u = req.user;
  const company = req.query.company || u.targetCompany;
  const history = await TestAttempt.find({ user: u._id, status: 'done' }).sort('createdAt').limit(30).select('topic score createdAt');
  res.json({
    readiness: S.readiness(u),
    placementProbability: S.predictPlacement(u),
    topics: S.topicPcts(u),
    skillGap: S.skillGap(u, company),
    companyFit: S.companyFit(u),
    roadmap: S.roadmap(u, company),
    streak: u.streak, interviewScore: u.interviewScore, resumeScore: u.resumeScore, company, history,
  });
});

const decorate = (u) => ({
  id: u._id, name: u.name, email: u.email, department: u.department, batch: u.batch, cgpa: u.cgpa,
  targetCompany: u.targetCompany, placed: u.placed, readiness: S.readiness(u), probability: S.predictPlacement(u),
  topics: S.topicPcts(u), testsTaken: u.testsTaken, lastActive: u.lastActive,
});

// Faculty: all students, at-risk list, topic averages
exports.faculty = asyncHandler(async (req, res) => {
  const filter = { role: 'student', ...(req.query.department && { department: req.query.department }) };
  const students = (await User.find(filter)).map(decorate).sort((a, b) => a.readiness - b.readiness);
  const avg = (k) => students.length ? Math.round(students.reduce((s, x) => s + x.topics[k], 0) / students.length) : 0;
  const week = Date.now() - 7 * 864e5;
  res.json({
    students,
    atRisk: students.filter((s) => s.readiness < 40 || s.probability < 35 || !s.lastActive || new Date(s.lastActive) < week),
    topicAverages: S.TOPICS.map((t) => ({ topic: t, avg: avg(t) })),
  });
});

// Placement cell: distribution, department comparison, company-wise eligibility
exports.placement = asyncHandler(async (req, res) => {
  const students = (await User.find({ role: 'student' })).map(decorate);
  const buckets = [['0-20', 0, 20], ['21-40', 21, 40], ['41-60', 41, 60], ['61-80', 61, 80], ['81-100', 81, 100]]
    .map(([label, lo, hi]) => ({ label, count: students.filter((s) => s.readiness >= lo && s.readiness <= hi).length }));
  const deptMap = {};
  students.forEach((s) => { const d = s.department || 'NA'; (deptMap[d] ||= []).push(s.readiness); });
  const departments = Object.entries(deptMap).map(([department, arr]) => ({ department, avg: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length), students: arr.length }));
  const users = await User.find({ role: 'student' });
  const fitByCompany = {};
  users.forEach((u) => S.companyFit(u).forEach(({ company, fit }) => { (fitByCompany[company] ||= []).push(fit); }));
  const companies = Object.entries(fitByCompany).map(([company, arr]) => ({
    company, avgFit: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length), eligible: arr.filter((f) => f >= 80).length,
  }));
  res.json({
    total: students.length, placed: students.filter((s) => s.placed).length,
    avgReadiness: students.length ? Math.round(students.reduce((s, x) => s + x.readiness, 0) / students.length) : 0,
    distribution: buckets, departments, companies,
  });
});
