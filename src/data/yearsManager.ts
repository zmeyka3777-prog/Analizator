export interface YearData {
  year: number;
  isActive: boolean;
  isForecast: boolean;
  createdAt: string;
  hasData: boolean;
}

const STORAGE_KEY = 'world_medicine_years';

const DEFAULT_YEARS: YearData[] = [
  { year: 2024, isActive: true, isForecast: false, createdAt: '2024-01-01T00:00:00.000Z', hasData: true },
  { year: 2025, isActive: true, isForecast: false, createdAt: '2025-01-01T00:00:00.000Z', hasData: true },
  { year: 2026, isActive: true, isForecast: true, createdAt: '2026-01-01T00:00:00.000Z', hasData: false },
];

export function getAllYears(): YearData[] {
  if (typeof window === 'undefined') return DEFAULT_YEARS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) { console.error('Error loading years:', e); }
  return DEFAULT_YEARS;
}

export function saveAllYears(years: YearData[]): void {
  if (typeof window === 'undefined') return;
  try {
    const sorted = [...years].sort((a, b) => a.year - b.year);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
  } catch (e) { console.error('Error saving years:', e); }
}

export function addYear(year: number, isForecast: boolean = true): YearData | null {
  const years = getAllYears();
  if (years.some(y => y.year === year)) return null;
  const newYear: YearData = { year, isActive: true, isForecast, createdAt: new Date().toISOString(), hasData: false };
  years.push(newYear);
  saveAllYears(years);
  return newYear;
}

export function updateYear(year: number, updates: Partial<YearData>): YearData | null {
  const years = getAllYears();
  const index = years.findIndex(y => y.year === year);
  if (index === -1) return null;
  years[index] = { ...years[index], ...updates };
  saveAllYears(years);
  return years[index];
}

export function deleteYear(year: number): boolean {
  const years = getAllYears();
  const filtered = years.filter(y => y.year !== year);
  if (filtered.length === years.length || filtered.length === 0) return false;
  saveAllYears(filtered);
  return true;
}

export function getActiveYears(): YearData[] {
  return getAllYears().filter(y => y.isActive);
}

export function getYearsWithData(): YearData[] {
  return getAllYears().filter(y => y.hasData);
}

export function getYearRange(): { minYear: number; maxYear: number } {
  const years = getAllYears();
  const yearNumbers = years.map(y => y.year);
  return { minYear: Math.min(...yearNumbers), maxYear: Math.max(...yearNumbers) };
}

export function getYearByNumber(year: number): YearData | null {
  return getAllYears().find(y => y.year === year) || null;
}

export function markYearAsHasData(year: number): boolean {
  return updateYear(year, { hasData: true, isForecast: false }) !== null;
}

export function getNextYear(): number {
  const { maxYear } = getYearRange();
  return maxYear + 1;
}

export function resetToDefaultYears(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export function isForecastYear(year: number): boolean {
  const yearData = getYearByNumber(year);
  return yearData?.isForecast ?? false;
}

export function hasDataForYear(year: number): boolean {
  const yearData = getYearByNumber(year);
  return yearData?.hasData ?? false;
}
