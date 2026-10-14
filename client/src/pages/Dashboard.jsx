import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend, BarChart, Bar as RBar, CartesianGrid, Cell } from 'recharts';
import api from '../api/client';
import './dashboard.css';

const tip = { background: '#0e1626', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13 };
const tick = { fill: '#6b7590', fontSize: 12 };

function Ring({ value }) {
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), 60); return () => clearTimeout(t); }, []);
  const r = 70, c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <svg className="dp-ring" viewBox="0 0 180 180" role="img" aria-label={`Readiness ${pct} out of 100`}>
      <circle cx="90" cy="90" r={r} className="dp-ring-track" />
      <circle cx="90" cy="90" r={r} className="dp-ring-fill" strokeDasharray={c} strokeDashoffset={on ? c * (1 - pct / 100) : c} transform="rotate(-90 90 90)" />
      <text x="90" y="94" textAnchor="middle" className="dp-ring-num">{pct}</text>
      <text x="90" y="118" textAnchor="middle" className="dp-ring-of">out of 100</text>
    </svg>
  );
}

function Panel({ title, children }) {
  return (
    <section className="dp-panel">
      {title && <h2>{title}</h2>}
      {children}
    </section>
  );
}

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [company, setCompany] = useState('');

  useEffect(() => { api.get('/companies').then((r) => setCompanies(r.data)); }, []);
  useEffect(() => { api.get('/analytics/student', { params: company ? { company } : {} }).then((r) => { setD(r.data); if (!company) setCompany(r.data.company); }); }, [company]);
  if (!d) return <p className="dp-muted">Loading…</p>;

  const radar = d.skillGap.map((g) => ({ topic: g.topic, You: g.current, Target: g.target }));
  const hist = d.history.map((h, i) => ({ n: i + 1, score: h.score, topic: h.topic }));

  return (
    <div className="dp">
      <section className="dp-hero">
        <div className="dp-hero-top">
          <h1>Your placement progress</h1>
          <label className="dp-pick">
            <span>Preparing for</span>
            <select value={company} onChange={(e) => setCompany(e.target.value)}>{companies.map((c) => <option key={c}>{c}</option>)}</select>
          </label>
        </div>

        <div className="dp-hero-body">
          <Ring value={d.readiness} />
          <div className="dp-hero-main">
            <p className="dp-hero-label">Placement readiness</p>
            <p className="dp-prob"><b>{d.placementProbability}%</b> placement probability</p>
          </div>
          <dl className="dp-stats">
            <div><dt>Interview score</dt><dd>{d.interviewScore}</dd></div>
            <div><dt>Resume ATS</dt><dd>{d.resumeScore}</dd></div>
            <div><dt>Day streak</dt><dd>{d.streak}</dd></div>
          </dl>
        </div>
      </section>

      <div className="dp-grid">
        <Panel title={`Skill gap vs ${d.company}`}>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radar}>
              <PolarGrid stroke="#dfe4ee" />
              <PolarAngleAxis dataKey="topic" tick={{ ...tick, fill: '#33405c', fontSize: 13 }} />
              <Radar name="You" dataKey="You" stroke="#3b5bfd" strokeWidth={2} fill="#3b5bfd" fillOpacity={0.35} />
              <Radar name="Target" dataKey="Target" stroke="#f2a33a" strokeWidth={2} strokeDasharray="5 4" fill="#f2a33a" fillOpacity={0.1} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
            </RadarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Test score trend">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={hist} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="#e6eaf2" vertical={false} />
              <XAxis dataKey="n" tick={tick} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={tick} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tip} cursor={{ stroke: '#c3cbe0' }} />
              <Line type="monotone" dataKey="score" stroke="#3b5bfd" strokeWidth={3} dot={{ r: 5, fill: '#fff', stroke: '#3b5bfd', strokeWidth: 2 }} activeDot={{ r: 7 }} />
            </LineChart>
          </ResponsiveContainer>
          {!hist.length && <p className="dp-muted">Take an adaptive test to see your trend.</p>}
        </Panel>

        <Panel title="Company fit">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={d.companyFit} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="#e6eaf2" vertical={false} />
              <XAxis dataKey="company" tick={tick} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={tick} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tip} cursor={{ fill: 'rgba(59,91,253,0.06)' }} />
              <RBar dataKey="fit" radius={[6, 6, 0, 0]}>
                {d.companyFit.map((c) => <Cell key={c.company} fill={c.company === d.company ? '#3b5bfd' : '#c3cbe0'} />)}
              </RBar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Your weekly roadmap">
          <div className="dp-road">
            {d.roadmap.map((r) => (
              <div key={r.topic} className="dp-road-item">
                <div className="dp-road-head">
                  <b>{r.topic}</b>
                  <span className="dp-chip">{r.hoursPerWeek} h/week</span>
                </div>
                <ul>{r.focus.map((f) => <li key={f}>{f}</li>)}</ul>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
