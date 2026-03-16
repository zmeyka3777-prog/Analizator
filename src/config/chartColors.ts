export const CHART_COLORS = {
  year2024: '#94a3b8',
  year2024Fill: '#94a3b820',
  year2025: '#1E3A5F',
  year2026: '#00A8B5',
  plan: '#f59e0b',
  forecast: '#10b981',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  grid: '#e2e8f0',
} as const;

export const YEAR_COLORS: Record<string, string> = {
  '2024': CHART_COLORS.year2024,
  '2025': CHART_COLORS.year2025,
  '2026': CHART_COLORS.year2026,
  'plan': CHART_COLORS.plan,
};

export function getPerformanceColor(actual: number, target: number): string {
  if (actual >= target) return CHART_COLORS.success;
  if (actual >= target * 0.9) return CHART_COLORS.warning;
  return CHART_COLORS.error;
}
