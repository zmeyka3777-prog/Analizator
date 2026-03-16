import React, { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  AlertCircle,
  X,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Edit2,
  Save,
  Lock,
  Unlock,
  RefreshCw,
  Database,
  HardDrive,
  FileSpreadsheet,
  DollarSign,
  ClipboardList,
  Check,
  XCircle,
} from 'lucide-react';

// --- API helper ---
const getToken = () => localStorage.getItem('mdlp_token');
const apiCall = async (url: string, options: RequestInit = {}) => {
  const token = getToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

// --- Types ---
interface UploadHistoryItem {
  id: number;
  filename: string;
  upload_date: string;
  rows_count: number;
  file_type: string;
  status: string;
  is_active: boolean;
}

interface DrugPrice {
  id: number;
  drug_name: string;
  price_per_unit: number;
  currency: string;
  updated_at: string;
}

interface Plan {
  id: number;
  name: string;
  period: string;
  target_value: number;
  actual_value: number;
  is_locked: boolean;
  updated_at: string;
}

interface DbStats {
  tables: { name: string; row_count: number; size_bytes: number }[];
  total_size: string;
  total_rows: number;
}

// --- Component ---
function DataManagement() {
  // Upload history
  const [uploads, setUploads] = useState<UploadHistoryItem[]>([]);
  const [uploadsLoading, setUploadsLoading] = useState(true);

  // Drug prices
  const [drugPrices, setDrugPrices] = useState<DrugPrice[]>([]);
  const [pricesLoading, setPricesLoading] = useState(true);
  const [editingPriceId, setEditingPriceId] = useState<number | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState('');

  // Plans
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [editingPlanValue, setEditingPlanValue] = useState('');

  // DB Stats
  const [dbStats, setDbStats] = useState<DbStats | null>(null);
  const [dbStatsLoading, setDbStatsLoading] = useState(true);

  // General
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Active section
  const [activeSection, setActiveSection] = useState<'uploads' | 'prices' | 'plans' | 'database'>(
    'uploads'
  );

  // --- Data loading ---
  const fetchUploads = useCallback(async () => {
    setUploadsLoading(true);
    try {
      const data = await apiCall('/api/upload-history');
      setUploads(Array.isArray(data) ? data : data.uploads ?? []);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки истории');
    } finally {
      setUploadsLoading(false);
    }
  }, []);

  const fetchDrugPrices = useCallback(async () => {
    setPricesLoading(true);
    try {
      const data = await apiCall('/api/admin/drug-prices');
      setDrugPrices(Array.isArray(data) ? data : data.prices ?? []);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки цен');
    } finally {
      setPricesLoading(false);
    }
  }, []);

  const fetchPlans = useCallback(async () => {
    setPlansLoading(true);
    try {
      const data = await apiCall('/api/admin/plans');
      setPlans(Array.isArray(data) ? data : data.plans ?? []);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки планов');
    } finally {
      setPlansLoading(false);
    }
  }, []);

  const fetchDbStats = useCallback(async () => {
    setDbStatsLoading(true);
    try {
      const data = await apiCall('/api/admin/db-stats');
      setDbStats(data);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки статистики БД');
    } finally {
      setDbStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUploads();
    fetchDrugPrices();
    fetchPlans();
    fetchDbStats();
  }, [fetchUploads, fetchDrugPrices, fetchPlans, fetchDbStats]);

  // --- Helpers ---
  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // --- Upload actions ---
  const toggleUploadActive = async (upload: UploadHistoryItem) => {
    setActionLoading(`toggle-${upload.id}`);
    try {
      await apiCall(`/api/upload-history/${upload.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !upload.is_active }),
      });
      setUploads((prev) =>
        prev.map((u) => (u.id === upload.id ? { ...u, is_active: !u.is_active } : u))
      );
      showSuccess(`Загрузка ${upload.filename} ${!upload.is_active ? 'активирована' : 'деактивирована'}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const deleteUpload = async (upload: UploadHistoryItem) => {
    if (!window.confirm(`Удалить загрузку "${upload.filename}"? Это действие необратимо.`)) return;
    setActionLoading(`delete-${upload.id}`);
    try {
      await apiCall(`/api/upload-history/${upload.id}`, { method: 'DELETE' });
      setUploads((prev) => prev.filter((u) => u.id !== upload.id));
      showSuccess(`Загрузка ${upload.filename} удалена`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // --- Drug price actions ---
  const startEditPrice = (price: DrugPrice) => {
    setEditingPriceId(price.id);
    setEditingPriceValue(String(price.price_per_unit));
  };

  const savePrice = async (price: DrugPrice) => {
    const newPrice = parseFloat(editingPriceValue);
    if (isNaN(newPrice) || newPrice <= 0) {
      setError('Введите корректную цену');
      return;
    }
    setActionLoading(`price-${price.id}`);
    try {
      await apiCall(`/api/admin/drug-prices/${price.id}`, {
        method: 'PUT',
        body: JSON.stringify({ price_per_unit: newPrice }),
      });
      setDrugPrices((prev) =>
        prev.map((p) => (p.id === price.id ? { ...p, price_per_unit: newPrice } : p))
      );
      setEditingPriceId(null);
      showSuccess(`Цена для "${price.drug_name}" обновлена`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // --- Plan actions ---
  const togglePlanLock = async (plan: Plan) => {
    setActionLoading(`lock-${plan.id}`);
    try {
      await apiCall(`/api/admin/plans/${plan.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_locked: !plan.is_locked }),
      });
      setPlans((prev) =>
        prev.map((p) => (p.id === plan.id ? { ...p, is_locked: !p.is_locked } : p))
      );
      showSuccess(`План "${plan.name}" ${!plan.is_locked ? 'заблокирован' : 'разблокирован'}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const startEditPlan = (plan: Plan) => {
    if (plan.is_locked) {
      setError('План заблокирован. Разблокируйте перед редактированием.');
      return;
    }
    setEditingPlanId(plan.id);
    setEditingPlanValue(String(plan.target_value));
  };

  const savePlan = async (plan: Plan) => {
    const newValue = parseFloat(editingPlanValue);
    if (isNaN(newValue) || newValue < 0) {
      setError('Введите корректное значение');
      return;
    }
    setActionLoading(`plan-${plan.id}`);
    try {
      await apiCall(`/api/admin/plans/${plan.id}`, {
        method: 'PUT',
        body: JSON.stringify({ target_value: newValue }),
      });
      setPlans((prev) =>
        prev.map((p) => (p.id === plan.id ? { ...p, target_value: newValue } : p))
      );
      setEditingPlanId(null);
      showSuccess(`План "${plan.name}" обновлён`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // --- Database actions ---
  const rebuildCompactRows = async () => {
    if (!window.confirm('Запустить перестроение компактных строк? Это может занять несколько минут.'))
      return;
    setActionLoading('rebuild');
    try {
      await apiCall('/api/admin/db-stats/rebuild', { method: 'POST' });
      showSuccess('Компактные строки перестроены');
      await fetchDbStats();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const reaggregate = async () => {
    if (!window.confirm('Запустить реагрегацию данных? Это может занять несколько минут.')) return;
    setActionLoading('reaggregate');
    try {
      await apiCall('/api/admin/db-stats/reaggregate', { method: 'POST' });
      showSuccess('Реагрегация завершена');
      await fetchDbStats();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const sections = [
    { key: 'uploads' as const, label: 'История загрузок', icon: <FileSpreadsheet className="h-4 w-4" /> },
    { key: 'prices' as const, label: 'Цены препаратов', icon: <DollarSign className="h-4 w-4" /> },
    { key: 'plans' as const, label: 'Планы', icon: <ClipboardList className="h-4 w-4" /> },
    { key: 'database' as const, label: 'База данных', icon: <Database className="h-4 w-4" /> },
  ];

  // --- Render ---
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Управление данными</h2>
        <p className="text-sm text-gray-500">
          Управление загрузками, ценами, планами и базой данных
        </p>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl">
          <Check className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">{successMessage}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Section navigation */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-1.5">
        <div className="flex gap-1 overflow-x-auto">
          {sections.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeSection === s.key
                  ? 'bg-[#004F9F] text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ========== UPLOADS ========== */}
      {activeSection === 'uploads' && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-800">История загрузок</h3>
          </div>
          {uploadsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[#004F9F]" />
              <span className="ml-3 text-gray-500">Загрузка...</span>
            </div>
          ) : uploads.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Нет загруженных файлов</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Файл
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Дата
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Тип
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Строк
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Статус
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {uploads.map((upload) => (
                    <tr key={upload.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {upload.filename}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(upload.upload_date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{upload.file_type}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">
                        {upload.rows_count?.toLocaleString('ru-RU') || '---'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            upload.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {upload.is_active ? 'Активен' : 'Неактивен'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => toggleUploadActive(upload)}
                            disabled={actionLoading === `toggle-${upload.id}`}
                            className="p-2 text-gray-400 hover:text-[#004F9F] hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                            title={upload.is_active ? 'Деактивировать' : 'Активировать'}
                          >
                            {actionLoading === `toggle-${upload.id}` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : upload.is_active ? (
                              <ToggleRight className="h-4 w-4 text-green-600" />
                            ) : (
                              <ToggleLeft className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => deleteUpload(upload)}
                            disabled={actionLoading === `delete-${upload.id}`}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Удалить"
                          >
                            {actionLoading === `delete-${upload.id}` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========== DRUG PRICES ========== */}
      {activeSection === 'prices' && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-800">Цены препаратов</h3>
            <p className="text-xs text-gray-500 mt-1">
              Нажмите на иконку редактирования, чтобы изменить цену
            </p>
          </div>
          {pricesLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[#004F9F]" />
              <span className="ml-3 text-gray-500">Загрузка цен...</span>
            </div>
          ) : drugPrices.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Цены не загружены</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      ID
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Препарат
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Цена за ед.
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Валюта
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Обновлено
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {drugPrices.map((price) => (
                    <tr key={price.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-500 font-mono">{price.id}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {price.drug_name}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {editingPriceId === price.id ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editingPriceValue}
                            onChange={(e) => setEditingPriceValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') savePrice(price);
                              if (e.key === 'Escape') setEditingPriceId(null);
                            }}
                            className="w-28 px-2 py-1 border border-[#6DB7FF] rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#6DB7FF]"
                            autoFocus
                          />
                        ) : (
                          <span className="text-sm font-medium text-gray-900">
                            {price.price_per_unit.toLocaleString('ru-RU', {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{price.currency || 'RUB'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {price.updated_at ? formatDate(price.updated_at) : '---'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {editingPriceId === price.id ? (
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => savePrice(price)}
                              disabled={actionLoading === `price-${price.id}`}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Сохранить"
                            >
                              {actionLoading === `price-${price.id}` ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              onClick={() => setEditingPriceId(null)}
                              className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Отменить"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditPrice(price)}
                            className="p-2 text-gray-400 hover:text-[#004F9F] hover:bg-blue-50 rounded-lg transition-colors"
                            title="Редактировать цену"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========== PLANS ========== */}
      {activeSection === 'plans' && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-800">Планы</h3>
            <p className="text-xs text-gray-500 mt-1">
              Управление планами продаж. Заблокированные планы нельзя редактировать.
            </p>
          </div>
          {plansLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[#004F9F]" />
              <span className="ml-3 text-gray-500">Загрузка планов...</span>
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <ClipboardList className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Планы не найдены</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Название
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Период
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Целевое значение
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Факт
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Статус
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {plans.map((plan) => {
                    const completion =
                      plan.target_value > 0
                        ? ((plan.actual_value / plan.target_value) * 100).toFixed(1)
                        : '0.0';
                    return (
                      <tr key={plan.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{plan.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{plan.period}</td>
                        <td className="px-4 py-3 text-right">
                          {editingPlanId === plan.id ? (
                            <input
                              type="number"
                              value={editingPlanValue}
                              onChange={(e) => setEditingPlanValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') savePlan(plan);
                                if (e.key === 'Escape') setEditingPlanId(null);
                              }}
                              className="w-28 px-2 py-1 border border-[#6DB7FF] rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#6DB7FF]"
                              autoFocus
                            />
                          ) : (
                            <span className="text-sm font-medium text-gray-900">
                              {plan.target_value.toLocaleString('ru-RU')}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          <span className="text-gray-700">
                            {plan.actual_value.toLocaleString('ru-RU')}
                          </span>
                          <span className="text-gray-400 ml-1">({completion}%)</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              plan.is_locked
                                ? 'bg-red-100 text-red-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {plan.is_locked ? (
                              <>
                                <Lock className="h-3 w-3" /> Заблокирован
                              </>
                            ) : (
                              <>
                                <Unlock className="h-3 w-3" /> Открыт
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            {editingPlanId === plan.id ? (
                              <>
                                <button
                                  onClick={() => savePlan(plan)}
                                  disabled={actionLoading === `plan-${plan.id}`}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Сохранить"
                                >
                                  {actionLoading === `plan-${plan.id}` ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Save className="h-4 w-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => setEditingPlanId(null)}
                                  className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                                  title="Отменить"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEditPlan(plan)}
                                  className={`p-2 rounded-lg transition-colors ${
                                    plan.is_locked
                                      ? 'text-gray-300 cursor-not-allowed'
                                      : 'text-gray-400 hover:text-[#004F9F] hover:bg-blue-50'
                                  }`}
                                  title={
                                    plan.is_locked
                                      ? 'Разблокируйте план для редактирования'
                                      : 'Редактировать'
                                  }
                                  disabled={plan.is_locked}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => togglePlanLock(plan)}
                                  disabled={actionLoading === `lock-${plan.id}`}
                                  className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50"
                                  title={plan.is_locked ? 'Разблокировать' : 'Заблокировать'}
                                >
                                  {actionLoading === `lock-${plan.id}` ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : plan.is_locked ? (
                                    <Unlock className="h-4 w-4" />
                                  ) : (
                                    <Lock className="h-4 w-4" />
                                  )}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========== DATABASE ========== */}
      {activeSection === 'database' && (
        <div className="space-y-6">
          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={rebuildCompactRows}
              disabled={actionLoading === 'rebuild'}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#004F9F] text-white text-sm font-medium rounded-lg hover:bg-[#003d7a] transition-colors shadow-sm disabled:opacity-50"
            >
              {actionLoading === 'rebuild' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Перестроить компактные строки
            </button>
            <button
              onClick={reaggregate}
              disabled={actionLoading === 'reaggregate'}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#20C6DA] text-white text-sm font-medium rounded-lg hover:bg-[#1ab0c2] transition-colors shadow-sm disabled:opacity-50"
            >
              {actionLoading === 'reaggregate' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Database className="h-4 w-4" />
              )}
              Реагрегация
            </button>
            <button
              onClick={fetchDbStats}
              disabled={dbStatsLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
            >
              {dbStatsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Обновить статистику
            </button>
          </div>

          {/* DB Stats */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-800">Статистика базы данных</h3>
              {dbStats && (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">
                    <HardDrive className="inline h-4 w-4 mr-1" />
                    Размер: <span className="font-medium text-gray-800">{dbStats.total_size}</span>
                  </span>
                  <span className="text-sm text-gray-500">
                    Всего строк:{' '}
                    <span className="font-medium text-gray-800">
                      {dbStats.total_rows?.toLocaleString('ru-RU') || '---'}
                    </span>
                  </span>
                </div>
              )}
            </div>
            {dbStatsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-[#004F9F]" />
                <span className="ml-3 text-gray-500">Загрузка статистики...</span>
              </div>
            ) : !dbStats ? (
              <div className="text-center py-16 text-gray-500">
                <Database className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Статистика недоступна</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                        Таблица
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                        Количество строк
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                        Размер
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(dbStats.tables || []).map((table, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 font-mono">
                          {table.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-700">
                          {table.row_count?.toLocaleString('ru-RU') || '0'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-500">
                          {formatBytes(table.size_bytes || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default DataManagement;
