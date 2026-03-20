import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { MedRepData, WMFederalDistrict } from '@/types';
import { aggregateTerritoryData, calcCompletionPercent, getMedRepProductSales } from '@/data/wmRussiaData';
import { WMDataUploadPanel } from '../WMDataUploadPanel';
interface TerritoryManagerDashboardProps {
  territory: string;
  district: WMFederalDistrict;
  medReps: MedRepData[];
  activeSection?: string;
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

type TMTab = 'overview' | 'team' | 'compare' | 'kpi';

const TM_SECTION_MAP: Record<string, TMTab> = {
  'my-territory': 'overview',
  'team': 'team',
  'compare': 'compare',
  'territory-kpi': 'kpi',
};

export function TerritoryManagerDashboard({ territory, district, medReps, activeSection }: TerritoryManagerDashboardProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<TMTab>('overview');

  // Синхронизация сайдбара
  React.useEffect(() => {
    if (activeSection) {
      const mapped = TM_SECTION_MAP[activeSection];
      if (mapped && mapped !== activeTab) {
        setActiveTab(mapped);
      }
    }
  }, [activeSection]);

  const territoryTotals = useMemo(() => aggregateTerritoryData(medReps), [medReps]);
  const packagesCompletion = calcCompletionPercent(territoryTotals.totalPackagesFact, territoryTotals.totalPackagesPlan);
  const moneyCompletion = calcCompletionPercent(territoryTotals.totalMoneyFact, territoryTotals.totalMoneyPlan);

  const sortedMedReps = useMemo(() =>
    [...medReps].map(rep => ({
      ...rep,
      packagesPercent: calcCompletionPercent(rep.totalPackagesFact, rep.totalPackagesPlan),
      moneyPercent: calcCompletionPercent(rep.totalMoneyFact, rep.totalMoneyPlan),
    })).sort((a, b) => b.packagesPercent - a.packagesPercent),
  [medReps]);

  const top3 = useMemo(() => sortedMedReps.slice(0, 3).map(r => r.id), [sortedMedReps]);
  const bottom3 = useMemo(() => sortedMedReps.length <= 3 ? [] : sortedMedReps.slice(-3).map(r => r.id), [sortedMedReps]);

  const chartData = useMemo(() =>
    sortedMedReps.map(rep => ({
      name: rep.name.split(' ')[0],
      fullName: rep.name,
      percent: rep.packagesPercent,
      id: rep.id,
    })),
  [sortedMedReps]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const fmt = (v: number) => new Intl.NumberFormat('ru-RU').format(v);
  const fmtMoney = (v: number) =>
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(v);
  const fmtMoneyFull = (v: number) => v.toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' ₽';

  const getMedal = (id: string) => {
    const ti = top3.indexOf(id);
    const bi = bottom3.indexOf(id);
    if (ti !== -1) {
      const medals = ['🥇', '🥈', '🥉'];
      return <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">{medals[ti]} Топ-{ti + 1}</span>;
    }
    if (bi !== -1) {
      return <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">⚠️ Отстающий</span>;
    }
    return null;
  };

  const tmTabs: { key: TMTab; label: string }[] = [
    { key: 'overview', label: 'Моя территория' },
    { key: 'team', label: 'Команда' },
    { key: 'compare', label: 'Сравнительная аналитика' },
    { key: 'kpi', label: 'KPI территории' },
  ];

  // Пустое состояние — данные не загружены
  if (medReps.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Территория: {territory}
          </h2>
          <p className="text-gray-400 text-sm mt-0.5">Данные не загружены</p>
        </div>
        <div className="max-w-md">
          <WMDataUploadPanel />
        </div>
        <p className="text-sm text-gray-500">
          Загрузите файл МДЛП (CSV или Excel), чтобы увидеть данные по команде и территории.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Территория: {territory}
          </h2>
          <p className="text-gray-400 text-sm mt-0.5">{district} • {medReps.length} медпредставителей</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="wm-tab-bar flex gap-2 bg-white/5 backdrop-blur-md rounded-xl p-1 border border-white/10 w-fit">
        {tmTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-white/60 hover:text-white/80 hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (<>
      {/* === OVERVIEW TAB START === */}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Упаковки план', value: fmt(territoryTotals.totalPackagesPlan), pct: null },
          { label: 'Упаковки факт', value: fmt(territoryTotals.totalPackagesFact), pct: packagesCompletion },
          { label: 'Деньги план', value: fmtMoney(territoryTotals.totalMoneyPlan), pct: null },
          { label: 'Деньги факт', value: fmtMoney(territoryTotals.totalMoneyFact), pct: moneyCompletion },
        ].map(({ label, value, pct }) => (
          <div key={label} className={CARD + ' p-5'}>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-xl font-bold text-white truncate">{value}</p>
            {pct !== null && (
              <p className="text-xs mt-1 font-medium" style={{ color: completionColor(pct) }}>
                {pct.toFixed(1)}% выполнения
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Bar Chart */}
      <div className={CARD + ' p-6'}>
        <h3 className="text-sm font-medium text-gray-400 mb-4">Выполнение плана по медпредставителям</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} tick={{ fontSize: 11, fill: '#94a3b8' }} height={60} />
              <YAxis domain={[0, 'dataMax + 10']} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `${v}%`} />
              <Tooltip
                formatter={(v: number) => [`${v.toFixed(1)}%`, 'Выполнение']}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
                contentStyle={TT}
              />
              <ReferenceLine y={95} stroke="#10b981" strokeDasharray="5 5" label={{ value: '95%', position: 'right', fill: '#10b981', fontSize: 10 }} />
              <ReferenceLine y={85} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: '85%', position: 'right', fill: '#f59e0b', fontSize: 10 }} />
              <Bar dataKey="percent" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={completionColor(entry.percent)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div className={CARD}>
        <div className="px-6 py-4 border-b border-white/10">
          <h3 className="font-semibold text-white">Сравнение медпредставителей</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="w-8 px-3 py-3" />
                <th className="text-left px-4 py-3 text-cyan-400 font-medium text-xs">Имя</th>
                <th className="text-right px-4 py-3 text-cyan-400 font-medium text-xs">План (упак)</th>
                <th className="text-right px-4 py-3 text-cyan-400 font-medium text-xs">Факт (упак)</th>
                <th className="text-right px-4 py-3 text-cyan-400 font-medium text-xs">%</th>
                <th className="text-right px-4 py-3 text-cyan-400 font-medium text-xs">План (₽)</th>
                <th className="text-right px-4 py-3 text-cyan-400 font-medium text-xs">Факт (₽)</th>
                <th className="text-right px-4 py-3 text-cyan-400 font-medium text-xs">%</th>
                <th className="w-10 px-3 py-3 text-cyan-400 font-medium text-xs">Ст.</th>
              </tr>
            </thead>
            <tbody>
              {sortedMedReps.map((rep) => {
                const isExpanded = expandedRows.has(rep.id);
                const productSales = isExpanded ? getMedRepProductSales(rep) : [];
                return (
                  <React.Fragment key={rep.id}>
                    <tr
                      className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                      onClick={() => toggleRow(rep.id)}
                    >
                      <td className="px-3 py-3 text-gray-500 text-center">{isExpanded ? '▼' : '▶'}</td>
                      <td className="px-4 py-3 text-gray-200 font-medium">
                        {rep.name}{getMedal(rep.id)}
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

                    {isExpanded && (
                      <tr className="border-b border-white/5">
                        <td colSpan={9} className="p-0">
                          <div className="px-8 py-4 bg-white/3">
                            <p className="text-xs font-semibold text-cyan-400 mb-3">Детализация по продуктам</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
                                    <div
                                      className="h-full rounded-full transition-all duration-500"
                                      style={{ width: `${Math.min(product.completionPercent, 100)}%`, backgroundColor: completionColor(product.completionPercent) }}
                                    />
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
      {/* === OVERVIEW TAB END === */}
      </>)}

      {activeTab === 'team' && (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-white">Команда медпредставителей</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedMedReps.map((rep) => {
              const products = getMedRepProductSales(rep);
              return (
                <div key={rep.id} className={CARD + ' p-5'}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-white">{rep.name}</h4>
                    {getMedal(rep.id)}
                  </div>
                  <p className="text-xs text-gray-400 mb-3">{rep.territory}</p>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <p className="text-xs text-gray-500">Упаковки</p>
                      <p className="text-sm font-bold text-white">{fmt(rep.totalPackagesFact)} / {fmt(rep.totalPackagesPlan)}</p>
                      <p className="text-xs font-medium" style={{ color: completionColor(rep.packagesPercent) }}>
                        {rep.packagesPercent.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Выручка</p>
                      <p className="text-sm font-bold text-white">{fmtMoneyFull(rep.totalMoneyFact)}</p>
                      <p className="text-xs font-medium" style={{ color: completionColor(rep.moneyPercent) }}>
                        {rep.moneyPercent.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {products.slice(0, 3).map(p => (
                      <div key={p.productId} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                        <span className="text-xs text-gray-400 flex-1 truncate">{p.productName}</span>
                        <span className="text-xs text-white">{p.completionPercent.toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'compare' && (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-white">Сравнительная аналитика</h3>
          {/* Сравнение план/факт по продуктам */}
          <div className={CARD + ' p-6'}>
            <h4 className="text-sm font-medium text-gray-400 mb-4">План vs Факт по препаратам (упаковки)</h4>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(() => {
                  const aggProducts = aggregateTerritoryData(medReps);
                  const products = getMedRepProductSales(medReps[0] || {} as MedRepData);
                  return products.map(p => ({
                    name: p.productName.split(' ')[0],
                    fullName: p.productName,
                    plan: medReps.reduce((s, r) => {
                      const rp = getMedRepProductSales(r).find(x => x.productId === p.productId);
                      return s + (rp?.plan || 0);
                    }, 0),
                    fact: medReps.reduce((s, r) => {
                      const rp = getMedRepProductSales(r).find(x => x.productId === p.productId);
                      return s + (rp?.fact || 0);
                    }, 0),
                  }));
                })()} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} tick={{ fontSize: 10, fill: '#94a3b8' }} height={60} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={TT} formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="plan" fill="#3b82f6" radius={[4, 4, 0, 0]} name="План" />
                  <Bar dataKey="fact" fill="#10b981" radius={[4, 4, 0, 0]} name="Факт" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          {/* Таблица по медпредам */}
          <div className={CARD + ' p-6'}>
            <h4 className="text-sm font-medium text-gray-400 mb-4">Рейтинг медпредставителей</h4>
            <div className="space-y-3">
              {sortedMedReps.map((rep, i) => (
                <div key={rep.id} className="flex items-center gap-4">
                  <span className="text-white/60 w-6 text-right font-mono">{i + 1}.</span>
                  <span className="text-white flex-1">{rep.name}</span>
                  <div className="w-48 bg-white/10 rounded-full h-2">
                    <div className="h-2 rounded-full" style={{ width: `${Math.min(rep.packagesPercent, 100)}%`, backgroundColor: completionColor(rep.packagesPercent) }} />
                  </div>
                  <span className="text-white/80 w-16 text-right font-medium">{rep.packagesPercent.toFixed(1)}%</span>
                  {getMedal(rep.id)}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'kpi' && (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-white">KPI территории</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className={CARD + ' p-5'}>
              <p className="text-xs text-gray-500 mb-1">Выполнение плана (упак.)</p>
              <p className="text-3xl font-black text-white">{packagesCompletion.toFixed(1)}%</p>
              <div className="w-full bg-white/10 rounded-full h-2 mt-2">
                <div className="h-2 rounded-full" style={{ width: `${Math.min(packagesCompletion, 100)}%`, backgroundColor: completionColor(packagesCompletion) }} />
              </div>
            </div>
            <div className={CARD + ' p-5'}>
              <p className="text-xs text-gray-500 mb-1">Выполнение плана (₽)</p>
              <p className="text-3xl font-black text-white">{moneyCompletion.toFixed(1)}%</p>
              <div className="w-full bg-white/10 rounded-full h-2 mt-2">
                <div className="h-2 rounded-full" style={{ width: `${Math.min(moneyCompletion, 100)}%`, backgroundColor: completionColor(moneyCompletion) }} />
              </div>
            </div>
            <div className={CARD + ' p-5'}>
              <p className="text-xs text-gray-500 mb-1">Медпредов в плане (≥95%)</p>
              <p className="text-3xl font-black text-white">
                {sortedMedReps.filter(r => r.packagesPercent >= 95).length} / {sortedMedReps.length}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {(sortedMedReps.length > 0 ? (sortedMedReps.filter(r => r.packagesPercent >= 95).length / sortedMedReps.length) * 100 : 0).toFixed(0)}% команды
              </p>
            </div>
            <div className={CARD + ' p-5'}>
              <p className="text-xs text-gray-500 mb-1">Общий факт (упак.)</p>
              <p className="text-2xl font-bold text-white">{fmt(territoryTotals.totalPackagesFact)}</p>
              <p className="text-xs text-gray-400 mt-1">из {fmt(territoryTotals.totalPackagesPlan)} плана</p>
            </div>
            <div className={CARD + ' p-5'}>
              <p className="text-xs text-gray-500 mb-1">Общая выручка</p>
              <p className="text-2xl font-bold text-white">{fmtMoney(territoryTotals.totalMoneyFact)}</p>
              <p className="text-xs text-gray-400 mt-1">из {fmtMoney(territoryTotals.totalMoneyPlan)} плана</p>
            </div>
            <div className={CARD + ' p-5'}>
              <p className="text-xs text-gray-500 mb-1">Лучший медпред</p>
              <p className="text-lg font-bold text-white">{sortedMedReps[0]?.name || '—'}</p>
              <p className="text-xs font-medium" style={{ color: completionColor(sortedMedReps[0]?.packagesPercent || 0) }}>
                {(sortedMedReps[0]?.packagesPercent || 0).toFixed(1)}% выполнения
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TerritoryManagerDashboard;
