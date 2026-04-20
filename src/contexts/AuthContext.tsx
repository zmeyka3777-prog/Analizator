// ==================== КОНТЕКСТ АВТОРИЗАЦИИ ====================
// Читает сессию из localStorage('mdlp_user' + 'wm_auth_token'), созданную WMRussiaApp.
// login() делает реальный запрос к /api/auth/login.

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface SessionUser {
  id: string | number;
  email: string;
  fullName: string;
  role: string;
  territory?: string;
  district?: string;
  region?: string;
  avatar?: string;
}

interface AuthContextType {
  currentUser: SessionUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (updates: Partial<SessionUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_KEYS = ['wm_auth_token', 'mdlp_user', 'figma_auth_user'];

function readStoredUser(): SessionUser | null {
  try {
    const saved = localStorage.getItem('mdlp_user');
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    if (!parsed || typeof parsed !== 'object' || !parsed.email) return null;
    return {
      id: parsed.id,
      email: parsed.email,
      fullName: parsed.fullName || parsed.name || parsed.email,
      role: parsed.role || 'medrep',
      territory: parsed.territory,
      district: parsed.district,
      region: parsed.region,
      avatar: parsed.avatar,
    };
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(readStoredUser);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('mdlp_user', JSON.stringify(currentUser));
    }
  }, [currentUser]);

  const login = async (email: string, password: string): Promise<boolean> => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) return false;
    const data = await response.json();
    if (!data?.token || !data?.user) return false;
    localStorage.setItem('wm_auth_token', data.token);
    const user: SessionUser = {
      id: data.user.id,
      email: data.user.email,
      fullName: data.user.name || data.user.fullName || data.user.email,
      role: data.user.role,
      avatar: data.user.avatar,
    };
    setCurrentUser(user);
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
    AUTH_KEYS.forEach(k => localStorage.removeItem(k));
    localStorage.removeItem('mdlp_auth_token');
  };

  const updateUser = (updates: Partial<SessionUser>) => {
    if (currentUser) {
      setCurrentUser({ ...currentUser, ...updates });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      currentUser: null,
      isAuthenticated: false,
      login: async () => false,
      logout: () => {},
      updateUser: () => {},
    };
  }
  return context;
};
