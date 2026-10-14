const InterviewSession = require('../models/InterviewSession');
const asyncHandler = require('../utils/asyncHandler');
const llm = require('../services/llm');

const sys = (s) => `You are a rigorous but friendly ${s.type} interviewer hiring for the role "${s.role}"${s.company ? ' at ' + s.company : ''}.
Ask ONE question at a time. React briefly to the candidate's last answer (1-2 sentences), then ask the next question. Increase difficulty if answers are strong. Keep replies under 90 words.`;

const FALLBACK = {
  technical: ['Explain the difference between a process and a thread.', 'How does indexing speed up a database query? Any downsides?', 'Describe how you would design a URL shortener.', 'What is the time complexity of searching in a balanced BST, and why?'],
  hr: ['Tell me about yourself.', 'Why do you want to join our company?', 'Describe a weakness and how you are working on it.'],
  behavioral: ['Tell me about a time you resolved a team conflict.', 'Describe a project that failed and what you learned.', 'Give an example of leading under pressure.'],
};
const fallbackNext = (s) => { const L = FALLBACK[s.type]; const n = s.messages.filter((m) => m.role === 'assistant').length; return L[n % L.length]; };

exports.start = asyncHandler(async (req, res) => {
  const { role = 'Software Engineer', type = 'technical', company } = req.body;
  const s = await InterviewSession.create({ user: req.user._id, role, type, company });
  const first = (await llm.chat(sys(s), [{ role: 'user', content: 'Begin the interview with a short greeting and your first question.' }])) || `Hi! Let's begin your ${type} interview for ${role}. ${fallbackNext(s)}`;
  s.messages.push({ role: 'assistant', content: first });
  await s.save();
  res.status(201).json({ id: s._id, messages: s.messages });
});

exports.reply = asyncHandler(async (req, res) => {
  const s = await InterviewSession.findOne({ _id: req.params.id, user: req.user._id });
  if (!s || s.status === 'done') return res.status(400).json({ message: 'Session not active' });
  s.messages.push({ role: 'user', content: req.body.answer });
  const reply = (await llm.chat(sys(s), s.messages.map(({ role, content }) => ({ role, content })))) || fallbackNext(s);
  s.messages.push({ role: 'assistant', content: reply });
  await s.save();
  res.json({ reply });
});

exports.finish = asyncHandler(async (req, res) => {
  const s = await InterviewSession.findOne({ _id: req.params.id, user: req.user._id });
  if (!s) return res.status(404).json({ message: 'Not found' });
  const transcript = s.messages.map((m) => `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.content}`).join('\n');
  let fb = await llm.json('You evaluate interview transcripts. Return {"score":0-100,"strengths":[...],"improvements":[...],"summary":"..."}.', [{ role: 'user', content: transcript }]);
  if (!fb) {
    const answers = s.messages.filter((m) => m.role === 'user');
    const avgLen = answers.reduce((a, m) => a + m.content.split(/\s+/).length, 0) / Math.max(1, answers.length);
    const score = Math.round(Math.min(85, 30 + avgLen * 1.2));
    fb = { score, strengths: avgLen > 30 ? ['Detailed answers'] : ['Concise answers'], improvements: ['Use the STAR format', 'Give concrete examples and metrics'], summary: 'Heuristic feedback (enable ANTHROPIC_API_KEY for AI-graded feedback).' };
  }
  s.feedback = fb; s.status = 'done'; await s.save();
  // running average of interview score
  const prev = req.user.interviewScore || 0;
  req.user.interviewScore = prev ? Math.round(0.5 * prev + 0.5 * fb.score) : fb.score;
  await req.user.save();
  res.json(fb);
});

exports.history = asyncHandler(async (req, res) => {
  res.json(await InterviewSession.find({ user: req.user._id }).sort('-createdAt').limit(20).select('role type status feedback createdAt'));
});
