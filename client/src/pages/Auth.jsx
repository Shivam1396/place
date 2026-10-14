import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
    <div className="auth card">
      <h2>{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>
      <form onSubmit={submit}>
        {mode === 'register' && <>
          <input placeholder="Full name" value={f.name} onChange={set('name')} required />
          <select value={f.role} onChange={set('role')}><option value="student">Student</option><option value="faculty">Faculty / Placement cell</option></select>
          <input placeholder="Department" value={f.department} onChange={set('department')} />
          <div className="row"><input type="number" placeholder="Batch" value={f.batch} onChange={set('batch')} />
            <input type="number" step="0.1" placeholder="CGPA" value={f.cgpa} onChange={set('cgpa')} /></div>
          <select value={f.targetCompany} onChange={set('targetCompany')}>{['TCS', 'Infosys', 'Wipro', 'Accenture', 'Amazon', 'Google'].map((c) => <option key={c}>{c}</option>)}</select>
        </>}
        <input type="email" placeholder="Email" value={f.email} onChange={set('email')} required />
        <input type="password" placeholder="Password" value={f.password} onChange={set('password')} required minLength={6} />
        {err && <p className="err">{err}</p>}
        <button className="btn">{mode === 'login' ? 'Login' : 'Register'}</button>
      </form>
      <p className="muted" style={{ cursor: 'pointer' }} onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'New here? Register' : 'Have an account? Login'}
      </p>
      <p className="muted">Demo: student@demo.com / faculty@demo.com — password123</p>
    </div>
  );
}
