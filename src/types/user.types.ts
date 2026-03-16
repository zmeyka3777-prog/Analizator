// ==================== ТИПЫ ПОЛЬЗОВАТЕЛЕЙ ====================

export type Role = 'director' | 'regional_manager' | 'territorial_manager' | 'med_rep' | 'admin';

export type FederalDistrict = 'ЦФО' | 'СЗФО' | 'ЮФО' | 'СКФО' | 'ПФО' | 'УФО' | 'СФО' | 'ДФО';

export type RegionPFO =
  | 'Республика Татарстан'
  | 'Самарская область'
  | 'Республика Башкортостан'
  | 'Нижегородская область'
  | 'Пензенская область'
  | 'Республика Мордовия'
  | 'Оренбургская область'
  | 'Саратовская область'
  | 'Ульяновская область'
  | 'Кировская область'
  | 'Пермский край'
  | 'Удмуртская Республика'
  | 'Чувашская Республика'
  | 'Республика Марий Эл';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  territory?: string;
  district?: FederalDistrict;
  region?: RegionPFO;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserDTO {
  email: string;
  password: string;
  fullName: string;
  role: Role;
  territory?: string;
  district?: FederalDistrict;
  region?: RegionPFO;
  phone?: string;
}

export interface UserSession {
  user: User;
  token: string;
  expiresAt: string;
}

export interface RolePermissions {
  canViewDashboard: boolean;
  canViewAnalytics: boolean;
  canManageUsers: boolean;
  canManageProducts: boolean;
  canManageTerritories: boolean;
  canUploadData: boolean;
  canExportReports: boolean;
  canEditBudget: boolean;
}

export function getRoleLabel(role: Role): string {
  const labels: Record<Role, string> = {
    director: 'Генеральный директор',
    regional_manager: 'Региональный менеджер',
    territorial_manager: 'Территориальный менеджер',
    med_rep: 'Медицинский представитель',
    admin: 'Администратор',
  };
  return labels[role] || role;
}

export function hasPermission(role: Role, permission: keyof RolePermissions): boolean {
  const permissions: Record<Role, RolePermissions> = {
    director: {
      canViewDashboard: true,
      canViewAnalytics: true,
      canManageUsers: false,
      canManageProducts: true,
      canManageTerritories: true,
      canUploadData: true,
      canExportReports: true,
      canEditBudget: true,
    },
    regional_manager: {
      canViewDashboard: true,
      canViewAnalytics: true,
      canManageUsers: false,
      canManageProducts: false,
      canManageTerritories: false,
      canUploadData: true,
      canExportReports: true,
      canEditBudget: false,
    },
    territorial_manager: {
      canViewDashboard: true,
      canViewAnalytics: true,
      canManageUsers: false,
      canManageProducts: false,
      canManageTerritories: false,
      canUploadData: true,
      canExportReports: true,
      canEditBudget: false,
    },
    med_rep: {
      canViewDashboard: true,
      canViewAnalytics: false,
      canManageUsers: false,
      canManageProducts: false,
      canManageTerritories: false,
      canUploadData: false,
      canExportReports: false,
      canEditBudget: false,
    },
    admin: {
      canViewDashboard: true,
      canViewAnalytics: true,
      canManageUsers: true,
      canManageProducts: true,
      canManageTerritories: true,
      canUploadData: true,
      canExportReports: true,
      canEditBudget: true,
    },
  };
  return permissions[role]?.[permission] ?? false;
}
