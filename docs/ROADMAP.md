# 🎯 Roadmap — Анализатор продаж МДЛП (World Medicine)

> Обновлено 2026-05-03. Документ описывает цель проекта, текущее состояние и план развития. Читать в начале каждой сессии вместе с `CLAUDE.md` и `docs/ERRORS_LOG.md`.

---

## 🚀 Цель проекта

Корпоративное SaaS-приложение для аналитики продаж лекарственных препаратов World Medicine по системе **МДЛП** (Мониторинг Движения Лекарственных Препаратов).

### Бизнес-задача
- Директор и менеджеры компании World Medicine получают **визуализацию реальных продаж** из выгрузок МДЛП (CSV/Excel) с детализацией:
  - **География:** Приволжский ФО → 14 регионов → 368 районов
  - **Препараты:** 12 продуктов (Кокарнит, Артоксан, Секнидокс и др.)
  - **Время:** годы / месяцы / недели
  - **Сотрудники:** региональные менеджеры → территориальные менеджеры → медицинские представители
- 5 ролей с разным уровнем доступа: `director`, `admin`, `manager`, `territory_manager`, `medrep`
- Каждый пользователь видит ТОЛЬКО свои загруженные данные (изоляция per-user через `user_id` + JWT)

### Куда идём
1. **Полноценный single-source-of-truth** — все панели и графики работают от одних реальных данных, без рассинхронизации mock vs API
2. **Готовность к продакшен-нагрузкам** — реальные файлы 500MB+, тысячи строк, корректный chunked upload
3. **Безопасность** — JWT с TTL+blacklist, изоляция данных, защита от XSS/SQLi, CSP
4. **Стабильная инфраструктура** — VPS + managed PG + автоматические восстановления при сбоях

---

## ✅ Что готово (закрыто за сессии март-май 2026)

### Май 2026 — большой марафон (планы РМ, иерархия, фильтры)
- [x] **Полный цикл «План РМ → Директор»**: БД таблица `regional_plans`, API endpoints, UI РМ (вкладка «Планы» с Excel импорт/экспорт), UI Директор (`DirectorPlansSummary` + кнопка «↓ Из планов РМ» в калькуляторе)
- [x] **107 реальных сотрудников** из `сотрудники.xlsx` (CRM): 2 директора, 8 РМ, 15 ТМ, 82 МП; 14 CRM-групп (Moscow 1/2, CFD/NCFD/NWD Samadova/Bunytov, **PFO Samadova/Nechaeva/Orudjov/Sonin**, SFD/SibFD/UFD)
- [x] **Иерархический view сотрудников**: `EmployeesManagement` (admin) и `EmployeesAnalyticsLive` (director) — группировка по CRM-группе, отступы РМ→ТМ→МП
- [x] **Combined sidebar для admin**: единый sidebar в обоих режимах (MDLP + WM Russia) с 3 группами **АНАЛИТИКА / УПРАВЛЕНИЕ / СИСТЕМА**
- [x] **Глобальные фильтры**: multi-select по месяцам (12 чекбоксов) + toggle Рубли/Упаковки. Реактивно влияет на все 6 вкладок директора и manager dashboard
- [x] **Revenue из drug_prices** с fallback на хардкод PRODUCTS.price (когда `amount=0` в МДЛП)
- [x] **Индексация SALES_DATA** — фильтр срабатывает за 9 мс на 313K записях (O(1) lookup)
- [x] **14 регионов ПФО** в `federalDistricts.ts` и `TERRITORIES` (раньше было 6, остальные данные терялись)
- [x] **Auto-routing director** в свою панель сразу после login (без лишнего клика)
- [x] **AuthContext.login** починен (раньше всегда false)
- [x] **ErrorBoundary** в main.tsx (защита от любого crash) + `ChartErrorBoundary` для Recharts блоков
- [x] **Динамичные периоды отчётов** (текущий месяц/квартал/год вместо хардкода 2024/2025/2026)
- [x] **Скрытие фейкового «Рост 0%»** когда нет данных за прошлый год
- [x] Фикс «Вернуться в МДЛП» белый экран (safe target navigateTo + WM-filter reset)
- [x] mojibake «Выпо��нение» → «Выполнение»
- [x] DbStatsPanel в админке с реальными данными `/api/database/stats`
- [x] Восстановлены admin пункты (system-settings, upload, db-stats)
- [x] ErrorToast компонент + `emitAppError()` хелпер

### Архитектура и единый источник данных
- [x] `SharedDataProvider` — единый провайдер данных для всех ролей
- [x] События `mdlp-data-updated` (после загрузки) и `user-changed` (login/logout) для авто-обновления всех панелей
- [x] `setSalesDataFromMdlp()` — реальные данные из БД попадают в `SALES_DATA`, графики работают
- [x] Изоляция per-user: каждая строка в `raw_sales_rows`, `yearly_sales_data`, `compact_rows` имеет `user_id`
- [x] Серверная фильтрация по `req.userId` из JWT — данные одного юзера не видны другому

