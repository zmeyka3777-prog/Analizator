# Журнал сессий — Анализатор МДЛП World Medicine

> **Инструкция для Claude:** В начале каждой сессии прочитай этот файл и `docs/LAST_SESSION.md`.
> В конце каждой сессии **обязательно** обнови секцию "Последняя сессия" и добавь запись сюда.

---

## Сессия 2026-07-18 (каталог из БД — админка управляет аналитикой)

- **PRODUCTS/TERRITORIES из БД в аналитику — сделано и проверено вживую (Playwright)**:
  - Таблицы products/federal_districts/territories были ПУСТЫЕ. Добавлен seed при старте сервера ([server/catalogSeed.ts](server/catalogSeed.ts), автоген из статических каталогов): 12 препаратов, 8 округов, 56 территорий.
  - В БД жила пустая legacy-таблица territories (integer id, population, без district_id) — при старте переименовывается в territories_legacy (только если пустая), создаётся каталожная схема.
  - Клиент: syncCatalogsFromDb в SharedDataContext.reloadFromServer — мутирует PRODUCTS/FEDERAL_DISTRICTS in-place ДО пересчёта revenue; totalBudget2025 округов пересчитывается.
  - Админка: сохранение препарата/территории диспатчит mdlp-data-updated → полный пересчёт.
  - **Проверка вживую**: цена COCARNIT 740→1000 через API → выручка на «По препаратам» пересчиталась 8 009 760 ₽ → 10 824 000 ₽ (10 824 упак × 1000). Цена возвращена (740).
- «Выполнение плана» на дашборде директора теперь от реальных планов РМ — при тестовом плане 100 упак даёт огромный %, это данные, не баг.
- Деплой #4.

---

## Сессия 2026-07-11, продолжение (деплой + «фейки → реальные функции»)

### Принцип от пользователя: НЕ удалять фейк-блоки — делать функции реальными.

### Сделано (tsc чист; audit-log проверен end-to-end)
- **ДЕПЛОЙ #1 на VPS выполнен** (git pull + npm run build + pm2 restart) — прод 200, login работает.
- **Сценарии калькулятора → БД**: `saveScenario` POST `/api/budget-scenarios` + загрузка списка при монтировании; `window.location.reload()` убран (раньше стирал всё введённое).
- **Drill-down территории (TerritoryDetailCard) переписан**: план из реального `regional_plans` (useRegionalPlans), «план не задан» вместо `quota×1.18`, дин. годы, реактивность на месяцы/загрузку; мок `regionalPlansManager.ts` удалён (не использовался больше нигде); редактирование цены в мок убрано — цены централизованы.
- **Список менеджеров MDLP**: реальные РМ из CRM (`/api/admin/employees`) merge в `managerTerritories`; хардкод — fallback для ролей без доступа.
- **«История операций» (Экспорт/Импорт) СДЕЛАНА РЕАЛЬНОЙ**: последние загрузки из `upload_history` с настоящими статусами/строками вместо трёх фейк-записей.
- **audit_log РЕАЛЬНЫЙ end-to-end**: таблица создаётся в db.ts init (её не было в БД!); `logAudit` хелпер в adminRoutes; события: вход в систему, create/update/delete пользователей/сотрудников/препаратов/округов/территорий, изменение цены, очистка данных. «Журнал активности» админа читает `/api/admin/audit-log` (была одна фейк-запись). Проверено: login записался и читается.
- **Вкладка «Годы» админа достижима**: пункт в AdminCombinedSidebar + WMRussiaSidebar + маппинг `years-management → years`.
- **6/9 отчётов MDLP теперь фильтруются**: единый `rowMatchesFilters` (препараты/регионы/годы/ФО/типы выбытия/группы/менеджеры/глобальные месяцы) применён ко всем отчётам из сырых строк (8 замен rawParsedRows → reportRows).

### Деплой #2 — все изменения этой сессии.

---

## Сессия 2026-07-11 (закрытие нерешённых находок аудита: MDLP-фильтры, безопасность, риски)

