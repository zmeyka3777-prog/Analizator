import type { ParsedRow } from './fileProcessor';
import type { AggregatedData, DrugAnalytics, TerritoryHierarchy, ContragentAnalytics, CompactRow, ContragentCompactRow, CompactSummaryResult } from './aggregateData';

const MONTH_ORDER = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
const MONTH_FULL_NAMES: Record<string, string> = {
  'Янв': 'Январь', 'Фев': 'Февраль', 'Мар': 'Март', 'Апр': 'Апрель',
  'Май': 'Май', 'Июн': 'Июнь', 'Июл': 'Июль', 'Авг': 'Август',
  'Сен': 'Сентябрь', 'Окт': 'Октябрь', 'Ноя': 'Ноябрь', 'Дек': 'Декабрь',
};

interface YearBucket {
  monthlyMap: Map<string, { month: string; sales: number; year?: number }>;
  contragentMap: Map<string, { name: string; sales: number; region?: string; city?: string; receiverType?: string; contractorGroup?: string; federalDistrict?: string; district?: string; cityDistrict?: string }>;
  regionMap: Map<string, number>;
  drugMap: Map<string, number>;
  yearMonthMap: Map<string, Map<string, number>>;
  disposalTypeMap: Map<string, { sales: number; count: number }>;
  federalDistrictMap: Map<string, number>;
  receiverTypeMap: Map<string, { sales: number; count: number }>;
  allYears: Set<string>;
  drugMonthlyMap: Map<string, Map<string, number>>;
  drugRegionMap: Map<string, Map<string, number>>;
  drugContragentMap: Map<string, Map<string, number>>;
  drugYearMap: Map<string, Map<string, number>>;
  contragentDrugMap: Map<string, Map<string, number>>;
  contragentMonthlyMap: Map<string, Map<string, number>>;
  contragentYearMap: Map<string, Map<string, number>>;
  contragentInfoMap: Map<string, { region?: string; city?: string; receiverType?: string; contractorGroup?: string; federalDistrict?: string; district?: string; cityDistrict?: string }>;
  territoryRegionMap: Map<string, { sales: number; salesByYear: Map<string, number>; contragents: Set<string>; drugSales: Map<string, number> }>;
  territoryCityMap: Map<string, { sales: number; salesByYear: Map<string, number>; contragents: Set<string>; region?: string; drugSales: Map<string, number> }>;
  territoryDistrictMap: Map<string, { sales: number; salesByYear: Map<string, number>; contragents: Set<string>; city?: string; region?: string; drugSales: Map<string, number> }>;
  territoryFOMap: Map<string, { sales: number; salesByYear: Map<string, number>; contragents: Set<string>; drugSales: Map<string, number> }>;
  rowCount: number;
}

function createYearBucket(): YearBucket {
  return {
    monthlyMap: new Map(),
    contragentMap: new Map(),
    regionMap: new Map(),
    drugMap: new Map(),
    yearMonthMap: new Map(),
    disposalTypeMap: new Map(),
    federalDistrictMap: new Map(),
    receiverTypeMap: new Map(),
    allYears: new Set(),
    drugMonthlyMap: new Map(),
    drugRegionMap: new Map(),
    drugContragentMap: new Map(),
    drugYearMap: new Map(),
    contragentDrugMap: new Map(),
    contragentMonthlyMap: new Map(),
    contragentYearMap: new Map(),
    contragentInfoMap: new Map(),
    territoryRegionMap: new Map(),
    territoryCityMap: new Map(),
    territoryDistrictMap: new Map(),
    territoryFOMap: new Map(),
    rowCount: 0,
  };
}

export class IncrementalAggregator {
  private yearBuckets = new Map<number, YearBucket>();
  private compactMainMap = new Map<string, CompactRow>();
  private compactContragentMap = new Map<string, ContragentCompactRow>();
  private totalRows = 0;

  addBatch(rows: ParsedRow[]): void {
    for (const row of rows) {
      this.processRow(row);
    }
    this.totalRows += rows.length;
  }

  private getOrCreateBucket(yearNum: number): YearBucket {
    let bucket = this.yearBuckets.get(yearNum);
    if (!bucket) {
      bucket = createYearBucket();
      this.yearBuckets.set(yearNum, bucket);
    }
    return bucket;
  }

