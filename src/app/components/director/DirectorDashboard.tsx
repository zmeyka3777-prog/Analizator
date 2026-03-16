import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  LayoutDashboard, Calculator, Pill, MapPin, Users, FileText,
  Settings, TrendingUp, TrendingDown, Target, ArrowLeft, Sparkles, CheckCircle
} from 'lucide-react';
import BudgetCalculator from './tabs/BudgetCalculator';
import ProductsAnalytics from './tabs/ProductsAnalytics';
import TerritoriesTab from './tabs/TerritoriesTab';
import EmployeesTab from './tabs/EmployeesTab';
import ReportsTab from './tabs/ReportsTab';
interface DirectorDashboardProps {
  onBack: () => void;
  userName?: string;
}

type TabType = 'dashboard' | 'budget' | 'products' | 'territories' | 'employees' | 'reports' | 'settings';

const WM_PRODUCTS = [
  { id: 1, name: 'COCARNIT', category: 'Ноотропы', color: '#3B82F6' },
  { id: 2, name: 'RONOCIT', category: 'Ноотропы', color: '#8B5CF6' },
  { id: 3, name: 'ARTOXAN LYOF 20MG', category: 'НПВС', color: '#10B981' },
  { id: 4, name: 'DORAMYCIN', category: 'Антибиотики', color: '#F59E0B' },
  { id: 5, name: 'ORCIPOL', category: 'Антибиотики', color: '#EF4444' },
  { id: 6, name: 'DRASTOP ADVANCE', category: 'Хондропротекторы', color: '#06B6D4' },
  { id: 7, name: 'LIMENDA', category: 'Анксиолитики', color: '#EC4899' },
  { id: 8, name: 'SECNIDOX', category: 'Антибиотики', color: '#84CC16' },
  { id: 9, name: 'CLODIFEN NEURO', category: 'НПВС', color: '#F97316' },
  { id: 10, name: 'ARTOXAN 20MG', category: 'НПВС', color: '#14B8A6' },
  { id: 11, name: 'ARTOXAN GEL', category: 'НПВС', color: '#A855F7' },
  { id: 12, name: 'APFECTO', category: 'Кардиология', color: '#6366F1' },
];

const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

