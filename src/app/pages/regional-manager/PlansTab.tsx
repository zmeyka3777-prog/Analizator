// ==================== ВКЛАДКА «ПЛАНЫ» ДЛЯ РЕГИОНАЛЬНОГО МЕНЕДЖЕРА ====================
// РМ заполняет план продаж по регионам своего округа (ПФО = 14 регионов),
// по 12 препаратам и по 12 месяцам. Источник правды — таблица
// world_medicine.regional_plans. Директор видит сумму всех РМ через
// /api/regional-plans (роль director получает все записи с JOIN на users).
//
// UI: матрица регионы × месяцы для выбранного препарата + Excel импорт/экспорт.

import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Calendar, Save, Loader2, AlertCircle, Check, Download, Upload, Trash2, RefreshCw,
} from 'lucide-react';
import { PRODUCTS, TERRITORIES } from '@/data/salesData';

const MONTHS_SHORT = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

interface PlanRow {
  region_name: string;
  product_id: string;
  month: number;
  plan_units: number;
}

interface ApiPlanRow extends PlanRow {
  id: number;
  user_id: number;
  year: number;
  created_at: string;
  updated_at: string;
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('wm_auth_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export function PlansTab() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedProduct, setSelectedProduct] = useState<string>(PRODUCTS[0]?.id || '');
  const [plansByKey, setPlansByKey] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());

  // Ключ для Map: region|product|month
  const key = (region: string, productId: string, month: number) =>
    `${region}|${productId}|${month}`;

  // Загрузка с сервера
  const loadPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/regional-plans?year=${year}`, { headers: authHeaders() });
      if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
      const data = await res.json();
      const map = new Map<string, number>();
      for (const row of data.plans as ApiPlanRow[]) {
        map.set(key(row.region_name, row.product_id, row.month), row.plan_units);
      }
      setPlansByKey(map);
      setDirtyKeys(new Set());
    } catch (err: any) {
      setError(err?.message || 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPlans(); /* eslint-disable-next-line */ }, [year]);

  const getValue = (region: string, month: number): number => {
    return plansByKey.get(key(region, selectedProduct, month)) || 0;
  };

  const setValue = (region: string, month: number, value: number) => {
    const k = key(region, selectedProduct, month);
    setPlansByKey(prev => {
      const next = new Map(prev);
      next.set(k, value);
      return next;
    });
    setDirtyKeys(prev => new Set(prev).add(k));
  };

  // Сохранить все изменённые ячейки
  const handleSave = async () => {
    if (dirtyKeys.size === 0) {
      setSuccess('Изменений нет');
      setTimeout(() => setSuccess(null), 2000);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const plans: PlanRow[] = [];
      for (const k of dirtyKeys) {
        const [region_name, product_id, monthStr] = k.split('|');
        plans.push({
          region_name,
          product_id,
          month: Number(monthStr),
          plan_units: plansByKey.get(k) || 0,
        });
      }
      const res = await fetch('/api/regional-plans/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ year, plans }),
      });
      if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
      const result = await res.json();
      setSuccess(`Сохранено: ${result.total} (новых: ${result.inserted}, обновлено: ${result.updated})`);
      setDirtyKeys(new Set());
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  // Очистить все планы за год
  const handleDeleteAll = async () => {
    if (!confirm(`Удалить ВСЕ планы за ${year} год? Это действие нельзя отменить.`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/regional-plans?year=${year}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
      const result = await res.json();
      setSuccess(`Удалено ${result.deleted} записей`);
      await loadPlans();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Ошибка удаления');
    } finally {
      setSaving(false);
    }
  };

  // Скачать шаблон Excel: 14 регионов × 12 препаратов × 12 месяцев
  const handleDownloadTemplate = () => {
    // Один лист на препарат: строки = регионы, колонки = месяцы
    const wb = XLSX.utils.book_new();
    for (const product of PRODUCTS) {
      const data: (string | number)[][] = [];
      data.push(['Регион', ...MONTHS_SHORT]);
      for (const region of TERRITORIES) {
        const row: (string | number)[] = [region];
        for (let m = 1; m <= 12; m++) {
          row.push(getValue(region, m));
        }
        data.push(row);
      }
      const sheet = XLSX.utils.aoa_to_sheet(data);
      // Безопасное имя листа (макс 31 символ)
      const sheetName = (product.shortName || product.id).slice(0, 31);
      XLSX.utils.book_append_sheet(wb, sheet, sheetName);
    }
    const filename = `Планы_${year}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // Загрузить заполненный Excel
  const handleUploadExcel = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const newMap = new Map(plansByKey);
      const newDirty = new Set(dirtyKeys);

