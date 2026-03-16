import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Upload, Database, BarChart3 } from 'lucide-react';
import { MedRepData, WMUserRole, WMFederalDistrict, WM_FEDERAL_DISTRICTS } from '@/types';
import {
  aggregateTerritoryData,
  calcCompletionPercent,
  aggregateProductSales,
  wmMockUsers
} from '@/data/wmRussiaData';
import { RegionalManagerDashboard } from './RegionalManagerDashboard';
import { WMRussiaFileUploader } from '../admin/WMRussiaFileUploader';
import { WMRussiaDataManagement } from '../admin/WMRussiaDataManagement';

interface AdminDashboardProps {
  allMedReps: MedRepData[];
  onRoleSwitch?: (role: WMUserRole, userId?: string) => void;
  mdlpUserId?: number;
}

interface DistrictData {
  code: WMFederalDistrict;
  name: string;
  fullName: string;
  totalPackagesPlan: number;
  totalPackagesFact: number;
  totalMoneyPlan: number;
  totalMoneyFact: number;
  medRepCount: number;
  packagesPercent: number;
  moneyPercent: number;
}

interface MedRepRanking {
  id: string;
  name: string;
  territory: string;
  district: WMFederalDistrict;
  packagesPercent: number;
  totalPackagesFact: number;
  totalPackagesPlan: number;
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

export function AdminDashboard({ allMedReps, onRoleSwitch, mdlpUserId }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedDistrict, setSelectedDistrict] = useState<WMFederalDistrict | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('admin');

  const russiaTotals = useMemo(() => aggregateTerritoryData(allMedReps), [allMedReps]);
  const packagesCompletion = calcCompletionPercent(russiaTotals.totalPackagesFact, russiaTotals.totalPackagesPlan);
  const moneyCompletion = calcCompletionPercent(russiaTotals.totalMoneyFact, russiaTotals.totalMoneyPlan);

  const districtData = useMemo((): DistrictData[] =>
    WM_FEDERAL_DISTRICTS.map(fd => {
      const reps = allMedReps.filter(r => r.district === fd.code);
      const totals = aggregateTerritoryData(reps);
      return {
        code: fd.code, name: fd.name, fullName: fd.fullName, ...totals,
        medRepCount: reps.length,
        packagesPercent: calcCompletionPercent(totals.totalPackagesFact, totals.totalPackagesPlan),
        moneyPercent: calcCompletionPercent(totals.totalMoneyFact, totals.totalMoneyPlan)
      };
    }),
  [allMedReps]);

  const productSalesData = useMemo(() => aggregateProductSales(allMedReps), [allMedReps]);

  const medRepRankings = useMemo((): MedRepRanking[] =>
    allMedReps.map(rep => ({
      id: rep.id, name: rep.name, territory: rep.territory, district: rep.district,
      packagesPercent: calcCompletionPercent(rep.totalPackagesFact, rep.totalPackagesPlan),
      totalPackagesFact: rep.totalPackagesFact,
      totalPackagesPlan: rep.totalPackagesPlan
    })).sort((a, b) => b.packagesPercent - a.packagesPercent),
  [allMedReps]);

  const top5Best = useMemo(() => medRepRankings.slice(0, 5), [medRepRankings]);
  const top5Worst = useMemo(() => [...medRepRankings].reverse().slice(0, 5), [medRepRankings]);

  const districtChartData = useMemo(() =>
    districtData.map(d => ({ name: d.code, percent: d.packagesPercent, medRepCount: d.medRepCount }))
      .sort((a, b) => b.percent - a.percent),
  [districtData]);

  const fmt = (v: number) => new Intl.NumberFormat('ru-RU').format(v);
  const fmtMoney = (v: number) =>
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(v);
  const fmtMoneyFull = (v: number) => v.toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' ₽';

  const handleRoleChange = (value: string) => {
    setSelectedRole(value);
    if (value === 'admin') { onRoleSwitch?.('admin'); }
    else {
      const user = wmMockUsers.find(u => u.id === value);
      if (user) onRoleSwitch?.(user.role, user.id);
    }
  };

