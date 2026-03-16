import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  MapPin, TrendingUp, TrendingDown, ChevronDown, ChevronRight,
  Building2, Users, Target, Award, AlertTriangle
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

const FEDERAL_DISTRICTS = [
  { id: 'cfo', name: 'ЦФО', fullName: 'Центральный ФО', share: 0.25 },
  { id: 'szfo', name: 'СЗФО', fullName: 'Северо-Западный ФО', share: 0.12 },
  { id: 'yufo', name: 'ЮФО', fullName: 'Южный ФО', share: 0.10 },
  { id: 'skfo', name: 'СКФО', fullName: 'Северо-Кавказский ФО', share: 0.05 },
  { id: 'pfo', name: 'ПФО', fullName: 'Приволжский ФО', share: 0.18 },
  { id: 'ufo', name: 'УФО', fullName: 'Уральский ФО', share: 0.10 },
  { id: 'sfo', name: 'СФО', fullName: 'Сибирский ФО', share: 0.12 },
  { id: 'dfo', name: 'ДФО', fullName: 'Дальневосточный ФО', share: 0.08 },
];

interface RegionData {
  name: string;
  salesRub: number;
  salesPacks: number;
  planRub: number;
  completion: number;
  contragents: number;
  growth: number;
}

interface DistrictData {
  id: string;
  name: string;
  fullName: string;
  salesRub: number;
  salesPacks: number;
  planRub: number;
  completion: number;
  contragents: number;
  growth: number;
  color: string;
  regions: RegionData[];
}

const DISTRICT_REGIONS: Record<string, string[]> = {
  cfo: ['Москва', 'Московская обл.', 'Воронежская обл.', 'Тульская обл.', 'Ярославская обл.', 'Рязанская обл.'],
  szfo: ['Санкт-Петербург', 'Ленинградская обл.', 'Калининградская обл.', 'Архангельская обл.'],
  yufo: ['Краснодарский край', 'Ростовская обл.', 'Волгоградская обл.', 'Астраханская обл.'],
  skfo: ['Ставропольский край', 'Дагестан', 'Чечня'],
  pfo: ['Татарстан', 'Нижегородская обл.', 'Самарская обл.', 'Башкортостан', 'Пермский край'],
  ufo: ['Свердловская обл.', 'Тюменская обл.', 'Челябинская обл.'],
  sfo: ['Новосибирская обл.', 'Красноярский край', 'Кемеровская обл.', 'Омская обл.'],
  dfo: ['Приморский край', 'Хабаровский край', 'Сахалинская обл.'],
};

const DISTRICT_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#84CC16'];

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

const getHeatColor = (pct: number): string => {
  if (pct >= 95) return 'border-l-emerald-500 bg-emerald-500/5';
  if (pct >= 85) return 'border-l-green-500 bg-green-500/5';
  if (pct >= 75) return 'border-l-yellow-500 bg-yellow-500/5';
  if (pct >= 65) return 'border-l-orange-500 bg-orange-500/5';
  return 'border-l-red-500 bg-red-500/5';
};

