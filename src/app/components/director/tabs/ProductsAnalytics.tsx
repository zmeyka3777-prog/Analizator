import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Pill, TrendingUp, TrendingDown, Target, Package,
  DollarSign, Filter, ArrowUpDown, ChevronUp, ChevronDown
} from 'lucide-react';

const WM_PRODUCTS = [
  { id: 1, name: 'COCARNIT', category: 'Ноотропы', color: '#3B82F6', pricePerUnit: 890 },
  { id: 2, name: 'RONOCIT', category: 'Ноотропы', color: '#8B5CF6', pricePerUnit: 720 },
  { id: 3, name: 'ARTOXAN LYOF 20MG', category: 'НПВС', color: '#10B981', pricePerUnit: 540 },
  { id: 4, name: 'DORAMYCIN', category: 'Антибиотики', color: '#F59E0B', pricePerUnit: 460 },
  { id: 5, name: 'ORCIPOL', category: 'Антибиотики', color: '#EF4444', pricePerUnit: 380 },
  { id: 6, name: 'DRASTOP ADVANCE', category: 'Хондропротекторы', color: '#06B6D4', pricePerUnit: 650 },
  { id: 7, name: 'LIMENDA', category: 'Анксиолитики', color: '#EC4899', pricePerUnit: 510 },
  { id: 8, name: 'SECNIDOX', category: 'Антибиотики', color: '#84CC16', pricePerUnit: 420 },
  { id: 9, name: 'CLODIFEN NEURO', category: 'НПВС', color: '#F97316', pricePerUnit: 350 },
  { id: 10, name: 'ARTOXAN 20MG', category: 'НПВС', color: '#14B8A6', pricePerUnit: 490 },
  { id: 11, name: 'ARTOXAN GEL', category: 'НПВС', color: '#A855F7', pricePerUnit: 310 },
  { id: 12, name: 'APFECTO', category: 'Кардиология', color: '#6366F1', pricePerUnit: 580 },
];

const CATEGORIES = ['Все', 'Ноотропы', 'НПВС', 'Антибиотики', 'Хондропротекторы', 'Анксиолитики', 'Кардиология'];
const PERIODS = [
  { id: 'jan', label: 'Январь 2026' },
  { id: 'q1', label: 'Q1 2026' },
  { id: 'h1', label: 'H1 2026' },
  { id: 'year', label: '2026 год' },
];

type SortField = 'name' | 'planRub' | 'factRub' | 'completionRub' | 'planPacks' | 'factPacks' | 'completionPacks' | 'growth';
type SortDirection = 'asc' | 'desc';

interface ProductData {
  id: number;
  name: string;
  category: string;
  color: string;
  planRub: number;
  factRub: number;
  completionRub: number;
  planPacks: number;
  factPacks: number;
  completionPacks: number;
  growth: number;
  monthlyTrend: number[];
}

