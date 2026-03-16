import { Request, Response, NextFunction } from 'express';

interface AuthRequest extends Request {
  userId?: number;
  userRole?: string;
}

export type UserRole = 'admin' | 'director' | 'manager' | 'territory_manager' | 'medrep' | 'analyst';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 100,
  director: 90,
  manager: 60,
  territory_manager: 40,
  medrep: 20,
  analyst: 10,
};

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const userRole = req.userRole as UserRole;
    if (!userRole) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }
    if (userRole === 'admin' || userRole === 'director') {
      return next();
    }
    if (allowedRoles.includes(userRole)) {
      return next();
    }
    return res.status(403).json({
      error: `Доступ запрещён. Требуется роль: ${allowedRoles.join(', ')}`,
    });
  };
}

export function requireMinRole(minRole: UserRole) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const userRole = req.userRole as UserRole;
    if (!userRole) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }
    const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] ?? 0;
    if (userLevel >= requiredLevel) {
      return next();
    }
    return res.status(403).json({
      error: `Недостаточно прав. Минимальный уровень: ${minRole}`,
    });
  };
}

export function getRoleDisplayName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    admin: 'Администратор',
    director: 'Генеральный директор',
    manager: 'Региональный менеджер',
    territory_manager: 'Территориальный менеджер',
    medrep: 'Медицинский представитель',
    analyst: 'Аналитик',
  };
  return names[role] || role;
}
