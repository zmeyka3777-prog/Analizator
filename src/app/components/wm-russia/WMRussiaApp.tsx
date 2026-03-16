import React, { useState, useEffect, useMemo } from 'react';
import { WMUser, WMUserRole, WMFederalDistrict, MedRepData } from '@/types';
import { 
  allSalesData, 
  wmMockUsers, 
  getSalesDataByDistrict, 
  getSalesDataByTerritory,
  getMedRepDataById,
  getMedRepRanking
} from '@/data/wmRussiaData';
import { useSharedData } from '@/context/SharedDataContext';
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
import { LogIn, User, Mail, Lock, ArrowLeft, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { NoDataBanner } from '@/app/components/common/EmptyState';

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
  const [loginError, setLoginError] = useState('');

  // Get shared data from context (synced from MDLP uploads)
  const { wmRussiaData, wmRussiaSummary, dataLoaded: sharedDataLoaded } = useSharedData();

  // Merge shared data with mock data - shared data takes priority
  const salesData = useMemo(() => {
    if (wmRussiaData.length > 0) {
      // Combine uploaded data with mock data, avoiding duplicates
      const uploadedIds = new Set(wmRussiaData.map(d => d.id));
      const filteredMock = allSalesData.filter(d => !uploadedIds.has(d.id));
      return [...wmRussiaData, ...filteredMock];
    }
    return allSalesData;
  }, [wmRussiaData]);

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

  const handleLogin = () => {
    setLoginError('');
    
    if (!loginEmail.includes('@')) {
      setLoginError('Введите корректный email');
      return;
    }

    const user = wmMockUsers.find(u => u.email === loginEmail);
    if (!user) {
      setLoginError('Пользователь не найден');
      return;
    }

    setCurrentUser(user);
    localStorage.setItem('wm_russia_user', JSON.stringify(user));
    setActiveSection(getDefaultSection(user.role));
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
                  className="w-full pl-11 pr-4 py-3 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all"
                />
              </div>
              {loginError && (
                <div className="p-3 bg-red-500/20 border border-red-400/40 rounded-xl text-red-300 text-sm">{loginError}</div>
              )}
              <button
                onClick={handleLogin}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 text-white rounded-xl font-bold hover:from-cyan-400 hover:to-purple-400 transition-all shadow-lg shadow-cyan-500/30 flex items-center justify-center gap-2"
              >
                <LogIn className="h-4 w-4" />
                Войти
              </button>
            </div>
            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-xs text-gray-500 mb-3">Демо-аккаунты:</p>
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

  // Helper to get sales data from merged salesData instead of hardcoded mock
  const getDataByDistrict = (district: WMFederalDistrict) => {
    return salesData.filter(d => d.district === district);
  };
  
  const getDataByTerritory = (territory: string) => {
    return salesData.filter(d => d.territory === territory);
  };
  
  const getDataById = (id: string) => {
    return salesData.find(d => d.id === id) || null;
  };
  
  const getRanking = (medRepId: string, district: WMFederalDistrict) => {
    const districtData = getDataByDistrict(district);
    const sorted = [...districtData].sort((a, b) => 
      (b.totalPackagesFact / b.totalPackagesPlan) - (a.totalPackagesFact / a.totalPackagesPlan)
    );
    const position = sorted.findIndex(d => d.id === medRepId) + 1;
    return { position, total: sorted.length };
  };

  const renderDashboard = () => {
    switch (currentUser.role) {
      case 'medrep': {
        const medRepData = currentUser.medRepId
          ? getDataById(currentUser.medRepId)
          : null;

        if (!medRepData) {
          // Создаём пустую запись для отображения структуры дашборда
          const emptyData: MedRepData = {
            id: currentUser.medRepId || '0',
            name: currentUser.name,
            territory: currentUser.territory || '',
            district: currentUser.district || 'ПФО',
            kokarnitPlan: 0, kokarnitFact: 0,
            artoxanPlan: 0, artoxanFact: 0,
            artoxanTablPlan: 0, artoxanTablFact: 0,
            artoxanGelPlan: 0, artoxanGelFact: 0,
            seknidoxPlan: 0, seknidoxFact: 0,
            klodifenPlan: 0, klodifenFact: 0,
            drastopPlan: 0, drastopFact: 0,
            ortsepolPlan: 0, ortsepolFact: 0,
            limendaPlan: 0, limendaFact: 0,
            ronocitPlan: 0, ronocitFact: 0,
            doramitcinPlan: 0, doramitcinFact: 0,
            alfectoPlan: 0, alfectoFact: 0,
            totalPackagesPlan: 0, totalPackagesFact: 0,
            totalMoneyPlan: 0, totalMoneyFact: 0,
          };
          return <MedRepDashboard medRepData={emptyData} ranking={{ position: 0, total: 0 }} activeSection={activeSection} />;
        }

        const ranking = getRanking(medRepData.id, currentUser.district!);
        return <MedRepDashboard medRepData={medRepData} ranking={ranking} activeSection={activeSection} />;
      }

      case 'territory_manager': {
        const territoryMedReps = getDataByTerritory(currentUser.territory!);
        return (
          <TerritoryManagerDashboard
            territory={currentUser.territory!}
            district={currentUser.district!}
            medReps={territoryMedReps}
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

  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <div className="wm-app min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 text-white flex">
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
            <header className="wm-header sticky top-0 z-10 bg-slate-900/80 backdrop-blur-sm border-b border-white/10 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h1 className="text-xl font-semibold text-white">
                    {currentUser.role === 'director' && 'Кабинет директора'}
                    {currentUser.role === 'admin' && 'Панель администратора'}
                    {currentUser.role === 'manager' && `Округ: ${currentUser.district}`}
                    {currentUser.role === 'territory_manager' && `Территория: ${currentUser.territory}`}
                    {currentUser.role === 'medrep' && 'Личный кабинет'}
                  </h1>
                </div>

                <div className="flex items-center gap-4">
                  {/* Theme toggle */}
                  <button
                    onClick={toggleTheme}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm border border-white/10 hover:border-cyan-500/40 rounded-lg transition-all hover:bg-white/5"
                    title={isDark ? 'Светлая тема' : 'Тёмная тема'}
                  >
                    {isDark ? (
                      <Sun className="h-4 w-4 text-amber-400" />
                    ) : (
                      <Moon className="h-4 w-4 text-indigo-400" />
                    )}
                    <span className="hidden sm:inline text-gray-400">{isDark ? 'Светлая' : 'Тёмная'}</span>
                  </button>

                  {onBackToMDLP && (
                    <button
                      onClick={onBackToMDLP}
                      className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-cyan-300 border border-white/10 hover:border-cyan-500/40 rounded-lg transition-all"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      MDLP
                    </button>
                  )}

                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                      <span className="text-white text-sm font-medium" style={{ color: '#fff' }}>
                        {currentUser.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-sm font-medium text-white">{currentUser.name}</p>
                      <p className="text-xs text-gray-400">{getRoleName(currentUser.role)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            <div className="wm-content p-6 space-y-4">
              {salesData.length === 0 && (
                <NoDataBanner />
              )}
              {renderDashboard()}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default WMRussiaApp;
