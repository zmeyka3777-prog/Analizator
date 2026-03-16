export interface UploadedMonth {
  year: number;
  month: number;
  uploadedAt: Date;
}

const STORAGE_KEY = 'mdlp_uploaded_months';

export function getUploadedMonths(): UploadedMonth[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return parsed.map((item: any) => ({ ...item, uploadedAt: new Date(item.uploadedAt) }));
  } catch (error) { console.error('Error loading uploaded months:', error); return []; }
}

export function markMonthAsUploaded(year: number, month: number): void {
  const uploaded = getUploadedMonths();
  if (uploaded.some(item => item.year === year && item.month === month)) return;
  uploaded.push({ year, month, uploadedAt: new Date() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(uploaded));
}

export function isMonthUploaded(year: number, month: number): boolean {
  return getUploadedMonths().some(item => item.year === year && item.month === month);
}

export function getLastUploadedMonth(year: number): number {
  const uploaded = getUploadedMonths().filter(item => item.year === year).sort((a, b) => b.month - a.month);
  return uploaded.length > 0 ? uploaded[0].month : 0;
}

export function initializeUploadedMonths(): void {
  const uploaded = getUploadedMonths();
  if (uploaded.length > 0) return;
  const months: UploadedMonth[] = [];
  for (let year = 2024; year <= 2025; year++) {
    for (let month = 1; month <= 12; month++) {
      months.push({ year, month, uploadedAt: new Date('2026-01-01') });
    }
  }
  months.push({ year: 2026, month: 1, uploadedAt: new Date() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(months));
}

export function clearUploadedMonths(): void {
  localStorage.removeItem(STORAGE_KEY);
}
