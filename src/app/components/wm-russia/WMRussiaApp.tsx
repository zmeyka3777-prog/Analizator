import React, { useState, useEffect, useMemo } from 'react';
import { WMUser, WMUserRole } from '@/types';
import { wmMockUsers, mergeMedRepData } from '@/data/wmRussiaData';
import { useSharedData } from '@/context/SharedDataContext';
import { ChevronDown, Globe, Filter } from 'lucide-react';
import { WMRussiaSidebar } from './WMRussiaSidebar';
import { MedRepDashboard } from './dashboards/MedRepDashboard';
import { TerritoryManagerDashboard } from './dashboards/TerritoryManagerDashboard';
import { RegionalManagerDashboard } from './dashboards/RegionalManagerDashboard';
import { AdminDashboard } from './dashboards/AdminDashboard';
import NewAdminDashboard from '@/app/pages/admin/AdminDashboard';
import NewRegionalManagerDashboard from '@/app/pages/regional-manager/RegionalManagerDashboard';
import { DirectorWMDashboard } from './dashboards/DirectorWMDashboard';
import AdminPanel from '@/app/components/admin/AdminPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { LogIn, Mail, Lock, ArrowLeft, Loader2 } from 'lucide-react';

function getDefaultSectionStatic(role: WMUserRole): string {
  switch (role) {
    case 'medrep': return 'my-sales';
    case 'territory_manager': return 'my-territory';
    case 'manager': return 'district-dashboard';
    case 'director': return 'director-dashboard';
    case 'admin': return 'admin-panel';
    default: return '';
  }
}

interface WMRussiaAppProps {
  onBackToMDLP?: () => void;
  mdlpUserId?: number;
  initialUser?: WMUser;
  onLogoutToMain?: () => void;
}

