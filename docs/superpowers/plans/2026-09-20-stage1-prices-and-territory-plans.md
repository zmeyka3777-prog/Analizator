# Этап 1: цены и планы по территориям — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Привести прайс к одному виду и заполнить его, ввести понятие «территория» (группа регионов) и загрузить в базу план 2026 по ПФО и двум территориям из Excel-файла.

**Architecture:** Чистые функции (сопоставление названий препаратов, разбор Excel) отделены от работы с базой и покрыты тестами без сети и без БД. Схема создаётся в `initSchema()` по существующему в проекте паттерну `CREATE TABLE IF NOT EXISTS`. Импорт плана — идемпотентный CLI-скрипт на `tsx` с режимом `--dry-run`, сверяющий итоги с колонкой «на год» из файла. Отдача планов наружу — один GET-эндпоинт.

**Tech Stack:** TypeScript, Node 25, `tsx`, PostgreSQL (`pg`), `xlsx` 0.20.3, Express 5. Тесты — встроенный раннер `node --test` через `--import tsx`; **новых зависимостей не добавляем** (проверено: раннер работает в этом проекте).

**Spec:** [docs/superpowers/specs/2026-09-20-xmark-autoload-design.md](../specs/2026-09-20-xmark-autoload-design.md)

## Global Constraints

- TypeScript везде, `any` избегать; все пользовательские тексты и комментарии к сложной логике — на русском (CLAUDE.md).
- Новых npm-зависимостей не добавлять.
- Не редактировать `migrations/` вручную и не трогать `src/app/components/ui/`.
- Схема БД меняется только через `initSchema()` в `server/db.ts`, по образцу существующих таблиц.
- Единица плана — **упаковки** (не рубли). Числа в файле записаны с запятой как разделителем тысяч: `"2,850"` = 2850.
- Имена: таблица `world_medicine.territories` уже занята регионами округа. Новая сущность — `sales_territories`.
- Год плана — 2026, но нигде не хардкодить: параметр `--year`.
- Область этого плана — данные и API. Отображение плана в кабинете — отдельный план, он пишется после того, как этот заработает и появятся реальные цифры.

---

### Task 1: Сопоставление названий препаратов с каталогом

Названия в файле плана и в выгрузках xMark приходят по-русски, с висячими пробелами и в разном регистре («Артоксан гель », «Дорамитцин ВМ »). Каталог хранит коды (`artoxan-gel`). Нужна одна общая функция для сервера — на клиенте похожая логика уже есть (`src/data/salesData.ts:12`), но она недоступна серверу и переписывать её мы не будем.

**Files:**
- Create: `server/utils/productMatch.ts`
- Create: `server/utils/productMatch.test.ts`
- Modify: `package.json` (добавить скрипт `test`)

**Interfaces:**
- Consumes: `SEED_PRODUCTS` из `server/catalogSeed.ts` (поля `code`, `name`, `short_name`, `price`).
- Produces: `matchProductCode(raw: string): string | null` — возвращает `code` из каталога или `null`.

- [ ] **Step 1: Добавить скрипт запуска тестов**

В `package.json`, в блок `scripts`, добавить строку:

```json
"test": "node --import tsx --test \"server/**/*.test.ts\""
```

- [ ] **Step 2: Написать падающий тест**

Создать `server/utils/productMatch.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchProductCode } from './productMatch';

test('узнаёт препарат по русскому названию', () => {
  assert.equal(matchProductCode('Кокарнит'), 'cocarnit');
  assert.equal(matchProductCode('Апфекто'), 'apfecto');
});

test('срезает висячие пробелы и неразрывный пробел', () => {
  assert.equal(matchProductCode('Артоксан гель '), 'artoxan-gel');
  assert.equal(matchProductCode('Дорамитцин\u00A0ВМ '), 'doramycin');
});

test('различает три формы Артоксана — длинное совпадение раньше короткого', () => {
  assert.equal(matchProductCode('Артоксан лиофилизат '), 'artoxan-lyof');
  assert.equal(matchProductCode('Артоксан таблетки'), 'artoxan-tablets');
  assert.equal(matchProductCode('Артоксан гель'), 'artoxan-gel');
  assert.equal(matchProductCode('Артоксан'), 'artoxan-lyof');
});

test('узнаёт препарат по английскому короткому имени из каталога', () => {
  assert.equal(matchProductCode('COCARNIT LYOF.POWD.FOR INJ.'), 'cocarnit');
});

test('на мусоре и пустой строке возвращает null', () => {
  assert.equal(matchProductCode(''), null);
  assert.equal(matchProductCode('ИТОГО УПАКОВКИ'), null);
  assert.equal(matchProductCode('Аспирин'), null);
});

test('покрывает все 12 названий из файла плана', () => {
  const namesFromFile = [
    'Апфекто', 'Артоксан гель ', 'Артоксан лиофилизат ', 'Артоксан таблетки',
    'Дорамитцин ВМ ', 'Клодифен Нейро ', 'Кокарнит ', 'Лименда ',
    'Орцепол', 'Роноцит ', 'Секнидокс ', 'Драстоп Адванс',
  ];
  const codes = namesFromFile.map(matchProductCode);
  assert.ok(codes.every((c) => c !== null), `не опознаны: ${namesFromFile.filter((_, i) => !codes[i])}`);
  assert.equal(new Set(codes).size, 12, 'каждое название должно дать свой код');
});
```

