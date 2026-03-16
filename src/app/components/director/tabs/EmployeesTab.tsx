import React, { useState, useMemo } from 'react';
import {
  Users, ChevronDown, ChevronRight, Search, Crown, Award,
  TrendingUp, TrendingDown, Star, AlertCircle, User, Briefcase,
  Target, BarChart3
} from 'lucide-react';

const REGIONAL_MANAGERS = [
  { name: 'Оруджов Али', district: 'ЦФО/ПФО', employees: 25 },
  { name: 'Самадова Лейла', district: 'ЦФО/СЗФО', employees: 23 },
  { name: 'Сонин Сергей', district: 'ПФО', employees: 14 },
  { name: 'Аббасов Эльмир', district: 'ЮФО/СКФО', employees: 10 },
  { name: 'Мильченко Михаил', district: 'СФО/ДФО', employees: 14 },
  { name: 'Тагиева Самира', district: 'УФО', employees: 7 },
  { name: 'Штефанова Оксана', district: 'ЮФО', employees: 3 },
  { name: 'Гусейн Улви', district: 'ЮФО', employees: 3 },
];

interface MedRep {
  name: string;
  salesRub: number;
  completion: number;
  productivity: number;
  growth: number;
}

interface TerritoryManager {
  name: string;
  territory: string;
  salesRub: number;
  completion: number;
  productivity: number;
  growth: number;
  medReps: MedRep[];
}

interface RegionalManagerData {
  name: string;
  district: string;
  employeeCount: number;
  salesRub: number;
  completion: number;
  productivity: number;
  growth: number;
  territoryManagers: TerritoryManager[];
}

const FIRST_NAMES_M = ['Алексей', 'Дмитрий', 'Максим', 'Андрей', 'Иван', 'Павел', 'Артём', 'Владислав', 'Кирилл', 'Роман', 'Сергей', 'Николай', 'Олег', 'Виктор', 'Егор'];
const FIRST_NAMES_F = ['Елена', 'Анна', 'Ольга', 'Мария', 'Наталья', 'Екатерина', 'Ирина', 'Светлана', 'Юлия', 'Татьяна', 'Дарья', 'Алина', 'Карина', 'Диана', 'Нина'];
const LAST_NAMES_M = ['Иванов', 'Петров', 'Сидоров', 'Козлов', 'Морозов', 'Волков', 'Соколов', 'Лебедев', 'Новиков', 'Попов', 'Кузнецов', 'Федоров', 'Орлов', 'Смирнов', 'Васильев'];
const LAST_NAMES_F = ['Иванова', 'Петрова', 'Сидорова', 'Козлова', 'Морозова', 'Волкова', 'Соколова', 'Лебедева', 'Новикова', 'Попова', 'Кузнецова', 'Федорова', 'Орлова', 'Смирнова', 'Васильева'];

const TERRITORIES: Record<string, string[]> = {
  'ЦФО/ПФО': ['Москва', 'МО Север', 'МО Юг', 'Казань', 'Нижний Новгород'],
  'ЦФО/СЗФО': ['Москва Центр', 'Санкт-Петербург', 'Калининград', 'Тула'],
  'ПФО': ['Самара', 'Уфа', 'Пермь'],
  'ЮФО/СКФО': ['Краснодар', 'Ростов-на-Дону'],
  'СФО/ДФО': ['Новосибирск', 'Красноярск', 'Владивосток'],
  'УФО': ['Екатеринбург', 'Тюмень'],
  'ЮФО': ['Сочи'],
};

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
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

