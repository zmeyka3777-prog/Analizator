import { useEffect, useState } from 'react';

// Единый источник планов РМ — таблица world_medicine.regional_plans.
// GET /api/regional-plans?year=YYYY возвращает { year, plans: [...] }.
//   - manager (РМ): свои планы; director/admin: все; medrep/TM: 403.
// Медпред/ТМ (403) → пустой массив: у них нет источника плана, показываем
// «план не задан», а не выдумываем.

export interface RegionalPlanRow {
  id: number;
  user_id: number;
  year: number;
  region_name: string;
  product_id: string; // = PRODUCTS[].id из salesData (cocarnit, artoxan-lyof, ...)
  month: number;      // 1-12
  plan_units: number; // план в упаковках
  user_name?: string;
  user_email?: string;
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('wm_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Загружает планы РМ за год. `dep` (например wmRussiaData) в зависимостях —
 * чтобы перезагрузить после смены пользователя/данных.
 */
export function useRegionalPlans(year: number, dep?: unknown): RegionalPlanRow[] {
  const [plans, setPlans] = useState<RegionalPlanRow[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/regional-plans?year=${year}`, { headers: authHeaders() });
        if (!res.ok) { if (!cancelled) setPlans([]); return; }
        const data = await res.json();
        if (!cancelled) setPlans(Array.isArray(data?.plans) ? data.plans : []);
      } catch {
        if (!cancelled) setPlans([]);
      }
    })();
    return () => { cancelled = true; };
  }, [year, dep]);
  return plans;
}

/** Сумма планов (упаковки) с учётом фильтра месяцев ([] = все месяцы). */
export function sumPlanUnits(rows: RegionalPlanRow[], selectedMonths: number[]): number {
  const s = selectedMonths.length ? new Set(selectedMonths) : null;
  return rows.reduce((sum, p) => (!s || s.has(p.month)) ? sum + (p.plan_units || 0) : sum, 0);
}