### 5 кабинетов работают
- [x] Директор (`DirectorWMDashboard`) — 6 вкладок (Дашборд / Бюджет / Препараты / Территории / Сотрудники / Отчёты)
- [x] Админ (`pages/admin/AdminDashboard`) — 7 вкладок, CRUD пользователей через `/api/users`
- [x] Региональный менеджер — 3 вкладки (после очистки дублирующих пунктов)
- [x] Территориальный менеджер — 4 вкладки
- [x] Медпред — 3 вкладки

### Загрузка файлов
- [x] Chunked upload (20MB чанки) с прогрессом через XHR (`fetch` не даёт прогресса)
- [x] Поддержка файлов до 5GB
- [x] Автоочистка зависших `processing` записей старше 15 минут
- [x] `/api/files/reset-stuck` — ручной сброс зависших загрузок
- [x] nginx настроен на IPv4 (`127.0.0.1:5000` вместо `localhost` — иначе IPv6-ловушка)

### Безопасность (этапы 1-9)
- [x] `xlsx 0.20.3` (CVE Prototype Pollution + ReDoS закрыты)
- [x] `bcrypt` cost=12 везде
- [x] JWT TTL 24h + `jti` blacklist на `/api/auth/logout`
- [x] `requireAdmin` на `/api/db-reset`, owner-check на `/api/files/status` и `/api/files/jobs`
- [x] `zod`-валидация на `/api/users` (роли через enum)
- [x] Body limit 2MB (chunked upload отдельно через multipart)
- [x] HTML-escape в PDF-отчётах
- [x] PG TLS `rejectUnauthorized: true` через `PG_CA_CERT_PATH`
- [x] `trust proxy` gated по `NODE_ENV === production`
- [x] CSP без `unsafe-eval`
- [x] Удалён mock-fallback логина в App.tsx и `AuthContext`
- [x] Унифицирован ключ JWT в localStorage (`wm_auth_token`)
- [x] director НЕ получает admin-права (убран auto-bypass в `requireRole`)

### Бизнес-логика данных
- [x] Строгое равенство имени препарата в фильтрах (не `includes`)
- [x] Неделя 5 (день 29-31) свёрнута в неделю 4 — сравнения неделя-к-неделе работают
- [x] `COALESCE(quantity, amount)` вместо `COALESCE(amount, quantity)` — метрика всегда упаковки
- [x] Добавлены отдельные поля `salesQuantity` и `salesAmount` в API (для будущего переключателя)
- [x] `globalDisposalRatio = 0` (не `1.0`) при пустых данных

### Очистка mock-кода (~4500 строк удалено)
- [x] Старая панель `components/director/DirectorDashboard.tsx` + 5 tabs (~4000 строк)
- [x] Кнопка «Аналитика директора» из сайдбара
- [x] `handleRoleSwitch` (mock-переключение ролей)
- [x] `MOCK_SAVED_REPORTS` → реальные из `/api/reports/:userId`
- [x] `generateSalesData()` — мёртвый генератор
- [x] `pfoSalesData`, `cfoSalesData` — захардкоженные данные октября 2025
- [x] `wmMockUsers.find()` в App.tsx — теперь WMUser строится из реального currentUser
- [x] Дублирующая `components/wm-russia/dashboards/AdminDashboard.tsx`

### Навигация
- [x] Клик по логотипу → главная (`AppLayout` и `WMRussiaSidebar`)
- [x] Manager sidebar — убраны 3 пункта-дубля (territories, district-kpi, reports — все вели в overview)
- [x] Auto-close модалки создания пользователя через 8 сек после успеха

### Деплой и инфраструктура
- [x] VPS 85.193.86.69 (Ubuntu 24.04), nginx + PM2
- [x] Timeweb managed PostgreSQL (`analizator2`, `gen_user`)
- [x] Stop-hook автокоммитит каждую сессию и пушит в main
- [x] PG TLS через CA cert `/root/.cloud-certs/root.crt`
- [x] **Cron `/root/restore-grants.sh`** — автовосстановление GRANT'ов которые Timeweb периодически сбрасывает (~раз в 10 дней). Раз в час проверка. См. `memory/ops_timeweb_grants.md`.

### Backend
- [x] PostgreSQL + Drizzle ORM
- [x] Таблицы: `users`, `raw_sales_rows`, `yearly_sales_data`, `compact_rows`, `contragents`, `drugs`, `drug_prices`, `saved_reports`, `budget_scenarios`, `upload_history`, `population_data`, `employees_data`, `products`, `federal_districts`, `territories`, `sales_rep_territories`, `saved_plans`, `password_reset_tokens`
- [x] In-memory кэш per-user в `tabDataRoutes.ts` с инвалидацией после upload

---

## 📋 Что осталось сделать

