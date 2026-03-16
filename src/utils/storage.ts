// ==================== УТИЛИТЫ ХРАНЕНИЯ ДАННЫХ ====================

export const STORAGE_KEYS = {
  AUTH_USER: 'figma_auth_user',
  AUTH_SESSION: 'figma_auth_session',
  CURRENT_VIEW: 'currentView',
  DATE_SETTINGS: 'dateSettings',
  YEARS: 'world_medicine_years',
  PRODUCTS: 'world_medicine_products',
  PRODUCTS_DRAFT: 'world_medicine_products_draft',
  DISTRICTS: 'world_medicine_districts',
  DISTRICTS_DRAFT: 'world_medicine_districts_draft',
  UPLOADED_MONTHS: 'mdlp_uploaded_months',
  EMPLOYEES: 'world_medicine_employees',
  USERS: 'world_medicine_users',
  ORGANIZATION_STRUCTURE: 'world_medicine_organization_structure',
} as const;

/**
 * Сохранить данные в localStorage
 */
export function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving to storage [${key}]:`, error);
  }
}

/**
 * Загрузить данные из localStorage
 */
export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored) as T;
    }
  } catch (error) {
    console.error(`Error loading from storage [${key}]:`, error);
  }
  return defaultValue;
}

/**
 * Удалить данные из localStorage
 */
export function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing from storage [${key}]:`, error);
  }
}