- [ ] **Step 3: Запустить тест и убедиться, что он падает**

Run: `npm test`
Expected: FAIL — `Cannot find module './productMatch'`.

- [ ] **Step 4: Написать минимальную реализацию**

Создать `server/utils/productMatch.ts`:

```ts
// Сопоставление произвольного написания названия препарата с кодом каталога.
// Нужно и импорту планов, и загрузчику xMark: там и там названия приходят
// по-русски, с висячими пробелами и в разном регистре.
import { SEED_PRODUCTS } from '../catalogSeed';

// Порядок важен: длинные названия проверяются раньше коротких, иначе
// «Артоксан лиофилизат» опознается как просто «Артоксан».
const RU_TO_CODE: Array<[string, string]> = [
  ['артоксан лиофилизат', 'artoxan-lyof'],
  ['артоксан таблетки', 'artoxan-tablets'],
  ['артоксан гель', 'artoxan-gel'],
  ['артоксан', 'artoxan-lyof'],
  ['кокарнит', 'cocarnit'],
  ['роноцит', 'ronocit'],
  ['клодифен', 'clodifen'],
  ['секнидокс', 'secnidox'],
  ['драстоп', 'drastop'],
  ['лименда', 'limenda'],
  ['орцепол', 'orcipol'],
  ['дорамитцин', 'doramycin'],
  ['апфекто', 'apfecto'],
];

export function matchProductCode(raw: string): string | null {
  if (!raw) return null;
  const s = raw.toLowerCase().replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
  if (!s) return null;

  for (const [ru, code] of RU_TO_CODE) {
    if (s.includes(ru)) return code;
  }
  // Английские написания — из каталога, по короткому имени (COCARNIT, LIMENDA…)
  for (const p of SEED_PRODUCTS) {
    const short = (p.short_name || '').toLowerCase();
    if (short && s.includes(short)) return p.code;
  }
  return null;
}
```

- [ ] **Step 5: Запустить тест и убедиться, что он проходит**

Run: `npm test`
Expected: PASS, 6 тестов.

- [ ] **Step 6: Коммит**

```bash
git add server/utils/productMatch.ts server/utils/productMatch.test.ts package.json
git commit -m "Сопоставление названий препаратов с кодами каталога + запуск тестов через node --test"
```

---

### Task 2: Разбор Excel-файла с планом

Файл `Татарстан План 2026.xlsx` — один лист, три блока подряд: «ОБЩИЙ ПЛАН ПФО», «Татарстан», «Марий Эл-Чувашия». В каждом: строка-заголовок блока, строка `упаковки | январь … декабрь | на год`, 12 строк препаратов, строка `ИТОГО УПАКОВКИ`. Числа — строки с запятой как разделителем тысяч.

**Files:**
- Create: `server/plans/parseTerritoryPlanXlsx.ts`
- Create: `server/plans/parseTerritoryPlanXlsx.test.ts`

**Interfaces:**
- Consumes: `matchProductCode` из `server/utils/productMatch.ts`.
- Produces:

```ts
export interface TerritoryPlanRow {
  scopeType: 'district' | 'territory';
  scopeName: string;     // 'ПФО' | 'Татарстан' | 'Марий Эл-Чувашия'
  productCode: string;   // код из каталога
  month: number;         // 1..12
  planUnits: number;     // упаковки
}

export interface ParsedTerritoryPlan {
  rows: TerritoryPlanRow[];
  yearTotals: Record<string, number>;  // scopeName → «ИТОГО УПАКОВКИ» за год из файла
  unmatched: string[];                 // названия, которые не удалось опознать
}

export function parseTerritoryPlanXlsx(filePath: string): ParsedTerritoryPlan
export function parsePlanNumber(raw: unknown): number
```

- [ ] **Step 1: Написать падающий тест**

Создать `server/plans/parseTerritoryPlanXlsx.test.ts`. Тест сам собирает временный xlsx той же формы, что настоящий файл, — так тест не зависит от файла на рабочем столе:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseTerritoryPlanXlsx, parsePlanNumber } from './parseTerritoryPlanXlsx';

