import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../api';
import type { Settings, User } from '../types';
import { useTheme } from './ThemeContext';

interface AuthResult { devToken?: string; message?: string }
interface AuthContextValue {
  user: User | null;
  settings: Settings | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (payload: { name: string; email: string; password: string; dateOfBirth?: string; consent: boolean }) => Promise<AuthResult>;
  logout: () => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<AuthResult>;
  resetPassword: (token: string, password: string) => Promise<AuthResult>;
  updateProfile: (payload: { name?: string; dateOfBirth?: string | null }) => Promise<void>;
  updateSettings: (payload: Partial<Settings>) => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextValue>(null as unknown as AuthContextValue);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const { setTheme } = useTheme();

  const loadSession = async () => {
    try {
      const { user: me } = await api.get<{ user: User }>('/auth/me');
      setUser(me);
      try {
        const profile = await api.get<{ settings: Settings }>('/user/profile');
        setSettings(profile.settings);
        if (profile.settings.theme) setTheme(profile.settings.theme);
      } catch {
        // Settings are optional for the session check.
      }
    } catch {
      setUser(null);
      setSettings(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSession(); }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    settings,
    loading,
    setUser,
    login: async (email, password) => {
      const result = await api.post<{ user: User; message: string }>('/auth/login', { email, password });
      setUser(result.user);
      await loadSession();
      return result;
    },
    register: async (payload) => {
      const result = await api.post<{ user: User; message: string; devToken?: string }>('/auth/register', payload);
      setUser(result.user);
      await loadSession();
      return result;
    },
    logout: async () => {
      await api.post('/auth/logout');
      setUser(null);
      setSettings(null);
    },
    verifyEmail: async (token) => {
      const result = await api.post<{ user: User }>('/auth/verify-email', { token });
      setUser(result.user);
    },
    forgotPassword: (email) => api.post<AuthResult>('/auth/forgot-password', { email }),
    resetPassword: (token, password) => api.post<AuthResult>('/auth/reset-password', { token, password }),
    updateProfile: async (payload) => {
      const result = await api.patch<{ user: User }>('/user/profile', payload);
      setUser(result.user);
    },
    updateSettings: async (payload) => {
      const result = await api.patch<{ settings: Settings; message: string }>('/user/cycle-settings', payload);
      setSettings(result.settings);
      if (payload.theme) setTheme(payload.theme);
    },
    refreshUser: loadSession,
  }), [user, settings, loading, setTheme]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
