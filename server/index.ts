import 'dotenv/config';
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Busboy from "busboy";
import { storage } from "./storage";
import { pool, getCircuitState, recordDbFailure, recordDbSuccess, safeQuery, getDbHealthStatus, getHeavyClient } from "./db";
import { processCSVFileStreaming, getProcessingStatus, getAllProcessingJobs, generateFileId, cleanupFile, updateProcessingStatus } from "./fileProcessor";
import { createCompactSummaryRows } from "./aggregateData";
import { createTabDataRouter, invalidateUserCache } from "./tabDataRoutes";
import { loadPopulationData } from "./loadPopulation";
import { loadEmployeesData } from "./loadEmployees";
import { createAdminRouter } from "./adminRoutes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import {
  loginSchema,
  registerSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
  reportSchema,
  planSchema,
  uploadSchema,
  salesBatchSchema,
  yearlySalesDataSchema,
  parseIntParam,
  sanitizeString,
} from "./validation";

const COMPACT_CHUNK_SIZE = 15000;

async function readCompactRows(userId: number, externalClient?: import('pg').PoolClient): Promise<{ rows: any[]; contragentRows: any[] }> {
  const sql = `SELECT data_type, aggregated_data FROM world_medicine.yearly_sales_data WHERE user_id = $1 AND year = 9999 AND data_type LIKE 'compactRows%' ORDER BY data_type`;
  const result = externalClient
    ? await externalClient.query(sql, [userId])
    : await safeQuery(sql, [userId]);
  if (result.rows.length === 0) return { rows: [], contragentRows: [] };
  
  if (result.rows.length === 1 && result.rows[0].data_type === 'compactRows') {
    const data = result.rows[0].aggregated_data;
    return { rows: data.rows || [], contragentRows: data.contragentRows || [] };
  }
  
  let allRows: any[] = [];
  let allContra: any[] = [];
  for (const rec of result.rows) {
    const d = rec.aggregated_data;
    if (d.rows) allRows = allRows.concat(d.rows);
    if (d.contragentRows) allContra = allContra.concat(d.contragentRows);
  }
  return { rows: allRows, contragentRows: allContra };
}

async function writeCompactRows(userId: number, rows: any[], contragentRows: any[], meta?: Record<string, any>): Promise<void> {
  if (rows.length === 0 && contragentRows.length === 0) {
    await safeQuery(
      `DELETE FROM world_medicine.yearly_sales_data WHERE user_id = $1 AND year = 9999 AND data_type LIKE 'compactRows%'`,
      [userId]
    );
    return;
  }

  const totalSize = JSON.stringify(rows).length + JSON.stringify(contragentRows).length;
  const needsChunking = totalSize > 10 * 1024 * 1024;

  const client = await getHeavyClient();
  try {
    await client.query('BEGIN');

    await client.query(
      `DELETE FROM world_medicine.yearly_sales_data WHERE user_id = $1 AND year = 9999 AND data_type LIKE 'compactRows%'`,
      [userId]
    );

    if (!needsChunking) {
      const jsonStr = JSON.stringify({ rows, contragentRows, ...meta });
      console.log(`[CompactWrite] Single record: ${(jsonStr.length / 1024 / 1024).toFixed(2)} MB`);
      await client.query(
        `INSERT INTO world_medicine.yearly_sales_data (user_id, year, data_type, aggregated_data, created_at, updated_at) VALUES ($1, 9999, 'compactRows', $2::jsonb, NOW(), NOW())`,
        [userId, jsonStr]
      );
    } else {
      const rowChunks: any[][] = [];
      for (let i = 0; i < rows.length; i += COMPACT_CHUNK_SIZE) {
        rowChunks.push(rows.slice(i, i + COMPACT_CHUNK_SIZE));
      }

      const contraChunks: any[][] = [];
      for (let i = 0; i < contragentRows.length; i += COMPACT_CHUNK_SIZE) {
        contraChunks.push(contragentRows.slice(i, i + COMPACT_CHUNK_SIZE));
      }

      const totalChunks = Math.max(rowChunks.length, contraChunks.length);
      console.log(`[CompactWrite] Chunked: ${totalChunks} chunks, ${rows.length} rows + ${contragentRows.length} contra, total ~${(totalSize / 1024 / 1024).toFixed(1)} MB`);

      for (let i = 0; i < totalChunks; i++) {
        const chunkData: any = {};
        if (i < rowChunks.length) chunkData.rows = rowChunks[i];
        else chunkData.rows = [];
        if (i < contraChunks.length) chunkData.contragentRows = contraChunks[i];
        else chunkData.contragentRows = [];
        if (i === 0 && meta) Object.assign(chunkData, meta);

        const chunkJson = JSON.stringify(chunkData);
        const dataType = i === 0 ? 'compactRows' : `compactRows_${i}`;

        await client.query(
          `INSERT INTO world_medicine.yearly_sales_data (user_id, year, data_type, aggregated_data, created_at, updated_at) VALUES ($1, 9999, $2, $3::jsonb, NOW(), NOW())`,
          [userId, dataType, chunkJson]
        );
        console.log(`[CompactWrite] Chunk ${i + 1}/${totalChunks} (${dataType}): ${(chunkJson.length / 1024 / 1024).toFixed(2)} MB ✓`);
      }
    }

    await client.query('COMMIT');
    console.log(`[CompactWrite] Transaction committed successfully`);
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`[CompactWrite] Transaction ROLLBACK — старые данные сохранены: ${err.message}`);
    throw err;
  } finally {
    client.release();
  }
}

const app = express();
app.set('trust proxy', 1);
const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable is required");
  process.exit(1);
}
const JWT_EXPIRES_IN = "7d";

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Слишком много попыток. Попробуйте через 15 минут." },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: "Превышен лимит запросов. Подождите." },
  standardHeaders: true,
  legacyHeaders: false,
});

interface AuthRequest extends Request {
  userId?: number;
  userRole?: string;
}

function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Требуется авторизация" });
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; role: string };
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Недействительный токен" });
  }
}

function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== "admin") {
    return res.status(403).json({ error: "Доступ запрещён: требуются права администратора" });
  }
  next();
}

function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:3001', 'http://localhost:5000'];

app.use(cors({
  origin: (origin, callback) => {
    // Разрешить запросы без origin (мобильные, Postman)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} не разрешён`));
  },
  credentials: true,
}));
app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ extended: true, limit: "500mb" }));
app.use("/api", apiLimiter);

const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const UPLOAD_ERROR_LOG = path.join(__dirname, '../upload-errors.log');

function classifyUploadError(error: any): string {
  const originalMsg = error?.message || String(error);
  const msg = originalMsg.toLowerCase();
  if (msg.includes('не найдены необходимые колонки')) {
    return originalMsg;
  }
  if (msg.includes('пуст') || msg.includes('0 байт') || msg.includes('empty')) {
    return 'Файл пуст или не содержит данных.';
  }
  if (msg.includes('лимит') || msg.includes('too large') || msg.includes('превысил')) {
    return 'Файл превышает максимальный размер (1 ГБ).';
  }
  if (msg.includes('формат') || msg.includes('unsupported') || msg.includes('неподдерживаемый')) {
    return 'Неподдерживаемый формат файла. Загрузите .csv, .xlsx или .xls';
  }
  if (msg.includes('дубликат') || msg.includes('уже загружен') || msg.includes('duplicate')) {
    return 'Файл с таким названием уже загружен. Удалите предыдущую версию в Истории загрузок.';
  }
  if (msg.includes('shutting down') || msg.includes('57p03')) {
    return 'Сервер базы данных перезагружается. Попробуйте загрузить файл через минуту.';
  }
  if (msg.includes('connect') || msg.includes('econnrefused') || msg.includes('connection') || msg.includes('pool') || msg.includes('timeout') && (msg.includes('database') || msg.includes('postgres') || msg.includes('подключен'))) {
    return 'Ошибка сервера при сохранении данных. Попробуйте ещё раз.';
  }
  if (msg.includes('timeout') || msg.includes('таймаут') || msg.includes('timed out') || msg.includes('aborted')) {
    return 'Загрузка прервалась. Попробуйте ещё раз — файл загрузится с того места где остановился.';
  }
  const shortMsg = originalMsg.length > 200 ? originalMsg.substring(0, 200) + '...' : originalMsg;
  return `Ошибка обработки файла: ${shortMsg}. Обратитесь к администратору.`;
}

