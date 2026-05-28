# 📛 Журнал ошибок — Анализатор МДЛП World Medicine

> **Инструкция для Claude:** Добавляй сюда каждую встреченную ошибку. Эти ошибки уже встречались — НЕ повторять.
> Формат: Дата | Файл/Область | Ошибка | Решение

---

## ⚠️ Top-10 ошибок которые повторяются чаще всего

| # | Признак | Корень | Что делать |
|---|---------|--------|-----------|
| 1 | `/api/auth/login` → `{"error":"Ошибка сервера"}` | Timeweb сбросил GRANT'ы на schema `world_medicine` | `ssh root@85.193.86.69 '/root/restore-grants.sh'` (cron восстановит сам через час) |
| 2 | Белый экран в Панели директора WM | `AppLayout` возвращает `null` потому что `useAuth().currentUser === null` (AuthProvider не смонтирован) | `AppLayout` читает user из `localStorage('mdlp_user')` как fallback — должно работать; если не работает, проверить ключи localStorage |
| 3 | Чанк-загрузка зависает на 0% или 502 | nginx `proxy_pass http://localhost:5000` резолвится в IPv6 `[::1]` | Заменить на `http://127.0.0.1:5000` |
| 4 | `Failed to load /api/tab/dashboard 500` | Drizzle ORM падает на `permission denied for schema` или несуществующих столбцах | См. ошибку #1 (GRANT'ы) или проверить схему таблицы vs Drizzle-схема в `shared/schema.ts` |
| 5 | Дашборд показывает нули в KPI | `SALES_DATA = []`, `setSalesDataFromMdlp` не сработал | Проверить что `SharedDataProvider.reloadFromServer()` вызывается; проверить что `mdlp_user` есть в localStorage |
| 6 | После смены юзера данные прежнего остались | `SharedDataProvider` не получил событие `user-changed` | App.tsx/WMRussiaApp должны диспатчить `window.dispatchEvent(new Event('user-changed'))` при login/logout |
| 7 | Имя пользователя/пароль сбрасывается в Timeweb после ручного "Изменить" | Сама панель Timeweb сбрасывает grants даже без явных действий | Запустить `/root/restore-grants.sh` |
| 8 | **15 000 записей МДЛП скипаются → SALES_DATA пуст** | `SharedDataContext.reloadFromServer` маппит `month: typeof r.month === 'number' ? r.month : undefined`. API отдаёт строку "Мар" → undefined → setSalesDataFromMdlp скипает | Использовать `toMonthNum(r.month)` из `@/utils/months` (поддерживает строки/числа) |
| 9 | **Белый экран при «Вернуться в МДЛП» (директор)** | Recharts падает с `T.startsWith is not a function` если получает невалидные данные | (a) `main.tsx` обёрнут в `ErrorBoundary` — fallback вместо белого экрана. (b) `onBackToMDLP` явно `navigateTo('upload')` + сброс WM-фильтров. (c) `ChartErrorBoundary` готов для оборачивания конкретных Recharts-блоков |
| 10 | **AuthContext.login всегда возвращает false** | Сервер отвечает плоско `{ id, name, role, token }`, AuthContext ждал `{ user, token }` | Парсить оба формата: `const u = data?.user ?? data` |

---

## 🆕 Активные проблемы (на 2026-05-28)

- **T.startsWith crash в Recharts** при возврате директора из «Панель директора» в «Анализатор МДЛП». ErrorBoundary защищает (юзер видит сообщение + «Перезагрузить страницу» кнопку), но **корень не найден**. Требуются sourcemaps + локальный dev для пошагового дебага. Все наши `.startsWith()` вызовы корректны (только `activeTab.startsWith('wm-')` на гарантированной строке). Подозрение: Recharts internal formatter получает число где ждёт строку — нужно обернуть конкретные Recharts блоки в `ChartErrorBoundary`.

---

## ✅ Решённые ошибки

