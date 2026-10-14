import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../api/client';
import { Card, Stat } from '../components/Card';

export default function Placement() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get('/analytics/placement').then((r) => setD(r.data)); }, []);
  if (!d) return <p>Loading…</p>;
  return (
    <>
      <div className="grid4">
        <Card><Stat label="Students" value={d.total} /></Card>
        <Card><Stat label="Placed" value={d.placed} /></Card>
        <Card><Stat label="Avg readiness" value={d.avgReadiness} suffix="/100" /></Card>
        <Card><Stat label="Placement rate" value={d.total ? Math.round((d.placed / d.total) * 100) : 0} suffix="%" /></Card>
      </div>
      <div className="grid2">
        <Card title="Readiness distribution">
          <ResponsiveContainer width="100%" height={240}><BarChart data={d.distribution}><XAxis dataKey="label" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#4f46e5" /></BarChart></ResponsiveContainer>
        </Card>
        <Card title="Department comparison">
          <ResponsiveContainer width="100%" height={240}><BarChart data={d.departments}><XAxis dataKey="department" /><YAxis domain={[0, 100]} /><Tooltip /><Bar dataKey="avg" fill="#10b981" /></BarChart></ResponsiveContainer>
        </Card>
      </div>
      <Card title="Company-wise readiness (eligible = fit ≥ 80%)">
        <ResponsiveContainer width="100%" height={260}><BarChart data={d.companies}><XAxis dataKey="company" /><YAxis /><Tooltip /><Legend />
          <Bar dataKey="avgFit" name="Avg fit %" fill="#f59e0b" /><Bar dataKey="eligible" name="Eligible students" fill="#4f46e5" /></BarChart></ResponsiveContainer>
      </Card>
    </>
  );
}