  if (selectedDistrict) {
    const districtInfo = WM_FEDERAL_DISTRICTS.find(d => d.code === selectedDistrict);
    const districtMedReps = allMedReps.filter(r => r.district === selectedDistrict);
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedDistrict(null)}
          className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
        >
          ← Назад к обзору России
        </button>
        <RegionalManagerDashboard
          district={selectedDistrict}
          districtName={districtInfo?.fullName || selectedDistrict}
          medReps={districtMedReps}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white/5 border border-white/10 rounded-xl p-1 mb-6">
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400 rounded-lg flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />Дашборд
          </TabsTrigger>
          <TabsTrigger value="upload" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400 rounded-lg flex items-center gap-2">
            <Upload className="h-4 w-4" />Загрузка данных
          </TabsTrigger>
          <TabsTrigger value="management" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400 rounded-lg flex items-center gap-2">
            <Database className="h-4 w-4" />Управление данными
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-4">
          <WMRussiaFileUploader onDataLoaded={() => {}} userId={mdlpUserId?.toString()} />
        </TabsContent>

        <TabsContent value="management" className="mt-4">
          <WMRussiaDataManagement
            medReps={allMedReps}
            onMedRepAdd={() => {}} onMedRepEdit={() => {}} onMedRepDeactivate={() => {}}
            activityLog={[]} userId={mdlpUserId?.toString()}
          />
        </TabsContent>