### Сделано (tsc чист по всем изменённым файлам)
- **MDLP: метрика Рубли/Упаковки заработала** — `isMoney` был захардкожен в `false`, весь рублёвый код-путь графиков мёртвый. Привязал к `useGlobalFilters().metric`, починил `toRubles` (был no-op → теперь `×rublesRatio`). [App.tsx](src/app/App.tsx).
- **MDLP: глобальный фильтр месяцев доходит до сервера** — клиент шлёт `months` (короткие RU), сервер (`parseFilters`/`applyFilters`/`hasActiveFilters`) фильтрует. ВАЖНО: месяцы СПЕЦИАЛЬНО не форсят загрузку 313K compact rows (упирается в statement_timeout → роняет дашборд); фильтруются дешёвые month-гранулярные структуры (`monthlySales`/`combinedData`). Проверено API: Март→32037, Янв+Фев→232548, 1.6с. [tabDataRoutes.ts](server/tabDataRoutes.ts).
- **MDLP: мёртвый фильтр «Период»** (Год/Квартал/Месяц/Неделя) убран из топбара — никуда не передавался. Строка активных фильтров теперь показывает реальные ФО/регионы/менеджеров. Фильтр «Года» — из `availableYears`.
- **Директор: динамические года графика** — `getMonthlyDynamicsDynamic` + `chartYears=[y-2,y-1,y]`, серии/легенды/заголовок из переменных (1 января не ломается). `generateAIForecast` не тронут (отдельная находка).
- **Директор: «Выполнение плана»** из реальных планов РМ (`useRegionalPlans`, упаковки) вместо хардкода `BUDGET_PFO_2025` 580М. Нет планов → «— план не задан».
- **Безопасность сервера:** `/api/sales` (legacy, без изоляции, клиентом не используется) → `requireAdmin`; отдельный `aiLimiter` 10/мин на `/api/analytics/generate-comment`; валидация роли по списку в `PUT /api/admin/users/:id`.
- **Риск «протухший JWT → пустой сайт»:** `fetchApi` на 401 шлёт событие `auth-expired`, App.tsx выкидывает на форму входа.
- **Админ:** confirm-диалоги + toast об ошибке на все 4 удаления (пользователь/сотрудник/препарат/территория).

### Осталось (документировано в ROADMAP → «План развития»)
6/9 отчётов MDLP без фильтров; список менеджеров в фильтре захардкожен; сценарии калькулятора не в БД; drill-down территорий из мока; MP/TM попродуктовый фильтр месяцев; PRODUCTS/TERRITORIES статические; audit_log фейк; вкладка «Годы» админа недостижима; фейк-«История операций».

### Пред-существующий тех-долг (НЕ из этой сессии, tsc)
`jwt.sign` expiresIn overload (index.ts), zod `errorMap` (validation.ts), `Role` в AppLayout, `unknown`-типы в App.tsx wm-вкладках. Сервер на tsx (runtime), typecheck не блокирует запуск.

---

## Сессия 2026-07-09/10 (аудит всего сайта + единый источник загрузки + де-мок)

### Что сделано и проверено вживую (Playwright)
- **🔴 T.startsWith crash РЕШЁН** (корень найден sourcemaps): `onClick={onBackToMDLP}` передавал MouseEvent в `navigateTo` → `activeTab` становился объектом → `activeTab.startsWith` падал. Фикс: `onClick={() => onBackToMDLP()}` в 4 местах (DirectorWMDashboard, WMRussiaApp ×2, WMRussiaSidebar) + typeof-guard в App.tsx onBackToMDLP. Возврат директора в МДЛП больше не белый экран.
- **Калькулятор бюджета**: `totalRevenue * 1000` завышал выручку в 1000× ([BudgetCalculatorEnhanced.tsx:746,752](src/app/pages/director/BudgetCalculatorEnhanced.tsx)) — убрано. + CSV `\\n`→`\n`, sort-мутация state → `[...arr].sort()`.
- **Переключатель Рубли/Упаковки на дашборде директора** заработал (metric из useGlobalFilters). KPI «Продажи 2027» больше не «0 ₽ / +-100.0%» → «— нет данных».
- **Мёртвые кнопки «Экспорт»** (TerritoriesAnalytics, ProductsAnalyticsWithEdit) → реальный CSV. KPI «Препаратов» вёл на несуществующую вкладку 'drugs' → 'abc'.
- **IDOR budget-scenarios** (server/index.ts): GET/POST/PUT брали userId из URL/body без сверки с JWT → любой мог читать/писать чужие сценарии. Фикс: userId только из JWT + owner-check в PUT (как в DELETE). Проверено 5/5 API-тестами.
- **Единый источник загрузки для всех ролей**: пункт «⬆️ Загрузка данных» в сайдбар medrep/TM/manager → тот же MDLP-экран загрузки (per-user), возврат кнопкой «Мой округ/динамика». Проверено вживую (medrep round-trip).
- **Де-мок планов**: убран `факт×1.1` в [SharedDataContext.tsx](src/context/SharedDataContext.tsx) (medrep/TM → «план не задан»); RM Overview+Products → реальный `regional_plans` через новый хук [useRegionalPlans.ts](src/hooks/useRegionalPlans.ts). Проверено вживую (RM: «План: 100» реальный, «—» где нет).
- **Де-мок medrep**: реальная помесячная динамика из `monthlyFact` (было размазывание по весам), убран фейк-рейтинг `position:1`, текст empty-state «загрузите сами» вместо «администратором/директором».
- Пароль БД обновлён в .env (POSTGRESQL_PASSWORD), старый вычищен из файлов памяти.