async function withDbRetry<T>(
  fn: () => Promise<T>,
  options?: { 
    maxRetries?: number; 
    onRetry?: (attempt: number, maxRetries: number, err: Error) => void;
    label?: string;
  }
): Promise<T> {
  const circuit = getCircuitState();
  if (circuit.open) {
    const msg = `База данных недоступна, следующая попытка через ${circuit.remainingSec}с`;
    console.log(`[DB Circuit Breaker] ${options?.label || 'Query'}: запрос отклонён — ${msg}`);
    const err: any = new Error(msg);
    err.statusCode = 503;
    err.isCircuitBreaker = true;
    throw err;
  }

  const maxRetries = options?.maxRetries ?? 1;
  const delays = [60000, 60000];
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const result = await fn();
      recordDbSuccess();
      return result;
    } catch (err: any) {
      lastError = err;
      const msg = (err?.message || '').toLowerCase();
      const isTransient = msg.includes('shutting down') || 
        msg.includes('econnreset') || 
        msg.includes('econnrefused') ||
        msg.includes('connection terminated') ||
        msg.includes('too many clients') ||
        msg.includes('remaining connection slots') ||
        msg.includes('57p03');
      
      if (isTransient) {
        recordDbFailure();
      }

      if (!isTransient || attempt > maxRetries) {
        throw err;
      }

      const circuitNow = getCircuitState();
      if (circuitNow.open) {
        console.log(`[DB Circuit Breaker] ${options?.label || 'Query'}: circuit breaker сработал после попытки ${attempt}, пауза ${circuitNow.remainingSec}с`);
        const cbErr: any = new Error(`База данных недоступна, следующая попытка через ${circuitNow.remainingSec}с`);
        cbErr.statusCode = 503;
        cbErr.isCircuitBreaker = true;
        throw cbErr;
      }
      
      const delay = delays[attempt - 1] || 60000;
      console.log(`[DB Retry] ${options?.label || 'Query'}: попытка ${attempt}/${maxRetries} не удалась (${err.message}), повтор через ${delay/1000}с...`);
      if (options?.onRetry) {
        options.onRetry(attempt, maxRetries, err);
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

function logUploadError(message: string, error?: any) {
  const timestamp = new Date().toISOString();
  const errorText = error ? (error.stack || error.message || String(error)) : '';
  const logLine = `[${timestamp}] ${message}${errorText ? '\n' + errorText : ''}\n`;
  console.error(logLine.trim());
  try {
    fs.appendFileSync(UPLOAD_ERROR_LOG, logLine);
    const stats = fs.statSync(UPLOAD_ERROR_LOG);
    if (stats.size > 10 * 1024 * 1024) {
      const content = fs.readFileSync(UPLOAD_ERROR_LOG, 'utf-8');
      const lines = content.split('\n');
      const half = lines.slice(Math.floor(lines.length / 2));
      fs.writeFileSync(UPLOAD_ERROR_LOG, half.join('\n'));
    }
  } catch {}
}

app.use("/api/tab", createTabDataRouter(authMiddleware));
app.use("/api/admin", createAdminRouter(authMiddleware, safeQuery, storage));

app.get("/api/health", (_req, res) => {
  res.json(getDbHealthStatus());
});

app.get("/api/th-inspect", authMiddleware, requireAdmin, async (_req: AuthRequest, res) => {
  try {
    const reqUserId = parseInt((_req.query.userId as string) || '0');
    let userId = reqUserId || _req.userId!;
    if (reqUserId) {
      userId = reqUserId;
    }
    const yearlyData = await storage.getAggregatedDataByUser(userId);
    const { enrichTerritoryHierarchy } = await import('./tabDataRoutes');
    const result = yearlyData.map(y => {
      const data = y.aggregatedData as any;
      enrichTerritoryHierarchy(data);
      const th = data.territoryHierarchy || {};
      const fds = th.federalDistricts || {};
      const regions = th.regions || {};
      const fdInfo: Record<string, any> = {};
      for (const [name, fd] of Object.entries(fds) as [string, any][]) {
        fdInfo[name] = { sales: fd.sales, contragentCount: fd.contragentCount, drugSalesCount: (fd.drugSales || []).length, drugSalesTop3: (fd.drugSales || []).slice(0, 3) };
      }
      const regionInfo: Record<string, any> = {};
      for (const [name, r] of Object.entries(regions) as [string, any][]) {
        const ch = r.children || {};
        regionInfo[name] = { sales: r.sales, drugSalesCount: (r.drugSales || []).length, childrenCount: Object.keys(ch).length, childrenSample: Object.keys(ch).slice(0, 5) };
      }
      const da = data.drugAnalytics || {};
      const daKeys = Object.keys(da);
      const daSample: Record<string, any> = {};
      for (const k of daKeys.slice(0, 2)) {
        daSample[k] = { totalSales: da[k]?.totalSales, contragentSalesCount: (da[k]?.contragentSales || []).length, regionSalesCount: (da[k]?.regionSales || []).length };
      }
      return { year: y.year, fdCount: Object.keys(fds).length, fdInfo, regionCount: Object.keys(regions).length, regionInfo, drugAnalyticsCount: daKeys.length, drugAnalyticsSample: daSample };
    });
    res.json(result);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/api/diag", authMiddleware, requireAdmin, async (_req, res) => {
  try {
    const mem = process.memoryUsage();
    const memInfo = {
      rss_mb: Math.round(mem.rss / 1024 / 1024),
      heapUsed_mb: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotal_mb: Math.round(mem.heapTotal / 1024 / 1024),
      external_mb: Math.round(mem.external / 1024 / 1024),
      arrayBuffers_mb: Math.round(mem.arrayBuffers / 1024 / 1024),
    };

    const compactRowsQuery = await safeQuery(
      `SELECT user_id, data_type, LENGTH(aggregated_data::text) as size_bytes 
       FROM world_medicine.yearly_sales_data WHERE year=9999 ORDER BY user_id, data_type`
    );

    const duplicatesQuery = await safeQuery(
      `SELECT user_id, data_type, COUNT(*) as cnt 
       FROM world_medicine.yearly_sales_data WHERE year=9999 
       GROUP BY user_id, data_type HAVING COUNT(*) > 1`
    );

    const summaryQuery = await safeQuery(
      `SELECT user_id, year, COUNT(*) as records, 
              SUM(LENGTH(aggregated_data::text)) as total_bytes 
       FROM world_medicine.yearly_sales_data 
       GROUP BY user_id, year ORDER BY user_id, year`
    );

    const uploadHistoryQuery = await safeQuery(
      `SELECT id, user_id, filename, status, year_period, uploaded_at 
       FROM world_medicine.upload_history ORDER BY uploaded_at DESC LIMIT 20`
    );

    res.json({
      memory: memInfo,
      compactRows: compactRowsQuery.rows,
      duplicates: duplicatesQuery.rows,
      summary: summaryQuery.rows.map((r: any) => ({
        ...r,
        total_mb: (Number(r.total_bytes) / 1024 / 1024).toFixed(2),
      })),
      uploadHistory: uploadHistoryQuery.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/db-reset", authMiddleware, async (_req, res) => {
  try {
    const wasOpen = getCircuitState().open;
    recordDbSuccess();
    const result = await pool.query('SELECT 1');
    recordDbSuccess();
    res.json({ status: 'ok', wasOpen, message: 'Circuit breaker сброшен, БД доступна' });
  } catch (err: any) {
    recordDbFailure();
    res.json({ status: 'error', message: `Circuit breaker сброшен, но БД недоступна: ${err.message}` });
  }
});

app.get("/api/population", authMiddleware, async (_req, res) => {
  try {
    const result = await safeQuery('SELECT * FROM world_medicine.population_data ORDER BY id');
    res.json(result.rows);
  } catch (error: any) {
    console.error("Get population error:", error.message);
    res.status(500).json({ error: "Ошибка получения данных о населении" });
  }
});

app.post("/api/auth/login", authLimiter, async (req, res) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.issues[0]?.message || "Некорректные данные" });
    }

    const { email, password } = validation.data;

    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Пользователь с таким email не найден. Пожалуйста, зарегистрируйтесь." });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Неверный пароль. Проверьте правильность ввода." });
    }

    await storage.updateUserLastLogin(user.id);

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      id: user.id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Самостоятельная регистрация отключена — пользователей создаёт только администратор
app.post("/api/auth/register", (_req, res) => {
  res.status(403).json({ error: "Самостоятельная регистрация отключена. Обратитесь к администратору." });
});

// ==================== Управление пользователями (только администратор) ====================

app.get("/api/users", authMiddleware, requireAdmin, async (_req: AuthRequest, res) => {
  try {
    const allUsers = await storage.getAllUsers();
    // Не отдаём passwordHash
    const safe = allUsers.map(({ passwordHash: _ph, ...u }) => u);
    res.json(safe);
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: "Ошибка получения пользователей" });
  }
});

app.post("/api/users", authMiddleware, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { email, password, name, role, avatar } = req.body;
    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: "Обязательные поля: email, password, name, role" });
    }
    if (!email.includes('@')) {
      return res.status(400).json({ error: "Некорректный email" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Пароль должен быть не менее 8 символов" });
    }
    const existing = await storage.getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "Пользователь с таким email уже существует" });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await storage.createUser({ email, passwordHash, name, role, avatar });
    const { passwordHash: _ph, ...safe } = user;
    res.status(201).json(safe);
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ error: "Ошибка создания пользователя" });
  }
});

app.put("/api/users/:id", authMiddleware, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const { name, email, role, avatar, password } = req.body;
    if (email) {
      const existing = await storage.getUserByEmail(email);
      if (existing && existing.id !== id) {
        return res.status(409).json({ error: "Email уже используется другим пользователем" });
      }
    }
    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ error: "Пароль должен быть не менее 8 символов" });
      }
      const passwordHash = await bcrypt.hash(password, 12);
      await storage.updateUserPassword(id, passwordHash);
    }
    const updated = await storage.updateUser(id, { name, email, role, avatar });
    if (!updated) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }
    const { passwordHash: _ph, ...safe } = updated;
    res.json(safe);
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ error: "Ошибка обновления пользователя" });
  }
});

app.delete("/api/users/:id", authMiddleware, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (req.userId === id) {
      return res.status(400).json({ error: "Нельзя удалить собственный аккаунт" });
    }
    await storage.deleteUser(id);
    res.json({ success: true });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ error: "Ошибка удаления пользователя" });
  }
});

app.post("/api/auth/password-reset/request", authLimiter, async (req, res) => {
  try {
    const validation = passwordResetRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.issues[0]?.message || "Некорректные данные" });
    }

    const { email } = validation.data;

    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.json({ message: "Если email зарегистрирован, инструкции отправлены" });
    }

    const token = generateResetToken();
    const tokenHash = await bcrypt.hash(token, 10);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await storage.createPasswordResetToken({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    console.log(`Password reset requested for ${email}`);

    res.json({ message: "Если email зарегистрирован, инструкции отправлены" });
  } catch (error) {
    console.error("Password reset request error:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

app.post("/api/auth/password-reset/confirm", authLimiter, async (req, res) => {
  try {
    const validation = passwordResetConfirmSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.issues[0]?.message || "Некорректные данные" });
    }

    const { email, token, newPassword } = validation.data;

    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(400).json({ error: "Недействительный или просроченный токен" });
    }

    const resetToken = await storage.getValidPasswordResetToken(user.id);
    if (!resetToken) {
      return res.status(400).json({ error: "Недействительный или просроченный токен" });
    }

    const isValidToken = await bcrypt.compare(token, resetToken.tokenHash);
    if (!isValidToken) {
      return res.status(400).json({ error: "Недействительный или просроченный токен" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await storage.updateUserPassword(user.id, passwordHash);
    await storage.markResetTokenUsed(resetToken.id);

    res.json({ message: "Пароль успешно изменён" });
  } catch (error) {
    console.error("Password reset confirm error:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

app.get("/api/drugs", authMiddleware, async (_req, res) => {
  try {
    const drugsList = await storage.getDrugs();
    res.json(drugsList);
  } catch (error) {
    console.error("Get drugs error:", error);
    res.status(500).json({ error: "Ошибка получения списка препаратов" });
  }
});

app.get("/api/territories", authMiddleware, async (req, res) => {
  try {
    const { level } = req.query;
    const territoriesList = level 
      ? await storage.getTerritoriesByLevel(level as string)
      : await storage.getTerritories();
    res.json(territoriesList);
  } catch (error) {
    console.error("Get territories error:", error);
    res.status(500).json({ error: "Ошибка получения списка территорий" });
  }
});

app.get("/api/contragents", authMiddleware, async (req, res) => {
  try {
    const { territoryId } = req.query;
    const contragentsList = territoryId
      ? await storage.getContragentsByTerritory(Number(territoryId))
      : await storage.getContragents();
    res.json(contragentsList);
  } catch (error) {
    console.error("Get contragents error:", error);
    res.status(500).json({ error: "Ошибка получения списка контрагентов" });
  }
});

app.get("/api/sales", authMiddleware, async (req, res) => {
  try {
    const { drugId, territoryId, year } = req.query;
    const salesList = await storage.getSalesByFilters({
      drugId: drugId ? Number(drugId) : undefined,
      territoryId: territoryId ? Number(territoryId) : undefined,
      year: year ? Number(year) : undefined,
    });
    res.json(salesList);
  } catch (error) {
    console.error("Get sales error:", error);
    res.status(500).json({ error: "Ошибка получения данных о продажах" });
  }
});

app.post("/api/sales/batch", authMiddleware, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { sales } = req.body;
    if (!Array.isArray(sales)) {
      return res.status(400).json({ error: "sales должен быть массивом" });
    }
    await storage.createSalesBatch(sales);
    res.json({ success: true, count: sales.length });
  } catch (error) {
    console.error("Batch sales error:", error);
    res.status(500).json({ error: "Ошибка сохранения данных о продажах" });
  }
});

app.get("/api/reports/:userId", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = Number(req.params.userId);
    if (req.userId !== userId) {
      return res.status(403).json({ error: "Доступ запрещён" });
    }
    const reports = await storage.getSavedReportsByUser(userId);
    res.json(reports);
  } catch (error) {
    console.error("Get reports error:", error);
    res.status(500).json({ error: "Ошибка получения отчётов" });
  }
});

app.post("/api/reports", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const validation = reportSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.issues[0]?.message || "Некорректные данные" });
    }

    if (validation.data.userId !== req.userId) {
      return res.status(403).json({ error: "Доступ запрещён" });
    }

    const report = await storage.createSavedReport(validation.data);
    res.json(report);
  } catch (error) {
    console.error("Create report error:", error);
    res.status(500).json({ error: "Ошибка сохранения отчёта" });
  }
});

