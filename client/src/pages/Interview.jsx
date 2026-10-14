import { useState } from 'react';
import api from '../api/client';
import { Card } from '../components/Card';
import ChatBox from '../components/ChatBox';

export default function Interview() {
  const [cfg, setCfg] = useState({ role: 'Software Engineer', type: 'technical', company: '' });
  const [session, setSession] = useState(null);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  const start = async () => {
    setError('');
    setReport(null);
    try {
      const { data } = await api.post('/interview/start', {
        ...cfg,
        company: cfg.company || undefined,
      });
      setSession(data);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not start the interview');
    }
  };

  const finish = async () => {
    if (!session?.id) return;
    try {
      const { data } = await api.post(`/interview/${session.id}/finish`);
      setReport(data);
      setSession(null);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not get feedback');
    }
  };

  // 1) Feedback screen
  if (report) {
    return (
      <Card title="Interview feedback">
        <h1>{report.score}/100</h1>
        <p>{report.summary}</p>
        <h4>Strengths</h4>
        <ul>{report.strengths?.map((s) => <li key={s}>{s}</li>)}</ul>
        <h4>Improve</h4>
        <ul>{report.improvements?.map((s) => <li key={s}>{s}</li>)}</ul>
        <button className="btn" onClick={() => setReport(null)}>New interview</button>
      </Card>
    );
  }

  // 2) Start form (shown first, session is null here)
  if (!session) {
    return (
      <Card title="AI mock interview">
        <div className="row">
          <input value={cfg.role} onChange={(e) => setCfg({ ...cfg, role: e.target.value })} placeholder="Role" />
          <select value={cfg.type} onChange={(e) => setCfg({ ...cfg, type: e.target.value })}>
            <option>technical</option>
            <option>hr</option>
            <option>behavioral</option>
          </select>
          <input value={cfg.company} onChange={(e) => setCfg({ ...cfg, company: e.target.value })} placeholder="Company (optional)" />
          <button className="btn" onClick={start}>Start</button>
        </div>
        {error && <p className="err">{error}</p>}
      </Card>
    );
  }

  // 3) Live interview (session exists here)
  return (
    <Card title={`${cfg.type} interview · ${cfg.role}`}>
      <ChatBox
        initial={session.messages || []}
        placeholder="Type your answer… (Enter to send)"
        onSend={async (t) => (await api.post(`/interview/${session.id}/reply`, { answer: t })).data.reply}
      />
      {error && <p className="err">{error}</p>}
      <button className="btn danger" onClick={finish}>End & get feedback</button>
    </Card>
  );
}