const MONTHS_HEADER = ['упаковки', 'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь', 'на год'];

// Блок из двух препаратов: по 1 упаковке в каждом месяце, итог за год 12.
function block(title: string) {
  return [
    [title, '', '', '', '', '', '', '', '', '', '', '', '', ''],
    MONTHS_HEADER,
    ['Кокарнит ', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '12'],
    ['Артоксан гель ', '2,850', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '2,861'],
    ['ИТОГО УПАКОВКИ', '2,851', '2', '2', '2', '2', '2', '2', '2', '2', '2', '2', '2', '2,873'],
    ['', '', '', '', '', '', '', '', '', '', '', '', '', ''],
  ];
}

function makeFixture(): string {
  const aoa = [...block('ОБЩИЙ ПЛАН ПФО'), ...block('Татарстан'), ...block('Марий Эл-Чувашия')];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'Лист1');
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'plan-')), 'plan.xlsx');
  XLSX.writeFile(wb, file);
  return file;
}

test('запятая в числе — разделитель тысяч, а не дробная часть', () => {
  assert.equal(parsePlanNumber('2,850'), 2850);
  assert.equal(parsePlanNumber('576,126'), 576126);
  assert.equal(parsePlanNumber('134'), 134);
  assert.equal(parsePlanNumber(''), 0);
  assert.equal(parsePlanNumber('0'), 0);
  assert.equal(parsePlanNumber(undefined), 0);
});

test('разбирает три блока и помечает ПФО как округ', () => {
  const parsed = parseTerritoryPlanXlsx(makeFixture());
  const scopes = [...new Set(parsed.rows.map((r) => r.scopeName))];
  assert.deepEqual(scopes, ['ПФО', 'Татарстан', 'Марий Эл-Чувашия']);
  assert.equal(parsed.rows.find((r) => r.scopeName === 'ПФО')!.scopeType, 'district');
  assert.equal(parsed.rows.find((r) => r.scopeName === 'Татарстан')!.scopeType, 'territory');
});

test('на каждый блок — 2 препарата × 12 месяцев', () => {
  const parsed = parseTerritoryPlanXlsx(makeFixture());
  assert.equal(parsed.rows.length, 3 * 2 * 12);
  const jan = parsed.rows.find(
    (r) => r.scopeName === 'Татарстан' && r.productCode === 'artoxan-gel' && r.month === 1,
  );
  assert.equal(jan!.planUnits, 2850);
});

