/** Rule-based ATS checker: keyword coverage + section presence + length + quantified impact. */
const ROLE_KEYWORDS = {
  'software engineer': ['javascript','python','java','data structures','algorithms','sql','git','rest','api','react','node','mongodb','oop','docker','testing'],
  'data analyst': ['sql','python','excel','tableau','power bi','statistics','pandas','visualization','dashboard','etl'],
  'ml engineer': ['python','machine learning','tensorflow','pytorch','scikit-learn','nlp','deep learning','pandas','numpy','mlops','docker'],
  'full stack developer': ['react','node','express','mongodb','javascript','typescript','rest','api','html','css','git','docker'],
};
const SECTIONS = { education: /education|b\.?tech|b\.?e\b|university|college/i, experience: /experience|intern/i,
  projects: /projects?/i, skills: /skills|technologies/i, contact: /@|linkedin|github|\+?\d{10}/i };

exports.roles = Object.keys(ROLE_KEYWORDS);

exports.analyze = (text, role = 'software engineer', jd = '') => {
  const lower = text.toLowerCase();
  const base = ROLE_KEYWORDS[role.toLowerCase()] || ROLE_KEYWORDS['software engineer'];
  const extra = jd ? [...new Set(jd.toLowerCase().match(/[a-z+#.]{3,}/g) || [])]
    .filter((w) => /^(aws|kubernetes|spring|flask|django|typescript|graphql|redis|kafka|azure|linux)$/.test(w)) : [];
  const keywords = [...new Set([...base, ...extra])];
  const matched = keywords.filter((k) => lower.includes(k));
  const missing = keywords.filter((k) => !lower.includes(k));
  const sections = Object.fromEntries(Object.entries(SECTIONS).map(([k, re]) => [k, re.test(text)]));
  const secScore = (Object.values(sections).filter(Boolean).length / 5) * 30;
  const kwScore = (matched.length / keywords.length) * 50;
  const words = text.split(/\s+/).length;
  const lenScore = words >= 250 && words <= 900 ? 10 : 5;
  const metrics = (text.match(/\d+%|\d+\+|\$\d+|\d+x/g) || []).length;
  const impactScore = Math.min(10, metrics * 2);
  const suggestions = [];
  Object.entries(sections).forEach(([k, v]) => !v && suggestions.push(`Add a clear "${k}" section.`));
  if (missing.length) suggestions.push(`Include relevant keywords: ${missing.slice(0, 6).join(', ')}.`);
  if (metrics < 3) suggestions.push('Quantify achievements (e.g., "reduced load time by 30%").');
  if (words < 250) suggestions.push('Resume looks short - add project/experience detail.');
  if (words > 900) suggestions.push('Resume is long - keep it to one page.');
  return { score: Math.round(secScore + kwScore + lenScore + impactScore), matchedKeywords: matched, missingKeywords: missing, sections, suggestions };
};
