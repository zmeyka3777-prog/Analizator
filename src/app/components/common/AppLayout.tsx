// ==================== БАЗОВЫЙ LAYOUT ДЛЯ ПРИЛОЖЕНИЯ ====================

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleLabel } from '@/types/user.types';
import { Button } from '@/app/components/ui/button';
import {
  LogOut,
  Menu,
  X,
  User,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';

// Логотип
const Logo = ({ size = 'normal' }: { size?: 'small' | 'normal' }) => {
  const sizeClasses = size === 'small' ? 'w-8 h-8 text-sm' : 'w-10 h-10 text-base';

  return (
    <div className="flex items-center gap-2">
      <div className={`${sizeClasses} rounded-xl bg-gradient-to-br from-cyan-500 via-cyan-600 to-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/30 relative overflow-hidden group`}>
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className="relative tracking-tight">WM</span>
      </div>
      {size !== 'small' && (
        <div>
          <h1 className="font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent text-sm">
            World Medicine
          </h1>
          <p className="text-[10px] text-slate-400 -mt-1">MDLP Analytics Pro</p>
        </div>
      )}
    </div>
  );
};

interface AppLayoutProps {
  children: React.ReactNode;
  navigation?: React.ReactNode; // Навигация для конкретной роли
  onLogout?: () => void; // Дополнительный обработчик при выходе
}

export default function AppLayout({ children, navigation, onLogout }: AppLayoutProps) {
  const { currentUser, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Logo />

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-4 flex-1 ml-8">
              {navigation}
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              {/* User Profile */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-medium text-sm">
                    {currentUser.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-slate-800">{currentUser.fullName}</p>
                    <p className="text-xs text-slate-500">{getRoleLabel(currentUser.role)}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50">
                      <div className="px-4 py-3 border-b border-slate-100">
                        <p className="text-sm font-medium text-slate-800">{currentUser.fullName}</p>
                        <p className="text-xs text-slate-500">{currentUser.email}</p>
                        <p className="text-xs text-cyan-600 mt-1">{getRoleLabel(currentUser.role)}</p>
                      </div>

                      <button
                        onClick={() => {
                          logout();
                          onLogout?.();
                          setUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Выйти
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6 text-slate-700" />
                ) : (
                  <Menu className="w-6 h-6 text-slate-700" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="lg:hidden py-4 border-t border-slate-200">
              {navigation}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