### Безопасность (этапы 1-9, март-апрель 2026)

| Дата | Файл | Ошибка | Решение |
|------|------|--------|---------|
| 2026-03-19 | `AuthContext.tsx:50-62` | `login()` игнорирует пароль и выдаёт роль `director` любому email | Удалить клиентский «логин», использовать только `/api/auth/login` |
| 2026-03-19 | `App.tsx:1666-1681` | Fallback-логин через `wmMockUsers.find` без пароля | Выпилить mock-fallback, показать честную ошибку |
| 2026-03-19 | `utils/auth.ts:8-17` | `hashPassword` через `btoa` (обратим) | Удалить, пароли только на сервере через bcrypt |
| 2026-03-19 | `server/middleware/roleCheck.ts:25-27` | `requireRole` пропускал `director` к admin-API | Убрать auto-bypass, оставить только `admin` |
| 2026-03-19 | `server/index.ts:2397` | `req.user?.id` вместо `req.userId` — endpoint всегда 401 | Использовать `req.userId` (поле из JWT middleware) |
| 2026-03-19 | `App.tsx:860` | `localStorage.getItem('token')` (ключ не используется) | Заменить на `getAuthToken()` |
| 2026-03-19 | `App.tsx`, `api.ts`, `*Management.tsx` | Три ключа токена: `wm_auth_token`, `mdlp_auth_token`, `mdlp_token` | Унифицировать на `wm_auth_token`, чистить остальные при logout |
| 2026-03-19 | `ReportsTabLight.tsx:385` | XSS — `report.title`, `report.period` в HTML без escape | Добавить `escapeHtml()` для всех user-input полей |
| 2026-03-19 | `package.json:109` | `xlsx 0.18.5` — CVE Prototype Pollution + ReDoS | Установить `xlsx@0.20.3` с https://cdn.sheetjs.com/ |
| 2026-03-19 | `server/index.ts:224-225` | JSON limit 500MB на всех роутах — DoS-вектор | Снизить до 2MB, upload отдельно через multipart |
| 2026-03-19 | `server/index.ts:441-452` | `/api/db-reset` без `requireAdmin` | Добавить middleware |
| 2026-03-19 | `server/index.ts:617` | `console.log(resetToken + email)` — утечка в логах PM2 | Удалить лог |
| 2026-03-19 | `server/index.ts:144-158` | CSP с `unsafe-eval` | Убрать `unsafe-eval` из `scriptSrc` |
| 2026-03-19 | `server/index.ts:524-548` | Валидация email через `.includes('@')`, роль без whitelist | `zod` с enum для роли |
| 2026-03-19 | `server/tabDataRoutes.ts:753` | `globalDisposalRatio = 1.0` при пустых данных (фильтр не работает) | Менять на `0` — фильтр действительно отсекает всё |
| 2026-03-19 | `server/db.ts:71,95` | `rejectUnauthorized: false` — MITM-вектор | Через `PG_CA_CERT_PATH` env с CA cert |
| 2026-03-19 | `adminRoutes.ts:46,72` vs `index.ts:540` | bcrypt rounds 10 в одних местах, 12 в других | Везде cost=12 |
| 2026-03-19 | `App.tsx:813`, `WMRussiaApp.tsx:120` | `JSON.parse(localStorage)` без try/catch — крашит при битом ключе | Обернуть в try/catch с `localStorage.removeItem` при ошибке |
| 2026-03-19 | `server/index.ts:142` | JWT TTL 7 дней без revocation | Снизить до 24h + `jti` blacklist на logout |

### БД (Timeweb managed PG)

