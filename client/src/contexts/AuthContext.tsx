import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, TOKEN_KEY } from '../api/client';

export interface User {
  id: number;
  username: string;
  nickname: string | null;
  avatar: string | null;
  role: string;
  displayName?: string | null;
}

interface RegisterData {
  nickname: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  gender?: string;
  birthday?: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (account: string, password: string) => Promise<{ token: string; user: User }>;
  register: (data: RegisterData) => Promise<{ token: string; user: User }>;
  wechatLogin: (openid: string, nickname?: string, avatar?: string) => Promise<{ token: string; user: User }>;
  updateNickname: (nickname: string) => Promise<{ token: string; user: User }>;
  logout: () => void;
  setToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function setAuthHeader(token: string | null) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const applyLogin = (token: string, userData: User) => {
    localStorage.setItem(TOKEN_KEY, token);
    setAuthHeader(token);
    setUser(userData);
  };

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    setAuthHeader(token);
    api
      .get('/auth/me')
      .then((res) => {
        setUser(res.data.data.user);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setAuthHeader(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (account: string, password: string) => {
    const res = await api.post('/auth/login', { account, password });
    const { token, user: userData } = res.data.data;
    applyLogin(token, userData);
    return { token, user: userData };
  };

  const register = async (data: RegisterData) => {
    const res = await api.post('/auth/register', data);
    const { token, user: userData } = res.data.data;
    applyLogin(token, userData);
    return { token, user: userData };
  };

  const wechatLogin = async (openid: string, nickname?: string, avatar?: string) => {
    const res = await api.post('/auth/wechat-login', { openid, nickname, avatar });
    const { token, user: userData } = res.data.data;
    applyLogin(token, userData);
    return { token, user: userData };
  };

  const updateNickname = async (nickname: string) => {
    const res = await api.put('/auth/profile', { nickname });
    const { token, user: userData } = res.data.data;
    applyLogin(token, userData);
    return { token, user: userData };
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setAuthHeader(null);
    setUser(null);
  };

  const setToken = (token: string | null) => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      setAuthHeader(token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      setAuthHeader(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, wechatLogin, updateNickname, logout, setToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
