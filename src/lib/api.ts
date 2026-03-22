const API_BASE = '/api';

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
  if (token) {
    localStorage.setItem('mdlp_auth_token', token);
  } else {
    localStorage.removeItem('mdlp_auth_token');
  }
}

export function getAuthToken(): string | null {
  if (!authToken) {
    // Проверяем оба ключа: WM Russia и MDLP
    authToken = localStorage.getItem('wm_auth_token') || localStorage.getItem('mdlp_auth_token');
  }
  return authToken;
}

export function clearAuth(): void {
  authToken = null;
  localStorage.removeItem('mdlp_auth_token');
  localStorage.removeItem('mdlp_user');
}

async function fetchApi<T>(endpoint: string, options?: RequestInit & { auth?: boolean }): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options?.auth !== false) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Ошибка сервера' }));
    if (response.status === 401) {
      clearAuth();
    }
    throw new Error(error.error || 'Ошибка запроса');
  }

  return response.json();
}

export interface AuthResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
  token: string;
}

export interface SavedReportResponse {
  id: number;
  userId: number;
  name: string;
  type: string;
  filters: any;
  data: any;
  createdAt: string;
}

export interface SavedPlanResponse {
  id: number;
  userId: number;
  year: number;
  territoryId: number | null;
  drugId: number | null;
  planValue: string;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetScenarioResponse {
  id: number;
  userId: number;
  name: string;
  currentBudget: string;
  growthPercent: string;
  targetBudget: string;
  drugs: Array<{ id: string; name: string; pricePerUnit: number; quantity: number }>;
  districtShares: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface UploadHistoryResponse {
  id: number;
  userId: number;
  filename: string;
  status: string;
  rowsCount: number | null;
  errorMessage: string | null;
  uploadedAt: string;
}

export interface YearlySalesDataResponse {
  id: number;
  userId: number;
  year: number;
  dataType: string;
  aggregatedData: any;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export const api = {
  auth: {
    login: async (email: string, password: string) => {
      const response = await fetchApi<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        auth: false,
      });
      setAuthToken(response.token);
      return response;
    },
    register: async (email: string, password: string, name: string) => {
      const response = await fetchApi<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
        auth: false,
      });
      setAuthToken(response.token);
      return response;
    },
    logout: () => {
      clearAuth();
    },
  },

  reports: {
    getByUser: (userId: string) =>
      fetchApi<SavedReportResponse[]>(`/reports/${userId}`),
    create: (report: { userId: number; name: string; type: string; filters: any; data: any }) =>
      fetchApi<SavedReportResponse>('/reports', {
        method: 'POST',
        body: JSON.stringify(report),
      }),
    delete: (id: number) =>
      fetchApi<{ success: boolean }>(`/reports/${id}`, { method: 'DELETE' }),
  },

  plans: {
    getByUser: (userId: string) =>
      fetchApi<SavedPlanResponse[]>(`/plans/${userId}`),
    create: (plan: { userId: number; year: number; territoryId?: number; drugId?: number; planValue: string }) =>
      fetchApi<SavedPlanResponse>('/plans', {
        method: 'POST',
        body: JSON.stringify(plan),
      }),
    update: (id: number, planValue: string, isLocked: boolean) =>
      fetchApi<{ success: boolean }>(`/plans/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ planValue, isLocked }),
      }),
  },

  uploads: {
    getByUser: (userId: string) =>
      fetchApi<UploadHistoryResponse[]>(`/uploads/${userId}`),
    create: (upload: { userId: number; filename: string; status: string; rowsCount?: number; errorMessage?: string }) =>
      fetchApi<UploadHistoryResponse>('/uploads', {
        method: 'POST',
        body: JSON.stringify(upload),
      }),
  },

  reaggregate: () =>
    fetchApi<{ success: boolean; years: number[]; message: string }>('/reaggregate', { method: 'POST' }),
  fixDedup: () =>
    fetchApi<{ success: boolean; originalRows: number; dedupedRows: number; years: number[]; message: string }>('/database/fix-dedup', { method: 'POST' }),

  yearlyData: {
    getByUser: (userId: string) =>
      fetchApi<YearlySalesDataResponse[]>(`/yearly-data/${userId}`),
    getByYear: (userId: string, year: number) =>
      fetchApi<YearlySalesDataResponse | null>(`/yearly-data/${userId}/${year}`),
    save: (data: { userId: number; year: number; dataType: string; aggregatedData: any; isLocked?: boolean }) =>
      fetchApi<YearlySalesDataResponse>('/yearly-data', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    saveRawRows: (userId: number, rawRows: any[]) =>
      fetchApi<YearlySalesDataResponse>('/yearly-data', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          year: 9999,
          dataType: 'rawRows',
          aggregatedData: { rows: rawRows },
        }),
      }),
    getRawRows: async (userId: string): Promise<{ rows: any[] | null; contragentRows: any[] | null }> => {
      try {
        const data = await fetchApi<YearlySalesDataResponse | null>(`/yearly-data/${userId}/9999`);
        if (data && (data.dataType === 'rawRows' || data.dataType === 'rawParsedRows' || data.dataType === 'compactRows') && data.aggregatedData) {
          const agg = data.aggregatedData as any;
          return {
            rows: agg.rows || null,
            contragentRows: agg.contragentRows || null,
          };
        }
        return { rows: null, contragentRows: null };
      } catch {
        return { rows: null, contragentRows: null };
      }
    },
  },

  analytics: {
    generateComment: (salesData: any) =>
      fetchApi<{ comment: string }>('/analytics/generate-comment', {
        method: 'POST',
        body: JSON.stringify({ salesData }),
      }),
  },

  wmRussia: {
    getActivityLog: async (userId: string): Promise<any[]> => {
      try {
        const data = await fetchApi<YearlySalesDataResponse | null>(`/yearly-data/${userId}/9998`);
        if (data && data.dataType === 'wm_activity_log' && data.aggregatedData) {
          return (data.aggregatedData as any).log || [];
        }
        return [];
      } catch {
        return [];
      }
    },
    saveActivityLog: (userId: number, log: any[]) =>
      fetchApi<YearlySalesDataResponse>('/yearly-data', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          year: 9998,
          dataType: 'wm_activity_log',
          aggregatedData: { log: log.slice(0, 100) },
        }),
      }),
    getMonthlyPlans: async (userId: string): Promise<Record<string, Record<number, number>>> => {
      try {
        const data = await fetchApi<YearlySalesDataResponse | null>(`/yearly-data/${userId}/9997`);
        if (data && data.dataType === 'wm_monthly_plans' && data.aggregatedData) {
          return (data.aggregatedData as any).plans || {};
        }
        return {};
      } catch {
        return {};
      }
    },
    saveMonthlyPlans: (userId: number, plans: Record<string, Record<number, number>>) =>
      fetchApi<YearlySalesDataResponse>('/yearly-data', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          year: 9997,
          dataType: 'wm_monthly_plans',
          aggregatedData: { plans },
        }),
      }),
    getMedRepsStatus: async (userId: string): Promise<Record<string, boolean>> => {
      try {
        const data = await fetchApi<YearlySalesDataResponse | null>(`/yearly-data/${userId}/9996`);
        if (data && data.dataType === 'wm_medreps_status' && data.aggregatedData) {
          return (data.aggregatedData as any).statuses || {};
        }
        return {};
      } catch {
        return {};
      }
    },
    saveMedRepsStatus: (userId: number, statuses: Record<string, boolean>) =>
      fetchApi<YearlySalesDataResponse>('/yearly-data', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          year: 9996,
          dataType: 'wm_medreps_status',
          aggregatedData: { statuses },
        }),
      }),
    getRegionPlans: async (userId: string): Promise<Record<string, number>> => {
      try {
        const data = await fetchApi<YearlySalesDataResponse | null>(`/yearly-data/${userId}/9995`);
        if (data && data.dataType === 'region_plans' && data.aggregatedData) {
          return (data.aggregatedData as any).plans || {};
        }
        return {};
      } catch {
        return {};
      }
    },
    saveRegionPlans: (userId: number, plans: Record<string, number>) =>
      fetchApi<YearlySalesDataResponse>('/yearly-data', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          year: 9995,
          dataType: 'region_plans',
          aggregatedData: { plans },
        }),
      }),
    getDrugPlans: async (userId: string): Promise<Record<string, number>> => {
      try {
        const data = await fetchApi<YearlySalesDataResponse | null>(`/yearly-data/${userId}/9994`);
        if (data && data.dataType === 'drug_plans' && data.aggregatedData) {
          return (data.aggregatedData as any).plans || {};
        }
        return {};
      } catch {
        return {};
      }
    },
    saveDrugPlans: (userId: number, plans: Record<string, number>) =>
      fetchApi<YearlySalesDataResponse>('/yearly-data', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          year: 9994,
          dataType: 'drug_plans',
          aggregatedData: { plans },
        }),
      }),
    getAuxiliaryData: async (userId: string): Promise<{
      historical: Record<string, any>;
      locked: Record<string, boolean>;
      previousWeekData: Record<string, any>;
      currentWeekData: Record<string, any>;
      lastUploadDate: string | null;
    }> => {
      try {
        const data = await fetchApi<YearlySalesDataResponse | null>(`/yearly-data/${userId}/9993`);
        if (data && data.dataType === 'auxiliary_data' && data.aggregatedData) {
          const aux = data.aggregatedData as any;
          return {
            historical: aux.historical || {},
            locked: aux.locked || {},
            previousWeekData: aux.previousWeekData || {},
            currentWeekData: aux.currentWeekData || {},
            lastUploadDate: aux.lastUploadDate || null,
          };
        }
        return { historical: {}, locked: {}, previousWeekData: {}, currentWeekData: {}, lastUploadDate: null };
      } catch {
        return { historical: {}, locked: {}, previousWeekData: {}, currentWeekData: {}, lastUploadDate: null };
      }
    },
    saveAuxiliaryData: (userId: number, data: {
      historical: Record<string, any>;
      locked: Record<string, boolean>;
      previousWeekData: Record<string, any>;
      currentWeekData: Record<string, any>;
      lastUploadDate: string | null;
    }) =>
      fetchApi<YearlySalesDataResponse>('/yearly-data', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          year: 9993,
          dataType: 'auxiliary_data',
          aggregatedData: data,
        }),
      }),
  },

  budgetScenarios: {
    getByUser: (userId: string) =>
      fetchApi<BudgetScenarioResponse[]>(`/budget-scenarios/${userId}`),
    create: (scenario: {
      userId: number;
      name: string;
      currentBudget: number;
      growthPercent: number;
      targetBudget: number;
      drugs: Array<{ id: string; name: string; pricePerUnit: number; quantity: number }>;
      districtShares: Record<string, number>;
    }) =>
      fetchApi<BudgetScenarioResponse>('/budget-scenarios', {
        method: 'POST',
        body: JSON.stringify(scenario),
      }),
    update: (id: number, scenario: Partial<{
      name: string;
      currentBudget: number;
      growthPercent: number;
      targetBudget: number;
      drugs: Array<{ id: string; name: string; pricePerUnit: number; quantity: number }>;
      districtShares: Record<string, number>;
    }>) =>
      fetchApi<BudgetScenarioResponse>(`/budget-scenarios/${id}`, {
        method: 'PUT',
        body: JSON.stringify(scenario),
      }),
    delete: (id: number) =>
      fetchApi<{ success: boolean }>(`/budget-scenarios/${id}`, {
        method: 'DELETE',
      }),
  },

  health: () => fetchApi<{ status: string; timestamp: string }>('/health', { auth: false }),

  uploadHistory: {
    getAll: () =>
      fetchApi<Array<{
        id: number;
        userId: number;
        uploadId: string;
        filename: string;
        status: string;
        rowsCount: number | null;
        yearPeriod: number | null;
        monthPeriod: string | null;
        isActive: boolean;
        errorMessage: string | null;
        uploadedAt: string;
      }>>('/upload-history'),
    create: (data: { filename: string; status: string; rowsCount?: number; errorMessage?: string }) =>
      fetchApi<{
        id: number;
        userId: number;
        filename: string;
        status: string;
        rowsCount: number | null;
        errorMessage: string | null;
        uploadedAt: string;
      }>('/upload-history', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    toggle: (id: number, isActive: boolean) =>
      fetchApi<{ success: boolean }>(`/upload-history/${id}/toggle`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      }),
    delete: (id: number) =>
      fetchApi<{ success: boolean; message: string }>(`/upload-history/${id}`, {
        method: 'DELETE',
      }),
    deleteAll: () =>
      fetchApi<{ success: boolean; message: string }>('/upload-history/all', {
        method: 'DELETE',
      }),
  },

  columnMappings: {
    getAll: () =>
      fetchApi<Array<ColumnMappingResponse>>('/column-mappings'),
    create: (data: { profileName: string; isDefault?: boolean; mappings: Record<string, string> }) =>
      fetchApi<ColumnMappingResponse>('/column-mappings', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: { profileName?: string; isDefault?: boolean; mappings?: Record<string, string> }) =>
      fetchApi<ColumnMappingResponse>(`/column-mappings/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      fetchApi<{ success: boolean }>(`/column-mappings/${id}`, {
        method: 'DELETE',
      }),
  },

  salesRepTerritories: {
    getAll: () =>
      fetchApi<Array<SalesRepTerritoryResponse>>('/sales-rep-territories'),
    create: (data: { name: string; regions: string[]; sortOrder?: number }) =>
      fetchApi<SalesRepTerritoryResponse>('/sales-rep-territories', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: { name?: string; regions?: string[]; sortOrder?: number }) =>
      fetchApi<SalesRepTerritoryResponse>(`/sales-rep-territories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      fetchApi<{ success: boolean }>(`/sales-rep-territories/${id}`, {
        method: 'DELETE',
      }),
  },

  auxiliary: {
    get: () =>
      fetchApi<{ managerTerritories?: Record<string, string[]>; [key: string]: any }>('/auxiliary'),
    save: (data: { managerTerritories?: Record<string, string[]>; [key: string]: any }) =>
      fetchApi<{ success: boolean }>('/auxiliary', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  drugPrices: {
    getAll: () =>
      fetchApi<Array<{ id: number; drug_pattern: string; drug_label: string; price_per_unit: string }>>('/drug-prices'),
  },
};

export interface ColumnMappingResponse {
  id: number;
  userId: number;
  profileName: string;
  isDefault: boolean;
  mappings: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface SalesRepTerritoryResponse {
  id: number;
  userId: number;
  name: string;
  regions: string[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface FileUploadResponse {
  success: boolean;
  fileId: string;
  fileName: string;
  fileSize: number;
  message: string;
}

export interface ProcessingStatus {
  fileId: string;
  fileName: string;
  status: 'uploading' | 'processing' | 'aggregating' | 'saving' | 'completed' | 'error';
  progress: number;
  totalBytes: number;
  processedBytes: number;
  totalRows: number;
  processedRows: number;
  message: string;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

const CHUNK_SIZE = 20 * 1024 * 1024; // 20MB на чанк
const MAX_CHUNK_RETRIES = 3;

// XHR-версия sendChunk с реальным прогрессом загрузки внутри чанка
async function sendChunkXHR(
  fileId: string,
  chunkIndex: number,
  chunkBlob: Blob,
  onChunkProgress?: (bytesSent: number, bytesTotal: number) => void
): Promise<{ success: boolean; received: number; total: number }> {
  const formData = new FormData();
  formData.append('fileId', fileId);
  formData.append('chunkIndex', String(chunkIndex));
  formData.append('chunk', chunkBlob, `chunk_${chunkIndex}`);

  const token = getAuthToken();

  for (let attempt = 1; attempt <= MAX_CHUNK_RETRIES; attempt++) {
    try {
      const result = await new Promise<{ success: boolean; received: number; total: number }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE}/files/upload-chunk`);
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        // Прогресс внутри чанка (реальная передача байт)
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && onChunkProgress) {
            onChunkProgress(e.loaded, e.total);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              resolve({ success: true, received: chunkIndex + 1, total: chunkIndex + 1 });
            }
          } else {
            let errMsg = `HTTP ${xhr.status}`;
            try { errMsg = JSON.parse(xhr.responseText).error || errMsg; } catch {}
            reject(new Error(errMsg));
          }
        };
        xhr.onerror = () => reject(new Error('Ошибка сети при загрузке чанка'));
        xhr.ontimeout = () => reject(new Error('Таймаут чанка'));
        xhr.timeout = 5 * 60 * 1000; // 5 минут на чанк
        xhr.send(formData);
      });
      return result;
    } catch (err: any) {
      console.warn(`[ChunkUpload] Часть ${chunkIndex} попытка ${attempt}/${MAX_CHUNK_RETRIES}: ${err.message}`);
      if (attempt === MAX_CHUNK_RETRIES) throw err;
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  throw new Error('Не удалось отправить часть файла');
}