### Приоритет 1 — Критичные баги
- [ ] **Найти источник `T.startsWith` crash в Recharts** при возврате директора в МДЛП. ErrorBoundary защищает (юзер видит fallback), но крах остаётся. Нужны sourcemaps + локальный dev. Обернуть конкретные `<ResponsiveContainer>` в `ChartErrorBoundary` (компонент готов в `src/app/components/common/ChartErrorBoundary.tsx`)

### Приоритет 2 — UX/Данные (улучшения)
- [ ] **Реальные бюджеты ПФО** в `federalDistricts.ts` (сейчас мои оценки для 8 новых регионов: Марий Эл 30K, Удмуртия 50K, Чувашия 40K, Киров 45K, Оренбург 55K, Пермский край 75K, Саратов 60K, Ульяновск 40K)
- [ ] Удалить старый mock-файл `src/data/employees.ts` (заменён `/api/admin/employees` + БД)
- [ ] `getMonthlyDynamics()` хардкодит years 2024/2025/2026 — сделать динамическим
- [ ] Снизить шум `/api/health` polling (сейчас 30s, нормально, но 60+ запросов в сессии)

### Приоритет 3 — Завершить фичу «Планы РМ»
- [x] БД таблица + 3 API endpoint'а (GET/POST bulk/DELETE)
- [x] UI РМ — вкладка «Планы» с Excel импорт/экспорт
- [x] UI Директор — сводный view в калькуляторе бюджета
- [x] Кнопка «↓ Из планов РМ» в RussiaCalculator
- [ ] **Drill-down планов в `<По территориям>`** — показать план vs факт по регионам ПФО

### Приоритет 4 — Тех долг (постепенно, по 1 за PR)
- [ ] `strictNullChecks: true` в `tsconfig.json` — сейчас даёт 228 ошибок, чинить инкрементально по директориям (server → lib → app)
- [ ] Убрать `any` (273 места в `src/`) — создать типы для API-ответов
- [ ] Стабильные React keys вместо `key={i}` (75 мест) — ломает state при сортировке/удалении
- [ ] Money в копейках (`BIGINT`) вместо `NUMERIC(15,2)` + `parseFloat` — теряет копейки
- [ ] `setInterval`/`setTimeout` cleanup на unmount (App.tsx:2085,2159)

### Приоритет 3 — Архитектурные доработки
- [ ] **Refresh JWT-токены** + persistent blacklist (сейчас blacklist в памяти, теряется при PM2 restart)
- [ ] **managerRegions enforcement на сервере** — добавить таблицу `user_regions` или колонку `assigned_regions TEXT[]` в `users`. Сейчас клиент передаёт `managerRegions` через query (но серверная фильтрация по userId есть, так что данные защищены).
- [ ] **ISO-неделя через `EXTRACT(WEEK FROM document_date)`** — нужна schema migration: добавить `document_date DATE` в `raw_sales_rows` и переобработать существующие загрузки
- [ ] **Полное разделение `salesAmount` / `salesQuantity` в UI** — переключатель «рубли / упаковки», сейчас новые поля есть в API но UI всегда показывает quantity

### Приоритет 4 — Фичи продакшена
- [ ] Email-уведомления (загрузка завершена, отчёт сгенерирован, восстановление пароля)
- [ ] PDF-экспорт улучшить (сейчас браузерная печать — кириллица работает, но нет автоматизации)
- [ ] Шаблоны отчётов (директор сохраняет конфигурацию → потом одним кликом генерирует)
- [ ] Расписание автоотчётов (раз в неделю/месяц)

### Приоритет 5 — Безопасность (advanced)
- [ ] WAF / DDoS-защита через Cloudflare или аналог
- [ ] 2FA для admin и director
- [ ] Audit-лог критичных действий (создание/удаление юзеров, экспорт данных)
- [ ] Регулярные penetration tests

---

## 🚫 Что НЕ делать (см. `docs/RULES.md`)

Полный список правил в `docs/RULES.md`. Ключевые:
- Не адаптировать код из Figma — брать один в один
- Не использовать `jspdf` для кириллицы — только браузерная печать
- Не делать пуш/деплой без явной просьбы
- Не добавлять тёмную тему — проект только светлый
- Не использовать `localhost` в nginx `proxy_pass` (IPv6 ловушка) — только `127.0.0.1`
- Не вызывать `setMdlpData` напрямую с mock-данными — единственный путь через `SharedDataProvider.reloadFromServer()`

---

## 📚 Связанные документы

- `CLAUDE.md` — главная инструкция, читать первой
- `docs/ERRORS_LOG.md` — журнал ошибок с уроками
- `docs/RULES.md` — правила работы с проектом
- `docs/SESSION_LOG.md` — история сессий
- `docs/LAST_SESSION.md` — автоматически генерируется stop-hook'ом
- `memory/` — частная память Claude (per-project), не в git
