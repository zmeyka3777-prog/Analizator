// ==================== УПРАВЛЕНИЕ ТЕРРИТОРИЯМИ ====================

import React, { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { Button } from '@/app/components/ui/button';
import {
  MapPin,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  ChevronRight,
  ChevronDown,
  Building2,
  Users,
  Globe,
  Loader2,
} from 'lucide-react';

interface Territory {
  id: string;
  district_id: string;
  name: string;
  budget2025: number;
  budget2026: number;
}

interface District {
  id: string;
  name: string;
  short_name: string;
  color: string;
  icon: string;
  territories: Territory[];
}

export default function TerritoriesManagement() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedDistrict, setExpandedDistrict] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTerritory, setEditingTerritory] = useState<{ districtId: string; territoryId: string } | null>(null);
  const [editName, setEditName] = useState('');
  const [editBudget, setEditBudget] = useState('');
  const [showAddTerritory, setShowAddTerritory] = useState<string | null>(null);
  const [newTerritoryName, setNewTerritoryName] = useState('');
  const [newTerritoryBudget, setNewTerritoryBudget] = useState('');

  const loadDistricts = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getDistricts();
      setDistricts(response.districts.map((d: any) => ({
        id: d.id,
        name: d.name,
        short_name: d.short_name || d.id,
        color: d.color || '#6366f1',
        icon: d.icon || '🗺️',
        territories: (d.territories || []).map((t: any) => ({
          id: t.id,
          district_id: t.district_id,
          name: t.name,
          budget2025: Number(t.budget2025) || 0,
          budget2026: Number(t.budget2026) || 0,
        })),
      })));
    } catch (err) {
      console.error('[TerritoriesManagement] Ошибка загрузки:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDistricts(); }, []);

  const toggleDistrict = (id: string) => {
    setExpandedDistrict(prev => (prev === id ? null : id));
  };

  const startEditTerritory = (districtId: string, territory: Territory) => {
    setEditingTerritory({ districtId, territoryId: territory.id });
    setEditName(territory.name);
    setEditBudget(String(territory.budget2025));
  };

  const cancelEdit = () => {
    setEditingTerritory(null);
    setEditName('');
    setEditBudget('');
  };

  const saveEditTerritory = async () => {
    if (!editingTerritory) return;
    try {
      await adminApi.updateTerritory(editingTerritory.territoryId, {
        name: editName,
        budget2025: parseInt(editBudget, 10) || 0,
      });
      await loadDistricts();
    } catch (err) {
      console.error('[TerritoriesManagement] Ошибка сохранения территории:', err);
    }
    setEditingTerritory(null);
  };

  const removeTerritory = async (territoryId: string) => {
    try {
      await adminApi.deleteTerritory(territoryId);
      await loadDistricts();
    } catch (err) {
      console.error('[TerritoriesManagement] Ошибка удаления территории:', err);
    }
  };

  const addTerritory = async (districtId: string) => {
    if (!newTerritoryName.trim()) return;
    try {
      await adminApi.createTerritory({
        id: `${districtId}-${Date.now()}`,
        district_id: districtId,
        name: newTerritoryName.trim(),
        budget2025: parseInt(newTerritoryBudget, 10) || 0,
      });
      await loadDistricts();
    } catch (err) {
      console.error('[TerritoriesManagement] Ошибка добавления территории:', err);
    }
    setShowAddTerritory(null);
    setNewTerritoryName('');
    setNewTerritoryBudget('');
  };

  const filteredDistricts = districts.filter(d => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      d.name.toLowerCase().includes(query) ||
      d.short_name.toLowerCase().includes(query) ||
      d.territories.some(t => t.name.toLowerCase().includes(query))
    );
  });

  const totalTerritories = districts.reduce((sum, d) => sum + d.territories.length, 0);
  const totalBudget = districts.reduce(
    (sum, d) => sum + d.territories.reduce((s, t) => s + t.budget2025, 0),
    0
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(value);

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            Управление территориями
            {loading && <Loader2 className="w-4 h-4 text-cyan-500 animate-spin" />}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Федеральные округа, регионы и бюджеты
          </p>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-4 h-4 text-cyan-600" />
            <span className="text-xs text-slate-500">Федеральных округов</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{districts.length}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-violet-600" />
            <span className="text-xs text-slate-500">Территорий</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{totalTerritories}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-green-600" />
            <span className="text-xs text-slate-500">Общий бюджет 2025</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{formatCurrency(totalBudget)}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-amber-600" />
            <span className="text-xs text-slate-500">Всего округов в БД</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{districts.length}</p>
        </div>
      </div>

      {/* Поиск */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Поиск по округу или территории..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition-all"
        />
      </div>

      {/* Список округов */}
      <div className="space-y-3">
        {filteredDistricts.map(district => {
          const isExpanded = expandedDistrict === district.id;
          const districtBudget = district.territories.reduce((s, t) => s + t.budget2025, 0);

          return (
            <div
              key={district.id}
              className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 overflow-hidden"
            >
              {/* Заголовок округа */}
              <button
                onClick={() => toggleDistrict(district.id)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-lg"
                    style={{ backgroundColor: district.color }}
                  >
                    {district.short_name}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-slate-800">{district.name}</p>
                    <p className="text-xs text-slate-500">
                      {district.territories.length} территорий | {formatCurrency(districtBudget)}
                    </p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                )}
              </button>

              {/* Территории */}
              {isExpanded && (
                <div className="border-t border-slate-100">
                  <div className="divide-y divide-slate-50">
                    {district.territories
                      .filter(t =>
                        !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map(territory => (
                        <div
                          key={territory.id}
                          className="flex items-center justify-between px-6 py-3 pl-16 hover:bg-slate-50/30 transition-colors"
                        >
                          {editingTerritory?.districtId === district.id &&
                          editingTerritory?.territoryId === territory.id ? (
                            <div className="flex items-center gap-3 flex-1">
                              <input
                                type="text"
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                                className="flex-1 px-3 py-1.5 rounded-lg border border-cyan-300 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                                autoFocus
                              />
                              <input
                                type="number"
                                value={editBudget}
                                onChange={e => setEditBudget(e.target.value)}
                                className="w-32 px-3 py-1.5 rounded-lg border border-cyan-300 text-sm text-right focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                                placeholder="Бюджет"
                              />
                              <button onClick={saveEditTerritory} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={cancelEdit} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-3">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-sm text-slate-700">{territory.name}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-slate-600">
                                  {formatCurrency(territory.budget2025)}
                                </span>
                                <button
                                  onClick={() => startEditTerritory(district.id, territory)}
                                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => removeTerritory(territory.id)}
                                  className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                  </div>

                  {/* Добавление территории */}
                  {showAddTerritory === district.id ? (
                    <div className="px-6 py-3 pl-16 bg-cyan-50/30 border-t border-slate-100">
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          value={newTerritoryName}
                          onChange={e => setNewTerritoryName(e.target.value)}
                          placeholder="Название территории"
                          className="flex-1 px-3 py-1.5 rounded-lg border border-cyan-300 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                          autoFocus
                          onKeyDown={e => e.key === 'Enter' && addTerritory(district.id)}
                        />
                        <input
                          type="number"
                          value={newTerritoryBudget}
                          onChange={e => setNewTerritoryBudget(e.target.value)}
                          placeholder="Бюджет"
                          className="w-32 px-3 py-1.5 rounded-lg border border-cyan-300 text-sm text-right focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                          onKeyDown={e => e.key === 'Enter' && addTerritory(district.id)}
                        />
                        <button
                          onClick={() => addTerritory(district.id)}
                          disabled={!newTerritoryName.trim()}
                          className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 disabled:opacity-50"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setShowAddTerritory(null); setNewTerritoryName(''); setNewTerritoryBudget(''); }}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="px-6 py-3 pl-16 border-t border-slate-100">
                      <button
                        onClick={() => setShowAddTerritory(district.id)}
                        className="flex items-center gap-2 text-xs text-cyan-600 hover:text-cyan-700 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Добавить территорию
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredDistricts.length === 0 && !loading && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 px-6 py-12 text-center">
          <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">
            {searchQuery ? 'Территории не найдены' : 'Добавьте округа и территории через базу данных'}
          </p>
        </div>
      )}
    </div>
  );
}