export async function uploadFileToServer(
  file: File,
  onProgress?: (progress: number) => void
): Promise<FileUploadResponse> {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  const initRes = await fetchApi<{ success: boolean; fileId: string }>('/files/upload-init', {
    method: 'POST',
    body: JSON.stringify({ fileName: file.name, totalChunks, fileSize: file.size }),
  });

  if (!initRes.success || !initRes.fileId) {
    throw new Error('Не удалось инициализировать загрузку');
  }

  const fileId = initRes.fileId;
  console.log(`[ChunkUpload] Начало: ${file.name}, ${totalChunks} частей, fileId=${fileId}`);

  // Байты уже отправленных чанков
  let bytesSentPrevChunks = 0;

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);
    const chunkSize = end - start;

    await sendChunkXHR(fileId, i, chunk, onProgress ? (loaded, total) => {
      // Плавный прогресс: уже отправленные чанки + прогресс текущего
      const totalSent = bytesSentPrevChunks + loaded;
      const overallPct = Math.round((totalSent / file.size) * 100);
      onProgress(Math.min(overallPct, 99)); // до 99%, 100% только после финального статуса
    } : undefined);

    bytesSentPrevChunks += chunkSize;
    if (onProgress) onProgress(Math.round((bytesSentPrevChunks / file.size) * 100));
  }

  console.log(`[ChunkUpload] Все ${totalChunks} частей отправлены для ${fileId}`);

  return {
    success: true,
    fileId,
    fileName: file.name,
    fileSize: file.size,
    message: 'Файл загружен частями, идёт обработка...',
  };
}

