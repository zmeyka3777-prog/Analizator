import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { requireRole, requireMinRole } from './middleware/roleCheck';

interface AuthRequest extends Request {
  userId?: number;
  userRole?: string;
}

export function createAdminRouter(
  authMiddleware: any,
  safeQuery: (sql: string, params?: any[]) => Promise<any>,
  storage: any
) {
  const router = Router();

  // ==================== USER MANAGEMENT ====================

  // Get all users
  router.get('/users', authMiddleware, requireMinRole('director'), async (req: AuthRequest, res: Response) => {
    try {
      const result = await safeQuery(
        `SELECT id, email, name, role, avatar, created_at, last_login
         FROM world_medicine.users ORDER BY created_at DESC`
      );
      res.json({ users: result.rows });
    } catch (error: any) {
      console.error('[Admin] Error fetching users:', error);
      res.status(500).json({ error: 'Ошибка получения списка пользователей' });
    }
  });

  // Create user
  router.post('/users', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
      const { email, password, name, role } = req.body;
      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Email, пароль и имя обязательны' });
      }
      const existing = await safeQuery(
        `SELECT id FROM world_medicine.users WHERE email = $1`, [email]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
      }
      const passwordHash = await bcrypt.hash(password, 10);
      const result = await safeQuery(
        `INSERT INTO world_medicine.users (email, password_hash, name, role)
         VALUES ($1, $2, $3, $4) RETURNING id, email, name, role, created_at`,
        [email, passwordHash, name, role || 'analyst']
      );
      res.status(201).json({ user: result.rows[0] });
    } catch (error: any) {
      console.error('[Admin] Error creating user:', error);
      res.status(500).json({ error: 'Ошибка создания пользователя' });
    }
  });

  // Update user
  router.put('/users/:id', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
      const userId = Number(req.params.id);
      const { email, name, role, password } = req.body;
      const updates: string[] = [];
      const values: any[] = [];
      let paramIdx = 1;

      if (email) { updates.push(`email = $${paramIdx++}`); values.push(email); }
      if (name) { updates.push(`name = $${paramIdx++}`); values.push(name); }
      if (role) { updates.push(`role = $${paramIdx++}`); values.push(role); }
      if (password) {
        const hash = await bcrypt.hash(password, 10);
        updates.push(`password_hash = $${paramIdx++}`);
        values.push(hash);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'Нет данных для обновления' });
      }

      values.push(userId);
      const result = await safeQuery(
        `UPDATE world_medicine.users SET ${updates.join(', ')} WHERE id = $${paramIdx}
         RETURNING id, email, name, role`,
        values
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }
      res.json({ user: result.rows[0] });
    } catch (error: any) {
      console.error('[Admin] Error updating user:', error);
      res.status(500).json({ error: 'Ошибка обновления пользователя' });
    }
  });

  // Delete user
  router.delete('/users/:id', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
      const userId = Number(req.params.id);
      if (userId === req.userId) {
        return res.status(400).json({ error: 'Нельзя удалить собственный аккаунт' });
      }
      await safeQuery(`DELETE FROM world_medicine.users WHERE id = $1`, [userId]);
      res.json({ success: true });
    } catch (error: any) {
      console.error('[Admin] Error deleting user:', error);
      res.status(500).json({ error: 'Ошибка удаления пользователя' });
    }
  });

  // ==================== EMPLOYEE MANAGEMENT ====================

  // Get all employees
  router.get('/employees', authMiddleware, requireMinRole('manager'), async (req: AuthRequest, res: Response) => {
    try {
      const result = await safeQuery(
        `SELECT id, employee_name, role, manager_name, regions
         FROM world_medicine.employees_data ORDER BY role, employee_name`
      );
      res.json({ employees: result.rows });
    } catch (error: any) {
      console.error('[Admin] Error fetching employees:', error);
      res.status(500).json({ error: 'Ошибка получения списка сотрудников' });
    }
  });

  // Create employee
  router.post('/employees', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
      const { employee_name, role, manager_name, regions } = req.body;
      if (!employee_name || !role) {
        return res.status(400).json({ error: 'Имя и роль обязательны' });
      }
      const result = await safeQuery(
        `INSERT INTO world_medicine.employees_data (employee_name, role, manager_name, regions)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [employee_name, role, manager_name || null, regions || null]
      );
      res.status(201).json({ employee: result.rows[0] });
    } catch (error: any) {
      console.error('[Admin] Error creating employee:', error);
      res.status(500).json({ error: 'Ошибка создания сотрудника' });
    }
  });

  // Update employee
  router.put('/employees/:id', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      const { employee_name, role, manager_name, regions } = req.body;
      const result = await safeQuery(
        `UPDATE world_medicine.employees_data
         SET employee_name = COALESCE($1, employee_name),
             role = COALESCE($2, role),
             manager_name = COALESCE($3, manager_name),
             regions = COALESCE($4, regions)
         WHERE id = $5 RETURNING *`,
        [employee_name, role, manager_name, regions, id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Сотрудник не найден' });
      }
      res.json({ employee: result.rows[0] });
    } catch (error: any) {
      console.error('[Admin] Error updating employee:', error);
      res.status(500).json({ error: 'Ошибка обновления сотрудника' });
    }
  });

  // Delete employee
  router.delete('/employees/:id', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      await safeQuery(`DELETE FROM world_medicine.employees_data WHERE id = $1`, [id]);
      res.json({ success: true });
    } catch (error: any) {
      console.error('[Admin] Error deleting employee:', error);
      res.status(500).json({ error: 'Ошибка удаления сотрудника' });
    }
  });

  // ==================== DRUG PRICES ====================

  // Get all drug prices
  router.get('/drug-prices', authMiddleware, requireMinRole('manager'), async (_req: AuthRequest, res: Response) => {
    try {
      const result = await safeQuery(
        `SELECT * FROM world_medicine.drug_prices ORDER BY drug_name`
      );
      res.json({ prices: result.rows });
    } catch (error: any) {
      console.error('[Admin] Error fetching drug prices:', error);
      res.status(500).json({ error: 'Ошибка получения цен' });
    }
  });

  // Upsert drug price
  router.put('/drug-prices', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
      const { drug_name, price_per_unit } = req.body;
      if (!drug_name || price_per_unit == null) {
        return res.status(400).json({ error: 'Название препарата и цена обязательны' });
      }
      const result = await safeQuery(
        `INSERT INTO world_medicine.drug_prices (drug_name, price_per_unit)
         VALUES ($1, $2)
         ON CONFLICT (drug_name) DO UPDATE SET price_per_unit = $2
         RETURNING *`,
        [drug_name, price_per_unit]
      );
      res.json({ price: result.rows[0] });
    } catch (error: any) {
      console.error('[Admin] Error upserting drug price:', error);
      res.status(500).json({ error: 'Ошибка обновления цены' });
    }
  });

  // ==================== PRODUCTS MANAGEMENT ====================

  router.get('/products', authMiddleware, async (_req: AuthRequest, res: Response) => {
    try {
      const result = await safeQuery(`SELECT * FROM world_medicine.products ORDER BY sort_order, name`);
      res.json({ products: result.rows });
    } catch (error: any) {
      res.status(500).json({ error: 'Ошибка получения препаратов' });
    }
  });

  router.post('/products', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
      const { code, name, full_name, short_name, price, quota2025, budget2025, category, sort_order } = req.body;
      if (!code || !name) return res.status(400).json({ error: 'Код и название обязательны' });
      const result = await safeQuery(
        `INSERT INTO world_medicine.products (code, name, full_name, short_name, price, quota2025, budget2025, category, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [code, name, full_name || null, short_name || null, price || 0, quota2025 || 0, budget2025 || 0, category || null, sort_order || 0]
      );
      res.status(201).json({ product: result.rows[0] });
    } catch (error: any) {
      if (error.code === '23505') return res.status(409).json({ error: 'Препарат с таким кодом уже существует' });
      res.status(500).json({ error: 'Ошибка создания препарата' });
    }
  });

  router.put('/products/:id', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      const { name, full_name, short_name, price, quota2025, budget2025, category, is_active, sort_order } = req.body;
      const result = await safeQuery(
        `UPDATE world_medicine.products SET
          name = COALESCE($1, name), full_name = COALESCE($2, full_name), short_name = COALESCE($3, short_name),
          price = COALESCE($4, price), quota2025 = COALESCE($5, quota2025), budget2025 = COALESCE($6, budget2025),
          category = COALESCE($7, category), is_active = COALESCE($8, is_active), sort_order = COALESCE($9, sort_order)
         WHERE id = $10 RETURNING *`,
        [name, full_name, short_name, price, quota2025, budget2025, category, is_active, sort_order, id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Препарат не найден' });
      res.json({ product: result.rows[0] });
    } catch (error: any) {
      res.status(500).json({ error: 'Ошибка обновления препарата' });
    }
  });

  router.delete('/products/:id', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
      await safeQuery(`DELETE FROM world_medicine.products WHERE id = $1`, [Number(req.params.id)]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: 'Ошибка удаления препарата' });
    }
  });

  // ==================== DISTRICTS & TERRITORIES ====================

  router.get('/districts', authMiddleware, async (_req: AuthRequest, res: Response) => {
    try {
      const districtsRes = await safeQuery(`SELECT * FROM world_medicine.federal_districts ORDER BY sort_order, name`);
      const territoriesRes = await safeQuery(`SELECT * FROM world_medicine.territories ORDER BY sort_order, name`);
      const districtMap: Record<string, any[]> = {};
      territoriesRes.rows.forEach((t: any) => {
        if (!districtMap[t.district_id]) districtMap[t.district_id] = [];
        districtMap[t.district_id].push(t);
      });
      const result = districtsRes.rows.map((d: any) => ({ ...d, territories: districtMap[d.id] || [] }));
      res.json({ districts: result });
    } catch (error: any) {
      res.status(500).json({ error: 'Ошибка получения округов' });
    }
  });

  router.post('/districts', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
      const { id, name, short_name, color, icon, sort_order } = req.body;
      if (!id || !name) return res.status(400).json({ error: 'ID и название обязательны' });
      const result = await safeQuery(
        `INSERT INTO world_medicine.federal_districts (id, name, short_name, color, icon, sort_order) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [id, name, short_name || null, color || null, icon || null, sort_order || 0]
      );
      res.status(201).json({ district: result.rows[0] });
    } catch (error: any) {
      res.status(500).json({ error: 'Ошибка создания округа' });
    }
  });

  router.put('/districts/:id', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
      const { name, short_name, color, icon, sort_order } = req.body;
      const result = await safeQuery(
        `UPDATE world_medicine.federal_districts SET name=COALESCE($1,name), short_name=COALESCE($2,short_name), color=COALESCE($3,color), icon=COALESCE($4,icon), sort_order=COALESCE($5,sort_order) WHERE id=$6 RETURNING *`,
        [name, short_name, color, icon, sort_order, req.params.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Округ не найден' });
      res.json({ district: result.rows[0] });
    } catch (error: any) {
      res.status(500).json({ error: 'Ошибка обновления округа' });
    }
  });

  router.delete('/districts/:id', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
      await safeQuery(`DELETE FROM world_medicine.federal_districts WHERE id=$1`, [req.params.id]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: 'Ошибка удаления округа' });
    }
  });

  router.post('/territories', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
      const { id, district_id, name, budget2025, budget2026, coefficient, sort_order } = req.body;
      if (!id || !district_id || !name) return res.status(400).json({ error: 'ID, округ и название обязательны' });
      const result = await safeQuery(
        `INSERT INTO world_medicine.territories (id, district_id, name, budget2025, budget2026, coefficient, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [id, district_id, name, budget2025 || 0, budget2026 || 0, coefficient || 0, sort_order || 0]
      );
      res.status(201).json({ territory: result.rows[0] });
    } catch (error: any) {
      res.status(500).json({ error: 'Ошибка создания территории' });
    }
  });

  router.put('/territories/:id', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
      const { name, budget2025, budget2026, coefficient, sort_order } = req.body;
      const result = await safeQuery(
        `UPDATE world_medicine.territories SET name=COALESCE($1,name), budget2025=COALESCE($2,budget2025), budget2026=COALESCE($3,budget2026), coefficient=COALESCE($4,coefficient), sort_order=COALESCE($5,sort_order) WHERE id=$6 RETURNING *`,
        [name, budget2025, budget2026, coefficient, sort_order, req.params.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Территория не найдена' });
      res.json({ territory: result.rows[0] });
    } catch (error: any) {
      res.status(500).json({ error: 'Ошибка обновления территории' });
    }
  });

  router.delete('/territories/:id', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
      await safeQuery(`DELETE FROM world_medicine.territories WHERE id=$1`, [req.params.id]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: 'Ошибка удаления территории' });
    }
  });

  // ==================== AUDIT LOG ====================

  // Get audit log
  router.get('/audit-log', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 100, 500);
      const offset = Number(req.query.offset) || 0;
      const result = await safeQuery(
        `SELECT al.*, u.name as user_name, u.email as user_email
         FROM world_medicine.audit_log al
         LEFT JOIN world_medicine.users u ON al.user_id = u.id
         ORDER BY al.created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      const countResult = await safeQuery(`SELECT COUNT(*) as total FROM world_medicine.audit_log`);
      res.json({
        entries: result.rows,
        total: parseInt(countResult.rows[0]?.total || '0'),
        limit,
        offset,
      });
    } catch (error: any) {
      console.error('[Admin] Error fetching audit log:', error);
      res.status(500).json({ error: 'Ошибка получения журнала аудита' });
    }
  });

  // ==================== PLANS MANAGEMENT ====================

  // Get all plans (admin view)
  router.get('/plans', authMiddleware, requireMinRole('manager'), async (req: AuthRequest, res: Response) => {
    try {
      const result = await safeQuery(
        `SELECT sp.*, u.name as user_name
         FROM world_medicine.saved_plans sp
         LEFT JOIN world_medicine.users u ON sp.user_id = u.id
         ORDER BY sp.year DESC`
      );
      res.json({ plans: result.rows });
    } catch (error: any) {
      console.error('[Admin] Error fetching plans:', error);
      res.status(500).json({ error: 'Ошибка получения планов' });
    }
  });

  // Update plan (admin)
  router.put('/plans/:id', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      const { plan_value, is_locked } = req.body;
      const updates: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (plan_value != null) { updates.push(`plan_value = $${idx++}`); values.push(plan_value); }
      if (is_locked != null) { updates.push(`is_locked = $${idx++}`); values.push(is_locked); }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'Нет данных для обновления' });
      }

      values.push(id);
      const result = await safeQuery(
        `UPDATE world_medicine.saved_plans SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
      );
      res.json({ plan: result.rows[0] });
    } catch (error: any) {
      console.error('[Admin] Error updating plan:', error);
      res.status(500).json({ error: 'Ошибка обновления плана' });
    }
  });

  // ==================== DATABASE STATS ====================

  router.get('/db-stats', authMiddleware, requireRole('admin'), async (_req: AuthRequest, res: Response) => {
    try {
      const tables = ['users', 'upload_history', 'raw_sales_rows', 'yearly_sales_data',
        'population_data', 'employees_data', 'saved_reports', 'saved_plans',
        'budget_scenarios', 'audit_log', 'drug_prices'];

      const stats: Record<string, number> = {};
      for (const table of tables) {
        try {
          const result = await safeQuery(`SELECT COUNT(*) as cnt FROM world_medicine.${table}`);
          stats[table] = parseInt(result.rows[0]?.cnt || '0');
        } catch {
          stats[table] = -1;
        }
      }

      const dbSize = await safeQuery(
        `SELECT pg_size_pretty(pg_database_size(current_database())) as size`
      );

      res.json({
        tables: stats,
        databaseSize: dbSize.rows[0]?.size || 'unknown',
      });
    } catch (error: any) {
      console.error('[Admin] Error fetching DB stats:', error);
      res.status(500).json({ error: 'Ошибка получения статистики БД' });
    }
  });

  // ==================== POPULATION DATA ====================

  router.get('/population', authMiddleware, requireMinRole('manager'), async (_req: AuthRequest, res: Response) => {
    try {
      const result = await safeQuery(
        `SELECT * FROM world_medicine.population_data ORDER BY federal_district, region_name`
      );
      res.json({ population: result.rows });
    } catch (error: any) {
      console.error('[Admin] Error fetching population:', error);
      res.status(500).json({ error: 'Ошибка получения данных населения' });
    }
  });

  return router;
}
