import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import fs from "fs";
import * as schema from "@shared/schema";
import { SEED_PRODUCTS, SEED_DISTRICTS } from "./catalogSeed";

const { Pool } = pg;

const CIRCUIT_BREAKER_COOLDOWN_MS = 120_000;

let circuitOpen = false;
let lastFailureTime = 0;
let lastSuccessTime = 0;
let consecutiveFailures = 0;
const FAILURE_THRESHOLD = 3;

export function getCircuitState() {
  if (!circuitOpen) return { open: false, consecutiveFailures };
  const elapsed = Date.now() - lastFailureTime;
  if (elapsed >= CIRCUIT_BREAKER_COOLDOWN_MS) {
    console.log('[DB Circuit Breaker] Cooldown прошёл, пробуем подключиться...');
    circuitOpen = false;
    return { open: false, consecutiveFailures };
  }
  const remainingSec = Math.ceil((CIRCUIT_BREAKER_COOLDOWN_MS - elapsed) / 1000);
  return { open: true, consecutiveFailures, remainingSec };
}

export function recordDbFailure() {
  consecutiveFailures++;
  lastFailureTime = Date.now();
  if (consecutiveFailures >= FAILURE_THRESHOLD && !circuitOpen) {
    circuitOpen = true;
    console.warn(`[DB Circuit Breaker] ОТКРЫТ — ${consecutiveFailures} неудач подряд. Пауза 120с`);
  }
}

export function recordDbSuccess() {
  if (consecutiveFailures > 0 || circuitOpen) {
    console.log('[DB Circuit Breaker] БД доступна, сброс circuit breaker');
  }
  consecutiveFailures = 0;
  circuitOpen = false;
  lastSuccessTime = Date.now();
}

export function getDbHealthStatus(): { status: string; message?: string; remainingSec?: number } {
  const circuit = getCircuitState();
  if (circuit.open) {
    return {
      status: 'circuit-open',
      message: `База данных временно недоступна. Повторная попытка через ${circuit.remainingSec}с`,
      remainingSec: circuit.remainingSec,
    };
  }
  if (lastSuccessTime === 0 && consecutiveFailures > 0) {
    return { status: 'disconnected', message: 'Соединение с базой данных не установлено' };
  }
  if (consecutiveFailures > 0) {
    return { status: 'degraded', message: `Нестабильное соединение (${consecutiveFailures} ошибок)` };
  }
  return { status: 'connected' };
}

// TLS для внешних PG. Если задан PG_CA_CERT_PATH, читаем CA и требуем проверку сертификата.
// Иначе — в dev разрешаем rejectUnauthorized: false, в prod падаем в явное предупреждение.
function buildSslConfig(isLocal: boolean) {
  if (isLocal) return false as const;
  const caPath = process.env.PG_CA_CERT_PATH;
  if (caPath) {
    try {
      const ca = fs.readFileSync(caPath, 'utf8');
      return { rejectUnauthorized: true, ca };
    } catch (err) {
      console.error(`[DB] Не удалось прочитать PG_CA_CERT_PATH=${caPath}:`, err);
    }
  }
  if (process.env.NODE_ENV === 'production') {
    console.warn('[DB] ВНИМАНИЕ: PG_CA_CERT_PATH не задан в production — TLS без проверки сертификата (MITM-риск). Укажите путь к CA Timeweb Cloud.');
  }
  return { rejectUnauthorized: false };
}

