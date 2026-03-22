// ==================== ДАШБОРД ГЕНЕРАЛЬНОГО ДИРЕКТОРА ====================

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from '@/contexts/NavigationContext';
import { DateProvider } from '@/contexts/DateContext';
import {
  Package,
  FileText,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  Target,
  BarChart3,
  PieChart,
  Activity,
  Award,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Save,
  Eye,
  Edit2,
  Copy,
  Trash2,
  ArrowLeft,
  Settings,
  LayoutDashboard,
  Calculator,
  MapPin,
  Users,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import AppLayout from '@/app/components/common/AppLayout';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import { PRODUCTS, TERRITORIES, getTotalStats, aggregateByProduct, getMonthlyDynamics, getMonthlyDynamicsUnits, BUDGET_PFO_2025 } from '@/data/salesData';
import { FEDERAL_DISTRICTS, getTotalRussiaBudget2025, getDistrictStats, FederalDistrict } from '@/data/federalDistricts';
import ProductsAnalyticsWithEdit from '@/app/pages/director/ProductsAnalyticsWithEdit';
import BudgetCalculatorEnhanced from '@/app/pages/director/BudgetCalculatorEnhanced';
import TerritoriesAnalytics from '@/app/pages/director/TerritoriesAnalytics';
import EmployeesAnalytics from '@/app/pages/director/EmployeesAnalytics';
import { initializeUploadedMonths, isMonthUploaded, getLastUploadedMonth } from '@/data/dataUploadManager';
import { getSalesData } from '@/data/salesData';
import { AIAnalyst } from '@/app/components/ai/AIAnalyst';
import ProductManagementModal from '@/app/components/modals/ProductManagementModal';
import TerritoryManagementModal from '@/app/components/modals/TerritoryManagementModal';
import { hasUnpublishedProductChanges, publishProductsDraft } from '@/data/productsManager';
import { hasUnpublishedDistrictChanges, publishDistrictsDraft } from '@/data/districtsManager';
import ReportsTabLight from '@/app/components/director/tabs/ReportsTabLight';


// ==================== PROPS ====================
interface DirectorWMDashboardProps {
  allMedReps: any[];
  activeSection: string;
  onRoleSwitch?: (role: string, userId?: string) => void;
  mdlpUserId?: number;
  onLogout?: () => void;
  onBackToMDLP?: () => void;
}

// ==================== НАВИГАЦИЯ ДИРЕКТОРА ====================
const DirectorNavigation = ({
  activeTab,
  setActiveTab,
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}) => {
  const tabs = [
    { id: 'dashboard', label: 'Дашборд', icon: LayoutDashboard },
    { id: 'budget', label: 'Калькулятор бюджета', icon: Calculator },
    { id: 'products', label: 'По препаратам', icon: Package },
    { id: 'territories', label: 'По территориям', icon: MapPin },
    { id: 'employees', label: 'Сотрудники', icon: Users },
    { id: 'reports', label: 'Отчёты', icon: FileText },
  ];
  return (
    <nav className="flex gap-2 overflow-x-auto pb-2">
      {tabs.map((tab) => (
        <Button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          variant={activeTab === tab.id ? 'default' : 'ghost'}
          className={`flex items-center gap-2 whitespace-nowrap transition-all duration-300 ${
            activeTab === tab.id
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30 scale-105'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <tab.icon className="w-4 h-4" />
          {tab.label}
        </Button>
      ))}
    </nav>
  );
};

// ==================== УТИЛИТЫ ====================
const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('ru-RU').format(Math.round(num));
};

const formatCurrency = (num: number): string => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(num);
};

const getPerformanceColor = (actual: number, plan: number) => {
  const percent = plan > 0 ? (actual / plan) * 100 : 0;
  if (percent >= 90) {
    return { gradient: 'from-green-500 to-emerald-600', text: 'text-green-600', bg: 'bg-green-500' };
  }
  if (percent >= 70) {
    return { gradient: 'from-yellow-500 to-amber-600', text: 'text-yellow-600', bg: 'bg-yellow-500' };
  }
  return { gradient: 'from-red-500 to-rose-600', text: 'text-red-600', bg: 'bg-red-500' };
};

const getPerformanceColorRubles = (actual: number, plan: number) => {
  const percent = plan > 0 ? (actual / plan) * 100 : 0;
  if (percent >= 90) {
    return { gradient: 'from-green-500 to-emerald-600', text: 'text-green-700', bg: 'bg-green-500', bgLight: 'bg-green-50', border: 'border-green-200' };
  }
  if (percent >= 70) {
    return { gradient: 'from-lime-500 to-green-500', text: 'text-lime-700', bg: 'bg-lime-500', bgLight: 'bg-lime-50', border: 'border-lime-200' };
  }
  return { gradient: 'from-orange-500 to-red-500', text: 'text-orange-700', bg: 'bg-orange-500', bgLight: 'bg-orange-50', border: 'border-orange-200' };
};

const getPerformanceColorUnits = (actual: number, plan: number) => {
  const percent = plan > 0 ? (actual / plan) * 100 : 0;
  if (percent >= 90) {
    return { gradient: 'from-blue-500 to-indigo-600', text: 'text-blue-700', bg: 'bg-blue-500', bgLight: 'bg-blue-50', border: 'border-blue-200' };
  }
  if (percent >= 70) {
    return { gradient: 'from-cyan-500 to-blue-500', text: 'text-cyan-700', bg: 'bg-cyan-500', bgLight: 'bg-cyan-50', border: 'border-cyan-200' };
  }
  return { gradient: 'from-purple-500 to-pink-500', text: 'text-purple-700', bg: 'bg-purple-500', bgLight: 'bg-purple-50', border: 'border-purple-200' };
};

// ==================== КОМПОНЕНТ: ГЛАВНЫЙ ДАШБОРД ====================
const DashboardView = () => {
  useEffect(() => {
    initializeUploadedMonths();
  }, []);

  const stats2024 = getTotalStats(2024);
  const stats2025 = getTotalStats(2025);
  const stats2026 = getTotalStats(2026);

  const growthPercent = stats2024.totalRevenue > 0 ? ((stats2025.totalRevenue - stats2024.totalRevenue) / stats2024.totalRevenue) * 100 : 0;
  const growth2026Percent = stats2025.totalRevenue > 0 ? ((stats2026.totalRevenue - stats2025.totalRevenue) / stats2025.totalRevenue) * 100 : 0;
  const totalBudget2025 = BUDGET_PFO_2025.total;
  const planExecution = totalBudget2025 > 0 ? (stats2025.totalRevenue / totalBudget2025) * 100 : 0;

  const kpiCards = [
    { title: 'Продажи 2025', value: formatCurrency(stats2025.totalRevenue), change: `+${growthPercent.toFixed(1)}%`, trend: 'up', icon: TrendingUp, gradient: 'from-emerald-500 to-emerald-600', color: 'emerald', subtitle: `План: ${formatCurrency(totalBudget2025)}` },
    { title: 'Продажи 2026', value: formatCurrency(stats2026.totalRevenue), change: `+${growth2026Percent.toFixed(1)}%`, trend: 'up', icon: Target, gradient: 'from-purple-500 to-purple-600', color: 'purple', subtitle: `План: ${formatCurrency(stats2026.totalRevenue * 1.15)}` },
    { title: 'Выполнение плана', value: `${planExecution.toFixed(1)}%`, change: `${formatCurrency(totalBudget2025)}`, trend: planExecution > 100 ? 'up' : 'neutral', icon: Target, gradient: planExecution > 100 ? 'from-green-500 to-green-600' : 'from-yellow-500 to-yellow-600', color: planExecution > 100 ? 'green' : 'yellow' },
    { title: 'Рост vs 2025', value: formatCurrency(stats2026.totalRevenue - stats2025.totalRevenue), change: `+${growth2026Percent.toFixed(1)}%`, trend: 'up', icon: ArrowUpRight, gradient: 'from-blue-500 to-blue-600', color: 'blue' },
  ];

  const salesTrendData = getMonthlyDynamics();
  const salesTrendUnitsData = getMonthlyDynamicsUnits();

  // AI прогнозирование
  const generateAIForecast = () => {
    const uploadedMonths2026 = [1];
    const uploadedMonthsCount = uploadedMonths2026.length;

    let total2025Period = 0;
    let total2026Period = 0;

    uploadedMonths2026.forEach(monthIndex => {
      const monthData = salesTrendData[monthIndex - 1];
      total2025Period += monthData.year2025;
      total2026Period += monthData.year2026;
    });

    const periodGrowth = total2025Period > 0 ? ((total2026Period - total2025Period) / total2025Period) * 100 : 0;
    const total2024 = salesTrendData.reduce((sum, m) => sum + m.year2024, 0);
    const total2025 = salesTrendData.reduce((sum, m) => sum + m.year2025, 0);
    const avgGrowth2025 = total2024 > 0 ? ((total2025 - total2024) / total2024) * 100 : 0;
    const avgMonthly2026 = total2026Period / uploadedMonthsCount;
    const projected2026Full = avgMonthly2026 * 12;
    const targetGrowth = 18;
    const projectedVsTarget = (projected2026Full / (total2025 * (1 + targetGrowth / 100))) * 100;

    const productsAnalysis = PRODUCTS.map(product => {
      const sales2025 = getSalesData({ productId: product.id, year: 2025 }).filter(d => uploadedMonths2026.includes(d.month)).reduce((sum, d) => sum + d.revenue, 0);
      const sales2026 = getSalesData({ productId: product.id, year: 2026 }).filter(d => uploadedMonths2026.includes(d.month)).reduce((sum, d) => sum + d.revenue, 0);
      const growth = sales2025 > 0 ? ((sales2026 - sales2025) / sales2025) * 100 : 0;
      return { name: product.shortName || product.name, sales2025, sales2026, growth, category: product.category };
    }).filter(p => p.sales2025 > 0 || p.sales2026 > 0);

    const topGrowing = [...productsAnalysis].sort((a, b) => b.growth - a.growth).slice(0, 3);
    const topDeclining = [...productsAnalysis].sort((a, b) => a.growth - b.growth).slice(0, 3).filter(p => p.growth < 0);

    let emoji = '';
    let recommendation = '';
    let productsComment = '';

    if (topGrowing.length > 0) {
      productsComment = `Лидеры роста: ${topGrowing.map(p => `${p.name} (+${p.growth.toFixed(0)}%)`).join(', ')}. `;
    }
    if (topDeclining.length > 0) {
      productsComment += `Требуют внимания: ${topDeclining.map(p => `${p.name} (${p.growth.toFixed(0)}%)`).join(', ')}.`;
    } else {
      productsComment += 'Все препараты показывают положительную динамику!';
    }

    if (periodGrowth >= 20) {
      emoji = '🚀';
      recommendation = `За период ${uploadedMonthsCount === 1 ? 'январь' : `${uploadedMonthsCount} мес.`} 2026 зафиксирован рост ${periodGrowth.toFixed(1)}% к аналогичному периоду 2025. ${productsComment} Рекомендуем масштабировать успешные практики лидеров на другие территории.`;
    } else if (periodGrowth >= 15) {
      emoji = '✅';
      recommendation = `Рост ${periodGrowth.toFixed(1)}% за ${uploadedMonthsCount === 1 ? 'январь' : `${uploadedMonthsCount} мес.`} соответствует целевым показателям. ${productsComment} Поддерживайте текущий темп и активизируйте отстающие регионы.`;
    } else if (periodGrowth >= 5) {
      emoji = '⚠️';
      recommendation = `Рост ${periodGrowth.toFixed(1)}% за ${uploadedMonthsCount === 1 ? 'январь' : `${uploadedMonthsCount} мес.`} ниже целевых 18%. ${productsComment} Необходим анализ причин отставания и коррекция стратегии продаж в Q1.`;
    } else if (periodGrowth >= 0) {
      emoji = '⚠️';
      recommendation = `Минимальный рост ${periodGrowth.toFixed(1)}% за период. ${productsComment} Срочно: аудит работы РМ, пересмотр ценовой политики по падающим препаратам.`;
    } else {
      emoji = '🔴';
      recommendation = `СНИЖЕНИЕ продаж на ${Math.abs(periodGrowth).toFixed(1)}% за период! ${productsComment} Экстренные меры: аудит всех каналов сбыта, активация резервов, пересмотр стратегии.`;
    }

    return {
      emoji,
      periodGrowth: periodGrowth.toFixed(1),
      recommendation,
      confidence: periodGrowth >= 15 ? 'высокая' : periodGrowth >= 10 ? 'средняя' : 'низкая',
    };
  };

  const aiForecast = generateAIForecast();

  const productsData2025 = aggregateByProduct(2025);
  const productsData2024 = aggregateByProduct(2024);
  const productsData2026 = aggregateByProduct(2026);

  const topMedicines2026 = productsData2026.map(current => {
    const product = current.product;
    const plan2026 = product.budget2025 ? product.budget2025 * 1.18 : current.totalRevenue;
    return { id: product.id, shortName: product.shortName || product.name, sales2026: current.totalRevenue, plan2026 };
  }).sort((a, b) => b.sales2026 - a.sales2026);

  const topMedicines2026Units = productsData2026.map(current => {
    const product = current.product;
    const planUnits = product.quota2025 ? product.quota2025 * 1.18 : current.totalUnits;
    return { id: product.id, shortName: product.shortName || product.name, unitsActual: current.totalUnits, unitsPlan: planUnits };
  }).sort((a, b) => b.unitsActual - a.unitsActual);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map((card, index) => (
          <div key={index} className="group relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden">
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${card.gradient} opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500`} />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-2">{card.title}</p>
                <h3 className="text-3xl font-bold text-slate-800 mb-1">{card.value}</h3>
                <div className="flex items-center gap-2">
                  {card.trend === 'up' && <ArrowUpRight className="w-4 h-4 text-green-500" />}
                  {card.trend === 'down' && <ArrowDownRight className="w-4 h-4 text-red-500" />}
                  <span className={`text-sm font-medium ${card.trend === 'up' ? 'text-green-600' : card.trend === 'down' ? 'text-red-600' : 'text-slate-600'}`}>{card.change}</span>
                </div>
                {card.subtitle && <p className="text-sm text-slate-400 mt-1">{card.subtitle}</p>}
              </div>
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-white shadow-lg group-hover:rotate-12 transition-transform duration-300`}>
                <card.icon className="w-7 h-7" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Графики */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="xl:col-span-2 bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-500" />
            Динамика продаж 2024-2025-2026
          </h3>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600"></div>
                <span className="text-sm font-semibold text-slate-700">Продажи в рублях (₽)</span>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={salesTrendData}>
                  <defs>
                    <linearGradient id="colorSales2024" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3} /><stop offset="95%" stopColor="#94a3b8" stopOpacity={0} /></linearGradient>
                    <linearGradient id="colorSales2025" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} /><stop offset="95%" stopColor="#06b6d4" stopOpacity={0} /></linearGradient>
                    <linearGradient id="colorSales2026" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} /><stop offset="95%" stopColor="#a855f7" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#94a3b8" style={{ fontSize: '11px' }} />
                  <YAxis stroke="#94a3b8" style={{ fontSize: '11px' }} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: 'none', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} formatter={(value: any) => `${formatNumber(value)} ₽`} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Area type="monotone" dataKey="year2024" name="2024" stroke="#94a3b8" fill="url(#colorSales2024)" strokeWidth={2} />
                  <Area type="monotone" dataKey="year2025" name="2025" stroke="#06b6d4" fill="url(#colorSales2025)" strokeWidth={3} />
                  <Line type="monotone" dataKey="year2026" name="2026" stroke="#a855f7" strokeWidth={3} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div>
              <div className="mb-4 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600"></div>
                <span className="text-sm font-semibold text-slate-700">Продажи в упаковках (шт.)</span>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={salesTrendUnitsData}>
                  <defs>
                    <linearGradient id="colorUnits2024" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3} /><stop offset="95%" stopColor="#94a3b8" stopOpacity={0} /></linearGradient>
                    <linearGradient id="colorUnits2025" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} /><stop offset="95%" stopColor="#06b6d4" stopOpacity={0} /></linearGradient>
                    <linearGradient id="colorUnits2026" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} /><stop offset="95%" stopColor="#a855f7" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#94a3b8" style={{ fontSize: '11px' }} />
                  <YAxis stroke="#94a3b8" style={{ fontSize: '11px' }} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: 'none', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} formatter={(value: any) => `${formatNumber(value)} упак.`} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Area type="monotone" dataKey="year2024" name="2024" stroke="#94a3b8" fill="url(#colorUnits2024)" strokeWidth={2} />
                  <Area type="monotone" dataKey="year2025" name="2025" stroke="#06b6d4" fill="url(#colorUnits2025)" strokeWidth={3} />
                  <Line type="monotone" dataKey="year2026" name="2026" stroke="#a855f7" strokeWidth={3} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Прогноз */}
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-bold text-slate-800 text-sm">AI-анализ и прогноз</h4>
                  <span className="text-2xl">{aiForecast.emoji}</span>
                  <span className={`text-xs px-2 py-1 rounded-lg font-semibold ${aiForecast.confidence === 'высокая' ? 'bg-green-100 text-green-700' : aiForecast.confidence === 'средняя' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                    Достоверность: {aiForecast.confidence}
                  </span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{aiForecast.recommendation}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ТОП препаратов по рублям */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-500" />
            Рейтинг препаратов по продажам в руб. (план/факт)
          </h3>
          <div className="space-y-3">
            {topMedicines2026.map((med, index) => {
              const colors = getPerformanceColorRubles(med.sales2026, med.plan2026);
              const executionPercent = med.plan2026 > 0 ? (med.sales2026 / med.plan2026) * 100 : 0;
              return (
                <div key={med.id} className={`flex items-center gap-3 p-3 rounded-2xl ${colors.bgLight} border ${colors.border} hover:shadow-md transition-all duration-200`}>
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center text-white font-bold text-sm shadow-lg flex-shrink-0`}>{index + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-slate-900 text-sm truncate">{med.shortName}</span>
                      <span className={`text-sm font-bold ${colors.text} ml-2 flex-shrink-0`}>{executionPercent.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-white/60 rounded-full h-2.5 mb-1.5">
                      <div className={`h-2.5 rounded-full bg-gradient-to-r ${colors.gradient} transition-all duration-500 shadow-sm`} style={{ width: `${Math.min(executionPercent, 100)}%` }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700">Факт: {formatCurrency(med.sales2026)}</span>
                      <span className="text-xs text-slate-500">План: {formatCurrency(med.plan2026)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ТОП препаратов по упаковкам */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-purple-500" />
            Рейтинг препаратов по продажам в упак. (план/факт)
          </h3>
          <div className="space-y-3">
            {topMedicines2026Units.map((med, index) => {
              const colors = getPerformanceColorUnits(med.unitsActual, med.unitsPlan);
              const executionPercent = med.unitsPlan > 0 ? (med.unitsActual / med.unitsPlan) * 100 : 0;
              return (
                <div key={med.id} className={`flex items-center gap-3 p-3 rounded-2xl ${colors.bgLight} border ${colors.border} hover:shadow-md transition-all duration-200`}>
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center text-white font-bold text-sm shadow-lg flex-shrink-0`}>{index + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-slate-900 text-sm truncate">{med.shortName}</span>
                      <span className={`text-sm font-bold ${colors.text} ml-2 flex-shrink-0`}>{executionPercent.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-white/60 rounded-full h-2.5 mb-1.5">
                      <div className={`h-2.5 rounded-full bg-gradient-to-r ${colors.gradient} transition-all duration-500 shadow-sm`} style={{ width: `${Math.min(executionPercent, 100)}%` }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700">Факт: {formatNumber(med.unitsActual)} упак.</span>
                      <span className="text-xs text-slate-500">План: {formatNumber(med.unitsPlan)} упак.</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== ОСНОВНОЙ КОМПОНЕНТ ====================
// Маппинг sidebar section → внутренняя вкладка
const DIRECTOR_SECTION_MAP: Record<string, string> = {
  'director-dashboard': 'dashboard',
  'russia-map': 'dashboard',
  'federal-districts': 'territories',
  'compare-analytics': 'dashboard',
  'all-employees': 'employees',
  'budget-calculator': 'budget',
  'products-analytics': 'products',
  'territories-tab': 'territories',
  'reports': 'reports',
  'upload': 'dashboard',
};

export function DirectorWMDashboard({ allMedReps, activeSection, onRoleSwitch, mdlpUserId, onLogout, onBackToMDLP }: DirectorWMDashboardProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showProductModal, setShowProductModal] = useState(false);
  const [showTerritoryModal, setShowTerritoryModal] = useState(false);
  const navigate = useNavigate();

  // Реальные данные из МДЛП API
  const [mdlpRealData, setMdlpRealData] = useState<any>(null);
  const [mdlpLoading, setMdlpLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('wm_auth_token');
    if (!token) return;
    setMdlpLoading(true);
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    Promise.all([
      fetch('/api/wm-dashboard', { headers }).then(r => r.json()).catch(() => null),
      fetch('/api/dashboard', { headers }).then(r => r.json()).catch(() => null),
      fetch('/api/wm-products', { headers }).then(r => r.json()).catch(() => null),
      fetch('/api/metadata', { headers }).then(r => r.json()).catch(() => null),
    ]).then(([wmDash, dash, wmProd, meta]) => {
      if (wmDash?.hasData || dash?.monthlySales?.length) {
        setMdlpRealData({ wmDash, dash, wmProd, meta });
      }
    }).finally(() => setMdlpLoading(false));
  }, []);

  // Синхронизация сайдбара с внутренними вкладками
  useEffect(() => {
    const mapped = DIRECTOR_SECTION_MAP[activeSection];
    if (mapped && mapped !== activeTab) {
      setActiveTab(mapped);
    }
  }, [activeSection]);

  const handleDataUpdate = () => {
    window.location.reload();
  };

  return (
    <DateProvider>
    <AppLayout
      navigation={<DirectorNavigation activeTab={activeTab} setActiveTab={setActiveTab} />}
      onLogout={onLogout}
    >
      <div className="space-y-6">
        {/* Кнопка назад */}
        {onBackToMDLP && (
          <button
            onClick={onBackToMDLP}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-100 to-slate-50 hover:from-slate-200 hover:to-slate-100 rounded-xl text-slate-700 transition-all border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md group font-medium"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Вернуться в анализатор МДЛП
          </button>
        )}

        {/* Заголовок страницы */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
              <TrendingUp className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Панель директора</h1>
              <p className="text-slate-500">Аналитика и планирование продаж</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowProductModal(true)}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700 shadow-lg"
            >
              <Settings className="w-4 h-4 mr-2" />
              Управление препаратами
            </Button>
            <Button
              onClick={() => setShowTerritoryModal(true)}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg"
            >
              <Settings className="w-4 h-4 mr-2" />
              Управление территориями
            </Button>
          </div>
        </div>

        {/* Контент */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-8">
          {activeTab === 'dashboard' && (
            <>
              {/* Блок реальных данных МДЛП */}
              {mdlpLoading && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl text-blue-700 text-sm flex items-center gap-2">
                  <RefreshCw size={16} className="animate-spin" />
                  Загрузка данных МДЛП...
                </div>
              )}
              {mdlpRealData && (() => {
                const dash = mdlpRealData.dash;
                const wmDash = mdlpRealData.wmDash;
                const wmProd = mdlpRealData.wmProd;
                const meta = mdlpRealData.meta;
                const years = meta?.years || [];
                const totalPkg = wmDash?.totalPackages || 0;
                const totalRegions = wmDash?.totalRegions || 0;
                const totalContragents = wmDash?.totalContragents || 0;
                const byDrug: any[] = wmProd?.byDrug || wmDash?.byDrug || [];
                const monthlySales: any[] = dash?.monthlySales || [];
                const monthTotal = monthlySales.reduce((s: number, m: any) => s + (m.sales || 0), 0);
                return (
                  <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-2 h-8 bg-gradient-to-b from-emerald-400 to-emerald-600 rounded-full" />
                      <div>
                        <h3 className="text-lg font-bold text-slate-800">Реальные данные МДЛП</h3>
                        <p className="text-xs text-slate-500">
                          {years.length > 0 ? `Годы: ${years.join(', ')}` : 'Загружены данные из файла'}
                          {' · '}{monthlySales.length > 0 ? `${monthlySales.length} мес.` : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setMdlpLoading(true);
                          const token = localStorage.getItem('wm_auth_token');
                          const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
                          Promise.all([
                            fetch('/api/wm-dashboard', { headers }).then(r => r.json()).catch(() => null),
                            fetch('/api/dashboard', { headers }).then(r => r.json()).catch(() => null),
                            fetch('/api/wm-products', { headers }).then(r => r.json()).catch(() => null),
                            fetch('/api/metadata', { headers }).then(r => r.json()).catch(() => null),
                          ]).then(([w, d, p, m]) => {
                            if (w?.hasData || d?.monthlySales?.length) setMdlpRealData({ wmDash: w, dash: d, wmProd: p, meta: m });
                          }).finally(() => setMdlpLoading(false));
                        }}
                        className="ml-auto p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Обновить данные"
                      >
                        <RefreshCw size={14} className={`text-slate-500 ${mdlpLoading ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                    {/* KPI карточки с реальными данными */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-2xl p-4">
                        <p className="text-xs text-emerald-700 font-medium mb-1">Упаковок продано</p>
                        <p className="text-2xl font-bold text-emerald-800">{totalPkg.toLocaleString('ru-RU')}</p>
                        <p className="text-xs text-emerald-600 mt-1">всего по ПФО</p>
                      </div>
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-4">
                        <p className="text-xs text-blue-700 font-medium mb-1">Регионов</p>
                        <p className="text-2xl font-bold text-blue-800">{totalRegions}</p>
                        <p className="text-xs text-blue-600 mt-1">с продажами</p>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl p-4">
                        <p className="text-xs text-purple-700 font-medium mb-1">Контрагентов</p>
                        <p className="text-2xl font-bold text-purple-800">{totalContragents.toLocaleString('ru-RU')}</p>
                        <p className="text-xs text-purple-600 mt-1">уникальных</p>
                      </div>
                      <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-2xl p-4">
                        <p className="text-xs text-amber-700 font-medium mb-1">Строк данных</p>
                        <p className="text-2xl font-bold text-amber-800">{monthTotal > 0 ? monthTotal.toLocaleString('ru-RU') : (wmDash?.totalRows || 0).toLocaleString('ru-RU')}</p>
                        <p className="text-xs text-amber-600 mt-1">упаковок суммарно</p>
                      </div>
                    </div>
                    {/* Таблица по препаратам */}
                    {byDrug.length > 0 && (
                      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                          <p className="text-sm font-semibold text-slate-700">По препаратам (реальные данные)</p>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {byDrug.slice(0, 8).map((d: any, i: number) => {
                            const maxSales = byDrug[0]?.totalPackages || byDrug[0]?.packages || byDrug[0]?.sales || 1;
                            const sales = d.totalPackages || d.packages || d.sales || 0;
                            const pct = Math.round((sales / maxSales) * 100);
                            return (
                              <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                                <span className="text-xs text-slate-400 w-5 text-right">{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-slate-700 truncate">{d.name || d.drug}</p>
                                  <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full" style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                                <span className="text-xs font-semibold text-slate-700 flex-shrink-0">{sales.toLocaleString('ru-RU')}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {/* Помесячная динамика */}
                    {monthlySales.length > 0 && (
                      <div className="mt-4 bg-white border border-slate-200 rounded-2xl overflow-hidden">
                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                          <p className="text-sm font-semibold text-slate-700">Помесячная динамика (реальные данные)</p>
                        </div>
                        <div className="flex gap-2 p-4 overflow-x-auto">
                          {monthlySales.map((m: any, i: number) => {
                            const maxS = Math.max(...monthlySales.map((x: any) => x.sales || 0));
                            const h = maxS > 0 ? Math.round(((m.sales || 0) / maxS) * 64) : 0;
                            return (
                              <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
                                <span className="text-xs text-slate-600 font-medium">{(m.sales || 0).toLocaleString('ru-RU')}</span>
                                <div className="w-10 bg-slate-100 rounded-lg overflow-hidden flex items-end" style={{ height: 68 }}>
                                  <div className="w-full bg-gradient-to-t from-emerald-500 to-emerald-300 rounded-lg" style={{ height: h || 4 }} />
                                </div>
                                <span className="text-xs text-slate-500">{m.month}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
              <DashboardView />
            </>
          )}
          {activeTab === 'budget' && <BudgetCalculatorEnhanced />}
          {activeTab === 'products' && <ProductsAnalyticsWithEdit />}
          {activeTab === 'territories' && <TerritoriesAnalytics />}
          {activeTab === 'employees' && <EmployeesAnalytics />}
          {activeTab === 'reports' && <ReportsTabLight />}
        </div>
      </div>

      <ProductManagementModal isOpen={showProductModal} onClose={() => setShowProductModal(false)} onSuccess={handleDataUpdate} />
      <TerritoryManagementModal isOpen={showTerritoryModal} onClose={() => setShowTerritoryModal(false)} onSuccess={handleDataUpdate} />
    </AppLayout>
    </DateProvider>
  );
}