export async function resetStuckUploads(): Promise<{ success: boolean; cleared: number }> {
  return fetchApi<{ success: boolean; cleared: number }>('/files/reset-stuck', { method: 'POST' });
}

export async function getFileProcessingStatus(fileId: string): Promise<ProcessingStatus> {
  return fetchApi<ProcessingStatus>(`/files/status/${fileId}`);
}

export async function getAllFileJobs(): Promise<ProcessingStatus[]> {
  return fetchApi<ProcessingStatus[]>('/files/jobs');
}

export interface DatabaseStats {
  totalSize: string;
  totalBytes: number;
  maxBytes: number;
  usagePercent: number;
  userUsagePercent: number;
  userRecords: number;
  userDataSize: string;
  userDataBytes: number;
  rowCount: number;
  freeBytes: number;
  freeSize: string;
}

export async function getDatabaseStats(): Promise<DatabaseStats> {
  return fetchApi<DatabaseStats>('/database/stats');
}

export async function clearDatabaseData(clearType: 'rawRows' | 'all' | 'oldYears'): Promise<{ success: boolean; message: string }> {
  return fetchApi<{ success: boolean; message: string }>('/database/clear-data', {
    method: 'DELETE',
    body: JSON.stringify({ clearType }),
  });
}

export interface TabMetadata {
  hasData: boolean;
  years: string[];
  drugs: string[];
  regions: string[];
  federalDistricts: string[];
  disposalTypes: string[];
  contractorGroups: string[];
  receiverTypes: string[];
}