### Продолжение 2026-07-11 (Фаза 3-4 + директорские medium — ВСЁ СДЕЛАНО, проверено вживую)
- **Фаза 3 — сотрудники РМ**: [EmployeesTabNew.tsx](src/app/pages/regional-manager/EmployeesTabNew.tsx) переписан на `/api/admin/employees` — PFO-группы CRM с иерархией РМ→ТМ→МП, поиск, «продажи в регионах» сотрудника из реальной выгрузки (реактивно на wmRussiaData + месяцы). Проверено вживую: 34 сотрудника ПФО, 5 ТМ, 28 МП, 3 группы — реальные (Кузнецова/Малина/Парфенова из CRM). RM employeeCount тоже на API.
- **Удалены 5 мёртвых mock-файлов**: `data/employees.ts`, `MPDetailModal.tsx`, `EditEmployeeModal.tsx`, `AddEmployeeModal.tsx`, старый `pages/director/EmployeesAnalytics.tsx` (сломанные TODO-модалки ушли вместе с ними; управление сотрудниками — в админке).
- **Фаза 4 — ТМ**: 6 лейблов «медпредставители» → «регионы» (заголовок, план по регионам, сравнение, «Регионы территории», рейтинг, «Лучший регион»). У ТМ без данных — честный empty-state с подсказкой «⬆️ Загрузка данных» (проверено вживую).
- **Директор, препараты**: draft/published рассинхрон — `handleSaveProduct/handleDeleteProduct` теперь вызывают `publishProductsDraft()` → правка видна сразу.
- **Директор, территории**: `Math.random` в DistrictDetailModal убран — все округа считаются из реальной выгрузки (не-ПФО честно показывает нули), годы динамические из getYears(). Проверено: модалка ЦФО «Выручка 0 ₽», числа детерминированные.
- **Директор, отчёты**: `handleGenerate` deps + `selectedMonths` (отчёт больше не строится по устаревшему фильтру месяцев); `handleSave` → POST `/api/reports` (архив переживает переключение вкладок); `handleDeleteReport` → DELETE на сервере (отчёты не «воскресают»); убран фейковый размер `Math.random() МБ`.
- tsc чистый по всем изменённым файлам. Удалён мёртвый импорт `./dashboards/AdminDashboard` (файла не существовало).

### Добивка 2026-07-11 (низкие находки — сделано, проверено)
- Подписи годов на графиках TerritoriesAnalytics динамические (`Выручка ${prevYear}` и т.д.) — проверено вживую: «Выручка 2025 / Выручка 2026 / Прогноз 2027».
- Фильтр «Года» в топбаре MDLP строится из `availableYears` (реальные годы данных), fallback — текущий ±1.
- Строка активных фильтров в топбаре показывает реальные выбранные ФО/регионы/менеджеров вместо захардкоженного «Все округа».

### Осталось (следующая сессия)
- Полный список ~50 находок аудита: workflow journal `subagents/workflows/wf_eb0ed6cd-3a4/journal.jsonl` — закрыты critical/high и большинство medium/low. Крупное нерешённое: глобальные месяцы+метрика не работают в MDLP-вкладках (сервер не принимает months/metric); фильтр «Период» мёртвый; 6/9 отчётов MDLP игнорируют фильтры; сценарии калькулятора не персистятся в БД; PRODUCTS/TERRITORIES статические (правки админа не влияют на аналитику).
- Деплой на VPS не делался (ждёт явной команды).

### Известные не-регрессии
- `validateDOMNesting` warning (button в button) в EmployeesTabNew — пред-существующий, не краш.
- tsc: пред-существующий тех-долг (`unknown`-типы в App.tsx wm-вкладках, `Role` в AppLayout) — не из этой сессии.

---

## Последняя сессия: 2026-05-25 — 2026-05-28 (марафон: фильтры, планы РМ, иерархия сотрудников)