app.delete("/api/reports/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const reportId = parseIntParam(idParam);
    if (!reportId) {
      return res.status(400).json({ error: "Некорректный ID отчёта" });
    }

    const report = await storage.getSavedReportById(reportId);
    if (!report) {
      return res.status(404).json({ error: "Отчёт не найден" });
    }

    if (report.userId !== req.userId) {
      return res.status(403).json({ error: "Доступ запрещён" });
    }

    await storage.deleteSavedReport(reportId);
    res.json({ success: true });
  } catch (error) {
    console.error("Delete report error:", error);
    res.status(500).json({ error: "Ошибка удаления отчёта" });
  }
});

app.get("/api/plans/:userId", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = Number(req.params.userId);
    if (req.userId !== userId) {
      return res.status(403).json({ error: "Доступ запрещён" });
    }
    const plans = await storage.getSavedPlansByUser(userId);
    res.json(plans);
  } catch (error) {
    console.error("Get plans error:", error);
    res.status(500).json({ error: "Ошибка получения планов" });
  }
});

app.post("/api/plans", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const validation = planSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.issues[0]?.message || "Некорректные данные" });
    }

    if (validation.data.userId !== req.userId) {
      return res.status(403).json({ error: "Доступ запрещён" });
    }

    const plan = await storage.createSavedPlan(validation.data);
    res.json(plan);
  } catch (error) {
    console.error("Create plan error:", error);
    res.status(500).json({ error: "Ошибка сохранения плана" });
  }
});

app.patch("/api/plans/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const planId = parseIntParam(idParam);
    if (!planId) {
      return res.status(400).json({ error: "Некорректный ID плана" });
    }

    const plan = await storage.getSavedPlanById(planId);
    if (!plan) {
      return res.status(404).json({ error: "План не найден" });
    }

    if (plan.userId !== req.userId) {
      return res.status(403).json({ error: "Доступ запрещён" });
    }

    const { planValue, isLocked } = req.body;
    await storage.updateSavedPlan(planId, planValue, isLocked);
    res.json({ success: true });
  } catch (error) {
    console.error("Update plan error:", error);
    res.status(500).json({ error: "Ошибка обновления плана" });
  }
});

app.get("/api/uploads/:userId", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = Number(req.params.userId);
    if (req.userId !== userId) {
      return res.status(403).json({ error: "Доступ запрещён" });
    }
    const uploads = await storage.getUploadHistoryByUser(userId);
    res.json(uploads);
  } catch (error) {
    console.error("Get uploads error:", error);
    res.status(500).json({ error: "Ошибка получения истории загрузок" });
  }
});

app.post("/api/uploads", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const validation = uploadSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.issues[0]?.message || "Некорректные данные" });
    }

    if (validation.data.userId !== req.userId) {
      return res.status(403).json({ error: "Доступ запрещён" });
    }

    const upload = await storage.createUploadHistory({
      ...validation.data,
      uploadId: `legacy_${Date.now()}`,
    });
    res.json(upload);
  } catch (error) {
    console.error("Create upload error:", error);
    res.status(500).json({ error: "Ошибка сохранения информации о загрузке" });
  }
});

app.get("/api/yearly-data/:userId", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = Number(req.params.userId);
    if (req.userId !== userId) {
      return res.status(403).json({ error: "Доступ запрещён" });
    }
    const data = await storage.getYearlySalesDataByUser(userId);
    res.json(data);
  } catch (error) {
    console.error("Get yearly data error:", error);
    res.status(500).json({ error: "Ошибка получения данных" });
  }
});

app.get("/api/yearly-data/:userId/:year", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = Number(req.params.userId);
    const year = Number(req.params.year);
    if (req.userId !== userId) {
      return res.status(403).json({ error: "Доступ запрещён" });
    }
    const data = await storage.getYearlySalesDataByUserAndYear(userId, year);
    res.json(data || null);
  } catch (error) {
    console.error("Get yearly data by year error:", error);
    res.status(500).json({ error: "Ошибка получения данных" });
  }
});

app.post("/api/yearly-data", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const validation = yearlySalesDataSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.issues[0]?.message || "Некорректные данные" });
    }

    if (validation.data.userId !== req.userId) {
      return res.status(403).json({ error: "Доступ запрещён" });
    }

    const data = await storage.upsertYearlySalesData(validation.data);
    invalidateUserCache(req.userId!);
    res.json(data);
  } catch (error) {
    console.error("Save yearly data error:", error);
    res.status(500).json({ error: "Ошибка сохранения данных" });
  }
});

import { generateAnalyticsComment } from "./replit_integrations/analytics";

app.post("/api/analytics/generate-comment", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { salesData } = req.body;
    if (!salesData) {
      return res.status(400).json({ error: "Данные для анализа не предоставлены" });
    }
    
    const comment = await generateAnalyticsComment(salesData);
    res.json({ comment });
  } catch (error) {
    console.error("AI Analytics error:", error);
    res.status(500).json({ error: "Ошибка генерации комментария" });
  }
});

// Budget Scenarios API
app.get("/api/budget-scenarios/:userId", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = parseIntParam(req.params.userId as string);
    if (!userId) {
      return res.status(400).json({ error: "Неверный ID пользователя" });
    }
    const scenarios = await storage.getBudgetScenariosByUser(userId);
    res.json(scenarios);
  } catch (error) {
    console.error("Get budget scenarios error:", error);
    res.status(500).json({ error: "Ошибка получения сценариев" });
  }
});

app.post("/api/budget-scenarios", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { userId, name, currentBudget, growthPercent, targetBudget, drugs, districtShares } = req.body;
    
    if (!userId || !name || currentBudget === undefined || growthPercent === undefined) {
      return res.status(400).json({ error: "Недостаточно данных для создания сценария" });
    }

    const scenario = await storage.createBudgetScenario({
      userId: parseInt(userId),
      name: sanitizeString(name),
      currentBudget: String(currentBudget),
      growthPercent: String(growthPercent),
      targetBudget: String(targetBudget),
      drugs: drugs || [],
      districtShares: districtShares || {},
    });
    
    res.status(201).json(scenario);
  } catch (error) {
    console.error("Create budget scenario error:", error);
    res.status(500).json({ error: "Ошибка создания сценария" });
  }
});

app.put("/api/budget-scenarios/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = parseIntParam(req.params.id as string);
    if (!id) {
      return res.status(400).json({ error: "Неверный ID сценария" });
    }

    const { name, currentBudget, growthPercent, targetBudget, drugs, districtShares } = req.body;
    
    const scenario = await storage.updateBudgetScenario(id, {
      name: name ? sanitizeString(name) : undefined,
      currentBudget: currentBudget !== undefined ? String(currentBudget) : undefined,
      growthPercent: growthPercent !== undefined ? String(growthPercent) : undefined,
      targetBudget: targetBudget !== undefined ? String(targetBudget) : undefined,
      drugs,
      districtShares,
    });
    
    res.json(scenario);
  } catch (error) {
    console.error("Update budget scenario error:", error);
    res.status(500).json({ error: "Ошибка обновления сценария" });
  }
});

app.delete("/api/budget-scenarios/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = parseIntParam(req.params.id as string);
    if (!id) {
      return res.status(400).json({ error: "Неверный ID сценария" });
    }

    const scenario = await storage.getBudgetScenarioById(id);
    if (!scenario) {
      return res.status(404).json({ error: "Сценарий не найден" });
    }

    if (scenario.userId !== req.userId) {
      return res.status(403).json({ error: "Нет доступа к этому сценарию" });
    }

    await storage.deleteBudgetScenario(id);
    res.json({ success: true });
  } catch (error) {
    console.error("Delete budget scenario error:", error);
    res.status(500).json({ error: "Ошибка удаления сценария" });
  }
});

// Drug Prices API
app.get("/api/drug-prices", authMiddleware, async (_req: AuthRequest, res) => {
  try {
    const result = await safeQuery("SELECT id, drug_pattern, drug_label, price_per_unit FROM world_medicine.drug_prices ORDER BY drug_label");
    res.json(result.rows);
  } catch (error: any) {
    console.error("[DrugPrices] Ошибка:", error.message);
    res.status(500).json({ error: "Ошибка загрузки прайс-листа" });
  }
});

// Upload History API
app.get("/api/upload-history", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const history = await storage.getUploadHistoryByUser(req.userId!);
    res.json(history);
  } catch (error) {
    console.error("Get upload history error:", error);
    res.status(500).json({ error: "Ошибка получения истории загрузок" });
  }
});

app.patch("/api/upload-history/:id/toggle", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const userId = req.userId!;
    const { isActive } = req.body;
    await storage.toggleUploadActive(id, isActive, userId);

    const compactData = await readCompactRows(userId);
    const allRows = compactData.rows;
    const allContra = compactData.contragentRows;

    if (allRows.length > 0 || allContra.length > 0) {
      const activeUploadIds = await storage.getActiveUploadIds(userId);
      const activeSet = new Set(activeUploadIds);

      const hasUploadIds = allRows.some((r: any) => r.uploadId);

      if (hasUploadIds) {
        const activeRows = allRows.filter((r: any) => activeSet.has(r.uploadId));
        const activeContra = allContra.filter((r: any) => activeSet.has(r.uploadId));

        console.log(`[Toggle] userId=${userId}, uploadId toggle id=${id}, isActive=${isActive}`);
        console.log(`[Toggle] CompactRows: all=${allRows.length}, active=${activeRows.length}`);

        const allYears = new Set<number>();
        for (const row of allRows) {
          if (row.year && Number(row.year) > 0 && Number(row.year) < 9000) {
            allYears.add(Number(row.year));
          }
        }

        const { reaggregateFromCompactRows } = await import('./sqlAggregator');

        for (const year of allYears) {
          const yearActiveRows = activeRows.filter((r: any) => Number(r.year) === year);
          const yearActiveContra = activeContra.filter((r: any) => Number(r.year) === year);

          if (yearActiveRows.length === 0) {
            await safeQuery(
              `DELETE FROM world_medicine.yearly_sales_data WHERE user_id = $1 AND year = $2 AND data_type = 'sales'`,
              [userId, year]
            );
            console.log(`[Toggle] Год ${year}: нет активных данных, yearly_sales_data удалены`);
          } else {
            const reaggMap = reaggregateFromCompactRows(yearActiveRows, yearActiveContra);
            for (const [y, yearAgg] of reaggMap) {
              await storage.upsertYearlySalesData({
                userId,
                year: y,
                dataType: 'sales',
                aggregatedData: yearAgg,
              });
            }
            console.log(`[Toggle] Год ${year}: пересчитано из ${yearActiveRows.length} активных compact rows`);
          }
        }
      } else {
        console.log(`[Toggle] Legacy compact rows без uploadId — пересчёт невозможен, только флаг изменён`);
      }
    }

    invalidateUserCache(userId);
    res.json({ success: true });
  } catch (error) {
    console.error("Toggle upload error:", error);
    res.status(500).json({ error: "Ошибка изменения статуса" });
  }
});

