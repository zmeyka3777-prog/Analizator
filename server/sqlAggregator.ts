import type { Pool } from 'pg';
import type { AggregatedData } from './aggregateData';
import { safeQuery, getHeavyClient } from './db';

const MONTH_ORDER = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
const MONTH_FULL_NAMES: Record<string, string> = {
  'Янв': 'Январь', 'Фев': 'Февраль', 'Мар': 'Март', 'Апр': 'Апрель',
  'Май': 'Май', 'Июн': 'Июнь', 'Июл': 'Июль', 'Авг': 'Август',
  'Сен': 'Сентябрь', 'Окт': 'Октябрь', 'Ноя': 'Ноябрь', 'Дек': 'Декабрь',
};
const SQL_MONTH_NORM: Record<string, string> = {
  '1': 'Янв', '2': 'Фев', '3': 'Мар', '4': 'Апр', '5': 'Май', '6': 'Июн',
  '7': 'Июл', '8': 'Авг', '9': 'Сен', '10': 'Окт', '11': 'Ноя', '12': 'Дек',
  '01': 'Янв', '02': 'Фев', '03': 'Мар', '04': 'Апр', '05': 'Май', '06': 'Июн',
  '07': 'Июл', '08': 'Авг', '09': 'Сен', '10': 'Окт', '11': 'Ноя', '12': 'Дек',
};
function normMonth(m: string): string {
  if (!m) return m;
  const t = m.trim();
  return SQL_MONTH_NORM[t] || t;
}

export async function aggregateFromDB(pool: Pool, userId: number, uploadId: string): Promise<Map<number, AggregatedData>> {
  const result = new Map<number, AggregatedData>();

  const client = await getHeavyClient();
  try {
    const yearsRes = await client.query(
      `SELECT DISTINCT year FROM world_medicine.raw_sales_rows WHERE user_id = $1 AND upload_id = $2 AND year IS NOT NULL AND year != 9999 ORDER BY year`,
      [userId, uploadId]
    );

    for (const yearRow of yearsRes.rows) {
      const yearNum = yearRow.year;
      const agg = await buildYearAggregation(client, userId, uploadId, yearNum);
      result.set(yearNum, agg);
    }
  } finally {
    client.release();
  }

  return result;
}