  private processRow(row: ParsedRow): void {
    const amount = row.amount || row.quantity || 0;
    const yearNum = row.year || new Date().getFullYear();
    const yearStr = String(yearNum);

    const b = this.getOrCreateBucket(yearNum);
    b.rowCount++;
    b.allYears.add(yearStr);

    if (row.month) {
      const key = row.month;
      const existing = b.monthlyMap.get(key);
      if (existing) {
        existing.sales += amount;
      } else {
        b.monthlyMap.set(key, { month: key, sales: amount, year: row.year });
      }
      if (!b.yearMonthMap.has(yearStr)) b.yearMonthMap.set(yearStr, new Map());
      const monthMap = b.yearMonthMap.get(yearStr)!;
      monthMap.set(key, (monthMap.get(key) || 0) + amount);
    }

    if (row.contragent) {
      const existing = b.contragentMap.get(row.contragent);
      if (existing) {
        existing.sales += amount;
      } else {
        b.contragentMap.set(row.contragent, {
          name: row.contragent, sales: amount,
          region: row.region, city: row.city,
          receiverType: row.receiverType, contractorGroup: row.contractorGroup,
          federalDistrict: row.federalDistrict, district: row.district,
          cityDistrict: row.cityDistrict,
        });
      }
      if (!b.contragentInfoMap.has(row.contragent)) {
        b.contragentInfoMap.set(row.contragent, {
          region: row.region, city: row.city,
          receiverType: row.receiverType, contractorGroup: row.contractorGroup,
          federalDistrict: row.federalDistrict, district: row.district,
          cityDistrict: row.cityDistrict,
        });
      }
      if (row.drug) {
        if (!b.contragentDrugMap.has(row.contragent)) b.contragentDrugMap.set(row.contragent, new Map());
        const drugM = b.contragentDrugMap.get(row.contragent)!;
        drugM.set(row.drug, (drugM.get(row.drug) || 0) + amount);
      }
      if (row.month) {
        if (!b.contragentMonthlyMap.has(row.contragent)) b.contragentMonthlyMap.set(row.contragent, new Map());
        const monthM = b.contragentMonthlyMap.get(row.contragent)!;
        monthM.set(row.month, (monthM.get(row.month) || 0) + amount);
      }
      if (!b.contragentYearMap.has(row.contragent)) b.contragentYearMap.set(row.contragent, new Map());
      const yearM = b.contragentYearMap.get(row.contragent)!;
      yearM.set(yearStr, (yearM.get(yearStr) || 0) + amount);
    }

    if (row.region) {
      b.regionMap.set(row.region, (b.regionMap.get(row.region) || 0) + amount);
      if (!b.territoryRegionMap.has(row.region)) {
        b.territoryRegionMap.set(row.region, { sales: 0, salesByYear: new Map(), contragents: new Set(), drugSales: new Map() });
      }
      const tr = b.territoryRegionMap.get(row.region)!;
      tr.sales += amount;
      tr.salesByYear.set(yearStr, (tr.salesByYear.get(yearStr) || 0) + amount);
      if (row.contragent) tr.contragents.add(row.contragent);
      if (row.drug) tr.drugSales.set(row.drug, (tr.drugSales.get(row.drug) || 0) + amount);
    }

    if (row.city) {
      if (!b.territoryCityMap.has(row.city)) {
        b.territoryCityMap.set(row.city, { sales: 0, salesByYear: new Map(), contragents: new Set(), region: row.region, drugSales: new Map() });
      }
      const tc = b.territoryCityMap.get(row.city)!;
      tc.sales += amount;
      tc.salesByYear.set(yearStr, (tc.salesByYear.get(yearStr) || 0) + amount);
      if (row.contragent) tc.contragents.add(row.contragent);
      if (row.drug) tc.drugSales.set(row.drug, (tc.drugSales.get(row.drug) || 0) + amount);
    }

    if (row.district || row.settlement) {
      const districtKey = row.district || row.settlement || '';
      if (!b.territoryDistrictMap.has(districtKey)) {
        b.territoryDistrictMap.set(districtKey, { sales: 0, salesByYear: new Map(), contragents: new Set(), city: row.city, region: row.region, drugSales: new Map() });
      }
      const td = b.territoryDistrictMap.get(districtKey)!;
      td.sales += amount;
      td.salesByYear.set(yearStr, (td.salesByYear.get(yearStr) || 0) + amount);
      if (row.contragent) td.contragents.add(row.contragent);
      if (row.drug) td.drugSales.set(row.drug, (td.drugSales.get(row.drug) || 0) + amount);
    }

    if (row.federalDistrict) {
      b.federalDistrictMap.set(row.federalDistrict, (b.federalDistrictMap.get(row.federalDistrict) || 0) + amount);
      if (!b.territoryFOMap.has(row.federalDistrict)) {
        b.territoryFOMap.set(row.federalDistrict, { sales: 0, salesByYear: new Map(), contragents: new Set(), drugSales: new Map() });
      }
      const tfo = b.territoryFOMap.get(row.federalDistrict)!;
      tfo.sales += amount;
      tfo.salesByYear.set(yearStr, (tfo.salesByYear.get(yearStr) || 0) + amount);
      if (row.contragent) tfo.contragents.add(row.contragent);
      if (row.drug) tfo.drugSales.set(row.drug, (tfo.drugSales.get(row.drug) || 0) + amount);
    }

    if (row.drug) {
      b.drugMap.set(row.drug, (b.drugMap.get(row.drug) || 0) + amount);
      if (row.month) {
        if (!b.drugMonthlyMap.has(row.drug)) b.drugMonthlyMap.set(row.drug, new Map());
        const dm = b.drugMonthlyMap.get(row.drug)!;
        dm.set(row.month, (dm.get(row.month) || 0) + amount);
      }
      if (row.region) {
        if (!b.drugRegionMap.has(row.drug)) b.drugRegionMap.set(row.drug, new Map());
        const dr = b.drugRegionMap.get(row.drug)!;
        dr.set(row.region, (dr.get(row.region) || 0) + amount);
      }
      if (row.contragent) {
        if (!b.drugContragentMap.has(row.drug)) b.drugContragentMap.set(row.drug, new Map());
        const dc = b.drugContragentMap.get(row.drug)!;
        dc.set(row.contragent, (dc.get(row.contragent) || 0) + amount);
      }
      if (!b.drugYearMap.has(row.drug)) b.drugYearMap.set(row.drug, new Map());
      const dy = b.drugYearMap.get(row.drug)!;
      dy.set(yearStr, (dy.get(yearStr) || 0) + amount);
    }

    if (row.disposalType) {
      const existing = b.disposalTypeMap.get(row.disposalType);
      if (existing) { existing.sales += amount; existing.count += 1; }
      else b.disposalTypeMap.set(row.disposalType, { sales: amount, count: 1 });
    }

    if (row.receiverType) {
      const existing = b.receiverTypeMap.get(row.receiverType);
      if (existing) { existing.sales += amount; existing.count += 1; }
      else b.receiverTypeMap.set(row.receiverType, { sales: amount, count: 1 });
    }

    const month = row.month || '';
    const drug = row.drug || '';
    const region = row.region || '';
    const federalDistrict = row.federalDistrict || '';
    const contractorGroup = row.contractorGroup || '';
    const disposalType = row.disposalType || '';
    const receiverType = row.receiverType || '';
    const contragent = row.contragent || '';
    const qty = row.quantity || row.amount || 0;

    const mainKey = `${yearNum}|${month}|${drug}|${region}|${federalDistrict}|${contractorGroup}|${disposalType}|${receiverType}`;
    const existingCompact = this.compactMainMap.get(mainKey);
    if (existingCompact) {
      existingCompact.quantity += qty;
    } else {
      this.compactMainMap.set(mainKey, {
        year: yearNum, month, drug, region,
        federalDistrict, contractorGroup,
        disposalType, receiverType, quantity: qty,
      });
    }

    if (contragent) {
      const cKey = `${contragent}|${drug}|${region}|${yearNum}|${contractorGroup}|${receiverType}`;
      const cExisting = this.compactContragentMap.get(cKey);
      if (cExisting) {
        cExisting.quantity += qty;
      } else {
        this.compactContragentMap.set(cKey, {
          contragent, drug, region, year: yearNum,
          contractorGroup, receiverType, quantity: qty,
        });
      }
    }
  }

