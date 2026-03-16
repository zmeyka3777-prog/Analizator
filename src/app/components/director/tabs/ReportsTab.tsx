import React, { useState, useMemo, useCallback } from 'react';
import {
  FileText, Download, FileSpreadsheet, FileType, Filter, Calendar,
  Clock, CheckCircle, Loader2, Trash2, Eye, Plus, X, RefreshCw,
  ChevronDown, Pill, MapPin
} from 'lucide-react';

const WM_PRODUCTS = [
  { id: 1, name: 'COCARNIT', category: 'Ноотропы', color: '#3B82F6' },
  { id: 2, name: 'RONOCIT', category: 'Ноотропы', color: '#8B5CF6' },
  { id: 3, name: 'ARTOXAN LYOF 20MG', category: 'НПВС', color: '#10B981' },
  { id: 4, name: 'DORAMYCIN', category: 'Антибиотики', color: '#F59E0B' },
  { id: 5, name: 'ORCIPOL', category: 'Антибиотики', color: '#EF4444' },
  { id: 6, name: 'DRASTOP ADVANCE', category: 'Хондропротекторы', color: '#06B6D4' },
  { id: 7, name: 'LIMENDA', category: 'Анксиолитики', color: '#EC4899' },
  { id: 8, name: 'SECNIDOX', category: 'Антибиотики', color: '#84CC16' },
  { id: 9, name: 'CLODIFEN NEURO', category: 'НПВС', color: '#F97316' },
  { id: 10, name: 'ARTOXAN 20MG', category: 'НПВС', color: '#14B8A6' },
  { id: 11, name: 'ARTOXAN GEL', category: 'НПВС', color: '#A855F7' },
  { id: 12, name: 'APFECTO', category: 'Кардиология', color: '#6366F1' },
];

const FEDERAL_DISTRICTS = [
  { id: 'cfo', name: 'ЦФО', fullName: 'Центральный ФО' },
  { id: 'szfo', name: 'СЗФО', fullName: 'Северо-Западный ФО' },
  { id: 'yufo', name: 'ЮФО', fullName: 'Южный ФО' },
  { id: 'skfo', name: 'СКФО', fullName: 'Северо-Кавказский ФО' },
  { id: 'pfo', name: 'ПФО', fullName: 'Приволжский ФО' },
  { id: 'ufo', name: 'УФО', fullName: 'Уральский ФО' },
  { id: 'sfo', name: 'СФО', fullName: 'Сибирский ФО' },
  { id: 'dfo', name: 'ДФО', fullName: 'Дальневосточный ФО' },
];

type ReportTemplate = 'monthly' | 'quarterly' | 'annual' | 'custom';
type ReportFormat = 'pdf' | 'excel' | 'csv';
type GenerationStatus = 'idle' | 'generating' | 'preview' | 'done' | 'error';

interface ReportConfig {
  template: ReportTemplate;
  format: ReportFormat;
  periodStart: string;
  periodEnd: string;
  selectedProducts: number[];
  selectedDistricts: string[];
  includeCharts: boolean;
  includeSummary: boolean;
  includeDetails: boolean;
}

interface SavedReport {
  id: string;
  name: string;
  template: ReportTemplate;
  format: ReportFormat;
  date: string;
  size: string;
  status: 'ready' | 'expired';
}

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

const FORMAT_ICONS: Record<ReportFormat, React.ReactNode> = {
  pdf: <FileType className="w-5 h-5 text-red-400" />,
  excel: <FileSpreadsheet className="w-5 h-5 text-emerald-400" />,
  csv: <FileText className="w-5 h-5 text-blue-400" />,
};

const MOCK_SAVED_REPORTS: SavedReport[] = [
  { id: '1', name: 'Ежемесячный отчёт - Январь 2026', template: 'monthly', format: 'pdf', date: '31.01.2026', size: '2.4 МБ', status: 'ready' },
  { id: '2', name: 'Квартальный отчёт - Q4 2025', template: 'quarterly', format: 'excel', date: '15.01.2026', size: '5.1 МБ', status: 'ready' },
  { id: '3', name: 'Годовой отчёт 2025', template: 'annual', format: 'pdf', date: '10.01.2026', size: '12.8 МБ', status: 'ready' },
  { id: '4', name: 'Отчёт по НПВС - Декабрь 2025', template: 'custom', format: 'csv', date: '05.01.2026', size: '0.8 МБ', status: 'ready' },
  { id: '5', name: 'Ежемесячный отчёт - Декабрь 2025', template: 'monthly', format: 'excel', date: '31.12.2025', size: '3.2 МБ', status: 'expired' },
  { id: '6', name: 'Отчёт по ЦФО и ПФО - Q3 2025', template: 'custom', format: 'pdf', date: '15.10.2025', size: '4.5 МБ', status: 'expired' },
];

