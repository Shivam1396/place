import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import AdaptiveTest from './pages/AdaptiveTest';
import Interview from './pages/Interview';
import Resume from './pages/Resume';
import Mentor from './pages/Mentor';
import Faculty from './pages/Faculty';
import Placement from './pages/Placement';

function Guard({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();
  const home = user?.role === 'student' ? <Dashboard /> : <Navigate to="/faculty" replace />;
  return (
    <>
      {user && <Navbar />}
      <main className="container">
        <Routes>
          <Route path="/login" element={<Auth />} />
          <Route path="/" element={<Guard>{home}</Guard>} />
          <Route path="/test" element={<Guard roles={['student']}><AdaptiveTest /></Guard>} />
          <Route path="/interview" element={<Guard roles={['student']}><Interview /></Guard>} />
          <Route path="/resume" element={<Guard roles={['student']}><Resume /></Guard>} />
          <Route path="/mentor" element={<Guard roles={['student']}><Mentor /></Guard>} />
          <Route path="/faculty" element={<Guard roles={['faculty', 'admin']}><Faculty /></Guard>} />
          <Route path="/placement" element={<Guard roles={['faculty', 'admin']}><Placement /></Guard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
