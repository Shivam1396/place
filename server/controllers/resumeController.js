const pdf = require('pdf-parse');
const ResumeReport = require('../models/ResumeReport');
const asyncHandler = require('../utils/asyncHandler');
const ats = require('../services/ats');

exports.roles = (req, res) => res.json(ats.roles);

exports.analyze = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Upload a PDF resume' });
  const { text } = await pdf(req.file.buffer);
  if (!text || text.trim().length < 50) return res.status(422).json({ message: 'Could not read text from the PDF (scanned image?)' });
  const role = req.body.role || 'software engineer';
  const result = ats.analyze(text, role, req.body.jobDescription || '');
  const report = await ResumeReport.create({ user: req.user._id, targetRole: role, ...result });
  req.user.resumeScore = result.score; await req.user.save();
  res.json(report);
});

exports.history = asyncHandler(async (req, res) => {
  res.json(await ResumeReport.find({ user: req.user._id }).sort('-createdAt').limit(10));
});
