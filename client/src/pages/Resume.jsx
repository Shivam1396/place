import { useEffect, useState } from 'react';
import api from '../api/client';
import { Card, Bar } from '../components/Card';

export default function Resume() {
  const [roles, setRoles] = useState([]);
  const [role, setRole] = useState('software engineer');
  const [jd, setJd] = useState('');
  const [file, setFile] = useState(null);
  const [r, setR] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get('/resume/roles').then((x) => setRoles(x.data)); }, []);

  const analyze = async () => {
    if (!file) return setErr('Choose a PDF first');
    setErr(''); setBusy(true);
    const fd = new FormData(); fd.append('resume', file); fd.append('role', role); fd.append('jobDescription', jd);
    try { setR((await api.post('/resume/analyze', fd)).data); } catch (e) { setErr(e.response?.data?.message || 'Failed'); }
    setBusy(false);
  };
  return (
    <>
      <Card title="Resume ATS checker">
        <div className="row">
          <select value={role} onChange={(e) => setRole(e.target.value)}>{roles.map((x) => <option key={x}>{x}</option>)}</select>
          <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files[0])} />
          <button className="btn" onClick={analyze} disabled={busy}>{busy ? 'Analyzing…' : 'Analyze'}</button>
        </div>
        <textarea rows={3} placeholder="Paste job description (optional)" value={jd} onChange={(e) => setJd(e.target.value)} />
        {err && <p className="err">{err}</p>}
      </Card>
      {r && (
        <div className="grid2">
          <Card title="ATS score"><h1>{r.score}/100</h1><Bar value={r.score} />
            <h4>Sections</h4>{Object.entries(r.sections).map(([k, v]) => <span key={k} className={`pill ${v ? 'ok' : 'no'}`}>{k}</span>)}
            <h4>Suggestions</h4><ul>{r.suggestions.map((s) => <li key={s}>{s}</li>)}</ul></Card>
          <Card title="Keywords">
            <h4>Matched</h4>{r.matchedKeywords.map((k) => <span key={k} className="pill ok">{k}</span>)}
            <h4>Missing</h4>{r.missingKeywords.map((k) => <span key={k} className="pill no">{k}</span>)}</Card>
        </div>
      )}
    </>
  );
}