export default function TerritoriesTab() {
  const [expandedDistricts, setExpandedDistricts] = useState<Set<string>>(new Set());

  const districtData: DistrictData[] = useMemo(() => {
    const totalBudget = 624_948_311;
    const completionValues = [94, 87, 82, 68, 91, 78, 85, 72];
    const growthValues = [18, 12, 9, 3, 15, 7, 11, 5];
    const contragentCounts = [1240, 580, 420, 180, 780, 350, 520, 280];

    return FEDERAL_DISTRICTS.map((district, idx) => {
      const planRub = Math.round(totalBudget * district.share);
      const completion = completionValues[idx];
      const salesRub = Math.round(planRub * (completion / 100));
      const avgPrice = 520;
      const salesPacks = Math.round(salesRub / avgPrice);

      const regionNames = DISTRICT_REGIONS[district.id] || [];
      const regionCount = regionNames.length;
      const regions: RegionData[] = regionNames.map((name, rIdx) => {
        const regionShareOfDistrict = (1 / regionCount) * (1 + (rIdx === 0 ? 0.4 : -0.1 * rIdx));
        const regionPlan = Math.round(planRub * Math.max(regionShareOfDistrict, 0.05));
        const regionCompletion = Math.max(55, Math.min(105, completion + Math.round((Math.random() - 0.5) * 20)));
        const regionSalesRub = Math.round(regionPlan * (regionCompletion / 100));
        const regionSalesPacks = Math.round(regionSalesRub / avgPrice);
        const regionContragents = Math.round(contragentCounts[idx] / regionCount * (1 + (Math.random() - 0.5) * 0.5));
        const regionGrowth = Math.round(growthValues[idx] + (Math.random() - 0.5) * 10);
        return {
          name,
          salesRub: regionSalesRub,
          salesPacks: regionSalesPacks,
          planRub: regionPlan,
          completion: regionCompletion,
          contragents: regionContragents,
          growth: regionGrowth,
        };
      });

      return {
        id: district.id,
        name: district.name,
        fullName: district.fullName,
        salesRub,
        salesPacks,
        planRub,
        completion,
        contragents: contragentCounts[idx],
        growth: growthValues[idx],
        color: DISTRICT_COLORS[idx],
        regions,
      };
    });
  }, []);

  const sortedDistricts = useMemo(
    () => [...districtData].sort((a, b) => b.salesRub - a.salesRub),
    [districtData]
  );

  const topDistrict = sortedDistricts[0];
  const bottomDistrict = sortedDistricts[sortedDistricts.length - 1];
  const totalContragents = districtData.reduce((s, d) => s + d.contragents, 0);

  const toggleDistrict = (districtId: string) => {
    setExpandedDistricts((prev) => {
      const next = new Set(prev);
      if (next.has(districtId)) {
        next.delete(districtId);
      } else {
        next.add(districtId);
      }
      return next;
    });
  };

  const barChartData = useMemo(() => {
    return sortedDistricts.map((d) => ({
      name: d.name,
      fullName: d.fullName,
      sales: d.salesRub,
      plan: d.planRub,
      completion: d.completion,
      color: d.color,
    }));
  }, [sortedDistricts]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          Аналитика по территориям
        </h2>
        <p className="text-gray-400 mt-1">Анализ продаж по федеральным округам и регионам</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="wm-card bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Всего округов</p>
              <p className="text-2xl font-bold text-white">{districtData.length}</p>
            </div>
          </div>
        </div>
        <div className="wm-card bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Лидер</p>
              <p className="text-lg font-bold text-white">{topDistrict.fullName}</p>
              <p className="text-emerald-400 text-sm">{topDistrict.completion}% | {formatCurrency(topDistrict.salesRub)}</p>
            </div>
          </div>
        </div>
        <div className="wm-card bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Отстающий</p>
              <p className="text-lg font-bold text-white">{bottomDistrict.fullName}</p>
              <p className="text-red-400 text-sm">{bottomDistrict.completion}% | {formatCurrency(bottomDistrict.salesRub)}</p>
            </div>
          </div>
        </div>
        <div className="wm-card bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Контрагенты</p>
              <p className="text-2xl font-bold text-white">{formatNumber(totalContragents)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal Bar Chart */}
      <div className="wm-card bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-cyan-400" />
          Рейтинг округов по продажам
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={barChartData} layout="vertical" barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              type="number"
              stroke="#9CA3AF"
              fontSize={12}
              tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M` : `${(v / 1_000).toFixed(0)}K`}
            />
            <YAxis type="category" dataKey="name" stroke="#9CA3AF" fontSize={12} width={50} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '12px' }}
              labelStyle={{ color: '#fff' }}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name === 'plan' ? 'План' : 'Факт',
              ]}
            />
            <Bar dataKey="plan" fill="#4B5563" radius={[0, 4, 4, 0]} barSize={14} name="План" />
            <Bar dataKey="sales" radius={[0, 4, 4, 0]} barSize={14} name="Факт">
              {barChartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Districts Table with Drill-Down */}
      <div className="wm-card bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-purple-400" />
          Детализация по округам и регионам
        </h3>
        <div className="space-y-2">
          {sortedDistricts.map((district) => {
            const isExpanded = expandedDistricts.has(district.id);
            return (
              <div key={district.id} className="rounded-xl overflow-hidden">
                {/* District Row */}
                <button
                  onClick={() => toggleDistrict(district.id)}
                  className={`w-full flex items-center gap-4 px-4 py-3 border-l-4 transition-all hover:bg-white/5 ${getHeatColor(district.completion)}`}
                >
                  <div className="flex items-center gap-2 min-w-[24px]">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: district.color }}>
                    <span className="text-white text-xs font-bold">{district.name}</span>
                  </div>
                  <div className="flex-1 text-left">
                    <span className="text-white font-medium">{district.fullName}</span>
                  </div>
                  <div className="grid grid-cols-5 gap-6 text-sm flex-shrink-0">
                    <div className="text-right min-w-[100px]">
                      <p className="text-gray-400 text-xs">Продажи (₽)</p>
                      <p className="text-white font-medium">{formatCurrency(district.salesRub)}</p>
                    </div>
                    <div className="text-right min-w-[80px]">
                      <p className="text-gray-400 text-xs">Упаковки</p>
                      <p className="text-white font-medium">{formatNumber(district.salesPacks)}</p>
                    </div>
                    <div className="text-right min-w-[100px]">
                      <p className="text-gray-400 text-xs">План (₽)</p>
                      <p className="text-gray-300">{formatCurrency(district.planRub)}</p>
                    </div>
                    <div className="text-center min-w-[70px]">
                      <p className="text-gray-400 text-xs">Выполнение</p>
                      <p className={`font-bold ${getCompletionColor(district.completion)}`}>{district.completion}%</p>
                    </div>
                    <div className="text-center min-w-[70px]">
                      <p className="text-gray-400 text-xs">Рост</p>
                      <p className={`flex items-center justify-center gap-1 ${district.growth > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {district.growth > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        {district.growth > 0 ? '+' : ''}{district.growth}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-gray-500 text-xs min-w-[60px]">
                    <Users className="w-3.5 h-3.5" />
                    {formatNumber(district.contragents)}
                  </div>
                </button>

                {/* Expanded Regions */}
                {isExpanded && (
                  <div className="bg-white/3 border-l-4 border-l-transparent ml-6">
                    {district.regions.map((region, rIdx) => (
                      <div
                        key={region.name}
                        className={`flex items-center gap-4 px-4 py-2.5 border-l-4 ${getHeatColor(region.completion)} ${
                          rIdx < district.regions.length - 1 ? 'border-b border-white/5' : ''
                        }`}
                      >
                        <div className="w-[24px]" />
                        <div className="w-8 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-gray-500" />
                        </div>
                        <div className="flex-1 text-left">
                          <span className="text-gray-300 text-sm">{region.name}</span>
                        </div>
                        <div className="grid grid-cols-5 gap-6 text-sm flex-shrink-0">
                          <div className="text-right min-w-[100px]">
                            <p className="text-white text-sm">{formatCurrency(region.salesRub)}</p>
                          </div>
                          <div className="text-right min-w-[80px]">
                            <p className="text-white text-sm">{formatNumber(region.salesPacks)}</p>
                          </div>
                          <div className="text-right min-w-[100px]">
                            <p className="text-gray-400 text-sm">{formatCurrency(region.planRub)}</p>
                          </div>
                          <div className="text-center min-w-[70px]">
                            <div className="flex flex-col items-center">
                              <span className={`font-bold text-sm ${getCompletionColor(region.completion)}`}>
                                {region.completion}%
                              </span>
                              <div className="w-12 h-1 bg-gray-700 rounded-full mt-0.5">
                                <div
                                  className={`h-full ${getCompletionBg(region.completion)} rounded-full`}
                                  style={{ width: `${Math.min(region.completion, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                          <div className="text-center min-w-[70px]">
                            <span className={`flex items-center justify-center gap-1 text-sm ${
                              region.growth > 0 ? 'text-emerald-400' : 'text-red-400'
                            }`}>
                              {region.growth > 0 ? '+' : ''}{region.growth}%
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-gray-500 text-xs min-w-[60px]">
                          <Building2 className="w-3 h-3" />
                          {formatNumber(region.contragents)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Bar */}
      <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 backdrop-blur-xl rounded-2xl border border-cyan-500/30 p-5">
        <div className="flex items-center gap-4 justify-between flex-wrap">
          <div className="flex items-center gap-3">
            <Target className="w-6 h-6 text-cyan-400" />
            <div>
              <p className="text-white font-medium">Общее выполнение плана по территориям</p>
              <p className="text-gray-400 text-sm">
                {districtData.filter((d) => d.completion >= 90).length} из {districtData.length} округов выполняют план на 90%+
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-gray-300 text-sm">&ge;90%</span>
              <span className="text-white font-bold">{districtData.filter((d) => d.completion >= 90).length}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-gray-300 text-sm">70-89%</span>
              <span className="text-white font-bold">{districtData.filter((d) => d.completion >= 70 && d.completion < 90).length}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-gray-300 text-sm">&lt;70%</span>
              <span className="text-white font-bold">{districtData.filter((d) => d.completion < 70).length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
