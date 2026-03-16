export function formatNumber(value: number, decimals: number = 0): string {
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatCurrency(value: number, currency: string = 'RUB'): string {
  return value.toLocaleString('ru-RU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatGrowth(value: number): string {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${value.toFixed(1)}%`;
}

export function formatDate(date: Date | string, format: 'short' | 'long' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (format === 'short') {
    return d.toLocaleDateString('ru-RU');
  }
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatPeriod(month: number, year: number): string {
  const months = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];
  return `${months[month - 1]} ${year}`;
}

export function shortenRegionName(name: string): string {
  return name
    .replace('Республика ', '')
    .replace(' область', '')
    .replace('г. ', '')
    .replace(' р-н', '');
}

export function getPlanStatus(actual: number, plan: number): 'success' | 'warning' | 'danger' {
  const ratio = actual / plan;
  if (ratio >= 1) return 'success';
  if (ratio >= 0.9) return 'warning';
  return 'danger';
}

export function getPlanStatusClass(status: 'success' | 'warning' | 'danger'): string {
  switch (status) {
    case 'success':
      return 'bg-emerald-100 text-emerald-700';
    case 'warning':
      return 'bg-amber-100 text-amber-700';
    case 'danger':
      return 'bg-red-100 text-red-700';
  }
}