const getConnectionConfig = () => {
  // Supabase / любой стандартный PostgreSQL connection string
  if (process.env.DATABASE_URL) {
    const url = process.env.DATABASE_URL;
    const isLocal = url.includes('localhost') || url.includes('127.0.0.1');
    console.log(`[DB] Подключение через DATABASE_URL`);
    return {
      connectionString: url,
      ssl: buildSslConfig(isLocal),
      max: 3,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 30000,
      statement_timeout: 120000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      allowExitOnIdle: false,
    };
  }

  // Fallback: Timeweb Cloud отдельные переменные
  if (process.env.POSTGRESQL_HOST && process.env.POSTGRESQL_USER && process.env.POSTGRESQL_PASSWORD && process.env.POSTGRESQL_DBNAME) {
    const host = process.env.POSTGRESQL_HOST;
    const port = parseInt(process.env.POSTGRESQL_PORT || "5432");
    const user = process.env.POSTGRESQL_USER;
    const database = process.env.POSTGRESQL_DBNAME;
    const isLocal = host === 'localhost' || host === '127.0.0.1';
    console.log(`[DB] Подключение к внешней БД: ${user}@${host}:${port}/${database}`);
    return {
      host,
      port,
      user,
      password: process.env.POSTGRESQL_PASSWORD,
      database,
      ssl: buildSslConfig(isLocal),
      max: 3,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 30000,
      statement_timeout: 120000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      allowExitOnIdle: false,
    };
  }

  throw new Error(
    "[DB] ОШИБКА: Не найдены переменные подключения к БД. " +
    "Задайте DATABASE_URL (Supabase) или POSTGRESQL_HOST/USER/PASSWORD/DBNAME в файле .env"
  );
};

export const pool = new Pool(getConnectionConfig());

pool.on('error', (err) => {
  console.error('[DB Pool] Фоновая ошибка соединения (не краш):', err.message);
  recordDbFailure();
});

export const db = drizzle(pool, { schema });

async function initDatabase(retries = 2, delayMs = 15000): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await pool.query('SELECT 1');
      recordDbSuccess();
      break;
    } catch (err: any) {
      console.warn(`[DB Init] Попытка ${attempt}/${retries}: ${err.message}`);
      recordDbFailure();
      if (attempt === retries) {
        console.error('[DB Init] БД недоступна при старте. Сервер запустится, подключение произойдёт позже.');
        return;
      }
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  await initSchema();
}

