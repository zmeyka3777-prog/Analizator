# CLAUDE.md — Анализатор продаж МДЛП (World Medicine)

## О проекте

**Название:** Анализатор продаж МДЛП — World Medicine
**Репозиторий:** https://github.com/zmeyka3777-prog/Analizator
**Ветка:** main
**Git email:** zmeyka3777@gmail.com
**Git name:** zmeyka3777-prog

**Что это:** Корпоративное веб-приложение для анализа данных МДЛП (Мониторинг движения лекарственных препаратов) по Приволжскому федеральному округу. Охватывает 14 регионов с детализацией до 368 районов.

**Для кого:** Сотрудники компании World Medicine (директор, региональные менеджеры, территориальные менеджеры, медпреды, администраторы).

**Главная цель:** Предоставить аналитику продаж по препаратам World Medicine в разрезе регионов, районов, временных периодов с возможностью загрузки реальных данных и экспорта отчётов.

**Язык интерфейса:** Русский
**Тон и стиль:** Профессиональный, премиум. Футуристичный дизайн в стиле Захи Хадид, glassmorphism, градиенты, анимации.

---

## Технологии

| Слой | Технология |
|------|-----------|
| Frontend | React 18.3.1 + TypeScript |
| Сборщик | Vite 6.3.5 |
| Стили | Tailwind CSS 4.1 |
| UI-компоненты | shadcn/ui (Radix UI) + MUI 7.x |
| Графики | Recharts 2.15.2 |
| Анимации | Motion (Framer Motion) 12.x |
| Drag & Drop | react-dnd 16 |
| Backend | Node.js + Express 5 |
| БД | PostgreSQL + Drizzle ORM |
| Авторизация | JWT (bcryptjs + jsonwebtoken), домен @orney.ru |
| Экспорт | xlsx, jspdf, jspdf-autotable, papaparse |
| Безопасность | helmet, express-rate-limit, sanitize-html |

---

## Структура проекта