app.delete("/api/upload-history/all", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    const countResult = await safeQuery(
      `SELECT COUNT(*) as cnt FROM world_medicine.upload_history WHERE user_id = $1`,
      [userId]
    );
    const fileCount = Number(countResult.rows[0]?.cnt || 0);

    const yearlyCount = await safeQuery(
      `SELECT COUNT(*) as cnt FROM world_medicine.yearly_sales_data WHERE user_id = $1`,
      [userId]
    );
    const dataCount = Number(yearlyCount.rows[0]?.cnt || 0);

    await safeQuery(`DELETE FROM world_medicine.upload_history WHERE user_id = $1`, [userId]);
    await safeQuery(`DELETE FROM world_medicine.yearly_sales_data WHERE user_id = $1`, [userId]);

    invalidateUserCache(userId);

    console.log(`[Delete ALL] user_id=${userId}: удалено ${fileCount} файлов из upload_history, ${dataCount} записей из yearly_sales_data`);
    res.json({ success: true, message: `Удалено ${fileCount} файлов и ${dataCount} записей данных` });
  } catch (error) {
    console.error("Delete all data error:", error);
    res.status(500).json({ error: "Ошибка удаления всех данных" });
  }
});

app.delete("/api/upload-history/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const userId = req.userId!;

    const historyRows = await safeQuery(
      `SELECT year_period, upload_id, filename FROM world_medicine.upload_history WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (historyRows.rows.length === 0) {
      return res.status(404).json({ error: "Запись не найдена" });
    }
    const rawYear = historyRows.rows[0]?.year_period;
    const deletedYear = rawYear ? Number(rawYear) : null;
    const deletedUploadId = historyRows.rows[0]?.upload_id;
    const deletedFilename = historyRows.rows[0]?.filename || 'unknown';

    await storage.deleteUploadHistory(id, userId);

    const remainingForYear = deletedYear ? await safeQuery(
      `SELECT COUNT(*) as cnt FROM world_medicine.upload_history WHERE user_id = $1 AND year_period = $2`,
      [userId, deletedYear]
    ) : null;
    const remainingYearCount = remainingForYear ? Number(remainingForYear.rows[0]?.cnt || 0) : 0;

    const remainingTotal = await safeQuery(
      `SELECT COUNT(*) as cnt FROM world_medicine.upload_history WHERE user_id = $1`,
      [userId]
    );
    const remainingTotalCount = Number(remainingTotal.rows[0]?.cnt || 0);

    console.log(`[Delete] user_id=${userId}, удалён файл "${deletedFilename}", год=${deletedYear}, осталось файлов за год ${deletedYear}: ${remainingYearCount}, всего файлов: ${remainingTotalCount}`);

    const compactDataDel = await readCompactRows(userId);
    const allRows = compactDataDel.rows;
    const allContra = compactDataDel.contragentRows;

    if (allRows.length > 0 || allContra.length > 0) {
      let remainingRows: any[];
      let remainingContra: any[];
      if (deletedUploadId) {
        const hasUploadIds = allRows.some((r: any) => r.uploadId);
        if (hasUploadIds) {
          remainingRows = allRows.filter((r: any) => r.uploadId !== deletedUploadId);
          remainingContra = allContra.filter((r: any) => r.uploadId !== deletedUploadId);
        } else {
          console.log(`[Delete] Legacy compact rows без uploadId, удаляем по году ${deletedYear}`);
          remainingRows = deletedYear ? allRows.filter((r: any) => Number(r.year) !== deletedYear) : allRows;
          remainingContra = deletedYear ? allContra.filter((r: any) => Number(r.year) !== deletedYear) : allContra;
        }
      } else {
        remainingRows = allRows;
        remainingContra = allContra;
      }

      console.log(`[Delete] compactRows ${allRows.length} -> ${remainingRows.length}, contragent ${allContra.length} -> ${remainingContra.length}`);

      if (remainingTotalCount === 0) {
        await safeQuery(`DELETE FROM world_medicine.yearly_sales_data WHERE user_id = $1`, [userId]);
        console.log(`[Delete] user_id=${userId}: нет файлов вообще, ВСЕ yearly_sales_data удалены (включая year=9999)`);
      } else {
        if (remainingRows.length > 0) {
          await writeCompactRows(userId, remainingRows, remainingContra, { processedAt: new Date().toISOString() });
        } else {
          await safeQuery(`DELETE FROM world_medicine.yearly_sales_data WHERE user_id = $1 AND year = 9999 AND data_type LIKE 'compactRows%'`, [userId]);
        }

        if (deletedYear && !isNaN(deletedYear) && deletedYear > 0 && deletedYear < 9000) {
          if (remainingYearCount === 0) {
            await safeQuery(
              `DELETE FROM world_medicine.yearly_sales_data WHERE user_id = $1 AND year = $2 AND data_type = 'sales'`,
              [userId, deletedYear]
            );
            console.log(`[Delete] yearly_sales_data очищена: да (год ${deletedYear}, нет файлов за этот год)`);
          } else {
            const yearRowsRemaining = remainingRows.filter((r: any) => Number(r.year) === deletedYear);
            if (yearRowsRemaining.length > 0) {
              const { reaggregateFromCompactRows } = await import('./sqlAggregator');
              const yearContraRemaining = remainingContra.filter((r: any) => Number(r.year) === deletedYear);
              const reaggMap = reaggregateFromCompactRows(yearRowsRemaining, yearContraRemaining);
              for (const [year, yearAgg] of reaggMap) {
                await storage.upsertYearlySalesData({
                  userId,
                  year,
                  dataType: 'sales',
                  aggregatedData: yearAgg,
                });
              }
              console.log(`[Delete] yearly_sales_data очищена: нет (год ${deletedYear}, пересчитано из ${yearRowsRemaining.length} compact rows)`);
            } else {
              await safeQuery(
                `DELETE FROM world_medicine.yearly_sales_data WHERE user_id = $1 AND year = $2 AND data_type = 'sales'`,
                [userId, deletedYear]
              );
              console.log(`[Delete] yearly_sales_data очищена: да (год ${deletedYear}, нет compact rows)`);
            }
          }
        }
      }
    } else {
      if (remainingTotalCount === 0) {
        await safeQuery(`DELETE FROM world_medicine.yearly_sales_data WHERE user_id = $1`, [userId]);
        console.log(`[Delete] user_id=${userId}: нет файлов и нет compactRows, ВСЕ yearly_sales_data удалены`);
      } else if (deletedYear && !isNaN(deletedYear) && deletedYear > 0 && deletedYear < 9000 && remainingYearCount === 0) {
        await safeQuery(
          `DELETE FROM world_medicine.yearly_sales_data WHERE user_id = $1 AND year = $2 AND data_type = 'sales'`,
          [userId, deletedYear]
        );
        console.log(`[Delete] yearly_sales_data очищена: да (год ${deletedYear}, нет compactRows и нет файлов за год)`);
      } else {
        console.log(`[Delete] yearly_sales_data очищена: нет (нет compactRows, но файлы за год ${deletedYear} остались: ${remainingYearCount})`);
      }
    }

    invalidateUserCache(userId);
    res.json({ success: true, message: "Загрузка удалена" });
  } catch (error) {
    console.error("Delete upload error:", error);
    res.status(500).json({ error: "Ошибка удаления загрузки" });
  }
});

// Column Mappings API
app.get("/api/column-mappings", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const mappings = await storage.getColumnMappingsByUser(req.userId!);
    res.json(mappings);
  } catch (error) {
    console.error("Get column mappings error:", error);
    res.status(500).json({ error: "Ошибка получения настроек маппинга" });
  }
});

app.post("/api/column-mappings", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { profileName, isDefault, mappings } = req.body;
    const newMapping = await storage.createColumnMapping({
      userId: req.userId!,
      profileName: sanitizeString(profileName),
      isDefault: isDefault || false,
      mappings,
    });
    res.json(newMapping);
  } catch (error) {
    console.error("Create column mapping error:", error);
    res.status(500).json({ error: "Ошибка сохранения маппинга" });
  }
});

app.put("/api/column-mappings/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = parseIntParam(String(req.params.id));
    if (!id) {
      return res.status(400).json({ error: "Неверный ID маппинга" });
    }

    const existing = await storage.getColumnMappingById(id);
    if (!existing) {
      return res.status(404).json({ error: "Маппинг не найден" });
    }
    if (existing.userId !== req.userId) {
      return res.status(403).json({ error: "Нет доступа к этому маппингу" });
    }

    const { profileName, isDefault, mappings } = req.body;
    const updated = await storage.updateColumnMapping(id, {
      profileName: profileName ? sanitizeString(profileName) : undefined,
      isDefault,
      mappings,
    });
    res.json(updated);
  } catch (error) {
    console.error("Update column mapping error:", error);
    res.status(500).json({ error: "Ошибка обновления маппинга" });
  }
});

app.delete("/api/column-mappings/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = parseIntParam(String(req.params.id));
    if (!id) {
      return res.status(400).json({ error: "Неверный ID маппинга" });
    }

    const existing = await storage.getColumnMappingById(id);
    if (!existing) {
      return res.status(404).json({ error: "Маппинг не найден" });
    }
    if (existing.userId !== req.userId) {
      return res.status(403).json({ error: "Нет доступа к этому маппингу" });
    }

    await storage.deleteColumnMapping(id);
    res.json({ success: true });
  } catch (error) {
    console.error("Delete column mapping error:", error);
    res.status(500).json({ error: "Ошибка удаления маппинга" });
  }
});

// Sales Rep Territories API
app.get("/api/sales-rep-territories", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const territories = await storage.getSalesRepTerritoriesByUser(req.userId!);
    res.json(territories);
  } catch (error) {
    console.error("Get sales rep territories error:", error);
    res.status(500).json({ error: "Ошибка получения территорий" });
  }
});

app.post("/api/sales-rep-territories", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, regions, sortOrder } = req.body;
    const newTerritory = await storage.createSalesRepTerritory({
      userId: req.userId!,
      name: sanitizeString(name),
      regions: regions || [],
      sortOrder: sortOrder || 0,
    });
    res.json(newTerritory);
  } catch (error) {
    console.error("Create sales rep territory error:", error);
    res.status(500).json({ error: "Ошибка сохранения территории" });
  }
});

app.put("/api/sales-rep-territories/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = parseIntParam(String(req.params.id));
    if (!id) {
      return res.status(400).json({ error: "Неверный ID территории" });
    }

    const existing = await storage.getSalesRepTerritoryById(id);
    if (!existing) {
      return res.status(404).json({ error: "Территория не найдена" });
    }
    if (existing.userId !== req.userId) {
      return res.status(403).json({ error: "Нет доступа к этой территории" });
    }

    const { name, regions, sortOrder } = req.body;
    const updated = await storage.updateSalesRepTerritory(id, {
      name: name ? sanitizeString(name) : undefined,
      regions,
      sortOrder,
    });
    res.json(updated);
  } catch (error) {
    console.error("Update sales rep territory error:", error);
    res.status(500).json({ error: "Ошибка обновления территории" });
  }
});

app.delete("/api/sales-rep-territories/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = parseIntParam(String(req.params.id));
    if (!id) {
      return res.status(400).json({ error: "Неверный ID территории" });
    }

    const existing = await storage.getSalesRepTerritoryById(id);
    if (!existing) {
      return res.status(404).json({ error: "Территория не найдена" });
    }
    if (existing.userId !== req.userId) {
      return res.status(403).json({ error: "Нет доступа к этой территории" });
    }

    await storage.deleteSalesRepTerritory(id);
    res.json({ success: true });
  } catch (error) {
    console.error("Delete sales rep territory error:", error);
    res.status(500).json({ error: "Ошибка удаления территории" });
  }
});

// Auxiliary data (manager territories and other settings)
app.get("/api/auxiliary", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const data = await storage.getAuxiliaryData(userId);
    res.json(data || {});
  } catch (error) {
    console.error("Get auxiliary data error:", error);
    res.status(500).json({ error: "Ошибка загрузки вспомогательных данных" });
  }
});

app.post("/api/auxiliary", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const data = req.body;
    await storage.saveAuxiliaryData(userId, data);
    res.json({ success: true });
  } catch (error) {
    console.error("Save auxiliary data error:", error);
    res.status(500).json({ error: "Ошибка сохранения вспомогательных данных" });
  }
});

app.get("/api/database/stats", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    
    const sizeQuery = await safeQuery(`
      SELECT 
        pg_size_pretty(pg_database_size(current_database())) as total_size,
        pg_database_size(current_database()) as total_bytes,
        COALESCE((SELECT COUNT(*) FROM world_medicine.yearly_sales_data WHERE user_id = $1), 0) as user_records,
        COALESCE((SELECT pg_size_pretty(COALESCE(SUM(pg_column_size(aggregated_data)), 0)) FROM world_medicine.yearly_sales_data WHERE user_id = $1), '0 bytes') as user_data_size,
        COALESCE((SELECT SUM(pg_column_size(aggregated_data)) FROM world_medicine.yearly_sales_data WHERE user_id = $1), 0) as user_data_bytes
    `, [userId]);
    
    const rawRowsQuery = await safeQuery(`
      SELECT 
        COALESCE(jsonb_array_length(aggregated_data->'rows'), 0) as row_count
      FROM world_medicine.yearly_sales_data 
      WHERE user_id = $1 AND year = 9999 AND data_type = 'rawRows'
    `, [userId]);
    
    const rowCount = rawRowsQuery.rows[0]?.row_count || 0;
    
    const stats = sizeQuery.rows[0];
    const maxBytes = 10 * 1024 * 1024 * 1024; // 10 GB limit
    const totalBytes = parseInt(stats.total_bytes) || 0;
    const userBytes = parseInt(stats.user_data_bytes) || 0;
    const usagePercent = Math.round((totalBytes / maxBytes) * 100);
    const userUsagePercent = Math.round((userBytes / maxBytes) * 100);
    
    res.json({
      totalSize: stats.total_size,
      totalBytes,
      maxBytes,
      usagePercent,
      userUsagePercent,
      userRecords: parseInt(stats.user_records) || 0,
      userDataSize: stats.user_data_size || '0 bytes',
      userDataBytes: userBytes,
      rowCount,
      freeBytes: maxBytes - totalBytes,
      freeSize: `${((maxBytes - totalBytes) / (1024 * 1024 * 1024)).toFixed(2)} GB`
    });
  } catch (error) {
    console.error("Database stats error:", error);
    const msg = (error as any)?.message || '';
    if (msg.includes('shutting down') || msg.includes('ECONNRESET') || msg.includes('connection terminated')) {
      return res.status(503).json({ error: "База данных временно недоступна. Попробуйте обновить страницу через минуту." });
    }
    res.status(500).json({ error: "Ошибка получения статистики" });
  }
});

app.post("/api/database/rebuild-compact-rows", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    console.log(`[Rebuild] Пересоздание compact rows для пользователя ${userId}`);
    
    const yearlyData = await storage.getYearlySalesDataByUser(userId);
    const salesData = yearlyData.filter(y => y.dataType === 'sales' && y.year !== 9999);
    
    if (salesData.length === 0) {
      return res.status(404).json({ error: 'Нет сохранённых данных для пересоздания' });
    }
    
    const allRows: any[] = [];
    for (const yearData of salesData) {
      const agg = yearData.aggregatedData as any;
      if (agg && agg.drugAnalytics && typeof agg.drugAnalytics === 'object') {
        for (const [drugName, drugData] of Object.entries(agg.drugAnalytics as Record<string, any>)) {
          if (drugData.monthlySales && Array.isArray(drugData.monthlySales)) {
            for (const ms of drugData.monthlySales) {
              allRows.push({
                year: yearData.year,
                month: ms.month || ms.name || '',
                drug: drugName,
                quantity: ms.sales || 0,
                region: '',
                federalDistrict: '',
                contractorGroup: '',
                disposalType: '',
                receiverType: '',
              });
            }
          }
          if (drugData.regionSales && Array.isArray(drugData.regionSales)) {
            for (const rs of drugData.regionSales) {
              allRows.push({
                year: yearData.year,
                month: '',
                drug: drugName,
                quantity: rs.sales || 0,
                region: rs.name || '',
                federalDistrict: '',
                contractorGroup: '',
                disposalType: '',
                receiverType: '',
              });
            }
          }
          if (drugData.contragentSales && Array.isArray(drugData.contragentSales)) {
            for (const cs of drugData.contragentSales) {
              allRows.push({
                year: yearData.year,
                month: '',
                drug: drugName,
                quantity: cs.sales || 0,
                region: '',
                federalDistrict: '',
                contractorGroup: cs.name || '',
                disposalType: '',
                receiverType: '',
              });
            }
          }
        }
      }
      if (agg && agg.regionSales && Array.isArray(agg.regionSales)) {
        for (const rs of agg.regionSales) {
          allRows.push({
            year: yearData.year,
            month: '',
            drug: '',
            quantity: rs.sales || 0,
            region: rs.name || '',
            federalDistrict: '',
            contractorGroup: '',
            disposalType: '',
            receiverType: '',
          });
        }
      }
      if (agg && agg.contragentSales && Array.isArray(agg.contragentSales)) {
        for (const cs of agg.contragentSales) {
          allRows.push({
            year: yearData.year,
            month: '',
            drug: '',
            quantity: cs.sales || 0,
            region: '',
            federalDistrict: '',
            contractorGroup: cs.name || '',
            disposalType: '',
            receiverType: '',
          });
        }
      }
      if (agg && agg.federalDistrictSales && Array.isArray(agg.federalDistrictSales)) {
        for (const fds of agg.federalDistrictSales) {
          allRows.push({
            year: yearData.year,
            month: '',
            drug: '',
            quantity: fds.sales || 0,
            region: '',
            federalDistrict: fds.name || '',
            contractorGroup: '',
            disposalType: '',
            receiverType: '',
          });
        }
      }
    }
    
    if (allRows.length === 0) {
      return res.status(404).json({ error: 'Нет данных для создания compact rows' });
    }
    
    const { compactRows, contragentRows } = createCompactSummaryRows(allRows);
    const compactData = { rows: compactRows, contragentRows, fileName: 'rebuilt', processedAt: new Date().toISOString() };
    
    const totalRebuildSize = JSON.stringify(compactRows).length + JSON.stringify(contragentRows).length;
    console.log(`[Rebuild] Compact data size: ${(totalRebuildSize / 1024 / 1024).toFixed(2)} MB`);
    
    await writeCompactRows(userId, compactRows, contragentRows, { fileName: 'rebuilt', processedAt: new Date().toISOString() });
    
    const verifyResult = await safeQuery(
      `SELECT data_type, pg_size_pretty(length(aggregated_data::text)::bigint) as size FROM world_medicine.yearly_sales_data WHERE user_id = $1 AND year = 9999 AND data_type LIKE 'compactRows%'`,
      [userId]
    );
    console.log(`[Rebuild] Verify: ${JSON.stringify(verifyResult.rows)}`);
    console.log(`[Rebuild] Compact rows: ${compactRows.length} + ${contragentRows.length} контрагенты`);
    res.json({ success: true, compactRows: compactRows.length, contragentRows: contragentRows.length });
  } catch (error) {
    console.error("Rebuild compact rows error:", error);
    res.status(500).json({ error: "Ошибка пересоздания compact rows" });
  }
});

app.delete("/api/database/clear-data", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { clearType } = req.body; // 'rawRows', 'all', 'oldYears'
    
    if (clearType === 'rawRows') {
      await safeQuery(`
        DELETE FROM world_medicine.yearly_sales_data 
        WHERE user_id = $1 AND year = 9999 AND data_type = 'rawRows'
      `, [userId]);
      invalidateUserCache(userId);
      res.json({ success: true, message: 'Сырые данные очищены' });
    } else if (clearType === 'all') {
      await safeQuery(`
        DELETE FROM world_medicine.yearly_sales_data WHERE user_id = $1
      `, [userId]);
      await safeQuery(`
        DELETE FROM world_medicine.saved_reports WHERE user_id = $1
      `, [userId]);
      await safeQuery(`
        DELETE FROM world_medicine.upload_history WHERE user_id = $1
      `, [userId]);
      invalidateUserCache(userId);
      res.json({ success: true, message: 'Все данные пользователя очищены' });
    } else if (clearType === 'oldYears') {
      const currentYear = new Date().getFullYear();
      await safeQuery(`
        DELETE FROM world_medicine.yearly_sales_data 
        WHERE user_id = $1 AND year < $2 AND year < 9990
      `, [userId, currentYear - 2]);
      invalidateUserCache(userId);
      res.json({ success: true, message: 'Старые данные (старше 2 лет) очищены' });
    } else {
      res.status(400).json({ error: 'Неверный тип очистки' });
    }
  } catch (error) {
    console.error("Clear data error:", error);
    res.status(500).json({ error: "Ошибка очистки данных" });
  }
});

app.post("/api/database/fix-dedup", authMiddleware, async (req: AuthRequest, res) => {
  let heavyClient: import('pg').PoolClient | null = null;
  try {
    heavyClient = await getHeavyClient();
    const userId = req.userId!;
    console.log(`[FixDedup] Запуск дедупликации compact rows для userId=${userId} (timeout=600s)`);

    const compactData = await readCompactRows(userId, heavyClient);
    const allRows = compactData.rows;
    const allContra = compactData.contragentRows;

    if (allRows.length === 0) {
      return res.json({ success: true, message: 'Нет compact rows для дедупликации' });
    }

    const activeUploadIds = await storage.getActiveUploadIds(userId);
    const activeSet = new Set(activeUploadIds);

    const seenKeys = new Map<string, any>();
    for (const row of allRows) {
      const key = `${row.year}|${row.month}|${row.week ?? ''}|${row.drug}|${row.region}|${row.federalDistrict ?? ''}|${row.disposalType ?? ''}|${row.contractorGroup ?? ''}|${row.receiverType ?? ''}|${row.city ?? ''}|${row.uploadId ?? ''}`;
      const existing = seenKeys.get(key);
      if (existing) {
        existing.quantity = (existing.quantity || 0) + (row.quantity || 0);
        existing.amount = (existing.amount || 0) + (row.amount || 0);
      } else {
        seenKeys.set(key, { ...row });
      }
    }
    const dedupedRows = [...seenKeys.values()];

    const seenContra = new Map<string, any>();
    for (const row of allContra) {
      const key = `${row.contragent}|${row.drug}|${row.region}|${row.year}|${row.month}|${row.uploadId ?? ''}`;
      const existing = seenContra.get(key);
      if (existing) {
        existing.quantity = (existing.quantity || 0) + (row.quantity || 0);
        existing.amount = (existing.amount || 0) + (row.amount || 0);
      } else {
        seenContra.set(key, { ...row });
      }
    }
    const dedupedContra = [...seenContra.values()];

    console.log(`[FixDedup] Rows: ${allRows.length} → ${dedupedRows.length}, Contra: ${allContra.length} → ${dedupedContra.length}`);

    const activeRows = dedupedRows.filter((r: any) => !r.uploadId || activeSet.has(r.uploadId));
    const activeContra = dedupedContra.filter((r: any) => !r.uploadId || activeSet.has(r.uploadId));

    await writeCompactRows(userId, activeRows, activeContra);

    const { reaggregateFromCompactRows } = await import('./sqlAggregator');
    const yearAggMap = reaggregateFromCompactRows(activeRows, activeContra);

    for (const [year, yearAgg] of yearAggMap) {
      await storage.upsertYearlySalesData({ userId, year, dataType: 'sales', aggregatedData: yearAgg });
      console.log(`[FixDedup] Сохранена агрегация за ${year}`);
    }

    invalidateUserCache(userId);

    res.json({
      success: true,
      originalRows: allRows.length,
      dedupedRows: dedupedRows.length,
      years: [...yearAggMap.keys()],
      message: `Дедупликация: ${allRows.length} → ${dedupedRows.length} строк. Агрегация пересчитана.`,
    });
  } catch (error: any) {
    console.error('[FixDedup] Ошибка:', error);
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('statement timeout') || msg.includes('canceling statement')) {
      res.status(504).json({ error: 'Операция заняла слишком много времени. Попробуйте позже, когда база данных менее загружена.' });
    } else {
      res.status(500).json({ error: error.message || 'Ошибка дедупликации' });
    }
  } finally {
    if (heavyClient) heavyClient.release();
  }
});

app.post("/api/reaggregate", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    console.log(`[ReAgg] Запуск пересчёта агрегации для userId=${userId}`);

    const compactData = await readCompactRows(userId);
    const compactRows = compactData.rows;
    const contragentRows = compactData.contragentRows;

    if (compactRows.length === 0) {
      return res.status(400).json({ error: 'Нет compact rows для пересчёта. Загрузите файл заново.' });
    }

    console.log(`[ReAgg] Compact rows: ${compactRows.length}, contragent rows: ${contragentRows.length}`);
    if (compactRows.length > 0) {
      console.log(`[ReAgg] Пример compact row: ${JSON.stringify(compactRows[0])}`);
    }

    const { reaggregateFromCompactRows } = await import('./sqlAggregator');
    const yearAggMap = reaggregateFromCompactRows(compactRows, contragentRows);

    for (const [year, yearAgg] of yearAggMap) {
      await storage.upsertYearlySalesData({
        userId,
        year,
        dataType: 'sales',
        aggregatedData: yearAgg,
      });
      console.log(`[ReAgg] Сохранена агрегация за ${year}`);
    }

    invalidateUserCache(userId);
    console.log(`[ReAgg] Пересчёт завершён для ${yearAggMap.size} год(ов)`);

    res.json({
      success: true,
      years: [...yearAggMap.keys()],
      message: `Агрегация пересчитана для ${yearAggMap.size} год(ов)`,
    });
  } catch (error: any) {
    console.error('[ReAgg] Ошибка:', error);
    res.status(500).json({ error: error.message || 'Ошибка пересчёта' });
  }
});

const isProduction = process.env.NODE_ENV === "production";

const uploadQueue: Array<{
  filePath: string; fileId: string; fileName: string; fileSize: number; userId: number;
}> = [];
let isProcessingUpload = false;

async function processUploadQueue() {
  if (isProcessingUpload || uploadQueue.length === 0) return;
  isProcessingUpload = true;

  while (uploadQueue.length > 0) {
    const job = uploadQueue.shift()!;
    const { filePath, fileId, fileName, fileSize, userId } = job;
    console.log(`[Upload] user_id=${userId}, file=${fileName}, начало обработки`);
    console.log(`[UploadQueue] Начинаем обработку: ${fileName} (осталось в очереди: ${uploadQueue.length})`);
    const T_TOTAL = Date.now();

    try {
      const T0 = Date.now();
      const result = await withDbRetry(
        () => processCSVFileStreaming(filePath, fileId, fileName, fileSize, pool, userId),
        {
          maxRetries: 1,
          label: `COPY processing: ${fileName}`,
          onRetry: (attempt, maxRetries) => {
            updateProcessingStatus(fileId, {
              status: 'uploading',
              message: `База данных перезагружается, повторная попытка ${attempt} из ${maxRetries}...`,
            });
          },
        }
      );
      console.log(`[Upload] Парсинг CSV + COPY в raw_sales_rows: ${((Date.now() - T0) / 1000).toFixed(1)} сек (${result.totalRows} строк)`);
      console.log(`[Upload] Потоковая обработка завершена: ${result.totalRows} строк, uploadId: ${result.uploadId}`);
      const mem = process.memoryUsage();
      console.log(`[Upload] Память после парсинга: RSS=${(mem.rss / 1024 / 1024).toFixed(0)}MB, Heap=${(mem.heapUsed / 1024 / 1024).toFixed(0)}MB`);

      try {
        updateProcessingStatus(fileId, {
          status: 'aggregating',
          progress: 96,
          message: 'SQL-агрегация данных...',
        });

        const { buildCompactRowsFromDB, cleanupRawRows } = await import('./sqlAggregator');

        updateProcessingStatus(fileId, {
          progress: 98,
          message: 'Сохранение compact rows...',
        });

        const T1 = Date.now();
        const { compactRows: newCompactRows, contragentRows: newContragentRows } = await buildCompactRowsFromDB(pool, userId, result.uploadId);
        console.log(`[Upload] SQL агрегация (buildCompactRowsFromDB): ${((Date.now() - T1) / 1000).toFixed(1)} сек`);
        const newYears = new Set(newCompactRows.map((r: any) => Number(r.year)).filter((y: number) => y && !isNaN(y) && y > 0 && y < 9000));
        console.log(`[Upload] Новые compact rows: ${newCompactRows.length}, годы: ${[...newYears].join(',')}`);

        let mergedCompactRows = newCompactRows;
        let mergedContragentRows = newContragentRows;

        const T2 = Date.now();
        const existingCompactData = await readCompactRows(userId);
        const existingRows = existingCompactData.rows;
        const existingContra = existingCompactData.contragentRows;
        if (existingRows.length > 0) {
          const filteredRows = existingRows.filter((r: any) => r.uploadId !== result.uploadId);
          const filteredContra = existingContra.filter((r: any) => r.uploadId !== result.uploadId);
          const removedCount = existingRows.length - filteredRows.length;
          if (removedCount > 0) {
            console.log(`[Upload] Удалено ${removedCount} старых compact rows с тем же uploadId=${result.uploadId}`);
          }
          mergedCompactRows = [...filteredRows, ...newCompactRows];
          mergedContragentRows = [...filteredContra, ...newContragentRows];
          const existingYears = [...new Set(filteredRows.map((r: any) => r.year))];
          const mergedYearsSet = [...new Set(mergedCompactRows.map((r: any) => r.year))];
          console.log(`[Upload] CompactRows: существующие=${filteredRows.length} (годы: ${existingYears.join(',')}), новые=${newCompactRows.length}, итого=${mergedCompactRows.length} (годы: ${mergedYearsSet.join(',')})`);
        } else {
          console.log(`[Upload] CompactRows: первая загрузка, ${newCompactRows.length} строк`);
        }

        console.log(`[Upload] Чтение существующих compact rows (readCompactRows): ${((Date.now() - T2) / 1000).toFixed(1)} сек`);

        const totalSize = JSON.stringify(mergedCompactRows).length + JSON.stringify(mergedContragentRows).length;
        console.log(`[Upload] Compact data size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

        const T3 = Date.now();
        await writeCompactRows(userId, mergedCompactRows, mergedContragentRows, { fileName, processedAt: new Date().toISOString() });
        console.log(`[Upload] Запись compact rows (writeCompactRows): ${((Date.now() - T3) / 1000).toFixed(1)} сек`);
        console.log(`[Upload] Compact rows сохранены: ${mergedCompactRows.length} + ${mergedContragentRows.length} контрагенты`);

        const { reaggregateFromCompactRows: reaggFromCompact } = await import('./sqlAggregator');
        const T4 = Date.now();
        const finalYearAggMap = reaggFromCompact(mergedCompactRows, mergedContragentRows);
        console.log(`[Upload] reaggregateFromCompactRows: ${((Date.now() - T4) / 1000).toFixed(1)} сек (${finalYearAggMap.size} год(ов))`);

        const T5 = Date.now();
        for (const [year, yearAgg] of finalYearAggMap) {
          await withDbRetry(async () => {
            await storage.upsertYearlySalesData({
              userId,
              year,
              dataType: 'sales',
              aggregatedData: yearAgg,
            });
            console.log(`[Upload] Год ${year}: агрегация из compact rows сохранена`);
          }, { maxRetries: 1, label: `save year ${year}: ${fileName}` });
        }
        console.log(`[Upload] Сохранение yearly_sales_data (upsert): ${((Date.now() - T5) / 1000).toFixed(1)} сек`);

        for (const [year] of finalYearAggMap) {
          const saved = await storage.getYearlySalesDataByUserAndYear(userId, year);
          const aggSize = saved ? JSON.stringify(saved.aggregatedData).length : 0;
          console.log(`[Upload] Итог за ${year}: ${(aggSize / 1024 / 1024).toFixed(2)} MB`);
        }
        console.log(`[Upload] Агрегированные данные сохранены для ${finalYearAggMap.size} год(ов)`);

        const T6 = Date.now();
        await cleanupRawRows(pool, userId, result.uploadId);
        console.log(`[Upload] Очистка raw_sales_rows: ${((Date.now() - T6) / 1000).toFixed(1)} сек`);

        const years = Array.from(finalYearAggMap.keys()).filter(y => y < 9000);
        const yearPeriod = years.length > 0 ? Math.max(...years) : null;

        let historyWritten = false;
        for (let histAttempt = 1; histAttempt <= 2; histAttempt++) {
          try {
            const updateResult = await safeQuery(
              `UPDATE world_medicine.upload_history SET status = 'success', rows_count = $1, year_period = $2, is_active = true, upload_id = $3 WHERE user_id = $4 AND upload_id = $5 AND status = 'processing'`,
              [result.totalRows, yearPeriod, result.uploadId, userId, fileId]
            );
            if (updateResult.rowCount === 0) {
              console.log(`[Upload OK] UPDATE затронул 0 строк (fileId=${fileId}), пробуем INSERT`);
              await storage.createUploadHistory({
                userId,
                uploadId: result.uploadId,
                filename: fileName,
                status: 'success',
                rowsCount: result.totalRows,
                yearPeriod: yearPeriod,
                monthPeriod: null,
                isActive: true,
              });
            }
            console.log(`[Upload OK] user_id=${userId}, file=${fileName}, rows=${result.totalRows}, upload_history → success`);
            historyWritten = true;
            break;
          } catch (histErr) {
            console.error(`[Upload OK] user_id=${userId}, file=${fileName}, попытка ${histAttempt}/2 обновления upload_history:`, histErr);
            if (histAttempt < 2) await new Promise(r => setTimeout(r, 3000));
          }
        }
        if (!historyWritten) {
          logUploadError(`user_id=${userId}, file=${fileName}: файл обработан (${result.totalRows} строк), но НЕ удалось обновить upload_history после 2 попыток`);
          invalidateUserCache(userId);
          updateProcessingStatus(fileId, {
            status: 'completed',
            progress: 100,
            processedRows: result.totalRows,
            totalRows: result.totalRows,
            message: `Обработано ${result.totalRows.toLocaleString()} строк. Внимание: статус в истории загрузок не обновлён.`,
            completedAt: new Date(),
          });
          continue;
        }

        invalidateUserCache(userId);

        console.log(`[Upload] ====== ИТОГО: ${((Date.now() - T_TOTAL) / 1000).toFixed(1)} сек для ${fileName} (${(fileSize / 1024 / 1024).toFixed(1)} MB, ${result.totalRows} строк) ======`);

        updateProcessingStatus(fileId, {
          status: 'completed',
          progress: 100,
          processedRows: result.totalRows,
          totalRows: result.totalRows,
          message: `Обработано ${result.totalRows.toLocaleString()} строк (потоковый режим + SQL)`,
          completedAt: new Date(),
        });
      } catch (e) {
        console.error(`[Upload ERROR] user_id=${userId}, file=${fileName}, ошибка=${(e as Error).message}`);
        logUploadError(`Ошибка агрегации файла ${fileName}`, e);
        try {
          const { cleanupRawRows } = await import('./sqlAggregator');
          await cleanupRawRows(pool, userId, fileId);
        } catch {}
        const userMsg = classifyUploadError(e);
        try {
          await safeQuery(
            `UPDATE world_medicine.upload_history SET status = 'error', error_message = $1 WHERE user_id = $2 AND upload_id = $3 AND status = 'processing'`,
            [(e as Error).message?.substring(0, 500) || 'Unknown error', userId, fileId]
          );
          console.log(`[Upload ERROR] user_id=${userId}, file=${fileName}, upload_history обновлён: processing → error`);
        } catch (histErr) {
          console.error(`[Upload ERROR] user_id=${userId}, file=${fileName}, НЕ УДАЛОСЬ обновить upload_history:`, histErr);
        }
        updateProcessingStatus(fileId, {
          status: 'error',
          progress: 100,
          error: userMsg,
          message: userMsg,
        });
      }
    } catch (error) {
      logUploadError(`Ошибка потоковой обработки файла ${fileName}`, error);
      const userMsg = classifyUploadError(error);
      try {
        await safeQuery(
          `UPDATE world_medicine.upload_history SET status = 'error', error_message = $1 WHERE user_id = $2 AND upload_id = $3 AND status = 'processing'`,
          [(error as Error).message?.substring(0, 500) || 'Streaming error', userId, fileId]
        );
      } catch {}
      updateProcessingStatus(fileId, {
        status: 'error',
        progress: 100,
        error: userMsg,
        message: userMsg,
      });
    } finally {
      cleanupFile(filePath);
    }
  }

  isProcessingUpload = false;
  console.log(`[UploadQueue] Очередь обработана`);
}