async function initSchema(): Promise<void> {
  try {
    await pool.query('CREATE SCHEMA IF NOT EXISTS world_medicine');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS world_medicine.raw_sales_rows (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        upload_id VARCHAR(100) NOT NULL,
        year INTEGER,
        month VARCHAR(10),
        region VARCHAR(500),
        city VARCHAR(500),
        settlement VARCHAR(500),
        district VARCHAR(500),
        contragent VARCHAR(1000),
        drug VARCHAR(1000),
        complex_drug_name VARCHAR(1000),
        quantity NUMERIC(15, 2),
        amount NUMERIC(15, 2),
        disposal_type VARCHAR(500),
        disposal_type_code VARCHAR(50),
        federal_district VARCHAR(500),
        receiver_type VARCHAR(500),
        contractor_group VARCHAR(500),
        address TEXT,
        day INTEGER
      )
    `);
    await pool.query(`
      ALTER TABLE world_medicine.raw_sales_rows ADD COLUMN IF NOT EXISTS day INTEGER
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_raw_sales_rows_user_upload
      ON world_medicine.raw_sales_rows (user_id, upload_id)
    `);
    console.log('[DB] Таблица raw_sales_rows готова');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS world_medicine.upload_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        upload_id VARCHAR(100) NOT NULL,
        filename VARCHAR(500) NOT NULL,
        status VARCHAR(50) NOT NULL,
        rows_count INTEGER,
        year_period INTEGER,
        month_period VARCHAR(50),
        is_active BOOLEAN DEFAULT true NOT NULL,
        error_message TEXT,
        uploaded_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_upload_history_user
      ON world_medicine.upload_history (user_id)
    `);
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='world_medicine' AND table_name='upload_history' AND column_name='upload_id') THEN
          ALTER TABLE world_medicine.upload_history ADD COLUMN upload_id VARCHAR(100) NOT NULL DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='world_medicine' AND table_name='upload_history' AND column_name='year_period') THEN
          ALTER TABLE world_medicine.upload_history ADD COLUMN year_period INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='world_medicine' AND table_name='upload_history' AND column_name='month_period') THEN
          ALTER TABLE world_medicine.upload_history ADD COLUMN month_period VARCHAR(50);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='world_medicine' AND table_name='upload_history' AND column_name='is_active') THEN
          ALTER TABLE world_medicine.upload_history ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL;
        END IF;
      END $$;
    `);
    console.log('[DB] Таблица upload_history готова');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS world_medicine.population_data (
        id SERIAL PRIMARY KEY,
        region_name VARCHAR(500) NOT NULL,
        population INTEGER NOT NULL,
        federal_district VARCHAR(500),
        manager_name VARCHAR(200)
      )
    `);
    console.log('[DB] Таблица population_data готова');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS world_medicine.employees_data (
        id SERIAL PRIMARY KEY,
        employee_name VARCHAR(500) NOT NULL,
        role VARCHAR(50) NOT NULL,
        manager_name VARCHAR(500),
        regions TEXT
      )
    `);
    console.log('[DB] Таблица employees_data готова');

    // Журнал аудита: login, CRUD пользователей/сотрудников/препаратов/
    // территорий, очистка данных. Читается админом в «Журнале активности».
    await pool.query(`
      CREATE TABLE IF NOT EXISTS world_medicine.audit_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INTEGER,
        old_value JSONB,
        new_value JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log('[DB] Таблица audit_log готова');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS world_medicine.products (
        id SERIAL PRIMARY KEY,
        code VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(500) NOT NULL,
        full_name VARCHAR(1000),
        short_name VARCHAR(100),
        price NUMERIC(15,2) DEFAULT 0,
        quota2025 INTEGER DEFAULT 0,
        budget2025 NUMERIC(15,2) DEFAULT 0,
        category VARCHAR(200),
        is_active BOOLEAN DEFAULT true NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log('[DB] Таблица products готова');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS world_medicine.federal_districts (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(500) NOT NULL,
        short_name VARCHAR(50),
        color VARCHAR(20),
        icon VARCHAR(10),
        sort_order INTEGER DEFAULT 0
      )
    `);
    console.log('[DB] Таблица federal_districts готова');

    // В БД может жить ПУСТАЯ legacy-таблица territories старой Drizzle-схемы
    // (id integer, level, population — без district_id/budget2025). Каталожный
    // CRUD админки ждёт новую схему. Пустую legacy переименовываем и создаём
    // новую; непустую не трогаем (там чьи-то данные — только предупреждение).
    try {
      const legacyCheck = await pool.query(`
        SELECT
          EXISTS (SELECT 1 FROM information_schema.tables
                  WHERE table_schema='world_medicine' AND table_name='territories') AS has_table,
          NOT EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_schema='world_medicine' AND table_name='territories'
                        AND column_name='district_id') AS is_legacy
      `);
      if (legacyCheck.rows[0].has_table && legacyCheck.rows[0].is_legacy) {
        const cnt = await pool.query(`SELECT COUNT(*)::int AS n FROM world_medicine.territories`);
        if (cnt.rows[0].n === 0) {
          await pool.query(`ALTER TABLE world_medicine.territories RENAME TO territories_legacy`);
          console.log('[DB] Пустая legacy-таблица territories переименована в territories_legacy');
        } else {
          console.warn(`[DB] territories имеет legacy-схему и ${cnt.rows[0].n} строк — каталожный CRUD территорий работать не будет, нужна ручная миграция`);
        }
      }
    } catch (renameErr: any) {
      console.warn('[DB] Проверка legacy territories:', renameErr.message);
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS world_medicine.territories (
        id VARCHAR(100) PRIMARY KEY,
        district_id VARCHAR(50) NOT NULL REFERENCES world_medicine.federal_districts(id) ON DELETE CASCADE,
        name VARCHAR(500) NOT NULL,
        budget2025 NUMERIC(15,2) DEFAULT 0,
        budget2026 NUMERIC(15,2) DEFAULT 0,
        coefficient NUMERIC(5,4) DEFAULT 0,
        sort_order INTEGER DEFAULT 0
      )
    `);
    console.log('[DB] Таблица territories готова');

    // ==================== SEED КАТАЛОГОВ ====================
    // Пустые таблицы каталога → первичное заполнение из статических данных
    // (catalogSeed.ts). После этого источник правды — БД: админка правит
    // цены/квоты/бюджеты, аналитика подтягивает их через API.
    try {
      const prodCount = await pool.query(`SELECT COUNT(*)::int AS n FROM world_medicine.products`);
      if (prodCount.rows[0].n === 0) {
        for (const p of SEED_PRODUCTS) {
          await pool.query(
            `INSERT INTO world_medicine.products (code, name, short_name, price, quota2025, budget2025, category, sort_order)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (code) DO NOTHING`,
            [p.code, p.name, p.short_name, p.price, p.quota2025, p.budget2025, p.category, p.sort_order]
          );
        }
        console.log(`[DB] Seed: products заполнены (${SEED_PRODUCTS.length})`);
      }

      // Округа и территории сидируются НЕЗАВИСИМО (ON CONFLICT DO NOTHING
      // делает повтор идемпотентным) — если прошлый seed упал на середине,
      // недостающее досеется при следующем старте.
      const distCount = await pool.query(`SELECT COUNT(*)::int AS n FROM world_medicine.federal_districts`);
      if (distCount.rows[0].n < SEED_DISTRICTS.length) {
        for (const d of SEED_DISTRICTS) {
          await pool.query(
            `INSERT INTO world_medicine.federal_districts (id, name, short_name, color, icon, sort_order)
             VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
            [d.id, d.name, d.short_name, d.color, d.icon, d.sort_order]
          );
        }
        console.log(`[DB] Seed: federal_districts дозаполнены (${SEED_DISTRICTS.length})`);
      }

      const terrSeedTotal = SEED_DISTRICTS.reduce((s, d) => s + d.territories.length, 0);
      const terrCount = await pool.query(`SELECT COUNT(*)::int AS n FROM world_medicine.territories`);
      if (terrCount.rows[0].n < terrSeedTotal) {
        for (const d of SEED_DISTRICTS) {
          for (const t of d.territories) {
            await pool.query(
              `INSERT INTO world_medicine.territories (id, district_id, name, budget2025, sort_order)
               VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
              [t.id, d.id, t.name, t.budget2025, t.sort_order]
            );
          }
        }
        console.log(`[DB] Seed: territories дозаполнены (${terrSeedTotal})`);
      }
    } catch (seedErr: any) {
      console.warn('[DB] Ошибка seed каталогов:', seedErr.message);
    }

    const staleResult = await pool.query(
      `UPDATE world_medicine.upload_history SET status = 'error', error_message = 'Загрузка прервана (перезапуск сервера)' WHERE status = 'processing' AND uploaded_at < NOW() - INTERVAL '30 minutes'`
    );
    if (staleResult.rowCount && staleResult.rowCount > 0) {
      console.log(`[DB] Очищено ${staleResult.rowCount} зависших записей processing → error`);
    }

    try {
      const orphanedResult = await pool.query(
        `DELETE FROM world_medicine.raw_sales_rows WHERE upload_id NOT IN (SELECT upload_id FROM world_medicine.upload_history WHERE status IN ('success', 'processing'))`
      );
      if (orphanedResult.rowCount && orphanedResult.rowCount > 0) {
        console.log(`[DB] Очищено ${orphanedResult.rowCount} осиротевших raw_sales_rows`);
      }
    } catch (cleanupErr: any) {
      console.warn('[DB] Ошибка очистки raw_sales_rows:', cleanupErr.message);
    }

    recordDbSuccess();
  } catch (err: any) {
    console.error('[DB] Ошибка инициализации:', err.message);
    recordDbFailure();
  }
}

export async function getHeavyClient(): Promise<import('pg').PoolClient> {
  const client = await pool.connect();
  await client.query("SET statement_timeout = '600s'");
  return client;
}

export async function getCopyClient(): Promise<import('pg').PoolClient> {
  const client = await pool.connect();
  await client.query("SET statement_timeout = '1800s'");
  return client;
}

export async function safeQuery(text: string, params?: any[]): Promise<any> {
  const circuit = getCircuitState();
  if (circuit.open) {
    const err: any = new Error(`База данных недоступна, следующая попытка через ${circuit.remainingSec}с`);
    err.code = 'CIRCUIT_OPEN';
    throw err;
  }
  try {
    const result = await pool.query(text, params);
    recordDbSuccess();
    return result;
  } catch (err: any) {
    const msg = (err?.message || '').toLowerCase();
    const isTransient = msg.includes('shutting down') || msg.includes('econnreset') || msg.includes('econnrefused') || msg.includes('connection terminated') || msg.includes('57p03');
    if (isTransient) recordDbFailure();
    throw err;
  }
}

initDatabase();
