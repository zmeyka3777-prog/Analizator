// ==================== ТЕРРИТОРИАЛЬНЫЙ АНАЛИЗ ====================

import React, { useState, useMemo } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { useDateContext } from '@/contexts/DateContext';
import { getFederalDistricts, FederalDistrict, Territory } from '@/data/federalDistricts';
import { getYears } from '@/utils/dateUtils';
import { getSalesData } from '@/data/salesData';
import { PRODUCTS } from '@/data/salesData';
import { getPlanByTerritory } from '@/data/regionalPlansManager';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Award,
  AlertTriangle,
  MapPin,
  Search,
  Download,
  Eye,
  Activity,
  Package,
  Layers,
  ChevronRight,
  BarChart3,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

// Регионы ПФО
const PFO_TERRITORIES = [
  'Республика Татарстан',
  'Самарская область',
  'Республика Башкортостан',
  'Нижегородская область',
  'Пензенская область',
  'Республика Мордовия',
];

// ==================== УТИЛИТЫ ====================
const formatNumber = (num: number): string => new Intl.NumberFormat('ru-RU').format(Math.round(num));
const formatCurrency = (num: number): string => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(num);
const formatPercent = (num: number): string => `${num > 0 ? '+' : ''}${num.toFixed(1)}%`;

// Цвета для графиков
const CHART_COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#14b8a6'];

// Расчет плана для территории
const calculateTerritoryPlan = (territory: string, year: number, type: 'revenue' | 'units') => {
  // Коэффициенты по территориям ПФО
  const territoryCoef: Record<string, number> = {
    'Республика Татарстан': 0.28,
    'Самарская область': 0.22,
    'Республика Башкортостан': 0.19,
    'Нижегородская область': 0.16,
    'Пензенская область': 0.09,
    'Республика Мордовия': 0.06,
  };

  const coef = territoryCoef[territory] || 0.1;
  
  if (type === 'revenue') {
    // План выручки = сумма бюджетов всех препаратов * коэффициент территории * год_коэф
    const baseYear = 2025;
    const yearCoef = year >= baseYear ? Math.pow(1.18, year - baseYear) : Math.pow(0.85, baseYear - year);
    return PRODUCTS.reduce((sum, p) => sum + (p.budget2025 || 0), 0) * coef * yearCoef;
  } else {
    // План упаковок = сумма квот всех препаратов * коэффициент территории * год_коэф
    const baseYear = 2025;
    const yearCoef = year >= baseYear ? Math.pow(1.18, year - baseYear) : Math.pow(0.85, baseYear - year);
    return PRODUCTS.reduce((sum, p) => sum + (p.quota2025 || 0), 0) * coef * yearCoef;
  }
};

// Расчет плана для округа (для ПФО - реальные данные, для остальных - синтетика)
const calculateDistrictPlan = (districtId: string, year: number, type: 'revenue' | 'units') => {
  if (districtId === 'pfo') {
    return PFO_TERRITORIES.reduce((sum, territory) => 
      sum + calculateTerritoryPlan(territory, year, type), 0
    );
  }
  
  // Для остальных округов - на основе бюджета
  const district = getFederalDistricts().find(d => d.id === districtId);
  if (!district) return 0;
  
  const baseYear = 2025;
  const yearCoef = year >= baseYear ? Math.pow(1.18, year - baseYear) : Math.pow(0.85, baseYear - year);
  
  if (type === 'revenue') {
    return (district.totalBudget2025 || 0) * 1000 * yearCoef;
  } else {
    const avgPrice = 3500;
    return ((district.totalBudget2025 || 0) * 1000 * yearCoef) / avgPrice;
  }
};