test('строка ИТОГО не попадает в препараты, но даёт итог за год', () => {
  const parsed = parseTerritoryPlanXlsx(makeFixture());
  assert.ok(parsed.rows.every((r) => typeof r.productCode === 'string' && r.productCode.length > 0));
  assert.equal(parsed.yearTotals['ПФО'], 2873);
  assert.deepEqual(parsed.unmatched, []);
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `npm test`
Expected: FAIL — модуль `./parseTerritoryPlanXlsx` не найден.

- [ ] **Step 3: Написать реализацию**

Создать `server/plans/parseTerritoryPlanXlsx.ts`:

```ts
// Разбор файла плана продаж (упаковки) по округу и территориям.
// Формат: несколько блоков подряд на одном листе. Блок = строка-заголовок
// (заполнена только первая ячейка), строка «упаковки | январь … | на год»,
// строки препаратов, строка «ИТОГО УПАКОВКИ».
import * as XLSX from 'xlsx';
import { matchProductCode } from '../utils/productMatch';

export interface TerritoryPlanRow {
  scopeType: 'district' | 'territory';
  scopeName: string;
  productCode: string;
  month: number;
  planUnits: number;
}

export interface ParsedTerritoryPlan {
  rows: TerritoryPlanRow[];
  yearTotals: Record<string, number>;
  unmatched: string[];
}

const TOTAL_ROW = 'итого';
const HEADER_ROW = 'упаковки';

/** «2,850» → 2850. Запятая в файле разделяет тысячи, а не дробную часть. */
export function parsePlanNumber(raw: unknown): number {
  if (raw == null) return 0;
  const s = String(raw).replace(/\u00A0/g, '').replace(/[\s,]/g, '').trim();
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/** «ОБЩИЙ ПЛАН ПФО» → округ; всё остальное — территория. */
function scopeFromTitle(title: string): { scopeType: 'district' | 'territory'; scopeName: string } {
  const t = title.replace(/\s+/g, ' ').trim();
  if (/пфо/i.test(t) && /общ/i.test(t)) return { scopeType: 'district', scopeName: 'ПФО' };
  return { scopeType: 'territory', scopeName: t };
}

export function parseTerritoryPlanXlsx(filePath: string): ParsedTerritoryPlan {
  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const aoa: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });

  const rows: TerritoryPlanRow[] = [];
  const yearTotals: Record<string, number> = {};
  const unmatched: string[] = [];

  let current: { scopeType: 'district' | 'territory'; scopeName: string } | null = null;

  for (const line of aoa) {
    const first = String(line[0] ?? '').trim();
    if (!first) continue;

    const lower = first.toLowerCase();

    // Строка-заголовок блока: заполнена только первая ячейка.
    const restEmpty = line.slice(1).every((c) => String(c ?? '').trim() === '');
    if (restEmpty) {
      current = scopeFromTitle(first);
      continue;
    }

    if (lower.startsWith(HEADER_ROW)) continue;        // шапка с месяцами

    if (lower.startsWith(TOTAL_ROW)) {                  // ИТОГО УПАКОВКИ
      if (current) yearTotals[current.scopeName] = parsePlanNumber(line[13]);
      continue;
    }

    if (!current) continue;

    const productCode = matchProductCode(first);
    if (!productCode) {
      unmatched.push(first);
      continue;
    }

    for (let month = 1; month <= 12; month += 1) {
      rows.push({
        scopeType: current.scopeType,
        scopeName: current.scopeName,
        productCode,
        month,
        planUnits: parsePlanNumber(line[month]),
      });
    }
  }

  return { rows, yearTotals, unmatched };
}
```

- [ ] **Step 4: Запустить тест и убедиться, что он проходит**

Run: `npm test`
Expected: PASS, все тесты обоих файлов.

- [ ] **Step 5: Проверить на настоящем файле**

Run:

Проект собран как ES-модули (`"type": "module"` в package.json), поэтому `require` здесь не работает — только `import`:

```bash
node --import tsx -e "import('./server/plans/parseTerritoryPlanXlsx.ts').then(({parseTerritoryPlanXlsx})=>{const p=parseTerritoryPlanXlsx('C:/Users/MARS/Desktop/Татарстан План 2026.xlsx'); console.log('строк:',p.rows.length,'итоги:',p.yearTotals,'не опознано:',p.unmatched);})"
```

Expected: `строк: 432` (3 блока × 12 препаратов × 12 месяцев), итоги `{ ПФО: 576126, Татарстан: 191839, 'Марий Эл-Чувашия': 47240 }`, не опознано — пустой массив.
Если что-то не сходится — чинить разбор, а не подгонять ожидания.

- [ ] **Step 6: Коммит**

```bash
git add server/plans/parseTerritoryPlanXlsx.ts server/plans/parseTerritoryPlanXlsx.test.ts
git commit -m "Разбор Excel-файла с планом по округу и территориям"
```

---

### Task 3: Таблицы территорий и планов

**Files:**
- Modify: `server/db.ts` — внутрь `initSchema()` (строка 163), после блока `territories` (заканчивается около строки 342), перед секцией «SEED КАТАЛОГОВ»

**Interfaces:**
- Produces: таблицы `world_medicine.sales_territories`, `world_medicine.sales_territory_regions`, `world_medicine.territory_plans`; две территории в seed.

- [ ] **Step 1: Добавить создание таблиц**

В `server/db.ts`, сразу после `console.log('[DB] Таблица territories готова');`, вставить:

```ts
    // ==================== ТЕРРИТОРИИ ОТВЕТСТВЕННОСТИ ====================
    // Не путать с world_medicine.territories — там регионы внутри округа.
    // Здесь территория = зона ответственности сотрудника, набор регионов
    // (например «Татарстан» = Татарстан + Удмуртия).
    await pool.query(`
      CREATE TABLE IF NOT EXISTS world_medicine.sales_territories (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(200) NOT NULL UNIQUE,
        district_id VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS world_medicine.sales_territory_regions (
        territory_id VARCHAR(100) NOT NULL
          REFERENCES world_medicine.sales_territories(id) ON DELETE CASCADE,
        region_name VARCHAR(200) NOT NULL,
        PRIMARY KEY (territory_id, region_name)
      )
    `);
    console.log('[DB] Таблицы sales_territories готовы');

    // Планы в упаковках: на округ целиком (scope_type='district') либо на
    // территорию (scope_type='territory'). Делить план территории между её
    // регионами нечем, поэтому он хранится на территорию целиком.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS world_medicine.territory_plans (
        id SERIAL PRIMARY KEY,
        year INTEGER NOT NULL,
        scope_type VARCHAR(20) NOT NULL,
        scope_id VARCHAR(100) NOT NULL,
        product_id VARCHAR(100) NOT NULL,
        month INTEGER NOT NULL,
        plan_units NUMERIC(14,2) NOT NULL DEFAULT 0,
        source VARCHAR(30) NOT NULL DEFAULT 'imported_xlsx',
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        CONSTRAINT territory_plans_month_chk CHECK (month BETWEEN 1 AND 12),
        CONSTRAINT territory_plans_unique UNIQUE (year, scope_type, scope_id, product_id, month)
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_territory_plans_year
      ON world_medicine.territory_plans (year, scope_type, scope_id)
    `);
    console.log('[DB] Таблица territory_plans готова');
```

- [ ] **Step 2: Уточнить написание регионов по фактическим данным**

Прежде чем заводить территории, посмотреть, как регионы записаны в уже загруженных данных:

```bash
node --import tsx -e "import('./server/db').then(async m=>{const r=await m.safeQuery(\"SELECT DISTINCT region FROM world_medicine.raw_sales_rows WHERE region ILIKE '%татарст%' OR region ILIKE '%удмурт%' OR region ILIKE '%марий%' OR region ILIKE '%чуваш%' ORDER BY 1\"); console.log(r.rows); process.exit(0);})"
```

Выписать фактические написания — они пойдут в seed следующим шагом. Если база пуста или недоступна, использовать написания из `federalDistricts.ts` и пометить это в коммите.

- [ ] **Step 3: Добавить seed двух территорий**

В `server/db.ts`, в секции «SEED КАТАЛОГОВ» (после seed `territories`), добавить:

```ts
    // Территории ответственности: заводятся один раз, дальше правятся через БД.
    // Написание регионов должно совпадать с тем, как они лежат в raw_sales_rows.
    try {
      const SEED_SALES_TERRITORIES: Array<{ id: string; name: string; regions: string[] }> = [
        { id: 'tatarstan', name: 'Татарстан', regions: ['Республика Татарстан', 'Удмуртская Республика'] },
        { id: 'mariel-chuvashia', name: 'Марий Эл-Чувашия', regions: ['Республика Марий Эл', 'Чувашская Республика'] },
      ];
      for (const t of SEED_SALES_TERRITORIES) {
        await pool.query(
          `INSERT INTO world_medicine.sales_territories (id, name, district_id)
           VALUES ($1, $2, 'pfo') ON CONFLICT (id) DO NOTHING`,
          [t.id, t.name],
        );
        for (const region of t.regions) {
          await pool.query(
            `INSERT INTO world_medicine.sales_territory_regions (territory_id, region_name)
             VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [t.id, region],
          );
        }
      }
      console.log(`[DB] Seed: sales_territories (${SEED_SALES_TERRITORIES.length})`);
    } catch (e: any) {
      console.error('[DB] Seed sales_territories:', e?.message);
    }
```

- [ ] **Step 4: Запустить сервер и проверить, что таблицы создались**

Run: `npm run server`
Expected: в логе `[DB] Таблицы sales_territories готовы`, `[DB] Таблица territory_plans готова`, `[DB] Seed: sales_territories (2)`. Ошибок нет. Остановить сервер.

- [ ] **Step 5: Коммит**

```bash
git add server/db.ts
git commit -m "Таблицы sales_territories, sales_territory_regions, territory_plans + seed двух территорий ПФО"
```

---

### Task 4: Скрипт импорта плана

**Files:**
- Create: `scripts/import-territory-plan.ts`

**Interfaces:**
- Consumes: `parseTerritoryPlanXlsx` (Task 2), таблицы из Task 3, `safeQuery` из `server/db.ts`.
- Produces: CLI `node --import tsx scripts/import-territory-plan.ts --file <путь> --year 2026 [--dry-run]`.

- [ ] **Step 1: Написать скрипт**

Создать `scripts/import-territory-plan.ts`:

```ts
/**
 * Импорт плана продаж (упаковки) из Excel в world_medicine.territory_plans.
 * Идемпотентен: повторный запуск обновляет существующие строки, не плодя дубли.
 * Ручные правки (source='manual') не затирает.
 *
 * Запуск:
 *   node --import tsx scripts/import-territory-plan.ts --file "C:/.../План 2026.xlsx" --year 2026
 *   ...--dry-run — только показать, что будет записано
 */
import 'dotenv/config';
import { parseTerritoryPlanXlsx } from '../server/plans/parseTerritoryPlanXlsx';
import { safeQuery } from '../server/db';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const file = arg('file');
  const year = Number(arg('year') || new Date().getFullYear());
  const dryRun = process.argv.includes('--dry-run');

  if (!file) {
    console.error('Укажите --file <путь к xlsx>');
    process.exit(1);
  }

  const parsed = parseTerritoryPlanXlsx(file);

  if (parsed.unmatched.length > 0) {
    console.error(`Не опознаны названия препаратов: ${parsed.unmatched.join(', ')}`);
    console.error('Импорт остановлен — иначе план приедет неполным.');
    process.exit(1);
  }

  // Сверка с колонкой «на год» из файла: суммы по месяцам должны сойтись.
  const sums: Record<string, number> = {};
  for (const r of parsed.rows) sums[r.scopeName] = (sums[r.scopeName] || 0) + r.planUnits;
  for (const [scope, total] of Object.entries(parsed.yearTotals)) {
    const diff = Math.abs((sums[scope] || 0) - total);
    console.log(`${scope}: посчитано ${sums[scope] || 0}, в файле ${total}${diff ? ` — РАСХОЖДЕНИЕ ${diff}` : ''}`);
    if (diff > 0.5) {
      console.error('Расхождение с итогом из файла — импорт остановлен.');
      process.exit(1);
    }
  }

  if (dryRun) {
    console.log(`--dry-run: записано бы ${parsed.rows.length} строк за ${year} год.`);
    process.exit(0);
  }

  // Имя блока → scope_id: округ всегда 'pfo', территория ищется по имени.
  const territories = await safeQuery('SELECT id, name FROM world_medicine.sales_territories');
  const idByName = new Map<string, string>(territories.rows.map((t: any) => [t.name, t.id]));

  let written = 0;
  for (const r of parsed.rows) {
    const scopeId = r.scopeType === 'district' ? 'pfo' : idByName.get(r.scopeName);
    if (!scopeId) {
      console.error(`Территория «${r.scopeName}» не заведена в sales_territories — импорт остановлен.`);
      process.exit(1);
    }
    await safeQuery(
      `INSERT INTO world_medicine.territory_plans
         (year, scope_type, scope_id, product_id, month, plan_units, source)
       VALUES ($1, $2, $3, $4, $5, $6, 'imported_xlsx')
       ON CONFLICT (year, scope_type, scope_id, product_id, month)
       DO UPDATE SET plan_units = EXCLUDED.plan_units, updated_at = NOW()
       WHERE world_medicine.territory_plans.source <> 'manual'`,
      [year, r.scopeType, scopeId, r.productCode, r.month, r.planUnits],
    );
    written += 1;
  }

  console.log(`Готово: обработано ${written} строк плана за ${year} год.`);
  process.exit(0);
}

main().catch((e) => {
  console.error('Импорт упал:', e?.message);
  process.exit(1);
});
```

- [ ] **Step 2: Прогнать вхолостую**

Run:

```bash
node --import tsx scripts/import-territory-plan.ts --file "C:/Users/MARS/Desktop/Татарстан План 2026.xlsx" --year 2026 --dry-run
```

Expected: три строки сверки без расхождений (ПФО 576126, Татарстан 191839, Марий Эл-Чувашия 47240) и `--dry-run: записано бы 432 строк`.

- [ ] **Step 3: Импортировать по-настоящему**

Run: та же команда без `--dry-run`.
Expected: `Готово: обработано 432 строк плана за 2026 год.`

- [ ] **Step 4: Проверить, что в базе ровно то, что в файле**

Run:

```bash
node --import tsx -e "import('./server/db').then(async m=>{const r=await m.safeQuery(\"SELECT scope_type, scope_id, SUM(plan_units)::int AS total, COUNT(*)::int AS rows FROM world_medicine.territory_plans WHERE year=2026 GROUP BY 1,2 ORDER BY 3 DESC\"); console.table(r.rows); process.exit(0);})"
```

Expected: три строки — `district/pfo` = 576126 (144 строки), `territory/tatarstan` = 191839 (144), `territory/mariel-chuvashia` = 47240 (144).

- [ ] **Step 5: Проверить идемпотентность**

Запустить импорт повторно, затем снова запрос из шага 4.
Expected: те же три строки, суммы и количество не изменились.

- [ ] **Step 6: Коммит**

```bash
git add scripts/import-territory-plan.ts
git commit -m "Скрипт идемпотентного импорта плана по территориям из Excel"
```

---

### Task 5: Привести прайс к одному виду и заполнить

В проекте три несовместимых описания `drug_prices`: миграция ждёт `drug_id/price`, админка пишет `drug_name/price_per_unit` (`server/adminRoutes.ts:236,253`), а расчёт рублей читает `drug_pattern/drug_label/price_per_unit` (`server/index.ts:1242`, `src/data/salesData.ts:73`). Целевая — та, которую читает расчёт; иначе внесённая через админку цена никуда не доедет.

**Files:**
- Modify: `server/adminRoutes.ts:233-264` (чтение и запись цен)
- Modify: `server/db.ts` — `initSchema()`, рядом с прочими таблицами: создание `drug_prices` в целевом виде + seed
- Test: проверка вручную запросами (работа с живой БД, юнит-тест здесь ничего не докажет)

**Interfaces:**
- Consumes: `SEED_PRODUCTS` из `server/catalogSeed.ts`.
- Produces: таблица `drug_prices (id, drug_pattern, drug_label, price_per_unit)`, заполненная 12 ценами; `PUT /api/admin/drug-prices` принимает `{ drug_pattern, drug_label, price_per_unit }`.

- [ ] **Step 1: Посмотреть фактическую схему в базе**

Run:

```bash
node --import tsx -e "import('./server/db').then(async m=>{const r=await m.safeQuery(\"SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='world_medicine' AND table_name='drug_prices' ORDER BY ordinal_position\"); console.table(r.rows); const c=await m.safeQuery('SELECT COUNT(*)::int n FROM world_medicine.drug_prices'); console.log('строк:', c.rows[0].n); process.exit(0);})"
```

Записать результат — он определяет следующий шаг. Ожидание: колонки `drug_pattern, drug_label, price_per_unit`, строк 0.

- [ ] **Step 2: Завести таблицу в целевом виде**

В `server/db.ts`, в `initSchema()`, рядом с остальными таблицами:

```ts
    // Прайс: pattern — подстрока названия препарата (в нижнем регистре),
    // по ней аналитика находит цену упаковки для пересчёта в рубли.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS world_medicine.drug_prices (
        id SERIAL PRIMARY KEY,
        drug_pattern VARCHAR(200) NOT NULL UNIQUE,
        drug_label VARCHAR(200) NOT NULL,
        price_per_unit NUMERIC(12,2) NOT NULL
      )
    `);
    console.log('[DB] Таблица drug_prices готова');
```

Если шаг 1 показал старые колонки (`drug_id`/`price`) — не переименовывать вслепую: добавить недостающие колонки через `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` по образцу блока `DO $$ BEGIN ... END $$;` из `upload_history` (`server/db.ts:217-232`), а старые оставить.

- [ ] **Step 3: Заполнить 12 цен из каталога**

В секцию «SEED КАТАЛОГОВ» в `server/db.ts`:

```ts
    // Цены из каталога — стартовое наполнение прайса. Дальше правятся из
    // админки: ON CONFLICT DO NOTHING, чтобы не затирать правки при рестарте.
    try {
      const priceCount = await pool.query('SELECT COUNT(*)::int AS n FROM world_medicine.drug_prices');
      if (priceCount.rows[0].n === 0) {
        for (const p of SEED_PRODUCTS) {
          const pattern = (p.short_name || p.code).toLowerCase();
          await pool.query(
            `INSERT INTO world_medicine.drug_prices (drug_pattern, drug_label, price_per_unit)
             VALUES ($1, $2, $3) ON CONFLICT (drug_pattern) DO NOTHING`,
            [pattern, p.short_name, p.price],
          );
        }
        console.log(`[DB] Seed: drug_prices заполнены (${SEED_PRODUCTS.length})`);
      }
    } catch (e: any) {
      console.error('[DB] Seed drug_prices:', e?.message);
    }
```

Внимание: `drug_pattern` должен совпадать с тем, как препарат назван в данных. Короткие английские имена (`cocarnit`, `limenda`) в русских выгрузках не встретятся, поэтому следующий шаг — добавить русские шаблоны.

- [ ] **Step 4: Добавить русские шаблоны**

Там же, после seed из каталога, — русские подстроки, по которым реально придут названия:

```ts
      const RU_PATTERNS: Array<[string, string, string]> = [
        ['кокарнит', 'Кокарнит', 'cocarnit'],
        ['артоксан лиофилизат', 'Артоксан лиофилизат', 'artoxan-lyof'],
        ['артоксан таблетки', 'Артоксан таблетки', 'artoxan-tablets'],
        ['артоксан гель', 'Артоксан гель', 'artoxan-gel'],
        ['клодифен', 'Клодифен Нейро', 'clodifen'],
        ['секнидокс', 'Секнидокс', 'secnidox'],
        ['драстоп', 'Драстоп Адванс', 'drastop'],
        ['лименда', 'Лименда', 'limenda'],
        ['орцепол', 'Орцепол', 'orcipol'],
        ['дорамитцин', 'Дорамитцин ВМ', 'doramycin'],
        ['роноцит', 'Роноцит', 'ronocit'],
        ['апфекто', 'Апфекто', 'apfecto'],
      ];
      for (const [pattern, label, code] of RU_PATTERNS) {
        const price = SEED_PRODUCTS.find((p) => p.code === code)?.price ?? 0;
        await pool.query(
          `INSERT INTO world_medicine.drug_prices (drug_pattern, drug_label, price_per_unit)
           VALUES ($1, $2, $3) ON CONFLICT (drug_pattern) DO NOTHING`,
          [pattern, label, price],
        );
      }
```

- [ ] **Step 5: Починить админку, чтобы она писала в те же колонки**

В `server/adminRoutes.ts` заменить чтение (строка ~236) `ORDER BY drug_name` на `ORDER BY drug_label`, а запись (строки ~247-260) — на:

```ts
      const { drug_pattern, drug_label, price_per_unit } = req.body;
      if (!drug_pattern || price_per_unit == null) {
        return res.status(400).json({ error: 'Шаблон названия и цена обязательны' });
      }
      const result = await safeQuery(
        `INSERT INTO world_medicine.drug_prices (drug_pattern, drug_label, price_per_unit)
         VALUES ($1, $2, $3)
         ON CONFLICT (drug_pattern) DO UPDATE SET price_per_unit = $3, drug_label = $2
         RETURNING *`,
        [String(drug_pattern).toLowerCase().trim(), drug_label || drug_pattern, price_per_unit],
      );
      await logAudit(req.userId, 'Изменена цена препарата', 'drug_price', result.rows[0]?.id, { drug_pattern, price_per_unit });
```

- [ ] **Step 6: Проверить, что цены доехали до расчёта**

Запустить `npm run server` и `npm run dev`, войти как `director@orney.ru`.
Expected: в консоли браузера `[SharedData] Обновлено из БД: N строк, 24 цены` (12 английских + 12 русских шаблонов), не «0 цен». Рубли на дашборде считаются, а не равны упаковкам.

- [ ] **Step 7: Коммит**

```bash
git add server/db.ts server/adminRoutes.ts
git commit -m "drug_prices: одна схема (drug_pattern/drug_label/price_per_unit), заполнение из каталога, починена запись из админки"
```

---

### Task 6: API планов по территориям

**Files:**
- Modify: `server/index.ts` — рядом с блоком REGIONAL PLANS (начинается на строке 900)

**Interfaces:**
- Consumes: таблицы из Task 3, данные из Task 4.
- Produces: `GET /api/territory-plans?year=2026` →
  `{ year, territories: [{ id, name, regions: string[] }], plans: [{ scope_type, scope_id, product_id, month, plan_units }] }`

- [ ] **Step 1: Добавить эндпоинт**

В `server/index.ts`, после блока REGIONAL PLANS:

```ts
// ==================== ПЛАНЫ ПО ТЕРРИТОРИЯМ ====================
// План на округ целиком и на территории (группы регионов). Виден всем
// авторизованным: разграничение по территориям появится отдельной задачей.
app.get("/api/territory-plans", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();

    const plans = await safeQuery(
      `SELECT scope_type, scope_id, product_id, month, plan_units::float AS plan_units, source
       FROM world_medicine.territory_plans
       WHERE year = $1
       ORDER BY scope_type, scope_id, product_id, month`,
      [year],
    );

    const territories = await safeQuery(
      `SELECT t.id, t.name, COALESCE(
                ARRAY_AGG(r.region_name ORDER BY r.region_name)
                  FILTER (WHERE r.region_name IS NOT NULL), '{}') AS regions
       FROM world_medicine.sales_territories t
       LEFT JOIN world_medicine.sales_territory_regions r ON r.territory_id = t.id
       GROUP BY t.id, t.name
       ORDER BY t.name`,
    );

    res.json({ year, territories: territories.rows, plans: plans.rows });
  } catch (error: any) {
    console.error("[territory-plans] GET error:", error?.message);
    res.status(500).json({ error: "Ошибка получения планов по территориям" });
  }
});
```

- [ ] **Step 2: Проверить ответ**

Запустить `npm run server` (в разработке слушает порт **3001**, в production — 5000), получить токен и вызвать эндпоинт. В отличие от xMark, наше API ждёт токен **с** префиксом `Bearer` (`server/index.ts:213`):

```bash
node --import tsx -e "(async()=>{const r=await fetch('http://127.0.0.1:3001/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'director@orney.ru',password:'password123'})}); const {token}=await r.json(); const p=await fetch('http://127.0.0.1:3001/api/territory-plans?year=2026',{headers:{Authorization:'Bearer '+token}}); const d=await p.json(); console.log('территорий:',d.territories.length,'строк плана:',d.plans.length); console.log(d.territories);})()"
```

Expected: `территорий: 2`, `строк плана: 432`, у каждой территории по два региона.

- [ ] **Step 3: Коммит**

```bash
git add server/index.ts
git commit -m "GET /api/territory-plans — планы по округу и территориям"
```

---

## Что остаётся за рамками этого плана

- **Отображение плана в кабинете** (план/факт по ПФО и территориям) — следующий план, пишется после того, как этот выполнен и видно реальные цифры.
- **Привязка сотрудник → территория** и разграничение доступа — по решению пользователя отложено.
- **Всё, что касается xMark** (этапы 2 и 3 спеки) — отдельные планы.
