const asyncHandler = require('../utils/asyncHandler');
const llm = require('../services/llm');
const S = require('../services/scoring');

exports.chat = asyncHandler(async (req, res) => {
  const { message, history = [] } = req.body;
  const u = req.user;
  const gaps = S.skillGap(u).slice(0, 2).map((g) => g.topic).join(', ');
  const system = `You are PlacePrep AI, a placement-preparation mentor for engineering students.
Student: ${u.name}, target company ${u.targetCompany}, readiness ${S.readiness(u)}/100, weakest areas: ${gaps}.
Give practical, concise, personalised advice (max 150 words). Use bullet points for plans.`;

  const msgs = [...history.slice(-8), { role: 'user', content: message }]
    .map(({ role, content }) => ({ role, content }));

  let reply = null;
  try {
    reply = await llm.chat(system, msgs);
  } catch (e) {
    console.error('LLM failed:', e.message); // shows the real Groq error in the terminal
  }

  res.json({
    reply:
      reply ||
      `Based on your profile, focus on ${gaps || 'your weakest topics'} for ${u.targetCompany}. Take an adaptive test daily, do 2 mock interviews a week, and re-run the ATS checker on your resume.`,
  });
});