export async function fetchTabData<T = any>(tabName: string, params?: Record<string, any>): Promise<T> {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          if (value.length > 0) query.set(key, JSON.stringify(value));
        } else {
          query.set(key, String(value));
        }
      }
    });
  }
  const qs = query.toString();
  const endpoint = `/tab/${tabName}${qs ? '?' + qs : ''}`;

  console.log(`[Filter] отправка:`, {
    endpoint: tabName,
    years: params?.years,
    yearsType: Array.isArray(params?.years) ? 'array' : typeof params?.years,
    drugs: params?.drugs?.length || 0,
    disposalTypes: params?.disposalTypes?.length || 0,
    regions: params?.regions?.length || 0,
    rawQuery: qs,
  });

  const data = await fetchApi<T>(endpoint);

  console.log(`[Filter] ответ:`, {
    endpoint: tabName,
    totalSales: (data as any)?.kpi?.totalSales,
    regionsCount: (data as any)?.regionSales?.length,
    drugsCount: (data as any)?.drugSales?.length,
    monthlySalesCount: (data as any)?.monthlySales?.length,
    hasError: !!(data as any)?.error,
  });

  return data;
}

export async function fetchTabMetadata(): Promise<TabMetadata> {
  return fetchApi<TabMetadata>('/tab/metadata');
}

