import { Router, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { pool, getCircuitState, recordDbFailure, recordDbSuccess, safeQuery } from "./db";
import { normalizeRegionForComparison } from "./utils/normalizeRegion";

interface AuthRequest extends Request {
  userId?: number;
  userRole?: string;
}

function hasActiveFilters(filters: any): boolean {
  return (
    (filters.selectedDisposalTypes?.length || 0) > 0 ||
    (filters.selectedRegions?.length || 0) > 0 ||
    (filters.selectedDrugs?.length || 0) > 0 ||
    (filters.selectedFederalDistricts?.length || 0) > 0 ||
    (filters.selectedContractorGroups?.length || 0) > 0 ||
    !!filters.selectedMonth
  );
}

async function loadCompactRowsIfNeeded(userId: number, filters: any): Promise<{ rows: any[] | null; contragentRows: any[] | null }> {
  if (!hasActiveFilters(filters)) {
    return { rows: null, contragentRows: null };
  }

  const cached = compactRowsCache.get(userId);
  if (cached && (Date.now() - cached.timestamp) < COMPACT_CACHE_TTL_MS) {
    console.log(`[Filter] compact rows CACHE HIT for userId=${userId}: ${cached.rows.length} rows, ${cached.contragentRows.length} contragent rows`);
    return { rows: cached.rows, contragentRows: cached.contragentRows };
  }

  const t0 = Date.now();
  console.log(`[Filter] loading compact rows for userId=${userId} (filters active)`);
  const sql = `SELECT data_type, aggregated_data FROM world_medicine.yearly_sales_data WHERE user_id = $1 AND year = 9999 AND data_type LIKE 'compactRows%' ORDER BY data_type`;
  const result = await safeQuery(sql, [userId]);
  if (result.rows.length === 0) {
    console.log(`[Filter] no compact rows found (${Date.now() - t0}ms)`);
    return { rows: null, contragentRows: null };
  }

  let allRows: any[] = [];
  let allContra: any[] = [];
  if (result.rows.length === 1 && result.rows[0].data_type === 'compactRows') {
    const data = result.rows[0].aggregated_data;
    allRows = data.rows || [];
    allContra = data.contragentRows || [];
  } else {
    for (const rec of result.rows) {
      const d = rec.aggregated_data;
      if (d.rows) allRows = allRows.concat(d.rows);
      if (d.contragentRows) allContra = allContra.concat(d.contragentRows);
    }
  }
  console.log(`[Filter] compact rows loaded: ${allRows.length} rows, ${allContra.length} contragent rows (${Date.now() - t0}ms)`);

  compactRowsCache.set(userId, { rows: allRows, contragentRows: allContra, timestamp: Date.now() });
  console.log(`[Filter] compact rows CACHED for userId=${userId}`);

  return { rows: allRows, contragentRows: allContra };
}

type AggYear = { year: number; aggregatedData: any; dataType?: string };

interface AggCacheEntry {
  data: { merged: any; perYearData: Map<string, any> };
  timestamp: number;
}

const aggDataCache = new Map<number, AggCacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CompactRowsCacheEntry {
  rows: any[];
  contragentRows: any[];
  timestamp: number;
}
const compactRowsCache = new Map<number, CompactRowsCacheEntry>();
const COMPACT_CACHE_TTL_MS = 3 * 60 * 1000;

export function invalidateUserCache(userId: number) {
  aggDataCache.delete(userId);
  compactRowsCache.delete(userId);
  console.log(`[Cache] Кэш пользователя ${userId} инвалидирован`);
}

export function invalidateAllCache() {
  aggDataCache.clear();
  compactRowsCache.clear();
  console.log(`[Cache] Весь кэш очищен`);
}

function mergeYearlyData(yearlyData: AggYear[]): any | null {
  if (yearlyData.length === 0) return null;

  const monthlyByMonth = new Map<string, any>();
  const combinedByMonth = new Map<string, any>();
  const contragentMap = new Map<string, any>();
  const drugMap = new Map<string, number>();
  const regionMap = new Map<string, number>();
  const disposalMap = new Map<string, { sales: number; count: number }>();
  const fdMap = new Map<string, number>();
  const receiverMap = new Map<string, { sales: number; count: number }>();
  let drugs: string[] = [];
  let drugAnalytics: Record<string, any> = {};
  let territoryHierarchy: any = { federalDistricts: {}, regions: {}, cities: {}, districts: {} };
  let contragentAnalytics: Record<string, any> = {};
  const allYears: string[] = [];

  for (const yd of yearlyData) {
    const data = yd.aggregatedData;
    const year = yd.year.toString();
    if (!allYears.includes(year)) allYears.push(year);

    if (data.monthlySales) {
      for (const m of data.monthlySales) {
        const key = m.month;
        if (!monthlyByMonth.has(key)) {
          monthlyByMonth.set(key, { month: m.month, name: m.name, sales: 0 });
        }
        monthlyByMonth.get(key).sales += m.sales || 0;
      }
    }

    if (data.combinedData) {
      for (const c of data.combinedData) {
        const key = c.month;
        if (!combinedByMonth.has(key)) {
          combinedByMonth.set(key, { month: c.month, name: c.name });
        }
        const existing = combinedByMonth.get(key);
        const yearKeys = Object.keys(c).filter(k => /^\d{4}$/.test(k));
        for (const yk of yearKeys) {
          const val = c[yk];
          if (val !== undefined && val !== null) {
            existing[yk] = (existing[yk] || 0) + val;
          }
        }
        const forecastKeys = Object.keys(c).filter(k => /^forecast\d{4}$/.test(k));
        for (const fk of forecastKeys) {
          if (c[fk]) {
            existing[fk] = c[fk];
          }
        }
      }
    }

    if (data.contragentSales) {
      for (const cs of data.contragentSales) {
        if (!contragentMap.has(cs.name)) {
          contragentMap.set(cs.name, { ...cs });
        } else {
          contragentMap.get(cs.name).sales = (contragentMap.get(cs.name).sales || 0) + (cs.sales || 0);
        }
      }
    }

    if (data.drugSales) {
      for (const d of data.drugSales) {
        drugMap.set(d.name, (drugMap.get(d.name) || 0) + (d.sales || 0));
      }
    }
    if (data.regionSales) {
      for (const r of data.regionSales) {
        regionMap.set(r.name, (regionMap.get(r.name) || 0) + (r.sales || 0));
      }
    }
    if (data.disposalTypeSales) {
      for (const d of data.disposalTypeSales) {
        const ex = disposalMap.get(d.name) || { sales: 0, count: 0 };
        ex.sales += d.sales || 0;
        ex.count += d.count || 0;
        disposalMap.set(d.name, ex);
      }
    }
    if (data.federalDistrictSales) {
      for (const f of data.federalDistrictSales) {
        fdMap.set(f.name, (fdMap.get(f.name) || 0) + (f.sales || 0));
      }
    }
    if (data.receiverTypeSales) {
      for (const r of data.receiverTypeSales) {
        const ex = receiverMap.get(r.name) || { sales: 0, count: 0 };
        ex.sales += r.sales || 0;
        ex.count += r.count || 0;
        receiverMap.set(r.name, ex);
      }
    }
    if (data.drugs?.length) drugs = [...new Set([...drugs, ...data.drugs])];
    if (data.drugAnalytics) drugAnalytics = { ...drugAnalytics, ...data.drugAnalytics };
    if (data.territoryHierarchy) {
      const th = data.territoryHierarchy;
      if (th.federalDistricts) {
        for (const [fdName, fdData] of Object.entries(th.federalDistricts) as [string, any][]) {
          if (!territoryHierarchy.federalDistricts[fdName]) {
            territoryHierarchy.federalDistricts[fdName] = { sales: 0, contragentCount: 0, drugSales: [] };
          }
          const existing = territoryHierarchy.federalDistricts[fdName];
          existing.sales = (existing.sales || 0) + (fdData.sales || 0);
          existing.contragentCount = (existing.contragentCount || 0) + (fdData.contragentCount || 0);
          if (fdData.drugSales) {
            const drugMap = new Map<string, number>();
            (existing.drugSales || []).forEach((d: any) => drugMap.set(d.name, d.sales || 0));
            fdData.drugSales.forEach((d: any) => drugMap.set(d.name, (drugMap.get(d.name) || 0) + (d.sales || 0)));
            existing.drugSales = Array.from(drugMap.entries()).map(([name, sales]) => ({ name, sales }));
          }
        }
      }
      if (th.regions) {
        for (const [rName, rData] of Object.entries(th.regions) as [string, any][]) {
          if (!territoryHierarchy.regions[rName]) {
            territoryHierarchy.regions[rName] = { sales: 0, contragentCount: 0, drugSales: [], children: {} };
          }
          const existing = territoryHierarchy.regions[rName];
          existing.sales = (existing.sales || 0) + (rData.sales || 0);
          existing.contragentCount = (existing.contragentCount || 0) + (rData.contragentCount || 0);
          if (rData.drugSales) {
            const drugMap = new Map<string, number>();
            (existing.drugSales || []).forEach((d: any) => drugMap.set(d.name, d.sales || 0));
            rData.drugSales.forEach((d: any) => drugMap.set(d.name, (drugMap.get(d.name) || 0) + (d.sales || 0)));
            existing.drugSales = Array.from(drugMap.entries()).map(([name, sales]) => ({ name, sales }));
          }
          if (rData.children) {
            if (!existing.children) existing.children = {};
            for (const [cName, cData] of Object.entries(rData.children) as [string, any][]) {
              if (!existing.children[cName]) {
                existing.children[cName] = { sales: 0, contragentCount: 0, drugSales: [], children: {} };
              }
              existing.children[cName].sales = (existing.children[cName].sales || 0) + (cData.sales || 0);
              existing.children[cName].contragentCount = (existing.children[cName].contragentCount || 0) + (cData.contragentCount || 0);
            }
          }
        }
      }
    }
    if (data.contragentAnalytics) contragentAnalytics = { ...contragentAnalytics, ...data.contragentAnalytics };
  }

  const combinedData = Array.from(combinedByMonth.values());

  return {
    monthlySales: Array.from(monthlyByMonth.values()),
    combinedData,
    contragentSales: Array.from(contragentMap.values()),
    drugSales: Array.from(drugMap.entries()).map(([name, sales]) => ({ name, sales })).sort((a, b) => b.sales - a.sales),
    regionSales: Array.from(regionMap.entries()).map(([name, sales]) => ({ name, sales })).sort((a, b) => b.sales - a.sales),
    disposalTypeSales: Array.from(disposalMap.entries()).map(([name, d]) => ({ name, sales: d.sales, count: d.count })),
    federalDistrictSales: Array.from(fdMap.entries()).map(([name, sales]) => ({ name, sales })),
    receiverTypeSales: Array.from(receiverMap.entries()).map(([name, d]) => ({ name, sales: d.sales, count: d.count })),
    drugs,
    drugAnalytics,
    territoryHierarchy,
    contragentAnalytics,
    years: allYears.sort(),
  };
}

const FD_REGION_KEYWORDS: Record<string, string[]> = {
  'Центральный': ['Белгородская', 'Брянская', 'Владимирская', 'Воронежская', 'Ивановская', 'Калужская', 'Костромская', 'Курская', 'Липецкая', 'Московская', 'Орловская', 'Рязанская', 'Смоленская', 'Тамбовская', 'Тверская', 'Тульская', 'Ярославская', 'Москва'],
  'Северо-Западный': ['Карелия', 'Коми', 'Архангельская', 'Вологодская', 'Калининградская', 'Ленинградская', 'Мурманская', 'Новгородская', 'Псковская', 'Санкт-Петербург', 'Ненецкий'],
  'Южный': ['Адыгея', 'Калмыкия', 'Крым', 'Краснодарский', 'Астраханская', 'Волгоградская', 'Ростовская', 'Севастополь'],
  'Северо-Кавказский': ['Дагестан', 'Ингушетия', 'Кабардино-Балкарская', 'Карачаево-Черкесская', 'Северная Осетия', 'Чеченская', 'Ставропольский'],
  'Приволжский': ['Башкортостан', 'Марий Эл', 'Мордовия', 'Татарстан', 'Удмуртская', 'Чувашская', 'Пермский', 'Кировская', 'Нижегородская', 'Оренбургская', 'Пензенская', 'Самарская', 'Саратовская', 'Ульяновская'],
  'Уральский': ['Курганская', 'Свердловская', 'Тюменская', 'Челябинская', 'Ханты-Мансийский', 'Ямало-Ненецкий'],
  'Сибирский': ['Алтай', 'Бурятия', 'Тыва', 'Хакасия', 'Алтайский', 'Забайкальский', 'Красноярский', 'Иркутская', 'Кемеровская', 'Новосибирская', 'Омская', 'Томская'],
  'Дальневосточный': ['Саха', 'Камчатский', 'Приморский', 'Хабаровский', 'Амурская', 'Магаданская', 'Сахалинская', 'Еврейская', 'Чукотский'],
};

function matchRegionToFD(regionName: string, fdNames: string[]): string | null {
  for (const fdName of fdNames) {
    for (const [fdBase, keywords] of Object.entries(FD_REGION_KEYWORDS)) {
      if (fdName.includes(fdBase)) {
        for (const kw of keywords) {
          if (regionName.includes(kw)) return fdName;
        }
      }
    }
  }
  for (const [fdBase, keywords] of Object.entries(FD_REGION_KEYWORDS)) {
    for (const kw of keywords) {
      if (regionName.includes(kw)) {
        const match = fdNames.find(fn => fn.includes(fdBase));
        if (match) return match;
      }
    }
  }
  return null;
}

export function enrichTerritoryHierarchy(yearData: any): void {
  if (!yearData?.territoryHierarchy) return;
  const th = yearData.territoryHierarchy;
  const drugAnalytics = yearData.drugAnalytics || {};
  const contragentSales = yearData.contragentSales || [];

  const fdHasEmptyDrugs = Object.values(th.federalDistricts || {}).every((fd: any) => !fd.drugSales || fd.drugSales.length === 0);
  const regHasEmptyDrugs = Object.values(th.regions || {}).every((r: any) => !r.drugSales || r.drugSales.length === 0);
  const regHasEmptyChildren = Object.values(th.regions || {}).every((r: any) => !r.children || Object.keys(r.children).length === 0);

  const fdHasEmptyContragents = Object.values(th.federalDistricts || {}).every((fd: any) => !fd.contragentCount || fd.contragentCount === 0);
  const regHasEmptyContragents = Object.values(th.regions || {}).every((r: any) => !r.contragentCount || r.contragentCount === 0);
  if (!fdHasEmptyDrugs && !regHasEmptyDrugs && !regHasEmptyChildren && !fdHasEmptyContragents && !regHasEmptyContragents) return;

  const fdNames = Object.keys(th.federalDistricts || {});
  const regionToFD = new Map<string, string>();
  for (const cs of contragentSales) {
    if (cs.region && cs.federalDistrict && !regionToFD.has(cs.region)) {
      regionToFD.set(cs.region, cs.federalDistrict);
    }
  }
  if (regionToFD.size < Object.keys(th.regions || {}).length) {
    for (const rName of Object.keys(th.regions || {})) {
      if (!regionToFD.has(rName)) {
        const fd = matchRegionToFD(rName, fdNames);
        if (fd) regionToFD.set(rName, fd);
      }
    }
  }
  if (regionToFD.size === 0 && fdNames.length === 1) {
    for (const rName of Object.keys(th.regions || {})) {
      regionToFD.set(rName, fdNames[0]);
    }
  }

  if (regHasEmptyDrugs && Object.keys(drugAnalytics).length > 0) {
    const regionDrugMap = new Map<string, Map<string, number>>();
    for (const [drugName, analytics] of Object.entries(drugAnalytics) as [string, any][]) {
      if (analytics?.regionSales) {
        for (const rs of analytics.regionSales) {
          if (!regionDrugMap.has(rs.name)) regionDrugMap.set(rs.name, new Map());
          regionDrugMap.get(rs.name)!.set(drugName, (regionDrugMap.get(rs.name)!.get(drugName) || 0) + (rs.sales || 0));
        }
      }
    }
    for (const [rName, drugs] of regionDrugMap) {
      if (th.regions[rName]) {
        th.regions[rName].drugSales = Array.from(drugs.entries())
          .map(([name, sales]) => ({ name, sales }))
          .sort((a, b) => b.sales - a.sales);
      }
    }
  }

  if (fdHasEmptyDrugs && Object.keys(drugAnalytics).length > 0) {
    const fdDrugMap = new Map<string, Map<string, number>>();
    for (const [drugName, analytics] of Object.entries(drugAnalytics) as [string, any][]) {
      if (analytics?.regionSales) {
        for (const rs of analytics.regionSales) {
          const fdName = regionToFD.get(rs.name);
          if (fdName) {
            if (!fdDrugMap.has(fdName)) fdDrugMap.set(fdName, new Map());
            fdDrugMap.get(fdName)!.set(drugName, (fdDrugMap.get(fdName)!.get(drugName) || 0) + (rs.sales || 0));
          }
        }
      }
    }
    for (const [fdName, drugs] of fdDrugMap) {
      if (th.federalDistricts[fdName]) {
        th.federalDistricts[fdName].drugSales = Array.from(drugs.entries())
          .map(([name, sales]) => ({ name, sales }))
          .sort((a, b) => b.sales - a.sales);
      }
    }
  }

  if (regHasEmptyChildren && th.cities) {
    for (const [cityName, cityData] of Object.entries(th.cities) as [string, any][]) {
      if (cityData.region && th.regions[cityData.region]) {
        if (!th.regions[cityData.region].children) th.regions[cityData.region].children = {};
        th.regions[cityData.region].children[cityName] = cityData;
      }
    }
  }

  const fdContragentMap = new Map<string, Set<string>>();
  for (const cs of contragentSales) {
    if (cs.region) {
      const fdName = regionToFD.get(cs.region);
      if (fdName) {
        if (!fdContragentMap.has(fdName)) fdContragentMap.set(fdName, new Set());
        fdContragentMap.get(fdName)!.add(cs.name);
      }
    }
  }
  for (const [fdName, contragents] of fdContragentMap) {
    if (th.federalDistricts[fdName] && (th.federalDistricts[fdName].contragentCount || 0) === 0) {
      th.federalDistricts[fdName].contragentCount = contragents.size;
    }
  }

  const regContragentMap = new Map<string, Set<string>>();
  for (const cs of contragentSales) {
    if (cs.region) {
      if (!regContragentMap.has(cs.region)) regContragentMap.set(cs.region, new Set());
      regContragentMap.get(cs.region)!.add(cs.name);
    }
  }
  for (const [rName, contragents] of regContragentMap) {
    if (th.regions[rName] && (th.regions[rName].contragentCount || 0) === 0) {
      th.regions[rName].contragentCount = contragents.size;
    }
  }
}

function applyFilters(merged: any, filters: any, compactRows: any[] | null, contragentRows: any[] | null, perYearData?: Map<string, any>): any {
  const {
    selectedDrugs = [],
    selectedRegions = [],
    selectedYears = [],
    selectedMonth = '',
    selectedDisposalTypes = [],
    selectedFederalDistricts = [],
    selectedContractorGroups = [],
  } = filters;

  const noFilter =
    selectedDrugs.length === 0 &&
    selectedRegions.length === 0 &&
    selectedYears.length === 0 &&
    !selectedMonth &&
    selectedDisposalTypes.length === 0 &&
    selectedFederalDistricts.length === 0 &&
    selectedContractorGroups.length === 0;

  if (noFilter) return merged;

  if (compactRows && compactRows.length > 0) {
    const yearCounts = new Map<string, number>();
    compactRows.forEach((r: any) => {
      const y = String(r.year || 'undefined');
      yearCounts.set(y, (yearCounts.get(y) || 0) + 1);
    });
    console.log(`[applyFilters] compactRows total=${compactRows.length}, yearDistribution=${JSON.stringify(Object.fromEntries(yearCounts))}, selectedYears=${JSON.stringify(selectedYears)}`);

    const filteredRows = compactRows.filter((row: any) => {
      const matchesDrug = selectedDrugs.length === 0 ||
        selectedDrugs.some((d: string) => row.drug?.includes(d) || row.complexDrugName?.includes(d));
      const matchesRegion = selectedRegions.length === 0 || selectedRegions.includes(row.region);
      const matchesFD = selectedFederalDistricts.length === 0 || selectedFederalDistricts.includes(row.federalDistrict);
      const matchesYear = selectedYears.length === 0 || selectedYears.includes(String(row.year));
      const matchesMonth = !selectedMonth || row.month === selectedMonth;
      const matchesDT = selectedDisposalTypes.length === 0 || selectedDisposalTypes.includes(row.disposalType);
      const matchesCG = selectedContractorGroups.length === 0 ||
        selectedContractorGroups.some((g: string) => (row.contractorGroup || '').includes(g));
      return matchesDrug && matchesRegion && matchesFD && matchesYear && matchesMonth && matchesDT && matchesCG;
    });
    console.log(`[applyFilters] filteredRows=${filteredRows.length} (after year filter)`);

    const MONTH_NAMES: Record<string, string> = {
      'Янв': 'Январь', 'Фев': 'Февраль', 'Мар': 'Март', 'Апр': 'Апрель',
      'Май': 'Май', 'Июн': 'Июнь', 'Июл': 'Июль', 'Авг': 'Август',
      'Сен': 'Сентябрь', 'Окт': 'Октябрь', 'Ноя': 'Ноябрь', 'Дек': 'Декабрь',
    };

    const regionSalesMap = new Map<string, number>();
    const contragentSalesMap = new Map<string, any>();
    const drugSalesMap = new Map<string, number>();
    const monthSalesMap = new Map<string, any>();
    const combinedMap = new Map<string, any>();

    filteredRows.forEach((row: any) => {
      const sales = row.amount || row.quantity || 0;
      if (row.region) regionSalesMap.set(row.region, (regionSalesMap.get(row.region) || 0) + sales);
      if (row.contragent) {
        const ex = contragentSalesMap.get(row.contragent);
        if (ex) { ex.sales += sales; }
        else {
          contragentSalesMap.set(row.contragent, {
            sales, region: row.region, city: row.city,
            receiverType: row.receiverType, contractorGroup: row.contractorGroup,
            federalDistrict: row.federalDistrict, district: row.district, cityDistrict: row.cityDistrict,
          });
        }
      }
      if (row.drug) drugSalesMap.set(row.drug, (drugSalesMap.get(row.drug) || 0) + sales);
      if (row.month) {
        const ex = monthSalesMap.get(row.month);
        if (ex) { ex.sales += sales; }
        else { monthSalesMap.set(row.month, { month: row.month, name: MONTH_NAMES[row.month] || row.month, sales }); }
      }
      if (row.month && row.year) {
        const yearStr = String(row.year);
        if (!combinedMap.has(row.month)) {
          combinedMap.set(row.month, { month: row.month, name: MONTH_NAMES[row.month] || row.month });
        }
        const entry = combinedMap.get(row.month);
        entry[yearStr] = (entry[yearStr] || 0) + sales;
      }
    });

    if (contragentSalesMap.size === 0 && contragentRows && contragentRows.length > 0) {
      contragentRows.forEach((crow: any) => {
        const matchesDrug = selectedDrugs.length === 0 ||
          selectedDrugs.some((d: string) => crow.drug?.includes(d) || d.includes(crow.drug));
        const matchesRegion = selectedRegions.length === 0 || selectedRegions.includes(crow.region);
        const matchesYear = selectedYears.length === 0 || selectedYears.includes(String(crow.year));
        const matchesMonth2 = !selectedMonth || crow.month === selectedMonth;
        const matchesDT = selectedDisposalTypes.length === 0 || selectedDisposalTypes.includes(crow.disposalType);
        const matchesFD = selectedFederalDistricts.length === 0 || selectedFederalDistricts.includes(crow.federalDistrict);
        const matchesCG = selectedContractorGroups.length === 0 ||
          selectedContractorGroups.some((g: string) => (crow.contractorGroup || '').includes(g));
        if (matchesDrug && matchesRegion && matchesYear && matchesMonth2 && matchesDT && matchesFD && matchesCG && crow.contragent) {
          const ex = contragentSalesMap.get(crow.contragent);
          const qty = crow.quantity || 0;
          if (ex) { ex.sales += qty; }
          else {
            contragentSalesMap.set(crow.contragent, {
              sales: qty, region: crow.region,
              receiverType: crow.receiverType, contractorGroup: crow.contractorGroup,
            });
          }
        }
      });
    }

    const mergedYears = merged.combinedData?.length > 0
      ? [...new Set(Object.keys(merged.combinedData[0]).filter(k => /^\d{4}$/.test(k)))]
      : [];
    const filteredRowYearCounts = new Map<string, number>();
    filteredRows.forEach((r: any) => {
      const y = String(r.year);
      filteredRowYearCounts.set(y, (filteredRowYearCounts.get(y) || 0) + 1);
    });
    const missingYears = mergedYears.filter(y => {
      if (filteredRowYearCounts.has(y) && filteredRowYearCounts.get(y)! > 0) return false;
      if (yearCounts.has(y) && yearCounts.get(y)! > 0) return false;
      return true;
    });
    if (missingYears.length > 0) {
      console.log(`[applyFilters] Годы без compact rows (legacy): ${missingYears.join(',')}, сохраняем неотфильтрованные значения`);
    }

    let filteredCombined: any[];
    if (combinedMap.size > 0 && merged.combinedData) {
      filteredCombined = merged.combinedData.map((orig: any) => {
        const filtered = combinedMap.get(orig.month);
        const entry: any = { month: orig.month, name: orig.name };
        const yearKeys = Object.keys(orig).filter(k => /^\d{4}$/.test(k));
        for (const yk of yearKeys) {
          if (missingYears.includes(yk)) {
            entry[yk] = orig[yk] ?? 0;
          } else if (filtered) {
            entry[yk] = filtered[yk] || 0;
          } else {
            entry[yk] = 0;
          }
        }
        const forecastKeys = Object.keys(orig).filter(k => /^forecast\d{4}$/.test(k));
        for (const fk of forecastKeys) {
          if (orig[fk] !== undefined) entry[fk] = orig[fk];
        }
        return entry;
      });
    } else {
      filteredCombined = merged.combinedData || [];
    }

    const filteredTH: any = { federalDistricts: {}, regions: {}, cities: {}, districts: {} };
    const fdSalesMap = new Map<string, number>();
    const fdContragentSets = new Map<string, Set<string>>();
    const fdDrugSalesMap = new Map<string, Map<string, number>>();
    type CityData = { sales: number; contragents: Set<string>; drugSales: Map<string, number>; districts: Map<string, { sales: number; contragents: Set<string>; drugSales: Map<string, number> }> };
    type RegionData = { sales: number; contragents: Set<string>; drugSales: Map<string, number>; cities: Map<string, CityData> };
    const regionDataMap = new Map<string, RegionData>();

    filteredRows.forEach((row: any) => {
      const sales = row.amount || row.quantity || 0;
      const fd = row.federalDistrict || '';
      const region = row.region || '';
      const city = row.city || '';
      const district = row.district || row.cityDistrict || '';
      const drug = row.drug || '';
      const contragent = row.contragent || '';

      if (fd) {
        fdSalesMap.set(fd, (fdSalesMap.get(fd) || 0) + sales);
        if (!fdContragentSets.has(fd)) fdContragentSets.set(fd, new Set());
        if (contragent) fdContragentSets.get(fd)!.add(contragent);
        if (!fdDrugSalesMap.has(fd)) fdDrugSalesMap.set(fd, new Map());
        if (drug) fdDrugSalesMap.get(fd)!.set(drug, (fdDrugSalesMap.get(fd)!.get(drug) || 0) + sales);
      }

      if (region) {
        if (!regionDataMap.has(region)) {
          regionDataMap.set(region, { sales: 0, contragents: new Set(), drugSales: new Map(), cities: new Map() });
        }
        const rd = regionDataMap.get(region)!;
        rd.sales += sales;
        if (contragent) rd.contragents.add(contragent);
        if (drug) rd.drugSales.set(drug, (rd.drugSales.get(drug) || 0) + sales);

        if (city) {
          if (!rd.cities.has(city)) {
            rd.cities.set(city, { sales: 0, contragents: new Set(), drugSales: new Map(), districts: new Map() });
          }
          const cd = rd.cities.get(city)!;
          cd.sales += sales;
          if (contragent) cd.contragents.add(contragent);
          if (drug) cd.drugSales.set(drug, (cd.drugSales.get(drug) || 0) + sales);

          if (district) {
            if (!cd.districts.has(district)) {
              cd.districts.set(district, { sales: 0, contragents: new Set(), drugSales: new Map() });
            }
            const dd = cd.districts.get(district)!;
            dd.sales += sales;
            if (contragent) dd.contragents.add(contragent);
            if (drug) dd.drugSales.set(drug, (dd.drugSales.get(drug) || 0) + sales);
          }
        }
      }
    });

    for (const [fdName, fdSales] of fdSalesMap) {
      const drugSalesArr = Array.from(fdDrugSalesMap.get(fdName) || new Map()).map(([name, s]) => ({ name, sales: s }));
      filteredTH.federalDistricts[fdName] = {
        sales: fdSales,
        contragentCount: fdContragentSets.get(fdName)?.size || 0,
        drugSales: drugSalesArr,
      };
    }

    for (const [rName, rd] of regionDataMap) {
      const children: any = {};
      for (const [cName, cd] of rd.cities) {
        const distChildren: any = {};
        for (const [dName, dd] of cd.districts) {
          distChildren[dName] = {
            sales: dd.sales,
            contragentCount: dd.contragents.size,
            drugSales: Array.from(dd.drugSales).map(([name, s]) => ({ name, sales: s })),
          };
        }
        children[cName] = {
          sales: cd.sales,
          contragentCount: cd.contragents.size,
          drugSales: Array.from(cd.drugSales).map(([name, s]) => ({ name, sales: s })),
          children: distChildren,
        };
        filteredTH.cities = filteredTH.cities || {};
        filteredTH.cities[cName] = children[cName];
      }
      filteredTH.regions[rName] = {
        sales: rd.sales,
        contragentCount: rd.contragents.size,
        drugSales: Array.from(rd.drugSales).map(([name, s]) => ({ name, sales: s })),
        children,
      };
    }

    const filteredFDSales = Array.from(fdSalesMap.entries()).map(([name, sales]) => ({ name, sales }));

    let finalMonthlySales = Array.from(monthSalesMap.values());
    let finalRegionSales = Array.from(regionSalesMap.entries()).map(([name, sales]) => ({ name, sales }));
    let finalDrugSales = Array.from(drugSalesMap.entries()).map(([name, sales]) => ({ name, sales }));
    let finalContragentSales = Array.from(contragentSalesMap.entries())
      .map(([name, data]) => ({ name, sales: data.sales, region: data.region, city: data.city, receiverType: data.receiverType, contractorGroup: data.contractorGroup, federalDistrict: data.federalDistrict, district: data.district, cityDistrict: data.cityDistrict }));

    if (missingYears.length > 0 && perYearData) {
      for (const missingYear of missingYears) {
        if (selectedYears.length > 0 && !selectedYears.includes(missingYear)) continue;
        const yearData = perYearData.get(missingYear);
        if (!yearData) continue;

        if (yearData.monthlySales) {
          for (const m of yearData.monthlySales) {
            const existing = finalMonthlySales.find((e: any) => e.month === m.month);
            if (existing) { existing.sales += m.sales || 0; }
            else { finalMonthlySales.push({ month: m.month, name: m.name, sales: m.sales || 0 }); }
          }
        }

        if (yearData.regionSales) {
          for (const r of yearData.regionSales) {
            const existing = finalRegionSales.find((e: any) => e.name === r.name);
            if (existing) { existing.sales += r.sales || 0; }
            else { finalRegionSales.push({ name: r.name, sales: r.sales || 0 }); }
          }
        }

        if (yearData.drugSales) {
          for (const d of yearData.drugSales) {
            const existing = finalDrugSales.find((e: any) => e.name === d.name);
            if (existing) { existing.sales += d.sales || 0; }
            else { finalDrugSales.push({ name: d.name, sales: d.sales || 0 }); }
          }
        }

        if (yearData.contragentSales) {
          for (const c of yearData.contragentSales) {
            const existing = finalContragentSales.find((e: any) => e.name === c.name);
            if (existing) { existing.sales += c.sales || 0; }
            else { finalContragentSales.push({ name: c.name, sales: c.sales || 0, region: c.region, city: c.city, receiverType: c.receiverType, contractorGroup: c.contractorGroup, federalDistrict: c.federalDistrict, district: c.district, cityDistrict: c.cityDistrict }); }
          }
        }

        if (yearData.federalDistrictSales) {
          for (const fd of yearData.federalDistrictSales) {
            const existing = filteredFDSales.find((e: any) => e.name === fd.name);
            if (existing) { existing.sales += fd.sales || 0; }
            else { filteredFDSales.push({ name: fd.name, sales: fd.sales || 0 }); }
          }
        }

        console.log(`[applyFilters] Добавлены неотфильтрованные данные за ${missingYear}`);
      }
    }

    finalRegionSales.sort((a, b) => b.sales - a.sales);
    finalDrugSales.sort((a, b) => b.sales - a.sales);
    finalContragentSales.sort((a, b) => b.sales - a.sales);

    return {
      ...merged,
      monthlySales: finalMonthlySales,
      regionSales: finalRegionSales,
      contragentSales: finalContragentSales,
      drugSales: finalDrugSales,
      combinedData: filteredCombined,
      territoryHierarchy: filteredTH,
      federalDistrictSales: filteredFDSales,
      filteredCompactRows: filteredRows,
    };
  }

  let disposalRatioPerYear = new Map<string, number>();
  let globalDisposalRatio = 1.0;
  let hasDisposalFilter = false;

  if (selectedDisposalTypes.length > 0 && perYearData && perYearData.size > 0) {
    let totalAllTypes = 0;
    let totalSelectedTypes = 0;
    let ratioComputed = false;
    for (const [yearStr, yearData] of perYearData) {
      if (selectedYears.length > 0 && !selectedYears.includes(yearStr)) continue;
      const dts = yearData.disposalTypeSales || [];
      if (dts.length === 0) continue;
      let yearTotal = 0;
      let yearSelected = 0;
      for (const dt of dts) {
        yearTotal += dt.sales || 0;
        if (selectedDisposalTypes.includes(dt.name)) {
          yearSelected += dt.sales || 0;
        }
      }
      const ratio = yearTotal > 0 ? yearSelected / yearTotal : 1.0;
      disposalRatioPerYear.set(yearStr, ratio);
      totalAllTypes += yearTotal;
      totalSelectedTypes += yearSelected;
      ratioComputed = true;
    }
    if (ratioComputed) {
      globalDisposalRatio = totalAllTypes > 0 ? totalSelectedTypes / totalAllTypes : 1.0;
      hasDisposalFilter = true;
      console.log(`[applyFilters] Пропорциональный пересчёт по типам выбытия: globalRatio=${globalDisposalRatio.toFixed(4)}, perYear=${JSON.stringify(Object.fromEntries(disposalRatioPerYear))}`);
    } else {
      console.log(`[applyFilters] Нет disposalTypeSales для расчёта пропорций, фильтр типов выбытия пропущен`);
    }
  }

  let baseRegionSales = merged.regionSales || [];
  let baseDrugSales = merged.drugSales || [];
  let baseContragentSales = merged.contragentSales || [];
  let baseTerritoryHierarchy = merged.territoryHierarchy;
  let baseFederalDistrictSales = merged.federalDistrictSales || [];

  if (selectedYears.length > 0 && perYearData && perYearData.size > 0) {
    const yearRegionMap = new Map<string, number>();
    const yearDrugMap = new Map<string, number>();
    const yearContragentMap = new Map<string, any>();
    const yearFDMap = new Map<string, number>();

    for (const [yearStr, yearData] of perYearData) {
      if (!selectedYears.includes(yearStr)) continue;
      if (yearData.regionSales) {
        for (const r of yearData.regionSales) {
          yearRegionMap.set(r.name, (yearRegionMap.get(r.name) || 0) + (r.sales || 0));
        }
      }
      if (yearData.drugSales) {
        for (const d of yearData.drugSales) {
          yearDrugMap.set(d.name, (yearDrugMap.get(d.name) || 0) + (d.sales || 0));
        }
      }
      if (yearData.contragentSales) {
        for (const c of yearData.contragentSales) {
          const existing = yearContragentMap.get(c.name);
          if (existing) { existing.sales += c.sales || 0; }
          else { yearContragentMap.set(c.name, { ...c }); }
        }
      }
      if (yearData.federalDistrictSales) {
        for (const fd of yearData.federalDistrictSales) {
          yearFDMap.set(fd.name, (yearFDMap.get(fd.name) || 0) + (fd.sales || 0));
        }
      }

      if (yearData.territoryHierarchy) {
        if (selectedYears.length === 1) {
          baseTerritoryHierarchy = yearData.territoryHierarchy;
        }
      }
    }

    if (yearRegionMap.size > 0) {
      baseRegionSales = Array.from(yearRegionMap.entries()).map(([name, sales]) => ({ name, sales }));
    }
    if (yearDrugMap.size > 0) {
      baseDrugSales = Array.from(yearDrugMap.entries()).map(([name, sales]) => ({ name, sales }));
    }
    if (yearContragentMap.size > 0) {
      baseContragentSales = Array.from(yearContragentMap.values());
    }
    if (yearFDMap.size > 0) {
      baseFederalDistrictSales = Array.from(yearFDMap.entries()).map(([name, sales]) => ({ name, sales }));
    }

    console.log(`[applyFilters] fallback year filter: selectedYears=${JSON.stringify(selectedYears)}, regions=${baseRegionSales.length}, drugs=${baseDrugSales.length}, contragents=${baseContragentSales.length}`);
  }

  const contragentFiltered = baseContragentSales.filter((c: any) => {
    const matchesRegion = selectedRegions.length === 0 || selectedRegions.includes(c.region);
    const matchesGroup = selectedContractorGroups.length === 0 ||
      selectedContractorGroups.some((g: string) => (c.contractorGroup || '').includes(g));
    const matchesFD = selectedFederalDistricts.length === 0 || selectedFederalDistricts.includes(c.federalDistrict);
    return matchesRegion && matchesGroup && matchesFD;
  }).map((c: any) => hasDisposalFilter ? ({ ...c, sales: Math.round(c.sales * globalDisposalRatio) }) : c) || [];

  const regionFiltered = baseRegionSales.filter((r: any) => {
    return selectedRegions.length === 0 || selectedRegions.includes(r.name);
  }).map((r: any) => hasDisposalFilter ? ({ ...r, sales: Math.round(r.sales * globalDisposalRatio) }) : r) || [];

  const drugFiltered = baseDrugSales.filter((d: any) => {
    return selectedDrugs.length === 0 || selectedDrugs.includes(d.name);
  }).map((d: any) => hasDisposalFilter ? ({ ...d, sales: Math.round(d.sales * globalDisposalRatio) }) : d) || [];

  let combinedFiltered = merged.combinedData;
  if (selectedMonth && combinedFiltered) {
    combinedFiltered = combinedFiltered.filter((c: any) => c.month === selectedMonth);
  }
  if (selectedYears.length > 0 && combinedFiltered) {
    combinedFiltered = combinedFiltered.map((c: any) => {
      const entry: any = { month: c.month, name: c.name };
      selectedYears.forEach((y: string) => {
        if (c[y] !== undefined) entry[y] = c[y];
      });
      if (c.forecast2027 !== undefined) entry.forecast2027 = c.forecast2027;
      return entry;
    });
  }
  if (disposalRatioPerYear.size > 0 && combinedFiltered) {
    combinedFiltered = combinedFiltered.map((c: any) => {
      const entry: any = { ...c };
      for (const [yearStr, ratio] of disposalRatioPerYear) {
        if (entry[yearStr] !== undefined) {
          entry[yearStr] = Math.round(entry[yearStr] * ratio);
        }
      }
      const forecastKeys = Object.keys(entry).filter(k => /^forecast\d{4}$/.test(k));
      for (const fk of forecastKeys) {
        if (entry[fk] !== undefined) {
          entry[fk] = Math.round(entry[fk] * globalDisposalRatio);
        }
      }
      return entry;
    });
  }

  let monthlySalesFiltered = merged.monthlySales;
  if (selectedYears.length > 0 && monthlySalesFiltered) {
    monthlySalesFiltered = monthlySalesFiltered.filter((m: any) => {
      return !m.year || selectedYears.includes(String(m.year));
    });
  }
  if (selectedMonth && monthlySalesFiltered) {
    monthlySalesFiltered = monthlySalesFiltered.filter((m: any) => m.month === selectedMonth);
  }
  if (hasDisposalFilter && monthlySalesFiltered) {
    monthlySalesFiltered = monthlySalesFiltered.map((m: any) => ({ ...m, sales: Math.round(m.sales * globalDisposalRatio) }));
  }

  let drugAnalyticsFiltered = merged.drugAnalytics;
  if (selectedDrugs.length > 0 && drugAnalyticsFiltered) {
    const filtered: Record<string, any> = {};
    selectedDrugs.forEach((d: string) => {
      if (drugAnalyticsFiltered[d]) filtered[d] = drugAnalyticsFiltered[d];
    });
    drugAnalyticsFiltered = filtered;
  }

  let contragentAnalyticsFiltered = merged.contragentAnalytics;
  if (selectedContractorGroups.length > 0 && contragentAnalyticsFiltered) {
    const filtered: Record<string, any> = {};
    Object.entries(contragentAnalyticsFiltered).forEach(([name, data]: [string, any]) => {
      if (selectedContractorGroups.some((g: string) => (data?.contractorGroup || name || '').includes(g))) {
        filtered[name] = data;
      }
    });
    contragentAnalyticsFiltered = filtered;
  }

  let fdFiltered = baseFederalDistrictSales;
  if (selectedFederalDistricts.length > 0) {
    fdFiltered = fdFiltered.filter((f: any) => selectedFederalDistricts.includes(f.name));
  }
  if (hasDisposalFilter) {
    fdFiltered = fdFiltered.map((f: any) => ({ ...f, sales: Math.round(f.sales * globalDisposalRatio) }));
  }

  let disposalFiltered = merged.disposalTypeSales || [];
  if (selectedDisposalTypes.length > 0) {
    disposalFiltered = disposalFiltered.filter((d: any) => selectedDisposalTypes.includes(d.name));
  }

  console.log(`[applyFilters] fallback path: drugs=${selectedDrugs.length}, regions=${selectedRegions.length}, years=${selectedYears.length}, disposalTypes=${selectedDisposalTypes.length}, contractorGroups=${selectedContractorGroups.length}, disposalRatio=${globalDisposalRatio.toFixed(4)}, regionSalesCount=${regionFiltered.length}, contragentCount=${contragentFiltered.length}`);

  return {
    ...merged,
    contragentSales: contragentFiltered,
    regionSales: regionFiltered,
    drugSales: drugFiltered,
    combinedData: combinedFiltered,
    monthlySales: monthlySalesFiltered,
    drugAnalytics: drugAnalyticsFiltered,
    contragentAnalytics: contragentAnalyticsFiltered,
    federalDistrictSales: fdFiltered,
    disposalTypeSales: disposalFiltered,
    territoryHierarchy: baseTerritoryHierarchy,
  };
}

async function loadAggregatedData(userId: number): Promise<{ merged: any; perYearData: Map<string, any> }> {
  const cached = aggDataCache.get(userId);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
    console.log(`[Cache] AGG HIT для userId=${userId}, возраст=${((Date.now() - cached.timestamp) / 1000).toFixed(1)}с`);
    return cached.data;
  }

  const memBefore = process.memoryUsage();
  console.log(`[Memory] loadAggregatedData START: RSS=${Math.round(memBefore.rss / 1024 / 1024)}MB, Heap=${Math.round(memBefore.heapUsed / 1024 / 1024)}MB/${Math.round(memBefore.heapTotal / 1024 / 1024)}MB`);

  const t0 = Date.now();
  const yearlyData = await storage.getAggregatedDataByUser(userId);
  const dbMs = Date.now() - t0;

  const memAfterDb = process.memoryUsage();
  console.log(`[Memory] after AGG DB query: RSS=${Math.round(memAfterDb.rss / 1024 / 1024)}MB, Heap=${Math.round(memAfterDb.heapUsed / 1024 / 1024)}MB, delta=+${Math.round((memAfterDb.heapUsed - memBefore.heapUsed) / 1024 / 1024)}MB`);
  console.log(`[loadAggregatedData] userId=${userId}, DB: ${dbMs}мс, записей: ${yearlyData.length}, годы=${yearlyData.map(y => y.year).join(',')}`);

  const merged = mergeYearlyData(yearlyData.map(y => ({ year: y.year, aggregatedData: y.aggregatedData })));

  const perYearData = new Map<string, any>();
  for (const yd of yearlyData) {
    enrichTerritoryHierarchy(yd.aggregatedData);
    perYearData.set(String(yd.year), yd.aggregatedData);
  }

  if (merged) {
    enrichTerritoryHierarchy(merged);
    console.log(`[loadAggregatedData] merged: combinedData=${merged.combinedData?.length || 0}, monthlySales=${merged.monthlySales?.length || 0}, years=${JSON.stringify(merged.years)}`);
  }

  const result = { merged, perYearData };

  const memAfter = process.memoryUsage();
  console.log(`[Memory] loadAggregatedData END: RSS=${Math.round(memAfter.rss / 1024 / 1024)}MB, Heap=${Math.round(memAfter.heapUsed / 1024 / 1024)}MB, delta=+${Math.round((memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024)}MB`);

  aggDataCache.set(userId, { data: result, timestamp: Date.now() });
  console.log(`[Cache] AGG MISS → сохранено для userId=${userId}`);

  return result;
}