| Дата | Область | Ошибка | Решение |
|------|---------|--------|---------|
| 2026-04-21 | gen_user | `password authentication failed` — Timeweb сбросил пароль | Пользователь сгенерировал новый через панель → обновить `.env` |
| 2026-04-21 | world_medicine | `permission denied for schema` после смены пароля | GRANT'ы слетают вместе со сменой пароля. Выдать заново: `GRANT USAGE, CREATE ON SCHEMA world_medicine TO gen_user; GRANT ALL ON ALL TABLES IN SCHEMA world_medicine TO gen_user;` и т.д. |
| 2026-04-22 | drug_prices | `relation "world_medicine.drug_prices" does not exist` — таблица не создавалась | `CREATE TABLE world_medicine.drug_prices (id SERIAL PK, drug_pattern, drug_label, price_per_unit NUMERIC, created_at, updated_at)` |
| 2026-04-22 | saved_reports | Drizzle ORM 500: `column "name" does not exist` — реальная схема имела `title, report_type` | `DROP TABLE + CREATE TABLE` с Drizzle-схемой (`name, type, filters, data, created_at`). 0 строк было, безопасно. |
| 2026-04-22 | budget_scenarios | Drizzle 500: 5 столбцов отсутствуют в БД | `DROP + CREATE` с правильной схемой: добавить `current_budget, growth_percent, target_budget, drugs, district_shares, updated_at` |
| 2026-05-03 | gen_user | GRANT'ы слетают ~раз в 10 дней без явных действий | Cron `/root/restore-grants.sh` каждый час: проверка + восстановление + pm2 restart |

### API routing

| Дата | Файл | Ошибка | Решение |
|------|------|--------|---------|
| 2026-04-22 | `DirectorWMDashboard.tsx:489-501` | Все `/api/dashboard`, `/api/metadata`, `/api/wm-dashboard`, `/api/wm-products` → 404 | В server смонтированы как `/api/tab/*` — добавить префикс в frontend `fetch` |
| 2026-03-22 | `App.tsx` | Прогресс upload-чанка не двигается | `fetch` не даёт upload-progress — переписать на `XMLHttpRequest` с `xhr.upload.onprogress` |
| 2026-03-22 | nginx | Чанк уходит на сервер но ответа нет | `proxy_pass http://localhost:5000` резолвится в IPv6 `[::1]`; Node слушает только IPv4. Заменить на `127.0.0.1:5000` |

### Архитектура и данные

| Дата | Файл | Ошибка | Решение |
|------|------|--------|---------|
| 2026-04-22 | `src/data/salesData.ts` | `getSalesData()`, `getTotalStats()` etc. возвращают нули — `SALES_DATA = []` mock | Сделать `SALES_DATA` массивом который заполняется из MDLP через `setSalesDataFromMdlp()`, вызывать из `SharedDataProvider.reloadFromServer()` |
| 2026-04-22 | `SharedDataProvider` | Не обновлялся при login/logout — оставались данные прежнего юзера | Подписаться на `user-changed` событие, очищать `mdlp_data`, `wm_russia_data` и `SALES_DATA` |
| 2026-04-22 | `AppLayout.tsx:64` | `if (!currentUser) return null` → белый экран. `useAuth()` возвращал null т.к. `AuthProvider` не смонтирован | Читать user из `localStorage('mdlp_user' / 'wm_russia_user')` как fallback |
| 2026-04-22 | App.tsx, WMRussiaApp.tsx | Дублирующий рендер `DirectorWMDashboard` (один через early return, второй через switch) | Оставить только early return, в switch case `'director'` → `return null` |
| 2026-04-22 | `WMRussiaApp.tsx:234` | `handleRoleSwitch` — mock-переключение ролей через `wmMockUsers` | Удалить функцию, каждый пользователь видит только свою роль |
| 2026-04-22 | `ReportsTabLight.tsx:120` | `MOCK_SAVED_REPORTS` (5 фейковых отчётов) показывались всем | Заменить на `useEffect` который загружает `/api/reports/:userId` с сервера |

### TypeScript / Build

