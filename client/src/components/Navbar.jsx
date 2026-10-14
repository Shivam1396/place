import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const student = [['/', 'Dashboard'], ['/test', 'Adaptive Test'], ['/interview', 'Mock Interview'], ['/resume', 'Resume ATS'], ['/mentor', 'AI Mentor']];
const staff = [['/faculty', 'Faculty Dashboard'], ['/placement', 'Placement Analytics']];

export default function Navbar() {
  const { user, logout } = useAuth();
  const links = user.role === 'student' ? student : staff;
  return (
    <nav className="nav">
      <b className="brand">PlacePrep AI</b>
      <div className="links">{links.map(([to, label]) => <NavLink key={to} to={to} end>{label}</NavLink>)}</div>
      <span className="user">{user.name} · {user.role} <button className="btn sm" onClick={logout}>Logout</button></span>
    </nav>
  );
}
