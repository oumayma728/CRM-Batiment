import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@/types';

const SESSION_KEY = 'baticrm_session';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  setUser: (userData: User | { user: User }) => void;
  logout: () => void;
}

interface StoredSession {
  token?: string;
  accessToken?: string;
  user?: User;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  loading: false,
  setUser: () => undefined,
  logout: () => undefined,
});

const getStoredSession = (storedSession: string | null): StoredSession | null => {
  if (!storedSession) {
    return null;
  }

  try {
    const parsed = JSON.parse(storedSession);
    return parsed?.user
      ? { token: parsed.token ?? parsed.accessToken, user: parsed.user }
      : { user: parsed };
  } catch (error) {
    console.error('Erreur lors de la lecture de la session:', error);
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [session, setSession] = useState(() =>
    getStoredSession(sessionStorage.getItem(SESSION_KEY)),
  );

  const user = session?.user ?? null;
  const isAuthenticated = Boolean(user && (session?.token || session?.accessToken));

  useEffect(() => {
    const handleAuthChange = () => {
      setSession(getStoredSession(sessionStorage.getItem(SESSION_KEY)));
    };

    window.addEventListener('auth-change', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);

    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  const login = (userData: User | { user: User }) => {
    const nextUser = 'user' in userData ? userData.user : userData;
    setSession({ user: nextUser });
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(userData));
  };

  const logout = () => {
    setSession(null);
    sessionStorage.removeItem(SESSION_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading: false,
        setUser: login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
