import type { ParsedRow } from './fileProcessor';

export interface ParsedData {
  rows: ParsedRow[];
  columns: string[];
  fileName: string;
  rowCount: number;
}

export interface DrugAnalytics {
  name: string;
  totalSales: number;
  monthlySales: Array<{ month: string; name: string; sales: number }>;
  regionSales: Array<{ name: string; sales: number }>;
  contragentSales: Array<{ name: string; sales: number }>;
  yearSales: Record<string, number>;
}

export interface TerritoryNode {
  name: string;
  sales: number;
  salesByYear: Record<string, number>;
  children: Record<string, TerritoryNode>;
  contragentCount: number;
  drugSales?: Array<{ name: string; sales: number }>;
  region?: string;
  city?: string;
}

export interface TerritoryHierarchy {
  federalDistricts: Record<string, TerritoryNode>;
  regions: Record<string, TerritoryNode>;
  cities: Record<string, TerritoryNode>;
  districts: Record<string, TerritoryNode>;
}

export interface ContragentAnalytics {
  name: string;
  totalSales: number;
  region?: string;
  city?: string;
  receiverType?: string;
  drugSales: Array<{ name: string; sales: number }>;
  monthlySales: Array<{ month: string; sales: number }>;
  yearSales: Record<string, number>;
}

export interface AggregatedData {
  monthlySales: { month: string; name: string; sales: number; year?: number }[];
  combinedData: { month: string; name: string; [key: string]: any }[];
  contragentSales: { name: string; sales: number; region?: string; city?: string; receiverType?: string; contractorGroup?: string; federalDistrict?: string; district?: string; cityDistrict?: string }[];
  regionSales: { name: string; sales: number }[];
  drugSales: { name: string; sales: number }[];
  disposalTypeSales: { name: string; sales: number; count: number }[];
  federalDistrictSales: { name: string; sales: number }[];
  receiverTypeSales: { name: string; sales: number; count: number }[];
  drugs: string[];
  drugAnalytics: Record<string, DrugAnalytics>;
  territoryHierarchy: TerritoryHierarchy;
  contragentAnalytics: Record<string, ContragentAnalytics>;
  years: string[];
  weeklySales?: { month: string; week: number; drug: string; quantity: number; amount: number }[];
}

const MONTH_FULL_NAMES: Record<string, string> = {
  'Янв': 'Январь', 'Фев': 'Февраль', 'Мар': 'Март', 'Апр': 'Апрель',
  'Май': 'Май', 'Июн': 'Июнь', 'Июл': 'Июль', 'Авг': 'Август',
  'Сен': 'Сентябрь', 'Окт': 'Октябрь', 'Ноя': 'Ноябрь', 'Дек': 'Декабрь',
};