  finalizeAggregatedDataByYear(): Map<number, AggregatedData> {
    const result = new Map<number, AggregatedData>();
    for (const [yearNum, b] of this.yearBuckets) {
      result.set(yearNum, this.buildAggregatedData(b));
    }
    return result;
  }

  private buildAggregatedData(b: YearBucket): AggregatedData {
    const monthlySales = Array.from(b.monthlyMap.values())
      .sort((a, bb) => MONTH_ORDER.indexOf(a.month) - MONTH_ORDER.indexOf(bb.month))
      .map(m => ({ ...m, name: MONTH_FULL_NAMES[m.month] || m.month }));

    const years = Array.from(b.allYears).sort();
    let combinedData: any[];

    if (b.yearMonthMap.size > 0) {
      combinedData = MONTH_ORDER.map(month => {
        const result: any = { month, name: MONTH_FULL_NAMES[month] || month };
        for (const year of years) {
          const mm = b.yearMonthMap.get(year);
          result[year] = mm?.get(month) || 0;
        }
        const lastYear = years[years.length - 1];
        const lastYearValue = result[lastYear] || 0;
        result[`forecast${parseInt(lastYear) + 1}`] = Math.round(lastYearValue * 1.15);
        return result;
      });
    } else {
      const currentYear = new Date().getFullYear().toString();
      combinedData = monthlySales.map(m => ({
        month: m.month, name: m.name,
        [currentYear]: m.sales,
        [`forecast${parseInt(currentYear) + 1}`]: Math.round(m.sales * 1.15),
      }));
    }

    const contragentSales = Array.from(b.contragentMap.values()).sort((a: any, bb: any) => bb.sales - a.sales);
    const regionSales = Array.from(b.regionMap.entries()).map(([name, sales]) => ({ name, sales })).sort((a, bb) => bb.sales - a.sales);
    const drugSales = Array.from(b.drugMap.entries()).map(([name, sales]) => ({ name, sales })).sort((a, bb) => bb.sales - a.sales);
    const disposalTypeSales = Array.from(b.disposalTypeMap.entries()).map(([name, data]) => ({ name, sales: data.sales, count: data.count })).sort((a, bb) => bb.sales - a.sales);
    const federalDistrictSales = Array.from(b.federalDistrictMap.entries()).map(([name, sales]) => ({ name, sales })).sort((a, bb) => bb.sales - a.sales);
    const receiverTypeSales = Array.from(b.receiverTypeMap.entries()).map(([name, data]) => ({ name, sales: data.sales, count: data.count })).sort((a, bb) => bb.sales - a.sales);
    const drugs = Array.from(b.drugMap.keys()).sort();

    const drugAnalytics: Record<string, DrugAnalytics> = {};
    for (const drug of drugs) {
      const monthlyData = b.drugMonthlyMap.get(drug) || new Map();
      const regionData = b.drugRegionMap.get(drug) || new Map();
      const contragentData = b.drugContragentMap.get(drug) || new Map();
      const yearData = b.drugYearMap.get(drug) || new Map();
      drugAnalytics[drug] = {
        name: drug,
        totalSales: b.drugMap.get(drug) || 0,
        monthlySales: MONTH_ORDER.filter(m => monthlyData.has(m)).map(m => ({ month: m, name: MONTH_FULL_NAMES[m] || m, sales: monthlyData.get(m) || 0 })),
        regionSales: Array.from(regionData.entries()).map(([name, sales]) => ({ name, sales })).sort((a, bb) => bb.sales - a.sales),
        contragentSales: Array.from(contragentData.entries()).map(([name, sales]) => ({ name, sales })).sort((a, bb) => bb.sales - a.sales).slice(0, 20),
        yearSales: Object.fromEntries(yearData),
      };
    }

    const contragentAnalytics: Record<string, ContragentAnalytics> = {};
    for (const [name, info] of b.contragentInfoMap) {
      const drugData = b.contragentDrugMap.get(name) || new Map();
      const monthlyData = b.contragentMonthlyMap.get(name) || new Map();
      const yearData = b.contragentYearMap.get(name) || new Map();
      const totalSales = b.contragentMap.get(name)?.sales || 0;
      contragentAnalytics[name] = {
        name, totalSales,
        region: info.region, city: info.city, receiverType: info.receiverType,
        drugSales: Array.from(drugData.entries()).map(([n, sales]) => ({ name: n, sales })).sort((a, bb) => bb.sales - a.sales),
        monthlySales: MONTH_ORDER.filter(m => monthlyData.has(m)).map(m => ({ month: m, sales: monthlyData.get(m) || 0 })),
        yearSales: Object.fromEntries(yearData),
      };
    }

    const createTerritoryNode = (name: string, data: any, opts?: { region?: string; city?: string }) => ({
      name, sales: data.sales,
      salesByYear: Object.fromEntries(data.salesByYear),
      children: {} as Record<string, any>,
      contragentCount: data.contragents.size,
      drugSales: Array.from(data.drugSales.entries()).map(([n, s]: [string, number]) => ({ name: n, sales: s })).sort((a: any, bb: any) => bb.sales - a.sales),
      region: opts?.region, city: opts?.city,
    });

    const territoryHierarchy: TerritoryHierarchy = { federalDistricts: {}, regions: {}, cities: {}, districts: {} };
    for (const [name, data] of b.territoryFOMap) {
      territoryHierarchy.federalDistricts[name] = createTerritoryNode(name, data);
    }
    for (const [name, data] of b.territoryRegionMap) {
      territoryHierarchy.regions[name] = createTerritoryNode(name, data);
    }
    for (const [name, data] of b.territoryCityMap) {
      const node = createTerritoryNode(name, data, { region: data.region });
      territoryHierarchy.cities[name] = node;
      if (data.region && territoryHierarchy.regions[data.region]) {
        territoryHierarchy.regions[data.region].children[name] = node;
      }
    }
    for (const [name, data] of b.territoryDistrictMap) {
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

  finalizeCompactRows(): CompactSummaryResult {
    return {
      compactRows: Array.from(this.compactMainMap.values()),
      contragentRows: Array.from(this.compactContragentMap.values()),
    };
  }

  getYears(): number[] {
    return Array.from(this.yearBuckets.keys());
  }

  getTotalRows(): number {
    return this.totalRows;
  }

  getCompactStats(): { mainKeys: number; contragentKeys: number } {
    return {
      mainKeys: this.compactMainMap.size,
      contragentKeys: this.compactContragentMap.size,
    };
  }
}