export function WMRussiaApp({ onBackToMDLP, mdlpUserId, initialUser, onLogoutToMain }: WMRussiaAppProps) {
  const [currentUser, setCurrentUser] = useState<WMUser | null>(initialUser || null);
  const [activeSection, setActiveSection] = useState<string>(initialUser ? getDefaultSectionStatic(initialUser.role) : '');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Get shared data from context (synced from MDLP uploads)
  const { wmRussiaData, dataLoaded: sharedDataLoaded } = useSharedData();

  // Используем только загруженные данные из SharedDataContext (без моков)
  const salesData = wmRussiaData;

  // Фильтр территорий: [] = весь файл, иначе выбранные territory
  const [selectedTerritories, setSelectedTerritories] = useState<string[]>(() => {
    if (!initialUser) return [];
    try {
      const saved = localStorage.getItem(`wm_territories_${initialUser.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [showTerritoryDropdown, setShowTerritoryDropdown] = useState(false);

  // Уникальные территории из загруженных данных
  const availableTerritories = useMemo(() =>
    Array.from(new Set(salesData.map(d => d.territory))).filter(Boolean).sort(),
  [salesData]);

  // Данные после фильтра (или весь файл)
  const filteredSalesData = useMemo(() =>
    selectedTerritories.length === 0
      ? salesData
      : salesData.filter(d => selectedTerritories.includes(d.territory)),
  [salesData, selectedTerritories]);

  const saveTerritories = (userId: string | number, territories: string[]) => {
    localStorage.setItem(`wm_territories_${userId}`, JSON.stringify(territories));
  };

  const toggleTerritory = (t: string) => {
    if (!currentUser) return;
    setSelectedTerritories(prev => {
      const next = prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t];
      saveTerritories(currentUser.id, next);
      return next;
    });
  };

  const selectAll = () => {
    if (!currentUser) return;
    setSelectedTerritories([]);
    saveTerritories(currentUser.id, []);
  };

  // При смене пользователя загружаем его сохранённые территории
  useEffect(() => {
    if (!currentUser) return;
    try {
      const saved = localStorage.getItem(`wm_territories_${currentUser.id}`);
      setSelectedTerritories(saved ? JSON.parse(saved) : []);
    } catch { setSelectedTerritories([]); }
  }, [currentUser?.id]);

  // Закрываем дропдаун по клику вне
  useEffect(() => {
    if (!showTerritoryDropdown) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-territory-dropdown]')) {
        setShowTerritoryDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showTerritoryDropdown]);

  useEffect(() => {
    if (initialUser) return; // Skip localStorage if initialUser provided
    const savedUser = localStorage.getItem('wm_russia_user');
    if (savedUser) {
      const user = JSON.parse(savedUser) as WMUser;
      setCurrentUser(user);
      setActiveSection(getDefaultSectionStatic(user.role));
    }
  }, [initialUser]);

  const getDefaultSection = getDefaultSectionStatic;

  const handleLogin = async () => {
    setLoginError('');

    if (!loginEmail.includes('@')) {
      setLoginError('Введите корректный email');
      return;
    }
    if (!loginPassword) {
      setLoginError('Введите пароль');
      return;
    }

    setLoginLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setLoginError(data.error || 'Ошибка входа');
        return;
      }

      localStorage.setItem('wm_auth_token', data.token);

      const user: WMUser = {
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role as WMUserRole,
        avatar: data.avatar,
      };

      setCurrentUser(user);
      localStorage.setItem('wm_russia_user', JSON.stringify(user));
      setActiveSection(getDefaultSection(user.role));

      // Синхронизируем с figma_auth_user чтобы AppLayout показывал правильное имя
      localStorage.setItem('figma_auth_user', JSON.stringify({
        id: user.id,
        email: user.email,
        fullName: user.name,
        role: user.role,
        isActive: true,
        createdAt: new Date().toISOString(),
      }));
    } catch {
      setLoginError('Ошибка соединения с сервером');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('wm_russia_user');
    setLoginEmail('');
    setActiveSection('');
    if (onLogoutToMain) {
      onLogoutToMain();
    }
  };

  const handleRoleSwitch = (role: WMUserRole, userId?: string) => {
    if (userId) {
      const user = wmMockUsers.find(u => u.id === userId);
      if (user) {
        setCurrentUser(user);
        localStorage.setItem('wm_russia_user', JSON.stringify(user));
        setActiveSection(getDefaultSection(user.role));
      }
    }
  };

  const getRoleName = (role: WMUserRole): string => {
    switch (role) {
      case 'medrep': return 'Медпред';
      case 'territory_manager': return 'Территориальный менеджер';
      case 'manager': return 'Региональный менеджер';
      case 'director': return 'Генеральный директор';
      case 'admin': return 'Администратор';
      default: return role;
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-gradient-to-tl from-purple-500/20 to-cyan-500/20 rounded-full blur-3xl" />
        <div className="w-full max-w-md relative z-10">
          <div className="bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 p-8 shadow-2xl shadow-black/40">
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/30">
                <span className="text-white text-2xl font-black">WM</span>
              </div>
              <h1 className="text-3xl font-black bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">WM Russia</h1>
              <p className="text-gray-400 text-sm mt-1">Анализатор продаж</p>
            </div>
            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  placeholder="email@orney.ru"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  disabled={loginLoading}
                  className="w-full pl-11 pr-4 py-3 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all disabled:opacity-50"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="password"
                  placeholder="Пароль"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  disabled={loginLoading}
                  className="w-full pl-11 pr-4 py-3 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all disabled:opacity-50"
                />
              </div>
              {loginError && (
                <div className="p-3 bg-red-500/20 border border-red-400/40 rounded-xl text-red-300 text-sm">{loginError}</div>
              )}
              <button
                onClick={handleLogin}
                disabled={loginLoading}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 text-white rounded-xl font-bold hover:from-cyan-400 hover:to-purple-400 transition-all shadow-lg shadow-cyan-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loginLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                {loginLoading ? 'Входим...' : 'Войти'}
              </button>
            </div>
            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-xs text-gray-500 mb-3">Быстрый вход:</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { label: 'Директор', email: 'director@orney.ru', cls: 'bg-amber-500/20 border-amber-500/30 text-amber-300' },
                  { label: 'Администратор', email: 'admin@orney.ru', cls: 'bg-red-500/20 border-red-500/30 text-red-300' },
                  { label: 'Менеджер ПФО', email: 'manager.pfo@orney.ru', cls: 'bg-purple-500/20 border-purple-500/30 text-purple-300' },
                  { label: 'ТМ Самара', email: 'tm.samara@orney.ru', cls: 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300' },
                  { label: 'Медпред', email: 'shestakova@orney.ru', cls: 'bg-blue-500/20 border-blue-500/30 text-blue-300' },
                ].map(acc => (
                  <button
                    key={acc.email}
                    onClick={() => setLoginEmail(acc.email)}
                    className={`text-left p-2.5 rounded-lg border transition-all hover:scale-[1.02] ${acc.cls}`}
                  >
                    <span className="font-semibold block">{acc.label}</span>
                    <span className="text-gray-500 text-[10px]">{acc.email}</span>
                  </button>
                ))}
              </div>
            </div>
            {onBackToMDLP && (
              <button
                onClick={onBackToMDLP}
                className="w-full mt-4 py-2.5 text-sm text-gray-400 hover:text-cyan-300 hover:bg-white/5 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Вернуться к MDLP аналитике
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }


  const renderDashboard = () => {
    switch (currentUser.role) {
      case 'medrep': {
        // Агрегируем отфильтрованные данные в одну запись
        const medRepData = mergeMedRepData(
          filteredSalesData.length > 0 ? filteredSalesData : []
        );
        medRepData.name = currentUser.name;
        const ranking = filteredSalesData.length > 0
          ? { position: 1, total: filteredSalesData.length }
          : { position: 0, total: 0 };
        return <MedRepDashboard medRepData={medRepData} ranking={ranking} activeSection={activeSection} />;
      }

      case 'territory_manager': {
        return (
          <TerritoryManagerDashboard
            territory={selectedTerritories.length === 0 ? 'Все территории' : selectedTerritories.join(', ')}
            district={currentUser.district || 'ПФО'}
            medReps={filteredSalesData}
            activeSection={activeSection}
          />
        );
      }

      case 'manager': {
        return (
          <NewRegionalManagerDashboard activeSection={activeSection} />
        );
      }

      case 'director': {
        return (
          <DirectorWMDashboard
            allMedReps={salesData}
            activeSection={activeSection}
            onRoleSwitch={handleRoleSwitch}
            mdlpUserId={mdlpUserId}
            onLogout={handleLogout}
          />
        );
      }

      case 'admin': {
        return (
          <NewAdminDashboard activeSection={activeSection} />
        );
      }

      default:
        return <div>Неизвестная роль</div>;
    }
  };

  // Директор: AppLayout из Figma (без сайдбара — навигация сверху через вкладки)
  if (currentUser.role === 'director') {
    return (
      <DirectorWMDashboard
        allMedReps={salesData}
        activeSection={activeSection}
        onRoleSwitch={handleRoleSwitch}
        mdlpUserId={mdlpUserId}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="wm-app min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 flex">
      <WMRussiaSidebar
        userRole={currentUser.role}
        userName={currentUser.name}
        activeSection={activeSection}
        onNavigate={setActiveSection}
        onLogout={handleLogout}
        onBackToMDLP={onBackToMDLP}
      />

      <main className="flex-1 lg:ml-64 min-h-screen">
        {activeSection === 'admin-panel' && currentUser.role !== 'admin' ? (
          <AdminPanel onBack={() => setActiveSection(getDefaultSection(currentUser.role))} />
        ) : (
          <>
            <header className="wm-header sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-slate-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h1 className="text-xl font-semibold text-slate-800">
                    {currentUser.role === 'admin' && 'Панель администратора'}
                    {currentUser.role === 'manager' && `Округ: ${currentUser.district}`}
                    {currentUser.role === 'territory_manager' && `Территория: ${currentUser.territory}`}
                    {currentUser.role === 'medrep' && 'Личный кабинет'}
                  </h1>

                  {/* Фильтр территорий — только для медпредов и территориальных менеджеров */}
                  {(currentUser.role === 'medrep' || currentUser.role === 'territory_manager') && availableTerritories.length > 0 && (
                    <div className="relative" data-territory-dropdown>
                      <button
                        onClick={() => setShowTerritoryDropdown(v => !v)}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm border border-slate-200 hover:border-cyan-400 rounded-lg bg-white hover:bg-cyan-50 transition-all shadow-sm"
                      >
                        <Filter className="h-3.5 w-3.5 text-slate-500" />
                        <span className="text-slate-700">
                          {selectedTerritories.length === 0
                            ? 'Весь файл'
                            : selectedTerritories.length === 1
                              ? selectedTerritories[0]
                              : `${selectedTerritories.length} территории`}
                        </span>
                        {selectedTerritories.length > 0 && (
                          <span className="bg-cyan-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                            {selectedTerritories.length}
                          </span>
                        )}
                        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                      </button>

                      {showTerritoryDropdown && (
                        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl min-w-[240px] max-h-72 overflow-y-auto">
                          <div className="p-2 border-b border-slate-100">
                            <button
                              onClick={() => { selectAll(); setShowTerritoryDropdown(false); }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                                selectedTerritories.length === 0
                                  ? 'bg-cyan-50 text-cyan-700'
                                  : 'hover:bg-slate-50 text-slate-600'
                              }`}
                            >
                              <Globe className="h-3.5 w-3.5" />
                              Весь файл
                            </button>
                          </div>
                          <div className="p-2 space-y-0.5">
                            {availableTerritories.map(territory => (
                              <label
                                key={territory}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer hover:bg-slate-50 transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedTerritories.includes(territory)}
                                  onChange={() => toggleTerritory(territory)}
                                  className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                                />
                                <span className="text-slate-700">{territory}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  {onBackToMDLP && (
                    <button
                      onClick={onBackToMDLP}
                      className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm text-slate-500 hover:text-cyan-600 border border-slate-200 hover:border-cyan-300 rounded-lg transition-all"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      MDLP
                    </button>
                  )}

                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                      <span className="text-white text-sm font-medium">
                        {currentUser.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-sm font-medium text-slate-800">{currentUser.name}</p>
                      <p className="text-xs text-slate-500">{getRoleName(currentUser.role)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            <div className="wm-content p-6 space-y-4">
              {renderDashboard()}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default WMRussiaApp;
