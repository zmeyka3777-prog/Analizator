export interface DrugPriceEntry {
  id: number;
  drug_pattern: string;
  drug_label: string;
  price_per_unit: string;
}

const warnedDrugs = new Set<string>();

export function findDrugPrice(drugName: string, prices: DrugPriceEntry[]): number | null {
  if (!drugName || !prices.length) return null;
  const lower = drugName.toLowerCase().trim();
  for (const p of prices) {
    if (lower.includes(p.drug_pattern.toLowerCase())) {
      return parseFloat(p.price_per_unit);
    }
  }
  if (!warnedDrugs.has(lower)) {
    warnedDrugs.add(lower);
    console.warn(`[PriceList] Препарат не найден в прайс-листе: "${drugName}"`);
  }
  return null;
}

export function convertToMoney(count: number, drugName: string, prices: DrugPriceEntry[]): number | null {
  const price = findDrugPrice(drugName, prices);
  if (price === null) return null;
  return count * price;
}

export function formatMoneyFull(value: number | null): string {
  if (value === null || isNaN(value)) return "—";
  return value.toLocaleString("ru-RU", { maximumFractionDigits: 0 }) + " ₽";
}

export function formatMoney(value: number | null): string {
  if (value === null || isNaN(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    return (value / 1_000_000_000).toFixed(1).replace('.', ',') + "B ₽";
  }
  if (abs >= 1_000_000) {
    return (value / 1_000_000).toFixed(1).replace('.', ',') + "M ₽";
  }
  return value.toLocaleString("ru-RU", { maximumFractionDigits: 0 }) + " ₽";
}

export function formatPackages(value: number): string {
  return value.toLocaleString("ru-RU", { maximumFractionDigits: 0 }) + " уп.";
}

export function formatValue(value: number, drugName: string | null, prices: DrugPriceEntry[], isMoney: boolean): string {
  if (!isMoney) return formatPackages(value);
  if (!drugName) return formatMoney(null);
  const money = convertToMoney(value, drugName, prices);
  return formatMoney(money);
}

export function convertTotal(items: Array<{ name: string; value: number }>, prices: DrugPriceEntry[]): number | null {
  let total = 0;
  let hasAny = false;
  for (const item of items) {
    const money = convertToMoney(item.value, item.name, prices);
    if (money !== null) {
      total += money;
      hasAny = true;
    }
  }
  return hasAny ? total : null;
}

export function convertDrugBreakdownToRubles(
  drugBreakdown: Array<{name: string; sales: number}>,
  prices: DrugPriceEntry[]
): number | null {
  let total = 0;
  let hasAny = false;
  for (const item of drugBreakdown) {
    const money = convertToMoney(item.sales, item.name, prices);
    if (money !== null) {
      total += money;
      hasAny = true;
    }
  }
  return hasAny ? total : null;
}

export function calcRublesRatio(
  drugSales: Array<{name: string; sales: number}> | null | undefined,
  prices: DrugPriceEntry[]
): number {
  if (!drugSales?.length || !prices.length) return 1;
  let totalRubles = 0;
  let totalPackages = 0;
  for (const d of drugSales) {
    const price = findDrugPrice(d.name, prices);
    if (price !== null) {
      totalRubles += d.sales * price;
      totalPackages += d.sales;
    }
  }
  if (totalPackages === 0) return 1;
  return totalRubles / totalPackages;
}

export function formatDual(packages: number, rubles: number | null): { pkg: string; rub: string } {
  return {
    pkg: packages.toLocaleString('ru-RU') + ' уп.',
    rub: rubles !== null ? formatMoney(rubles) : '—'
  };
}