### Что сделано

#### Реальные сотрудники + иерархия (2026-05-26)
- Таблица `world_medicine.employees_data` расширена 6 колонками: `crm_group, position, city, email, hierarchy_level, source`
- Импортированы **107 сотрудников** из `сотрудники.xlsx` (CRM): 2 директора, 8 РМ, 15 ТМ, 82 МП
- 14 CRM-групп: Moscow 1/2, CFD Samadova, NCFD Bunytov, NWD Samadova, **PFO Samadova/Nechaeva/Orudjov/Sonin**, SFD Abbasov/Guseyn/Shtefanova, SibFD Milchenko, UFD Tagieva
- `/api/admin/employees` возвращает с сортировкой по hierarchy_level → crm_group → role → name
- [EmployeesManagement.tsx](src/app/pages/admin/EmployeesManagement.tsx) — полный refactor с иерархической группировкой
- [EmployeesAnalyticsLive.tsx](src/app/pages/director/EmployeesAnalyticsLive.tsx) — НОВЫЙ компонент для директора с реальными данными (заменил mock EmployeesAnalytics)

#### Combined Admin Sidebar (2026-05-26)
- Единый sidebar для admin в обоих режимах (MDLP + WM Russia) с группами **АНАЛИТИКА / УПРАВЛЕНИЕ / СИСТЕМА**
- 13 пунктов вместо 20 без дублей
- Новый компонент [AdminCombinedSidebar.tsx](src/app/components/common/AdminCombinedSidebar.tsx)
- WMRussiaApp.tsx принимает `initialSection` prop для прямого перехода в админ-вкладку

#### Фича «Планы РМ» полный цикл (2026-05-28)
- БД таблица `world_medicine.regional_plans`: id, user_id, year, region_name, product_id, month (1-12), plan_units + UNIQUE constraint
- 3 API endpoint'а в [server/index.ts](server/index.ts):
  - `GET /api/regional-plans?year=2026` — role-based (manager=свои, director/admin=все+JOIN на users)
  - `POST /api/regional-plans/bulk` — батч UPSERT через ON CONFLICT
  - `DELETE /api/regional-plans?year=2026` — очистить мои планы
- [PlansTab.tsx](src/app/pages/regional-manager/PlansTab.tsx) — 4-я вкладка в кабинете РМ:
  - Матрица 14 регионов × 12 месяцев для каждого из 12 препаратов
  - Inline-редактирование с жёлтым бордюром на dirty
  - Excel шаблон скачать/загрузить (12 листов по препаратам)
  - Кнопки Сохранить (N) / Очистить год
- [DirectorPlansSummary.tsx](src/app/pages/director/DirectorPlansSummary.tsx) — в начале калькулятора бюджета:
  - KPI: План / Факт (из SALES_DATA) / Выполнение % / РМ заполнили
  - Список РМ с раскрытием → распределение по препаратам
- В RussiaCalculator добавлена кнопка **«↓ Из планов РМ»** — подставляет сумму планов РМ в калькулятор

#### Director UX (2026-05-28)
- BUG: «Вернуться в МДЛП» → белый экран (T.startsWith crash в Recharts)
- Фикс: `onBackToMDLP` явно `navigateTo('upload')` + сброс `wmSelectedDistrict/Product`
- `main.tsx` обёрнут в `ErrorBoundary` (защита от любого crash)
- Новый [ChartErrorBoundary.tsx](src/app/components/common/ChartErrorBoundary.tsx) для локальной защиты chart-блоков
- Динамичные пресеты периодов в ReportsTabLight (`buildPeriodPresets()`)
- Скрытие «Рост 0%» когда нет данных за прошлый год

#### Глобальные фильтры месяцев + рубли/упаковки (раньше в этом марафоне)
- [GlobalFiltersContext.tsx](src/context/GlobalFiltersContext.tsx) — единый стейт фильтров
- [GlobalFilterControls.tsx](src/app/components/common/GlobalFilterControls.tsx) — multi-select месяцев + toggle метрики
- Подключено в App.tsx (MDLP) и AppLayout (director)
- Подключено к ProductsAnalyticsWithEdit, TerritoriesAnalytics, ReportsTabLight, BudgetCalculatorEnhanced, RegionalManagerDashboard
- MedRep/TM получают через monthlyFact в MedRepData → applyMonthsFilter в WMRussiaApp

