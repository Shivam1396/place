import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api/client';
import { Card } from '../components/Card';

export default function Faculty() {
  const [d, setD] = useState(null);
  const [dept, setDept] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => { api.get('/analytics/faculty', { params: dept ? { department: dept } : {} }).then((r) => setD(r.data)); }, [dept]);
  if (!d) return <p>Loading…</p>;
  const rows = d.students.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div className="grid2">
        <Card title="Average topic performance">
          <ResponsiveContainer width="100%" height={220}><BarChart data={d.topicAverages}><XAxis dataKey="topic" /><YAxis domain={[0, 100]} /><Tooltip /><Bar dataKey="avg" fill="#4f46e5" /></BarChart></ResponsiveContainer>
        </Card>
        <Card title={`At-risk students (${d.atRisk.length})`}>
          {d.atRisk.slice(0, 6).map((s) => <div key={s.id} className="road"><b>{s.name}</b> <span className="pill no">readiness {s.readiness}</span> <span className="pill">P(place) {s.probability}%</span></div>)}
          {!d.atRisk.length && <p className="muted">No at-risk students 🎉</p>}
        </Card>
      </div>
      <Card title="All students">
        <div className="row"><input placeholder="Search name" value={q} onChange={(e) => setQ(e.target.value)} />
          <input placeholder="Filter department" value={dept} onChange={(e) => setDept(e.target.value)} /></div>
        <table><thead><tr><th>Name</th><th>Dept</th><th>CGPA</th><th>Target</th><th>Readiness</th><th>P(place)</th><th>Apt</th><th>DSA</th><th>Core</th><th>Verbal</th><th>Tests</th></tr></thead>
          <tbody>{rows.map((s) => (
            <tr key={s.id}><td>{s.name}</td><td>{s.department}</td><td>{s.cgpa}</td><td>{s.targetCompany}</td><td><b>{s.readiness}</b></td><td>{s.probability}%</td>
              <td>{s.topics.aptitude}</td><td>{s.topics.dsa}</td><td>{s.topics.core}</td><td>{s.topics.verbal}</td><td>{s.testsTaken}</td></tr>))}</tbody></table>
      </Card>
    </>
  );
}