export default function EmployeesTab() {
  const [expandedManagers, setExpandedManagers] = useState<Set<string>>(new Set());
  const [expandedTMs, setExpandedTMs] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterRegion, setFilterRegion] = useState<string>('Все');

  const managersData: RegionalManagerData[] = useMemo(() => {
    const rng = seededRandom(42);

    return REGIONAL_MANAGERS.map((rm, rmIdx) => {
      const territories = TERRITORIES[rm.district] || ['Территория 1'];
      const medRepsPerTerritory = Math.max(1, Math.floor((rm.employees - territories.length) / territories.length));

      let totalSales = 0;
      let totalEmployees = 0;

      const territoryManagers: TerritoryManager[] = territories.map((terr, tIdx) => {
        const isFemale = rng() > 0.6;
        const tmName = isFemale
          ? `${LAST_NAMES_F[(rmIdx * 5 + tIdx) % LAST_NAMES_F.length]} ${FIRST_NAMES_F[(rmIdx * 5 + tIdx) % FIRST_NAMES_F.length]}`
          : `${LAST_NAMES_M[(rmIdx * 5 + tIdx) % LAST_NAMES_M.length]} ${FIRST_NAMES_M[(rmIdx * 5 + tIdx) % FIRST_NAMES_M.length]}`;

        const medReps: MedRep[] = Array.from({ length: medRepsPerTerritory }, (_, mrIdx) => {
          const mrFemale = rng() > 0.5;
          const mrName = mrFemale
            ? `${LAST_NAMES_F[(rmIdx * 20 + tIdx * 5 + mrIdx) % LAST_NAMES_F.length]} ${FIRST_NAMES_F[(rmIdx * 20 + tIdx * 5 + mrIdx + 3) % FIRST_NAMES_F.length]}`
            : `${LAST_NAMES_M[(rmIdx * 20 + tIdx * 5 + mrIdx) % LAST_NAMES_M.length]} ${FIRST_NAMES_M[(rmIdx * 20 + tIdx * 5 + mrIdx + 3) % FIRST_NAMES_M.length]}`;

          const mrSales = Math.round(800_000 + rng() * 2_200_000);
          const mrCompletion = Math.round(60 + rng() * 45);
          const mrGrowth = Math.round(-10 + rng() * 35);

          return {
            name: mrName,
            salesRub: mrSales,
            completion: mrCompletion,
            productivity: mrSales,
            growth: mrGrowth,
          };
        });

        const tmSales = medReps.reduce((s, mr) => s + mr.salesRub, 0) + Math.round(500_000 + rng() * 1_000_000);
        const tmCompletion = Math.round(medReps.reduce((s, mr) => s + mr.completion, 0) / Math.max(medReps.length, 1));
        const tmGrowth = Math.round(-5 + rng() * 30);
        totalSales += tmSales;
        totalEmployees += medReps.length + 1;

        return {
          name: tmName,
          territory: terr,
          salesRub: tmSales,
          completion: tmCompletion,
          productivity: Math.round(tmSales / (medReps.length + 1)),
          growth: tmGrowth,
          medReps,
        };
      });

      const rmCompletion = Math.round(
        territoryManagers.reduce((s, tm) => s + tm.completion, 0) / Math.max(territoryManagers.length, 1)
      );
      const rmGrowth = Math.round(
        territoryManagers.reduce((s, tm) => s + tm.growth, 0) / Math.max(territoryManagers.length, 1)
      );

      return {
        name: rm.name,
        district: rm.district,
        employeeCount: rm.employees,
        salesRub: totalSales,
        completion: rmCompletion,
        productivity: Math.round(totalSales / Math.max(totalEmployees, 1)),
        growth: rmGrowth,
        territoryManagers,
      };
    });
  }, []);

  const totalEmployees = managersData.reduce((s, rm) => s + rm.employeeCount + 1, 0);

  const allPerformers = useMemo(() => {
    const performers: { name: string; role: string; salesRub: number; completion: number; region: string }[] = [];
    managersData.forEach((rm) => {
      rm.territoryManagers.forEach((tm) => {
        tm.medReps.forEach((mr) => {
          performers.push({
            name: mr.name,
            role: 'Мед. представитель',
            salesRub: mr.salesRub,
            completion: mr.completion,
            region: rm.district,
          });
        });
        performers.push({
          name: tm.name,
          role: 'Территориальный менеджер',
          salesRub: tm.salesRub,
          completion: tm.completion,
          region: rm.district,
        });
      });
    });
    return performers.sort((a, b) => b.completion - a.completion);
  }, [managersData]);

  const top5 = allPerformers.slice(0, 5);
  const bottom5 = allPerformers.slice(-5).reverse();

  const filteredManagers = useMemo(() => {
    let result = managersData;
    if (filterRegion !== 'Все') {
      result = result.filter((rm) => rm.district.includes(filterRegion));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((rm) => {
        if (rm.name.toLowerCase().includes(q)) return true;
        if (rm.district.toLowerCase().includes(q)) return true;
        return rm.territoryManagers.some(
          (tm) =>
            tm.name.toLowerCase().includes(q) ||
            tm.territory.toLowerCase().includes(q) ||
            tm.medReps.some((mr) => mr.name.toLowerCase().includes(q))
        );
      });
    }
    return result;
  }, [managersData, filterRegion, searchQuery]);

  const uniqueRegions = useMemo(() => {
    const regions = new Set<string>();
    REGIONAL_MANAGERS.forEach((rm) => {
      rm.district.split('/').forEach((d) => regions.add(d));
    });
    return ['Все', ...Array.from(regions)];
  }, []);

  const toggleManager = (name: string) => {
    setExpandedManagers((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const toggleTM = (key: string) => {
    setExpandedTMs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          Управление сотрудниками
        </h2>
        <p className="text-gray-400 mt-1">Иерархия команды, KPI и показатели эффективности</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="wm-card bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Всего сотрудников</p>
              <p className="text-2xl font-bold text-white">{totalEmployees}</p>
              <p className="text-xs text-gray-500">включая директора</p>
            </div>
          </div>
        </div>
        <div className="wm-card bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Региональных менеджеров</p>
              <p className="text-2xl font-bold text-white">{managersData.length}</p>
            </div>
          </div>
        </div>
        <div className="wm-card bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Ср. выполнение</p>
              <p className="text-2xl font-bold text-emerald-400">
                {Math.round(managersData.reduce((s, rm) => s + rm.completion, 0) / managersData.length)}%
              </p>
            </div>
          </div>
        </div>
        <div className="wm-card bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Общие продажи</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(managersData.reduce((s, rm) => s + rm.salesRub, 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top-5 & Bottom-5 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="wm-card bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400" />
            Топ-5 сотрудников
          </h3>
          <div className="space-y-2">
            {top5.map((p, idx) => (
              <div key={`top-${idx}`} className="flex items-center gap-3 bg-emerald-500/5 rounded-xl px-4 py-3 border border-emerald-500/20">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{p.name}</p>
                  <p className="text-gray-500 text-xs">{p.role} | {p.region}</p>
                </div>
                <div className="text-right">
                  <p className="text-emerald-400 font-bold text-sm">{p.completion}%</p>
                  <p className="text-gray-400 text-xs">{formatCurrency(p.salesRub)}</p>
                </div>
                {idx === 0 && <Crown className="w-5 h-5 text-amber-400" />}
                {idx > 0 && idx < 3 && <Award className="w-5 h-5 text-gray-400" />}
              </div>
            ))}
          </div>
        </div>

        <div className="wm-card bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            Требуют внимания (Bottom-5)
          </h3>
          <div className="space-y-2">
            {bottom5.map((p, idx) => (
              <div key={`bottom-${idx}`} className="flex items-center gap-3 bg-red-500/5 rounded-xl px-4 py-3 border border-red-500/20">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm">
                  {allPerformers.length - 4 + idx}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{p.name}</p>
                  <p className="text-gray-500 text-xs">{p.role} | {p.region}</p>
                </div>
                <div className="text-right">
                  <p className="text-red-400 font-bold text-sm">{p.completion}%</p>
                  <p className="text-gray-400 text-xs">{formatCurrency(p.salesRub)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск по имени, территории..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
          />
        </div>
        <div className="flex gap-1">
          {uniqueRegions.map((region) => (
            <button
              key={region}
              onClick={() => setFilterRegion(region)}
              className={`px-3 py-2 rounded-xl text-sm transition-all ${
                filterRegion === region
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {region}
            </button>
          ))}
        </div>
      </div>

      {/* Hierarchical Tree */}
      <div className="wm-card bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-400" />
          Организационная структура
        </h3>

        {/* Director Node */}
        <div className="mb-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl border border-indigo-500/30 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
              Д
            </div>
            <div>
              <p className="text-white font-bold">Генеральный директор</p>
              <p className="text-gray-400 text-sm">{totalEmployees} сотрудников в подчинении</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-medium">
                Уровень 1
              </span>
            </div>
          </div>
        </div>

        {/* Regional Managers */}
        <div className="space-y-2 ml-6">
          {filteredManagers.map((rm) => {
            const isExpanded = expandedManagers.has(rm.name);
            return (
              <div key={rm.name}>
                {/* RM Row */}
                <button
                  onClick={() => toggleManager(rm.name)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/10"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {rm.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-white font-medium text-sm">{rm.name}</p>
                    <p className="text-gray-500 text-xs">РМ | {rm.district} | {rm.employeeCount} чел.</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm flex-shrink-0">
                    <div className="text-right">
                      <p className="text-gray-400 text-xs">Продажи</p>
                      <p className="text-white font-medium">{formatCurrency(rm.salesRub)}</p>
                    </div>
                    <div className="text-center min-w-[50px]">
                      <p className="text-gray-400 text-xs">Вып.</p>
                      <p className={`font-bold ${getCompletionColor(rm.completion)}`}>{rm.completion}%</p>
                    </div>
                    <div className="text-center min-w-[70px]">
                      <p className="text-gray-400 text-xs">Продукт-ть</p>
                      <p className="text-blue-400 font-medium">{formatCurrency(rm.productivity)}</p>
                    </div>
                    <div className="text-center min-w-[50px]">
                      <p className="text-gray-400 text-xs">Рост</p>
                      <p className={`flex items-center justify-center gap-0.5 ${rm.growth > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {rm.growth > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {rm.growth > 0 ? '+' : ''}{rm.growth}%
                      </p>
                    </div>
                  </div>
                </button>

                {/* Territory Managers */}
                {isExpanded && (
                  <div className="ml-8 mt-1 space-y-1">
                    {rm.territoryManagers.map((tm) => {
                      const tmKey = `${rm.name}-${tm.name}`;
                      const tmExpanded = expandedTMs.has(tmKey);
                      return (
                        <div key={tmKey}>
                          <button
                            onClick={() => toggleTM(tmKey)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg bg-white/3 hover:bg-white/5 transition-all"
                          >
                            {tmExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                            )}
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {tm.name.split(' ').map((n) => n[0]).join('')}
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <p className="text-gray-200 text-sm">{tm.name}</p>
                              <p className="text-gray-600 text-xs">ТМ | {tm.territory} | {tm.medReps.length} мед. пред.</p>
                            </div>
                            <div className="flex items-center gap-4 text-sm flex-shrink-0">
                              <div className="text-right min-w-[80px]">
                                <p className="text-gray-300 text-sm">{formatCurrency(tm.salesRub)}</p>
                              </div>
                              <div className="text-center min-w-[40px]">
                                <p className={`font-bold text-sm ${getCompletionColor(tm.completion)}`}>{tm.completion}%</p>
                              </div>
                              <div className="text-center min-w-[50px]">
                                <p className={`text-sm ${tm.growth > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {tm.growth > 0 ? '+' : ''}{tm.growth}%
                                </p>
                              </div>
                            </div>
                          </button>

                          {/* Med Reps */}
                          {tmExpanded && (
                            <div className="ml-10 mt-0.5 space-y-0.5">
                              {tm.medReps.map((mr, mrIdx) => (
                                <div
                                  key={`${tmKey}-${mrIdx}`}
                                  className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-white/3 transition-all"
                                >
                                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                                    <User className="w-3 h-3 text-gray-400" />
                                  </div>
                                  <div className="flex-1 text-left min-w-0">
                                    <p className="text-gray-300 text-sm">{mr.name}</p>
                                    <p className="text-gray-600 text-xs">Мед. представитель</p>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm flex-shrink-0">
                                    <div className="text-right min-w-[80px]">
                                      <p className="text-gray-400 text-sm">{formatCurrency(mr.salesRub)}</p>
                                    </div>
                                    <div className="text-center min-w-[40px]">
                                      <div className="flex flex-col items-center">
                                        <p className={`font-medium text-sm ${getCompletionColor(mr.completion)}`}>{mr.completion}%</p>
                                        <div className="w-10 h-1 bg-gray-700 rounded-full mt-0.5">
                                          <div
                                            className={`h-full ${getCompletionBg(mr.completion)} rounded-full`}
                                            style={{ width: `${Math.min(mr.completion, 100)}%` }}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-center min-w-[50px]">
                                      <p className={`text-sm ${mr.growth > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {mr.growth > 0 ? '+' : ''}{mr.growth}%
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
