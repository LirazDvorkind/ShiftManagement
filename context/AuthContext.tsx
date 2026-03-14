/**
 * @file context/AuthContext.tsx
 * @description Global authentication context.
 *
 * Persists the JWT and user payload in localStorage under the keys
 * 'sm_token' and 'sm_user'. The isLoading flag is true only during
 * the initial hydration from localStorage; components should wait for
 * it to be false before making auth-dependent decisions.
 */

'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser } from '@/types';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('sm_token');
      const storedUser = localStorage.getItem('sm_user');
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch {
      localStorage.removeItem('sm_token');
      localStorage.removeItem('sm_user');
    } finally {
      setIsLoading(false);
    }
  }, []);

  function login(token: string, user: AuthUser) {
    localStorage.setItem('sm_token', token);
    localStorage.setItem('sm_user', JSON.stringify(user));
    setToken(token);
    setUser(user);
  }

  function logout() {
    localStorage.removeItem('sm_token');
    localStorage.removeItem('sm_user');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
