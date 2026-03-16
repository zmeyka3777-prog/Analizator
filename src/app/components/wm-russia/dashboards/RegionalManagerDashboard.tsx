import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
  PieChart, Pie, Legend
} from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { MedRepData, WMFederalDistrict, WM_PRODUCTS } from '@/types';
import {
  aggregateTerritoryData,
  calcCompletionPercent,
  getMedRepProductSales,
  aggregateProductSales
} from '@/data/wmRussiaData';

interface RegionalManagerDashboardProps {
  district: WMFederalDistrict;
  districtName: string;
  medReps: MedRepData[];
}

interface TerritoryData {
  name: string;
  medReps: MedRepData[];
  totalPackagesPlan: number;
  totalPackagesFact: number;
  totalMoneyPlan: number;
  totalMoneyFact: number;
  completionPercent: number;
  medRepCount: number;
}

const CARD = 'wm-card bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden';
const TT = { backgroundColor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#e2e8f0' };

const completionColor = (p: number) => p >= 95 ? '#10b981' : p >= 85 ? '#f59e0b' : '#ef4444';
const completionBadge = (p: number) =>
  p >= 95
    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
    : p >= 85
    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
    : 'bg-red-500/20 text-red-400 border border-red-500/30';

export function RegionalManagerDashboard({ district, districtName, medReps }: RegionalManagerDashboardProps) {
  const [selectedTerritory, setSelectedTerritory] = useState<string | null>(null);
  const [expandedTerritories, setExpandedTerritories] = useState<Set<string>>(new Set());
  const [expandedMedReps, setExpandedMedReps] = useState<Set<string>>(new Set());
  const [productFilter, setProductFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('all');

  const districtTotals = useMemo(() => aggregateTerritoryData(medReps), [medReps]);
  const packagesCompletion = calcCompletionPercent(districtTotals.totalPackagesFact, districtTotals.totalPackagesPlan);
  const moneyCompletion = calcCompletionPercent(districtTotals.totalMoneyFact, districtTotals.totalMoneyPlan);

  const territories = useMemo((): TerritoryData[] => {
    const map = new Map<string, MedRepData[]>();
    medReps.forEach(rep => {
      const arr = map.get(rep.territory) || [];
      arr.push(rep);
      map.set(rep.territory, arr);
    });
    return Array.from(map.entries()).map(([name, reps]) => {
      const totals = aggregateTerritoryData(reps);
      return { name, medReps: reps, ...totals, completionPercent: calcCompletionPercent(totals.totalPackagesFact, totals.totalPackagesPlan), medRepCount: reps.length };
    }).sort((a, b) => b.completionPercent - a.completionPercent);
  }, [medReps]);

  const productSalesData = useMemo(() => {
    const filtered = selectedTerritory ? medReps.filter(r => r.territory === selectedTerritory) : medReps;
    return aggregateProductSales(filtered);
  }, [medReps, selectedTerritory]);

  const pieChartData = useMemo(() =>
    productSalesData.filter(p => p.fact > 0).map(p => ({ name: p.productName, value: p.fact, color: p.color })),
  [productSalesData]);

  const territoryChartData = useMemo(() =>
    territories.map(t => ({ name: t.name, percent: t.completionPercent, medRepCount: t.medRepCount })),
  [territories]);

  const filteredTerritories = useMemo(() =>
    selectedTerritory ? territories.filter(t => t.name === selectedTerritory) : territories,
  [territories, selectedTerritory]);

  const toggleTerritory = (name: string) => {
    setExpandedTerritories(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n; });
  };
  const toggleMedRep = (id: string) => {
    setExpandedMedReps(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const fmt = (v: number) => new Intl.NumberFormat('ru-RU').format(v);
  const fmtMoney = (v: number) =>
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(v);
  const fmtMoneyFull = (v: number) => v.toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' ₽';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            {districtName}
          </h2>
          <p className="text-gray-400 text-sm mt-0.5">
            {district} • {territories.length} территорий • {medReps.length} медпредставителей
          </p>
        </div>
        <div className="flex gap-3">
          <Select value={productFilter} onValueChange={setProductFilter}>
            <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-gray-300">
              <SelectValue placeholder="Все продукты" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10">
              <SelectItem value="all" className="text-gray-300">Все продукты</SelectItem>
              {WM_PRODUCTS.map(p => (
                <SelectItem key={p.id} value={p.id} className="text-gray-300">{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-gray-300">
              <SelectValue placeholder="Все периоды" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10">
              <SelectItem value="all" className="text-gray-300">Все периоды</SelectItem>
              <SelectItem value="q1" className="text-gray-300">Q1 2025</SelectItem>
              <SelectItem value="q2" className="text-gray-300">Q2 2025</SelectItem>
              <SelectItem value="q3" className="text-gray-300">Q3 2025</SelectItem>
              <SelectItem value="q4" className="text-gray-300">Q4 2025</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Упаковки план', value: fmt(districtTotals.totalPackagesPlan), pct: null },
          { label: 'Упаковки факт', value: fmt(districtTotals.totalPackagesFact), pct: packagesCompletion },
          { label: 'Деньги план', value: fmtMoney(districtTotals.totalMoneyPlan), pct: null },
          { label: 'Деньги факт', value: fmtMoney(districtTotals.totalMoneyFact), pct: moneyCompletion },
          { label: 'Медпредставителей', value: String(medReps.length), pct: null, sub: `${territories.length} территорий` },
        ].map(({ label, value, pct, sub }) => (
          <div key={label} className={CARD + ' p-5'}>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-xl font-bold text-white truncate">{value}</p>
            {pct !== null && (
              <p className="text-xs mt-1 font-medium" style={{ color: completionColor(pct) }}>
                {pct.toFixed(1)}% выполнения
              </p>
            )}
            {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={CARD + ' p-6'}>
          <p className="text-sm font-medium text-gray-400 mb-1">
            Распределение продаж по продуктам
            {selectedTerritory && <span className="text-gray-500 ml-2 text-xs">({selectedTerritory})</span>}
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieChartData} cx="40%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value">
                  {pieChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={TT} />
                <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={CARD + ' p-6'}>
          <p className="text-sm font-medium text-gray-400 mb-4">Сравнение территорий по выполнению</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={territoryChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} tick={{ fontSize: 11, fill: '#94a3b8' }} height={60} />
                <YAxis domain={[0, 'dataMax + 10']} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `${v}%`} />
                <Tooltip formatter={(v: number, n: string) => n === 'percent' ? [`${(v as number).toFixed(1)}%`, 'Выполнение'] : [v, n]} contentStyle={TT} />
                <ReferenceLine y={95} stroke="#10b981" strokeDasharray="5 5" label={{ value: '95%', position: 'right', fill: '#10b981', fontSize: 10 }} />
                <ReferenceLine y={85} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: '85%', position: 'right', fill: '#f59e0b', fontSize: 10 }} />
                <Bar dataKey="percent" radius={[4, 4, 0, 0]} onClick={(data) => setSelectedTerritory(prev => prev === data.name ? null : data.name)} className="cursor-pointer">
                  {territoryChartData.map((entry, i) => (
                    <Cell key={i} fill={completionColor(entry.percent)} stroke={selectedTerritory === entry.name ? '#22d3ee' : 'none'} strokeWidth={2} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Territory Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Территории округа</h3>
          {selectedTerritory && (
            <button onClick={() => setSelectedTerritory(null)} className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
              Показать все
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTerritories.map(territory => (
            <div
              key={territory.name}
              className={`${CARD} p-5 cursor-pointer transition-all hover:bg-white/10 ${selectedTerritory === territory.name ? 'ring-1 ring-cyan-500/50' : ''}`}
              onClick={() => setSelectedTerritory(prev => prev === territory.name ? null : territory.name)}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold text-white text-sm">{territory.name}</p>
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: completionColor(territory.completionPercent) }} />
              </div>
              <p className="text-xs text-gray-500 mb-3">{territory.medRepCount} медпредставителей</p>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Упаковки:</span>
                  <span className="text-gray-300">{fmt(territory.totalPackagesFact)} / {fmt(territory.totalPackagesPlan)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Деньги:</span>
                  <span className="text-gray-300"><span title={fmtMoneyFull(territory.totalMoneyFact)}>{fmtMoney(territory.totalMoneyFact)}</span></span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(territory.completionPercent, 100)}%`, backgroundColor: completionColor(territory.completionPercent) }} />
                </div>
                <span className="text-xs font-medium" style={{ color: completionColor(territory.completionPercent) }}>
                  {territory.completionPercent.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Med Reps Table */}
      <div className={CARD}>
        <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3">
          <h3 className="font-semibold text-white">Медпредставители по территориям</h3>
          {selectedTerritory && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">{selectedTerritory}</span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="w-8 px-3 py-3" />
                <th className="text-left px-4 py-3 text-cyan-400 font-medium text-xs">Территория / Имя</th>
                <th className="text-right px-4 py-3 text-cyan-400 font-medium text-xs">План (упак)</th>
                <th className="text-right px-4 py-3 text-cyan-400 font-medium text-xs">Факт (упак)</th>
                <th className="text-right px-4 py-3 text-cyan-400 font-medium text-xs">%</th>
                <th className="text-right px-4 py-3 text-cyan-400 font-medium text-xs">План (₽)</th>
                <th className="text-right px-4 py-3 text-cyan-400 font-medium text-xs">Факт (₽)</th>
                <th className="text-right px-4 py-3 text-cyan-400 font-medium text-xs">%</th>
                <th className="w-10 px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {filteredTerritories.map((territory) => {
                const isTExpanded = expandedTerritories.has(territory.name);
                const sortedReps = [...territory.medReps].map(rep => ({
                  ...rep,
                  packagesPercent: calcCompletionPercent(rep.totalPackagesFact, rep.totalPackagesPlan),
                  moneyPercent: calcCompletionPercent(rep.totalMoneyFact, rep.totalMoneyPlan),
                })).sort((a, b) => b.packagesPercent - a.packagesPercent);

                return (
                  <React.Fragment key={territory.name}>
                    <tr
                      className="border-b border-white/10 hover:bg-white/5 cursor-pointer transition-colors bg-white/3"
                      onClick={() => toggleTerritory(territory.name)}
                    >
                      <td className="px-3 py-3 text-gray-500 text-center">{isTExpanded ? '▼' : '▶'}</td>
                      <td className="px-4 py-3 font-semibold text-cyan-300">
                        📍 {territory.name}
                        <span className="ml-2 text-xs text-gray-500 font-normal">({territory.medRepCount} чел.)</span>
                      </td>
                      <td className="text-right px-4 py-3 text-gray-400">{fmt(territory.totalPackagesPlan)}</td>
                      <td className="text-right px-4 py-3 text-white font-medium">{fmt(territory.totalPackagesFact)}</td>
                      <td className="text-right px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${completionBadge(territory.completionPercent)}`}>
                          {territory.completionPercent.toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-right px-4 py-3 text-gray-400">
                        <span title={fmtMoneyFull(territory.totalMoneyPlan)}>{fmtMoney(territory.totalMoneyPlan)}</span>
                      </td>
                      <td className="text-right px-4 py-3 text-white">
                        <span title={fmtMoneyFull(territory.totalMoneyFact)}>{fmtMoney(territory.totalMoneyFact)}</span>
                      </td>
                      <td className="text-right px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${completionBadge(calcCompletionPercent(territory.totalMoneyFact, territory.totalMoneyPlan))}`}>
                          {calcCompletionPercent(territory.totalMoneyFact, territory.totalMoneyPlan).toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="w-3 h-3 rounded-full mx-auto" style={{ backgroundColor: completionColor(territory.completionPercent) }} />
                      </td>
                    </tr>

                    {isTExpanded && sortedReps.map((rep, ri) => {
                      const isRepExpanded = expandedMedReps.has(rep.id);
                      const productSales = isRepExpanded ? getMedRepProductSales(rep) : [];
                      const isTop = ri === 0 && sortedReps.length > 1;
                      const isBottom = ri === sortedReps.length - 1 && sortedReps.length > 1 && rep.packagesPercent < 85;

                      return (
                        <React.Fragment key={rep.id}>
                          <tr
                            className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                            onClick={(e) => { e.stopPropagation(); toggleMedRep(rep.id); }}
                          >
                            <td className="pl-8 px-3 py-3 text-gray-500 text-sm text-center">{isRepExpanded ? '▼' : '▶'}</td>
                            <td className="pl-8 px-4 py-3 text-gray-300">
                              {rep.name}
                              {isTop && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">🥇 Лидер</span>}
                              {isBottom && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">⚠️ Отстающий</span>}
                            </td>
                            <td className="text-right px-4 py-3 text-gray-400">{fmt(rep.totalPackagesPlan)}</td>
                            <td className="text-right px-4 py-3 text-white">{fmt(rep.totalPackagesFact)}</td>
                            <td className="text-right px-4 py-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${completionBadge(rep.packagesPercent)}`}>
                                {rep.packagesPercent.toFixed(1)}%
                              </span>
                            </td>
                            <td className="text-right px-4 py-3 text-gray-400">
                              <span title={fmtMoneyFull(rep.totalMoneyPlan)}>{fmtMoney(rep.totalMoneyPlan)}</span>
                            </td>
                            <td className="text-right px-4 py-3 text-white">
                              <span title={fmtMoneyFull(rep.totalMoneyFact)}>{fmtMoney(rep.totalMoneyFact)}</span>
                            </td>
                            <td className="text-right px-4 py-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${completionBadge(rep.moneyPercent)}`}>
                                {rep.moneyPercent.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <div className="w-3 h-3 rounded-full mx-auto" style={{ backgroundColor: completionColor(rep.packagesPercent) }} />
                            </td>
                          </tr>

                          {isRepExpanded && (
                            <tr className="border-b border-white/5">
                              <td colSpan={9} className="p-0">
                                <div className="pl-16 pr-6 py-4 bg-white/3">
                                  <p className="text-xs font-semibold text-cyan-400 mb-3">Детализация по продуктам</p>
                                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    {productSales.map((product) => (
                                      <div key={product.productId} className="bg-white/5 border border-white/10 rounded-xl p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: product.color }} />
                                          <span className="text-xs font-medium text-gray-300">{product.productName}</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                                          <span>План: {fmt(product.plan)}</span>
                                          <span>Факт: {fmt(product.fact)}</span>
                                        </div>
                                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(product.completionPercent, 100)}%`, backgroundColor: completionColor(product.completionPercent) }} />
                                        </div>
                                        <p className="text-xs font-medium mt-1 text-right" style={{ color: completionColor(product.completionPercent) }}>
                                          {product.completionPercent.toFixed(1)}%
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-5 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />≥95% — В плане</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />85–94% — Внимание</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />&lt;85% — Критично</span>
      </div>
    </div>
  );
}

export default RegionalManagerDashboard;
