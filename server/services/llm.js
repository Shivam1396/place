/** LLM wrapper using Groq (OpenAI-compatible API). Returns null without a key -> callers use fallbacks. */
const URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-oss-20b';

const callGroq = (body) =>
  fetch(URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

exports.chat = async (system, messages, maxTokens = 600) => {
  if (!process.env.GROQ_API_KEY) {
    console.error('GROQ_API_KEY is missing in server/.env');
    return null;
  }

  const body = {
    model: process.env.LLM_MODEL || DEFAULT_MODEL,
    // gpt-oss models spend part of the limit on internal reasoning, so keep it generous
    max_tokens: Math.max(maxTokens, 1500),
    temperature: 0.7,
    reasoning_effort: 'low',
    messages: [{ role: 'system', content: system }, ...messages],
  };

  let r = await callGroq(body);

  // If the chosen model doesn't support reasoning_effort, retry without it
  if (r.status === 400) {
    const txt = await r.text();
    if (/reasoning/i.test(txt)) {
      delete body.reasoning_effort;
      r = await callGroq(body);
    } else {
      throw new Error(`LLM error 400: ${txt}`);
    }
  }

  if (!r.ok) throw new Error(`LLM error ${r.status}: ${await r.text()}`);
  const d = await r.json();
  return d.choices?.[0]?.message?.content?.trim() || null;
};

exports.json = async (system, messages) => {
  const t = await exports.chat(system + '\nRespond with ONLY valid JSON.', messages, 800);
  if (!t) return null;
  try {
    // grab the first {...} block in case the model adds extra text around it
    const match = t.replace(/```json|```/g, '').match(/\{[\s\S]*\}/);
    return JSON.parse(match ? match[0] : t);
  } catch {
    return null;
  }
};