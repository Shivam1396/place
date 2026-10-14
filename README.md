# PlacePrep AI - Student Performance Monitoring & Adaptive Test Platform (MERN)

## Run
```bash
# 1. Backend
cd server && cp .env.example .env     # set MONGO_URI, JWT_SECRET (and ANTHROPIC_API_KEY for real LLM)
npm install && npm run seed && npm run dev      # http://localhost:5000

# 2. Frontend
cd client && cp .env.example .env && npm install && npm run dev   # http://localhost:5173
```
Demo logins (after seed): `student@demo.com` / `faculty@demo.com`, password `password123`.

## AI/ML components
| Feature | Where | Method |
|---|---|---|
| Adaptive testing | server/services/adaptive.js | 1-PL IRT (Rasch): ability theta updated per answer, next question = max-information (difficulty closest to theta) |
| Readiness score | services/scoring.js | Weighted: topic abilities 70%, interview 15%, resume 10%, consistency 5% |
| Performance prediction | services/scoring.js | Logistic model (readiness, CGPA, interview). Replace with trained scikit-learn model via a Python microservice |
| Skill gap & company prep | scoring.js + config/companies.js | Gap = company target - current per topic |
| Recommendation / roadmap | scoring.js | Weekly hours allocated proportional to gap |
| Interview chatbot, AI mentor | services/llm.js | LLM (Anthropic API); graceful fallback if no key |
| Resume ATS | services/ats.js | Keyword coverage, section detection, quantified-impact heuristics |

## Next steps
Grow the question bank (admin CRUD page), add Redis caching, train a real placement model on historical data, add CSV export for the placement cell, add tests (Jest + Supertest) and Docker Compose.