export default function ReportsTab() {
  const [config, setConfig] = useState<ReportConfig>({
    template: 'monthly',
    format: 'pdf',
    periodStart: '2026-01-01',
    periodEnd: '2026-01-31',
    selectedProducts: WM_PRODUCTS.map((p) => p.id),
    selectedDistricts: FEDERAL_DISTRICTS.map((d) => d.id),
    includeCharts: true,
    includeSummary: true,
    includeDetails: true,
  });

  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [savedReports, setSavedReports] = useState<SavedReport[]>(MOCK_SAVED_REPORTS);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [showDistrictSelector, setShowDistrictSelector] = useState(false);

  const handleGenerate = useCallback(() => {
    setStatus('generating');
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setStatus('preview');
          return 100;
        }
        return prev + Math.round(Math.random() * 15 + 5);
      });
    }, 300);
  }, []);

  const handleConfirm = useCallback(() => {
    const newReport: SavedReport = {
      id: Date.now().toString(),
      name: `${TEMPLATE_LABELS[config.template]} отчёт - ${new Date().toLocaleDateString('ru-RU')}`,
      template: config.template,
      format: config.format,
      date: new Date().toLocaleDateString('ru-RU'),
      size: `${(Math.random() * 10 + 1).toFixed(1)} МБ`,
      status: 'ready',
    };
    setSavedReports((prev) => [newReport, ...prev]);
    setStatus('done');
    setTimeout(() => setStatus('idle'), 2000);
  }, [config]);

  const handleDeleteReport = useCallback((id: string) => {
    setSavedReports((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const toggleProduct = (productId: number) => {
    setConfig((prev) => ({
      ...prev,
      selectedProducts: prev.selectedProducts.includes(productId)
        ? prev.selectedProducts.filter((id) => id !== productId)
        : [...prev.selectedProducts, productId],
    }));
  };

  const toggleDistrict = (districtId: string) => {
    setConfig((prev) => ({
      ...prev,
      selectedDistricts: prev.selectedDistricts.includes(districtId)
        ? prev.selectedDistricts.filter((id) => id !== districtId)
        : [...prev.selectedDistricts, districtId],
    }));
  };

  const selectAllProducts = () => {
    setConfig((prev) => ({ ...prev, selectedProducts: WM_PRODUCTS.map((p) => p.id) }));
  };

  const deselectAllProducts = () => {
    setConfig((prev) => ({ ...prev, selectedProducts: [] }));
  };

  const selectAllDistricts = () => {
    setConfig((prev) => ({ ...prev, selectedDistricts: FEDERAL_DISTRICTS.map((d) => d.id) }));
  };

  const deselectAllDistricts = () => {
    setConfig((prev) => ({ ...prev, selectedDistricts: [] }));
  };

  const previewContent = useMemo(() => {
    const productNames = config.selectedProducts
      .map((id) => WM_PRODUCTS.find((p) => p.id === id)?.name)
      .filter(Boolean);
    const districtNames = config.selectedDistricts
      .map((id) => FEDERAL_DISTRICTS.find((d) => d.id === id)?.name)
      .filter(Boolean);

    return {
      title: `${TEMPLATE_LABELS[config.template]} отчёт`,
      period: `${config.periodStart} -- ${config.periodEnd}`,
      products: productNames.length === WM_PRODUCTS.length ? 'Все препараты (12)' : productNames.join(', '),
      districts: districtNames.length === FEDERAL_DISTRICTS.length ? 'Все округа (8)' : districtNames.join(', '),
      sections: [
        config.includeSummary ? 'Сводная информация (KPI, план/факт)' : null,
        config.includeCharts ? 'Графики и диаграммы' : null,
        config.includeDetails ? 'Детализация по препаратам и территориям' : null,
      ].filter(Boolean),
    };
  }, [config]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          Генерация отчётов
        </h2>
        <p className="text-gray-400 mt-1">Формирование и экспорт аналитических отчётов</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Template Selection */}
          <div className="wm-card bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              Шаблон отчёта
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {(Object.keys(TEMPLATE_LABELS) as ReportTemplate[]).map((tmpl) => (
                <button
                  key={tmpl}
                  onClick={() => setConfig((prev) => ({ ...prev, template: tmpl }))}
                  className={`p-4 rounded-xl border transition-all text-left ${
                    config.template === tmpl
                      ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <p className="text-white font-medium text-sm">{TEMPLATE_LABELS[tmpl]}</p>
                  <p className="text-gray-500 text-xs mt-1">{TEMPLATE_DESCRIPTIONS[tmpl]}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Period & Format */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="wm-card bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-400" />
                Период
              </h3>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">С</label>
                  <input
                    type="date"
                    value={config.periodStart}
                    onChange={(e) => setConfig((prev) => ({ ...prev, periodStart: e.target.value }))}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">По</label>
                  <input
                    type="date"
                    value={config.periodEnd}
                    onChange={(e) => setConfig((prev) => ({ ...prev, periodEnd: e.target.value }))}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                {[
                  { label: 'Янв 2026', start: '2026-01-01', end: '2026-01-31' },
                  { label: 'Q1 2026', start: '2026-01-01', end: '2026-03-31' },
                  { label: '2025 год', start: '2025-01-01', end: '2025-12-31' },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => setConfig((prev) => ({ ...prev, periodStart: preset.start, periodEnd: preset.end }))}
                    className="px-3 py-1 rounded-lg bg-white/10 text-gray-300 text-xs hover:bg-white/20 transition-all"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="wm-card bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-400" />
                Формат экспорта
              </h3>
              <div className="flex gap-3">
                {(['pdf', 'excel', 'csv'] as ReportFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setConfig((prev) => ({ ...prev, format: fmt }))}
                    className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                      config.format === fmt
                        ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    {FORMAT_ICONS[fmt]}
                    <span className="text-white text-sm font-medium uppercase">{fmt}</span>
                  </button>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.includeSummary}
                    onChange={(e) => setConfig((prev) => ({ ...prev, includeSummary: e.target.checked }))}
                    className="rounded accent-blue-500"
                  />
                  <span className="text-gray-300 text-sm">Сводка (KPI)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.includeCharts}
                    onChange={(e) => setConfig((prev) => ({ ...prev, includeCharts: e.target.checked }))}
                    className="rounded accent-blue-500"
                  />
                  <span className="text-gray-300 text-sm">Графики</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.includeDetails}
                    onChange={(e) => setConfig((prev) => ({ ...prev, includeDetails: e.target.checked }))}
                    className="rounded accent-blue-500"
                  />
                  <span className="text-gray-300 text-sm">Детализация</span>
                </label>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Products Filter */}
            <div className="wm-card bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Pill className="w-4 h-4 text-blue-400" />
                  Препараты ({config.selectedProducts.length}/{WM_PRODUCTS.length})
                </h3>
                <div className="flex gap-1">
                  <button onClick={selectAllProducts} className="text-xs text-blue-400 hover:underline">Все</button>
                  <span className="text-gray-600">|</span>
                  <button onClick={deselectAllProducts} className="text-xs text-gray-400 hover:underline">Снять</button>
                </div>
              </div>
              <div className="space-y-1 max-h-[200px] overflow-y-auto pr-1">
                {WM_PRODUCTS.map((product) => (
                  <label key={product.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-white/5 rounded px-2 transition-colors">
                    <input
                      type="checkbox"
                      checked={config.selectedProducts.includes(product.id)}
                      onChange={() => toggleProduct(product.id)}
                      className="rounded accent-blue-500"
                    />
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: product.color }} />
                    <span className="text-gray-300 text-sm">{product.name}</span>
                    <span className="text-gray-600 text-xs ml-auto">{product.category}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Districts Filter */}
            <div className="wm-card bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-cyan-400" />
                  Округа ({config.selectedDistricts.length}/{FEDERAL_DISTRICTS.length})
                </h3>
                <div className="flex gap-1">
                  <button onClick={selectAllDistricts} className="text-xs text-blue-400 hover:underline">Все</button>
                  <span className="text-gray-600">|</span>
                  <button onClick={deselectAllDistricts} className="text-xs text-gray-400 hover:underline">Снять</button>
                </div>
              </div>
              <div className="space-y-1">
                {FEDERAL_DISTRICTS.map((district) => (
                  <label key={district.id} className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-white/5 rounded px-2 transition-colors">
                    <input
                      type="checkbox"
                      checked={config.selectedDistricts.includes(district.id)}
                      onChange={() => toggleDistrict(district.id)}
                      className="rounded accent-cyan-500"
                    />
                    <span className="text-gray-300 text-sm">{district.name}</span>
                    <span className="text-gray-600 text-xs ml-auto">{district.fullName}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Preview & Actions */}
        <div className="space-y-6">
          {/* Preview */}
          <div className="wm-card bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-amber-400" />
              Предпросмотр
            </h3>
            <div className="space-y-3">
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-white font-bold text-lg">{previewContent.title}</p>
                <p className="text-gray-400 text-sm mt-1">{previewContent.period}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase mb-1">Препараты</p>
                <p className="text-gray-300 text-sm">{previewContent.products}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase mb-1">Территории</p>
                <p className="text-gray-300 text-sm">{previewContent.districts}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase mb-1">Разделы</p>
                <ul className="space-y-1">
                  {previewContent.sections.map((section, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-gray-300 text-sm">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      {section}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex items-center gap-2 text-gray-500 text-xs mt-2">
                <FileText className="w-3.5 h-3.5" />
                Формат: <span className="text-white uppercase">{config.format}</span>
              </div>
            </div>
          </div>

          {/* Generate Button & Status */}
          <div className="wm-card bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
            {status === 'idle' && (
              <button
                onClick={handleGenerate}
                disabled={config.selectedProducts.length === 0 || config.selectedDistricts.length === 0}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="w-5 h-5" />
                Сгенерировать отчёт
              </button>
            )}

            {status === 'generating' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-blue-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="font-medium">Генерация отчёта...</span>
                </div>
                <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                <p className="text-gray-400 text-sm text-center">{Math.min(progress, 100)}%</p>
              </div>
            )}

            {status === 'preview' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Отчёт готов!</span>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                  <p className="text-white font-medium text-sm">{previewContent.title}</p>
                  <p className="text-gray-400 text-xs mt-1">
                    {previewContent.sections.length} разделов | {config.selectedProducts.length} препаратов | {config.selectedDistricts.length} округов
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleConfirm}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Сохранить и скачать
                  </button>
                  <button
                    onClick={() => setStatus('idle')}
                    className="px-4 py-2.5 rounded-xl bg-white/10 text-gray-300 hover:bg-white/20 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {status === 'done' && (
              <div className="flex items-center gap-2 text-emerald-400 justify-center py-3">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Отчёт сохранён!</span>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-red-400">
                  <X className="w-5 h-5" />
                  <span className="font-medium">Ошибка генерации</span>
                </div>
                <button
                  onClick={handleGenerate}
                  className="w-full py-2.5 rounded-xl bg-white/10 text-gray-300 hover:bg-white/20 transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Повторить
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Saved Reports Archive */}
      <div className="wm-card bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-400" />
          Архив отчётов ({savedReports.length})
        </h3>
        {savedReports.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Нет сохранённых отчётов</p>
        ) : (
          <div className="space-y-2">
            {savedReports.map((report) => (
              <div
                key={report.id}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl border transition-all ${
                  report.status === 'ready'
                    ? 'bg-white/5 border-white/10 hover:bg-white/10'
                    : 'bg-white/2 border-white/5 opacity-60'
                }`}
              >
                <div className="flex-shrink-0">{FORMAT_ICONS[report.format]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{report.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-gray-500 text-xs">{report.date}</span>
                    <span className="text-gray-600 text-xs">|</span>
                    <span className="text-gray-500 text-xs">{report.size}</span>
                    <span className="text-gray-600 text-xs">|</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      report.status === 'ready'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {report.status === 'ready' ? 'Готов' : 'Истёк'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {report.status === 'ready' && (
                    <button className="p-2 rounded-lg hover:bg-white/10 text-blue-400 transition-colors" title="Скачать">
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteReport(report.id)}
                    className="p-2 rounded-lg hover:bg-white/10 text-red-400 transition-colors"
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
    </div>
  );
}
