import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { EMPLOYEES, Employee, getSubordinates, getEmployeeById } from '@/data/employees';
import { getSalesData } from '@/data/salesData';
import { MPDetailModal } from '@/app/components/MPDetailModal';
import { EditEmployeeModal } from '@/app/components/EditEmployeeModal';
import { AddEmployeeModal } from '@/app/components/AddEmployeeModal';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

export function EmployeesTabNew() {
  // Текущий РМ (первый regional_manager из ПФО)
  const currentRM = useMemo(
    () => EMPLOYEES.find(e => e.role === 'regional_manager' && e.territory === 'Приволжский ФО'),
    [],
  );

  // Подчинённые ТМ
  const subordinateTMs = useMemo(
    () => (currentRM ? getSubordinates(currentRM.id) : []),
    [currentRM],
  );

  // Все МП под всеми ТМ
  const allMPs = useMemo(
    () => subordinateTMs.flatMap(tm => getSubordinates(tm.id)),
    [subordinateTMs],
  );

  const year = 2025;

  const [expandedTM, setExpandedTM] = useState<string | null>(null);
  const [selectedMP, setSelectedMP] = useState<Employee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // KPI
  const totalEmployees = subordinateTMs.length + allMPs.length;
  const tmCount = subordinateTMs.length;
  const mpCount = allMPs.length;

  // Роли для pie chart
  const roleData = [
    { name: 'ТМ', value: tmCount, color: '#3b82f6' },
    { name: 'МП', value: mpCount, color: '#10b981' },
  ];

  // Статус сотрудников
  const activeCount = [...subordinateTMs, ...allMPs].filter(e => e.status === 'active').length;
  const statusData = [
    { name: 'Активные', value: activeCount, color: '#10b981' },
    { name: 'Неактивные', value: totalEmployees - activeCount, color: '#ef4444' },
  ];

  // Рассчитать KPI для МП: план-факт
  const getMPStats = (mp: Employee) => {
    const salesData = getSalesData({ territory: mp.territory, year });
    const totalFact = salesData.reduce((s, d) => s + d.units, 0);
    // Делим факт пропорционально между МП на территории
    const mpsOnTerritory = allMPs.filter(m => m.territory === mp.territory).length || 1;
    const mpFact = Math.round(totalFact / mpsOnTerritory);
    const mpPlan = Object.values(mp.productPlans).reduce((s, v) => s + v, 0) || Math.round(mpFact * 1.1);
    const pct = mpPlan > 0 ? Math.round((mpFact / mpPlan) * 100) : 0;
    return { fact: mpFact, plan: mpPlan, pct };
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="wm-card bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20">
          <p className="text-white/60 text-sm">Всего сотрудников</p>
          <p className="text-2xl font-bold text-white mt-1">{totalEmployees}</p>
        </div>
        <div className="wm-card bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20">
          <p className="text-white/60 text-sm">Территориальных менеджеров</p>
          <p className="text-2xl font-bold text-white mt-1">{tmCount}</p>
        </div>
        <div className="wm-card bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20">
          <p className="text-white/60 text-sm">Медицинских представителей</p>
          <p className="text-2xl font-bold text-white mt-1">{mpCount}</p>
        </div>
        <div className="wm-card bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20">
          <p className="text-white/60 text-sm">Активных</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{activeCount} / {totalEmployees}</p>
        </div>
      </div>

      {/* Pie charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="wm-card bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4">Структура по ролям</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={roleData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                {roleData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="wm-card bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4">Статус сотрудников</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                {statusData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Add employee button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-all text-sm font-medium"
        >
          + Добавить сотрудника
        </button>
      </div>

      {/* TM/MP Accordion */}
      <div className="space-y-3">
        {subordinateTMs.map(tm => {
          const tmMPs = getSubordinates(tm.id);
          const isExpanded = expandedTM === tm.id;

          return (
            <div key={tm.id} className="wm-card bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden">
              {/* TM Header */}
              <button
                onClick={() => setExpandedTM(prev => (prev === tm.id ? null : tm.id))}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
                    {tm.firstName[0]}{tm.lastName[0]}
                  </div>
                  <div className="text-left">
                    <p className="text-white font-medium">{tm.lastName} {tm.firstName} {tm.middleName || ''}</p>
                    <p className="text-white/50 text-xs">ТМ - {tm.territory} | {tmMPs.length} МП</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingEmployee(tm); }}
                    className="text-white/40 hover:text-white/80 text-xs px-2 py-1 rounded border border-white/10 hover:border-white/30 transition-all"
                  >
                    Ред.
                  </button>
                  <svg className={`w-5 h-5 text-white/40 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* MP List */}
              {isExpanded && (
                <div className="border-t border-white/10">
                  {tmMPs.length === 0 ? (
                    <p className="text-white/40 text-sm p-4">Нет подчинённых МП</p>
                  ) : (
                    tmMPs.map(mp => {
                      const stats = getMPStats(mp);
                      return (
                        <div
                          key={mp.id}
                          className="flex items-center justify-between p-4 border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs">
                              {mp.firstName[0]}{mp.lastName[0]}
                            </div>
                            <div>
                              <p className="text-white text-sm">{mp.lastName} {mp.firstName}</p>
                              <p className="text-white/40 text-xs">{mp.territory}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className={`text-sm font-medium ${stats.pct >= 90 ? 'text-emerald-400' : stats.pct >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>
                                {stats.pct}%
                              </p>
                              <p className="text-white/40 text-xs">{stats.fact.toLocaleString('ru-RU')} / {stats.plan.toLocaleString('ru-RU')}</p>
                            </div>
                            <button
                              onClick={() => setSelectedMP(mp)}
                              className="text-blue-400 hover:text-blue-300 text-xs px-2 py-1 rounded border border-blue-500/20 hover:border-blue-500/40 transition-all"
                            >
                              Детали
                            </button>
                            <button
                              onClick={() => setEditingEmployee(mp)}
                              className="text-white/40 hover:text-white/80 text-xs px-2 py-1 rounded border border-white/10 hover:border-white/30 transition-all"
                            >
                              Ред.
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modals */}
      {selectedMP && (
        <MPDetailModal
          employee={selectedMP}
          onClose={() => setSelectedMP(null)}
        />
      )}
      {editingEmployee && (
        <EditEmployeeModal
          employee={editingEmployee}
          onClose={() => setEditingEmployee(null)}
          onSave={(updated) => {
            // TODO: persist to backend
            setEditingEmployee(null);
          }}
        />
      )}
      {showAddModal && (
        <AddEmployeeModal
          onClose={() => setShowAddModal(false)}
          onSave={(newEmployee) => {
            // TODO: persist to backend
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}