#### Revenue из drug_prices + индексация SALES_DATA (раньше)
- SharedDataProvider подгружает `/api/drug-prices` параллельно с yearly-data
- setSalesDataFromMdlp: revenue = units × price (приоритет: МДЛП-сумма → БД-прайс → PRODUCTS.price fallback)
- Индексы в salesData.ts: `INDEX_BY_YEAR_MONTH_PRODUCT`, `INDEX_BY_YEAR_PRODUCT`, etc — O(1) lookup
- Фильтр срабатывает за **9 мс** на 313K записях (раньше 200-500 мс)

#### 14 регионов ПФО (раньше)
- `federalDistricts.ts` расширен с 6 до 14 регионов ПФО
- `salesData.ts` TERRITORIES — полные 14 названий

#### Прочие фиксы
- `setSalesDataFromMdlp` — парсит строковый месяц «Мар» в число (был crash 15K записей пропускались)
- mojibake «Выпо��нение» → «Выполнение»
- Admin auto-switch отключён (combined sidebar делает не нужным)
- Director auto-switch в wm-russia mode после login
- AuthContext.login починен (раньше всегда возвращал false)
- DbStatsPanel в админке
- 14 admin sidebar пунктов восстановлены (system-settings, upload, db-stats)

### Состояние проекта
- ✅ Полный цикл планов: РМ вводит → БД → директор видит → калькулятор подставляет
- ✅ 107 реальных сотрудников из CRM с иерархией
- ✅ Глобальный фильтр месяцев + переключатель рубли/упаковки
- ✅ Все 5 кабинетов работают на реальных МДЛП-данных + per-user изоляция
- ✅ Production VPS 85.193.86.69, БД connected, pm2 online

### Что осталось сделать
- **#1 КРИТИЧНО** Найти источник `T.startsWith` crash в Recharts (нужны sourcemaps + локальный dev). ErrorBoundary защищает но юзер видит сообщение об ошибке
- Обернуть конкретные Recharts-блоки в ChartErrorBoundary (компонент готов)
- Реальные бюджеты ПФО (вместо моих оценок в federalDistricts.ts)
- Удалить старый mock-файл `src/data/employees.ts` (заменён API)
- strictNullChecks (228 ошибок), убрать `any` (273 места)
- Refresh JWT-токены + persistent blacklist
- Email-уведомления

---

## Сессия: 2026-03-21

### Что сделано
- **WMRussiaApp.tsx** — убраны моки, добавлен фильтр территорий:
  - `salesData = wmRussiaData` (только данные из SharedDataContext, без mock fallback)
  - Новое состояние: `selectedTerritories`, `showTerritoryDropdown`, `availableTerritories`, `filteredSalesData`
  - Выбор территорий сохраняется в `localStorage('wm_territories_{userId}')`
  - При смене аккаунта — загружаются его сохранённые территории
  - UI фильтра в шапке: кнопка с дропдауном (чекбоксы + «Весь файл»), только для ролей medrep/territory_manager
  - Клик вне дропдауна — закрывается (mousedown listener)
  - `renderDashboard` medrep: `mergeMedRepData(filteredSalesData)` вместо `getDataById`
  - `renderDashboard` territory_manager: `medReps={filteredSalesData}`
  - Удалены неиспользуемые хелперы: `getDataByDistrict`, `getDataByTerritory`, `getDataById`, `getRanking`
- **src/data/wmRussiaData.ts** — добавлена `mergeMedRepData(reps)`: агрегирует массив MedRepData в одну запись
- **App.tsx** — «Проблемные зоны» подключены к реальным данным:
  - `filteredData.regionSales` → сравнение с `savedPlans` → Critical (<50%) / Warning (<80%)
  - `filteredData.drugSales` → препараты с продажами < 20% от максимума
  - `zeroRegions` — регионы без продаж совсем
  - Empty state если файл не загружен
- **MedRepDashboard.tsx** — empty state если нет данных
- **TerritoryManagerDashboard.tsx** — empty state если `medReps.length === 0`
- Сборка и деплой на VPS 85.193.86.69 ✓

### Состояние проекта
- ✅ Единая система: загрузка в МДЛП → данные во всех кабинетах
- ✅ Фильтр территорий в кабинетах медпреда и ТМ (с опцией «Весь файл»)
- ✅ Каждый сотрудник видит только своё, фильтр сохраняется между сессиями
- ✅ Проблемные зоны работают на реальных данных

### Что осталось сделать
- Создать реальные аккаунты сотрудников через кабинет администратора
- Email-уведомления при создании аккаунта

---

## Сессия: 2026-03-20

