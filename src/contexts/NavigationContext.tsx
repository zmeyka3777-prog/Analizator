// ==================== КОНТЕКСТ НАВИГАЦИИ ====================

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type ViewType = 'analyzer' | 'director-dashboard' | 'regional-manager' | 'territorial-manager' | 'med-rep';

interface NavigationContextType {
  currentView: ViewType;
  navigate: (view: ViewType) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<ViewType>(() => {
    try {
      const saved = localStorage.getItem('currentView');
      return (saved as ViewType) || 'analyzer';
    } catch {
      return 'analyzer';
    }
  });

  const navigate = (view: ViewType) => {
    setCurrentView(view);
    try {
      localStorage.setItem('currentView', view);
    } catch {
      // ignore
    }
  };

  return (
    <NavigationContext.Provider value={{ currentView, navigate }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigate = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    // Fallback: return a no-op navigate function instead of throwing
    return (_view: ViewType) => {
      console.warn('NavigationContext not available, navigation ignored');
    };
  }
  return context.navigate;
};

export const useCurrentView = () => {
  const context = useContext(NavigationContext);
  return context?.currentView || 'analyzer';
};
