// ==================== ВКЛАДКА ОТЧЁТОВ — СВЕТЛАЯ ТЕМА ====================

import React, { useState, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import {
  FileText, Download, FileSpreadsheet, FileType, Calendar,
  CheckCircle, Loader2, Trash2, Eye, Plus, RefreshCw,
  Pill, MapPin, Wrench, Archive, TrendingUp, TrendingDown,
  BarChart3, Package, AlertCircle,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import {
  PRODUCTS,
  TERRITORIES,
  getSalesData,
} from '@/data/salesData';

// ==================== ТИПЫ ====================

type ReportsView = 'builder' | 'preview' | 'archive';
type ReportTemplate = 'monthly' | 'quarterly' | 'annual' | 'custom';
type ReportFormat = 'pdf' | 'excel' | 'csv';
type GenerationStatus = 'idle' | 'generating' | 'done' | 'error';

interface ReportConfig {
  template: ReportTemplate;
  format: ReportFormat;
  periodStart: string;
  periodEnd: string;
  selectedProducts: string[]; // product.id (string)
  selectedTerritories: string[]; // territory name
  includeCharts: boolean;
  includeSummary: boolean;
  includeDetails: boolean;
}

interface ProductRow {
  id: string;
  shortName: string;
  category: string;
  revenue: number;
  units: number;
  prevRevenue: number;
  plan: number;
  growth: number;
  planExec: number;
}

interface TerritoryRow {
  territory: string;
  revenue: number;
  units: number;
  share: number;
}

interface MonthlyRow {
  month: string;
  revenue: number;
  prevRevenue: number;
  units: number;
}

interface GeneratedReport {
  title: string;
  period: string;
  year: number;
  format: ReportFormat;
  generatedAt: string;
  productRows: ProductRow[];
  territoryRows: TerritoryRow[];
  monthlyData: MonthlyRow[];
  totalRevenue: number;
  totalUnits: number;
  planExecution: number;
  growthVsPrev: number;
  config: ReportConfig;
}

interface SavedReport {
  id: string;
  name: string;
  template: ReportTemplate;
  format: ReportFormat;
  date: string;
  size: string;
  status: 'ready' | 'expired';
  reportData?: GeneratedReport;
}

// ==================== КОНСТАНТЫ ====================

const TEMPLATE_LABELS: Record<ReportTemplate, string> = {
  monthly: 'Ежемесячный',
  quarterly: 'Квартальный',
  annual: 'Годовой',
  custom: 'Пользовательский',
};

const TEMPLATE_DESCRIPTIONS: Record<ReportTemplate, string> = {
  monthly: 'Отчёт за выбранный месяц с детализацией по препаратам и территориям',
  quarterly: 'Квартальный сводный отчёт с динамикой и сравнением план/факт',
  annual: 'Полный годовой отчёт по всем направлениям деятельности',
  custom: 'Настраиваемый отчёт с произвольными фильтрами и периодом',
};

const PERIOD_PRESETS = [
  { label: 'Янв 2026', start: '2026-01-01', end: '2026-01-31' },
  { label: 'Q1 2026', start: '2026-01-01', end: '2026-03-31' },
  { label: 'Q4 2025', start: '2025-10-01', end: '2025-12-31' },
  { label: '2025 год', start: '2025-01-01', end: '2025-12-31' },
  { label: '2024 год', start: '2024-01-01', end: '2024-12-31' },
];

const MONTH_NAMES = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

const MOCK_SAVED_REPORTS: SavedReport[] = [
  { id: '1', name: 'Ежемесячный отчёт - Январь 2026', template: 'monthly', format: 'pdf', date: '31.01.2026', size: '2.4 МБ', status: 'ready' },
  { id: '2', name: 'Квартальный отчёт - Q4 2025', template: 'quarterly', format: 'excel', date: '15.01.2026', size: '5.1 МБ', status: 'ready' },
  { id: '3', name: 'Годовой отчёт 2025', template: 'annual', format: 'pdf', date: '10.01.2026', size: '12.8 МБ', status: 'ready' },
  { id: '4', name: 'Отчёт по НПВС - Декабрь 2025', template: 'custom', format: 'csv', date: '05.01.2026', size: '0.8 МБ', status: 'ready' },
  { id: '5', name: 'Ежемесячный отчёт - Декабрь 2025', template: 'monthly', format: 'excel', date: '31.12.2025', size: '3.2 МБ', status: 'expired' },
];

// ==================== ФОРМАТИРОВАНИЕ ====================

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);

const formatNumber = (n: number) =>
  new Intl.NumberFormat('ru-RU').format(Math.round(n));

const formatGrowth = (n: number) => (n >= 0 ? `+${n.toFixed(1)}%` : `${n.toFixed(1)}%`);

// ==================== ГЕНЕРАЦИЯ ДАННЫХ ОТЧЁТА ====================

function computeReportData(config: ReportConfig): GeneratedReport {
  const startYear = parseInt(config.periodStart.split('-')[0]);
  const startMonth = parseInt(config.periodStart.split('-')[1]);
  const endMonth = parseInt(config.periodEnd.split('-')[1]);
  const endYear = parseInt(config.periodEnd.split('-')[0]);
  // Используем год начала периода (для простоты — внутри одного года)
  const year = startYear;
  const monthsCount = endYear === startYear
    ? endMonth - startMonth + 1
    : 12 - startMonth + 1 + endMonth;

  const activeProductIds = config.selectedProducts;
  const activeProducts = PRODUCTS.filter(p => activeProductIds.includes(p.id));
  const activeTerritories = config.selectedTerritories.length > 0
    ? config.selectedTerritories
    : TERRITORIES;

  // ---- Строки по препаратам ----
  const productRows: ProductRow[] = activeProducts.map(product => {
    const currentSales = getSalesData({ productId: product.id, year })
      .filter(d => d.month >= startMonth && d.month <= endMonth);
    const prevSales = getSalesData({ productId: product.id, year: year - 1 })
      .filter(d => d.month >= startMonth && d.month <= endMonth);

    const revenue = currentSales.reduce((sum, d) => sum + d.revenue, 0);
    const units = currentSales.reduce((sum, d) => sum + d.units, 0);
    const prevRevenue = prevSales.reduce((sum, d) => sum + d.revenue, 0);

    const yearPlan = product.budget2025 ?? (product.price * product.quota2025);
    const plan = yearPlan * monthsCount / 12;
    const growth = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;
    const planExec = plan > 0 ? (revenue / plan) * 100 : 0;

    return {
      id: product.id,
      shortName: product.shortName || product.name,
      category: product.category || '',
      revenue,
      units,
      prevRevenue,
      plan,
      growth,
      planExec,
    };
  }).sort((a, b) => b.revenue - a.revenue);

  // ---- Строки по территориям ----
  const totalForShare = productRows.reduce((sum, r) => sum + r.revenue, 0);
  const territoryRows: TerritoryRow[] = activeTerritories.map(territory => {
    const currentSales = getSalesData({ territory, year })
      .filter(d => d.month >= startMonth && d.month <= endMonth)
      .filter(d => activeProductIds.includes(d.productId));
    const revenue = currentSales.reduce((sum, d) => sum + d.revenue, 0);
    const units = currentSales.reduce((sum, d) => sum + d.units, 0);
    return { territory, revenue, units, share: totalForShare > 0 ? (revenue / totalForShare) * 100 : 0 };
  }).sort((a, b) => b.revenue - a.revenue);

  // ---- Помесячная динамика ----
  const monthlyData: MonthlyRow[] = MONTH_NAMES.map((monthName, idx) => {
    const monthNum = idx + 1;
    const cur = getSalesData({ year, month: monthNum })
      .filter(d => activeProductIds.includes(d.productId));
    const prev = getSalesData({ year: year - 1, month: monthNum })
      .filter(d => activeProductIds.includes(d.productId));
    return {
      month: monthName,
      revenue: cur.reduce((sum, d) => sum + d.revenue, 0),
      prevRevenue: prev.reduce((sum, d) => sum + d.revenue, 0),
      units: cur.reduce((sum, d) => sum + d.units, 0),
    };
  });

  // ---- Итоги ----
  const totalRevenue = productRows.reduce((sum, r) => sum + r.revenue, 0);
  const totalUnits = productRows.reduce((sum, r) => sum + r.units, 0);
  const totalPlan = productRows.reduce((sum, r) => sum + r.plan, 0);
  const totalPrevRevenue = productRows.reduce((sum, r) => sum + r.prevRevenue, 0);
  const planExecution = totalPlan > 0 ? (totalRevenue / totalPlan) * 100 : 0;
  const growthVsPrev = totalPrevRevenue > 0 ? ((totalRevenue - totalPrevRevenue) / totalPrevRevenue) * 100 : 0;

  const templateLabel = TEMPLATE_LABELS[config.template];
  const period = `${config.periodStart} — ${config.periodEnd}`;

  return {
    title: `${templateLabel} отчёт ${year}`,
    period,
    year,
    format: config.format,
    generatedAt: new Date().toLocaleString('ru-RU'),
    productRows,
    territoryRows,
    monthlyData,
    totalRevenue,
    totalUnits,
    planExecution,
    growthVsPrev,
    config,
  };
}

// ==================== ЭКСПОРТ В PDF (браузерная печать) ====================

function downloadPDF(report: GeneratedReport) {
  const totalPlan = report.productRows.reduce((s, r) => s + r.plan, 0);
  const totalPrevRevenue = report.productRows.reduce((s, r) => s + r.prevRevenue, 0);

  const productRows = report.productRows.map((r, i) => `
    <tr>
      <td class="num">${i + 1}</td>
      <td>${r.shortName}</td>
      <td class="cat">${r.category}</td>
      <td class="right">${formatCurrency(r.revenue)}</td>
      <td class="right">${formatNumber(r.units)}</td>
      <td class="right">${formatCurrency(r.plan)}</td>
      <td class="right ${r.planExec >= 90 ? 'green' : r.planExec >= 70 ? 'yellow' : 'red'}">${r.planExec.toFixed(1)}%</td>
      <td class="right ${r.growth >= 0 ? 'green' : 'red'}">${formatGrowth(r.growth)}</td>
    </tr>
  `).join('');

  const territoryRows = report.territoryRows.map((r, i) => `
    <tr>
      <td class="num">${i + 1}</td>
      <td>${r.territory}</td>
      <td class="right">${formatCurrency(r.revenue)}</td>
      <td class="right">${formatNumber(r.units)}</td>
      <td class="right">${r.share.toFixed(1)}%</td>
    </tr>
  `).join('');

  const monthlyRows = report.monthlyData.map(r => {
    const growth = r.prevRevenue > 0 ? ((r.revenue - r.prevRevenue) / r.prevRevenue) * 100 : 0;
    return `
      <tr>
        <td>${r.month}</td>
        <td class="right">${formatCurrency(r.revenue)}</td>
        <td class="right">${formatCurrency(r.prevRevenue)}</td>
        <td class="right ${growth >= 0 ? 'green' : 'red'}">${formatGrowth(growth)}</td>
        <td class="right">${formatNumber(r.units)}</td>
      </tr>
    `;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>${report.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #1e293b; padding: 24px; }
    h1 { font-size: 18px; font-weight: bold; color: #0f172a; margin-bottom: 2px; }
    .subtitle { font-size: 11px; color: #64748b; margin-bottom: 16px; }
    .kpi-row { display: flex; gap: 12px; margin-bottom: 20px; }
    .kpi { flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; }
    .kpi-label { font-size: 9px; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em; }
    .kpi-value { font-size: 16px; font-weight: bold; color: #0f172a; margin-top: 2px; }
    .kpi-sub { font-size: 9px; color: #94a3b8; margin-top: 1px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 12px; font-weight: bold; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { background: #f8fafc; text-align: left; padding: 6px 8px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0; font-size: 9px; text-transform: uppercase; }
    td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; color: #334155; }
    tr:last-child td { border-bottom: none; }
    .right { text-align: right; }
    .num { text-align: center; color: #94a3b8; width: 28px; }
    .cat { color: #94a3b8; font-size: 9px; }
    .green { color: #16a34a; font-weight: 600; }
    .yellow { color: #d97706; font-weight: 600; }
    .red { color: #dc2626; font-weight: 600; }
    .footer { margin-top: 24px; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; }
    @media print {
      body { padding: 12px; }
      @page { margin: 12mm; size: A4; }
    }
  </style>
</head>
<body>
  <h1>${report.title}</h1>
  <div class="subtitle">Период: ${report.period} · Сформирован: ${report.generatedAt} · World Medicine ПФО</div>

  ${report.config.includeSummary ? `
  <div class="kpi-row">
    <div class="kpi">
      <div class="kpi-label">Выручка</div>
      <div class="kpi-value">${formatCurrency(report.totalRevenue)}</div>
      <div class="kpi-sub">Пред. период: ${formatCurrency(totalPrevRevenue)}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Упаковки</div>
      <div class="kpi-value">${formatNumber(report.totalUnits)}</div>
      <div class="kpi-sub">${report.productRows.length} препаратов</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Вып. плана</div>
      <div class="kpi-value ${report.planExecution >= 90 ? 'green' : report.planExecution >= 70 ? 'yellow' : 'red'}">${report.planExecution.toFixed(1)}%</div>
      <div class="kpi-sub">План: ${formatCurrency(totalPlan)}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Рост YoY</div>
      <div class="kpi-value ${report.growthVsPrev >= 0 ? 'green' : 'red'}">${formatGrowth(report.growthVsPrev)}</div>
      <div class="kpi-sub">vs ${report.year - 1} год</div>
    </div>
  </div>
  ` : ''}

  ${report.config.includeDetails ? `
  <div class="section">
    <div class="section-title">По препаратам</div>
    <table>
      <thead>
        <tr>
          <th>№</th><th>Препарат</th><th>Категория</th>
          <th class="right">Выручка</th><th class="right">Упак.</th>
          <th class="right">План</th><th class="right">Вып. %</th><th class="right">Рост</th>
        </tr>
      </thead>
      <tbody>${productRows}</tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">По территориям</div>
    <table>
      <thead>
        <tr><th>№</th><th>Территория</th><th class="right">Выручка</th><th class="right">Упак.</th><th class="right">Доля</th></tr>
      </thead>
      <tbody>${territoryRows}</tbody>
    </table>
  </div>
  ` : ''}

  ${report.config.includeCharts ? `
  <div class="section">
    <div class="section-title">Помесячная динамика: ${report.year} vs ${report.year - 1}</div>
    <table>
      <thead>
        <tr><th>Месяц</th><th class="right">Выручка ${report.year}</th><th class="right">Выручка ${report.year - 1}</th><th class="right">Рост</th><th class="right">Упак.</th></tr>
      </thead>
      <tbody>${monthlyRows}</tbody>
    </table>
  </div>
  ` : ''}

  <div class="footer">Отчёт сформирован автоматически · World Medicine Анализатор МДЛП · ${report.generatedAt}</div>

  <script>window.onload = () => { setTimeout(() => { window.print(); }, 300); }</script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// ==================== ЭКСПОРТ В EXCEL ====================

function downloadExcel(report: GeneratedReport) {
  const wb = XLSX.utils.book_new();

  // Лист 1: Сводка
  const summaryWS = XLSX.utils.aoa_to_sheet([
    ['Отчёт', report.title],
    ['Период', report.period],
    ['Дата формирования', report.generatedAt],
    [],
    ['Показатель', 'Значение'],
    ['Общая выручка (руб.)', report.totalRevenue],
    ['Упаковки', report.totalUnits],
    ['Выполнение плана (%)', parseFloat(report.planExecution.toFixed(1))],
    ['Рост vs предыдущий период (%)', parseFloat(report.growthVsPrev.toFixed(1))],
  ]);
  XLSX.utils.book_append_sheet(wb, summaryWS, 'Сводка');

  // Лист 2: По препаратам
  const prodHeaders = ['Препарат', 'Категория', 'Выручка (руб.)', 'Упаковки', 'План (руб.)', 'Вып. плана %', 'Рост %'];
  const prodData = report.productRows.map(r => [
    r.shortName, r.category, r.revenue, r.units,
    Math.round(r.plan), parseFloat(r.planExec.toFixed(1)), parseFloat(r.growth.toFixed(1)),
  ]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([prodHeaders, ...prodData]), 'По препаратам');

  // Лист 3: По территориям
  const terrHeaders = ['Территория', 'Выручка (руб.)', 'Упаковки', 'Доля %'];
  const terrData = report.territoryRows.map(r => [
    r.territory, r.revenue, r.units, parseFloat(r.share.toFixed(1)),
  ]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([terrHeaders, ...terrData]), 'По территориям');

  // Лист 4: Помесячная динамика
  const monthHeaders = ['Месяц', 'Выручка (руб.)', 'Пред. период (руб.)', 'Рост %', 'Упаковки'];
  const monthData = report.monthlyData.map(r => [
    r.month, r.revenue, r.prevRevenue,
    r.prevRevenue > 0 ? parseFloat((((r.revenue - r.prevRevenue) / r.prevRevenue) * 100).toFixed(1)) : 0,
    r.units,
  ]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([monthHeaders, ...monthData]), 'Динамика');

  XLSX.writeFile(wb, `${report.title}.xlsx`);
}

// ==================== ЭКСПОРТ В CSV ====================

function downloadCSV(report: GeneratedReport) {
  const data = report.productRows.map(r => ({
    'Препарат': r.shortName,
    'Категория': r.category,
    'Выручка (руб.)': r.revenue,
    'Упаковки': r.units,
    'План (руб.)': Math.round(r.plan),
    'Вып. плана %': r.planExec.toFixed(1),
    'Рост %': r.growth.toFixed(1),
  }));
  const csv = Papa.unparse(data);
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${report.title}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ==================== КОМПОНЕНТ: КОНСТРУКТОР ====================

const BuilderView = ({
  config,
  setConfig,
  status,
  progress,
  onGenerate,
}: {
  config: ReportConfig;
  setConfig: React.Dispatch<React.SetStateAction<ReportConfig>>;
  status: GenerationStatus;
  progress: number;
  onGenerate: () => void;
}) => {
  const toggleProduct = (id: string) =>
    setConfig(prev => ({
      ...prev,
      selectedProducts: prev.selectedProducts.includes(id)
        ? prev.selectedProducts.filter(p => p !== id)
        : [...prev.selectedProducts, id],
    }));

  const selectAllProducts = () =>
    setConfig(prev => ({ ...prev, selectedProducts: PRODUCTS.map(p => p.id) }));
  const deselectAllProducts = () =>
    setConfig(prev => ({ ...prev, selectedProducts: [] }));

  const toggleTerritory = (t: string) =>
    setConfig(prev => ({
      ...prev,
      selectedTerritories: prev.selectedTerritories.includes(t)
        ? prev.selectedTerritories.filter(x => x !== t)
        : [...prev.selectedTerritories, t],
    }));

  const selectAllTerritories = () =>
    setConfig(prev => ({ ...prev, selectedTerritories: TERRITORIES }));
  const deselectAllTerritories = () =>
    setConfig(prev => ({ ...prev, selectedTerritories: [] }));

  const previewSummary = useMemo(() => {
    const selected = PRODUCTS.filter(p => config.selectedProducts.includes(p.id));
    return {
      products: selected.length === PRODUCTS.length ? `Все препараты (${PRODUCTS.length})` : `${selected.length} из ${PRODUCTS.length}`,
      period: `${config.periodStart} — ${config.periodEnd}`,
      format: config.format.toUpperCase(),
    };
  }, [config]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Левая колонка */}
      <div className="lg:col-span-2 space-y-5">
        {/* Шаблон */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-500" />
            Шаблон отчёта
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {(Object.keys(TEMPLATE_LABELS) as ReportTemplate[]).map(tmpl => (
              <button
                key={tmpl}
                onClick={() => setConfig(prev => ({ ...prev, template: tmpl }))}
                className={`p-4 rounded-xl border transition-all text-left ${
                  config.template === tmpl
                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <p className="text-slate-800 font-semibold text-sm">{TEMPLATE_LABELS[tmpl]}</p>
                <p className="text-slate-400 text-xs mt-1 leading-tight">{TEMPLATE_DESCRIPTIONS[tmpl]}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Период + Формат */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-500" />
              Период
            </h3>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-slate-500 mb-1 block">С</label>
                <input
                  type="date"
                  value={config.periodStart}
                  onChange={e => setConfig(prev => ({ ...prev, periodStart: e.target.value }))}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-slate-500 mb-1 block">По</label>
                <input
                  type="date"
                  value={config.periodEnd}
                  onChange={e => setConfig(prev => ({ ...prev, periodEnd: e.target.value }))}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {PERIOD_PRESETS.map(preset => (
                <button
                  key={preset.label}
                  onClick={() => setConfig(prev => ({ ...prev, periodStart: preset.start, periodEnd: preset.end }))}
                  className={`px-3 py-1 rounded-lg text-xs transition-all ${
                    config.periodStart === preset.start && config.periodEnd === preset.end
                      ? 'bg-purple-100 text-purple-700 border border-purple-300'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-500" />
              Формат экспорта
            </h3>
            <div className="flex gap-3">
              {(['pdf', 'excel', 'csv'] as ReportFormat[]).map(fmt => (
                <button
                  key={fmt}
                  onClick={() => setConfig(prev => ({ ...prev, format: fmt }))}
                  className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                    config.format === fmt
                      ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  {fmt === 'pdf' && <FileType className="w-5 h-5 text-red-400" />}
                  {fmt === 'excel' && <FileSpreadsheet className="w-5 h-5 text-emerald-500" />}
                  {fmt === 'csv' && <FileText className="w-5 h-5 text-blue-500" />}
                  <span className="text-slate-800 text-xs font-semibold uppercase">{fmt}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-2 pt-3 border-t border-slate-100">
              {[
                { key: 'includeSummary', label: 'Сводка (KPI)' },
                { key: 'includeCharts', label: 'Графики динамики' },
                { key: 'includeDetails', label: 'Детализация таблицы' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config[key as keyof ReportConfig] as boolean}
                    onChange={e => setConfig(prev => ({ ...prev, [key]: e.target.checked }))}
                    className="rounded accent-blue-500"
                  />
                  <span className="text-slate-700 text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Препараты + Территории */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Препараты */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Pill className="w-4 h-4 text-blue-500" />
                Препараты ({config.selectedProducts.length}/{PRODUCTS.length})
              </h3>
              <div className="flex gap-2">
                <button onClick={selectAllProducts} className="text-xs text-blue-500 hover:underline">Все</button>
                <span className="text-slate-300">|</span>
                <button onClick={deselectAllProducts} className="text-xs text-slate-400 hover:underline">Снять</button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-1 max-h-52 overflow-y-auto pr-1">
              {PRODUCTS.map(product => (
                <label
                  key={product.id}
                  className="flex items-center gap-2 py-1.5 px-2 cursor-pointer hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={config.selectedProducts.includes(product.id)}
                    onChange={() => toggleProduct(product.id)}
                    className="rounded accent-blue-500 flex-shrink-0"
                  />
                  <span className="text-slate-700 text-sm truncate">{product.shortName || product.name}</span>
                  <span className="text-slate-400 text-xs ml-auto flex-shrink-0">{product.category}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Территории (округа) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-cyan-500" />
                Территории ({config.selectedTerritories.length}/{TERRITORIES.length})
              </h3>
              <div className="flex gap-2">
                <button onClick={selectAllTerritories} className="text-xs text-cyan-500 hover:underline">Все</button>
                <span className="text-slate-300">|</span>
                <button onClick={deselectAllTerritories} className="text-xs text-slate-400 hover:underline">Снять</button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-1 max-h-52 overflow-y-auto pr-1">
              {TERRITORIES.map(territory => (
                <label
                  key={territory}
                  className="flex items-center gap-2 py-1.5 px-2 cursor-pointer hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={config.selectedTerritories.includes(territory)}
                    onChange={() => toggleTerritory(territory)}
                    className="rounded accent-cyan-500 flex-shrink-0"
                  />
                  <span className="text-slate-700 text-sm truncate">{territory}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Правая колонка: предпросмотр + кнопка */}
      <div className="space-y-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Eye className="w-4 h-4 text-amber-500" />
            Конфигурация отчёта
          </h3>
          <div className="space-y-3">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100">
              <p className="text-slate-800 font-bold">{TEMPLATE_LABELS[config.template]} отчёт</p>
              <p className="text-slate-500 text-xs mt-1">{previewSummary.period}</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Препараты</span>
                <span className="text-slate-800 font-medium">{previewSummary.products}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Формат</span>
                <span className="text-slate-800 font-semibold">{previewSummary.format}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-500">Разделы</span>
                <div className="flex gap-1">
                  {config.includeSummary && <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">KPI</span>}
                  {config.includeCharts && <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">График</span>}
                  {config.includeDetails && <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">Таблица</span>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Кнопка генерации */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          {status === 'idle' && (
            <button
              onClick={onGenerate}
              disabled={config.selectedProducts.length === 0}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
            >
              <Plus className="w-5 h-5" />
              Сформировать отчёт
            </button>
          )}

          {status === 'generating' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-blue-600">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="font-semibold text-sm">Генерация отчёта...</span>
              </div>
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <p className="text-slate-500 text-xs text-center">{Math.min(progress, 100)}%</p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-red-500">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium text-sm">Ошибка генерации</span>
              </div>
              <button
                onClick={onGenerate}
                className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Повторить
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== КОМПОНЕНТ: ПРОСМОТР ====================

const PreviewView = ({
  report,
  onSave,
  onBack,
}: {
  report: GeneratedReport;
  onSave: () => void;
  onBack: () => void;
}) => {
  const handleDownload = () => {
    if (report.format === 'excel') {
      downloadExcel(report);
    } else if (report.format === 'csv') {
      downloadCSV(report);
    } else {
      downloadPDF(report);
    }
  };

  const kpiCards = [
    {
      label: 'Выручка',
      value: formatCurrency(report.totalRevenue),
      sub: `Пред. период: ${formatCurrency(report.productRows.reduce((s, r) => s + r.prevRevenue, 0))}`,
      gradient: 'from-emerald-500 to-emerald-600',
      icon: TrendingUp,
    },
    {
      label: 'Упаковки',
      value: formatNumber(report.totalUnits),
      sub: `По ${report.productRows.length} препаратам`,
      gradient: 'from-blue-500 to-blue-600',
      icon: Package,
    },
    {
      label: 'Вып. плана',
      value: `${report.planExecution.toFixed(1)}%`,
      sub: report.planExecution >= 90 ? 'Цель достигнута' : 'Ниже плана',
      gradient: report.planExecution >= 90 ? 'from-green-500 to-emerald-600' : 'from-yellow-500 to-orange-500',
      icon: BarChart3,
    },
    {
      label: 'Рост YoY',
      value: formatGrowth(report.growthVsPrev),
      sub: `vs ${report.year - 1} год`,
      gradient: report.growthVsPrev >= 0 ? 'from-cyan-500 to-blue-600' : 'from-red-500 to-rose-600',
      icon: report.growthVsPrev >= 0 ? TrendingUp : TrendingDown,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Шапка */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">{report.title}</h3>
              <p className="text-slate-500 text-sm">{report.period} · Сформирован: {report.generatedAt}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-medium text-sm hover:opacity-90 transition-opacity shadow-md"
          >
            <Download className="w-4 h-4" />
            Скачать {report.format.toUpperCase()}
          </button>
          <button
            onClick={onSave}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors"
          >
            <Archive className="w-4 h-4" />
            В архив
          </button>
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-500 font-medium text-sm hover:bg-slate-50 transition-colors"
          >
            <Wrench className="w-4 h-4" />
            Редактировать
          </button>
        </div>
      </div>

      {/* KPI */}
      {report.config.includeSummary && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {kpiCards.map((card, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${card.gradient} opacity-10 rounded-full -mr-10 -mt-10`} />
              <div className="relative">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-3`}>
                  <card.icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-slate-500 text-xs mb-1">{card.label}</p>
                <p className="text-2xl font-bold text-slate-800">{card.value}</p>
                <p className="text-slate-400 text-xs mt-1">{card.sub}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* График динамики */}
      {report.config.includeCharts && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-500" />
            Помесячная динамика выручки: {report.year} vs {report.year - 1}
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={report.monthlyData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `${(v / 1000000).toFixed(1)}М`} />
              <Tooltip
                contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '12px' }}
                formatter={(v: number) => [formatCurrency(v), '']}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="prevRevenue" name={`${report.year - 1}`} fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="revenue" name={`${report.year}`} fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Детализация */}
      {report.config.includeDetails && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Таблица по препаратам */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Pill className="w-4 h-4 text-blue-500" />
              Рейтинг препаратов
            </h3>
            <div className="space-y-2">
              {report.productRows.map((row, i) => {
                const execColor = row.planExec >= 90 ? 'bg-emerald-500' : row.planExec >= 70 ? 'bg-yellow-500' : 'bg-red-500';
                const textColor = row.planExec >= 90 ? 'text-emerald-700' : row.planExec >= 70 ? 'text-yellow-700' : 'text-red-700';
                return (
                  <div key={row.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                    <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-slate-800 text-sm font-medium truncate">{row.shortName}</span>
                        <span className={`text-xs font-bold ${textColor} ml-2 flex-shrink-0`}>{row.planExec.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${execColor} transition-all`} style={{ width: `${Math.min(row.planExec, 100)}%` }} />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-slate-600 text-xs">{formatCurrency(row.revenue)}</span>
                        <span className={`text-xs ${row.growth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatGrowth(row.growth)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Таблица по территориям */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-500" />
              Рейтинг территорий
            </h3>
            <div className="space-y-2">
              {report.territoryRows.map((row, i) => (
                <div key={row.territory} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                  <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-800 text-sm font-medium truncate">{row.territory}</span>
                      <span className="text-cyan-700 text-xs font-bold ml-2 flex-shrink-0">{row.share.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-cyan-500 transition-all" style={{ width: `${Math.min(row.share, 100)}%` }} />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-slate-600 text-xs">{formatCurrency(row.revenue)}</span>
                      <span className="text-slate-400 text-xs">{formatNumber(row.units)} упак.</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== КОМПОНЕНТ: АРХИВ ====================

const ArchiveView = ({
  savedReports,
  onDelete,
  onOpen,
}: {
  savedReports: SavedReport[];
  onDelete: (id: string) => void;
  onOpen: (report: GeneratedReport) => void;
}) => {
  const [filter, setFilter] = useState<'all' | ReportTemplate>('all');

  const filtered = filter === 'all' ? savedReports : savedReports.filter(r => r.template === filter);

  return (
    <div className="space-y-5">
      {/* Фильтры */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'monthly', 'quarterly', 'annual', 'custom'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
              filter === f
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f === 'all' ? `Все (${savedReports.length})` : TEMPLATE_LABELS[f]}
          </button>
        ))}
      </div>

      {/* Список */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Archive className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Нет сохранённых отчётов</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(report => (
            <div
              key={report.id}
              className={`flex items-center gap-4 px-4 py-3 rounded-2xl border transition-all ${
                report.status === 'ready'
                  ? 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  : 'bg-slate-50 border-slate-100 opacity-60'
              }`}
            >
              <div className="flex-shrink-0">
                {report.format === 'pdf' && <FileType className="w-5 h-5 text-red-400" />}
                {report.format === 'excel' && <FileSpreadsheet className="w-5 h-5 text-emerald-500" />}
                {report.format === 'csv' && <FileText className="w-5 h-5 text-blue-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-800 font-medium text-sm truncate">{report.name}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-slate-400 text-xs">{report.date}</span>
                  <span className="text-slate-300 text-xs">·</span>
                  <span className="text-slate-400 text-xs">{report.size}</span>
                  <span className="text-slate-300 text-xs">·</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    report.status === 'ready' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {report.status === 'ready' ? 'Готов' : 'Истёк'}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                    {TEMPLATE_LABELS[report.template]}
                  </span>
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {report.status === 'ready' && report.reportData && (
                  <button
                    onClick={() => onOpen(report.reportData!)}
                    className="p-2 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"
                    title="Открыть"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => onDelete(report.id)}
                  className="p-2 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                  title="Удалить"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ==================== ОСНОВНОЙ КОМПОНЕНТ ====================

export default function ReportsTabLight() {
  const [view, setView] = useState<ReportsView>('builder');
  const [config, setConfig] = useState<ReportConfig>({
    template: 'monthly',
    format: 'excel',
    periodStart: '2026-01-01',
    periodEnd: '2026-01-31',
    selectedProducts: PRODUCTS.map(p => p.id),
    selectedTerritories: TERRITORIES,
    includeCharts: true,
    includeSummary: true,
    includeDetails: true,
  });
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null);
  const [savedReports, setSavedReports] = useState<SavedReport[]>(MOCK_SAVED_REPORTS);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleGenerate = useCallback(() => {
    setStatus('generating');
    setProgress(0);

    const interval = setInterval(() => {
      setProgress(prev => {
        const next = prev + Math.round(Math.random() * 18 + 7);
        if (next >= 100) {
          clearInterval(interval);
          try {
            const data = computeReportData(config);
            setGeneratedReport(data);
            setView('preview');
          } catch {
            setStatus('error');
            return 100;
          }
          setStatus('idle');
          return 100;
        }
        return next;
      });
    }, 200);
  }, [config]);

  const handleSave = useCallback(() => {
    if (!generatedReport) return;
    const newReport: SavedReport = {
      id: Date.now().toString(),
      name: generatedReport.title,
      template: generatedReport.config.template,
      format: generatedReport.format,
      date: new Date().toLocaleDateString('ru-RU'),
      size: `${(Math.random() * 8 + 1).toFixed(1)} МБ`,
      status: 'ready',
      reportData: generatedReport,
    };
    setSavedReports(prev => [newReport, ...prev]);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  }, [generatedReport]);

  const handleOpenFromArchive = useCallback((report: GeneratedReport) => {
    setGeneratedReport(report);
    setView('preview');
  }, []);

  const handleDeleteReport = useCallback((id: string) => {
    setSavedReports(prev => prev.filter(r => r.id !== id));
  }, []);

  const navItems: { id: ReportsView; label: string; icon: React.ElementType; badge?: string | number }[] = [
    { id: 'builder', label: 'Конструктор', icon: Wrench },
    { id: 'preview', label: 'Просмотр', icon: Eye, badge: generatedReport ? '✓' : undefined },
    { id: 'archive', label: 'Архив', icon: Archive, badge: savedReports.filter(r => r.status === 'ready').length },
  ];

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            Генерация отчётов
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">Аналитические отчёты по продажам World Medicine ПФО</p>
        </div>
        {savedNotice && (
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Сохранено в архив
          </div>
        )}
      </div>

      {/* Внутренняя навигация */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => item.id !== 'preview' || generatedReport ? setView(item.id) : undefined}
            disabled={item.id === 'preview' && !generatedReport}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              view === item.id
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
            {item.badge !== undefined && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                view === item.id
                  ? item.id === 'preview' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                  : 'bg-slate-200 text-slate-500'
              }`}>
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Контент */}
      {view === 'builder' && (
        <BuilderView
          config={config}
          setConfig={setConfig}
          status={status}
          progress={progress}
          onGenerate={handleGenerate}
        />
      )}

      {view === 'preview' && generatedReport && (
        <PreviewView
          report={generatedReport}
          onSave={handleSave}
          onBack={() => setView('builder')}
        />
      )}

      {view === 'archive' && (
        <ArchiveView
          savedReports={savedReports}
          onDelete={handleDeleteReport}
          onOpen={handleOpenFromArchive}
        />
      )}
    </div>
  );
}