async function buildYearAggregation(queryable: { query: (text: string, params?: any[]) => Promise<any> }, userId: number, uploadId: string, year: number): Promise<AggregatedData> {
  const baseWhere = `user_id = $1 AND upload_id = $2 AND year = $3`;
  const baseParams: any[] = [userId, uploadId, year];

  const sampleCheck = await queryable.query(
    `SELECT amount, quantity FROM world_medicine.raw_sales_rows WHERE ${baseWhere} AND (amount IS NOT NULL OR quantity IS NOT NULL) LIMIT 3`,
    baseParams
  );
  console.log(`[AGG] year=${year}: строки с amount/quantity: ${sampleCheck.rowCount}, примеры: ${JSON.stringify(sampleCheck.rows)}`);
  if (sampleCheck.rowCount === 0) {
    const nullCheck = await queryable.query(
      `SELECT COUNT(*) as total, COUNT(amount) as with_amount, COUNT(quantity) as with_qty FROM world_medicine.raw_sales_rows WHERE ${baseWhere}`,
      baseParams
    );
    console.log(`[AGG] ВНИМАНИЕ: все amount/quantity = NULL! total=${nullCheck.rows[0]?.total}, with_amount=${nullCheck.rows[0]?.with_amount}, with_qty=${nullCheck.rows[0]?.with_qty}`);
  }

  const monthlyRes = await queryable.query(
    `SELECT month, COALESCE(SUM(COALESCE(amount, quantity, 0)), 0) as sales
     FROM world_medicine.raw_sales_rows WHERE ${baseWhere} AND month IS NOT NULL
     GROUP BY month ORDER BY month`,
    baseParams
  );
  const monthlySales = monthlyRes.rows
    .map(r => { const m = normMonth(r.month); return { month: m, name: MONTH_FULL_NAMES[m] || m, sales: parseFloat(r.sales), year }; })
    .sort((a, b) => MONTH_ORDER.indexOf(a.month) - MONTH_ORDER.indexOf(b.month));
  console.log(`[AGG] year=${year}: monthlySales=${monthlySales.length} записей, первые 3: ${JSON.stringify(monthlySales.slice(0, 3))}`);

  const allYearsRes = await queryable.query(
    `SELECT DISTINCT year::text as year FROM world_medicine.raw_sales_rows WHERE user_id = $1 AND upload_id = $2 AND year IS NOT NULL ORDER BY year`,
    [userId, uploadId]
  );
  const years = allYearsRes.rows.map(r => r.year);

  const yearMonthRes = await queryable.query(
    `SELECT year::text as yr, month, COALESCE(SUM(COALESCE(amount, quantity, 0)), 0) as sales
     FROM world_medicine.raw_sales_rows WHERE user_id = $1 AND upload_id = $2 AND month IS NOT NULL AND year IS NOT NULL
     GROUP BY year, month`,
    [userId, uploadId]
  );
  const yearMonthMap = new Map<string, Map<string, number>>();
  for (const r of yearMonthRes.rows) {
    if (!yearMonthMap.has(r.yr)) yearMonthMap.set(r.yr, new Map());
    const nm = normMonth(r.month);
    const existing = yearMonthMap.get(r.yr)!.get(nm) || 0;
    yearMonthMap.get(r.yr)!.set(nm, existing + parseFloat(r.sales));
  }

  let combinedData: any[];
  if (yearMonthMap.size > 0) {
    combinedData = MONTH_ORDER.map(month => {
      const res: any = { month, name: MONTH_FULL_NAMES[month] || month };
      for (const yr of years) {
        const mm = yearMonthMap.get(yr);
        res[yr] = mm?.get(month) || 0;
      }
      const lastYear = years[years.length - 1];
      const lastYearValue = res[lastYear] || 0;
      res[`forecast${parseInt(lastYear) + 1}`] = Math.round(lastYearValue * 1.15);
      return res;
    });
  } else {
    const currentYear = new Date().getFullYear().toString();
    combinedData = monthlySales.map(m => ({
      month: m.month, name: m.name,
      [currentYear]: m.sales,
      [`forecast${parseInt(currentYear) + 1}`]: Math.round(m.sales * 1.15),
    }));
  }

  const contragentRes = await queryable.query(
    `SELECT contragent as name, COALESCE(SUM(COALESCE(amount, quantity, 0)), 0) as sales,
     MAX(region) as region, MAX(city) as city, MAX(receiver_type) as "receiverType",
     MAX(contractor_group) as "contractorGroup", MAX(federal_district) as "federalDistrict",
     MAX(district) as district
     FROM world_medicine.raw_sales_rows WHERE ${baseWhere} AND contragent IS NOT NULL
     GROUP BY contragent ORDER BY sales DESC`,
    baseParams
  );
  const contragentSales = contragentRes.rows.map(r => ({ ...r, sales: parseFloat(r.sales) }));

  const regionRes = await queryable.query(
    `SELECT region as name, COALESCE(SUM(COALESCE(amount, quantity, 0)), 0) as sales
     FROM world_medicine.raw_sales_rows WHERE ${baseWhere} AND region IS NOT NULL
     GROUP BY region ORDER BY sales DESC`,
    baseParams
  );
  const regionSales = regionRes.rows.map(r => ({ name: r.name, sales: parseFloat(r.sales) }));

  const drugRes = await queryable.query(
    `SELECT drug as name, COALESCE(SUM(COALESCE(amount, quantity, 0)), 0) as sales
     FROM world_medicine.raw_sales_rows WHERE ${baseWhere} AND drug IS NOT NULL
     GROUP BY drug ORDER BY sales DESC`,
    baseParams
  );
  const drugSales = drugRes.rows.map(r => ({ name: r.name, sales: parseFloat(r.sales) }));
  const drugs = drugSales.map(d => d.name).sort();

  const disposalRes = await queryable.query(
    `SELECT disposal_type as name, COALESCE(SUM(COALESCE(amount, quantity, 0)), 0) as sales, COUNT(*) as count
     FROM world_medicine.raw_sales_rows WHERE ${baseWhere} AND disposal_type IS NOT NULL
     GROUP BY disposal_type ORDER BY sales DESC`,
    baseParams
  );
  const disposalTypeSales = disposalRes.rows.map(r => ({ name: r.name, sales: parseFloat(r.sales), count: parseInt(r.count) }));

  const fdRes = await queryable.query(
    `SELECT federal_district as name, COALESCE(SUM(COALESCE(amount, quantity, 0)), 0) as sales
     FROM world_medicine.raw_sales_rows WHERE ${baseWhere} AND federal_district IS NOT NULL
     GROUP BY federal_district ORDER BY sales DESC`,
    baseParams
  );
  const federalDistrictSales = fdRes.rows.map(r => ({ name: r.name, sales: parseFloat(r.sales) }));

  const rtRes = await queryable.query(
    `SELECT receiver_type as name, COALESCE(SUM(COALESCE(amount, quantity, 0)), 0) as sales, COUNT(*) as count
     FROM world_medicine.raw_sales_rows WHERE ${baseWhere} AND receiver_type IS NOT NULL
     GROUP BY receiver_type ORDER BY sales DESC`,
    baseParams
  );
  const receiverTypeSales = rtRes.rows.map(r => ({ name: r.name, sales: parseFloat(r.sales), count: parseInt(r.count) }));

  const drugMonthlyRes = await queryable.query(
    `SELECT drug, month, COALESCE(SUM(COALESCE(amount, quantity, 0)), 0) as sales
     FROM world_medicine.raw_sales_rows WHERE ${baseWhere} AND drug IS NOT NULL AND month IS NOT NULL
     GROUP BY drug, month`,
    baseParams
  );
  const drugMonthlyMap = new Map<string, Map<string, number>>();
  for (const r of drugMonthlyRes.rows) {
    if (!drugMonthlyMap.has(r.drug)) drugMonthlyMap.set(r.drug, new Map());
    const nm = normMonth(r.month);
    const existing = drugMonthlyMap.get(r.drug)!.get(nm) || 0;
    drugMonthlyMap.get(r.drug)!.set(nm, existing + parseFloat(r.sales));
  }

  const drugRegionRes = await queryable.query(
    `SELECT drug, region, COALESCE(SUM(COALESCE(amount, quantity, 0)), 0) as sales
     FROM world_medicine.raw_sales_rows WHERE ${baseWhere} AND drug IS NOT NULL AND region IS NOT NULL
     GROUP BY drug, region`,
    baseParams
  );
  const drugRegionMap = new Map<string, Map<string, number>>();
  for (const r of drugRegionRes.rows) {
    if (!drugRegionMap.has(r.drug)) drugRegionMap.set(r.drug, new Map());
    drugRegionMap.get(r.drug)!.set(r.region, parseFloat(r.sales));
  }

  const drugContragentRes = await queryable.query(
    `SELECT drug, contragent, COALESCE(SUM(COALESCE(amount, quantity, 0)), 0) as sales
     FROM world_medicine.raw_sales_rows WHERE ${baseWhere} AND drug IS NOT NULL AND contragent IS NOT NULL
     GROUP BY drug, contragent`,
    baseParams
  );
  const drugContragentMap = new Map<string, Map<string, number>>();
  for (const r of drugContragentRes.rows) {
    if (!drugContragentMap.has(r.drug)) drugContragentMap.set(r.drug, new Map());
    drugContragentMap.get(r.drug)!.set(r.contragent, parseFloat(r.sales));
  }

  const drugYearRes = await queryable.query(
    `SELECT drug, year::text as yr, COALESCE(SUM(COALESCE(amount, quantity, 0)), 0) as sales
     FROM world_medicine.raw_sales_rows WHERE user_id = $1 AND upload_id = $2 AND drug IS NOT NULL AND year IS NOT NULL
     GROUP BY drug, year`,
    [userId, uploadId]
  );
  const drugYearMap = new Map<string, Map<string, number>>();
  for (const r of drugYearRes.rows) {
    if (!drugYearMap.has(r.drug)) drugYearMap.set(r.drug, new Map());
    drugYearMap.get(r.drug)!.set(r.yr, parseFloat(r.sales));
  }

  const drugAnalytics: Record<string, any> = {};
  for (const drug of drugs) {
    const monthlyData = drugMonthlyMap.get(drug) || new Map();
    const regionData = drugRegionMap.get(drug) || new Map();
    const contragentData = drugContragentMap.get(drug) || new Map();
    const yearData = drugYearMap.get(drug) || new Map();
    drugAnalytics[drug] = {
      name: drug,
      totalSales: drugSales.find(d => d.name === drug)?.sales || 0,
      monthlySales: MONTH_ORDER.filter(m => monthlyData.has(m)).map(m => ({ month: m, name: MONTH_FULL_NAMES[m] || m, sales: monthlyData.get(m) || 0 })),
      regionSales: Array.from(regionData.entries()).map(([name, sales]) => ({ name, sales })).sort((a, b) => b.sales - a.sales),
      contragentSales: Array.from(contragentData.entries()).map(([name, sales]) => ({ name, sales })).sort((a, b) => b.sales - a.sales).slice(0, 20),
      yearSales: Object.fromEntries(yearData),
    };
  }

  const contragentDrugRes = await queryable.query(
    `SELECT contragent, drug, COALESCE(SUM(COALESCE(amount, quantity, 0)), 0) as sales
     FROM world_medicine.raw_sales_rows WHERE ${baseWhere} AND contragent IS NOT NULL AND drug IS NOT NULL
     GROUP BY contragent, drug`,
    baseParams
  );
  const contragentDrugMap = new Map<string, Map<string, number>>();
  for (const r of contragentDrugRes.rows) {
    if (!contragentDrugMap.has(r.contragent)) contragentDrugMap.set(r.contragent, new Map());
    contragentDrugMap.get(r.contragent)!.set(r.drug, parseFloat(r.sales));
  }

  const contragentMonthlyRes = await queryable.query(
    `SELECT contragent, month, COALESCE(SUM(COALESCE(amount, quantity, 0)), 0) as sales
     FROM world_medicine.raw_sales_rows WHERE ${baseWhere} AND contragent IS NOT NULL AND month IS NOT NULL
     GROUP BY contragent, month`,
    baseParams
  );
  const contragentMonthlyMap = new Map<string, Map<string, number>>();
  for (const r of contragentMonthlyRes.rows) {
    if (!contragentMonthlyMap.has(r.contragent)) contragentMonthlyMap.set(r.contragent, new Map());
    const nm = normMonth(r.month);
    const existing = contragentMonthlyMap.get(r.contragent)!.get(nm) || 0;
    contragentMonthlyMap.get(r.contragent)!.set(nm, existing + parseFloat(r.sales));
  }

  const contragentYearRes = await queryable.query(
    `SELECT contragent, year::text as yr, COALESCE(SUM(COALESCE(amount, quantity, 0)), 0) as sales
     FROM world_medicine.raw_sales_rows WHERE user_id = $1 AND upload_id = $2 AND contragent IS NOT NULL AND year IS NOT NULL
     GROUP BY contragent, year`,
    [userId, uploadId]
  );
  const contragentYearMap = new Map<string, Map<string, number>>();
  for (const r of contragentYearRes.rows) {
    if (!contragentYearMap.has(r.contragent)) contragentYearMap.set(r.contragent, new Map());
    contragentYearMap.get(r.contragent)!.set(r.yr, parseFloat(r.sales));
  }

  const contragentAnalytics: Record<string, any> = {};
  for (const c of contragentSales) {
    const drugData = contragentDrugMap.get(c.name) || new Map();
    const monthlyData = contragentMonthlyMap.get(c.name) || new Map();
    const yearData = contragentYearMap.get(c.name) || new Map();
    contragentAnalytics[c.name] = {
      name: c.name, totalSales: c.sales,
      region: c.region, city: c.city, receiverType: c.receiverType,
      drugSales: Array.from(drugData.entries()).map(([name, sales]) => ({ name, sales })).sort((a, b) => b.sales - a.sales),
      monthlySales: MONTH_ORDER.filter(m => monthlyData.has(m)).map(m => ({ month: m, sales: monthlyData.get(m) || 0 })),
      yearSales: Object.fromEntries(yearData),
    };
  }

  const terrRegionRes = await queryable.query(
    `SELECT region as name, COALESCE(SUM(COALESCE(amount, quantity, 0)), 0) as sales,
     COUNT(DISTINCT contragent) as contragent_count
     FROM world_medicine.raw_sales_rows WHERE ${baseWhere} AND region IS NOT NULL
     GROUP BY region ORDER BY sales DESC`,
    baseParams
  );

  const terrRegionDrugRes = await queryable.query(
    `SELECT region, drug, COALESCE(SUM(COALESCE(amount, quantity, 0)), 0) as sales
     FROM world_medicine.raw_sales_rows WHERE ${baseWhere} AND region IS NOT NULL AND drug IS NOT NULL
     GROUP BY region, drug`,
    baseParams
  );
  const regionDrugMap = new Map<string, Array<{name: string, sales: number}>>();
  for (const r of terrRegionDrugRes.rows) {
    if (!regionDrugMap.has(r.region)) regionDrugMap.set(r.region, []);
    regionDrugMap.get(r.region)!.push({ name: r.drug, sales: parseFloat(r.sales) });
  }

  const terrRegionYearRes = await queryable.query(
    `SELECT region, year::text as yr, COALESCE(SUM(COALESCE(amount, quantity, 0)), 0) as sales
     FROM world_medicine.raw_sales_rows WHERE user_id = $1 AND upload_id = $2 AND region IS NOT NULL AND year IS NOT NULL
     GROUP BY region, year`,
    [userId, uploadId]
  );
  const regionYearMap = new Map<string, Record<string, number>>();
  for (const r of terrRegionYearRes.rows) {
    if (!regionYearMap.has(r.region)) regionYearMap.set(r.region, {});
    regionYearMap.get(r.region)![r.yr] = parseFloat(r.sales);
  }

  const territoryHierarchy: any = { federalDistricts: {}, regions: {}, cities: {}, districts: {} };

  for (const r of terrRegionRes.rows) {
    const drugSalesArr = (regionDrugMap.get(r.name) || []).sort((a: any, b: any) => b.sales - a.sales);
    territoryHierarchy.regions[r.name] = {
      name: r.name, sales: parseFloat(r.sales),
      salesByYear: regionYearMap.get(r.name) || {},
      children: {},
      contragentCount: parseInt(r.contragent_count),
      drugSales: drugSalesArr,
    };
  }

  const terrFDRes = await queryable.query(
    `SELECT federal_district as name, COALESCE(SUM(COALESCE(amount, quantity, 0)), 0) as sales,
     COUNT(DISTINCT contragent) as contragent_count
     FROM world_medicine.raw_sales_rows WHERE ${baseWhere} AND federal_district IS NOT NULL
     GROUP BY federal_district ORDER BY sales DESC`,
    baseParams
  );
  const fdYearRes2 = await queryable.query(
    `SELECT federal_district, year::text as yr, COALESCE(SUM(COALESCE(amount, quantity, 0)), 0) as sales
     FROM world_medicine.raw_sales_rows WHERE user_id = $1 AND upload_id = $2 AND federal_district IS NOT NULL AND year IS NOT NULL
     GROUP BY federal_district, year`,
    [userId, uploadId]
  );
  const fdYearMap = new Map<string, Record<string, number>>();
  for (const r of fdYearRes2.rows) {
    if (!fdYearMap.has(r.federal_district)) fdYearMap.set(r.federal_district, {});
    fdYearMap.get(r.federal_district)![r.yr] = parseFloat(r.sales);
  }
  const fdDrugRes = await queryable.query(
    `SELECT federal_district, drug, COALESCE(SUM(COALESCE(amount, quantity, 0)), 0) as sales
     FROM world_medicine.raw_sales_rows WHERE ${baseWhere} AND federal_district IS NOT NULL AND drug IS NOT NULL
     GROUP BY federal_district, drug`,
    baseParams
  );
  const fdDrugMap = new Map<string, Array<{name: string, sales: number}>>();
  for (const r of fdDrugRes.rows) {
    if (!fdDrugMap.has(r.federal_district)) fdDrugMap.set(r.federal_district, []);
    fdDrugMap.get(r.federal_district)!.push({ name: r.drug, sales: parseFloat(r.sales) });
  }

  for (const r of terrFDRes.rows) {
    territoryHierarchy.federalDistricts[r.name] = {
      name: r.name, sales: parseFloat(r.sales),
      salesByYear: fdYearMap.get(r.name) || {},
      children: {},
      contragentCount: parseInt(r.contragent_count),
      drugSales: (fdDrugMap.get(r.name) || []).sort((a: any, b: any) => b.sales - a.sales),
    };
  }

  const terrCityRes = await queryable.query(
    `SELECT city as name, MAX(region) as region, COALESCE(SUM(COALESCE(amount, quantity, 0)), 0) as sales,
     COUNT(DISTINCT contragent) as contragent_count
     FROM world_medicine.raw_sales_rows WHERE ${baseWhere} AND city IS NOT NULL
     GROUP BY city ORDER BY sales DESC`,
    baseParams
  );
  const cityYearRes = await queryable.query(
    `SELECT city, year::text as yr, COALESCE(SUM(COALESCE(amount, quantity, 0)), 0) as sales
     FROM world_medicine.raw_sales_rows WHERE user_id = $1 AND upload_id = $2 AND city IS NOT NULL AND year IS NOT NULL
     GROUP BY city, year`,
    [userId, uploadId]
  );
  const cityYearMap = new Map<string, Record<string, number>>();
  for (const r of cityYearRes.rows) {
    if (!cityYearMap.has(r.city)) cityYearMap.set(r.city, {});
    cityYearMap.get(r.city)![r.yr] = parseFloat(r.sales);
  }
  const cityDrugRes = await queryable.query(
    `SELECT city, drug, COALESCE(SUM(COALESCE(amount, quantity, 0)), 0) as sales
     FROM world_medicine.raw_sales_rows WHERE ${baseWhere} AND city IS NOT NULL AND drug IS NOT NULL
     GROUP BY city, drug`,
    baseParams
  );
  const cityDrugMap = new Map<string, Array<{name: string, sales: number}>>();
  for (const r of cityDrugRes.rows) {
    if (!cityDrugMap.has(r.city)) cityDrugMap.set(r.city, []);
    cityDrugMap.get(r.city)!.push({ name: r.drug, sales: parseFloat(r.sales) });
  }

  for (const r of terrCityRes.rows) {
    const node = {
      name: r.name, sales: parseFloat(r.sales),
      salesByYear: cityYearMap.get(r.name) || {},
      children: {},
      contragentCount: parseInt(r.contragent_count),
      drugSales: (cityDrugMap.get(r.name) || []).sort((a: any, b: any) => b.sales - a.sales),
      region: r.region,
    };
    territoryHierarchy.cities[r.name] = node;
    if (r.region && territoryHierarchy.regions[r.region]) {
      territoryHierarchy.regions[r.region].children[r.name] = node;
    }
  }

  const terrDistRes = await queryable.query(
    `SELECT COALESCE(district, settlement) as name, MAX(city) as city, MAX(region) as region,
     COALESCE(SUM(COALESCE(amount, quantity, 0)), 0) as sales,
     COUNT(DISTINCT contragent) as contragent_count
     FROM world_medicine.raw_sales_rows WHERE ${baseWhere} AND (district IS NOT NULL OR settlement IS NOT NULL)
     GROUP BY COALESCE(district, settlement) ORDER BY sales DESC`,
    baseParams
  );
  const distYearRes = await queryable.query(
    `SELECT COALESCE(district, settlement) as dist, year::text as yr, COALESCE(SUM(COALESCE(amount, quantity, 0)), 0) as sales
     FROM world_medicine.raw_sales_rows WHERE user_id = $1 AND upload_id = $2 AND (district IS NOT NULL OR settlement IS NOT NULL) AND year IS NOT NULL
     GROUP BY COALESCE(district, settlement), year`,
    [userId, uploadId]
  );
  const distYearMap = new Map<string, Record<string, number>>();
  for (const r of distYearRes.rows) {
    if (!distYearMap.has(r.dist)) distYearMap.set(r.dist, {});
    distYearMap.get(r.dist)![r.yr] = parseFloat(r.sales);
  }
  const distDrugRes = await queryable.query(
    `SELECT COALESCE(district, settlement) as dist, drug, COALESCE(SUM(COALESCE(amount, quantity, 0)), 0) as sales
     FROM world_medicine.raw_sales_rows WHERE ${baseWhere} AND (district IS NOT NULL OR settlement IS NOT NULL) AND drug IS NOT NULL
     GROUP BY COALESCE(district, settlement), drug`,
    baseParams
  );
  const distDrugMap = new Map<string, Array<{name: string, sales: number}>>();
  for (const r of distDrugRes.rows) {
    if (!distDrugMap.has(r.dist)) distDrugMap.set(r.dist, []);
    distDrugMap.get(r.dist)!.push({ name: r.drug, sales: parseFloat(r.sales) });
  }

  for (const r of terrDistRes.rows) {
    if (!r.name) continue;
    const node = {
      name: r.name, sales: parseFloat(r.sales),
      salesByYear: distYearMap.get(r.name) || {},
      children: {},
      contragentCount: parseInt(r.contragent_count),
      drugSales: (distDrugMap.get(r.name) || []).sort((a: any, b: any) => b.sales - a.sales),
      region: r.region, city: r.city,
    };
    territoryHierarchy.districts[r.name] = node;
    if (r.city && territoryHierarchy.cities[r.city]) {
      territoryHierarchy.cities[r.city].children[r.name] = node;
    }
  }

  const weeklyRes = await queryable.query(
    `SELECT month, drug,
     CASE WHEN day <= 7 THEN 1 WHEN day <= 14 THEN 2 WHEN day <= 21 THEN 3 WHEN day <= 28 THEN 4 ELSE 5 END as week,
     COALESCE(SUM(COALESCE(quantity, 0)), 0) as quantity,
     COALESCE(SUM(COALESCE(amount, 0)), 0) as amount
     FROM world_medicine.raw_sales_rows WHERE ${baseWhere} AND day IS NOT NULL AND drug IS NOT NULL AND month IS NOT NULL
     GROUP BY month, drug,
       CASE WHEN day <= 7 THEN 1 WHEN day <= 14 THEN 2 WHEN day <= 21 THEN 3 WHEN day <= 28 THEN 4 ELSE 5 END
     ORDER BY month, week, drug`,
    baseParams
  );
  const weeklySales = weeklyRes.rows.map(r => ({
    month: normMonth(r.month),
    week: parseInt(r.week),
    drug: r.drug,
    quantity: parseFloat(r.quantity),
    amount: parseFloat(r.amount),
  }));
  console.log(`[AGG] year=${year}: weeklySales=${weeklySales.length} записей (из строк с day)`);

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
    weeklySales,
  };
}

