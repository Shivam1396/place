import { useEffect, useRef, useState } from 'react';
import api from '../api/client';
import { Card } from '../components/Card';

const TOPICS = [['aptitude', 'Aptitude'], ['dsa', 'DSA'], ['core', 'Core CS'], ['verbal', 'Verbal']];

export default function AdaptiveTest() {
  const [companies, setCompanies] = useState([]);
  const [cfg, setCfg] = useState({ topic: 'aptitude', company: '' });
  const [run, setRun] = useState(null);     // {attemptId, question, index, total}
  const [fb, setFb] = useState(null);       // feedback on last answer
  const [picked, setPicked] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const t0 = useRef(Date.now());

  useEffect(() => {
    api.get('/companies').then((r) => setCompanies(r.data)).catch(() => {});
  }, []);

  const start = async () => {
    setError('');
    setResult(null);
    setFb(null);
    setPicked(null);
    try {
      const { data } = await api.post('/tests/start', { ...cfg, company: cfg.company || undefined });
      setRun(data);
      t0.current = Date.now();
    } catch (e) {
      setError(e.response?.data?.message || 'Could not start the test');
    }
  };

  const submit = async (i) => {
    if (fb) return;
    setPicked(i);
    try {
      const { data } = await api.post(`/tests/${run.attemptId}/answer`, {
        questionId: run.question._id,
        selected: i,
        timeSec: Math.round((Date.now() - t0.current) / 1000),
      });
      setFb(data);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not submit the answer');
    }
  };

  const next = () => {
    if (fb.done) {
      setResult(fb);
      setRun(null);
      return;
    }
    setRun({ ...run, question: fb.question, index: fb.index });
    setFb(null);
    setPicked(null);
    t0.current = Date.now();
  };

  if (result) {
    return (
      <Card title="Test complete">
        <h1>{result.score}/100</h1>
        <p>{result.correctCount}/{result.total} correct · ability estimate updated</p>
        <button className="btn" onClick={() => setResult(null)}>Take another</button>
      </Card>
    );
  }

  if (!run) {
    return (
      <Card title="Adaptive test (10 questions, difficulty adjusts to you)">
        <div className="row">
          <select value={cfg.topic} onChange={(e) => setCfg({ ...cfg, topic: e.target.value })}>
            {TOPICS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={cfg.company} onChange={(e) => setCfg({ ...cfg, company: e.target.value })}>
            <option value="">Any company</option>
            {companies.map((c) => <option key={c}>{c}</option>)}
          </select>
          <button className="btn" onClick={start}>Start</button>
        </div>
        {error && <p className="err">{error}</p>}
      </Card>
    );
  }

  const q = run.question;
  return (
    <Card title={`Question ${run.index} / ${run.total}`}>
      <p className="q">{q.text}</p>
      {q.options.map((o, i) => {
        let cls = 'opt';
        if (fb) cls += i === fb.correctIndex ? ' good' : i === picked ? ' bad' : '';
        return <button key={i} className={cls} onClick={() => submit(i)}>{o}</button>;
      })}
      {error && <p className="err">{error}</p>}
      {fb && (
        <div className="explain">
          <b>{fb.correct ? 'Correct!' : 'Incorrect.'}</b> {fb.explanation}
          <div><button className="btn" onClick={next}>{fb.done ? 'See result' : 'Next'}</button></div>
        </div>
      )}
    </Card>
  );
}