function safeParseArray(value: string | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String);
    return [String(parsed)];
  } catch {
    return [];
  }
}

function parseFilters(query: any): any {
  const selectedRegions = safeParseArray(query.regions);
  const managerRegions = safeParseArray(query.managerRegions);

  let combinedRegions = selectedRegions;
  if (managerRegions.length > 0) {
    if (selectedRegions.length > 0) {
      combinedRegions = selectedRegions.filter(r => managerRegions.includes(r));
    } else {
      combinedRegions = managerRegions;
    }
  }

  let selectedYears = safeParseArray(query.years);
  if (selectedYears.length === 0 && query.wmYear && query.wmYear !== 'all' && query.wmYear !== 'Все') {
    selectedYears = [String(query.wmYear)];
    console.log(`[parseFilters] wmYear=${query.wmYear} → selectedYears=[${selectedYears}]`);
  }

  const FULL_TO_SHORT_MONTH: Record<string, string> = {
    'Январь': 'Янв', 'Февраль': 'Фев', 'Март': 'Мар', 'Апрель': 'Апр',
    'Май': 'Май', 'Июнь': 'Июн', 'Июль': 'Июл', 'Август': 'Авг',
    'Сентябрь': 'Сен', 'Октябрь': 'Окт', 'Ноябрь': 'Ноя', 'Декабрь': 'Дек',
  };

  let selectedMonth = '';
  if (query.wmMonth && query.wmMonth !== 'all' && query.wmMonth !== 'Все') {
    selectedMonth = FULL_TO_SHORT_MONTH[query.wmMonth] || query.wmMonth;
    console.log(`[parseFilters] wmMonth=${query.wmMonth} → selectedMonth=${selectedMonth}`);
  }

  const selectedDrugs = safeParseArray(query.drugs);
  const selectedDisposalTypes = safeParseArray(query.disposalTypes);
  const selectedFederalDistricts = safeParseArray(query.federalDistricts);
  const selectedContractorGroups = safeParseArray(query.contractorGroups);

  console.log(`[parseFilters] years=${JSON.stringify(selectedYears)}, drugs=${selectedDrugs.length}, regions=${combinedRegions.length}, disposalTypes=${selectedDisposalTypes.length}, federalDistricts=${selectedFederalDistricts.length}, contractorGroups=${selectedContractorGroups.length}`);

  return {
    selectedDrugs,
    selectedRegions: combinedRegions,
    selectedYears,
    selectedMonth,
    selectedDisposalTypes,
    selectedFederalDistricts,
    selectedContractorGroups,
  };
}