        <TabsContent value="dashboard" className="mt-4">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  Панель директора — Россия
                </h2>
                <p className="text-gray-400 text-sm mt-0.5">8 федеральных округов • {allMedReps.length} медпредставителей</p>
              </div>
              <Select value={selectedRole} onValueChange={handleRoleChange}>
                <SelectTrigger className="w-[220px] bg-white/5 border-white/10 text-gray-300">
                  <SelectValue placeholder="Выберите роль" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  <SelectItem value="admin" className="text-gray-300">🔑 Директор (Админ)</SelectItem>
                  {wmMockUsers.filter(u => u.role === 'manager').map(user => (
                    <SelectItem key={user.id} value={user.id} className="text-gray-300">👔 {user.name} ({user.district})</SelectItem>
                  ))}
                  {wmMockUsers.filter(u => u.role === 'territory_manager').map(user => (
                    <SelectItem key={user.id} value={user.id} className="text-gray-300">📍 {user.name} ({user.territory})</SelectItem>
                  ))}
                  {wmMockUsers.filter(u => u.role === 'medrep').map(user => (
                    <SelectItem key={user.id} value={user.id} className="text-gray-300">💊 {user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: 'Упаковки план (Россия)', value: fmt(russiaTotals.totalPackagesPlan), pct: null },
                { label: 'Упаковки факт', value: fmt(russiaTotals.totalPackagesFact), pct: packagesCompletion },
                { label: 'Деньги план (Россия)', value: fmtMoney(russiaTotals.totalMoneyPlan), pct: null },
                { label: 'Деньги факт', value: fmtMoney(russiaTotals.totalMoneyFact), pct: moneyCompletion },
                { label: 'Всего МП', value: String(allMedReps.length), pct: null, sub: '8 округов' },
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

            {/* District Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
              {districtData.map(district => (
                <div
                  key={district.code}
                  className={`${CARD} p-5 cursor-pointer transition-all hover:bg-white/10 border-l-2`}
                  style={{ borderLeftColor: completionColor(district.packagesPercent) }}
                  onClick={() => setSelectedDistrict(district.code)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold text-white text-base">{district.code}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${completionBadge(district.packagesPercent)}`}>
                      {district.packagesPercent.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">{district.name}</p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Упаковки:</span>
                      <span className="text-gray-300">{fmt(district.totalPackagesFact)} / {fmt(district.totalPackagesPlan)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Деньги:</span>
                      <span className="text-gray-300"><span title={fmtMoneyFull(district.totalMoneyFact)}>{fmtMoney(district.totalMoneyFact)}</span></span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Медпредов:</span>
                      <span className="text-gray-300">{district.medRepCount}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mt-3">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(district.packagesPercent, 100)}%`, backgroundColor: completionColor(district.packagesPercent) }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Top/Bottom */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[
                { title: '🏆 Топ-5 лучших медпредставителей', reps: top5Best, header: 'bg-emerald-500/10', isTop: true },
                { title: '⚠️ Топ-5 отстающих медпредставителей', reps: top5Worst, header: 'bg-red-500/10', isTop: false },
              ].map(({ title, reps, header, isTop }) => (
                <div key={title} className={CARD}>
                  <div className={`px-6 py-4 border-b border-white/10 ${header}`}>
                    <h3 className="font-semibold text-white text-sm">{title}</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left px-4 py-3 text-cyan-400 font-medium text-xs w-8">#</th>
                          <th className="text-left px-4 py-3 text-cyan-400 font-medium text-xs">Имя</th>
                          <th className="text-left px-4 py-3 text-cyan-400 font-medium text-xs">Территория</th>
                          <th className="text-right px-4 py-3 text-cyan-400 font-medium text-xs">Выполнение</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reps.map((rep, idx) => (
                          <tr key={rep.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className={`px-4 py-3 font-bold ${isTop ? 'text-emerald-400' : 'text-red-400'}`}>
                              {isTop ? idx + 1 : allMedReps.length - idx}
                            </td>
                            <td className="px-4 py-3 text-gray-200 font-medium">{rep.name}</td>
                            <td className="px-4 py-3 text-gray-400 text-xs">{rep.territory} ({rep.district})</td>
                            <td className="text-right px-4 py-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${completionBadge(rep.packagesPercent)}`}>
                                {rep.packagesPercent.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>

            {/* Products */}
            <div className={CARD + ' p-6'}>
              <h3 className="font-semibold text-white mb-4">Выполнение по продуктам (вся Россия)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {productSalesData.map(product => (
                  <div key={product.productId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: product.color }} />
                        <span className="text-sm text-gray-300">{product.productName}</span>
                      </div>
                      <span className="text-sm font-bold" style={{ color: completionColor(product.completionPercent) }}>
                        {product.completionPercent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(product.completionPercent, 100)}%`, backgroundColor: product.color }} />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Факт: {fmt(product.fact)}</span>
                      <span>План: {fmt(product.plan)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* District Bar Chart + Table */}
            <div className={CARD + ' p-6'}>
              <h3 className="font-semibold text-white mb-4">Сравнение федеральных округов</h3>
              <div className="h-80 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={districtChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                    <YAxis domain={[0, 'dataMax + 10']} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `${v}%`} />
                    <Tooltip formatter={(v: number, n: string) => n === 'percent' ? [`${v.toFixed(1)}%`, 'Выполнение'] : [v, n]} contentStyle={TT} />
                    <ReferenceLine y={95} stroke="#10b981" strokeDasharray="5 5" label={{ value: '95%', position: 'right', fill: '#10b981', fontSize: 10 }} />
                    <ReferenceLine y={85} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: '85%', position: 'right', fill: '#f59e0b', fontSize: 10 }} />
                    <Bar dataKey="percent" radius={[4, 4, 0, 0]} onClick={(data) => setSelectedDistrict(data.name as WMFederalDistrict)} className="cursor-pointer">
                      {districtChartData.map((entry, i) => (
                        <Cell key={i} fill={completionColor(entry.percent)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left px-4 py-3 text-cyan-400 font-medium text-xs">Округ</th>
                      <th className="text-right px-4 py-3 text-cyan-400 font-medium text-xs">План (упак)</th>
                      <th className="text-right px-4 py-3 text-cyan-400 font-medium text-xs">Факт (упак)</th>
                      <th className="text-right px-4 py-3 text-cyan-400 font-medium text-xs">% упак</th>
                      <th className="text-right px-4 py-3 text-cyan-400 font-medium text-xs">План (₽)</th>
                      <th className="text-right px-4 py-3 text-cyan-400 font-medium text-xs">Факт (₽)</th>
                      <th className="text-right px-4 py-3 text-cyan-400 font-medium text-xs">% денег</th>
                      <th className="text-right px-4 py-3 text-cyan-400 font-medium text-xs">МП</th>
                    </tr>
                  </thead>
                  <tbody>
                    {districtData.map(district => (
                      <tr
                        key={district.code}
                        className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                        onClick={() => setSelectedDistrict(district.code)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: completionColor(district.packagesPercent) }} />
                            <span className="text-gray-200 font-medium">{district.code}</span>
                            <span className="text-gray-500 text-xs">({district.name})</span>
                          </div>
                        </td>
                        <td className="text-right px-4 py-3 text-gray-400">{fmt(district.totalPackagesPlan)}</td>
                        <td className="text-right px-4 py-3 text-white">{fmt(district.totalPackagesFact)}</td>
                        <td className="text-right px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${completionBadge(district.packagesPercent)}`}>
                            {district.packagesPercent.toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-right px-4 py-3 text-gray-400">
                          <span title={fmtMoneyFull(district.totalMoneyPlan)}>{fmtMoney(district.totalMoneyPlan)}</span>
                        </td>
                        <td className="text-right px-4 py-3 text-white">
                          <span title={fmtMoneyFull(district.totalMoneyFact)}>{fmtMoney(district.totalMoneyFact)}</span>
                        </td>
                        <td className="text-right px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${completionBadge(district.moneyPercent)}`}>
                            {district.moneyPercent.toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-right px-4 py-3 text-gray-300 font-medium">{district.medRepCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