export async function buildCompactRowsFromDB(pool: Pool, userId: number, uploadId: string): Promise<{ compactRows: any[]; contragentRows: any[] }> {
  const heavyClient = await getHeavyClient();
  try {
  const compactRes = await heavyClient.query(
    `SELECT year, month,
     CASE WHEN day IS NOT NULL THEN
       CASE WHEN day <= 7 THEN 1 WHEN day <= 14 THEN 2 WHEN day <= 21 THEN 3 WHEN day <= 28 THEN 4 ELSE 5 END
     ELSE NULL END as week,
     drug, region, city, federal_district as "federalDistrict",
     contractor_group as "contractorGroup", disposal_type as "disposalType",
     receiver_type as "receiverType",
     COALESCE(SUM(COALESCE(quantity, 0)), 0) as quantity,
     COALESCE(SUM(COALESCE(amount, 0)), 0) as amount
     FROM world_medicine.raw_sales_rows
     WHERE user_id = $1 AND upload_id = $2
     GROUP BY year, month,
       CASE WHEN day IS NOT NULL THEN
         CASE WHEN day <= 7 THEN 1 WHEN day <= 14 THEN 2 WHEN day <= 21 THEN 3 WHEN day <= 28 THEN 4 ELSE 5 END
       ELSE NULL END,
       drug, region, city, federal_district, contractor_group, disposal_type, receiver_type`,
    [userId, uploadId]
  );
  const compactRows = compactRes.rows.map(r => ({
    ...r, month: normMonth(r.month),
    week: r.week != null ? parseInt(r.week) : null,
    quantity: parseFloat(r.quantity), amount: parseFloat(r.amount),
    uploadId,
  }));
  console.log(`[buildCompactRows] compactRows: ${compactRows.length}, uploadId: ${uploadId}, disposalTypes: ${[...new Set(compactRows.map(r => r.disposalType).filter(Boolean))].join(', ')}`);

  const contragentRes = await heavyClient.query(
    `SELECT contragent, drug, region, city, year, month,
     contractor_group as "contractorGroup", receiver_type as "receiverType",
     federal_district as "federalDistrict", disposal_type as "disposalType",
     COALESCE(SUM(COALESCE(quantity, 0)), 0) as quantity,
     COALESCE(SUM(COALESCE(amount, 0)), 0) as amount
     FROM world_medicine.raw_sales_rows
     WHERE user_id = $1 AND upload_id = $2 AND contragent IS NOT NULL
     GROUP BY contragent, drug, region, city, year, month, contractor_group, receiver_type, federal_district, disposal_type`,
    [userId, uploadId]
  );
  const contragentRows = contragentRes.rows.map(r => ({
    ...r, month: normMonth(r.month),
    quantity: parseFloat(r.quantity), amount: parseFloat(r.amount),
    uploadId,
  }));

  return { compactRows, contragentRows };
  } finally {
    heavyClient.release();
  }
}