export function DirectorDashboard({ onBack, userName = 'Иванов Иван Иванович' }: DirectorDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const salesStats = useMemo(() => {
    return {
      sales2025: 462613426,
      sales2026: 543433314,
      plan2026: 624948311,
      planCompletion: 79.8,
      growth: 17.5,
      units2025: 1250000,
      units2026: 1468750,
    };
  }, []);

  const monthlyData = useMemo(() => {
    const baseValues = [32, 35, 38, 42, 45, 48, 52, 55, 50, 47, 44, 40];
    return MONTHS.map((month, idx) => {
      const base2024 = baseValues[idx] * 1000000;
      const base2025 = Math.round(base2024 * 1.15);
      const base2026 = Math.round(base2025 * 1.18);
      return {
        month,
        sales2024: base2024,
        sales2025: base2025,
        sales2026: base2026,
        units2024: Math.round(base2024 / 400),
        units2025: Math.round(base2025 / 400),
        units2026: Math.round(base2026 / 400),
      };
    });
  }, []);

  const productRankings = useMemo(() => {
    const completionValues = [100, 100, 100, 100, 100, 100, 99, 99, 100, 100, 100, 101];
    return WM_PRODUCTS.map((product, idx) => {
      const basePlan = 65074120 - idx * 4000000;
      const completion = completionValues[idx];
      const fact = Math.round(basePlan * (completion / 100));
      const unitsPlan = Math.round(basePlan / 690);
      const unitsFact = Math.round(fact / 690);
      const unitsCompletion = Math.round((unitsFact / unitsPlan) * 100);
      return {
        ...product,
        planRub: basePlan,
        factRub: fact,
        completionRub: completion,
        planUnits: unitsPlan,
        factUnits: unitsFact,
        completionUnits: unitsCompletion,
      };
    }).sort((a, b) => b.factRub - a.factRub);
  }, []);

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)} млрд ₽`;
    if (value >= 1000000) return `${(value / 1000000).toFixed(0)} млн ₽`;
    return `${value.toLocaleString('ru-RU')} ₽`;
  };

  const formatNumber = (value: number) => {
    return value.toLocaleString('ru-RU');
  };

  const tabs = [
    { id: 'dashboard' as TabType, label: 'Дашборд', icon: LayoutDashboard },
    { id: 'budget' as TabType, label: 'Калькулятор бюджета', icon: Calculator },
    { id: 'products' as TabType, label: 'По препаратам', icon: Pill },
    { id: 'territories' as TabType, label: 'По территориям', icon: MapPin },
    { id: 'employees' as TabType, label: 'Сотрудники', icon: Users },
    { id: 'reports' as TabType, label: 'Отчёты', icon: FileText },
  ];

  const renderKPICard = (
    title: string,
    value: string,
    subtitle: string,
    trend: number,
    icon: React.ReactNode,
    gradientFrom: string,
    gradientTo: string
  ) => (
    <div className="wm-card relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-6 hover:scale-[1.02] transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-white mb-2">{value}</p>
          <div className="flex items-center gap-2">
            {trend > 0 ? (
              <span className="flex items-center text-emerald-400 text-sm">
                <TrendingUp className="w-4 h-4 mr-1" />
                +{trend.toFixed(1)}%
              </span>
            ) : (
              <span className="flex items-center text-red-400 text-sm">
                <TrendingDown className="w-4 h-4 mr-1" />
                {trend.toFixed(1)}%
              </span>
            )}
            <span className="text-xs text-gray-500">{subtitle}</span>
          </div>
        </div>
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradientFrom} ${gradientTo} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  );

  const renderProductRankingItem = (
    product: typeof productRankings[0],
    index: number,
    type: 'rub' | 'units'
  ) => {
    const completion = type === 'rub' ? product.completionRub : product.completionUnits;
    const fact = type === 'rub' ? product.factRub : product.factUnits;
    const plan = type === 'rub' ? product.planRub : product.planUnits;
    const completionColor = completion >= 100 ? 'text-emerald-400' : completion >= 90 ? 'text-yellow-400' : 'text-red-400';
    const barColor = completion >= 100 ? 'bg-emerald-500' : completion >= 90 ? 'bg-blue-500' : 'bg-yellow-500';

    return (
      <div key={`${product.id}-${type}`} className="flex items-center gap-4 py-3 border-b border-white/10 last:border-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm`}
             style={{ backgroundColor: product.color }}>
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-white truncate">{product.name}</span>
            <span className={`font-bold ${completionColor}`}>{completion}%</span>
          </div>
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${barColor} rounded-full transition-all duration-500`}
              style={{ width: `${Math.min(completion, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-400">
            <span>Факт: {type === 'rub' ? formatCurrency(fact) : `${formatNumber(fact)} упак.`}</span>
            <span>План: {type === 'rub' ? formatCurrency(plan) : `${formatNumber(plan)} упак.`}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderDashboardTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            Панель директора
          </h2>
          <p className="text-gray-400 mt-1">Аналитика и планирование продаж</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium hover:opacity-90 transition-opacity flex items-center gap-2">
            <Pill className="w-4 h-4" />
            Управление препаратами
          </button>
          <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium hover:opacity-90 transition-opacity flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Управление территориями
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {renderKPICard(
          'Продажи 2025',
          formatCurrency(salesStats.sales2025),
          'План: 580 000 000 ₽',
          17.8,
          <TrendingUp className="w-7 h-7 text-white" />,
          'from-blue-500',
          'to-cyan-500'
        )}
        {renderKPICard(
          'Продажи 2026',
          formatCurrency(salesStats.sales2026),
          `План: ${formatCurrency(salesStats.plan2026)}`,
          salesStats.growth,
          <TrendingUp className="w-7 h-7 text-white" />,
          'from-violet-500',
          'to-purple-600'
        )}
        {renderKPICard(
          'Выполнение плана',
          `${salesStats.planCompletion.toFixed(1)}%`,
          `${formatCurrency(salesStats.plan2026)}`,
          0,
          <Target className="w-7 h-7 text-white" />,
          'from-emerald-500',
          'to-green-600'
        )}
        {renderKPICard(
          'Рост vs 2025',
          formatCurrency(salesStats.sales2026 - salesStats.sales2025),
          '',
          salesStats.growth,
          <TrendingUp className="w-7 h-7 text-white" />,
          'from-blue-600',
          'to-indigo-700'
        )}
      </div>

      <div className="wm-card bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <LayoutDashboard className="w-5 h-5 text-blue-400" />
          Динамика продаж 2024-2025-2026
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm text-gray-400 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              Продажи в рублях (₽)
            </h4>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="gradient2024" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#94A3B8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gradient2025" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gradient2026" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '12px' }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value: number) => [formatCurrency(value), '']}
                />
                <Legend />
                <Area type="monotone" dataKey="sales2024" name="2024" stroke="#94A3B8" fill="url(#gradient2024)" strokeWidth={2} />
                <Area type="monotone" dataKey="sales2025" name="2025" stroke="#8B5CF6" fill="url(#gradient2025)" strokeWidth={2} />
                <Area type="monotone" dataKey="sales2026" name="2026" stroke="#06B6D4" fill="url(#gradient2026)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h4 className="text-sm text-gray-400 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500"></span>
              Продажи в упаковках (шт.)
            </h4>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="gradientUnits2024" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#94A3B8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gradientUnits2025" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gradientUnits2026" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '12px' }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value: number) => [`${formatNumber(value)} упак.`, '']}
                />
                <Legend />
                <Area type="monotone" dataKey="units2024" name="2024" stroke="#94A3B8" fill="url(#gradientUnits2024)" strokeWidth={2} />
                <Area type="monotone" dataKey="units2025" name="2025" stroke="#8B5CF6" fill="url(#gradientUnits2025)" strokeWidth={2} />
                <Area type="monotone" dataKey="units2026" name="2026" stroke="#F43F5E" fill="url(#gradientUnits2026)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 backdrop-blur-xl rounded-2xl border border-cyan-500/30 p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-white">AI-анализ и прогноз</h3>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Достоверность: высокая
              </span>
            </div>
            <p className="text-gray-300 leading-relaxed">
              Рост 15.0% за январь соответствует целевым показателям. Лидеры роста: RONOCIT (+22%), ARTOXAN 20MG (+20%), DORAMYCIN (+17%). 
              Все препараты показывают положительную динамику! Поддерживайте текущий темп и активизируйте отстающие регионы.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="wm-card bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Pill className="w-5 h-5 text-blue-400" />
            Рейтинг препаратов по продажам в руб. (план/факт)
          </h3>
          <div className="space-y-1 max-h-[500px] overflow-y-auto pr-2">
            {productRankings.map((product, idx) => renderProductRankingItem(product, idx, 'rub'))}
          </div>
        </div>

        <div className="wm-card bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Pill className="w-5 h-5 text-rose-400" />
            Рейтинг препаратов по продажам в упак. (план/факт)
          </h3>
          <div className="space-y-1 max-h-[500px] overflow-y-auto pr-2">
            {productRankings
              .sort((a, b) => b.factUnits - a.factUnits)
              .map((product, idx) => renderProductRankingItem(product, idx, 'units'))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPlaceholderTab = (title: string, description: string) => (
    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
      <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
        <Settings className="w-10 h-10 text-gray-500" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-500">{description}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-[1600px] mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  WM
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">World Medicine</h1>
                  <p className="text-xs text-gray-400">МДЛП Analytics Pro</p>
                </div>
              </div>
              <nav className="flex items-center gap-1 ml-8">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Вернуться в анализатор МДЛП
              </button>
              <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  И
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{userName}</p>
                  <p className="text-xs text-gray-400">Генеральный директор</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-6">
        {activeTab === 'dashboard' && renderDashboardTab()}
        {activeTab === 'budget' && <BudgetCalculator />}
        {activeTab === 'products' && <ProductsAnalytics />}
        {activeTab === 'territories' && <TerritoriesTab />}
        {activeTab === 'employees' && <EmployeesTab />}
        {activeTab === 'reports' && <ReportsTab />}
      </main>
    </div>
  );
}

export default DirectorDashboard;
