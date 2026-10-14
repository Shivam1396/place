import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './auth.css';

const FEATURES = [
  ['Adaptive tests', 'Questions get harder or easier as you answer.'],
  ['Mock interviews', 'Practise technical and HR rounds with AI feedback.'],
  ['Resume ATS check', 'See how a screening system scores your resume.'],
  ['AI mentor', 'Ask for study plans and company-specific prep.'],
];

function Field({ label, hint, children }) {
  return (
    <label className="au-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export default function Auth() {
  const { login, register } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ name: '', email: '', password: '', department: 'AI&DS', batch: 2026, cgpa: 7.5, targetCompany: 'TCS', role: 'student' });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setErr('');
    try { mode === 'login' ? await login({ email: f.email, password: f.password }) : await register(f); nav('/'); }
    catch (x) { setErr(x.response?.data?.message || 'Failed'); }
  };
  return (
    <div className="au">
      <aside className="au-side">
        <svg className="au-deco" viewBox="0 0 400 400" aria-hidden="true">
          <circle cx="200" cy="200" r="150" />
          <circle cx="200" cy="200" r="104" />
          <circle cx="200" cy="200" r="58" />
        </svg>
        <div className="au-brand">PlacePrep AI</div>
        <div className="au-pitch">
          <h1>Get ready for campus placements, one practice session at a time.</h1>
          <p>Built for TCS, Infosys, Wipro, Accenture, Amazon and Google.</p>
          <ul>
            {FEATURES.map(([t, d]) => (
              <li key={t}><b>{t}</b><span>{d}</span></li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="au-main">
        <div className="au-card">
          <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
          <p className="au-sub">{mode === 'login' ? 'Log in to continue your preparation.' : 'It takes under a minute.'}</p>
          <form onSubmit={submit}>
            {mode === 'register' && <>
              <Field label="Full name">
                <input placeholder="Your full name" value={f.name} onChange={set('name')} required />
              </Field>
              <Field label="I am a">
                <select value={f.role} onChange={set('role')}><option value="student">Student</option><option value="faculty">Faculty / Placement cell</option></select>
              </Field>
              <Field label="Department" hint="For example CSE, IT or AI&DS">
                <input placeholder="Your department" value={f.department} onChange={set('department')} />
              </Field>
              <div className="au-row">
                <Field label="Graduation year" hint="Year you pass out">
                  <input type="number" placeholder="2026" value={f.batch} onChange={set('batch')} />
                </Field>
                <Field label="CGPA" hint="Out of 10">
                  <input type="number" step="0.1" placeholder="7.5" value={f.cgpa} onChange={set('cgpa')} />
                </Field>
              </div>
              <Field label="Target company" hint="The company you are preparing for first">
                <select value={f.targetCompany} onChange={set('targetCompany')}>{['TCS', 'Infosys', 'Wipro', 'Accenture', 'Amazon', 'Google'].map((c) => <option key={c}>{c}</option>)}</select>
              </Field>
            </>}
            <Field label="Email">
              <input type="email" placeholder="you@example.com" value={f.email} onChange={set('email')} required />
            </Field>
            <Field label="Password" hint={mode === 'register' ? 'At least 6 characters' : undefined}>
              <input type="password" placeholder="Enter your password" value={f.password} onChange={set('password')} required minLength={6} />
            </Field>
            {err && <p className="au-err" role="alert">{err}</p>}
            <button className="au-btn">{mode === 'login' ? 'Log in' : 'Create account'}</button>
          </form>
          <button type="button" className="au-switch" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'New here? Create an account' : 'Have an account? Log in'}
          </button>
          <p className="au-demo">Demo logins: student@demo.com or faculty@demo.com, password <b>password123</b></p>
        </div>
      </main>
    </div>
  );
}