export async function cleanupRawRows(pool: Pool, userId: number, uploadId: string): Promise<void> {
  const client = await getHeavyClient();
  try {
    const result = await client.query(
      `DELETE FROM world_medicine.raw_sales_rows WHERE user_id = $1 AND upload_id = $2`,
      [userId, uploadId]
    );
    console.log(`[Cleanup] Удалено ${result.rowCount} raw rows для uploadId=${uploadId}`);
  } finally {
    client.release();
  }
}

function mergeNamedSalesArray(existing: Array<{name: string; sales: number; [k: string]: any}>, incoming: Array<{name: string; sales: number; [k: string]: any}>): Array<{name: string; sales: number; [k: string]: any}> {
  const map = new Map<string, any>();
  for (const item of existing) {
    map.set(item.name, { ...item });
  }
  for (const item of incoming) {
    const ex = map.get(item.name);
    if (ex) {
      ex.sales = (ex.sales || 0) + (item.sales || 0);
      if ('count' in item && 'count' in ex) ex.count = (ex.count || 0) + (item.count || 0);
    } else {
      map.set(item.name, { ...item });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.sales - a.sales);
}

function mergeTerritoryNodes(existing: Record<string, any>, incoming: Record<string, any>): Record<string, any> {
  const result = { ...existing };
  for (const [key, node] of Object.entries(incoming)) {
    if (result[key]) {
      const ex = result[key];
      ex.sales = (ex.sales || 0) + (node.sales || 0);
      ex.contragentCount = (ex.contragentCount || 0) + (node.contragentCount || 0);
      if (node.salesByYear) {
        if (!ex.salesByYear) ex.salesByYear = {};
        for (const [yr, val] of Object.entries(node.salesByYear)) {
          ex.salesByYear[yr] = (ex.salesByYear[yr] || 0) + (val as number);
        }
      }
      if (node.drugSales) {
        ex.drugSales = mergeNamedSalesArray(ex.drugSales || [], node.drugSales);
      }
      if (node.children) {
        ex.children = mergeTerritoryNodes(ex.children || {}, node.children);
      }
    } else {
      result[key] = JSON.parse(JSON.stringify(node));
    }
  }
  return result;
}

function mergeCombinedData(existing: any[], incoming: any[]): any[] {
  const map = new Map<string, any>();
  for (const item of existing) {
    const cleaned: any = {};
    for (const [key, val] of Object.entries(item)) {
      if (key.startsWith('forecast')) continue;
      cleaned[key] = val;
    }
    map.set(item.month, cleaned);
  }
  for (const item of incoming) {
    const ex = map.get(item.month);
    if (ex) {
      for (const [key, val] of Object.entries(item)) {
        if (key === 'month' || key === 'name' || key.startsWith('forecast')) continue;
        if (typeof val === 'number') {
          ex[key] = (ex[key] || 0) + val;
        }
      }
    } else {
      const cleaned: any = {};
      for (const [key, val] of Object.entries(item)) {
        if (key.startsWith('forecast')) continue;
        cleaned[key] = val;
      }
      map.set(item.month, cleaned);
    }
  }
  const result = MONTH_ORDER.filter(m => map.has(m)).map(m => map.get(m));
  const yearKeys = new Set<string>();
  for (const item of result) {
    for (const key of Object.keys(item)) {
      if (key !== 'month' && key !== 'name' && /^\d{4}$/.test(key)) yearKeys.add(key);
    }
  }
  if (yearKeys.size > 0) {
    const sortedYears = [...yearKeys].sort();
    const lastYear = sortedYears[sortedYears.length - 1];
    for (const item of result) {
      const lastVal = item[lastYear] || 0;
      item[`forecast${parseInt(lastYear) + 1}`] = Math.round(lastVal * 1.15);
    }
  }
  return result;
}

function mergeMonthlySales(existing: any[], incoming: any[]): any[] {
  const map = new Map<string, any>();
  for (const item of existing) {
    map.set(item.month, { ...item });
  }
  for (const item of incoming) {
    const ex = map.get(item.month);
    if (ex) {
      ex.sales = (ex.sales || 0) + (item.sales || 0);
    } else {
      map.set(item.month, { ...item });
    }
  }
  return MONTH_ORDER.filter(m => map.has(m)).map(m => map.get(m));
}

function mergeContragentSales(existing: any[], incoming: any[]): any[] {
  const map = new Map<string, any>();
  for (const item of existing) {
    map.set(item.name, { ...item });
  }
  for (const item of incoming) {
    const ex = map.get(item.name);
    if (ex) {
      ex.sales = (ex.sales || 0) + (item.sales || 0);
    } else {
      map.set(item.name, { ...item });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.sales - a.sales);
}

function mergeDrugAnalytics(existing: Record<string, any>, incoming: Record<string, any>): Record<string, any> {
  const result = { ...existing };
  for (const [drug, data] of Object.entries(incoming)) {
    if (result[drug]) {
      const ex = result[drug];
      ex.totalSales = (ex.totalSales || 0) + (data.totalSales || 0);
      ex.monthlySales = mergeMonthlySales(ex.monthlySales || [], data.monthlySales || []);
      ex.regionSales = mergeNamedSalesArray(ex.regionSales || [], data.regionSales || []);
      ex.contragentSales = mergeNamedSalesArray(ex.contragentSales || [], data.contragentSales || []);
      if (data.yearSales) {
        if (!ex.yearSales) ex.yearSales = {};
        for (const [yr, val] of Object.entries(data.yearSales)) {
          ex.yearSales[yr] = (ex.yearSales[yr] || 0) + (val as number);
        }
      }
    } else {
      result[drug] = JSON.parse(JSON.stringify(data));
    }
  }
  return result;
}

function mergeContragentAnalytics(existing: Record<string, any>, incoming: Record<string, any>): Record<string, any> {
  const result = { ...existing };
  for (const [name, data] of Object.entries(incoming)) {
    if (result[name]) {
      const ex = result[name];
      ex.totalSales = (ex.totalSales || 0) + (data.totalSales || 0);
      ex.drugSales = mergeNamedSalesArray(ex.drugSales || [], data.drugSales || []);
      ex.monthlySales = mergeMonthlySales(ex.monthlySales || [], data.monthlySales || []);
      if (data.yearSales) {
        if (!ex.yearSales) ex.yearSales = {};
        for (const [yr, val] of Object.entries(data.yearSales)) {
          ex.yearSales[yr] = (ex.yearSales[yr] || 0) + (val as number);
        }
      }
    } else {
      result[name] = JSON.parse(JSON.stringify(data));
    }
  }
  return result;
}

export function mergeAggregatedData(existing: AggregatedData, incoming: AggregatedData): AggregatedData {
  console.log(`[Merge] Объединение: existing drugs=${existing.drugs?.length || 0}, incoming drugs=${incoming.drugs?.length || 0}`);

  const drugSales = mergeNamedSalesArray(existing.drugSales || [], incoming.drugSales || []);
  const drugs = [...new Set([...(existing.drugs || []), ...(incoming.drugs || [])])].sort();

  const regionSales = mergeNamedSalesArray(existing.regionSales || [], incoming.regionSales || []);
  const contragentSales = mergeContragentSales(existing.contragentSales || [], incoming.contragentSales || []);
  const monthlySales = mergeMonthlySales(existing.monthlySales || [], incoming.monthlySales || []);
  const combinedData = mergeCombinedData(existing.combinedData || [], incoming.combinedData || []);
  const disposalTypeSales = mergeNamedSalesArray(existing.disposalTypeSales || [], incoming.disposalTypeSales || []);
  const federalDistrictSales = mergeNamedSalesArray(existing.federalDistrictSales || [], incoming.federalDistrictSales || []);
  const receiverTypeSales = mergeNamedSalesArray(existing.receiverTypeSales || [], incoming.receiverTypeSales || []);

  const drugAnalytics = mergeDrugAnalytics(existing.drugAnalytics || {}, incoming.drugAnalytics || {});
  const contragentAnalytics = mergeContragentAnalytics(existing.contragentAnalytics || {}, incoming.contragentAnalytics || {});

  const existingTH = existing.territoryHierarchy || { federalDistricts: {}, regions: {}, cities: {}, districts: {} };
  const incomingTH = incoming.territoryHierarchy || { federalDistricts: {}, regions: {}, cities: {}, districts: {} };
  const territoryHierarchy = {
    federalDistricts: mergeTerritoryNodes(existingTH.federalDistricts || {}, incomingTH.federalDistricts || {}),
    regions: mergeTerritoryNodes(existingTH.regions || {}, incomingTH.regions || {}),
    cities: mergeTerritoryNodes(existingTH.cities || {}, incomingTH.cities || {}),
    districts: mergeTerritoryNodes(existingTH.districts || {}, incomingTH.districts || {}),
  };

  const years = [...new Set([...(existing.years || []), ...(incoming.years || [])])].sort();

  const existingWeekly = existing.weeklySales || [];
  const incomingWeekly = incoming.weeklySales || [];
  const weeklyMergeMap = new Map<string, { quantity: number; amount: number }>();
  for (const w of [...existingWeekly, ...incomingWeekly]) {
    const key = `${w.month}|${w.week}|${w.drug}`;
    const ex = weeklyMergeMap.get(key) || { quantity: 0, amount: 0 };
    ex.quantity += w.quantity || 0;
    ex.amount += w.amount || 0;
    weeklyMergeMap.set(key, ex);
  }
  const weeklySales = [...weeklyMergeMap.entries()].map(([key, val]) => {
    const [month, week, drug] = key.split('|');
    return { month, week: parseInt(week), drug, quantity: val.quantity, amount: val.amount };
  });

  const merged: AggregatedData = {
    monthlySales,
    combinedData,
    contragentSales,
    regionSales,
    drugSales,
    disposalTypeSales: disposalTypeSales as any,
    federalDistrictSales,
    receiverTypeSales: receiverTypeSales as any,
    drugs,
    drugAnalytics,
    territoryHierarchy,
    contragentAnalytics,
    years,
    weeklySales,
  };

  console.log(`[Merge] Результат: drugs=${drugs.length}, regions=${regionSales.length}, contragents=${contragentSales.length}, months=${monthlySales.length}`);
  return merged;
}

const NUM_MONTH_MAP: Record<string, string> = {
  '1': 'Янв', '2': 'Фев', '3': 'Мар', '4': 'Апр', '5': 'Май', '6': 'Июн',
  '7': 'Июл', '8': 'Авг', '9': 'Сен', '10': 'Окт', '11': 'Ноя', '12': 'Дек',
  '01': 'Янв', '02': 'Фев', '03': 'Мар', '04': 'Апр', '05': 'Май', '06': 'Июн',
  '07': 'Июл', '08': 'Авг', '09': 'Сен', '10': 'Окт', '11': 'Ноя', '12': 'Дек',
};

function normalizeMonthValue(m: any): string {
  if (!m) return '';
  const s = String(m).trim();
  return NUM_MONTH_MAP[s] || MONTH_ORDER.find(mo => mo === s) || s;
}

export function reaggregateFromCompactRows(compactRows: any[], contragentRows: any[]): Map<number, AggregatedData> {
  const result = new Map<number, AggregatedData>();
  const allYearsSet = new Set<number>();
  
  for (const row of compactRows) {
    row.month = normalizeMonthValue(row.month);
    if (row.year && row.year !== 9999) allYearsSet.add(Number(row.year));
  }
  for (const row of (contragentRows || [])) {
    row.month = normalizeMonthValue(row.month);
  }
  const allYears = [...allYearsSet].sort();
  console.log(`[ReAgg] Годы из compact rows: ${allYears.join(', ')}, строк: ${compactRows.length}`);
  if (compactRows.length > 0) {
    const months = [...new Set(compactRows.map(r => r.month))];
    console.log(`[ReAgg] Уникальные месяцы после нормализации: ${months.join(', ')}`);
  }

  for (const year of allYears) {
    const yearRows = compactRows.filter(r => Number(r.year) === year);
    const yearStr = year.toString();

    const monthlyMap = new Map<string, number>();
    for (const r of yearRows) {
      if (!r.month) continue;
      monthlyMap.set(r.month, (monthlyMap.get(r.month) || 0) + (r.quantity || 0));
    }
    const monthlySales = MONTH_ORDER
      .filter(m => monthlyMap.has(m))
      .map(m => ({ month: m, name: MONTH_FULL_NAMES[m] || m, sales: monthlyMap.get(m)!, year }));

    const yearMonthMap = new Map<string, Map<string, number>>();
    for (const r of compactRows) {
      if (!r.month || !r.year || r.year === 9999) continue;
      const yr = String(r.year);
      if (!yearMonthMap.has(yr)) yearMonthMap.set(yr, new Map());
      const mm = yearMonthMap.get(yr)!;
      mm.set(r.month, (mm.get(r.month) || 0) + (r.quantity || 0));
    }

    const years = [...allYearsSet].sort().map(String);
    const combinedData = MONTH_ORDER.map(month => {
      const res: any = { month, name: MONTH_FULL_NAMES[month] || month };
      for (const yr of years) {
        const mm = yearMonthMap.get(yr);
        res[yr] = mm?.get(month) || 0;
      }
      const lastYear = years[years.length - 1];
      const lastYearValue = res[lastYear] || 0;
      res[`forecast${parseInt(lastYear) + 1}`] = Math.round(lastYearValue * 1.15);
      return res;
    });

    const drugMap = new Map<string, number>();
    const regionMap = new Map<string, number>();
    const disposalMap = new Map<string, { sales: number; count: number }>();
    const fdMap = new Map<string, number>();
    const receiverMap = new Map<string, { sales: number; count: number }>();

    for (const r of yearRows) {
      if (r.drug) drugMap.set(r.drug, (drugMap.get(r.drug) || 0) + (r.quantity || 0));
      if (r.region) regionMap.set(r.region, (regionMap.get(r.region) || 0) + (r.quantity || 0));
      if (r.disposalType) {
        const d = disposalMap.get(r.disposalType) || { sales: 0, count: 0 };
        d.sales += r.quantity || 0;
        d.count += 1;
        disposalMap.set(r.disposalType, d);
      }
      if (r.federalDistrict) fdMap.set(r.federalDistrict, (fdMap.get(r.federalDistrict) || 0) + (r.quantity || 0));
      if (r.receiverType) {
        const rt = receiverMap.get(r.receiverType) || { sales: 0, count: 0 };
        rt.sales += r.quantity || 0;
        rt.count += 1;
        receiverMap.set(r.receiverType, rt);
      }
    }

    const drugSales = [...drugMap.entries()].map(([name, sales]) => ({ name, sales })).sort((a, b) => b.sales - a.sales);
    const drugs = drugSales.map(d => d.name).sort();

    const contragentSalesMap = new Map<string, any>();
    for (const r of (contragentRows || []).filter((cr: any) => Number(cr.year) === year)) {
      const key = r.contragent;
      if (!key) continue;
      if (!contragentSalesMap.has(key)) {
        contragentSalesMap.set(key, { name: key, sales: 0, region: r.region, contractorGroup: r.contractorGroup, receiverType: r.receiverType });
      }
      contragentSalesMap.get(key).sales += r.quantity || 0;
    }
    const contragentSales = [...contragentSalesMap.values()].sort((a, b) => b.sales - a.sales);

    const drugContragentMap = new Map<string, Map<string, number>>();
    for (const cr of (contragentRows || []).filter((r: any) => Number(r.year) === year)) {
      if (cr.drug && cr.contragent) {
        if (!drugContragentMap.has(cr.drug)) drugContragentMap.set(cr.drug, new Map());
        const dm = drugContragentMap.get(cr.drug)!;
        dm.set(cr.contragent, (dm.get(cr.contragent) || 0) + (cr.quantity || 0));
      }
    }

    const drugAnalytics: Record<string, any> = {};
    for (const drug of drugs) {
      const monthlyData = new Map<string, number>();
      const regionData = new Map<string, number>();
      for (const r of yearRows) {
        if (r.drug !== drug) continue;
        if (r.month) monthlyData.set(r.month, (monthlyData.get(r.month) || 0) + (r.quantity || 0));
        if (r.region) regionData.set(r.region, (regionData.get(r.region) || 0) + (r.quantity || 0));
      }
      const drugYearSales: Record<string, number> = {};
      for (const yr of years) {
        let total = 0;
        for (const r of compactRows) {
          if (r.drug === drug && String(r.year) === yr) total += r.quantity || 0;
        }
        drugYearSales[yr] = total;
      }
      const drugContrSales = drugContragentMap.get(drug);
      const contragentSalesArr = drugContrSales
        ? Array.from(drugContrSales.entries()).map(([name, sales]) => ({ name, sales })).sort((a, b) => b.sales - a.sales)
        : [];
      drugAnalytics[drug] = {
        monthlySales: MONTH_ORDER.map(m => ({ month: m, name: MONTH_FULL_NAMES[m] || m, sales: monthlyData.get(m) || 0 })),
        regionSales: [...regionData.entries()].map(([name, sales]) => ({ name, sales })).sort((a, b) => b.sales - a.sales),
        contragentSales: contragentSalesArr,
        yearSales: drugYearSales,
      };
    }

    const territoryHierarchy: any = { federalDistricts: {}, regions: {}, cities: {}, districts: {} };

    const regionContragents = new Map<string, Set<string>>();
    const fdContragents = new Map<string, Set<string>>();
    const regionDrugs = new Map<string, Map<string, number>>();
    const fdDrugs = new Map<string, Map<string, number>>();
    const cityData = new Map<string, { sales: number; region: string; contragents: Set<string>; drugs: Map<string, number> }>();

    for (const r of yearRows) {
      const qty = r.quantity || 0;
      if (r.region) {
        if (!territoryHierarchy.regions[r.region]) {
          territoryHierarchy.regions[r.region] = { name: r.region, sales: 0, children: {}, contragentCount: 0, drugSales: [] };
          regionContragents.set(r.region, new Set());
          regionDrugs.set(r.region, new Map());
        }
        territoryHierarchy.regions[r.region].sales += qty;
        if (r.contragent) regionContragents.get(r.region)!.add(r.contragent);
        if (r.drug) {
          const rd = regionDrugs.get(r.region)!;
          rd.set(r.drug, (rd.get(r.drug) || 0) + qty);
        }
      }
      if (r.federalDistrict) {
        if (!territoryHierarchy.federalDistricts[r.federalDistrict]) {
          territoryHierarchy.federalDistricts[r.federalDistrict] = { name: r.federalDistrict, sales: 0, children: {}, contragentCount: 0, drugSales: [] };
          fdContragents.set(r.federalDistrict, new Set());
          fdDrugs.set(r.federalDistrict, new Map());
        }
        territoryHierarchy.federalDistricts[r.federalDistrict].sales += qty;
        if (r.contragent) fdContragents.get(r.federalDistrict)!.add(r.contragent);
        if (r.drug) {
          const fd = fdDrugs.get(r.federalDistrict)!;
          fd.set(r.drug, (fd.get(r.drug) || 0) + qty);
        }
      }
      if (r.city && r.region) {
        if (!cityData.has(r.city)) {
          cityData.set(r.city, { sales: 0, region: r.region, contragents: new Set(), drugs: new Map() });
        }
        const cd = cityData.get(r.city)!;
        cd.sales += qty;
        if (r.contragent) cd.contragents.add(r.contragent);
        if (r.drug) cd.drugs.set(r.drug, (cd.drugs.get(r.drug) || 0) + qty);
      }
    }

    for (const [rName, contragents] of regionContragents) {
      territoryHierarchy.regions[rName].contragentCount = contragents.size;
    }
    for (const [rName, drugs] of regionDrugs) {
      territoryHierarchy.regions[rName].drugSales = Array.from(drugs.entries())
        .map(([name, sales]) => ({ name, sales })).sort((a, b) => b.sales - a.sales);
    }
    for (const [fdName, contragents] of fdContragents) {
      territoryHierarchy.federalDistricts[fdName].contragentCount = contragents.size;
    }
    for (const [fdName, drugs] of fdDrugs) {
      territoryHierarchy.federalDistricts[fdName].drugSales = Array.from(drugs.entries())
        .map(([name, sales]) => ({ name, sales })).sort((a, b) => b.sales - a.sales);
    }
    for (const [cName, cd] of cityData) {
      const cityNode = {
        name: cName, sales: cd.sales, region: cd.region, children: {},
        contragentCount: cd.contragents.size,
        drugSales: Array.from(cd.drugs.entries()).map(([name, sales]) => ({ name, sales })).sort((a, b) => b.sales - a.sales),
      };
      territoryHierarchy.cities[cName] = cityNode;
      if (territoryHierarchy.regions[cd.region]) {
        territoryHierarchy.regions[cd.region].children[cName] = cityNode;
      }
    }

    const weeklyMap = new Map<string, { quantity: number; amount: number }>();
    for (const r of yearRows) {
      if (r.week != null && r.drug && r.month) {
        const key = `${r.month}|${r.week}|${r.drug}`;
        const ex = weeklyMap.get(key) || { quantity: 0, amount: 0 };
        ex.quantity += r.quantity || 0;
        ex.amount += r.amount || 0;
        weeklyMap.set(key, ex);
      }
    }
    const weeklySales = [...weeklyMap.entries()].map(([key, val]) => {
      const [month, week, drug] = key.split('|');
      return { month, week: parseInt(week), drug, quantity: val.quantity, amount: val.amount };
    });

    const agg: AggregatedData = {
      monthlySales,
      combinedData: combinedData.filter(d => Object.keys(d).length > 2),
      contragentSales,
      regionSales: [...regionMap.entries()].map(([name, sales]) => ({ name, sales })).sort((a, b) => b.sales - a.sales),
      drugSales,
      disposalTypeSales: [...disposalMap.entries()].map(([name, d]) => ({ name, sales: d.sales, count: d.count })),
      federalDistrictSales: [...fdMap.entries()].map(([name, sales]) => ({ name, sales })),
      receiverTypeSales: [...receiverMap.entries()].map(([name, d]) => ({ name, sales: d.sales, count: d.count })),
      drugs,
      drugAnalytics,
      territoryHierarchy,
      contragentAnalytics: {},
      years,
      weeklySales,
    };

    const totalSales = monthlySales.reduce((s, m) => s + m.sales, 0);
    console.log(`[ReAgg] year=${year}: totalSales=${totalSales}, monthlySales=${monthlySales.length}, combinedData=${agg.combinedData.length}, drugs=${drugs.length}, regions=${regionMap.size}`);
    if (agg.combinedData.length > 0) {
      console.log(`[ReAgg] combinedData[0]: ${JSON.stringify(agg.combinedData[0])}`);
    }
    result.set(year, agg);
  }

  return result;
}
