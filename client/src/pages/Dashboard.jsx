import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend, BarChart, Bar as RBar, CartesianGrid } from 'recharts';
import api from '../api/client';
import { Card, Stat, Bar } from '../components/Card';

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [company, setCompany] = useState('');

  useEffect(() => { api.get('/companies').then((r) => setCompanies(r.data)); }, []);
  useEffect(() => { api.get('/analytics/student', { params: company ? { company } : {} }).then((r) => { setD(r.data); if (!company) setCompany(r.data.company); }); }, [company]);
  if (!d) return <p>Loading…</p>;

  const radar = d.skillGap.map((g) => ({ topic: g.topic, You: g.current, Target: g.target }));
  const hist = d.history.map((h, i) => ({ n: i + 1, score: h.score, topic: h.topic }));

  return (
    <>
      <div className="grid4">
        <Card><Stat label="Placement Readiness" value={d.readiness} suffix="/100" /><Bar value={d.readiness} /></Card>
        <Card><Stat label="Placement Probability" value={d.placementProbability} suffix="%" /></Card>
        <Card><Stat label="Interview Score" value={d.interviewScore} /></Card>
        <Card><Stat label="Resume ATS · Streak" value={`${d.resumeScore} · ${d.streak}d`} /></Card>
      </div>

      <div className="row">
        <label>Prepare for&nbsp;</label>
        <select value={company} onChange={(e) => setCompany(e.target.value)}>{companies.map((c) => <option key={c}>{c}</option>)}</select>
      </div>

      <div className="grid2">
        <Card title={`Skill gap vs ${d.company}`}>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radar}><PolarGrid /><PolarAngleAxis dataKey="topic" />
              <Radar name="You" dataKey="You" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.4} />
              <Radar name="Target" dataKey="Target" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} /><Legend /></RadarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Test score trend">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={hist}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="n" /><YAxis domain={[0, 100]} /><Tooltip />
              <Line type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={2} /></LineChart>
          </ResponsiveContainer>
          {!hist.length && <p className="muted">Take an adaptive test to see your trend.</p>}
        </Card>
      </div>

      <div className="grid2">
        <Card title="Company-fit (all companies)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={d.companyFit}><XAxis dataKey="company" /><YAxis domain={[0, 100]} /><Tooltip /><RBar dataKey="fit" fill="#10b981" /></BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Personalised weekly roadmap">
          {d.roadmap.map((r) => (
            <div key={r.topic} className="road">
              <b>{r.topic}</b> <span className="pill">{r.hoursPerWeek} h/week</span>
              <ul>{r.focus.map((f) => <li key={f}>{f}</li>)}</ul>
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}