```
Analizator/
├── src/
│   ├── app/
│   │   ├── App.tsx                     # Главный компонент, роутинг по ролям
│   │   ├── pages/
│   │   │   ├── director/               # Вкладки дашборда директора (Figma)
│   │   │   │   ├── BudgetCalculatorEnhanced.tsx
│   │   │   │   ├── TerritoriesAnalytics.tsx
│   │   │   │   ├── EmployeesAnalytics.tsx
│   │   │   │   ├── ProductsAnalyticsWithEdit.tsx
│   │   │   │   └── TerritoryDetailCard.tsx
│   │   │   ├── admin/                  # Дашборд администратора (Figma)
│   │   │   │   ├── AdminDashboard.tsx  # Главный компонент (default export)
│   │   │   │   ├── DateManagement.tsx
│   │   │   │   ├── ProductsManagement.tsx
│   │   │   │   ├── TerritoriesManagement.tsx
│   │   │   │   └── YearsManagement.tsx
│   │   │   └── regional-manager/       # Дашборд рег. менеджера (Figma)
│   │   │       ├── RegionalManagerDashboard.tsx  # Главный (default export)
│   │   │       ├── ProductsTab.tsx
│   │   │       └── EmployeesTabNew.tsx
│   │   └── components/
│   │       ├── admin/                  # Старая панель администратора
│   │       │   └── AdminPanel.tsx
│   │       ├── common/
│   │       │   └── AppLayout.tsx       # Layout с WM шапкой (Figma)
│   │       ├── ai/
│   │       │   └── AIAnalyst.tsx       # AI аналитик (Figma)
│   │       ├── modals/                 # Модалки (Figma)
│   │       │   ├── EditModal.tsx
│   │       │   ├── ProductManagementModal.tsx
│   │       │   └── TerritoryManagementModal.tsx
│   │       ├── MPDetailModal.tsx       # Модалка медпреда (Figma)
│   │       ├── EditEmployeeModal.tsx   # Редактирование сотрудника (Figma)
│   │       ├── AddEmployeeModal.tsx    # Добавление сотрудника (Figma)
│   │       ├── wm-russia/              # Основной модуль аналитики
│   │       │   ├── WMRussiaApp.tsx     # Диспетчер: роутинг, activeSection, сайдбар
│   │       │   ├── WMRussiaSidebar.tsx # Боковая навигация (menuItemsByRole)
│   │       │   ├── dashboards/
│   │       │   │   ├── DirectorWMDashboard.tsx   # Дашборд директора (Figma)
│   │       │   │   ├── MedRepDashboard.tsx       # Дашборд медпреда (3 вкладки)
│   │       │   │   ├── TerritoryManagerDashboard.tsx # Дашборд ТМ (4 вкладки)
│   │       │   │   ├── AdminDashboard.tsx        # Старый (не используется)
│   │       │   │   └── RegionalManagerDashboard.tsx # Старый (не используется)
│   │       │   └── sales/
│   │       │       └── WMRussiaSalesTable.tsx
│   │       └── ui/                     # shadcn/ui компоненты (НЕ ТРОГАТЬ)
│   ├── contexts/                       # Контексты (Figma)
│   │   ├── AuthContext.tsx
│   │   ├── DateContext.tsx
│   │   └── NavigationContext.tsx
│   ├── context/
│   │   └── SharedDataContext.tsx       # Глобальный стейт MDLP
│   ├── data/
│   │   ├── wmRussiaData.ts            # MedRepData[], wmMockUsers (большой файл)
│   │   ├── salesData.ts               # PRODUCTS[], TERRITORIES[], getSalesData() (Figma)
│   │   ├── employees.ts              # EMPLOYEES[], getSubordinates() (Figma)
│   │   ├── federalDistricts.ts       # FEDERAL_DISTRICTS[] (Figma)
│   │   ├── organizationStructure.ts  # ORGANIZATION_STRUCTURE[] (Figma)
│   │   ├── yearsManager.ts           # Управление годами (Figma)
│   │   ├── productsManager.ts        # CRUD препаратов (Figma)
│   │   ├── districtsManager.ts       # CRUD районов (Figma)
│   │   ├── dataUploadManager.ts      # Трекинг загрузок (Figma)
│   │   ├── regionalPlansManager.ts   # Планы территорий (Figma)
│   │   └── index.ts
│   ├── types/
│   │   ├── index.ts                   # MedRepData, WMUser, WMUserRole и др.
│   │   ├── sales.types.ts            # Product, SalesData (Figma)
│   │   ├── product.types.ts          # ProductStats, ProductAnalytics (Figma)
│   │   └── user.types.ts             # User, Role, CreateUserDTO (Figma)
│   ├── utils/
│   │   ├── storage.ts                # STORAGE_KEYS, saveToStorage, loadFromStorage
│   │   ├── auth.ts                   # hashPassword, createUser, validateEmail (Figma)
│   │   ├── dateUtils.ts              # CURRENT_YEAR, MONTH_NAMES (Figma)
│   │   ├── fileParser.ts
│   │   └── formatters.ts
│   └── lib/
│       ├── api.ts                     # API-клиент
│       └── priceUtils.ts
├── server/
│   ├── index.ts                       # Express точка входа
│   ├── db.ts                          # PostgreSQL + circuit breaker
│   ├── adminRoutes.ts                 # Роуты администратора
│   └── middleware/                    # Express middleware
├── migrations/                        # Drizzle миграции (НЕ ТРОГАТЬ)
├── CLAUDE.md
└── package.json
```

---

## Роли пользователей

| Роль (WMUserRole) | Дашборд | Вкладки | Демо-аккаунт |
|---|---|---|---|
| `admin` | NewAdminDashboard | обзор, пользователи, препараты, территории, годы, данные, логи | admin@orney.ru |
| `director` | DirectorWMDashboard | дашборд, бюджет, продукты, территории, сотрудники, отчёты | director@orney.ru |
| `manager` | NewRegionalManagerDashboard | обзор, препараты, сотрудники | manager.pfo@orney.ru |
| `territory_manager` | TerritoryManagerDashboard | территория, команда, сравнение, KPI | tm.samara@orney.ru |
| `medrep` | MedRepDashboard | продажи, динамика, KPI | shestakova@orney.ru |

**Пароль всех демо-аккаунтов:** password123

Авторизация: JWT + bcryptjs. Сессия в localStorage (`wm_russia_user`).

### Навигация
- `WMRussiaSidebar` — боковая панель, пункты меню по ролям (`menuItemsByRole`)
- `WMRussiaApp` — диспетчер: управляет `activeSection`, передаёт его в дашборды
- Каждый дашборд маппит `activeSection` → внутренний `activeTab` через `useEffect` + `SECTION_MAP`

---

## Анализируемые препараты (12 штук)

Кокарнит, Артоксан (лиофилизат), Артоксан таблетки, Артоксан гель, Секнидокс, Клодифен Нейро, Драстоп Адванс, Орцепол ВМ, Лименда, Роноцит, Дорамитцин, Апфекто

---

## Территории