app.post("/api/files/upload", authMiddleware, (req: AuthRequest, res) => {
  req.setTimeout(600000);
  res.setTimeout(600000);

  const userId = req.userId!;
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) {
    return res.status(400).json({ error: 'Ожидается multipart/form-data' });
  }

  let responseSent = false;
  const fileId = generateFileId();

  try {
    const bb = Busboy({
      headers: req.headers,
      limits: { fileSize: 1024 * 1024 * 1024, files: 1 },
    });

    let fileName = '';
    let fileSize = 0;
    let filePath = '';
    let writeStream: fs.WriteStream | null = null;
    let fileReceived = false;
    let duplicateDetected = false;

    bb.on('file', async (fieldname: string, file: NodeJS.ReadableStream, info: { filename: string; encoding: string; mimeType: string }) => {
      fileName = info.filename || 'unknown';
      const ext = path.extname(fileName).toLowerCase();
      const allowedTypes = ['.csv', '.xlsx', '.xls'];

      if (!allowedTypes.includes(ext)) {
        file.resume();
        if (!responseSent) {
          responseSent = true;
          res.status(400).json({ error: 'Неподдерживаемый формат файла. Загрузите .csv, .xlsx или .xls' });
        }
        return;
      }

      try {
        const existingUpload = await safeQuery(
          `SELECT id, filename, rows_count, status FROM world_medicine.upload_history WHERE user_id = $1 AND filename = $2 AND status IN ('success', 'processing')`,
          [userId, fileName]
        );
        if (existingUpload.rows.length > 0) {
          const existing = existingUpload.rows[0];
          duplicateDetected = true;
          file.resume();
          if (!responseSent) {
            responseSent = true;
            const statusMsg = existing.status === 'processing'
              ? 'Этот файл уже загружается. Дождитесь завершения или удалите запись в Истории загрузок.'
              : 'Файл с таким названием уже загружен. Удалите предыдущую версию в Истории загрузок.';
            res.status(409).json({
              error: statusMsg,
              duplicate: true,
            });
          }
          return;
        }
      } catch (dupErr: any) {
        console.error('[Upload/Busboy] Ошибка проверки дубликата:', dupErr);
        file.resume();
        if (!responseSent) {
          responseSent = true;
          res.status(503).json({
            error: 'Не удалось проверить историю загрузок. Подождите 1-2 минуты и попробуйте снова.',
          });
        }
        return;
      }

      try {
        await storage.createUploadHistory({
          userId,
          uploadId: fileId,
          filename: fileName,
          status: 'processing',
          rowsCount: 0,
          isActive: false,
        });
        console.log(`[Upload/Busboy] Запись processing создана: ${fileName}, fileId=${fileId}`);
      } catch (histErr: any) {
        console.error('[Upload/Busboy] Ошибка создания записи processing:', histErr);
        file.resume();
        if (!responseSent) {
          responseSent = true;
          res.status(503).json({
            error: 'Не удалось инициализировать загрузку. Попробуйте снова.',
          });
        }
        return;
      }

      filePath = path.join(uploadDir, `${fileId}${ext}`);
      writeStream = fs.createWriteStream(filePath);
      fileReceived = true;
      let fileTruncated = false;

      console.log(`[Upload/Busboy] Начало потоковой записи: ${fileName} → ${filePath}`);

      writeStream.on('finish', () => {
        if (fileTruncated) return;

        if (fileSize === 0) {
          logUploadError(`Пустой файл: ${fileName}`);
          cleanupFile(filePath);
          safeQuery(
            `UPDATE world_medicine.upload_history SET status = 'error', error_message = 'Файл пуст' WHERE user_id = $1 AND upload_id = $2 AND status = 'processing'`,
            [userId, fileId]
          ).catch(() => {});
          updateProcessingStatus(fileId, {
            status: 'error',
            error: 'Файл пуст или не содержит данных.',
            message: 'Файл пуст или не содержит данных.',
          });
          return;
        }

        console.log(`[Upload/Busboy] Файл записан на диск: ${fileName}, размер: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

        updateProcessingStatus(fileId, {
          status: 'uploading',
          progress: 5,
          totalBytes: fileSize,
          processedBytes: fileSize,
          message: `Файл загружен (${(fileSize / 1024 / 1024).toFixed(1)} MB), ожидание обработки...`,
          startedAt: new Date(),
        });

        uploadQueue.push({ filePath, fileId, fileName, fileSize, userId });
        console.log(`[UploadQueue] Добавлен в очередь: ${fileName} (всего в очереди: ${uploadQueue.length})`);
        processUploadQueue();
      });

      writeStream.on('error', (err) => {
        logUploadError(`Ошибка записи файла ${fileName} на диск`, err);
        cleanupFile(filePath);
        safeQuery(
          `UPDATE world_medicine.upload_history SET status = 'error', error_message = $1 WHERE user_id = $2 AND upload_id = $3 AND status = 'processing'`,
          [err.message?.substring(0, 500) || 'Write error', userId, fileId]
        ).catch(() => {});
        const userMsg = classifyUploadError(err);
        updateProcessingStatus(fileId, {
          status: 'error',
          error: userMsg,
          message: userMsg,
        });
      });

      if (!responseSent) {
        responseSent = true;
        updateProcessingStatus(fileId, {
          status: 'uploading',
          progress: 0,
          message: 'Загрузка файла на сервер...',
          startedAt: new Date(),
        });
        res.status(202).json({
          success: true,
          fileId,
          fileName,
          message: 'Файл принят, идёт загрузка и обработка...',
        });
      }

      file.on('data', (chunk: Buffer) => {
        fileSize += chunk.length;
      });

      file.pipe(writeStream);

      file.on('limit', () => {
        fileTruncated = true;
        logUploadError(`Файл ${fileName} превысил лимит 1 ГБ`);
        writeStream?.destroy();
        cleanupFile(filePath);
        safeQuery(
          `UPDATE world_medicine.upload_history SET status = 'error', error_message = 'Файл превышает 1 ГБ' WHERE user_id = $1 AND upload_id = $2 AND status = 'processing'`,
          [userId, fileId]
        ).catch(() => {});
        updateProcessingStatus(fileId, {
          status: 'error',
          error: 'Файл превышает максимальный размер (1 ГБ).',
          message: 'Файл превышает максимальный размер (1 ГБ).',
        });
      });
    });

    bb.on('close', () => {
      if (!fileReceived) {
        if (!responseSent) {
          responseSent = true;
          res.status(400).json({ error: 'Файл не загружен' });
        }
        return;
      }
    });

    bb.on('error', (err: Error) => {
      logUploadError(`Busboy ошибка при загрузке ${fileName || 'unknown'}`, err);
      if (!responseSent) {
        responseSent = true;
        const userMsg = classifyUploadError(err);
        res.status(500).json({ error: userMsg });
      }
      if (filePath) cleanupFile(filePath);
    });

    req.pipe(bb);

  } catch (error: any) {
    logUploadError(`Критическая ошибка endpoint загрузки`, error);
    if (!responseSent) {
      responseSent = true;
      const userMsg = classifyUploadError(error);
      res.status(500).json({ error: userMsg });
    }
  }
});

const activeChunkUploads = new Map<string, {
  fileName: string;
  totalChunks: number;
  receivedChunks: Set<number>;
  userId: number;
  createdAt: number;
  chunksDir: string;
  assembling: boolean;
}>();

setInterval(() => {
  const now = Date.now();
  for (const [fileId, info] of activeChunkUploads.entries()) {
    if (now - info.createdAt > 3600000) {
      console.log(`[ChunkUpload] Очистка устаревшей сессии: ${fileId}`);
      const chunksDir = info.chunksDir;
      if (fs.existsSync(chunksDir)) {
        fs.rmSync(chunksDir, { recursive: true, force: true });
      }
      activeChunkUploads.delete(fileId);
    }
  }
}, 300000);

app.post("/api/files/upload-init", authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { fileName, totalChunks, fileSize } = req.body;

  if (!fileName || !totalChunks || totalChunks < 1) {
    return res.status(400).json({ error: 'Не указано имя файла или количество частей.' });
  }

  const ext = path.extname(fileName).toLowerCase();
  if (!['.csv', '.xlsx', '.xls'].includes(ext)) {
    return res.status(400).json({ error: 'Неподдерживаемый формат файла. Загрузите .csv, .xlsx или .xls' });
  }

  if (req.body.fileSize && req.body.fileSize > 5 * 1024 * 1024 * 1024) {
    return res.status(400).json({ error: 'Файл превышает максимальный размер (5 ГБ).' });
  }

  try {
    const existingUpload = await safeQuery(
      `SELECT id, filename, rows_count, status FROM world_medicine.upload_history WHERE user_id = $1 AND filename = $2 AND status IN ('success', 'processing')`,
      [userId, fileName]
    );
    if (existingUpload.rows.length > 0) {
      const existing = existingUpload.rows[0];
      const statusMsg = existing.status === 'processing'
        ? 'Этот файл уже загружается. Дождитесь завершения или удалите запись в Истории загрузок.'
        : 'Файл с таким названием уже загружен. Удалите предыдущую версию в Истории загрузок.';
      return res.status(409).json({
        error: statusMsg,
        duplicate: true,
        existingId: existing.id,
        existingStatus: existing.status,
      });
    }
  } catch (dupCheckErr: any) {
    console.error('[ChunkUpload] Ошибка проверки дубликата:', dupCheckErr);
    logUploadError(`Ошибка проверки дубликата при инициализации загрузки ${fileName}`, dupCheckErr);
    return res.status(503).json({
      error: 'Не удалось проверить историю загрузок. Подождите 1-2 минуты и попробуйте снова.',
    });
  }

  for (const [existingId, session] of activeChunkUploads.entries()) {
    if (session.userId === userId && session.fileName === fileName) {
      console.log(`[ChunkUpload] Очистка предыдущей сессии ${existingId} для ${fileName} от userId=${userId}`);
      if (fs.existsSync(session.chunksDir)) {
        fs.rmSync(session.chunksDir, { recursive: true, force: true });
      }
      activeChunkUploads.delete(existingId);
    }
  }

  const fileId = generateFileId();
  const chunksDir = path.join(uploadDir, `chunks_${fileId}`);
  fs.mkdirSync(chunksDir, { recursive: true });

  try {
    await storage.createUploadHistory({
      userId,
      uploadId: fileId,
      filename: fileName,
      status: 'processing',
      rowsCount: 0,
      isActive: false,
    });
    console.log(`[ChunkUpload] Запись processing создана в upload_history: ${fileName}, fileId=${fileId}`);
  } catch (histErr: any) {
    console.error('[ChunkUpload] Ошибка создания записи processing:', histErr);
    logUploadError(`Не удалось создать запись processing для ${fileName}`, histErr);
    fs.rmSync(chunksDir, { recursive: true, force: true });
    return res.status(503).json({
      error: 'Не удалось инициализировать загрузку. Попробуйте снова.',
    });
  }

  activeChunkUploads.set(fileId, {
    fileName,
    totalChunks,
    receivedChunks: new Set(),
    userId,
    createdAt: Date.now(),
    chunksDir,
    assembling: false,
  });

  updateProcessingStatus(fileId, {
    status: 'uploading',
    progress: 0,
    message: 'Инициализация загрузки...',
    startedAt: new Date(),
    totalBytes: fileSize || 0,
    processedBytes: 0,
  });

  console.log(`[ChunkUpload] Инициализация: ${fileName}, ${totalChunks} частей, fileId=${fileId}`);
  res.json({ success: true, fileId });
});

async function assembleChunks(fileId: string, session: typeof activeChunkUploads extends Map<string, infer V> ? V : never) {
  const ext = path.extname(session.fileName).toLowerCase();
  const finalPath = path.join(uploadDir, `${fileId}${ext}`);

  try {
    const chunkFiles = fs.readdirSync(session.chunksDir).sort();
    const writeStream = fs.createWriteStream(finalPath);
    let totalSize = 0;

    for (const chunkFile of chunkFiles) {
      const chunkPath = path.join(session.chunksDir, chunkFile);
      const stat = fs.statSync(chunkPath);
      totalSize += stat.size;

      await new Promise<void>((resolve, reject) => {
        const readStream = fs.createReadStream(chunkPath);
        readStream.on('error', reject);
        readStream.on('end', resolve);
        readStream.pipe(writeStream, { end: false });
      });
    }

    writeStream.end();
    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    fs.rmSync(session.chunksDir, { recursive: true, force: true });
    activeChunkUploads.delete(fileId);

    console.log(`[ChunkUpload] Файл собран: ${session.fileName}, ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

    updateProcessingStatus(fileId, {
      status: 'uploading',
      progress: 72,
      totalBytes: totalSize,
      processedBytes: totalSize,
      message: `Файл загружен (${(totalSize / 1024 / 1024).toFixed(1)} MB), ожидание обработки...`,
    });

    uploadQueue.push({ filePath: finalPath, fileId, fileName: session.fileName, fileSize: totalSize, userId: session.userId });
    console.log(`[UploadQueue] Добавлен в очередь: ${session.fileName} (всего в очереди: ${uploadQueue.length})`);
    processUploadQueue();
  } catch (err: any) {
    logUploadError(`Ошибка сборки файла ${fileId}`, err);
    const userMsg = classifyUploadError(err);
    updateProcessingStatus(fileId, {
      status: 'error',
      error: userMsg,
      message: userMsg,
    });
    if (fs.existsSync(session.chunksDir)) {
      fs.rmSync(session.chunksDir, { recursive: true, force: true });
    }
    activeChunkUploads.delete(fileId);
  }
}

app.post("/api/files/upload-chunk", authMiddleware, (req: AuthRequest, res) => {
  const userId = req.userId!;
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) {
    return res.status(400).json({ error: 'Ожидается multipart/form-data' });
  }

  const bb = Busboy({
    headers: req.headers,
    limits: { fileSize: 25 * 1024 * 1024, files: 1 }, // 25MB на чанк
  });

  let fileId = '';
  let chunkIndex = -1;
  let tempChunkPath = '';
  let chunkWritePromise: Promise<void> | null = null;
  let responseSent = false;

  bb.on('field', (name: string, val: string) => {
    if (name === 'fileId') fileId = val;
    if (name === 'chunkIndex') chunkIndex = parseInt(val, 10);
  });

  bb.on('file', (_fieldname: string, file: NodeJS.ReadableStream, _info: any) => {
    tempChunkPath = path.join(uploadDir, `tmp_chunk_${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
    const ws = fs.createWriteStream(tempChunkPath);

    chunkWritePromise = new Promise<void>((resolve, reject) => {
      ws.on('finish', resolve);
      ws.on('error', (err) => {
        logUploadError(`Ошибка записи временного чанка`, err);
        reject(err);
      });
    });

    file.pipe(ws);
  });

  bb.on('close', async () => {
    if (responseSent) return;

    if (!fileId || chunkIndex < 0) {
      responseSent = true;
      if (tempChunkPath && fs.existsSync(tempChunkPath)) fs.unlinkSync(tempChunkPath);
      return res.status(400).json({ error: 'Не указан fileId или chunkIndex' });
    }

    const session = activeChunkUploads.get(fileId);
    if (!session || session.userId !== userId) {
      responseSent = true;
      if (tempChunkPath && fs.existsSync(tempChunkPath)) fs.unlinkSync(tempChunkPath);
      return res.status(404).json({ error: 'Сессия загрузки не найдена' });
    }

    if (chunkWritePromise) {
      try {
        await chunkWritePromise;
      } catch {
        responseSent = true;
        if (tempChunkPath && fs.existsSync(tempChunkPath)) fs.unlinkSync(tempChunkPath);
        return res.status(500).json({ error: 'Ошибка записи части файла' });
      }
    }

    if (!tempChunkPath || !fs.existsSync(tempChunkPath)) {
      responseSent = true;
      return res.status(400).json({ error: 'Часть файла не получена' });
    }

    const finalChunkPath = path.join(session.chunksDir, `chunk_${String(chunkIndex).padStart(6, '0')}`);
    try {
      fs.renameSync(tempChunkPath, finalChunkPath);
    } catch (mvErr) {
      try { fs.copyFileSync(tempChunkPath, finalChunkPath); fs.unlinkSync(tempChunkPath); } catch (cpErr) {
        logUploadError(`Ошибка перемещения чанка ${chunkIndex} для ${fileId}`, cpErr);
        responseSent = true;
        return res.status(500).json({ error: 'Ошибка сохранения части файла' });
      }
    }

    session.receivedChunks.add(chunkIndex);
    const received = session.receivedChunks.size;
    const total = session.totalChunks;
    const uploadProgress = Math.round((received / total) * 70);

    updateProcessingStatus(fileId, {
      status: 'uploading',
      progress: uploadProgress,
      message: `Загрузка: ${received} из ${total} частей...`,
    });

    responseSent = true;
    res.json({ success: true, received, total });

    if (received >= total && !session.assembling) {
      let allPresent = true;
      for (let i = 0; i < total; i++) {
        if (!session.receivedChunks.has(i)) {
          allPresent = false;
          logUploadError(`Чанк ${i} отсутствует для ${fileId}, пропускаем сборку`);
          break;
        }
      }
      if (!allPresent) return;

      session.assembling = true;
      console.log(`[ChunkUpload] Все ${total} частей получены и проверены для ${fileId}, сборка файла...`);
      assembleChunks(fileId, session);
    }
  });

  bb.on('error', (err: Error) => {
    if (responseSent) return;
    responseSent = true;
    if (tempChunkPath && fs.existsSync(tempChunkPath)) try { fs.unlinkSync(tempChunkPath); } catch {}
    logUploadError(`Busboy ошибка при загрузке чанка`, err);
    const userMsg = classifyUploadError(err);
    res.status(500).json({ error: userMsg });
  });

  req.pipe(bb);
});

app.get("/api/files/status/:fileId", authMiddleware, (req: AuthRequest, res) => {
  const fileId = req.params.fileId as string;
  const status = getProcessingStatus(fileId);
  
  if (!status) {
    return res.status(404).json({ error: 'Задача не найдена' });
  }
  
  res.json(status);
});

app.get("/api/files/jobs", authMiddleware, (req: AuthRequest, res) => {
  const jobs = getAllProcessingJobs();
  res.json(jobs);
});

if (isProduction) {
  const distPath = path.resolve(__dirname, "../dist");
  app.use(express.static(distPath));
  
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.join(distPath, "index.html"));
  });
}

const LISTEN_PORT = process.env.PORT ? parseInt(process.env.PORT) : (isProduction ? 5000 : PORT);

const server = app.listen(LISTEN_PORT, "0.0.0.0", () => {
  console.log(`API Server running on http://0.0.0.0:${LISTEN_PORT}`);
  setTimeout(() => {
    loadPopulationData(pool).catch(err => console.error('[Population] Ошибка при запуске:', err.message));
    loadEmployeesData(pool).catch(err => console.error('[Employees] Ошибка при запуске:', err.message));
  }, 5000);
});

server.timeout = 1860000;
server.keepAliveTimeout = 1860000;
server.headersTimeout = 1870000;
console.log(`[Server] HTTP Timeouts: server=${server.timeout/1000}s, keepAlive=${server.keepAliveTimeout/1000}s, headers=${server.headersTimeout/1000}s`);
console.log(`[Server] DB Timeouts: SELECT=120s, heavy(aggregation/dedup/compactRows)=600s, COPY=1800s`);