const formatCurrency = (value: number): string => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)} млрд ₽`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} млн ₽`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)} тыс ₽`;
  return `${value.toLocaleString('ru-RU')} ₽`;
};

const formatNumber = (value: number): string => value.toLocaleString('ru-RU');

const getCompletionColor = (pct: number): string => {
  if (pct >= 90) return 'text-emerald-400';
  if (pct >= 70) return 'text-yellow-400';
  return 'text-red-400';
};

const getCompletionBg = (pct: number): string => {
  if (pct >= 90) return 'bg-emerald-500';
  if (pct >= 70) return 'bg-yellow-500';
  return 'bg-red-500';
};

export default function ProductsAnalytics() {
  const [selectedCategory, setSelectedCategory] = useState<string>('Все');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('jan');
  const [sortField, setSortField] = useState<SortField>('factRub');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [viewMode, setViewMode] = useState<'rubles' | 'packs'>('rubles');

  const productData: ProductData[] = useMemo(() => {
    const periodMultiplier = selectedPeriod === 'jan' ? 1 : selectedPeriod === 'q1' ? 3 : selectedPeriod === 'h1' ? 6 : 12;
    const completionValues = [102, 97, 95, 88, 92, 85, 78, 94, 73, 101, 90, 96];
    const growthValues = [22, 18, 15, 12, 8, 14, -3, 10, 5, 20, 11, 16];
    const basePlans = [65074120, 58230000, 52100000, 48500000, 44200000, 41800000, 38500000, 36200000, 33800000, 31200000, 28400000, 26500000];

    return WM_PRODUCTS.map((product, idx) => {
      const planRub = basePlans[idx] * periodMultiplier;
      const completion = completionValues[idx];
      const factRub = Math.round(planRub * (completion / 100));
      const planPacks = Math.round(planRub / product.pricePerUnit);
      const factPacks = Math.round(factRub / product.pricePerUnit);
      const completionPacks = Math.round((factPacks / planPacks) * 100);

      const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
        const base = factRub / periodMultiplier;
        return Math.round(base * (0.85 + Math.random() * 0.3));
      });

      return {
        id: product.id,
        name: product.name,
        category: product.category,
        color: product.color,
        planRub,
        factRub,
        completionRub: completion,
        planPacks,
        factPacks,
        completionPacks,
        growth: growthValues[idx],
        monthlyTrend,
      };
    });
  }, [selectedPeriod]);

  const filteredProducts = useMemo(() => {
    let products = selectedCategory === 'Все'
      ? productData
      : productData.filter((p) => p.category === selectedCategory);

    products = [...products].sort((a, b) => {
      const aVal = a[sortField] as number | string;
      const bVal = b[sortField] as number | string;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    return products;
  }, [productData, selectedCategory, sortField, sortDirection]);

  const kpis = useMemo(() => {
    const totalPlanRub = productData.reduce((s, p) => s + p.planRub, 0);
    const totalFactRub = productData.reduce((s, p) => s + p.factRub, 0);
    const totalPlanPacks = productData.reduce((s, p) => s + p.planPacks, 0);
    const totalFactPacks = productData.reduce((s, p) => s + p.factPacks, 0);
    const overallCompletion = Math.round((totalFactRub / totalPlanRub) * 100);
    return { totalPlanRub, totalFactRub, totalPlanPacks, totalFactPacks, overallCompletion };
  }, [productData]);

  const barChartData = useMemo(() => {
    return filteredProducts.map((p) => ({
      name: p.name.length > 12 ? p.name.substring(0, 12) + '...' : p.name,
      fullName: p.name,
      planRub: p.planRub,
      factRub: p.factRub,
      planPacks: p.planPacks,
      factPacks: p.factPacks,
      color: p.color,
    }));
  }, [filteredProducts]);

  const pieData = useMemo(() => {
    return filteredProducts.map((p) => ({
      name: p.name,
      value: viewMode === 'rubles' ? p.factRub : p.factPacks,
      color: p.color,
    }));
  }, [filteredProducts, viewMode]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-gray-500" />;
    return sortDirection === 'asc'
      ? <ChevronUp className="w-3 h-3 text-blue-400" />
      : <ChevronDown className="w-3 h-3 text-blue-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Pill className="w-5 h-5 text-white" />
            </div>
            Аналитика по препаратам
          </h2>
          <p className="text-gray-400 mt-1">Детальный анализ продаж по каждому препарату WM</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex bg-white/5 rounded-xl border border-white/10 p-1">
            <button
              onClick={() => setViewMode('rubles')}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                viewMode === 'rubles' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <DollarSign className="w-4 h-4 inline mr-1" />Рубли
            </button>
            <button
              onClick={() => setViewMode('packs')}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                viewMode === 'packs' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Package className="w-4 h-4 inline mr-1" />Упаковки
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="wm-card bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-5">
          <p className="text-sm text-gray-400 mb-1">План (₽)</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(kpis.totalPlanRub)}</p>
          <p className="text-xs text-gray-500 mt-1">{formatNumber(kpis.totalPlanPacks)} упак.</p>
        </div>
        <div className="wm-card bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-5">
          <p className="text-sm text-gray-400 mb-1">Факт (₽)</p>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(kpis.totalFactRub)}</p>
          <p className="text-xs text-gray-500 mt-1">{formatNumber(kpis.totalFactPacks)} упак.</p>
        </div>
        <div className="wm-card bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-5">
          <p className="text-sm text-gray-400 mb-1">Выполнение</p>
          <p className={`text-2xl font-bold ${getCompletionColor(kpis.overallCompletion)}`}>
            {kpis.overallCompletion}%
          </p>
          <div className="w-full h-2 bg-gray-700 rounded-full mt-2">
            <div className={`h-full ${getCompletionBg(kpis.overallCompletion)} rounded-full`} style={{ width: `${Math.min(kpis.overallCompletion, 100)}%` }} />
          </div>
        </div>
        <div className="wm-card bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-5">
          <p className="text-sm text-gray-400 mb-1">Лидер</p>
          <p className="text-lg font-bold text-white truncate">{productData.sort((a, b) => b.completionRub - a.completionRub)[0]?.name}</p>
          <p className="text-emerald-400 text-sm font-medium">{productData.sort((a, b) => b.completionRub - a.completionRub)[0]?.completionRub}%</p>
        </div>
        <div className="wm-card bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-5">
          <p className="text-sm text-gray-400 mb-1">Отстающий</p>
          <p className="text-lg font-bold text-white truncate">{productData.sort((a, b) => a.completionRub - b.completionRub)[0]?.name}</p>
          <p className="text-red-400 text-sm font-medium">{productData.sort((a, b) => a.completionRub - b.completionRub)[0]?.completionRub}%</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-400">Категория:</span>
        </div>
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                selectedCategory === cat
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPeriod(p.id)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                selectedPeriod === p.id
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart */}
        <div className="wm-card lg:col-span-2 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            План vs Факт ({viewMode === 'rubles' ? 'рубли' : 'упаковки'})
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={barChartData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9CA3AF" fontSize={10} angle={-30} textAnchor="end" height={60} />
              <YAxis
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(v) =>
                  viewMode === 'rubles'
                    ? v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M` : `${(v / 1_000).toFixed(0)}K`
                    : v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : `${v}`
                }
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '12px' }}
                labelStyle={{ color: '#fff' }}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
                formatter={(value: number, name: string) => [
                  viewMode === 'rubles' ? formatCurrency(value) : `${formatNumber(value)} упак.`,
                  name === (viewMode === 'rubles' ? 'planRub' : 'planPacks') ? 'План' : 'Факт',
                ]}
              />
              <Legend formatter={(value) => {
                if (value === 'planRub' || value === 'planPacks') return 'План';
                return 'Факт';
              }} />
              <Bar
                dataKey={viewMode === 'rubles' ? 'planRub' : 'planPacks'}
                fill="#6B7280"
                radius={[4, 4, 0, 0]}
                opacity={0.5}
              />
              <Bar
                dataKey={viewMode === 'rubles' ? 'factRub' : 'factPacks'}
                fill="#3B82F6"
                radius={[4, 4, 0, 0]}
              >
                {barChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="wm-card bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Доля продаж ({viewMode === 'rubles' ? '₽' : 'упак.'})
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={110}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '12px' }}
                labelStyle={{ color: '#fff' }}
                formatter={(value: number) => [
                  viewMode === 'rubles' ? formatCurrency(value) : `${formatNumber(value)} упак.`,
                  'Продажи',
                ]}
              />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                formatter={(value) => <span className="text-gray-300 text-xs">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Products Table */}
      <div className="wm-card bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Pill className="w-5 h-5 text-blue-400" />
          Детальная таблица ({filteredProducts.length} препаратов)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-2">
                  <button onClick={() => handleSort('name')} className="flex items-center gap-1 text-xs text-gray-400 font-medium hover:text-white transition-colors">
                    Препарат <SortIcon field="name" />
                  </button>
                </th>
                <th className="text-left py-3 px-2 text-xs text-gray-400 font-medium">Категория</th>
                <th className="text-right py-3 px-2">
                  <button onClick={() => handleSort('planRub')} className="flex items-center gap-1 text-xs text-gray-400 font-medium hover:text-white transition-colors ml-auto">
                    План (₽) <SortIcon field="planRub" />
                  </button>
                </th>
                <th className="text-right py-3 px-2">
                  <button onClick={() => handleSort('factRub')} className="flex items-center gap-1 text-xs text-gray-400 font-medium hover:text-white transition-colors ml-auto">
                    Факт (₽) <SortIcon field="factRub" />
                  </button>
                </th>
                <th className="text-right py-3 px-2">
                  <button onClick={() => handleSort('planPacks')} className="flex items-center gap-1 text-xs text-gray-400 font-medium hover:text-white transition-colors ml-auto">
                    План (упак.) <SortIcon field="planPacks" />
                  </button>
                </th>
                <th className="text-right py-3 px-2">
                  <button onClick={() => handleSort('factPacks')} className="flex items-center gap-1 text-xs text-gray-400 font-medium hover:text-white transition-colors ml-auto">
                    Факт (упак.) <SortIcon field="factPacks" />
                  </button>
                </th>
                <th className="text-center py-3 px-2">
                  <button onClick={() => handleSort('completionRub')} className="flex items-center gap-1 text-xs text-gray-400 font-medium hover:text-white transition-colors mx-auto">
                    Вып. (%) <SortIcon field="completionRub" />
                  </button>
                </th>
                <th className="text-center py-3 px-2">
                  <button onClick={() => handleSort('growth')} className="flex items-center gap-1 text-xs text-gray-400 font-medium hover:text-white transition-colors mx-auto">
                    Рост <SortIcon field="growth" />
                  </button>
                </th>
                <th className="text-center py-3 px-2 text-xs text-gray-400 font-medium">Тренд</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: product.color }} />
                      <span className="text-white font-medium text-sm">{product.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <span className="text-gray-400 text-sm">{product.category}</span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <span className="text-gray-300 text-sm">{formatCurrency(product.planRub)}</span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <span className="text-white font-medium text-sm">{formatCurrency(product.factRub)}</span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <span className="text-gray-300 text-sm">{formatNumber(product.planPacks)}</span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <span className="text-white font-medium text-sm">{formatNumber(product.factPacks)}</span>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <div className="flex flex-col items-center">
                      <span className={`font-bold text-sm ${getCompletionColor(product.completionRub)}`}>
                        {product.completionRub}%
                      </span>
                      <div className="w-16 h-1.5 bg-gray-700 rounded-full mt-1">
                        <div
                          className={`h-full ${getCompletionBg(product.completionRub)} rounded-full`}
                          style={{ width: `${Math.min(product.completionRub, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className={`flex items-center justify-center gap-1 text-sm font-medium ${
                      product.growth > 0 ? 'text-emerald-400' : product.growth < 0 ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {product.growth > 0 ? (
                        <TrendingUp className="w-3.5 h-3.5" />
                      ) : product.growth < 0 ? (
                        <TrendingDown className="w-3.5 h-3.5" />
                      ) : null}
                      {product.growth > 0 ? '+' : ''}{product.growth}%
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-end gap-0.5 justify-center h-6">
                      {product.monthlyTrend.map((v, i) => {
                        const maxVal = Math.max(...product.monthlyTrend);
                        const height = maxVal > 0 ? (v / maxVal) * 24 : 0;
                        return (
                          <div
                            key={i}
                            className="w-1.5 rounded-t"
                            style={{
                              height: `${height}px`,
                              backgroundColor: product.color,
                              opacity: 0.5 + (i / product.monthlyTrend.length) * 0.5,
                            }}
                          />
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