### Что сделано
- **WMRussiaApp.tsx** — реальная авторизация через API:
  - Добавлено поле пароля в форму входа
  - `handleLogin` стал async, делает `fetch('/api/auth/login')`
  - JWT токен сохраняется в `localStorage('wm_auth_token')`
  - Демо-кнопки автоматически подставляют `password123`
  - Индикатор загрузки (Loader2)
- **server/storage.ts** — добавлены методы управления пользователями:
  - `getAllUsers()`, `updateUser()`, `deleteUser()`
- **server/index.ts** — новые API роуты (admin only):
  - `GET /api/users`, `POST /api/users`, `PUT /api/users/:id`, `DELETE /api/users/:id`
- **src/lib/api.ts** — `getAuthToken()` теперь проверяет `wm_auth_token` + `mdlp_auth_token`
  - Это позволяет AdminDashboard использовать токен из WMRussiaApp для вызовов `/api/admin/*`
- ВПС задеплоен 2 раза ✓

### Состояние проекта
- ✅ Вход через реальную PostgreSQL БД (не mock)
- ✅ AdminDashboard → вкладка "Пользователи" загружает реальных юзеров из БД
- ✅ Создание/удаление/смена роли пользователей работает через UI

### Что осталось сделать
- Email-уведомления (при создании аккаунта слать пароль)
- Подключить более детальный CRUD сотрудников в AdminDashboard

---

## Сессия: 2026-03-19

### Что сделано
- **ReportsTabLight.tsx** — полная переработка:
  - Добавлена внутренняя 3-вкладочная навигация: Конструктор / Просмотр / Архив
  - Конструктор: шаблон, период с пресетами, формат (PDF/Excel/CSV), фильтр препаратов
  - Просмотр: реальные данные из `getSalesData()` — KPI, график Recharts, рейтинг препаратов, рейтинг территорий
  - Архив: фильтрация по типу отчёта
  - Excel: реальный файл через `xlsx`, 4 листа (Сводка, По препаратам, По территориям, Динамика)
  - CSV: через `papaparse` с BOM (кириллица корректна)
  - **PDF: браузерная печать через Blob URL** — кириллица работает идеально, `document.write` заменён на `Blob+URL.createObjectURL`
- **DirectorWMDashboard.tsx** — вкладка "Отчёты" подключена через `<ReportsTabLight />`
- **AppLayout.tsx** — светлая тема, `onLogout` prop
- **WMRussiaApp.tsx** — ранний возврат для директора (обходит сайдбар), sync `figma_auth_user`
- **WMRussiaSidebar.tsx** — светлая тема
- **ThemeContext.tsx** — форсирует светлую тему

### Состояние проекта
- ✅ Все 5 кабинетов работают
- ✅ Кабинет директора: 6 вкладок, AppLayout (верхняя навигация), светлая тема
- ✅ Отчёты: генерация + реальные данные + экспорт Excel/CSV/PDF

### Что осталось сделать (приоритет)
1. **Деплой** на VPS 85.193.86.69 — запустить сайт в production
2. **Интеграция backend API** — сейчас mock данные, нужно подключить PostgreSQL
3. **Email-уведомления** — не реализованы
4. ~~PDF с кириллицей~~ — РЕШЕНО через браузерную печать

---

## 2026-03-12 (сессия 3)

### Что сделано
- Навигация sidebar → вкладки: исправлена во всех 5 кабинетах (useEffect + SECTION_MAP)
- MedRepDashboard: 3 вкладки (продажи, динамика, KPI с radar-chart)
- TerritoryManagerDashboard: расширен до 4 вкладок

---

## 2026-03-12 (сессия 2)

### Что сделано
- AdminDashboard перестроен по Figma (7 вкладок, CRUD пользователей)
- RegionalManagerDashboard перестроен по Figma (3 вкладки)
- Создано ~30 файлов зависимостей Figma (контексты, типы, данные, утилиты, модалки)

---

## 2026-03-12 (сессия 1)

### Что сделано
- Подключена БД Timeweb Cloud PostgreSQL
- Созданы 5 демо-аккаунтов
- Настроен Figma MCP
- DirectorWMDashboard перестроен по Figma (светлая тема, KPI, графики)

---

## 2026-03-05

### Что сделано
- Настройка CLAUDE.md
- Настройка автосохранения (Stop hook → save-session.sh)
- Создан журнал ошибок

---

## Шаблон для новой сессии

```
## YYYY-MM-DD

### Что сделано
-

### Файлы изменены
-

### Что осталось
-

### Ошибки встреченные
-
```