export function aggregateData(parsedData: ParsedData): AggregatedData {
  const rows = parsedData.rows;
  const monthOrder = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

  const monthlyMap = new Map<string, { month: string; sales: number; year?: number }>();
  const contragentMap = new Map<string, { name: string; sales: number; region?: string; city?: string; receiverType?: string; contractorGroup?: string; federalDistrict?: string; district?: string; cityDistrict?: string }>();
  const regionMap = new Map<string, number>();
  const drugMap = new Map<string, number>();
  const yearMonthMap = new Map<string, Map<string, number>>();
  const disposalTypeMap = new Map<string, { sales: number; count: number }>();
  const federalDistrictMap = new Map<string, number>();
  const receiverTypeMap = new Map<string, { sales: number; count: number }>();
  const allYears = new Set<string>();

  const drugMonthlyMap = new Map<string, Map<string, number>>();
  const drugRegionMap = new Map<string, Map<string, number>>();
  const drugContragentMap = new Map<string, Map<string, number>>();
  const drugYearMap = new Map<string, Map<string, number>>();

  const contragentDrugMap = new Map<string, Map<string, number>>();
  const contragentMonthlyMap = new Map<string, Map<string, number>>();
  const contragentYearMap = new Map<string, Map<string, number>>();
  const contragentInfoMap = new Map<string, { region?: string; city?: string; receiverType?: string; contractorGroup?: string; federalDistrict?: string; district?: string; cityDistrict?: string }>();

  const territoryRegionMap = new Map<string, { sales: number; salesByYear: Map<string, number>; contragents: Set<string>; drugSales: Map<string, number> }>();
  const territoryCityMap = new Map<string, { sales: number; salesByYear: Map<string, number>; contragents: Set<string>; region?: string; drugSales: Map<string, number> }>();
  const territoryDistrictMap = new Map<string, { sales: number; salesByYear: Map<string, number>; contragents: Set<string>; city?: string; region?: string; drugSales: Map<string, number> }>();
  const territoryFOMap = new Map<string, { sales: number; salesByYear: Map<string, number>; contragents: Set<string>; drugSales: Map<string, number> }>();

  for (const row of rows) {
    const amount = row.amount || row.quantity || 0;
    const yearStr = row.year ? String(row.year) : String(new Date().getFullYear());
    allYears.add(yearStr);
    
    if (row.month) {
      const key = row.month;
      const existing = monthlyMap.get(key);
      if (existing) {
        existing.sales += amount;
      } else {
        monthlyMap.set(key, { month: key, sales: amount, year: row.year });
      }

      if (!yearMonthMap.has(yearStr)) {
        yearMonthMap.set(yearStr, new Map());
      }
      const monthMap = yearMonthMap.get(yearStr)!;
      monthMap.set(key, (monthMap.get(key) || 0) + amount);
    }

    if (row.contragent) {
      const existing = contragentMap.get(row.contragent);
      if (existing) {
        existing.sales += amount;
      } else {
        contragentMap.set(row.contragent, {
          name: row.contragent,
          sales: amount,
          region: row.region,
          city: row.city,
          receiverType: row.receiverType,
          contractorGroup: row.contractorGroup,
          federalDistrict: row.federalDistrict,
          district: row.district,
          cityDistrict: row.cityDistrict,
        });
      }

      if (!contragentInfoMap.has(row.contragent)) {
        contragentInfoMap.set(row.contragent, { region: row.region, city: row.city, receiverType: row.receiverType, contractorGroup: row.contractorGroup, federalDistrict: row.federalDistrict, district: row.district, cityDistrict: row.cityDistrict });
      }

      if (row.drug) {
        if (!contragentDrugMap.has(row.contragent)) contragentDrugMap.set(row.contragent, new Map());
        const drugM = contragentDrugMap.get(row.contragent)!;
        drugM.set(row.drug, (drugM.get(row.drug) || 0) + amount);
      }
      if (row.month) {
        if (!contragentMonthlyMap.has(row.contragent)) contragentMonthlyMap.set(row.contragent, new Map());
        const monthM = contragentMonthlyMap.get(row.contragent)!;
        monthM.set(row.month, (monthM.get(row.month) || 0) + amount);
      }
      if (!contragentYearMap.has(row.contragent)) contragentYearMap.set(row.contragent, new Map());
      const yearM = contragentYearMap.get(row.contragent)!;
      yearM.set(yearStr, (yearM.get(yearStr) || 0) + amount);
    }

    if (row.region) {
      regionMap.set(row.region, (regionMap.get(row.region) || 0) + amount);
      
      if (!territoryRegionMap.has(row.region)) {
        territoryRegionMap.set(row.region, { sales: 0, salesByYear: new Map(), contragents: new Set(), drugSales: new Map() });
      }
      const tr = territoryRegionMap.get(row.region)!;
      tr.sales += amount;
      tr.salesByYear.set(yearStr, (tr.salesByYear.get(yearStr) || 0) + amount);
      if (row.contragent) tr.contragents.add(row.contragent);
      if (row.drug) tr.drugSales.set(row.drug, (tr.drugSales.get(row.drug) || 0) + amount);
    }

    if (row.city) {
      if (!territoryCityMap.has(row.city)) {
        territoryCityMap.set(row.city, { sales: 0, salesByYear: new Map(), contragents: new Set(), region: row.region, drugSales: new Map() });
      }
      const tc = territoryCityMap.get(row.city)!;
      tc.sales += amount;
      tc.salesByYear.set(yearStr, (tc.salesByYear.get(yearStr) || 0) + amount);
      if (row.contragent) tc.contragents.add(row.contragent);
      if (row.drug) tc.drugSales.set(row.drug, (tc.drugSales.get(row.drug) || 0) + amount);
    }

    if (row.district || row.settlement) {
      const districtKey = row.district || row.settlement || '';
      if (!territoryDistrictMap.has(districtKey)) {
        territoryDistrictMap.set(districtKey, { sales: 0, salesByYear: new Map(), contragents: new Set(), city: row.city, region: row.region, drugSales: new Map() });
      }
      const td = territoryDistrictMap.get(districtKey)!;
      td.sales += amount;
      td.salesByYear.set(yearStr, (td.salesByYear.get(yearStr) || 0) + amount);
      if (row.contragent) td.contragents.add(row.contragent);
      if (row.drug) td.drugSales.set(row.drug, (td.drugSales.get(row.drug) || 0) + amount);
    }

    if (row.federalDistrict) {
      federalDistrictMap.set(row.federalDistrict, (federalDistrictMap.get(row.federalDistrict) || 0) + amount);
      
      if (!territoryFOMap.has(row.federalDistrict)) {
        territoryFOMap.set(row.federalDistrict, { sales: 0, salesByYear: new Map(), contragents: new Set(), drugSales: new Map() });
      }
      const tfo = territoryFOMap.get(row.federalDistrict)!;
      tfo.sales += amount;
      tfo.salesByYear.set(yearStr, (tfo.salesByYear.get(yearStr) || 0) + amount);
      if (row.contragent) tfo.contragents.add(row.contragent);
      if (row.drug) tfo.drugSales.set(row.drug, (tfo.drugSales.get(row.drug) || 0) + amount);
    }

    if (row.drug) {
      drugMap.set(row.drug, (drugMap.get(row.drug) || 0) + amount);
      
      if (row.month) {
        if (!drugMonthlyMap.has(row.drug)) drugMonthlyMap.set(row.drug, new Map());
        const dm = drugMonthlyMap.get(row.drug)!;
        dm.set(row.month, (dm.get(row.month) || 0) + amount);
      }
      if (row.region) {
        if (!drugRegionMap.has(row.drug)) drugRegionMap.set(row.drug, new Map());
        const dr = drugRegionMap.get(row.drug)!;
        dr.set(row.region, (dr.get(row.region) || 0) + amount);
      }
      if (row.contragent) {
        if (!drugContragentMap.has(row.drug)) drugContragentMap.set(row.drug, new Map());
        const dc = drugContragentMap.get(row.drug)!;
        dc.set(row.contragent, (dc.get(row.contragent) || 0) + amount);
      }
      if (!drugYearMap.has(row.drug)) drugYearMap.set(row.drug, new Map());
      const dy = drugYearMap.get(row.drug)!;
      dy.set(yearStr, (dy.get(yearStr) || 0) + amount);
    }

    if (row.disposalType) {
      const existing = disposalTypeMap.get(row.disposalType);
      if (existing) {
        existing.sales += amount;
        existing.count += 1;
      } else {
        disposalTypeMap.set(row.disposalType, { sales: amount, count: 1 });
      }
    }

    if (row.receiverType) {
      const existing = receiverTypeMap.get(row.receiverType);
      if (existing) {
        existing.sales += amount;
        existing.count += 1;
      } else {
        receiverTypeMap.set(row.receiverType, { sales: amount, count: 1 });
      }
    }
  }

  const monthlySales = Array.from(monthlyMap.values())
    .sort((a, b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month))
    .map(m => ({ ...m, name: MONTH_FULL_NAMES[m.month] || m.month }));

  const years = Array.from(allYears).sort();
  let combinedData: any[];
  
  if (yearMonthMap.size > 0) {
    combinedData = monthOrder.map(month => {
      const result: any = { month, name: MONTH_FULL_NAMES[month] || month };
      for (const year of years) {
        const monthMap = yearMonthMap.get(year);
        result[year] = monthMap?.get(month) || 0;
      }
      const lastYear = years[years.length - 1];
      const lastYearValue = result[lastYear] || 0;
      result[`forecast${parseInt(lastYear) + 1}`] = Math.round(lastYearValue * 1.15);
      return result;
    });
  } else {
    const currentYear = new Date().getFullYear().toString();
    combinedData = monthlySales.map(m => ({
      month: m.month,
      name: m.name,
      [currentYear]: m.sales,
      [`forecast${parseInt(currentYear) + 1}`]: Math.round(m.sales * 1.15),
    }));
  }

  const contragentSales = Array.from(contragentMap.values())
    .sort((a, b) => b.sales - a.sales);

  const regionSales = Array.from(regionMap.entries())
    .map(([name, sales]) => ({ name, sales }))
    .sort((a, b) => b.sales - a.sales);

  const drugSales = Array.from(drugMap.entries())
    .map(([name, sales]) => ({ name, sales }))
    .sort((a, b) => b.sales - a.sales);

  const disposalTypeSales = Array.from(disposalTypeMap.entries())
    .map(([name, data]) => ({ name, sales: data.sales, count: data.count }))
    .sort((a, b) => b.sales - a.sales);

  const federalDistrictSales = Array.from(federalDistrictMap.entries())
    .map(([name, sales]) => ({ name, sales }))
    .sort((a, b) => b.sales - a.sales);

  const receiverTypeSales = Array.from(receiverTypeMap.entries())
    .map(([name, data]) => ({ name, sales: data.sales, count: data.count }))
    .sort((a, b) => b.sales - a.sales);

  const drugs = Array.from(drugMap.keys()).sort();

  const drugAnalytics: Record<string, DrugAnalytics> = {};
  for (const drug of drugs) {
    const monthlyData = drugMonthlyMap.get(drug) || new Map();
    const regionData = drugRegionMap.get(drug) || new Map();
    const contragentData = drugContragentMap.get(drug) || new Map();
    const yearData = drugYearMap.get(drug) || new Map();

    drugAnalytics[drug] = {
      name: drug,
      totalSales: drugMap.get(drug) || 0,
      monthlySales: monthOrder
        .filter(m => monthlyData.has(m))
        .map(m => ({ month: m, name: MONTH_FULL_NAMES[m] || m, sales: monthlyData.get(m) || 0 })),
      regionSales: Array.from(regionData.entries())
        .map(([name, sales]) => ({ name, sales }))
        .sort((a, b) => b.sales - a.sales),
      contragentSales: Array.from(contragentData.entries())
        .map(([name, sales]) => ({ name, sales }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 20),
      yearSales: Object.fromEntries(yearData),
    };
  }

  const contragentAnalytics: Record<string, ContragentAnalytics> = {};
  for (const [name, info] of contragentInfoMap) {
    const drugData = contragentDrugMap.get(name) || new Map();
    const monthlyData = contragentMonthlyMap.get(name) || new Map();
    const yearData = contragentYearMap.get(name) || new Map();
    const totalSales = contragentMap.get(name)?.sales || 0;

    contragentAnalytics[name] = {
      name,
      totalSales,
      region: info.region,
      city: info.city,
      receiverType: info.receiverType,
      drugSales: Array.from(drugData.entries())
        .map(([n, sales]) => ({ name: n, sales }))
        .sort((a, b) => b.sales - a.sales),
      monthlySales: monthOrder
        .filter(m => monthlyData.has(m))
        .map(m => ({ month: m, sales: monthlyData.get(m) || 0 })),
      yearSales: Object.fromEntries(yearData),
    };
  }

  const createTerritoryNode = (
    name: string, 
    data: { sales: number; salesByYear: Map<string, number>; contragents: Set<string>; drugSales: Map<string, number> },
    opts?: { region?: string; city?: string }
  ): TerritoryNode => ({
    name,
    sales: data.sales,
    salesByYear: Object.fromEntries(data.salesByYear),
    children: {},
    contragentCount: data.contragents.size,
    drugSales: Array.from(data.drugSales.entries())
      .map(([n, s]) => ({ name: n, sales: s }))
      .sort((a, b) => b.sales - a.sales),
    region: opts?.region,
    city: opts?.city,
  });

  const territoryHierarchy: TerritoryHierarchy = {
    federalDistricts: {},
    regions: {},
    cities: {},
    districts: {},
  };

  for (const [name, data] of territoryFOMap) {
    territoryHierarchy.federalDistricts[name] = createTerritoryNode(name, data);
  }
  for (const [name, data] of territoryRegionMap) {
    territoryHierarchy.regions[name] = createTerritoryNode(name, data);
  }
  for (const [name, data] of territoryCityMap) {
    const node = createTerritoryNode(name, data, { region: data.region });
    territoryHierarchy.cities[name] = node;
    if (data.region && territoryHierarchy.regions[data.region]) {
      territoryHierarchy.regions[data.region].children[name] = node;
    }
  }
  for (const [name, data] of territoryDistrictMap) {
    const node = createTerritoryNode(name, data, { region: data.region, city: data.city });
    territoryHierarchy.districts[name] = node;
    if (data.city && territoryHierarchy.cities[data.city]) {
      territoryHierarchy.cities[data.city].children[name] = node;
    }
  }

  return {
    monthlySales,
    combinedData: combinedData.filter(d => Object.keys(d).length > 2),
    contragentSales,
    regionSales,
    drugSales,
    disposalTypeSales,
    federalDistrictSales,
    receiverTypeSales,
    drugs,
    drugAnalytics,
    territoryHierarchy,
    contragentAnalytics,
    years,
  };
}

export interface CompactRow {
  year: number;
  month: string;
  drug: string;
  region: string;
  federalDistrict: string;
  contractorGroup: string;
  disposalType: string;
  receiverType: string;
  quantity: number;
}

export interface ContragentCompactRow {
  contragent: string;
  drug: string;
  region: string;
  year: number;
  contractorGroup: string;
  receiverType: string;
  quantity: number;
}

export interface CompactSummaryResult {
  compactRows: CompactRow[];
  contragentRows: ContragentCompactRow[];
}

export function createCompactSummaryRows(rows: ParsedRow[]): CompactSummaryResult {
  const mainMap = new Map<string, CompactRow>();
  const contragentMap = new Map<string, ContragentCompactRow>();

  for (const row of rows) {
    const year = row.year || new Date().getFullYear();
    const month = row.month || '';
    const drug = row.drug || '';
    const region = row.region || '';
    const federalDistrict = row.federalDistrict || '';
    const contractorGroup = row.contractorGroup || '';
    const disposalType = row.disposalType || '';
    const receiverType = row.receiverType || '';
    const contragent = row.contragent || '';
    const qty = row.quantity || row.amount || 0;

    const mainKey = `${year}|${month}|${drug}|${region}|${federalDistrict}|${contractorGroup}|${disposalType}|${receiverType}`;
    const existing = mainMap.get(mainKey);
    if (existing) {
      existing.quantity += qty;
    } else {
      mainMap.set(mainKey, {
        year, month, drug, region,
        federalDistrict, contractorGroup,
        disposalType, receiverType, quantity: qty,
      });
    }

    if (contragent) {
      const cKey = `${contragent}|${drug}|${region}|${year}|${contractorGroup}|${receiverType}`;
      const cExisting = contragentMap.get(cKey);
      if (cExisting) {
        cExisting.quantity += qty;
      } else {
        contragentMap.set(cKey, {
          contragent, drug, region, year,
          contractorGroup, receiverType, quantity: qty,
        });
      }
    }
  }

  return {
    compactRows: Array.from(mainMap.values()),
    contragentRows: Array.from(contragentMap.values()),
  };
}