| Дата | Файл | Ошибка | Решение |
|------|------|--------|---------|
| 2026-03-12 | `storage.ts` | `loadFromStorage` требует 2 аргумента | Всегда передавать `defaultValue` |
| 2026-03-12 | `sales.types.ts` | `pricePerUnit` → `price`, `fullName` → `name` | Figma-поля != наши поля |
| 2026-03-12 | `sales.types.ts` | `budget2025` не существует в Product | Добавили `budget2025?: number` |
| 2026-03-19 | `WMRussiaApp.tsx` | TS2367: `role === 'director'` невозможно после early return | Удалить условие в header (тип сужается) |
| 2026-04-22 | `wmRussiaData.ts` | `Unexpected end of file` после удаления mock-секций sed'ом | Восстановить из git и использовать корректный диапазон строк |
| 2026-04-22 | `fileProcessor.ts:67`, `sqlAggregator.ts:15,798` | TS1117: дубликаты ключей `'10','11','12'` в MONTH_MAP | Удалить дубликаты (значения одинаковые — overwrite) |

### Навигация и UX

| Дата | Область | Ошибка | Решение |
|------|---------|--------|---------|
| 2026-03-12 | Все дашборды | Сайдбар не переключал вкладки | `useEffect` + `SECTION_MAP` в каждом дашборде |
| 2026-04-22 | AppLayout (директор) | Клик по логотипу ничего не делает | Logo принимает `onClick` проп — `DirectorWMDashboard` передаёт `() => setActiveTab('dashboard')` |
| 2026-04-22 | WMRussiaSidebar | Клик по логотипу в сайдбаре не работает | Обернуть в `<button onClick>` который вызывает `onNavigate(menuItems[0].id)` |
| 2026-04-22 | Manager sidebar | 6 пунктов меню, но 3 ведут в одну вкладку `overview` | Удалить дублирующие пункты `territories`, `district-kpi`, `reports` |
| 2026-04-22 | AdminDashboard | Модалка создания пользователя не закрывается после успеха | `setTimeout(() => setShowAddUser(false), 8000)` после success — даёт время скопировать пароль |

### PDF / Экспорт

| Дата | Область | Ошибка | Решение |
|------|---------|--------|---------|
| 2026-03-19 | ReportsTabLight | jspdf не поддерживает кириллицу | Заменить на браузерную печать: `Blob + URL.createObjectURL + window.open` |

### Деплой

| Дата | Область | Ошибка | Решение |
|------|---------|--------|---------|
| 2026-03-12 | Vercel | Кириллица в пути (`Проекты/Analizator`) | Не использовать Vercel, перейти на VPS |
| 2026-03-22 | nginx | 502 после deploy | Подождать 5-10 сек на старт Node + БД-пул |

### Figma MCP

| Дата | Область | Ошибка | Решение |
|------|---------|--------|---------|
| 2026-03-12 | Figma MCP | `get_metadata` не работает для Make-файлов | Использовать `get_design_context` на node `0:1` |
| 2026-03-12 | Subagents | Background агенты не имеют доступа к Figma MCP | Читать Figma в основном контексте, передавать контент инлайн |

---

## 📌 Правила (что НЕ делать)

См. полный список в `docs/RULES.md`. Ключевые:

1. **НЕ адаптировать код из Figma** — брать один в один, создавать недостающие зависимости
2. **НЕ возвращать mock-fallback при ошибке логина** — пользователь должен видеть честную ошибку
3. **НЕ использовать `localhost` в nginx `proxy_pass`** — только `127.0.0.1` (IPv6 ловушка)
4. **НЕ использовать `jspdf`** для кириллицы — только браузерная печать
5. **НЕ запускать background-агентов для Figma MCP** — только основной контекст
6. **НЕ пушить/деплоить** без явной просьбы пользователя
7. **НЕ добавлять тёмную тему** — проект только светлый
8. **НЕ хранить mock-данные продаж** — только через `SharedDataProvider` из БД
9. **НЕ забывать `user_id` фильтр** в SQL — изоляция per-user
10. **НЕ выдавать JWT без `jti`** — нужен для blacklist