**Приволжский федеральный округ** — 14 регионов, 368 районов:
Башкортостан, Марий Эл, Мордовия, Татарстан, Удмуртия, Чувашия, Кировская обл., Нижегородская обл., Оренбургская обл., Пензенская обл., Пермский край, Самарская обл., Саратовская обл., Ульяновская обл.

---

## Функциональные модули (12 штук)

1. Загрузка файлов (Drag & Drop, CSV/Excel/JSON)
2. Дашборд (KPI, графики, топ-регионы)
3. Управление данными (планы, исторические данные)
4. Проблемные зоны (автоматическое выявление)
5. Сравнение периодов (YoY, кварталы, месяцы)
6. Территориальный анализ (heat map по регионам)
7. Детализация регионов (drill-down до районов)
8. ABC-анализ (классификация территорий и препаратов)
9. Сезонность (паттерны)
10. Прогнозирование (ML-прогнозы)
11. Контрагенты (анализ партнёров)
12. Отчёты (генерация + экспорт Excel/PDF)

---

## Дизайн

- **Стиль:** Футуристичный, glassmorphism, градиенты (стиль Захи Хадид)
- **Адаптивность:** Desktop + Tablet + Mobile (320px–1920px+)
- **Анимации:** Motion (Framer Motion)
- **Иконки:** Lucide React + MUI Icons
- **Шрифты:** Roboto (в src/fonts/)

---

## Правила и ограничения

### Не трогать без необходимости:
- `src/app/components/ui/` — shadcn/ui компоненты, менять только через конфиг
- `migrations/` — Drizzle миграции, не редактировать вручную
- `.replit_integration_files/` — интеграция Replit, не менять

### Осторожно:
- `server/db.ts` — подключение к БД с circuit breaker
- `server/index.ts` — точка входа сервера, много роутов
- `src/types/index.ts` — общие типы, изменения могут сломать всё
- `src/data/wmRussiaData.ts` — большой файл данных

### Требования к коду:
- TypeScript везде, без `any` где возможно
- Все пользовательские тексты на русском
- Комментарии к сложной логике на русском
- Без лишних зависимостей — проверяй что уже есть в package.json
- Не добавлять тёмную тему (не нужна)

---

## Переменные окружения

Файл `.env` (не коммитить):
```
DATABASE_URL=          # PostgreSQL connection string
JWT_SECRET=            # Секрет для JWT
OPENAI_API_KEY=        # Если нужен AI-анализ
```

---

## Команды разработки

```bash
# Запуск frontend (Vite dev server)
npm run dev

# Запуск backend сервера
npm run server

# Сборка для production
npm run build

# Предпросмотр production-сборки
npm run preview

# Применить миграции БД
npm run db:push

# Студия Drizzle (GUI для БД)
npm run db:studio

# Автосохранение прогресса (commit + push)
bash scripts/save-session.sh "описание изменений"
```

---

## Что уже сделано

- [x] Система авторизации (JWT, роли, демо-аккаунты)
- [x] 5 дашбордов по ролям — все перестроены по Figma Make прототипам
- [x] Навигация: sidebar ↔ вкладки дашбордов (useEffect + SECTION_MAP)
- [x] DirectorWMDashboard — 6 вкладок (Figma)
- [x] AdminDashboard — 7 вкладок (Figma)
- [x] RegionalManagerDashboard — 3 вкладки (Figma)
- [x] TerritoryManagerDashboard — 4 вкладки (расширен)
- [x] MedRepDashboard — 3 вкладки (продажи, динамика, KPI)
- [x] 12 аналитических модулей (MDLP)
- [x] Загрузка CSV/Excel файлов
- [x] Экспорт Excel/PDF/ZIP
- [x] PostgreSQL + Drizzle ORM (Timeweb Cloud, IP 45.8.96.5, база analizator2)
- [x] Адаптивный дизайн

## Что планируется

- [ ] Интеграция с реальным backend API (сейчас mock + localStorage)
- [ ] Деплой (платформа не выбрана)
- [ ] Экспорт PDF с кириллицей (проблема с шрифтами)
- [ ] Email-уведомления

---

## Figma Make источник

- URL: https://www.figma.com/make/YY45tJHeYBS3fvmLpQtdO7/Data-Analysis-Dashboard
- fileKey: YY45tJHeYBS3fvmLpQtdO7
- **Правило:** код из Figma брать один в один, не адаптировать. Создавать недостающие зависимости.

---

## Начало каждой сессии (ОБЯЗАТЕЛЬНО)

1. Прочитай `docs/LAST_SESSION.md` — что делали в прошлый раз, какие файлы менялись
2. Прочитай `docs/SESSION_LOG.md` — полная история сессий
3. Прочитай `docs/ERRORS_LOG.md` — известные ошибки, что НЕ делать
4. Проверь текущий статус в секции "Что сделано / что осталось" ниже

