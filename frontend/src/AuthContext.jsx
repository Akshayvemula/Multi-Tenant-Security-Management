import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';

const AuthContext = createContext(null);
const STORAGE_KEY = 'deep-trace-session';

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
  });
  const [checking, setChecking] = useState(Boolean(session?.accessToken));

  useEffect(() => {
    if (!session?.accessToken) return;
    api('/api/auth/me', { token: session.accessToken })
      .then(({ user }) => setSession((current) => ({ ...current, user })))
      .catch(() => { localStorage.removeItem(STORAGE_KEY); setSession(null); })
      .finally(() => setChecking(false));
  }, []);

  const login = (nextSession) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
  };
  const logout = () => { localStorage.removeItem(STORAGE_KEY); setSession(null); };

  return <AuthContext.Provider value={{ session, login, logout, checking }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