      for (const sheetName of wb.SheetNames) {
        // Найти препарат по shortName или id
        const product = PRODUCTS.find(p =>
          (p.shortName || '').slice(0, 31) === sheetName ||
          p.id === sheetName ||
          p.id.slice(0, 31) === sheetName
        );
        if (!product) continue;

        const sheet = wb.Sheets[sheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: 0 });
        // Первая строка — заголовок, дальше — регионы
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const regionName = String(row[0] || '').trim();
          if (!regionName) continue;
          if (!TERRITORIES.includes(regionName)) continue;
          for (let m = 1; m <= 12; m++) {
            const val = Number(row[m]) || 0;
            const k = key(regionName, product.id, m);
            const oldVal = newMap.get(k) || 0;
            if (val !== oldVal) {
              newMap.set(k, val);
              newDirty.add(k);
            }
          }
        }
      }

      setPlansByKey(newMap);
      setDirtyKeys(newDirty);
      setSuccess(`Загружено из Excel. Изменений: ${newDirty.size}. Нажмите «Сохранить».`);
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err?.message || 'Ошибка чтения Excel');
    } finally {
      setLoading(false);
    }
  };

  const totalByRegion = useMemo(() => {
    const map = new Map<string, number>();
    for (const region of TERRITORIES) {
      let sum = 0;
      for (let m = 1; m <= 12; m++) sum += getValue(region, m);
      map.set(region, sum);
    }
    return map;
  }, [plansByKey, selectedProduct]);

  const grandTotal = useMemo(
    () => Array.from(totalByRegion.values()).reduce((a, b) => a + b, 0),
    [totalByRegion]
  );

  return (
    <div className="space-y-4">
      {/* Шапка */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Планы на год</h2>
          <p className="text-sm text-white/60 mt-0.5">
            Планирование продаж по 14 регионам ПФО × 12 препаратов × 12 месяцев.
            Сохраняется в БД, директор видит сводно.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="px-3 py-2 rounded-xl bg-white/10 backdrop-blur border border-white/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            {[2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y} год</option>)}
          </select>
          <button
            onClick={loadPlans}
            disabled={loading}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20"
            title="Обновить"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Сообщения */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="text-sm">{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl p-3 flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span className="text-sm">{success}</span>
        </div>
      )}

      {/* Кнопки действий */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handleSave}
          disabled={saving || dirtyKeys.size === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-sm font-semibold disabled:opacity-50 transition-all"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Сохранить{dirtyKeys.size > 0 ? ` (${dirtyKeys.size})` : ''}
        </button>

        <button
          onClick={handleDownloadTemplate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm border border-white/20"
          title="Скачать шаблон Excel: один лист на каждый из 12 препаратов, регионы × месяцы"
        >
          <Download className="w-4 h-4" />
          Скачать Excel
        </button>

        <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm border border-white/20 cursor-pointer">
          <Upload className="w-4 h-4" />
          Загрузить Excel
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) handleUploadExcel(f);
              e.target.value = '';
            }}
          />
        </label>

        <button
          onClick={handleDeleteAll}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 text-sm border border-red-500/30 ml-auto"
        >
          <Trash2 className="w-4 h-4" />
          Очистить год
        </button>
      </div>

      {/* Селектор препарата */}
      <div className="flex items-center gap-2 flex-wrap p-3 rounded-xl bg-white/5 border border-white/10">
        {PRODUCTS.map(p => (
          <button
            key={p.id}
            onClick={() => setSelectedProduct(p.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              selectedProduct === p.id
                ? 'bg-cyan-500 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
            title={p.name}
          >
            {p.shortName || p.id}
          </button>
        ))}
      </div>

      {/* Таблица регионы × месяцы */}
      <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-white/70 sticky left-0 bg-slate-900 z-10">
                  Регион
                </th>
                {MONTHS_SHORT.map((m, i) => (
                  <th key={i} className="px-2 py-2 text-center text-xs font-semibold text-white/70 min-w-[70px]">
                    {m}
                  </th>
                ))}
                <th className="px-3 py-2 text-right text-xs font-semibold text-cyan-300 bg-white/5">
                  Итого
                </th>
              </tr>
            </thead>
            <tbody>
              {TERRITORIES.map(region => (
                <tr key={region} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-3 py-1.5 text-white text-sm sticky left-0 bg-slate-900 z-10 font-medium whitespace-nowrap">
                    {region}
                  </td>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                    const k = key(region, selectedProduct, m);
                    const isDirty = dirtyKeys.has(k);
                    return (
                      <td key={m} className="px-1 py-1">
                        <input
                          type="number"
                          min={0}
                          value={getValue(region, m) || ''}
                          onChange={e => setValue(region, m, Number(e.target.value) || 0)}
                          placeholder="0"
                          className={`w-full px-2 py-1 text-right rounded-md text-white text-xs bg-transparent border focus:outline-none focus:ring-1 transition-colors ${
                            isDirty
                              ? 'border-amber-400 bg-amber-500/10 focus:ring-amber-400'
                              : 'border-white/10 hover:border-white/30 focus:ring-cyan-400'
                          }`}
                        />
                      </td>
                    );
                  })}
                  <td className="px-3 py-1.5 text-right text-cyan-300 font-semibold bg-white/5 whitespace-nowrap">
                    {(totalByRegion.get(region) || 0).toLocaleString('ru-RU')}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-t border-white/10">
              <tr>
                <td className="px-3 py-2 text-white font-bold sticky left-0 bg-slate-900">ИТОГО:</td>
                <td colSpan={12} className="px-3 py-2 text-right text-white/60 text-xs">
                  План по препарату <span className="font-semibold text-white">{PRODUCTS.find(p => p.id === selectedProduct)?.shortName || selectedProduct}</span> за {year} год
                </td>
                <td className="px-3 py-2 text-right text-cyan-300 font-bold text-base bg-cyan-500/10">
                  {grandTotal.toLocaleString('ru-RU')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <p className="text-xs text-white/40">
        💡 Подсказка: введите план в упаковках для каждого региона и месяца.
        Жёлтый бордюр — несохранённые изменения. После клика «Сохранить» данные уйдут в БД и
        директор увидит их у себя в калькуляторе бюджета.
      </p>
    </div>
  );
}