## В конце каждой сессии (ОБЯЗАТЕЛЬНО)

1. Обнови `docs/SESSION_LOG.md` — добавь запись о текущей сессии
2. Обнови `docs/ERRORS_LOG.md` — добавь новые ошибки если нашёл
3. Stop-хук автоматически запустит `scripts/save-session.sh` → git push

---

## Текущий статус проекта (обновлено 2026-03-19)

### Что сделано ✅

- [x] Система авторизации (JWT, роли, 5 демо-аккаунтов)
- [x] **Кабинет директора** — 6 вкладок, AppLayout (верхняя навигация), светлая тема, Figma-дизайн
  - Дашборд: KPI, графики, топ-регионы
  - Калькулятор бюджета
  - По препаратам (ProductsAnalyticsWithEdit)
  - По территориям (TerritoriesAnalytics)
  - Сотрудники (EmployeesAnalytics)
  - **Отчёты: 3-вкладочная навигация (Конструктор/Просмотр/Архив), реальные данные, Excel/CSV/PDF**
- [x] **Кабинет администратора** — 7 вкладок, CRUD пользователей
- [x] **Региональный менеджер** — 3 вкладки
- [x] **Территориальный менеджер** — 4 вкладки
- [x] **Медпред** — 3 вкладки (продажи, динамика, KPI)
- [x] Навигация sidebar ↔ вкладки (useEffect + SECTION_MAP) — все 5 кабинетов
- [x] Загрузка CSV/Excel файлов
- [x] Экспорт Excel (xlsx, 4 листа), CSV (papaparse + BOM), PDF (браузерная печать — кириллица ✓)
- [x] PostgreSQL + Drizzle ORM (Timeweb Cloud, IP 45.8.96.5, база analizator2)
- [x] Светлая тема везде, тёмная тема удалена

### Что осталось ⏳

- [ ] **Деплой** на VPS 85.193.86.69 (nginx + PM2 настроены, нужно залить билд)
- [ ] **Интеграция backend API** — сейчас mock + localStorage, нужно подключить PostgreSQL
- [ ] **Email-уведомления** — не реализованы

### Известные особенности

- PDF работает через браузерную печать (`Blob + URL.createObjectURL`), НЕ через jspdf
- Директор использует AppLayout (верхняя навигация), остальные роли — WMRussiaSidebar (боковая)
- WMRussiaApp.tsx — ранний возврат для `role === 'director'` (обходит сайдбар)
- `figma_auth_user` localStorage синхронизируется при входе через WMRussiaApp

---

## Автосохранение и документация

| Файл | Назначение |
|------|-----------|
| `docs/SESSION_LOG.md` | История всех сессий, что делали, что осталось |
| `docs/ERRORS_LOG.md` | Все ошибки и решения, правила "что НЕ делать" |
| `docs/LAST_SESSION.md` | Автоматически генерируется Stop-хуком — список изменённых файлов |
| `scripts/save-session.sh` | Обновляет LAST_SESSION.md + git add + commit + push |
| `.claude/settings.json` | Stop-хук: автоматически запускает save-session.sh |

**Stop-хук настроен:** при каждом завершении сессии Claude автоматически коммитит и пушит на GitHub.

---

## История сессий

### 2026-03-19
- Кабинет директора: светлая тема, AppLayout (верхняя навигация)
- ReportsTabLight: 3-вкладочная навигация (Конструктор/Просмотр/Архив)
- PDF экспорт через браузерную печать (кириллица работает)
- Реальная генерация данных из getSalesData()
- Настройка системы документирования (SESSION_LOG, ERRORS_LOG, LAST_SESSION)

### 2026-03-12 (сессия 3)
- Навигация sidebar → вкладки: исправлена во всех 5 кабинетах
- MedRepDashboard: 3 вкладки (продажи, динамика, KPI с radar-chart)
- TerritoryManagerDashboard расширен до 4 вкладок

### 2026-03-12 (сессия 2)
- AdminDashboard перестроен по Figma (7 вкладок, CRUD пользователей)
- RegionalManagerDashboard перестроен по Figma (3 вкладки)
- Создано ~30 файлов зависимостей Figma

### 2026-03-12 (сессия 1)
- Подключена БД Timeweb Cloud PostgreSQL
- Созданы 5 демо-аккаунтов
- Настроен Figma MCP
- DirectorWMDashboard перестроен по Figma

### 2026-03-05
- Настройка CLAUDE.md, автосохранения и журнала ошибок
