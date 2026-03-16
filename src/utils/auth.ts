// ==================== УТИЛИТЫ АВТОРИЗАЦИИ ====================

import { User, Role, CreateUserDTO } from '@/types/user.types';

/**
 * Хеширование пароля (упрощённое для демо)
 */
export function hashPassword(password: string): string {
  return btoa(password);
}

/**
 * Проверка пароля
 */
export function verifyPassword(password: string, hash: string): boolean {
  return btoa(password) === hash;
}

/**
 * Валидация email
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Валидация пароля
 */
export function validatePassword(password: string): boolean {
  return password.length >= 6;
}

/**
 * Создание пользователя
 */
export function createUser(dto: CreateUserDTO): User {
  return {
    id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    email: dto.email,
    fullName: dto.fullName,
    role: dto.role,
    territory: dto.territory,
    district: dto.district,
    region: dto.region,
    phone: dto.phone,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Генерация случайного пароля
 */
export function generateRandomPassword(length: number = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * Создание дефолтных пользователей
 */
export function createDefaultUsers(): User[] {
  return [
    {
      id: 'user-director',
      email: 'director@orney.ru',
      fullName: 'Директор WM',
      role: 'director',
      territory: 'Приволжский ФО',
      district: 'ПФО',
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'user-admin',
      email: 'admin@orney.ru',
      fullName: 'Администратор',
      role: 'admin',
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'user-rm',
      email: 'manager.pfo@orney.ru',
      fullName: 'Региональный менеджер ПФО',
      role: 'regional_manager',
      territory: 'Приволжский ФО',
      district: 'ПФО',
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'user-tm',
      email: 'tm.samara@orney.ru',
      fullName: 'Территориальный менеджер Самара',
      role: 'territorial_manager',
      territory: 'Самарская область',
      district: 'ПФО',
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'user-mr',
      email: 'shestakova@orney.ru',
      fullName: 'Шестакова Марина',
      role: 'med_rep',
      territory: 'Республика Татарстан',
      district: 'ПФО',
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
    },
  ];
}
