// ==================== СВОДНЫЙ ВИД ПЛАНОВ ОТ РМ (ДЛЯ ДИРЕКТОРА) ====================
// Загружает все записи из world_medicine.regional_plans через
// GET /api/regional-plans?year=2026 (роль director получает все).
// Показывает:
//   - KPI: общий план в упаковках, кол-во РМ, кол-во регионов с планом
//   - Карточки по РМ: сумма планов + детализация
//   - Сравнение план vs факт через SALES_DATA из useSharedData
//
// Источник правды — БД, не хардкод. Каждый РМ вводит план в своей вкладке
// «Планы», и эти данные сразу видны директору.

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Users, MapPin, Package, TrendingUp, AlertCircle, Calendar, RefreshCw, ChevronRight, ChevronDown } from 'lucide-react';
import { PRODUCTS, getSalesData } from '@/data/salesData';
import { useGlobalFilters } from '@/context/GlobalFiltersContext';
import { useSharedData } from '@/context/SharedDataContext';

interface ApiPlanRow {
  id: number;
  user_id: number;
  year: number;
  region_name: string;
  product_id: string;
  month: number;
  plan_units: number;
  user_name?: string;
  user_email?: string;
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('wm_auth_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

const formatNumber = (n: number) => n.toLocaleString('ru-RU');

export function DirectorPlansSummary() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [plans, setPlans] = useState<ApiPlanRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRM, setExpandedRM] = useState<number | null>(null);

  const { selectedMonths } = useGlobalFilters();
  const { wmRussiaData } = useSharedData();

  const loadPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/regional-plans?year=${year}`, { headers: authHeaders() });
      if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
      const data = await res.json();
      setPlans(data.plans || []);
    } catch (err: any) {
      setError(err?.message || 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPlans(); /* eslint-disable-next-line */ }, [year, wmRussiaData]);

  // Фильтр по выбранным месяцам
  const filteredPlans = useMemo(() => {
    if (selectedMonths.length === 0) return plans;
    const s = new Set(selectedMonths);
    return plans.filter(p => s.has(p.month));
  }, [plans, selectedMonths]);

  // Группировка по РМ
  const byRM = useMemo(() => {
    const map = new Map<number, { user_id: number; user_name: string; plans: ApiPlanRow[]; total: number }>();
    for (const p of filteredPlans) {
      if (!map.has(p.user_id)) {
        map.set(p.user_id, {
          user_id: p.user_id,
          user_name: p.user_name || `User #${p.user_id}`,
          plans: [],
          total: 0,
        });
      }
      const g = map.get(p.user_id)!;
      g.plans.push(p);
      g.total += p.plan_units;
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredPlans]);

  // Общий план
  const grandTotal = useMemo(() => filteredPlans.reduce((s, p) => s + p.plan_units, 0), [filteredPlans]);

  // Факт за тот же период — для сравнения план/факт
  const grandFact = useMemo(() => {
    const data = getSalesData({ year, months: selectedMonths.length > 0 ? selectedMonths : undefined });
    return data.reduce((s, d) => s + d.units, 0);
  }, [year, selectedMonths, wmRussiaData]);

  const performance = grandTotal > 0 ? (grandFact / grandTotal) * 100 : 0;

  const uniqueRegions = useMemo(() => new Set(filteredPlans.map(p => p.region_name)).size, [filteredPlans]);

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-cyan-200 p-6 space-y-4">
      {/* Заголовок */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Планы от региональных менеджеров</h3>
            <p className="text-xs text-slate-500">
              Сводно по всем РМ за {year} год. Каждый РМ заполняет свой план во вкладке «Планы».
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
          >
            {[2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y} год</option>)}
          </select>
          <button
            onClick={loadPlans}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50"
            title="Обновить"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 text-slate-600" />}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {!loading && plans.length === 0 && (
        <div className="text-center py-8 bg-amber-50 border border-amber-200 rounded-2xl">
          <Calendar className="w-12 h-12 text-amber-400 mx-auto mb-2" />
          <p className="text-amber-700 font-semibold">Планов от РМ за {year} год ещё нет</p>
          <p className="text-amber-600 text-xs mt-1">
            Региональные менеджеры могут ввести план в своём кабинете во вкладке «Планы»
            (с возможностью загрузки Excel).
          </p>
        </div>
      )}

      {plans.length > 0 && (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl text-white">
              <p className="text-xs opacity-90">План (упак.)</p>
              <p className="text-2xl font-bold mt-1">{formatNumber(grandTotal)}</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl text-white">
              <p className="text-xs opacity-90">Факт (упак.)</p>
              <p className="text-2xl font-bold mt-1">{formatNumber(grandFact)}</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl text-white">
              <p className="text-xs opacity-90">Выполнение</p>
              <p className="text-2xl font-bold mt-1">{performance.toFixed(1)}%</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl text-white">
              <p className="text-xs opacity-90">РМ заполнили</p>
              <p className="text-2xl font-bold mt-1">{byRM.length}</p>
              <p className="text-[10px] opacity-75 mt-0.5">{uniqueRegions} регионов</p>
            </div>
          </div>

          {/* Список РМ */}
          <div className="space-y-2">
            {byRM.map(rm => {
              const expanded = expandedRM === rm.user_id;
              // Группировка по препарату внутри РМ
              const byProduct = new Map<string, number>();
              for (const p of rm.plans) {
                byProduct.set(p.product_id, (byProduct.get(p.product_id) || 0) + p.plan_units);
              }
              return (
                <div key={rm.user_id} className="bg-slate-50/50 rounded-xl border border-slate-200 overflow-hidden">
                  <button
                    onClick={() => setExpandedRM(expanded ? null : rm.user_id)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-cyan-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                      <Users className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-semibold text-slate-800">{rm.user_name}</span>
                      <span className="text-xs text-slate-500">· {rm.plans.length} записей</span>
                    </div>
                    <span className="text-sm font-bold text-cyan-700">{formatNumber(rm.total)} упак.</span>
                  </button>
                  {expanded && (
                    <div className="px-4 pb-3 border-t border-slate-200 bg-white/50">
                      <p className="text-xs text-slate-500 mt-2 mb-2">Распределение по препаратам:</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {Array.from(byProduct.entries())
                          .sort((a, b) => b[1] - a[1])
                          .map(([pid, units]) => {
                            const p = PRODUCTS.find(x => x.id === pid);
                            return (
                              <div key={pid} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100">
                                <span className="text-xs text-slate-600 truncate flex-1">
                                  {p?.shortName || pid}
                                </span>
                                <span className="text-xs font-bold text-slate-800">{formatNumber(units)}</span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
