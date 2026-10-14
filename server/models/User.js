const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const abilities = {
  aptitude: { type: Number, default: 0 },
  dsa: { type: Number, default: 0 },
  core: { type: Number, default: 0 },
  verbal: { type: Number, default: 0 },
};

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['student', 'faculty', 'admin'], default: 'student' },
  department: String,
  batch: Number,
  cgpa: { type: Number, default: 0 },
  targetCompany: { type: String, default: 'TCS' },
  abilities,                                     // IRT-style theta per topic, range [-3, 3]
  testsTaken: { type: Number, default: 0 },
  interviewScore: { type: Number, default: 0 },  // 0-100
  resumeScore: { type: Number, default: 0 },     // 0-100
  streak: { type: Number, default: 0 },
  lastActive: Date,
  placed: { type: Boolean, default: false },
}, { timestamps: true });

// Mongoose 9: async hooks do NOT receive `next`
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.matchPassword = function (p) {
  return bcrypt.compare(p, this.password);
};

module.exports = mongoose.model('User', userSchema);