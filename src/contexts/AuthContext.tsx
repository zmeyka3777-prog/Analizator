// ==================== КОНТЕКСТ АВТОРИЗАЦИИ (FIGMA) ====================

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserSession } from '@/types/user.types';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Дефолтный пользователь-директор для демо
const DEFAULT_DIRECTOR: User = {
  id: 'director-001',
  email: 'director@orney.ru',
  fullName: 'Директор WM',
  role: 'director',
  territory: 'Приволжский ФО',
  district: 'ПФО',
  isActive: true,
  createdAt: new Date().toISOString(),
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('figma_auth_user');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    // Автоматически авторизуем как директор для демо
    return DEFAULT_DIRECTOR;
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('figma_auth_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('figma_auth_user');
    }
  }, [currentUser]);

  const login = async (email: string, _password: string): Promise<boolean> => {
    // Простая демо-авторизация
    const user: User = {
      id: `user-${Date.now()}`,
      email,
      fullName: email.split('@')[0],
      role: 'director',
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    setCurrentUser(user);
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('figma_auth_user');
  };

  const updateUser = (updates: Partial<User>) => {
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
    // Fallback for when used outside provider
    return {
      currentUser: DEFAULT_DIRECTOR,
      isAuthenticated: true,
      login: async () => true,
      logout: () => {},
      updateUser: () => {},
    };
  }
  return context;
};
