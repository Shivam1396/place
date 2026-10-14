const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

const sign = (u) => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const pub = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, department: u.department, targetCompany: u.targetCompany });

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, department, batch, cgpa, targetCompany, role } = req.body;
  if (await User.findOne({ email })) return res.status(400).json({ message: 'Email already registered' });
  // NOTE: in production, restrict faculty/admin creation to admins only.
  const u = await User.create({ name, email, password, department, batch, cgpa, targetCompany, role: role === 'faculty' ? 'faculty' : 'student' });
  res.status(201).json({ token: sign(u), user: pub(u) });
});

exports.login = asyncHandler(async (req, res) => {
  const u = await User.findOne({ email: req.body.email });
  if (!u || !(await u.matchPassword(req.body.password))) return res.status(401).json({ message: 'Invalid credentials' });
  res.json({ token: sign(u), user: pub(u) });
});

exports.me = (req, res) => res.json({ user: pub(req.user) });

exports.updateProfile = asyncHandler(async (req, res) => {
  const { targetCompany, cgpa, department, batch } = req.body;
  Object.assign(req.user, { ...(targetCompany && { targetCompany }), ...(cgpa != null && { cgpa }), ...(department && { department }), ...(batch && { batch }) });
  await req.user.save();
  res.json({ user: pub(req.user) });
});