// ==================== КОМПОНЕНТ ====================
export default function TerritoriesAnalytics() {
  const [selectedDistrict, setSelectedDistrict] = useState<FederalDistrict | null>(null);
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'revenue' | 'growth' | 'name'>('revenue');

  // ==================== АНАЛИТИКА ПО ОКРУГАМ ====================
  const districtsAnalytics = useMemo(() => {
    return getFederalDistricts().map(district => {
      // Для ПФО используем реальные данные продаж
      if (district.id === 'pfo') {
        const data2025 = getSalesData({ year: 2025 });
        const data2024 = getSalesData({ year: 2024 });
        const data2026 = getSalesData({ year: 2026 });

        const revenue2025 = data2025.reduce((sum, d) => sum + d.revenue, 0);
        const revenue2024 = data2024.reduce((sum, d) => sum + d.revenue, 0);
        const revenue2026 = data2026.reduce((sum, d) => sum + d.revenue, 0);
        const units2025 = data2025.reduce((sum, d) => sum + d.units, 0);

        return {
          district,
          revenue2025,
          revenue2024,
          revenue2026,
          units2025,
          growth: revenue2024 > 0 ? ((revenue2025 - revenue2024) / revenue2024) * 100 : 0,
          forecast2026: revenue2025 > 0 ? ((revenue2026 - revenue2025) / revenue2025) * 100 : 0,
        };
      }

      // Для остальных округов - синтетические данные на основе бюджета
      const budget = district.totalBudget2025 || 0;
      const revenue2025 = budget * 1000 * (0.7 + Math.random() * 0.3); // 70-100% от бюджета
      const revenue2024 = revenue2025 * 0.85;
      const revenue2026 = revenue2025 * 1.18;
      const avgPrice = 3500; // средняя цена препарата
      const units2025 = Math.round(revenue2025 / avgPrice);

      return {
        district,
        revenue2025,
        revenue2024,
        revenue2026,
        units2025,
        growth: revenue2024 > 0 ? ((revenue2025 - revenue2024) / revenue2024) * 100 : 0,
        forecast2026: revenue2025 > 0 ? ((revenue2026 - revenue2025) / revenue2025) * 100 : 0,
      };
    });
  }, []);

  // ==================== АНАЛИТИКА ПО РЕГИОНАМ ВЫБРАННОГО ОКРУГА ====================
  const selectedDistrictTerritoriesAnalytics = useMemo(() => {
    if (!selectedDistrict) return [];
    
    // Для ПФО используем реальные данные
    if (selectedDistrict.id === 'pfo') {
      return selectedDistrict.territories.map(terr => {
        const data2025 = getSalesData({ territory: terr.name, year: 2025 });
        const data2024 = getSalesData({ territory: terr.name, year: 2024 });
        const data2026 = getSalesData({ territory: terr.name, year: 2026 });

        const revenue2025 = data2025.reduce((sum, d) => sum + d.revenue, 0);
        const revenue2024 = data2024.reduce((sum, d) => sum + d.revenue, 0);
        const revenue2026 = data2026.reduce((sum, d) => sum + d.revenue, 0);
        const units2025 = data2025.reduce((sum, d) => sum + d.units, 0);

        // Топ-3 препарата по выручке
        const productSales = PRODUCTS.map(product => {
          const productData = data2025.filter(d => d.productId === product.id);
          const productRevenue = productData.reduce((sum, d) => sum + d.revenue, 0);
          return { product, revenue: productRevenue };
        }).sort((a, b) => b.revenue - a.revenue).slice(0, 3);

        return {
          territory: terr.name,
          territoryObj: terr,
          revenue2025,
          revenue2024,
          revenue2026,
          units2025,
          growth: revenue2024 > 0 ? ((revenue2025 - revenue2024) / revenue2024) * 100 : 0,
          forecast2026: revenue2025 > 0 ? ((revenue2026 - revenue2025) / revenue2025) * 100 : 0,
          topProducts: productSales,
        };
      });
    }

    // Для других округов - синтетические данные
    return selectedDistrict.territories.map(terr => {
      const budget = terr.budget2025 * 1000;
      const revenue2025 = budget * (0.7 + Math.random() * 0.3);
      const revenue2024 = revenue2025 * 0.85;
      const revenue2026 = revenue2025 * 1.18;
      const avgPrice = 3500;
      const units2025 = Math.round(revenue2025 / avgPrice);

      // Топ-3 препарата
      const productSales = PRODUCTS.map(product => ({
        product,
        revenue: Math.random() * revenue2025 * 0.3,
      })).sort((a, b) => b.revenue - a.revenue).slice(0, 3);

      return {
        territory: terr.name,
        territoryObj: terr,
        revenue2025,
        revenue2024,
        revenue2026,
        units2025,
        growth: revenue2024 > 0 ? ((revenue2025 - revenue2024) / revenue2024) * 100 : 0,
        forecast2026: revenue2025 > 0 ? ((revenue2026 - revenue2025) / revenue2025) * 100 : 0,
        topProducts: productSales,
      };
    });
  }, [selectedDistrict]);

  // ==================== СОРТИРОВКА РЕГИОНОВ ВЫБРАННОГО ОКРУГА ====================
  const sortedSelectedDistrictTerritories = useMemo(() => {
    let sorted = [...selectedDistrictTerritoriesAnalytics];
    
    if (sortBy === 'revenue') {
      sorted.sort((a, b) => b.revenue2025 - a.revenue2025);
    } else if (sortBy === 'growth') {
      sorted.sort((a, b) => b.growth - a.growth);
    } else if (sortBy === 'name') {
      sorted.sort((a, b) => a.territory.localeCompare(b.territory));
    }

    return sorted;
  }, [selectedDistrictTerritoriesAnalytics, sortBy]);

  // ==================== ОБЩАЯ СТАТИСТИКА ====================
  const totalStats = useMemo(() => {
    const totalRevenue2025 = districtsAnalytics.reduce((sum, d) => sum + d.revenue2025, 0);
    const totalRevenue2024 = districtsAnalytics.reduce((sum, d) => sum + d.revenue2024, 0);
    const totalUnits = districtsAnalytics.reduce((sum, d) => sum + d.units2025, 0);
    const growth = totalRevenue2024 > 0 ? ((totalRevenue2025 - totalRevenue2024) / totalRevenue2024) * 100 : 0;

    // Топ и худшие округа
    const sorted = [...districtsAnalytics].sort((a, b) => b.growth - a.growth);
    const topDistrict = sorted[0];
    const worstDistrict = sorted[sorted.length - 1];

    return {
      totalRevenue2025,
      totalRevenue2024,
      totalUnits,
      growth,
      districtsCount: getFederalDistricts().length,
      topDistrict,
      worstDistrict,
    };
  }, [districtsAnalytics]);

  // ==================== ФИЛЬТРАЦИЯ И СОРТИРОВКА ====================
  const filteredDistricts = useMemo(() => {
    let filtered = [...districtsAnalytics];

    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.district.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.district.shortName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (sortBy === 'revenue') {
      filtered.sort((a, b) => b.revenue2025 - a.revenue2025);
    } else if (sortBy === 'growth') {
      filtered.sort((a, b) => b.growth - a.growth);
    } else if (sortBy === 'name') {
      filtered.sort((a, b) => a.district.name.localeCompare(b.district.name));
    }

    return filtered;
  }, [districtsAnalytics, searchQuery, sortBy]);

  // ==================== ДАННЫЕ ДЛЯ ГРАФИКОВ ====================
  // Сравнение округов - выручка
  const districtComparisonData = useMemo(() => {
    return filteredDistricts.map(item => ({
      name: item.district.shortName,
      'Выручка 2024': Math.round(item.revenue2024 / 1000000),
      'Выручка 2025': Math.round(item.revenue2025 / 1000000),
      'Прогноз 2026': Math.round(item.revenue2026 / 1000000),
    }));
  }, [filteredDistricts]);

  // График сравнения по упаковкам
  const districtComparisonUnitsData = useMemo(() => {
    return filteredDistricts.map(item => {
      const units2024 = Math.round(item.revenue2024 / 3500); // средняя цена
      const units2026 = Math.round(item.revenue2026 / 3500);
      
      return {
        name: item.district.shortName,
        'Упаковки 2024': Math.round(units2024 / 1000),
        'Упаковки 2025': Math.round(item.units2025 / 1000),
        'Прогноз 2026': Math.round(units2026 / 1000),
      };
    });
  }, [filteredDistricts]);

  // Радар-диаграмма топ-округов
  const topDistrictsRadar = useMemo(() => {
    const top6 = [...districtsAnalytics]
      .sort((a, b) => b.revenue2025 - a.revenue2025)
      .slice(0, 6);

    return top6.map(item => ({
      district: item.district.shortName,
      'Выручка': Math.round(item.revenue2025 / 10000000), // Делим на 10 млн для масштаба
      'Рост': Math.max(0, Math.round(item.growth)),
      'Территорий': item.district.territories.length,
    }));
  }, [districtsAnalytics]);

  // Распределение выручки по округам (pie chart)
  const revenueDistribution = useMemo(() => {
    return districtsAnalytics.map((item, idx) => ({
      name: item.district.shortName,
      value: Math.round(item.revenue2025),
      color: CHART_COLORS[idx % CHART_COLORS.length],
    }));
  }, [districtsAnalytics]);

  return (
    <div className="space-y-6">
      {/* ==================== HEADER ==================== */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-1">Территориальный анализ</h2>
          <p className="text-slate-500">Анализ продаж по федеральным округам и регионам России</p>
        </div>
        <div className="flex gap-3">
          <Button className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700">
            <Download className="w-4 h-4 mr-2" />
            Экспорт
          </Button>
        </div>
      </div>

      {/* ==================== ОБЩАЯ СТАТИСТИКА ==================== */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <p className="text-cyan-100">Общая выручка</p>
            <DollarSign className="w-8 h-8 text-white/30" />
          </div>
          <p className="text-3xl font-bold">{formatCurrency(totalStats.totalRevenue2025)}</p>
          <div className="flex items-center gap-2 mt-2">
            {totalStats.growth >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            <span className="text-sm font-semibold">{formatPercent(totalStats.growth)} к {getYears().yearBeforePrevious}</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <p className="text-blue-100">Федеральных округов</p>
            <Building2 className="w-8 h-8 text-white/30" />
          </div>
          <p className="text-3xl font-bold">{totalStats.districtsCount}</p>
          <p className="text-sm text-blue-100 mt-2">Покрытие всей России</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <p className="text-emerald-100">Лучший округ</p>
            <Award className="w-8 h-8 text-white/30" />
          </div>
          <p className="text-xl font-bold">{totalStats.topDistrict.district.shortName}</p>
          <div className="flex items-center gap-2 mt-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-semibold">{formatPercent(totalStats.topDistrict.growth)}</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <p className="text-amber-100">Требует внимания</p>
            <AlertTriangle className="w-8 h-8 text-white/30" />
          </div>
          <p className="text-xl font-bold">{totalStats.worstDistrict.district.shortName}</p>
          <div className="flex items-center gap-2 mt-2">
            <TrendingDown className="w-4 h-4" />
            <span className="text-sm font-semibold">{formatPercent(totalStats.worstDistrict.growth)}</span>
          </div>
        </div>
      </div>

      {/* ==================== ФИЛЬТРЫ ==================== */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по названию округа или региона..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
          >
            <option value="revenue">По выручке</option>
            <option value="growth">По росту</option>
            <option value="name">По названию</option>
          </select>
        </div>
      </div>

      {/* ==================== ГРАФИКИ СРАВНЕНИЯ ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Сравнение округов - столбчатая диаграмма */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-600" />
            Сравнение выручки по округам
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={districtComparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '12px' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '12px' }} label={{ value: 'млн ₽', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: 'none', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}
                formatter={(value: any) => `${value} млн ₽`}
              />
              <Legend />
              <Bar dataKey="Выручка 2024" fill="#94a3b8" radius={[8, 8, 0, 0]} />
              <Bar dataKey="Выручка 2025" fill="#06b6d4" radius={[8, 8, 0, 0]} />
              <Bar dataKey="Прогноз 2026" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* График сравнения по упаковкам */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-600" />
            Сравнение упаковок по округам
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={districtComparisonUnitsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '12px' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '12px' }} label={{ value: 'тыс. упак.', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: 'none', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}
                formatter={(value: any) => `${value} тыс. упак.`}
              />
              <Legend />
              <Bar dataKey="Упаковки 2024" fill="#94a3b8" radius={[8, 8, 0, 0]} />
              <Bar dataKey="Упаковки 2025" fill="#06b6d4" radius={[8, 8, 0, 0]} />
              <Bar dataKey="Прогноз 2026" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ==================== КАРТОЧКИ ОКРУГОВ ==================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredDistricts.map(item => {
          const isPositive = item.growth >= 0;
          const share = totalStats.totalRevenue2025 > 0 ? (item.revenue2025 / totalStats.totalRevenue2025) * 100 : 0;

          return (
            <div
              key={item.district.id}
              onClick={() => setSelectedDistrict(item.district)}
              className="group bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-105 relative overflow-hidden"
            >
              {/* Градиентный фон */}
              <div
                className="absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"
                style={{ background: `linear-gradient(to bottom right, ${item.district.color}, ${item.district.color}dd)` }}
              />

              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-4xl">{item.district.icon}</span>
                  <div
                    className="px-3 py-1 rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: item.district.color }}
                  >
                    {item.district.shortName}
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-800 mb-2 line-clamp-2 group-hover:text-cyan-600 transition-colors">
                  {item.district.name}
                </h3>

                <div className="space-y-3 mb-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Выручка {getYears().current}</p>
                    <p className="text-xl font-bold" style={{ color: item.district.color }}>
                      {formatCurrency(item.revenue2025)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Продано упак.</p>
                      <p className="text-sm font-bold text-slate-800">{formatNumber(item.units2025)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Регионов</p>
                      <p className="text-sm font-bold text-slate-800">{item.district.territories.length}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    {isPositive ? (
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    )}
                    <span className={`text-sm font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercent(item.growth)}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">{share.toFixed(1)}% от РФ</span>
                </div>

                <div className="mt-3 flex items-center justify-end text-cyan-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Подробнее <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ==================== МОДАЛЬНОЕ ОКНО ДЕТАЛЬНОЙ ИНФОРМАЦИИ ПО ОКРУГУ ==================== */}
      {selectedDistrict && !selectedTerritory && (
        <DistrictDetailModal
          district={selectedDistrict}
          analytics={districtsAnalytics.find(a => a.district.id === selectedDistrict.id)!}
          onClose={() => setSelectedDistrict(null)}
          onSelectTerritory={(territory) => setSelectedTerritory(territory)}
        />
      )}

      {/* ==================== МОДАЛЬНОЕ ОКНО ДЕТАЛЬНОЙ ИНФОРМАЦИИ ПО РЕГИОНУ ==================== */}
      {selectedTerritory && selectedDistrict && (
        <TerritoryDetailModal
          territory={selectedTerritory}
          district={selectedDistrict}
          onClose={() => {
            setSelectedTerritory(null);
            setSelectedDistrict(null);
          }}
          onBack={() => setSelectedTerritory(null)}
        />
      )}
    </div>
  );
}

// ==================== МОДАЛЬНОЕ ОКНО ОКРУГА ====================
function DistrictDetailModal({
  district,
  analytics,
  onClose,
  onSelectTerritory,
}: {
  district: FederalDistrict;
  analytics: any;
  onClose: () => void;
  onSelectTerritory: (territory: Territory) => void;
}) {
  // Для ПФО - реальные данные, для остальных - синтетические
  const territoriesData = useMemo(() => {
    if (district.id === 'pfo') {
      return district.territories.map(territory => {
        const data2025 = getSalesData({ territory: territory.name, year: 2025 });
        const data2024 = getSalesData({ territory: territory.name, year: 2024 });
        const revenue2025 = data2025.reduce((sum, d) => sum + d.revenue, 0);
        const revenue2024 = data2024.reduce((sum, d) => sum + d.revenue, 0);
        const units2025 = data2025.reduce((sum, d) => sum + d.units, 0);
        const growth = revenue2024 > 0 ? ((revenue2025 - revenue2024) / revenue2024) * 100 : 0;

        // Расчет плана
        const planRevenue = calculateTerritoryPlan(territory.name, 2025, 'revenue');
        const planUnits = calculateTerritoryPlan(territory.name, 2025, 'units');

        return { territory, revenue2025, revenue2024, units2025, growth, planRevenue, planUnits };
      });
    }

    // Синтетические данные для остальных округов
    return district.territories.map(territory => {
      const budget = territory.budget2025 * 1000;
      const revenue2025 = budget * (0.7 + Math.random() * 0.3);
      const revenue2024 = revenue2025 * 0.85;
      const avgPrice = 3500;
      const units2025 = Math.round(revenue2025 / avgPrice);
      const growth = revenue2024 > 0 ? ((revenue2025 - revenue2024) / revenue2024) * 100 : 0;

      // План = бюджет территории
      const planRevenue = budget;
      const planUnits = Math.round(budget / avgPrice);

      return { territory, revenue2025, revenue2024, units2025, growth, planRevenue, planUnits };
    });
  }, [district]);

  const sortedTerritories = [...territoriesData].sort((a, b) => b.revenue2025 - a.revenue2025);
  const totalRevenue = territoriesData.reduce((sum, t) => sum + t.revenue2025, 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-8 rounded-t-3xl text-white" style={{ background: `linear-gradient(to right, ${district.color}, ${district.color}dd)` }}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-4xl">
                {district.icon}
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-1">{district.name}</h2>
                <p className="text-white/90">{district.territories.length} регионов</p>
              </div>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center">
              ✕
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="wm-card bg-white/10 backdrop-blur rounded-2xl p-4">
              <p className="text-white/80 text-sm mb-1">Выручка</p>
              <p className="text-2xl font-bold">{formatCurrency(analytics.revenue2025)}</p>
            </div>
            <div className="wm-card bg-white/10 backdrop-blur rounded-2xl p-4">
              <p className="text-white/80 text-sm mb-1">Продано упак.</p>
              <p className="text-2xl font-bold">{formatNumber(analytics.units2025)}</p>
            </div>
            <div className="wm-card bg-white/10 backdrop-blur rounded-2xl p-4">
              <p className="text-white/80 text-sm mb-1">Рост к предыдущему году за аналогичный период</p>
              <div className="flex items-center gap-2">
                {analytics.growth >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                <p className="text-2xl font-bold">{formatPercent(analytics.growth)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          <h3 className="text-xl font-bold text-slate-800 mb-6">Регионы округа с план/факт анализом</h3>
          <div className="space-y-4">
            {sortedTerritories.map((item, index) => {
              const share = totalRevenue > 0 ? (item.revenue2025 / totalRevenue) * 100 : 0;
              const isPositive = item.growth >= 0;
              
              // Проценты выполнения плана
              const revenuePercent = item.planRevenue > 0 ? (item.revenue2025 / item.planRevenue) * 100 : 0;
              const unitsPercent = item.planUnits > 0 ? (item.units2025 / item.planUnits) * 100 : 0;

              return (
                <div
                  key={item.territory.id}
                  onClick={() => onSelectTerritory(item.territory)}
                  className="group bg-slate-50 rounded-2xl p-6 hover:bg-gradient-to-r hover:from-cyan-50 hover:to-blue-50 transition-all cursor-pointer border border-slate-200 hover:border-cyan-300"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold shadow-lg text-lg" style={{ background: `linear-gradient(to bottom right, ${district.color}, ${district.color}dd)` }}>
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-slate-800 group-hover:text-cyan-600 transition-colors">{item.territory.name}</h4>
                        <p className="text-sm text-slate-500">{share.toFixed(1)}% от округа • Рост {formatPercent(item.growth)}</p>
                      </div>
                    </div>

                    <div className="flex items-center text-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Eye className="w-5 h-5 mr-1" />
                      <span className="text-sm font-medium">Подробнее</span>
                    </div>
                  </div>

                  {/* План/Факт по выручке */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-slate-600" />
                        <span className="text-sm font-medium text-slate-600">Выручка</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-500 mr-1">Факт:</span>
                        <span className="text-sm font-bold text-slate-800">{formatCurrency(item.revenue2025)}</span>
                        <span className="text-xs text-slate-500 mx-1">/</span>
                        <span className="text-xs text-slate-500 mr-1">План:</span>
                        <span className="text-xs text-slate-600 font-semibold">{formatCurrency(item.planRevenue)}</span>
                      </div>
                    </div>
                    <div className="relative w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${revenuePercent >= 100 ? 'bg-gradient-to-r from-green-500 to-green-600' : revenuePercent >= 80 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' : 'bg-gradient-to-r from-red-500 to-red-600'}`}
                        style={{ width: `${Math.min(revenuePercent, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-xs font-semibold ${revenuePercent >= 100 ? 'text-green-600' : revenuePercent >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {revenuePercent.toFixed(1)}% выполнено
                      </span>
                      <span className="text-xs text-slate-500">
                        {revenuePercent >= 100 ? `+${formatCurrency(item.revenue2025 - item.planRevenue)}` : `-${formatCurrency(item.planRevenue - item.revenue2025)}`}
                      </span>
                    </div>
                  </div>

                  {/* План/Факт по упаковкам */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-slate-600" />
                        <span className="text-sm font-medium text-slate-600">Упаковки</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-500 mr-1">Факт:</span>
                        <span className="text-sm font-bold text-slate-800">{formatNumber(item.units2025)}</span>
                        <span className="text-xs text-slate-500 mx-1">/</span>
                        <span className="text-xs text-slate-500 mr-1">План:</span>
                        <span className="text-xs text-slate-600 font-semibold">{formatNumber(item.planUnits)}</span>
                      </div>
                    </div>
                    <div className="relative w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${unitsPercent >= 100 ? 'bg-gradient-to-r from-green-500 to-green-600' : unitsPercent >= 80 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' : 'bg-gradient-to-r from-red-500 to-red-600'}`}
                        style={{ width: `${Math.min(unitsPercent, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-xs font-semibold ${unitsPercent >= 100 ? 'text-green-600' : unitsPercent >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {unitsPercent.toFixed(1)}% выполнено
                      </span>
                      <span className="text-xs text-slate-500">
                        {unitsPercent >= 100 ? `+${formatNumber(item.units2025 - item.planUnits)}` : `-${formatNumber(item.planUnits - item.units2025)}`}
                      </span>
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
}

// ==================== МОДАЛЬНОЕ ОКНО РЕГИОНА ====================
function TerritoryDetailModal({
  territory,
  district,
  onClose,
  onBack,
}: {
  territory: Territory;
  district: FederalDistrict;
  onClose: () => void;
  onBack: () => void;
}) {
  // Данные продаж
  const data2025 = useMemo(() => getSalesData({ territory: territory.name, year: 2025 }), [territory.name]);
  const data2024 = useMemo(() => getSalesData({ territory: territory.name, year: 2024 }), [territory.name]);
  const data2026 = useMemo(() => getSalesData({ territory: territory.name, year: 2026 }), [territory.name]);

  const revenue2025 = data2025.reduce((sum, d) => sum + d.revenue, 0);
  const revenue2024 = data2024.reduce((sum, d) => sum + d.revenue, 0);
  const revenue2026 = data2026.reduce((sum, d) => sum + d.revenue, 0);
  const units2025 = data2025.reduce((sum, d) => sum + d.units, 0);
  const growth = revenue2024 > 0 ? ((revenue2025 - revenue2024) / revenue2024) * 100 : 0;

  // Аналитика по препаратам
  const productsAnalytics = useMemo(() => {
    return PRODUCTS.map(product => {
      const productData2025 = data2025.filter(d => d.productId === product.id);
      const productData2024 = data2024.filter(d => d.productId === product.id);
      const productRevenue2025 = productData2025.reduce((sum, d) => sum + d.revenue, 0);
      const productRevenue2024 = productData2024.reduce((sum, d) => sum + d.revenue, 0);
      const productUnits2025 = productData2025.reduce((sum, d) => sum + d.units, 0);
      const productGrowth = productRevenue2024 > 0 ? ((productRevenue2025 - productRevenue2024) / productRevenue2024) * 100 : 0;

      // Расчет плана для препарата в территории
      const territoryCoef: Record<string, number> = {
        'Республика Татарстан': 0.28,
        'Самарская область': 0.22,
        'Республика Башкортостан': 0.19,
        'Нижегородская область': 0.16,
        'Пензенская область': 0.09,
        'Республика Мордовия': 0.06,
      };
      const coef = territoryCoef[territory.name] || 0.1;
      const planUnits = (product.quota2025 || 0) * coef;

      return {
        product,
        revenue2025: productRevenue2025,
        revenue2024: productRevenue2024,
        units2025: productUnits2025,
        growth: productGrowth,
        planUnits,
      };
    }).filter(p => p.revenue2025 > 0).sort((a, b) => b.revenue2025 - a.revenue2025);
  }, [data2025, data2024, territory.name]);

  // Помесячная динамика
  const monthlyData = useMemo(() => {
    const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    return months.map((month, idx) => {
      const month2024 = data2024.filter(d => d.month === idx + 1).reduce((sum, d) => sum + d.revenue, 0);
      const month2025 = data2025.filter(d => d.month === idx + 1).reduce((sum, d) => sum + d.revenue, 0);
      const month2026 = data2026.filter(d => d.month === idx + 1).reduce((sum, d) => sum + d.revenue, 0);

      return {
        month,
        '2024': Math.round(month2024 / 1000),
        '2025': Math.round(month2025 / 1000),
        '2026': Math.round(month2026 / 1000),
      };
    });
  }, [data2024, data2025, data2026]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-8 rounded-t-3xl text-white" style={{ background: `linear-gradient(to right, ${district.color}, ${district.color}dd)` }}>
          <div className="flex items-start justify-between">
            <div>
              <button onClick={onBack} className="flex items-center gap-2 text-white/80 hover:text-white mb-3 transition-colors">
                ← Назад к округу
              </button>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <MapPin className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold mb-1">{territory.name}</h2>
                  <p className="text-white/90">{district.name}</p>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center">
              ✕
            </button>
          </div>

          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="wm-card bg-white/10 backdrop-blur rounded-2xl p-4">
              <p className="text-white/80 text-sm mb-1">Выручка 2025</p>
              <p className="text-2xl font-bold">{formatCurrency(revenue2025)}</p>
            </div>
            <div className="wm-card bg-white/10 backdrop-blur rounded-2xl p-4">
              <p className="text-white/80 text-sm mb-1">Продано упак.</p>
              <p className="text-2xl font-bold">{formatNumber(units2025)}</p>
            </div>
            <div className="wm-card bg-white/10 backdrop-blur rounded-2xl p-4">
              <p className="text-white/80 text-sm mb-1">Рост к 2024</p>
              <div className="flex items-center gap-2">
                {growth >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                <p className="text-2xl font-bold">{formatPercent(growth)}</p>
              </div>
            </div>
            <div className="wm-card bg-white/10 backdrop-blur rounded-2xl p-4">
              <p className="text-white/80 text-sm mb-1">Прогноз 2026</p>
              <p className="text-2xl font-bold">{formatCurrency(revenue2026)}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          {/* График динамики */}
          <div>
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Activity className="w-6 h-6 text-cyan-600" />
              Помесячная динамика продаж
            </h3>
            <div className="bg-slate-50 rounded-2xl p-6">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="grad2024" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="grad2025" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="grad2026" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#64748b" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#64748b" style={{ fontSize: '12px' }} label={{ value: 'тыс ₽', angle: -90, position: 'insideLeft' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: 'none', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}
                    formatter={(value: any) => `${value} тыс ₽`}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="2024" fill="url(#grad2024)" stroke="#94a3b8" strokeWidth={2} />
                  <Area type="monotone" dataKey="2025" fill="url(#grad2025)" stroke="#06b6d4" strokeWidth={3} />
                  <Area type="monotone" dataKey="2026" fill="url(#grad2026)" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Топ препаратов */}
          <div>
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Package className="w-6 h-6 text-cyan-600" />
              Рейтинг препаратов
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {productsAnalytics.map((item, index) => {
                const share = revenue2025 > 0 ? (item.revenue2025 / revenue2025) * 100 : 0;
                const isPositive = item.growth >= 0;
                const unitsPercent = item.planUnits > 0 ? (item.units2025 / item.planUnits) * 100 : 0;

                return (
                  <div key={item.product.id} className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-cyan-300 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-lg" style={{ background: `linear-gradient(to bottom right, ${district.color}, ${district.color}dd)` }}>
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800">{item.product.shortName}</h4>
                          <p className="text-sm text-slate-500">{item.product.category}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-xs text-slate-500 mb-1">Выручка</p>
                          <p className="text-lg font-bold text-slate-800">{formatCurrency(item.revenue2025)}</p>
                        </div>

                        <div className="text-right min-w-[80px]">
                          <p className="text-xs text-slate-500 mb-1">Рост</p>
                          <div className="flex items-center justify-end gap-2">
                            {isPositive ? <TrendingUp className="w-4 h-4 text-green-600" /> : <TrendingDown className="w-4 h-4 text-red-600" />}
                            <span className={`text-sm font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                              {formatPercent(item.growth)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* План/Факт упаковок */}
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-500">Упаковки</span>
                        <div className="text-right">
                          <span className="text-xs text-slate-500 mr-1">Факт:</span>
                          <span className="text-xs font-bold text-slate-800">{formatNumber(item.units2025)}</span>
                          <span className="text-xs text-slate-500 mx-1">/</span>
                          <span className="text-xs text-slate-500 mr-1">План:</span>
                          <span className="text-xs text-slate-600 font-semibold">{formatNumber(item.planUnits)}</span>
                        </div>
                      </div>
                      <div className="relative w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${unitsPercent >= 100 ? 'bg-gradient-to-r from-green-500 to-green-600' : unitsPercent >= 80 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' : 'bg-gradient-to-r from-red-500 to-red-600'}`}
                          style={{ width: `${Math.min(unitsPercent, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className={`text-xs font-semibold ${unitsPercent >= 100 ? 'text-green-600' : unitsPercent >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {unitsPercent.toFixed(1)}% выполнено
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${share}%`, background: `linear-gradient(to right, ${district.color}, ${district.color}dd)` }} />
                    </div>
                    <p className="text-xs text-slate-500 mt-1 text-right">{share.toFixed(1)}% от выручки региона</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}