export function createTabDataRouter(authMiddleware: any) {
  const router = Router();

  router.use((req: Request, res: Response, next: NextFunction) => {
    const circuit = getCircuitState();
    if (circuit.open) {
      return res.status(503).json({
        error: `База данных недоступна, следующая попытка через ${circuit.remainingSec}с`,
        isCircuitBreaker: true,
      });
    }
    next();
  });

  router.get("/debug-data", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const yearlyData = await storage.getAggregatedDataByUser(userId);
      const summary = yearlyData.map(y => {
        const data = y.aggregatedData as any;
        return {
          year: y.year,
          dataType: y.dataType,
          hasCombinedData: !!data.combinedData,
          combinedDataLen: data.combinedData?.length || 0,
          combinedSample: data.combinedData?.slice(0, 2),
          monthlySalesLen: data.monthlySales?.length || 0,
          monthlySample: data.monthlySales?.slice(0, 2),
          drugSalesLen: data.drugSales?.length || 0,
          regionSalesLen: data.regionSales?.length || 0,
          contragentSalesLen: data.contragentSales?.length || 0,
          drugsCount: data.drugs?.length || 0,
          keys: Object.keys(data),
        };
      });
      const thDetails = yearlyData.map(y => {
        const data = y.aggregatedData as any;
        const th = data.territoryHierarchy || {};
        const fds = th.federalDistricts || {};
        const regions = th.regions || {};
        const fdSummary: Record<string, any> = {};
        for (const [fdName, fdData] of Object.entries(fds) as [string, any][]) {
          fdSummary[fdName] = {
            sales: fdData.sales || 0,
            contragentCount: fdData.contragentCount || 0,
            drugSalesCount: (fdData.drugSales || []).length,
            drugSalesTop3: (fdData.drugSales || []).slice(0, 3),
          };
        }
        const regionSummary: Record<string, any> = {};
        for (const [rName, rData] of Object.entries(regions) as [string, any][]) {
          const childrenKeys = Object.keys(rData.children || {});
          regionSummary[rName] = {
            sales: rData.sales || 0,
            contragentCount: rData.contragentCount || 0,
            drugSalesCount: (rData.drugSales || []).length,
            childrenCount: childrenKeys.length,
            childrenSample: childrenKeys.slice(0, 3),
          };
        }
        const da = data.drugAnalytics || {};
        const daKeys = Object.keys(da);
        const daSample: Record<string, any> = {};
        for (const k of daKeys.slice(0, 3)) {
          const v = da[k];
          daSample[k] = {
            totalSales: v?.totalSales || 0,
            contragentSalesCount: (v?.contragentSales || []).length,
            regionSalesCount: (v?.regionSales || []).length,
          };
        }
        return {
          year: y.year,
          fdCount: Object.keys(fds).length,
          fdSummary,
          regionCount: Object.keys(regions).length,
          regionSummary,
          drugAnalyticsCount: daKeys.length,
          drugAnalyticsSample: daSample,
        };
      });
      res.json({ userId, totalRecords: yearlyData.length, summary, thDetails });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get("/metadata", authMiddleware, async (req: AuthRequest, res: Response) => {
    const t0 = Date.now();
    try {
      const userId = req.userId!;
      const salesData = await storage.getAggregatedDataByUser(userId);

      if (salesData.length === 0) {
        console.log(`[API] GET /metadata userId=${userId} → ${Date.now() - t0}мс (нет данных)`);
        return res.json({ hasData: false, years: [], drugs: [], regions: [], federalDistricts: [], disposalTypes: [], contractorGroups: [], receiverTypes: [] });
      }

      const allDrugs = new Set<string>();
      const allRegions = new Set<string>();
      const allFD = new Set<string>();
      const allDT = new Set<string>();
      const allCG = new Set<string>();
      const allRT = new Set<string>();
      const allYears: string[] = [];

      for (const yd of salesData) {
        const year = yd.year.toString();
        if (!allYears.includes(year)) allYears.push(year);
        const data = yd.aggregatedData as any;
        if (data.drugs) data.drugs.forEach((d: string) => allDrugs.add(d));
        if (data.regionSales) data.regionSales.forEach((r: any) => allRegions.add(r.name));
        if (data.federalDistrictSales) data.federalDistrictSales.forEach((f: any) => allFD.add(f.name));
        if (data.disposalTypeSales) data.disposalTypeSales.forEach((d: any) => allDT.add(d.name));
        if (data.receiverTypeSales) data.receiverTypeSales.forEach((r: any) => allRT.add(r.name));
        if (data.contragentSales) {
          data.contragentSales.forEach((c: any) => {
            if (c.contractorGroup) allCG.add(c.contractorGroup);
          });
        }
      }

      console.log(`[API] GET /metadata userId=${userId} → ${Date.now() - t0}мс, years=${allYears.join(',')}`);
      res.json({
        hasData: true,
        years: allYears.sort(),
        drugs: Array.from(allDrugs).sort(),
        regions: Array.from(allRegions).sort(),
        federalDistricts: Array.from(allFD).sort(),
        disposalTypes: Array.from(allDT).sort(),
        contractorGroups: Array.from(allCG).sort(),
        receiverTypes: Array.from(allRT).sort(),
      });
    } catch (error) {
      console.error(`[API] GET /metadata ERROR (${Date.now() - t0}мс):`, error);
      const msg = (error as any)?.message || '';
      if (msg.includes('shutting down') || msg.includes('ECONNRESET') || msg.includes('connection terminated') || msg.includes('ECONNREFUSED')) {
        return res.status(503).json({ error: "База данных временно недоступна. Попробуйте обновить страницу через минуту." });
      }
      res.status(500).json({ error: "Ошибка загрузки метаданных" });
    }
  });

  router.get("/dashboard", authMiddleware, async (req: AuthRequest, res: Response) => {
    const t0 = Date.now();
    try {
      const userId = req.userId!;
      const { merged, perYearData } = await loadAggregatedData(userId);
      if (!merged) {
        console.log(`[API] GET /dashboard userId=${userId} → ${Date.now() - t0}мс (нет данных)`);
        return res.json({ hasData: false });
      }

      const filters = parseFilters(req.query);
      const { rows: compactRows, contragentRows } = await loadCompactRowsIfNeeded(userId, filters);
      const filtered = applyFilters(merged, filters, compactRows, contragentRows, perYearData);

      const totalSales = (filtered.monthlySales || []).reduce((s: number, m: any) => s + (m.sales || 0), 0);
      const totalRegions = (filtered.regionSales || []).length;
      const totalDrugs = (filtered.drugSales || []).length;
      const totalContragents = (filtered.contragentSales || []).length;

      let drugSalesPerYear: Record<string, {name: string; sales: number}[]> = {};
      let monthlyDrugSales: Record<string, Record<string, {name: string; sales: number}[]>> = {};
      let weeklySalesPerYear: Record<string, any[]> = {};
      let regionsPerYear: Record<string, number> = {};
      let contragentsPerYear: Record<string, number> = {};
      let drugsPerYear: Record<string, number> = {};

      if (compactRows && compactRows.length > 0 && filtered.filteredCompactRows) {
        const fRows = filtered.filteredCompactRows as any[];
        const yearDrugMap = new Map<string, Map<string, number>>();
        const yearRegionSet = new Map<string, Set<string>>();
        const yearContraSet = new Map<string, Set<string>>();
        const yearDrugSet = new Map<string, Set<string>>();
        const yearWeeklyMap = new Map<string, Map<string, { month: string; week: number; drug: string; quantity: number; amount: number }>>();
        const yearMonthDrugMap = new Map<string, Map<string, Map<string, number>>>();

        for (const row of fRows) {
          const yr = String(row.year);
          const sales = row.amount || row.quantity || 0;
          if (!yearDrugMap.has(yr)) yearDrugMap.set(yr, new Map());
          if (!yearRegionSet.has(yr)) yearRegionSet.set(yr, new Set());
          if (!yearContraSet.has(yr)) yearContraSet.set(yr, new Set());
          if (!yearDrugSet.has(yr)) yearDrugSet.set(yr, new Set());

          if (row.drug) {
            yearDrugMap.get(yr)!.set(row.drug, (yearDrugMap.get(yr)!.get(row.drug) || 0) + sales);
            yearDrugSet.get(yr)!.add(row.drug);
          }
          if (row.region) yearRegionSet.get(yr)!.add(row.region);
          if (row.contragent) yearContraSet.get(yr)!.add(row.contragent);

          if (row.month && row.drug) {
            if (!yearMonthDrugMap.has(row.month)) yearMonthDrugMap.set(row.month, new Map());
            const monthMap = yearMonthDrugMap.get(row.month)!;
            if (!monthMap.has(yr)) monthMap.set(yr, new Map());
            monthMap.get(yr)!.set(row.drug, (monthMap.get(yr)!.get(row.drug) || 0) + sales);
          }

          // compact rows хранят уже вычисленную неделю (week), не day
          const rowWeek = row.week != null ? row.week : (row.day ? Math.min(Math.ceil(row.day / 7), 5) : null);
          if (rowWeek != null && row.month) {
            const wKey = `${yr}_${row.month}_${rowWeek}_${row.drug}`;
            if (!yearWeeklyMap.has(yr)) yearWeeklyMap.set(yr, new Map());
            const existing = yearWeeklyMap.get(yr)!.get(wKey);
            if (existing) {
              existing.quantity += row.quantity || 0;
              existing.amount += row.amount || 0;
            } else {
              yearWeeklyMap.get(yr)!.set(wKey, { month: row.month, week: rowWeek, drug: row.drug || '', quantity: row.quantity || 0, amount: row.amount || 0 });
            }
          }
        }

        for (const [yr, drugMap] of yearDrugMap) {
          regionsPerYear[yr] = yearRegionSet.get(yr)?.size || 0;
          drugsPerYear[yr] = yearDrugSet.get(yr)?.size || 0;
          drugSalesPerYear[yr] = Array.from(drugMap.entries())
            .map(([name, sales]) => ({ name, sales }))
            .sort((a, b) => b.sales - a.sales);
        }

        const filteredContragents = filtered.contragentSales || [];
        if (filteredContragents.length > 0) {
          const allYears = [...yearDrugMap.keys()];
          for (const yr of allYears) {
            contragentsPerYear[yr] = filteredContragents.length;
          }
        } else {
          for (const [yr] of yearDrugMap) {
            contragentsPerYear[yr] = yearContraSet.get(yr)?.size || 0;
          }
        }

        for (const [monthKey, yearMap] of yearMonthDrugMap) {
          if (!monthlyDrugSales[monthKey]) monthlyDrugSales[monthKey] = {};
          for (const [yr, drugMap] of yearMap) {
            monthlyDrugSales[monthKey][yr] = Array.from(drugMap.entries())
              .map(([name, sales]) => ({ name, sales }));
          }
        }

        for (const [yr, weekMap] of yearWeeklyMap) {
          weeklySalesPerYear[yr] = Array.from(weekMap.values());
        }
      } else {
        for (const [yr, yearData] of perYearData) {
          if (filters.selectedYears.length > 0 && !filters.selectedYears.includes(yr)) continue;
          if (yearData.regionSales) regionsPerYear[yr] = yearData.regionSales.length;
          if (yearData.contragentSales) contragentsPerYear[yr] = yearData.contragentSales.length;
          if (yearData.drugSales) {
            drugsPerYear[yr] = yearData.drugSales.length;
            drugSalesPerYear[yr] = yearData.drugSales.map((d: any) => ({ name: d.name, sales: d.sales || 0 }))
              .sort((a: any, b: any) => b.sales - a.sales);
          }
          if (yearData.weeklySales) {
            weeklySalesPerYear[yr] = yearData.weeklySales;
          }
        }

        for (const [yr, yearData] of perYearData) {
          if (filters.selectedYears.length > 0 && !filters.selectedYears.includes(yr)) continue;
          if (yearData.drugAnalytics) {
            for (const [drug, analytics] of Object.entries(yearData.drugAnalytics) as [string, any][]) {
              for (const ms of (analytics.monthlySales || [])) {
                const monthKey = ms.month;
                if (!monthlyDrugSales[monthKey]) monthlyDrugSales[monthKey] = {};
                if (!monthlyDrugSales[monthKey][yr]) monthlyDrugSales[monthKey][yr] = [];
                monthlyDrugSales[monthKey][yr].push({ name: drug, sales: ms.sales });
              }
            }
          }
        }
      }

      console.log(`[API] GET /dashboard userId=${userId} → ${Date.now() - t0}мс, combinedData=${(filtered.combinedData || []).length}, monthlySales=${(filtered.monthlySales || []).length}, years=${JSON.stringify(merged.years)}, drugSalesPerYear keys=${Object.keys(drugSalesPerYear)}, weeklySalesPerYear keys=${Object.keys(weeklySalesPerYear)}`);

      res.json({
        hasData: true,
        monthlySales: filtered.monthlySales || [],
        regionSales: filtered.regionSales || [],
        drugSales: filtered.drugSales || [],
        contragentSales: filtered.contragentSales || [],
        combinedData: filtered.combinedData || [],
        disposalTypeSales: filtered.disposalTypeSales || [],
        federalDistrictSales: filtered.federalDistrictSales || [],
        receiverTypeSales: filtered.receiverTypeSales || [],
        drugSalesPerYear,
        monthlyDrugSales,
        weeklySalesPerYear,
        kpi: { totalSales, totalRegions, totalDrugs, totalContragents },
        regionsPerYear,
        contragentsPerYear,
        drugsPerYear,
        years: merged.years || [],
      });
    } catch (error) {
      console.error(`[API] GET /dashboard ERROR (${Date.now() - t0}мс):`, error);
      res.status(500).json({ error: "Ошибка загрузки данных дашборда" });
    }
  });

  router.get("/territories", authMiddleware, async (req: AuthRequest, res: Response) => {
    const t0 = Date.now();
    try {
      const userId = req.userId!;
      const { merged, perYearData } = await loadAggregatedData(userId);
      if (!merged) return res.json({ hasData: false });

      const filters = parseFilters(req.query);
      const { rows: compactRows, contragentRows } = await loadCompactRowsIfNeeded(userId, filters);
      const filtered = applyFilters(merged, filters, compactRows, contragentRows, perYearData);

      console.log(`[API] GET /territories userId=${userId} → ${Date.now() - t0}мс`);
      res.json({
        hasData: true,
        territoryHierarchy: filtered.territoryHierarchy || merged.territoryHierarchy || { federalDistricts: {}, regions: {}, cities: {}, districts: {} },
        regionSales: filtered.regionSales || [],
        federalDistrictSales: filtered.federalDistrictSales || [],
        drugSales: filtered.drugSales || merged.drugSales || [],
      });
    } catch (error) {
      console.error(`[API] GET /territories ERROR (${Date.now() - t0}мс):`, error);
      res.status(500).json({ error: "Ошибка загрузки территорий" });
    }
  });

  router.get("/contragents", authMiddleware, async (req: AuthRequest, res: Response) => {
    const t0 = Date.now();
    try {
      const userId = req.userId!;
      const { merged, perYearData } = await loadAggregatedData(userId);
      if (!merged) return res.json({ hasData: false });

      const filters = parseFilters(req.query);
      const { rows: compactRows, contragentRows } = await loadCompactRowsIfNeeded(userId, filters);
      const filtered = applyFilters(merged, filters, compactRows, contragentRows, perYearData);

      const contragentSales = (filtered.contragentSales || [])
        .sort((a: any, b: any) => b.sales - a.sales);

      const contractorGroupMap = new Map<string, { sales: number; count: number; contragents: any[] }>();
      contragentSales.forEach((c: any) => {
        const group = c.contractorGroup || 'Без группы';
        const existing = contractorGroupMap.get(group);
        if (existing) {
          existing.sales += c.sales;
          existing.count++;
          existing.contragents.push(c);
        } else {
          contractorGroupMap.set(group, { sales: c.sales, count: 1, contragents: [c] });
        }
      });

      const groupSales = Array.from(contractorGroupMap.entries())
        .map(([name, d]) => ({ name, sales: d.sales, count: d.count, contragents: d.contragents.slice(0, 20) }))
        .sort((a, b) => b.sales - a.sales);

      const drugMap = new Map<string, number>();
      const regionByGroup = new Map<string, Map<string, number>>();
      const drugByGroup = new Map<string, Map<string, number>>();

      contragentSales.forEach((c: any) => {
        const group = c.contractorGroup || 'Без группы';
        if (!drugByGroup.has(group)) drugByGroup.set(group, new Map());
        if (!regionByGroup.has(group)) regionByGroup.set(group, new Map());
      });

      const contragentAnalytics = merged.contragentAnalytics || {};

      console.log(`[API] GET /contragents userId=${userId} → ${Date.now() - t0}мс, контрагентов=${contragentSales.length}`);
      res.json({
        hasData: true,
        contragentSales: contragentSales.slice(0, 200),
        contractorGroupSales: groupSales,
        receiverTypeSales: filtered.receiverTypeSales || [],
        contragentAnalytics,
        drugSales: filtered.drugSales || merged.drugSales || [],
      });
    } catch (error) {
      console.error(`[API] GET /contragents ERROR (${Date.now() - t0}мс):`, error);
      res.status(500).json({ error: "Ошибка загрузки контрагентов" });
    }
  });

  router.get("/forecast", authMiddleware, async (req: AuthRequest, res: Response) => {
    const t0 = Date.now();
    try {
      const userId = req.userId!;
      const { merged, perYearData } = await loadAggregatedData(userId);
      if (!merged) return res.json({ hasData: false });

      const filters = parseFilters(req.query);
      const { rows: compactRows, contragentRows } = await loadCompactRowsIfNeeded(userId, filters);
      const filtered = applyFilters(merged, filters, compactRows, contragentRows, perYearData);

      console.log(`[API] GET /forecast userId=${userId} → ${Date.now() - t0}мс, combinedData=${(filtered.combinedData || []).length}, years=${JSON.stringify(merged.years)}`);

      res.json({
        hasData: true,
        combinedData: filtered.combinedData || [],
        monthlySales: filtered.monthlySales || [],
        years: merged.years || [],
        drugAnalytics: filtered.drugAnalytics || {},
        drugSales: filtered.drugSales || merged.drugSales || [],
      });
    } catch (error) {
      console.error(`[API] GET /forecast ERROR (${Date.now() - t0}мс):`, error);
      res.status(500).json({ error: "Ошибка загрузки прогноза" });
    }
  });

  router.get("/seasonal", authMiddleware, async (req: AuthRequest, res: Response) => {
    const t0 = Date.now();
    try {
      const userId = req.userId!;
      const { merged, perYearData } = await loadAggregatedData(userId);
      if (!merged) return res.json({ hasData: false });

      const filters = parseFilters(req.query);
      const { rows: compactRows, contragentRows } = await loadCompactRowsIfNeeded(userId, filters);
      const filtered = applyFilters(merged, filters, compactRows, contragentRows, perYearData);

      console.log(`[API] GET /seasonal userId=${userId} → ${Date.now() - t0}мс`);
      res.json({
        hasData: true,
        monthlySales: filtered.monthlySales || [],
        combinedData: filtered.combinedData || [],
        years: merged.years || [],
        drugSales: filtered.drugSales || merged.drugSales || [],
      });
    } catch (error) {
      console.error(`[API] GET /seasonal ERROR (${Date.now() - t0}мс):`, error);
      res.status(500).json({ error: "Ошибка загрузки сезонности" });
    }
  });

  router.get("/abc", authMiddleware, async (req: AuthRequest, res: Response) => {
    const t0 = Date.now();
    try {
      const userId = req.userId!;
      const { merged, perYearData } = await loadAggregatedData(userId);
      if (!merged) return res.json({ hasData: false });

      const filters = parseFilters(req.query);
      const { rows: compactRows, contragentRows } = await loadCompactRowsIfNeeded(userId, filters);
      const filtered = applyFilters(merged, filters, compactRows, contragentRows, perYearData);

      console.log(`[API] GET /abc userId=${userId} → ${Date.now() - t0}мс`);
      res.json({
        hasData: true,
        regionSales: filtered.regionSales || [],
        drugSales: filtered.drugSales || [],
      });
    } catch (error) {
      console.error(`[API] GET /abc ERROR (${Date.now() - t0}мс):`, error);
      res.status(500).json({ error: "Ошибка загрузки ABC-анализа" });
    }
  });

  router.get("/compare", authMiddleware, async (req: AuthRequest, res: Response) => {
    const t0 = Date.now();
    try {
      const userId = req.userId!;
      const { merged, perYearData } = await loadAggregatedData(userId);
      if (!merged) return res.json({ hasData: false });

      const filters = parseFilters(req.query);
      const { rows: compactRows, contragentRows } = await loadCompactRowsIfNeeded(userId, filters);
      const filtered = applyFilters(merged, filters, compactRows, contragentRows, perYearData);

      console.log(`[API] GET /compare userId=${userId} → ${Date.now() - t0}мс`);
      res.json({
        hasData: true,
        combinedData: filtered.combinedData || [],
        monthlySales: filtered.monthlySales || [],
        years: merged.years || [],
        compactRows: [],
        drugSales: filtered.drugSales || merged.drugSales || [],
      });
    } catch (error) {
      console.error(`[API] GET /compare ERROR (${Date.now() - t0}мс):`, error);
      res.status(500).json({ error: "Ошибка загрузки сравнения" });
    }
  });

  router.get("/problems", authMiddleware, async (req: AuthRequest, res: Response) => {
    const t0 = Date.now();
    try {
      const userId = req.userId!;
      const { merged, perYearData } = await loadAggregatedData(userId);
      if (!merged) return res.json({ hasData: false });

      const filters = parseFilters(req.query);
      const { rows: compactRows, contragentRows } = await loadCompactRowsIfNeeded(userId, filters);
      const filtered = applyFilters(merged, filters, compactRows, contragentRows, perYearData);

      console.log(`[API] GET /problems userId=${userId} → ${Date.now() - t0}мс`);
      res.json({
        hasData: true,
        regionSales: filtered.regionSales || [],
        drugSales: filtered.drugSales || [],
        contragentSales: (filtered.contragentSales || []).slice(0, 50),
        monthlySales: filtered.monthlySales || [],
      });
    } catch (error) {
      console.error(`[API] GET /problems ERROR (${Date.now() - t0}мс):`, error);
      res.status(500).json({ error: "Ошибка загрузки проблемных зон" });
    }
  });

  function buildWmMonthFiltered(
    compactRows: any[] | null,
    contragentRows: any[] | null,
    yearsToProcess: string[],
    selectedMonth: string,
    perYearData: Map<string, any>
  ): { th: any; drugSalesArr: any[]; fdSalesArr: any[]; regionSalesArr: any[]; contragentSalesArr: any[]; drugContragentSets: Map<string, Set<string>>; mode: string } | null {
    const allRows = compactRows || [];
    const yearSet = new Set(yearsToProcess);

    const yearsWithCompact = new Set<string>();
    const yearsWithoutCompact = new Set<string>();
    for (const yr of yearsToProcess) {
      const hasRows = allRows.some((r: any) => String(r.year) === yr && r.month === selectedMonth);
      if (hasRows) yearsWithCompact.add(yr);
      else yearsWithoutCompact.add(yr);
    }

    const monthRatios = new Map<string, number>();
    for (const yr of yearsWithoutCompact) {
      const yd = perYearData.get(yr);
      if (!yd?.monthlySales || !Array.isArray(yd.monthlySales)) continue;
      const ms = yd.monthlySales as any[];
      const monthEntry = ms.find((m: any) => m.month === selectedMonth);
      if (!monthEntry || !monthEntry.sales || monthEntry.sales === 0) continue;
      const yearTotal = ms.reduce((s: number, m: any) => s + (m.sales || 0), 0);
      if (yearTotal > 0) {
        monthRatios.set(yr, monthEntry.sales / yearTotal);
      }
    }

    const hasExact = yearsWithCompact.size > 0;
    const hasProportional = monthRatios.size > 0;

    console.log(`[buildWmMonthFiltered] month=${selectedMonth}, years=[${yearsToProcess}], withCompact=[${[...yearsWithCompact]}], withoutCompact=[${[...yearsWithoutCompact]}], proportionalYears=[${[...monthRatios.keys()]}], ratios=${JSON.stringify(Object.fromEntries(monthRatios))}`);

    if (!hasExact && !hasProportional) return null;

    const th: any = { federalDistricts: {}, regions: {} };
    const drugSalesMap = new Map<string, number>();
    const fdSalesMap = new Map<string, number>();
    const regionSalesMap = new Map<string, number>();
    const contragentSalesMap = new Map<string, number>();
    const drugContragentSets = new Map<string, Set<string>>();

    if (hasExact) {
      const filtered = allRows.filter((row: any) => {
        return yearsWithCompact.has(String(row.year)) && row.month === selectedMonth;
      });
      for (const row of filtered) {
        const sales = row.amount || row.quantity || 0;
        const drug = row.drug || '';
        const fd = row.federalDistrict || '';
        const region = row.region || '';
        const contragent = row.contragent || '';

        if (drug) drugSalesMap.set(drug, (drugSalesMap.get(drug) || 0) + sales);
        if (fd) fdSalesMap.set(fd, (fdSalesMap.get(fd) || 0) + sales);
        if (region) regionSalesMap.set(region, (regionSalesMap.get(region) || 0) + sales);
        if (contragent) contragentSalesMap.set(contragent, (contragentSalesMap.get(contragent) || 0) + sales);

        if (drug && contragent) {
          if (!drugContragentSets.has(drug)) drugContragentSets.set(drug, new Set());
          drugContragentSets.get(drug)!.add(contragent);
        }

        if (fd) {
          if (!th.federalDistricts[fd]) th.federalDistricts[fd] = { sales: 0, contragentCount: 0, drugSales: [] };
          th.federalDistricts[fd].sales += sales;
          if (drug) {
            const dsArr = th.federalDistricts[fd].drugSales as any[];
            const ex = dsArr.find((d: any) => d.name === drug);
            if (ex) ex.sales += sales;
            else dsArr.push({ name: drug, sales });
          }
        }

        if (region) {
          if (!th.regions[region]) th.regions[region] = { sales: 0, contragentCount: 0, drugSales: [], children: {} };
          th.regions[region].sales += sales;
          if (drug) {
            const dsArr = th.regions[region].drugSales as any[];
            const ex = dsArr.find((d: any) => d.name === drug);
            if (ex) ex.sales += sales;
            else dsArr.push({ name: drug, sales });
          }
          if (row.city) {
            const city = row.city;
            if (!th.regions[region].children[city]) th.regions[region].children[city] = { sales: 0, contragentCount: 0, drugSales: [], children: {} };
            th.regions[region].children[city].sales += sales;
            if (drug) {
              const cdsArr = th.regions[region].children[city].drugSales as any[];
              const cex = cdsArr.find((d: any) => d.name === drug);
              if (cex) cex.sales += sales;
              else cdsArr.push({ name: drug, sales });
            }
          }
        }
      }

      if (contragentRows && contragentRows.length > 0) {
        const cFiltered = contragentRows.filter((crow: any) => {
          return yearsWithCompact.has(String(crow.year)) && crow.month === selectedMonth;
        });
        for (const crow of cFiltered) {
          if (crow.drug && crow.contragent) {
            if (!drugContragentSets.has(crow.drug)) drugContragentSets.set(crow.drug, new Set());
            drugContragentSets.get(crow.drug)!.add(crow.contragent);
          }
        }
      }

      const contragentsByFd = new Map<string, Set<string>>();
      for (const row of allRows.filter((r: any) => yearsWithCompact.has(String(r.year)) && r.month === selectedMonth)) {
        if (row.federalDistrict && row.contragent) {
          if (!contragentsByFd.has(row.federalDistrict)) contragentsByFd.set(row.federalDistrict, new Set());
          contragentsByFd.get(row.federalDistrict)!.add(row.contragent);
        }
      }
      for (const [fdName, fd] of Object.entries(th.federalDistricts) as [string, any][]) {
        fd.contragentCount = contragentsByFd.get(fdName)?.size || 0;
      }
    }

    if (hasProportional) {
      for (const [yr, ratio] of monthRatios) {
        const yd = perYearData.get(yr);
        if (!yd) continue;

        if (yd.territoryHierarchy?.federalDistricts) {
          for (const [fdName, fdData] of Object.entries(yd.territoryHierarchy.federalDistricts) as [string, any][]) {
            if (!th.federalDistricts[fdName]) th.federalDistricts[fdName] = { sales: 0, contragentCount: 0, drugSales: [] };
            const ex = th.federalDistricts[fdName];
            ex.sales += Math.round((fdData.sales || 0) * ratio);
            ex.contragentCount += (fdData.contragentCount || 0);
            if (fdData.drugSales) {
              for (const d of fdData.drugSales) {
                const scaled = Math.round((d.sales || 0) * ratio);
                const exd = (ex.drugSales as any[]).find((x: any) => x.name === d.name);
                if (exd) exd.sales += scaled;
                else (ex.drugSales as any[]).push({ name: d.name, sales: scaled });
              }
            }
          }
        }

        if (yd.territoryHierarchy?.regions) {
          for (const [rName, rData] of Object.entries(yd.territoryHierarchy.regions) as [string, any][]) {
            if (!th.regions[rName]) th.regions[rName] = { sales: 0, contragentCount: 0, drugSales: [], children: {} };
            const exR = th.regions[rName];
            exR.sales += Math.round((rData.sales || 0) * ratio);
            exR.contragentCount += (rData.contragentCount || 0);
            if (rData.drugSales) {
              for (const d of rData.drugSales) {
                const scaled = Math.round((d.sales || 0) * ratio);
                const exd = (exR.drugSales as any[]).find((x: any) => x.name === d.name);
                if (exd) exd.sales += scaled;
                else (exR.drugSales as any[]).push({ name: d.name, sales: scaled });
              }
            }
            if (rData.children) {
              for (const [cName, cData] of Object.entries(rData.children) as [string, any][]) {
                if (!exR.children[cName]) exR.children[cName] = { sales: 0, contragentCount: 0, drugSales: [], children: {} };
                exR.children[cName].sales += Math.round((cData.sales || 0) * ratio);
                exR.children[cName].contragentCount += (cData.contragentCount || 0);
                if (cData.drugSales) {
                  for (const d of cData.drugSales) {
                    const scaled = Math.round((d.sales || 0) * ratio);
                    const exd = (exR.children[cName].drugSales as any[]).find((x: any) => x.name === d.name);
                    if (exd) exd.sales += scaled;
                    else (exR.children[cName].drugSales as any[]).push({ name: d.name, sales: scaled });
                  }
                }
                if (cData.children) {
                  if (!exR.children[cName].children) exR.children[cName].children = {};
                  for (const [dName, dData] of Object.entries(cData.children) as [string, any][]) {
                    if (!exR.children[cName].children[dName]) exR.children[cName].children[dName] = { sales: 0, contragentCount: 0, drugSales: [] };
                    exR.children[cName].children[dName].sales += Math.round(((dData as any).sales || 0) * ratio);
                    exR.children[cName].children[dName].contragentCount += ((dData as any).contragentCount || 0);
                  }
                }
              }
            }
          }
        }

        if (yd.drugSales) {
          for (const d of yd.drugSales) {
            const scaled = Math.round((d.sales || 0) * ratio);
            drugSalesMap.set(d.name, (drugSalesMap.get(d.name) || 0) + scaled);
          }
        }
        if (yd.federalDistrictSales) {
          for (const f of yd.federalDistrictSales) {
            fdSalesMap.set(f.name, (fdSalesMap.get(f.name) || 0) + Math.round((f.sales || 0) * ratio));
          }
        }
        if (yd.regionSales) {
          for (const r of yd.regionSales) {
            regionSalesMap.set(r.name, (regionSalesMap.get(r.name) || 0) + Math.round((r.sales || 0) * ratio));
          }
        }
        if (yd.contragentSales) {
          for (const c of yd.contragentSales) {
            contragentSalesMap.set(c.name, (contragentSalesMap.get(c.name) || 0) + Math.round((c.sales || 0) * ratio));
            if (c.drug && c.name) {
              if (!drugContragentSets.has(c.drug)) drugContragentSets.set(c.drug, new Set());
              drugContragentSets.get(c.drug)!.add(c.name);
            }
          }
        }

        const drugAnalytics = yd.drugAnalytics;
        if (drugAnalytics && typeof drugAnalytics === 'object') {
          for (const [drugName, analytics] of Object.entries(drugAnalytics) as [string, any][]) {
            if (analytics?.contragentSales && Array.isArray(analytics.contragentSales)) {
              if (!drugContragentSets.has(drugName)) drugContragentSets.set(drugName, new Set());
              analytics.contragentSales.forEach((cs: any) => {
                if (cs.name) drugContragentSets.get(drugName)!.add(cs.name);
              });
            }
          }
        }
      }
    }

    const mode = hasExact && hasProportional ? 'exact+proportional' : hasExact ? 'exact' : 'proportional';
    return {
      th,
      drugSalesArr: Array.from(drugSalesMap.entries()).map(([name, sales]) => ({ name, sales })),
      fdSalesArr: Array.from(fdSalesMap.entries()).map(([name, sales]) => ({ name, sales })),
      regionSalesArr: Array.from(regionSalesMap.entries()).map(([name, sales]) => ({ name, sales })),
      contragentSalesArr: Array.from(contragentSalesMap.entries()).map(([name, sales]) => ({ name, sales })),
      drugContragentSets,
      mode,
    };
  }

  router.get("/wm-dashboard", authMiddleware, async (req: AuthRequest, res: Response) => {
    const t0 = Date.now();
    try {
      const userId = req.userId!;
      const { merged, perYearData } = await loadAggregatedData(userId);
      if (!merged) return res.json({ hasData: false });

      const filters = parseFilters(req.query);
      const { rows: compactRows, contragentRows } = await loadCompactRowsIfNeeded(userId, filters);
      const filtered = applyFilters(merged, filters, compactRows, contragentRows, perYearData);

      const wmYear = req.query.wmYear as string || 'Все';
      const wmMonthRaw = req.query.wmMonth as string || 'Все';
      const FULL_TO_SHORT: Record<string, string> = {
        'Январь': 'Янв', 'Февраль': 'Фев', 'Март': 'Мар', 'Апрель': 'Апр',
        'Май': 'Май', 'Июнь': 'Июн', 'Июль': 'Июл', 'Август': 'Авг',
        'Сентябрь': 'Сен', 'Октябрь': 'Окт', 'Ноябрь': 'Ноя', 'Декабрь': 'Дек',
      };
      const wmMonth = (wmMonthRaw && wmMonthRaw !== 'Все' && wmMonthRaw !== 'all')
        ? (FULL_TO_SHORT[wmMonthRaw] || wmMonthRaw) : '';

      const allLoadedYears = Array.from(perYearData.keys());
      const selectedYears = (wmYear && wmYear !== 'Все' && wmYear !== 'all')
        ? [wmYear]
        : filters.selectedYears.length > 0 ? filters.selectedYears : [];
      const yearsToProcess = selectedYears.length > 0 ? selectedYears : allLoadedYears;

      const filtersActive = hasActiveFilters(filters);

      let th: any = { federalDistricts: {}, regions: {} };
      let fdSalesArr: any[] = [];
      let drugSalesArr: any[] = [];
      let regionSalesArr: any[] = [];
      let contragentSalesArr: any[] = [];

      const monthData = wmMonth ? buildWmMonthFiltered(null, null, yearsToProcess, wmMonth, perYearData) : null;

      if (wmMonth && !monthData) {
        console.log(`[API] GET /wm-dashboard userId=${userId}, wmYear=${wmYear}, wmMonth=${wmMonthRaw} → нет данных за этот месяц → ${Date.now() - t0}мс`);
        return res.json({
          hasData: true,
          totalPackages: 0, totalRows: 0, totalContragents: 0, totalRegions: 0,
          byDistrict: [], byDrug: [],
        });
      }

      if (filtersActive && !wmMonth) {
        th = filtered.territoryHierarchy || merged.territoryHierarchy || { federalDistricts: {}, regions: {} };
        drugSalesArr = filtered.drugSales || [];
        regionSalesArr = filtered.regionSales || [];
        contragentSalesArr = filtered.contragentSales || [];
        if (th.federalDistricts) {
          for (const fd of Object.values(th.federalDistricts) as any[]) {
            fdSalesArr.push({ name: '', sales: fd.sales || 0 });
          }
        }
      } else if (monthData) {
        th = monthData.th;
        fdSalesArr = monthData.fdSalesArr;
        drugSalesArr = monthData.drugSalesArr;
        regionSalesArr = monthData.regionSalesArr;
        contragentSalesArr = monthData.contragentSalesArr;
      } else {
        for (const yearStr of yearsToProcess) {
          const yearData = perYearData.get(yearStr);
          if (!yearData) continue;

          if (yearData.territoryHierarchy) {
            const yth = yearData.territoryHierarchy;
            if (yth.federalDistricts) {
              for (const [fdName, fdData] of Object.entries(yth.federalDistricts) as [string, any][]) {
                if (!th.federalDistricts[fdName]) {
                  th.federalDistricts[fdName] = { sales: 0, contragentCount: 0, drugSales: [] };
                }
                const existing = th.federalDistricts[fdName];
                existing.sales += (fdData.sales || 0);
                existing.contragentCount += (fdData.contragentCount || 0);
                if (fdData.drugSales) {
                  const dm = new Map<string, number>();
                  (existing.drugSales || []).forEach((d: any) => dm.set(d.name, d.sales || 0));
                  fdData.drugSales.forEach((d: any) => dm.set(d.name, (dm.get(d.name) || 0) + (d.sales || 0)));
                  existing.drugSales = Array.from(dm.entries()).map(([name, sales]) => ({ name, sales }));
                }
              }
            }
            if (yth.regions) {
              for (const [rName, rData] of Object.entries(yth.regions) as [string, any][]) {
                if (!th.regions[rName]) {
                  th.regions[rName] = { sales: 0, contragentCount: 0, drugSales: [], children: {} };
                }
                th.regions[rName].sales += (rData.sales || 0);
                th.regions[rName].contragentCount += (rData.contragentCount || 0);
                if (rData.drugSales && Array.isArray(rData.drugSales)) {
                  const dm = new Map<string, number>();
                  (th.regions[rName].drugSales || []).forEach((d: any) => dm.set(d.name, d.sales || 0));
                  rData.drugSales.forEach((d: any) => dm.set(d.name, (dm.get(d.name) || 0) + (d.sales || 0)));
                  th.regions[rName].drugSales = Array.from(dm.entries()).map(([name, sales]) => ({ name, sales })).sort((a, b) => b.sales - a.sales);
                }
                if (rData.children && typeof rData.children === 'object') {
                  if (!th.regions[rName].children) th.regions[rName].children = {};
                  for (const [cName, cData] of Object.entries(rData.children) as [string, any][]) {
                    if (!th.regions[rName].children[cName]) {
                      th.regions[rName].children[cName] = { sales: 0 };
                    }
                    th.regions[rName].children[cName].sales += (cData.sales || 0);
                  }
                }
              }
            }
          }

          if (yearData.federalDistrictSales) {
            for (const fd of yearData.federalDistrictSales) {
              const ex = fdSalesArr.find((f: any) => f.name === fd.name);
              if (ex) ex.sales += (fd.sales || 0);
              else fdSalesArr.push({ name: fd.name, sales: fd.sales || 0 });
            }
          }
          if (yearData.drugSales) {
            for (const d of yearData.drugSales) {
              const ex = drugSalesArr.find((e: any) => e.name === d.name);
              if (ex) ex.sales += (d.sales || 0);
              else drugSalesArr.push({ name: d.name, sales: d.sales || 0 });
            }
          }
          if (yearData.regionSales) {
            for (const r of yearData.regionSales) {
              const ex = regionSalesArr.find((e: any) => e.name === r.name);
              if (ex) ex.sales += (r.sales || 0);
              else regionSalesArr.push({ name: r.name, sales: r.sales || 0 });
            }
          }
          if (yearData.contragentSales) {
            for (const c of yearData.contragentSales) {
              const ex = contragentSalesArr.find((e: any) => e.name === c.name);
              if (ex) ex.sales += (c.sales || 0);
              else contragentSalesArr.push({ ...c });
            }
          }
        }
      }

      const fdEntries = Object.entries(th.federalDistricts || {}) as [string, any][];
      let totalPackages = 0;
      const byDistrict: { name: string; packages: number; contragents: number; regions: number }[] = [];
      const drugTotals = new Map<string, number>();
      let totalContragents = 0;
      const allRegions = new Set<string>();

      for (const [fdName, fd] of fdEntries) {
        const fdSales = fd.sales || 0;
        totalPackages += fdSales;
        const fdContragents = fd.contragentCount || 0;
        totalContragents += fdContragents;

        byDistrict.push({
          name: fdName,
          packages: fdSales,
          contragents: fdContragents,
          regions: Object.keys(th.regions || {}).length,
        });

        (fd.drugSales || []).forEach((ds: any) => {
          drugTotals.set(ds.name, (drugTotals.get(ds.name) || 0) + (ds.sales || 0));
        });
      }

      if (totalPackages === 0) {
        totalPackages = regionSalesArr.reduce((s, r) => s + (r.sales || 0), 0);
        if (totalPackages === 0) {
          totalPackages = fdSalesArr.reduce((s, f) => s + (f.sales || 0), 0);
        }
      }

      Object.keys(th.regions || {}).forEach((r: string) => allRegions.add(r));

      const byDrug = Array.from(drugTotals.entries())
        .map(([name, packages]) => ({ name, packages }))
        .sort((a, b) => b.packages - a.packages);

      if (byDrug.length === 0) {
        drugSalesArr.sort((a, b) => b.sales - a.sales);
        drugSalesArr.forEach((d: any) => byDrug.push({ name: d.name, packages: d.sales || 0 }));
      }

      byDistrict.sort((a, b) => b.packages - a.packages);

      console.log(`[API] GET /wm-dashboard userId=${userId}, wmYear=${wmYear}, wmMonth=${wmMonthRaw}, filtersActive=${filtersActive}, итого упаковок=${totalPackages}, округов=${byDistrict.length}, регионов=${allRegions.size} → ${Date.now() - t0}мс`);
      res.json({
        hasData: true,
        totalPackages,
        totalRows: totalPackages,
        totalContragents: totalContragents || contragentSalesArr.length,
        totalRegions: allRegions.size || regionSalesArr.length,
        byDistrict,
        byDrug,
      });
    } catch (error) {
      console.error(`[API] GET /wm-dashboard ERROR (${Date.now() - t0}мс):`, error);
      res.status(500).json({ error: "Ошибка загрузки WM дашборда" });
    }
  });

  router.get("/wm-districts", authMiddleware, async (req: AuthRequest, res: Response) => {
    const t0 = Date.now();
    try {
      const userId = req.userId!;
      const { merged, perYearData } = await loadAggregatedData(userId);
      if (!merged) return res.json({ hasData: false });

      const filters = parseFilters(req.query);
      const { rows: compactRows, contragentRows } = await loadCompactRowsIfNeeded(userId, filters);
      const filtered = applyFilters(merged, filters, compactRows, contragentRows, perYearData);
      const filtersActive = hasActiveFilters(filters);

      const { wmDistrict } = req.query;
      const wmYear = req.query.wmYear as string || 'Все';
      const wmMonthRaw = req.query.wmMonth as string || 'Все';
      const FULL_TO_SHORT: Record<string, string> = {
        'Январь': 'Янв', 'Февраль': 'Фев', 'Март': 'Мар', 'Апрель': 'Апр',
        'Май': 'Май', 'Июнь': 'Июн', 'Июль': 'Июл', 'Август': 'Авг',
        'Сентябрь': 'Сен', 'Октябрь': 'Окт', 'Ноябрь': 'Ноя', 'Декабрь': 'Дек',
      };
      const wmMonth = (wmMonthRaw && wmMonthRaw !== 'Все' && wmMonthRaw !== 'all')
        ? (FULL_TO_SHORT[wmMonthRaw] || wmMonthRaw) : '';

      const allLoadedYears = Array.from(perYearData.keys());
      const selectedYears = (wmYear && wmYear !== 'Все' && wmYear !== 'all')
        ? [wmYear]
        : filters.selectedYears.length > 0 ? filters.selectedYears : [];
      const yearsToProcess = selectedYears.length > 0 ? selectedYears : allLoadedYears;

      let th: any = { federalDistricts: {}, regions: {} };
      const monthData = wmMonth ? buildWmMonthFiltered(null, null, yearsToProcess, wmMonth, perYearData) : null;

      if (wmMonth && !monthData) {
        console.log(`[API] GET /wm-districts userId=${userId}, wmYear=${wmYear}, wmMonth=${wmMonthRaw} → нет данных за этот месяц → ${Date.now() - t0}мс`);
        return res.json({ hasData: true, totalRows: 0, stats: {}, byDistrict: [] });
      }

      if (filtersActive && !wmMonth) {
        th = filtered.territoryHierarchy || merged.territoryHierarchy || { federalDistricts: {}, regions: {} };
      } else if (monthData) {
        th = monthData.th;
      } else {
        for (const yearStr of yearsToProcess) {
          const yearData = perYearData.get(yearStr);
          if (!yearData?.territoryHierarchy) continue;
          const yth = yearData.territoryHierarchy;
          if (yth.federalDistricts) {
            for (const [fdName, fdData] of Object.entries(yth.federalDistricts) as [string, any][]) {
              if (!th.federalDistricts[fdName]) th.federalDistricts[fdName] = { sales: 0, contragentCount: 0, drugSales: [] };
              const ex = th.federalDistricts[fdName];
              ex.sales += (fdData.sales || 0);
              ex.contragentCount += (fdData.contragentCount || 0);
              if (fdData.drugSales) {
                const dm = new Map<string, number>();
                (ex.drugSales || []).forEach((d: any) => dm.set(d.name, d.sales || 0));
                fdData.drugSales.forEach((d: any) => dm.set(d.name, (dm.get(d.name) || 0) + (d.sales || 0)));
                ex.drugSales = Array.from(dm.entries()).map(([name, sales]) => ({ name, sales }));
              }
            }
          }
          if (yth.regions) {
            for (const [rName, rData] of Object.entries(yth.regions) as [string, any][]) {
              if (!th.regions[rName]) th.regions[rName] = { sales: 0, contragentCount: 0, drugSales: [], children: {} };
              const ex = th.regions[rName];
              ex.sales += (rData.sales || 0);
              ex.contragentCount += (rData.contragentCount || 0);
              if (rData.drugSales) {
                const dm = new Map<string, number>();
                (ex.drugSales || []).forEach((d: any) => dm.set(d.name, d.sales || 0));
                rData.drugSales.forEach((d: any) => dm.set(d.name, (dm.get(d.name) || 0) + (d.sales || 0)));
                ex.drugSales = Array.from(dm.entries()).map(([name, sales]) => ({ name, sales }));
              }
              if (rData.children) {
                if (!ex.children) ex.children = {};
                for (const [cName, cData] of Object.entries(rData.children) as [string, any][]) {
                  if (!ex.children[cName]) ex.children[cName] = { sales: 0, contragentCount: 0, drugSales: [], children: {} };
                  ex.children[cName].sales += (cData.sales || 0);
                  ex.children[cName].contragentCount += (cData.contragentCount || 0);
                  if (cData.drugSales) {
                    const dm2 = new Map<string, number>();
                    (ex.children[cName].drugSales || []).forEach((d: any) => dm2.set(d.name, d.sales || 0));
                    cData.drugSales.forEach((d: any) => dm2.set(d.name, (dm2.get(d.name) || 0) + (d.sales || 0)));
                    ex.children[cName].drugSales = Array.from(dm2.entries()).map(([name, sales]) => ({ name, sales }));
                  }
                  if (cData.children) {
                    if (!ex.children[cName].children) ex.children[cName].children = {};
                    for (const [dName, dData] of Object.entries(cData.children) as [string, any][]) {
                      if (!ex.children[cName].children[dName]) ex.children[cName].children[dName] = { sales: 0, contragentCount: 0, drugSales: [] };
                      ex.children[cName].children[dName].sales += (dData.sales || 0);
                      ex.children[cName].children[dName].contragentCount += (dData.contragentCount || 0);
                    }
                  }
                }
              }
            }
          }
        }
      }

      console.log(`[API] GET /wm-districts userId=${userId}, wmYear=${wmYear}, wmMonth=${wmMonthRaw}, filtersActive=${filtersActive}, monthFiltered=${!!monthData}${monthData ? ' mode=' + monthData.mode : ''}, годы=[${yearsToProcess}]`);
      const fdEntries = Object.entries(th.federalDistricts || {}) as [string, any][];

      const stats: Record<string, any> = {};
      const byDistrict: any[] = [];

      for (const [fdName, fd] of fdEntries) {
        if (wmDistrict && wmDistrict !== fdName) continue;
        const fdDrugs: Record<string, number> = {};
        (fd.drugSales || []).forEach((ds: any) => { fdDrugs[ds.name] = (fdDrugs[ds.name] || 0) + (ds.sales || 0); });

        const regions: Record<string, any> = {};
        const byDistrictRegions: any[] = [];

        for (const [rName, region] of Object.entries(th.regions || {}) as [string, any][]) {
          const cities: Record<string, any> = {};
          const rDrugs: Record<string, number> = {};
          let rPackages = 0;
          (region.drugSales || []).forEach((ds: any) => { rDrugs[ds.name] = (rDrugs[ds.name] || 0) + (ds.sales || 0); });
          rPackages = region.sales || 0;

          for (const [cName, city] of Object.entries(region.children || {}) as [string, any][]) {
            const cDrugs: Record<string, number> = {};
            (city.drugSales || []).forEach((ds: any) => { cDrugs[ds.name] = (cDrugs[ds.name] || 0) + (ds.sales || 0); });
            const districts: Record<string, any> = {};
            for (const [dName, dist] of Object.entries(city.children || {}) as [string, any][]) {
              const dDrugs: Record<string, number> = {};
              (dist.drugSales || []).forEach((ds: any) => { dDrugs[ds.name] = (dDrugs[ds.name] || 0) + (ds.sales || 0); });
              districts[dName] = { packages: dist.sales || 0, drugs: dDrugs };
            }
            cities[cName] = { packages: city.sales || 0, drugs: cDrugs, districts };
          }

          regions[rName] = { packages: rPackages, drugs: rDrugs, cities };
          byDistrictRegions.push({ name: rName, packages: rPackages, contragents: region.contragentCount || 0 });
        }

        stats[fdName] = { packages: fd.sales || 0, drugs: fdDrugs, regions };
        byDistrict.push({
          name: fdName,
          packages: fd.sales || 0,
          regions: byDistrictRegions.sort((a, b) => b.packages - a.packages),
        });
      }

      byDistrict.sort((a, b) => b.packages - a.packages);

      const totalRows = monthData
        ? Object.values(th.federalDistricts || {}).reduce((s: number, fd: any) => s + (fd.sales || 0), 0)
        : (merged.federalDistrictSales || []).reduce((s: number, f: any) => s + (f.sales || 0), 0);
      console.log(`[API] GET /wm-districts userId=${userId}, totalRows=${totalRows} → ${Date.now() - t0}мс`);
      res.json({ hasData: true, totalRows, stats, byDistrict });
    } catch (error) {
      console.error(`[API] GET /wm-districts ERROR (${Date.now() - t0}мс):`, error);
      res.status(500).json({ error: "Ошибка загрузки WM округов" });
    }
  });

  router.get("/wm-products", authMiddleware, async (req: AuthRequest, res: Response) => {
    const t0 = Date.now();
    try {
      const userId = req.userId!;
      const { merged, perYearData } = await loadAggregatedData(userId);
      if (!merged) return res.json({ hasData: false });

      const filters = parseFilters(req.query);
      const { rows: compactRows, contragentRows } = await loadCompactRowsIfNeeded(userId, filters);
      const filtered = applyFilters(merged, filters, compactRows, contragentRows, perYearData);

      const wmYear = req.query.wmYear as string || 'Все';
      const wmMonthRaw = req.query.wmMonth as string || 'Все';
      const FULL_TO_SHORT: Record<string, string> = {
        'Январь': 'Янв', 'Февраль': 'Фев', 'Март': 'Мар', 'Апрель': 'Апр',
        'Май': 'Май', 'Июнь': 'Июн', 'Июль': 'Июл', 'Август': 'Авг',
        'Сентябрь': 'Сен', 'Октябрь': 'Окт', 'Ноябрь': 'Ноя', 'Декабрь': 'Дек',
      };
      const wmMonth = (wmMonthRaw && wmMonthRaw !== 'Все' && wmMonthRaw !== 'all')
        ? (FULL_TO_SHORT[wmMonthRaw] || wmMonthRaw) : '';

      const allLoadedYears = Array.from(perYearData.keys());
      const filtersActive = hasActiveFilters(filters);
      const wmSelectedYears = (wmYear && wmYear !== 'Все' && wmYear !== 'all')
        ? [wmYear]
        : filters.selectedYears.length > 0 ? filters.selectedYears : [];
      const yearsToProcess = wmSelectedYears.length > 0 ? wmSelectedYears : allLoadedYears;

      const monthData = wmMonth ? buildWmMonthFiltered(null, null, yearsToProcess, wmMonth, perYearData) : null;

      if (wmMonth && !monthData) {
        console.log(`[API] GET /wm-products userId=${userId}, wmYear=${wmYear}, wmMonth=${wmMonthRaw} → нет данных за этот месяц → ${Date.now() - t0}мс`);
        return res.json({ hasData: true, byProduct: [] });
      }

      let th: any = { federalDistricts: {} };
      let drugContragentSets: Map<string, Set<string>>;

      if (filtersActive && !wmMonth) {
        const filteredTh = filtered.territoryHierarchy || merged.territoryHierarchy || { federalDistricts: {} };
        th = { federalDistricts: filteredTh.federalDistricts || {} };

        drugContragentSets = new Map<string, Set<string>>();
        const drugAnalyticsSource = filtered.drugAnalytics || merged.drugAnalytics;
        if (drugAnalyticsSource) {
          for (const [drugName, analytics] of Object.entries(drugAnalyticsSource) as [string, any][]) {
            if (analytics?.contragentSales && Array.isArray(analytics.contragentSales)) {
              if (!drugContragentSets.has(drugName)) drugContragentSets.set(drugName, new Set());
              analytics.contragentSales.forEach((cs: any) => {
                if (cs.name) drugContragentSets.get(drugName)!.add(cs.name);
              });
            }
          }
        }
      } else if (monthData) {
        th = monthData.th;
        drugContragentSets = monthData.drugContragentSets;
      } else {
        for (const yearStr of yearsToProcess) {
          const yearData = perYearData.get(yearStr);
          if (!yearData?.territoryHierarchy?.federalDistricts) continue;
          for (const [fdName, fdData] of Object.entries(yearData.territoryHierarchy.federalDistricts) as [string, any][]) {
            if (!th.federalDistricts[fdName]) th.federalDistricts[fdName] = { sales: 0, contragentCount: 0, drugSales: [] };
            const ex = th.federalDistricts[fdName];
            ex.sales += (fdData.sales || 0);
            ex.contragentCount += (fdData.contragentCount || 0);
            if (fdData.drugSales) {
              const dm = new Map<string, number>();
              (ex.drugSales || []).forEach((d: any) => dm.set(d.name, d.sales || 0));
              fdData.drugSales.forEach((d: any) => dm.set(d.name, (dm.get(d.name) || 0) + (d.sales || 0)));
              ex.drugSales = Array.from(dm.entries()).map(([name, sales]) => ({ name, sales }));
            }
          }
        }

        drugContragentSets = new Map<string, Set<string>>();

        for (const yearStr of yearsToProcess) {
          const yearData = perYearData.get(yearStr);
          if (!yearData?.drugAnalytics) continue;
          for (const [drugName, analytics] of Object.entries(yearData.drugAnalytics) as [string, any][]) {
            if (analytics?.contragentSales && Array.isArray(analytics.contragentSales)) {
              if (!drugContragentSets.has(drugName)) drugContragentSets.set(drugName, new Set());
              analytics.contragentSales.forEach((cs: any) => {
                if (cs.name) drugContragentSets.get(drugName)!.add(cs.name);
              });
            }
          }
        }

        const drugAnalyticsSource = filtered.drugAnalytics || merged.drugAnalytics;
        if (drugAnalyticsSource) {
          Object.entries(drugAnalyticsSource).forEach(([drugName, analytics]: [string, any]) => {
            if (analytics?.contragentSales && Array.isArray(analytics.contragentSales)) {
              if (!drugContragentSets.has(drugName)) drugContragentSets.set(drugName, new Set());
              analytics.contragentSales.forEach((cs: any) => {
                if (cs.name) drugContragentSets.get(drugName)!.add(cs.name);
              });
            }
          });
        }

      }

      {
        const totalContragentsFound = Array.from(drugContragentSets.values()).reduce((sum, s) => sum + s.size, 0);
        if (totalContragentsFound === 0) {
          try {
            const yearFilter = yearsToProcess.length > 0
              ? `AND (elem->>'year')::text = ANY($2)`
              : '';
            const params: any[] = [userId];
            if (yearsToProcess.length > 0) params.push(yearsToProcess.map(String));
            const sqlQ = `
              SELECT elem->>'drug' as drug, COUNT(DISTINCT elem->>'contragent') as cnt
              FROM world_medicine.yearly_sales_data,
                   jsonb_array_elements(aggregated_data->'contragentRows') AS elem
              WHERE user_id = $1 AND year = 9999 AND data_type LIKE 'compactRows%'
                ${yearFilter}
              GROUP BY elem->>'drug'
            `;
            const contraRes = await safeQuery(sqlQ, params);
            if (contraRes.rows.length > 0) {
              for (const row of contraRes.rows) {
                if (row.drug) {
                  const fakeSet = new Set<string>();
                  const cnt = parseInt(row.cnt);
                  for (let i = 0; i < cnt; i++) fakeSet.add(`__c${i}`);
                  drugContragentSets.set(row.drug, fakeSet);
                }
              }
              console.log(`[wm-products] SQL contragentRows fallback: ${contraRes.rows.length} drugs, sample: ${contraRes.rows.slice(0,3).map((r: any) => `${r.drug?.substring(0,20)}=${r.cnt}`).join(', ')}`);
            }
          } catch (err: any) {
            console.warn(`[wm-products] contragentRows SQL fallback error:`, err.message);
          }
        }
      }

      const fdEntries = Object.entries(th.federalDistricts || {}) as [string, any][];
      const drugDistrictMap = new Map<string, { packages: number; districts: Record<string, number>; contragents: number }>();

      for (const [fdName, fd] of fdEntries) {
        (fd.drugSales || []).forEach((ds: any) => {
          const existing = drugDistrictMap.get(ds.name);
          if (existing) {
            existing.packages += ds.sales || 0;
            existing.districts[fdName] = (existing.districts[fdName] || 0) + (ds.sales || 0);
          } else {
            drugDistrictMap.set(ds.name, {
              packages: ds.sales || 0,
              districts: { [fdName]: ds.sales || 0 },
              contragents: drugContragentSets.get(ds.name)?.size || 0,
            });
          }
        });
      }

      if (!monthData) {
        const yearFilteredDrugSales = new Map<string, number>();
        if (filtersActive) {
          const fds = filtered.drugSales || merged.drugSales || [];
          for (const d of fds) {
            yearFilteredDrugSales.set(d.name, (yearFilteredDrugSales.get(d.name) || 0) + (d.sales || 0));
          }
        } else {
          for (const yearStr of yearsToProcess) {
            const yearData = perYearData.get(yearStr);
            if (yearData?.drugSales) {
              for (const d of yearData.drugSales) {
                yearFilteredDrugSales.set(d.name, (yearFilteredDrugSales.get(d.name) || 0) + (d.sales || 0));
              }
            }
          }
        }
        const authoritativeDrugSales = Array.from(yearFilteredDrugSales.entries()).map(([name, sales]) => ({ name, sales }));
        if (authoritativeDrugSales.length > 0) {
          authoritativeDrugSales.forEach((d: any) => {
            const existing = drugDistrictMap.get(d.name);
            const authTotal = d.sales || 0;
            if (!existing) {
              drugDistrictMap.set(d.name, { packages: authTotal, districts: {}, contragents: drugContragentSets.get(d.name)?.size || 0 });
            } else if (existing.packages < authTotal) {
              const diff = authTotal - existing.packages;
              existing.packages = authTotal;
              existing.districts['Без округа'] = (existing.districts['Без округа'] || 0) + diff;
            }
          });
        }
      }

      for (const [drugName, entry] of drugDistrictMap) {
        if (entry.contragents === 0) {
          entry.contragents = drugContragentSets.get(drugName)?.size || 0;
        }
      }

      const byProduct = Array.from(drugDistrictMap.entries())
        .map(([name, d]) => ({
          name,
          packages: d.packages,
          districts: Object.entries(d.districts).map(([dName, packages]) => ({ name: dName, packages })).sort((a, b) => b.packages - a.packages),
          contragents: d.contragents,
        }))
        .sort((a, b) => b.packages - a.packages);

      const artoxan = byProduct.find(p => p.name.includes('Артоксан') || p.name.includes('артоксан'));
      const sampleDrug = byProduct[0];
      console.log(`[API] GET /wm-products userId=${userId}, wmYear=${wmYear}, wmMonth=${wmMonthRaw}, monthFiltered=${!!monthData}${monthData ? ' mode=' + monthData.mode : ''}, yearsToProcess=[${yearsToProcess}], drugDistrictMap=${drugDistrictMap.size}, drugContragentSets=${drugContragentSets.size}, fdCount=${Object.keys(th.federalDistricts || {}).length}, sample=${sampleDrug?.name}: ${sampleDrug?.districts.length}окр/${sampleDrug?.contragents}контр, Артоксан=${artoxan?.packages || 'N/A'}/${artoxan?.districts.length || 0}окр/${artoxan?.contragents || 0}контр → ${Date.now() - t0}мс`);
      res.json({ hasData: true, byProduct });
    } catch (error) {
      console.error(`[API] GET /wm-products ERROR (${Date.now() - t0}мс):`, error);
      res.status(500).json({ error: "Ошибка загрузки WM препаратов" });
    }
  });

  router.get("/drilldown", authMiddleware, async (req: AuthRequest, res: Response) => {
    const t0 = Date.now();
    try {
      const userId = req.userId!;
      const { merged, perYearData } = await loadAggregatedData(userId);
      if (!merged) return res.json({ hasData: false });

      const filters = parseFilters(req.query);
      const filtersActive = hasActiveFilters(filters);
      const t1 = Date.now();
      console.log(`[Drilldown] loading compact rows for userId=${userId} (always for drilldown)`);
      const sql = `SELECT data_type, aggregated_data FROM world_medicine.yearly_sales_data WHERE user_id = $1 AND year = 9999 AND data_type LIKE 'compactRows%' ORDER BY data_type`;
      const result = await safeQuery(sql, [userId]);
      let allRows: any[] = [];
      let allContra: any[] = [];
      if (result.rows.length === 1 && result.rows[0].data_type === 'compactRows') {
        const data = result.rows[0].aggregated_data;
        allRows = data.rows || [];
        allContra = data.contragentRows || [];
      } else {
        for (const rec of result.rows) {
          const d = rec.aggregated_data;
          if (d.rows) allRows = allRows.concat(d.rows);
          if (d.contragentRows) allContra = allContra.concat(d.contragentRows);
        }
      }
      console.log(`[Drilldown] compact rows: ${allRows.length} rows, ${allContra.length} contragent rows (${Date.now() - t1}ms)`);

      const filtered = applyFilters(merged, filters, filtersActive ? allRows : null, filtersActive ? allContra : null, perYearData);

      const th = filtered.territoryHierarchy || merged.territoryHierarchy || { federalDistricts: {}, regions: {}, cities: {}, districts: {} };
      const regions = th.regions || {};
      for (const rName of Object.keys(regions)) {
        const reg = regions[rName];
        reg.children = {};
      }

      const {
        selectedDrugs = [],
        selectedRegions = [],
        selectedYears = [],
        selectedMonth = '',
        selectedDisposalTypes = [],
        selectedFederalDistricts = [],
        selectedContractorGroups = [],
      } = filters;

      for (const row of allRows) {
        if (!row.city || !row.region) continue;
        const reg = regions[row.region];
        if (!reg) continue;

        const matchesDrug = selectedDrugs.length === 0 ||
          selectedDrugs.some((d: string) => row.drug?.includes(d) || d.includes(row.drug));
        const matchesRegion = selectedRegions.length === 0 || selectedRegions.includes(row.region);
        const matchesYear = selectedYears.length === 0 || selectedYears.includes(String(row.year));
        const matchesMonth = !selectedMonth || row.month === selectedMonth;
        const matchesDT = selectedDisposalTypes.length === 0 || selectedDisposalTypes.includes(row.disposalType);
        const matchesFD = selectedFederalDistricts.length === 0 || selectedFederalDistricts.includes(row.federalDistrict);
        const matchesCG = selectedContractorGroups.length === 0 ||
          selectedContractorGroups.some((g: string) => (row.contractorGroup || '').includes(g));
        if (!matchesDrug || !matchesRegion || !matchesYear || !matchesMonth || !matchesDT || !matchesFD || !matchesCG) continue;

        if (!reg.children[row.city]) {
          reg.children[row.city] = { sales: 0, contragentCount: 0, drugSales: [], children: {} };
        }
        const cityObj = reg.children[row.city];
        cityObj.sales = (cityObj.sales || 0) + (row.quantity || 0);
        if (row.drug) {
          if (!cityObj._drugMap) cityObj._drugMap = new Map();
          cityObj._drugMap.set(row.drug, (cityObj._drugMap.get(row.drug) || 0) + (row.quantity || 0));
        }
      }

      const regionContraSets: Record<string, Set<string>> = {};
      for (const row of allContra) {
        if (!row.region || !row.contragent) continue;
        const reg = regions[row.region];
        if (!reg) continue;

        const matchesDrug = selectedDrugs.length === 0 ||
          selectedDrugs.some((d: string) => row.drug?.includes(d) || d.includes(row.drug));
        const matchesRegion = selectedRegions.length === 0 || selectedRegions.includes(row.region);
        const matchesYear = selectedYears.length === 0 || selectedYears.includes(String(row.year));
        const matchesMonth = !selectedMonth || row.month === selectedMonth;
        const matchesDT = selectedDisposalTypes.length === 0 || selectedDisposalTypes.includes(row.disposalType);
        const matchesFD = selectedFederalDistricts.length === 0 || selectedFederalDistricts.includes(row.federalDistrict);
        const matchesCG = selectedContractorGroups.length === 0 ||
          selectedContractorGroups.some((g: string) => (row.contractorGroup || '').includes(g));
        if (!matchesDrug || !matchesRegion || !matchesYear || !matchesMonth || !matchesDT || !matchesFD || !matchesCG) continue;

        if (!regionContraSets[row.region]) regionContraSets[row.region] = new Set();
        regionContraSets[row.region].add(row.contragent);

        if (row.city && reg.children[row.city]) {
          const cityObj = reg.children[row.city];
          if (!cityObj._contraSet) cityObj._contraSet = new Set();
          cityObj._contraSet.add(row.contragent);
        }
      }

      for (const [rName, contraSet] of Object.entries(regionContraSets)) {
        if (regions[rName]) regions[rName].contragentCount = contraSet.size;
      }

      let enrichedCities = 0;
      for (const rName of Object.keys(regions)) {
        const reg = regions[rName];
        for (const cName of Object.keys(reg.children || {})) {
          const city = reg.children[cName];
          if (city._drugMap && city._drugMap.size > 0) {
            city.drugSales = Array.from(city._drugMap.entries())
              .map(([name, sales]: [string, number]) => ({ name, sales }))
              .sort((a: any, b: any) => b.sales - a.sales);
            delete city._drugMap;
            enrichedCities++;
          }
          if (city._contraSet) {
            city.contragentCount = city._contraSet.size;
            delete city._contraSet;
          }
        }
      }

      const totalRegionSales = (filtered.regionSales || []).reduce((s: number, r: any) => s + (r.sales || 0), 0);
      const contragentCount = (filtered.contragentSales || []).length;
      console.log(`[API] GET /drilldown userId=${userId}, years=${JSON.stringify(filters.selectedYears)}, regionSales=${(filtered.regionSales || []).length}, totalSales=${totalRegionSales}, contragents=${contragentCount}, enrichedCities=${enrichedCities} → ${Date.now() - t0}мс`);
      res.json({
        hasData: true,
        territoryHierarchy: th,
        regionSales: filtered.regionSales || [],
        drugSales: filtered.drugSales || merged.drugSales || [],
        contragentSales: filtered.contragentSales || merged.contragentSales || [],
      });
    } catch (error) {
      console.error(`[API] GET /drilldown ERROR (${Date.now() - t0}мс):`, error);
      res.status(500).json({ error: "Ошибка загрузки детализации" });
    }
  });

  router.get("/reports", authMiddleware, async (req: AuthRequest, res: Response) => {
    const t0 = Date.now();
    try {
      const userId = req.userId!;
      const { merged, perYearData } = await loadAggregatedData(userId);
      if (!merged) return res.json({ hasData: false });

      const filters = parseFilters(req.query);
      const { rows: compactRows, contragentRows } = await loadCompactRowsIfNeeded(userId, filters);
      const filtered = applyFilters(merged, filters, compactRows, contragentRows, perYearData);

      console.log(`[API] GET /reports userId=${userId} → ${Date.now() - t0}мс`);
      res.json({
        hasData: true,
        monthlySales: filtered.monthlySales || [],
        regionSales: filtered.regionSales || [],
        drugSales: filtered.drugSales || [],
        contragentSales: (filtered.contragentSales || []).slice(0, 50),
        combinedData: filtered.combinedData || [],
      });
    } catch (error) {
      console.error(`[API] GET /reports ERROR (${Date.now() - t0}мс):`, error);
      res.status(500).json({ error: "Ошибка загрузки отчётов" });
    }
  });

  router.get("/percapita", authMiddleware, async (req: AuthRequest, res: Response) => {
    const t0 = Date.now();
    try {
      const userId = req.userId!;
      const { merged, perYearData } = await loadAggregatedData(userId);
      if (!merged) return res.json({ hasData: false });

      const filters = parseFilters(req.query);
      const { rows: compactRows, contragentRows } = await loadCompactRowsIfNeeded(userId, filters);
      const filtered = applyFilters(merged, filters, compactRows, contragentRows, perYearData);

      const popResult = await safeQuery('SELECT region_name, population, federal_district, manager_name FROM world_medicine.population_data');
      const populationMap = new Map<string, { population: number; federalDistrict: string; manager: string; originalName: string }>();
      for (const row of popResult.rows) {
        const normKey = normalizeRegionForComparison(row.region_name);
        populationMap.set(normKey, {
          population: parseInt(row.population),
          federalDistrict: row.federal_district || '',
          manager: row.manager_name || '',
          originalName: row.region_name,
        });
      }

      const regionSales = filtered.regionSales || merged.regionSales || [];
      const drugSales = filtered.drugSales || merged.drugSales || [];

      const drugRegionMap = new Map<string, Map<string, number>>();
      for (const [yr, yearData] of perYearData) {
        if (filters.selectedYears.length > 0 && !filters.selectedYears.includes(yr)) continue;
        if (yearData.drugAnalytics) {
          for (const [drug, analytics] of Object.entries(yearData.drugAnalytics) as [string, any][]) {
            if (filters.selectedDrugs.length > 0 && !filters.selectedDrugs.includes(drug)) continue;
            if (analytics?.regionSales && Array.isArray(analytics.regionSales)) {
              if (!drugRegionMap.has(drug)) drugRegionMap.set(drug, new Map());
              const rm = drugRegionMap.get(drug)!;
              for (const rs of analytics.regionSales) {
                const normRegion = normalizeRegionForComparison(rs.name || rs.region);
                rm.set(normRegion, (rm.get(normRegion) || 0) + (rs.sales || 0));
              }
            }
          }
        }
      }

      const regions: any[] = [];
      let totalSales = 0;
      let totalPopulation = 0;

      for (const rs of regionSales) {
        const normKey = normalizeRegionForComparison(rs.name);
        const popData = populationMap.get(normKey);
        if (!popData) continue;
        const coeff = popData.population > 0 ? (rs.sales / popData.population) * 1000 : 0;
        totalSales += rs.sales;
        totalPopulation += popData.population;
        regions.push({
          region: rs.name,
          population: popData.population,
          sales: rs.sales,
          coefficient: Math.round(coeff * 1000) / 1000,
          manager: popData.manager,
          federalDistrict: popData.federalDistrict,
        });
      }

      regions.sort((a, b) => b.coefficient - a.coefficient);

      const overallCoeff = totalPopulation > 0 ? Math.round(((totalSales / totalPopulation) * 1000) * 1000) / 1000 : 0;
      const leader = regions.length > 0 ? regions[0] : null;
      const outsider = regions.length > 0 ? regions[regions.length - 1] : null;

      const drugBreakdown: any[] = [];
      for (const [drug, regionMap] of drugRegionMap) {
        const drugRegions: any[] = [];
        for (const [normRegion, sales] of regionMap) {
          const popData = populationMap.get(normRegion);
          if (!popData) continue;
          const coeff = popData.population > 0 ? (sales / popData.population) * 1000 : 0;
          drugRegions.push({
            region: popData.originalName,
            sales,
            population: popData.population,
            coefficient: Math.round(coeff * 1000) / 1000,
          });
        }
        if (drugRegions.length > 0) {
          drugRegions.sort((a: any, b: any) => b.coefficient - a.coefficient);
          drugBreakdown.push({ drug, regions: drugRegions });
        }
      }
      drugBreakdown.sort((a, b) => a.drug.localeCompare(b.drug, 'ru'));

      console.log(`[API] GET /percapita userId=${userId} → ${Date.now() - t0}мс, регионов=${regions.length}`);
      res.json({
        hasData: true,
        overallCoefficient: overallCoeff,
        totalSales,
        totalPopulation,
        leader,
        outsider,
        regions,
        drugBreakdown,
      });
    } catch (error) {
      console.error(`[API] GET /percapita ERROR (${Date.now() - t0}мс):`, error);
      res.status(500).json({ error: "Ошибка загрузки данных на душу населения" });
    }
  });

  router.get("/peremployee", authMiddleware, async (req: AuthRequest, res: Response) => {
    const t0 = Date.now();
    try {
      const userId = req.userId!;
      const { merged, perYearData } = await loadAggregatedData(userId);
      if (!merged) return res.json({ hasData: false });

      const filters = parseFilters(req.query);
      const { rows: compactRows, contragentRows } = await loadCompactRowsIfNeeded(userId, filters);
      const filtered = applyFilters(merged, filters, compactRows, contragentRows, perYearData);
      const teamMode = (req.query.teamMode as string) || 'all';

      const empResult = await safeQuery('SELECT employee_name, role, manager_name, regions FROM world_medicine.employees_data');
      const managerRegionsMap = new Map<string, string[]>();
      const managerTeamCounts = new Map<string, { rm: number; tm: number; mp: number; total: number }>();

      for (const row of empResult.rows) {
        if (row.role === 'РМ' && row.regions) {
          managerRegionsMap.set(row.manager_name, row.regions.split('|'));
        }
      }

      for (const row of empResult.rows) {
        if (row.role === 'Директор') continue;
        const mgr = row.manager_name;
        if (!managerTeamCounts.has(mgr)) {
          managerTeamCounts.set(mgr, { rm: 0, tm: 0, mp: 0, total: 0 });
        }
        const counts = managerTeamCounts.get(mgr)!;
        if (row.role === 'РМ') counts.rm++;
        else if (row.role === 'ТМ') counts.tm++;
        else if (row.role === 'МП') counts.mp++;
        counts.total++;
      }

      const regionSales = filtered.regionSales || merged.regionSales || [];
      const regionSalesMap = new Map<string, number>();
      const regionOriginalNames = new Map<string, string>();
      for (const rs of regionSales) {
        const normKey = normalizeRegionForComparison(rs.name);
        regionSalesMap.set(normKey, (regionSalesMap.get(normKey) || 0) + rs.sales);
        if (!regionOriginalNames.has(normKey)) regionOriginalNames.set(normKey, rs.name);
      }

      const popResult = await safeQuery('SELECT region_name, federal_district FROM world_medicine.population_data');
      const regionFdMap = new Map<string, string>();
      for (const row of popResult.rows) {
        const normKey = normalizeRegionForComparison(row.region_name);
        regionFdMap.set(normKey, row.federal_district || '');
      }

      const managers: any[] = [];
      let totalSales = 0;
      let totalEmployees = 0;

      for (const [mgr, counts] of managerTeamCounts) {
        const regions = managerRegionsMap.get(mgr) || [];
        let mgrSales = 0;
        const regionDetails: any[] = [];

        for (const region of regions) {
          const normKey = normalizeRegionForComparison(region);
          const sales = regionSalesMap.get(normKey) || 0;
          mgrSales += sales;
          if (sales > 0) {
            regionDetails.push({ region, sales, federalDistrict: regionFdMap.get(normKey) || '' });
          }
        }

        let employeeCount: number;
        if (teamMode === 'mp_only') {
          employeeCount = counts.mp;
        } else if (teamMode === 'tm_mp') {
          employeeCount = counts.tm + counts.mp;
        } else {
          employeeCount = counts.total;
        }

        const coefficient = employeeCount > 0 ? Math.round(mgrSales / employeeCount) : 0;
        totalSales += mgrSales;
        totalEmployees += employeeCount;

        managers.push({
          manager: mgr,
          sales: mgrSales,
          rm: counts.rm,
          tm: counts.tm,
          mp: counts.mp,
          totalTeam: counts.total,
          activeTeam: employeeCount,
          coefficient,
          regions: regionDetails.sort((a: any, b: any) => b.sales - a.sales),
          regionCount: regions.length,
        });
      }

      managers.sort((a, b) => b.coefficient - a.coefficient);

      const overallCoeff = totalEmployees > 0 ? Math.round(totalSales / totalEmployees) : 0;
      const leader = managers.length > 0 ? managers[0] : null;
      const outsider = managers.length > 0 ? managers[managers.length - 1] : null;

      console.log(`[API] GET /peremployee userId=${userId} teamMode=${teamMode} → ${Date.now() - t0}мс, менеджеров=${managers.length}`);
      res.json({
        hasData: true,
        teamMode,
        overallCoefficient: overallCoeff,
        totalSales,
        totalEmployees,
        leader,
        outsider,
        managers,
      });
    } catch (error) {
      console.error(`[API] GET /peremployee ERROR (${Date.now() - t0}мс):`, error);
      res.status(500).json({ error: "Ошибка загрузки данных на сотрудника" });
    }
  });

  return router;
}
