import { createContext, useContext, useState } from 'react';
import api from '../api/client';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const save = ({ token, user }) => { localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user)); setUser(user); };
  const login = async (body) => save((await api.post('/auth/login', body)).data);
  const register = async (body) => save((await api.post('/auth/register', body)).data);
  const logout = () => { localStorage.clear(); setUser(null); };
  return <Ctx.Provider value={{ user, login, register, logout }}>{children}</Ctx.Provider>;
}