export async function checkDbHealth(): Promise<{status: string; message?: string; remainingSec?: number}> {
  try {
    const res = await fetch('/api/health');
    return await res.json();
  } catch {
    return { status: 'error', message: 'Сервер недоступен' };
  }
}

// ==================== ADMIN API ====================

export const adminApi = {
  // Users
  getUsers: () => fetchApi<{ users: any[] }>('/admin/users'),
  createUser: (data: { email: string; password: string; name: string; role: string }) =>
    fetchApi<{ user: any }>('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: number, data: any) =>
    fetchApi<{ user: any }>(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: number) =>
    fetchApi<{ success: boolean }>(`/admin/users/${id}`, { method: 'DELETE' }),

  // Employees
  getEmployees: () => fetchApi<{ employees: any[] }>('/admin/employees'),
  createEmployee: (data: any) =>
    fetchApi<{ employee: any }>('/admin/employees', { method: 'POST', body: JSON.stringify(data) }),
  updateEmployee: (id: number, data: any) =>
    fetchApi<{ employee: any }>(`/admin/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEmployee: (id: number) =>
    fetchApi<{ success: boolean }>(`/admin/employees/${id}`, { method: 'DELETE' }),

  // Drug Prices
  getDrugPrices: () => fetchApi<{ prices: any[] }>('/admin/drug-prices'),
  upsertDrugPrice: (data: { drug_name: string; price_per_unit: number }) =>
    fetchApi<{ price: any }>('/admin/drug-prices', { method: 'PUT', body: JSON.stringify(data) }),

  // Audit Log
  getAuditLog: (limit = 100, offset = 0) =>
    fetchApi<{ entries: any[]; total: number }>(`/admin/audit-log?limit=${limit}&offset=${offset}`),

  // Plans
  getPlans: () => fetchApi<{ plans: any[] }>('/admin/plans'),
  updatePlan: (id: number, data: any) =>
    fetchApi<{ plan: any }>(`/admin/plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // DB Stats
  getDbStats: () => fetchApi<{ tables: Record<string, number>; databaseSize: string }>('/admin/db-stats'),

  // Population
  getPopulation: () => fetchApi<{ population: any[] }>('/admin/population'),

  // Products
  getProducts: () => fetchApi<{ products: any[] }>('/admin/products'),
  createProduct: (data: any) => fetchApi<{ product: any }>('/admin/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: number, data: any) => fetchApi<{ product: any }>(`/admin/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id: number) => fetchApi<{ success: boolean }>(`/admin/products/${id}`, { method: 'DELETE' }),

  // Districts & Territories
  getDistricts: () => fetchApi<{ districts: any[] }>('/admin/districts'),
  createDistrict: (data: any) => fetchApi<{ district: any }>('/admin/districts', { method: 'POST', body: JSON.stringify(data) }),
  updateDistrict: (id: string, data: any) => fetchApi<{ district: any }>(`/admin/districts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDistrict: (id: string) => fetchApi<{ success: boolean }>(`/admin/districts/${id}`, { method: 'DELETE' }),
  createTerritory: (data: any) => fetchApi<{ territory: any }>('/admin/territories', { method: 'POST', body: JSON.stringify(data) }),
  updateTerritory: (id: string, data: any) => fetchApi<{ territory: any }>(`/admin/territories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTerritory: (id: string) => fetchApi<{ success: boolean }>(`/admin/territories/${id}`, { method: 'DELETE' }),
};

export default api;
