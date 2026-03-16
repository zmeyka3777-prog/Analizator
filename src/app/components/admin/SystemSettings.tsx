import React, { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  AlertCircle,
  X,
  Download,
  Trash2,
  RefreshCw,
  Activity,
  Globe,
  Server,
  Clock,
  ChevronLeft,
  ChevronRight,
  Check,
  Shield,
  HardDrive,
  MapPin,
  Users,
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
interface AuditLogEntry {
  id: number;
  timestamp: string;
  user: string;
  action: string;
  details: string;
  ip_address?: string;
}

interface PopulationEntry {
  id: number;
  region: string;
  population: number;
  federal_district: string;
  manager: string | null;
}

interface DbHealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  uptime: string;
  connections_active: number;
  connections_max: number;
  disk_usage_percent: number;
  last_backup: string | null;
  version: string;
}

interface SystemInfo {
  app_version: string;
  server_status: 'online' | 'degraded' | 'offline';
  last_backup: string | null;
  node_version: string;
  db_type: string;
  environment: string;
}

const PAGE_SIZE = 20;

// --- Component ---
function SystemSettings() {
  // Active section
  const [activeSection, setActiveSection] = useState<'audit' | 'population' | 'health' | 'system'>(
    'audit'
  );

  // Audit log
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(0);

  // Population
  const [population, setPopulation] = useState<PopulationEntry[]>([]);
  const [populationLoading, setPopulationLoading] = useState(true);

  // DB Health
  const [dbHealth, setDbHealth] = useState<DbHealthStatus | null>(null);
  const [dbHealthLoading, setDbHealthLoading] = useState(true);

  // System info
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);

  // General
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // --- Data loading ---
  const fetchAuditLog = useCallback(async (page: number = 0) => {
    setAuditLoading(true);
    try {
      const offset = page * PAGE_SIZE;
      const data = await apiCall(`/api/admin/audit-log?limit=${PAGE_SIZE}&offset=${offset}`);
      if (Array.isArray(data)) {
        setAuditLog(data);
        setAuditTotal(data.length >= PAGE_SIZE ? (page + 2) * PAGE_SIZE : offset + data.length);
      } else {
        setAuditLog(data.entries ?? data.logs ?? []);
        setAuditTotal(data.total ?? data.count ?? 0);
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки журнала аудита');
    } finally {
      setAuditLoading(false);
    }
  }, []);

  const fetchPopulation = useCallback(async () => {
    setPopulationLoading(true);
    try {
      const data = await apiCall('/api/admin/population');
      setPopulation(Array.isArray(data) ? data : data.population ?? data.regions ?? []);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки данных о населении');
    } finally {
      setPopulationLoading(false);
    }
  }, []);

  const fetchDbHealth = useCallback(async () => {
    setDbHealthLoading(true);
    try {
      const data = await apiCall('/api/admin/db-stats');
      // Construct health info from db-stats response
      setDbHealth({
        status: data.status || 'healthy',
        uptime: data.uptime || '---',
        connections_active: data.connections_active ?? data.active_connections ?? 0,
        connections_max: data.connections_max ?? data.max_connections ?? 100,
        disk_usage_percent: data.disk_usage_percent ?? 0,
        last_backup: data.last_backup ?? null,
        version: data.db_version ?? data.version ?? '---',
      });
      // Extract system info if available
      setSystemInfo({
        app_version: data.app_version ?? '1.0.0',
        server_status: data.server_status ?? 'online',
        last_backup: data.last_backup ?? null,
        node_version: data.node_version ?? '---',
        db_type: data.db_type ?? 'PostgreSQL',
        environment: data.environment ?? 'production',
      });
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки состояния БД');
    } finally {
      setDbHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuditLog(0);
    fetchPopulation();
    fetchDbHealth();
  }, [fetchAuditLog, fetchPopulation, fetchDbHealth]);

  // --- Helpers ---
  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '---';
    return new Date(dateStr).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatPopulation = (value: number) => {
    return value.toLocaleString('ru-RU');
  };

  // --- Pagination ---
  const handlePageChange = (newPage: number) => {
    setAuditPage(newPage);
    fetchAuditLog(newPage);
  };

  const totalPages = Math.max(1, Math.ceil(auditTotal / PAGE_SIZE));

  // --- Export audit log to CSV ---
  const exportAuditToCsv = async () => {
    setActionLoading('export-csv');
    try {
      // Fetch all audit log entries
      const data = await apiCall(`/api/admin/audit-log?limit=10000&offset=0`);
      const entries: AuditLogEntry[] = Array.isArray(data)
        ? data
        : data.entries ?? data.logs ?? [];

      if (entries.length === 0) {
        setError('Нет записей для экспорта');
        return;
      }

      // Build CSV
      const BOM = '\uFEFF';
      const header = ['ID', 'Дата и время', 'Пользователь', 'Действие', 'Детали', 'IP-адрес'];
      const rows = entries.map((e) => [
        String(e.id),
        formatDate(e.timestamp),
        e.user,
        e.action,
        `"${(e.details || '').replace(/"/g, '""')}"`,
        e.ip_address || '',
      ]);
      const csvContent = BOM + [header.join(';'), ...rows.map((r) => r.join(';'))].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_log_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showSuccess(`Экспортировано ${entries.length} записей`);
    } catch (err: any) {
      setError(err.message || 'Ошибка экспорта');
    } finally {
      setActionLoading(null);
    }
  };

  // --- Clear cache ---
  const clearCache = async () => {
    if (!window.confirm('Очистить кеш системы? Это может временно замедлить работу.')) return;
    setActionLoading('clear-cache');
    try {
      await apiCall('/api/admin/db-stats/clear-cache', { method: 'POST' });
      showSuccess('Кеш очищен');
    } catch (err: any) {
      setError(err.message || 'Ошибка очистки кеша');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return 'bg-green-100 text-green-800';
      case 'warning':
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800';
      case 'critical':
      case 'offline':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'Работает нормально';
      case 'online':
        return 'Онлайн';
      case 'warning':
        return 'Предупреждение';
      case 'degraded':
        return 'Деградация';
      case 'critical':
        return 'Критический';
      case 'offline':
        return 'Оффлайн';
      default:
        return status;
    }
  };

  const sections = [
    { key: 'audit' as const, label: 'Журнал аудита', icon: <Activity className="h-4 w-4" /> },
    { key: 'population' as const, label: 'Население', icon: <Users className="h-4 w-4" /> },
    { key: 'health' as const, label: 'Состояние БД', icon: <HardDrive className="h-4 w-4" /> },
    { key: 'system' as const, label: 'Система', icon: <Server className="h-4 w-4" /> },
  ];

  // --- Render ---
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Настройки системы</h2>
        <p className="text-sm text-gray-500">Мониторинг, аудит и настройка системы</p>
      </div>

      {/* Success */}
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

      {/* ========== AUDIT LOG ========== */}
      {activeSection === 'audit' && (
        <div className="space-y-4">
          {/* Audit actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={exportAuditToCsv}
              disabled={actionLoading === 'export-csv'}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#004F9F] text-white text-sm font-medium rounded-lg hover:bg-[#003d7a] transition-colors shadow-sm disabled:opacity-50"
            >
              {actionLoading === 'export-csv' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Экспорт в CSV
            </button>
            <button
              onClick={() => fetchAuditLog(auditPage)}
              disabled={auditLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
            >
              {auditLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Обновить
            </button>
          </div>

          {/* Audit table */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-800">Журнал аудита</h3>
              <p className="text-xs text-gray-500 mt-1">
                {auditTotal > 0
                  ? `Показаны ${auditPage * PAGE_SIZE + 1} - ${Math.min(
                      (auditPage + 1) * PAGE_SIZE,
                      auditTotal
                    )} из ${auditTotal}`
                  : 'Нет записей'}
              </p>
            </div>
            {auditLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-[#004F9F]" />
                <span className="ml-3 text-gray-500">Загрузка журнала...</span>
              </div>
            ) : auditLog.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Записей не найдено</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                        Дата и время
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                        Пользователь
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                        Действие
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                        Детали
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {auditLog.map((entry) => (
                      <tr key={entry.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {formatDate(entry.timestamp)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {entry.user}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {entry.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-md truncate">
                          {entry.details || '---'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {auditTotal > PAGE_SIZE && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Страница {auditPage + 1} из {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(auditPage - 1)}
                    disabled={auditPage === 0 || auditLoading}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Назад
                  </button>
                  <button
                    onClick={() => handlePageChange(auditPage + 1)}
                    disabled={auditPage >= totalPages - 1 || auditLoading}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Далее
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========== POPULATION ========== */}
      {activeSection === 'population' && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-800">Данные о населении по регионам</h3>
          </div>
          {populationLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[#004F9F]" />
              <span className="ml-3 text-gray-500">Загрузка данных...</span>
            </div>
          ) : population.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Globe className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Данные о населении не загружены</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Регион
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Население
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Федеральный округ
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Менеджер
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {population.map((entry) => (
                    <tr key={entry.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-gray-400" />
                          {entry.region}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-700">
                        {formatPopulation(entry.population)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {entry.federal_district}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {entry.manager || '---'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========== DB HEALTH ========== */}
      {activeSection === 'health' && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={fetchDbHealth}
              disabled={dbHealthLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
            >
              {dbHealthLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Обновить
            </button>
          </div>

          {dbHealthLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[#004F9F]" />
              <span className="ml-3 text-gray-500">Загрузка...</span>
            </div>
          ) : !dbHealth ? (
            <div className="text-center py-16 text-gray-500">
              <HardDrive className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Данные о состоянии БД недоступны</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Status card */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                    <Shield className="h-5 w-5 text-[#004F9F]" />
                  </div>
                  <h4 className="text-sm font-semibold text-gray-800">Статус БД</h4>
                </div>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                    dbHealth.status
                  )}`}
                >
                  {getStatusLabel(dbHealth.status)}
                </span>
                <p className="text-xs text-gray-500 mt-3">Версия: {dbHealth.version}</p>
              </div>

              {/* Uptime card */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                    <Clock className="h-5 w-5 text-green-600" />
                  </div>
                  <h4 className="text-sm font-semibold text-gray-800">Время работы</h4>
                </div>
                <p className="text-2xl font-bold text-gray-900">{dbHealth.uptime}</p>
              </div>

              {/* Connections card */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-cyan-50 rounded-xl flex items-center justify-center">
                    <Activity className="h-5 w-5 text-[#20C6DA]" />
                  </div>
                  <h4 className="text-sm font-semibold text-gray-800">Соединения</h4>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {dbHealth.connections_active}{' '}
                  <span className="text-sm font-normal text-gray-500">
                    / {dbHealth.connections_max}
                  </span>
                </p>
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#20C6DA] transition-all"
                    style={{
                      width: `${Math.min(
                        (dbHealth.connections_active / dbHealth.connections_max) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Disk usage card */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                    <HardDrive className="h-5 w-5 text-amber-600" />
                  </div>
                  <h4 className="text-sm font-semibold text-gray-800">Диск</h4>
                </div>
                <p className="text-2xl font-bold text-gray-900">{dbHealth.disk_usage_percent}%</p>
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      dbHealth.disk_usage_percent > 90
                        ? 'bg-red-500'
                        : dbHealth.disk_usage_percent > 70
                        ? 'bg-amber-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${dbHealth.disk_usage_percent}%` }}
                  />
                </div>
              </div>

              {/* Last backup card */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                    <Download className="h-5 w-5 text-purple-600" />
                  </div>
                  <h4 className="text-sm font-semibold text-gray-800">Последний бекап</h4>
                </div>
                <p className="text-sm font-medium text-gray-700">
                  {formatDate(dbHealth.last_backup)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========== SYSTEM INFO ========== */}
      {activeSection === 'system' && (
        <div className="space-y-6">
          {/* System actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={clearCache}
              disabled={actionLoading === 'clear-cache'}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {actionLoading === 'clear-cache' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Очистить кеш
            </button>
          </div>

          {/* System info cards */}
          {dbHealthLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[#004F9F]" />
              <span className="ml-3 text-gray-500">Загрузка...</span>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-base font-semibold text-gray-800">Информация о системе</h3>
              </div>
              <div className="divide-y divide-gray-100">
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Server className="h-5 w-5 text-gray-400" />
                    <span className="text-sm text-gray-700">Версия приложения</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {systemInfo?.app_version || '---'}
                  </span>
                </div>
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-gray-400" />
                    <span className="text-sm text-gray-700">Статус сервера</span>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                      systemInfo?.server_status || 'online'
                    )}`}
                  >
                    {getStatusLabel(systemInfo?.server_status || 'online')}
                  </span>
                </div>
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <HardDrive className="h-5 w-5 text-gray-400" />
                    <span className="text-sm text-gray-700">Тип БД</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {systemInfo?.db_type || '---'}
                  </span>
                </div>
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-gray-400" />
                    <span className="text-sm text-gray-700">Окружение</span>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {systemInfo?.environment || '---'}
                  </span>
                </div>
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Server className="h-5 w-5 text-gray-400" />
                    <span className="text-sm text-gray-700">Node.js</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {systemInfo?.node_version || '---'}
                  </span>
                </div>
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Download className="h-5 w-5 text-gray-400" />
                    <span className="text-sm text-gray-700">Последний бекап</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {formatDate(systemInfo?.last_backup ?? null)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SystemSettings;
