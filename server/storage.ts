import { 
  users, drugs, territories, contragents, sales, savedReports, savedPlans, uploadHistory, passwordResetTokens, yearlySalesData, budgetScenarios, columnMappings, salesRepTerritories,
  type User, type InsertUser, 
  type Drug, type InsertDrug,
  type Territory, type InsertTerritory,
  type Contragent, type InsertContragent,
  type Sale, type InsertSale,
  type SavedReport, type InsertSavedReport,
  type SavedPlan, type InsertSavedPlan,
  type UploadHistory, type InsertUploadHistory,
  type PasswordResetToken, type InsertPasswordResetToken,
  type YearlySalesData, type InsertYearlySalesData,
  type BudgetScenario, type InsertBudgetScenario,
  type ColumnMapping, type InsertColumnMapping,
  type SalesRepTerritory, type InsertSalesRepTerritory
} from "@shared/schema";
import { db } from "./db";
import { eq, and, ne, desc, sql, isNull, gt } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: number, data: Partial<Pick<InsertUser, 'name' | 'email' | 'role' | 'avatar'>>): Promise<User>;
  deleteUser(id: number): Promise<void>;
  updateUserLastLogin(id: number): Promise<void>;
  
  getDrugs(): Promise<Drug[]>;
  createDrug(drug: InsertDrug): Promise<Drug>;
  
  getTerritories(): Promise<Territory[]>;
  getTerritoriesByLevel(level: string): Promise<Territory[]>;
  createTerritory(territory: InsertTerritory): Promise<Territory>;
  
  getContragents(): Promise<Contragent[]>;
  getContragentsByTerritory(territoryId: number): Promise<Contragent[]>;
  createContragent(contragent: InsertContragent): Promise<Contragent>;
  
  getSalesByFilters(filters: { drugId?: number; territoryId?: number; year?: number }): Promise<Sale[]>;
  createSale(sale: InsertSale): Promise<Sale>;
  createSalesBatch(sales: InsertSale[]): Promise<void>;
  
  getSavedReportsByUser(userId: number): Promise<SavedReport[]>;
  getSavedReportById(id: number): Promise<SavedReport | undefined>;
  createSavedReport(report: InsertSavedReport): Promise<SavedReport>;
  deleteSavedReport(id: number): Promise<void>;
  
  getSavedPlansByUser(userId: number): Promise<SavedPlan[]>;
  getSavedPlanById(id: number): Promise<SavedPlan | undefined>;
  createSavedPlan(plan: InsertSavedPlan): Promise<SavedPlan>;
  updateSavedPlan(id: number, planValue: string, isLocked: boolean): Promise<void>;
  
  getUploadHistoryByUser(userId: number): Promise<UploadHistory[]>;
  createUploadHistory(upload: InsertUploadHistory): Promise<UploadHistory>;
  updateUploadHistoryStatus(id: number, status: string, rowsCount?: number, yearPeriod?: number, monthPeriod?: string): Promise<void>;
  toggleUploadActive(id: number, isActive: boolean, userId: number): Promise<void>;
  deleteUploadHistory(id: number, userId: number): Promise<void>;
  getActiveUploadIds(userId: number): Promise<string[]>;
  
  createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getValidPasswordResetToken(userId: number): Promise<PasswordResetToken | undefined>;
  markResetTokenUsed(id: number): Promise<void>;
  updateUserPassword(id: number, passwordHash: string): Promise<void>;
  
  getYearlySalesDataByUser(userId: number): Promise<YearlySalesData[]>;
  getAggregatedDataByUser(userId: number): Promise<YearlySalesData[]>;
  getYearlySalesDataByUserAndYear(userId: number, year: number): Promise<YearlySalesData | undefined>;
  upsertYearlySalesData(data: InsertYearlySalesData): Promise<YearlySalesData>;
  deleteYearlySalesData(id: number): Promise<void>;
  
  getBudgetScenariosByUser(userId: number): Promise<BudgetScenario[]>;
  getBudgetScenarioById(id: number): Promise<BudgetScenario | undefined>;
  createBudgetScenario(scenario: InsertBudgetScenario): Promise<BudgetScenario>;
  updateBudgetScenario(id: number, scenario: Partial<InsertBudgetScenario>): Promise<BudgetScenario>;
  deleteBudgetScenario(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.createdAt);
  }

  async updateUser(id: number, data: Partial<Pick<InsertUser, 'name' | 'email' | 'role' | 'avatar'>>): Promise<User> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async updateUserLastLogin(id: number): Promise<void> {
    await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, id));
  }

  async getDrugs(): Promise<Drug[]> {
    return await db.select().from(drugs);
  }

  async createDrug(drug: InsertDrug): Promise<Drug> {
    const [newDrug] = await db.insert(drugs).values(drug).returning();
    return newDrug;
  }

  async getTerritories(): Promise<Territory[]> {
    return await db.select().from(territories);
  }

  async getTerritoriesByLevel(level: string): Promise<Territory[]> {
    return await db.select().from(territories).where(eq(territories.level, level));
  }

  async createTerritory(territory: InsertTerritory): Promise<Territory> {
    const [newTerritory] = await db.insert(territories).values(territory).returning();
    return newTerritory;
  }

  async getContragents(): Promise<Contragent[]> {
    return await db.select().from(contragents);
  }

  async getContragentsByTerritory(territoryId: number): Promise<Contragent[]> {
    return await db.select().from(contragents).where(eq(contragents.territoryId, territoryId));
  }

  async createContragent(contragent: InsertContragent): Promise<Contragent> {
    const [newContragent] = await db.insert(contragents).values(contragent).returning();
    return newContragent;
  }

  async getSalesByFilters(filters: { drugId?: number; territoryId?: number; year?: number }): Promise<Sale[]> {
    let query = db.select().from(sales);
    const conditions = [];
    
    if (filters.drugId) {
      conditions.push(eq(sales.drugId, filters.drugId));
    }
    if (filters.territoryId) {
      conditions.push(eq(sales.territoryId, filters.territoryId));
    }
    if (filters.year) {
      conditions.push(eq(sales.year, filters.year));
    }
    
    if (conditions.length > 0) {
      return await db.select().from(sales).where(and(...conditions));
    }
    return await db.select().from(sales);
  }

  async createSale(sale: InsertSale): Promise<Sale> {
    const [newSale] = await db.insert(sales).values(sale).returning();
    return newSale;
  }

  async createSalesBatch(salesData: InsertSale[]): Promise<void> {
    if (salesData.length > 0) {
      await db.insert(sales).values(salesData);
    }
  }

  async getSavedReportsByUser(userId: number): Promise<SavedReport[]> {
    return await db.select().from(savedReports)
      .where(eq(savedReports.userId, userId))
      .orderBy(desc(savedReports.createdAt));
  }

  async getSavedReportById(id: number): Promise<SavedReport | undefined> {
    const [report] = await db.select().from(savedReports).where(eq(savedReports.id, id));
    return report || undefined;
  }

  async createSavedReport(report: InsertSavedReport): Promise<SavedReport> {
    const [newReport] = await db.insert(savedReports).values(report).returning();
    return newReport;
  }

  async deleteSavedReport(id: number): Promise<void> {
    await db.delete(savedReports).where(eq(savedReports.id, id));
  }

  async getSavedPlansByUser(userId: number): Promise<SavedPlan[]> {
    return await db.select().from(savedPlans)
      .where(eq(savedPlans.userId, userId))
      .orderBy(desc(savedPlans.createdAt));
  }

  async getSavedPlanById(id: number): Promise<SavedPlan | undefined> {
    const [plan] = await db.select().from(savedPlans).where(eq(savedPlans.id, id));
    return plan || undefined;
  }

  async createSavedPlan(plan: InsertSavedPlan): Promise<SavedPlan> {
    const [newPlan] = await db.insert(savedPlans).values(plan).returning();
    return newPlan;
  }

  async updateSavedPlan(id: number, planValue: string, isLocked: boolean): Promise<void> {
    await db.update(savedPlans)
      .set({ planValue, isLocked, updatedAt: new Date() })
      .where(eq(savedPlans.id, id));
  }

  async getUploadHistoryByUser(userId: number): Promise<UploadHistory[]> {
    return await db.select().from(uploadHistory)
      .where(eq(uploadHistory.userId, userId))
      .orderBy(desc(uploadHistory.uploadedAt));
  }

  async createUploadHistory(upload: InsertUploadHistory): Promise<UploadHistory> {
    const [newUpload] = await db.insert(uploadHistory).values(upload).returning();
    return newUpload;
  }

  async updateUploadHistoryStatus(id: number, status: string, rowsCount?: number, yearPeriod?: number, monthPeriod?: string): Promise<void> {
    const updates: Record<string, any> = { status };
    if (rowsCount !== undefined) updates.rowsCount = rowsCount;
    if (yearPeriod !== undefined) updates.yearPeriod = yearPeriod;
    if (monthPeriod !== undefined) updates.monthPeriod = monthPeriod;
    await db.update(uploadHistory).set(updates).where(eq(uploadHistory.id, id));
  }

  async toggleUploadActive(id: number, isActive: boolean, userId: number): Promise<void> {
    await db.update(uploadHistory).set({ isActive }).where(and(eq(uploadHistory.id, id), eq(uploadHistory.userId, userId)));
  }

  async deleteUploadHistory(id: number, userId: number): Promise<void> {
    const [record] = await db.select().from(uploadHistory).where(and(eq(uploadHistory.id, id), eq(uploadHistory.userId, userId)));
    if (record) {
      await db.delete(uploadHistory).where(eq(uploadHistory.id, id));
    }
  }

  async getActiveUploadIds(userId: number): Promise<string[]> {
    const rows = await db.select({ uploadId: uploadHistory.uploadId })
      .from(uploadHistory)
      .where(and(eq(uploadHistory.userId, userId), eq(uploadHistory.isActive, true)));
    return rows.map(r => r.uploadId);
  }

  async createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const [newToken] = await db.insert(passwordResetTokens).values(token).returning();
    return newToken;
  }

  async getValidPasswordResetToken(userId: number): Promise<PasswordResetToken | undefined> {
    const [token] = await db.select().from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.userId, userId),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date())
      ))
      .orderBy(desc(passwordResetTokens.createdAt))
      .limit(1);
    return token || undefined;
  }

  async markResetTokenUsed(id: number): Promise<void> {
    await db.update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, id));
  }

  async updateUserPassword(id: number, passwordHash: string): Promise<void> {
    await db.update(users)
      .set({ passwordHash })
      .where(eq(users.id, id));
  }

  async getYearlySalesDataByUser(userId: number): Promise<YearlySalesData[]> {
    return await db.select().from(yearlySalesData)
      .where(eq(yearlySalesData.userId, userId))
      .orderBy(desc(yearlySalesData.year));
  }

  async getAggregatedDataByUser(userId: number): Promise<YearlySalesData[]> {
    return await db.select().from(yearlySalesData)
      .where(and(
        eq(yearlySalesData.userId, userId),
        ne(yearlySalesData.year, 9999)
      ))
      .orderBy(desc(yearlySalesData.year));
  }

  async getYearlySalesDataByUserAndYear(userId: number, year: number): Promise<YearlySalesData | undefined> {
    const [data] = await db.select().from(yearlySalesData)
      .where(and(
        eq(yearlySalesData.userId, userId),
        eq(yearlySalesData.year, year)
      ));
    return data || undefined;
  }

  async upsertYearlySalesData(data: InsertYearlySalesData): Promise<YearlySalesData> {
    const existing = await this.getYearlySalesDataByUserAndYear(data.userId, data.year);
    
    if (existing) {
      await db.update(yearlySalesData)
        .set({ 
          aggregatedData: data.aggregatedData, 
          dataType: data.dataType,
          updatedAt: new Date() 
        })
        .where(eq(yearlySalesData.id, existing.id));
      return { ...existing, ...data, updatedAt: new Date() };
    } else {
      const [newData] = await db.insert(yearlySalesData).values(data).returning();
      return newData;
    }
  }

  async deleteYearlySalesData(id: number): Promise<void> {
    await db.delete(yearlySalesData).where(eq(yearlySalesData.id, id));
  }

  async getBudgetScenariosByUser(userId: number): Promise<BudgetScenario[]> {
    return await db.select().from(budgetScenarios)
      .where(eq(budgetScenarios.userId, userId))
      .orderBy(desc(budgetScenarios.createdAt));
  }

  async getBudgetScenarioById(id: number): Promise<BudgetScenario | undefined> {
    const [scenario] = await db.select().from(budgetScenarios).where(eq(budgetScenarios.id, id));
    return scenario || undefined;
  }

  async createBudgetScenario(scenario: InsertBudgetScenario): Promise<BudgetScenario> {
    const [newScenario] = await db.insert(budgetScenarios).values(scenario).returning();
    return newScenario;
  }

  async updateBudgetScenario(id: number, scenario: Partial<InsertBudgetScenario>): Promise<BudgetScenario> {
    const [updated] = await db.update(budgetScenarios)
      .set({ ...scenario, updatedAt: new Date() })
      .where(eq(budgetScenarios.id, id))
      .returning();
    return updated;
  }

  async deleteBudgetScenario(id: number): Promise<void> {
    await db.delete(budgetScenarios).where(eq(budgetScenarios.id, id));
  }

  // Column Mappings
  async getColumnMappingsByUser(userId: number): Promise<ColumnMapping[]> {
    return await db.select().from(columnMappings)
      .where(eq(columnMappings.userId, userId))
      .orderBy(desc(columnMappings.createdAt));
  }

  async getColumnMappingById(id: number): Promise<ColumnMapping | undefined> {
    const [mapping] = await db.select().from(columnMappings).where(eq(columnMappings.id, id));
    return mapping || undefined;
  }

  async createColumnMapping(mapping: InsertColumnMapping): Promise<ColumnMapping> {
    // Если новый маппинг по умолчанию, сбросить isDefault у остальных
    if (mapping.isDefault) {
      await db.update(columnMappings)
        .set({ isDefault: false })
        .where(eq(columnMappings.userId, mapping.userId));
    }
    const [newMapping] = await db.insert(columnMappings).values(mapping).returning();
    return newMapping;
  }

  async updateColumnMapping(id: number, mapping: Partial<InsertColumnMapping>): Promise<ColumnMapping> {
    // Если устанавливаем как по умолчанию, сбросить у остальных
    if (mapping.isDefault) {
      const existing = await this.getColumnMappingById(id);
      if (existing) {
        await db.update(columnMappings)
          .set({ isDefault: false })
          .where(eq(columnMappings.userId, existing.userId));
      }
    }
    const [updated] = await db.update(columnMappings)
      .set({ ...mapping, updatedAt: new Date() })
      .where(eq(columnMappings.id, id))
      .returning();
    return updated;
  }

  async deleteColumnMapping(id: number): Promise<void> {
    await db.delete(columnMappings).where(eq(columnMappings.id, id));
  }

  // Sales Rep Territories
  async getSalesRepTerritoriesByUser(userId: number): Promise<SalesRepTerritory[]> {
    return await db.select().from(salesRepTerritories)
      .where(eq(salesRepTerritories.userId, userId))
      .orderBy(salesRepTerritories.sortOrder);
  }

  async getSalesRepTerritoryById(id: number): Promise<SalesRepTerritory | undefined> {
    const [territory] = await db.select().from(salesRepTerritories).where(eq(salesRepTerritories.id, id));
    return territory || undefined;
  }

  async createSalesRepTerritory(territory: InsertSalesRepTerritory): Promise<SalesRepTerritory> {
    const [newTerritory] = await db.insert(salesRepTerritories).values(territory).returning();
    return newTerritory;
  }

  async updateSalesRepTerritory(id: number, territory: Partial<InsertSalesRepTerritory>): Promise<SalesRepTerritory> {
    const [updated] = await db.update(salesRepTerritories)
      .set({ ...territory, updatedAt: new Date() })
      .where(eq(salesRepTerritories.id, id))
      .returning();
    return updated;
  }

  async deleteSalesRepTerritory(id: number): Promise<void> {
    await db.delete(salesRepTerritories).where(eq(salesRepTerritories.id, id));
  }

  // Auxiliary data (stored in yearlySalesData with year 9993)
  async getAuxiliaryData(userId: number): Promise<Record<string, any> | null> {
    const rows = await db.select().from(yearlySalesData).where(
      and(eq(yearlySalesData.year, 9993), eq(yearlySalesData.userId, userId), eq(yearlySalesData.dataType, 'managerTerritories'))
    );
    if (rows.length === 0) return null;
    return rows[0].aggregatedData as Record<string, any>;
  }

  async saveAuxiliaryData(userId: number, data: Record<string, any>): Promise<void> {
    // Delete existing auxiliary data for this user
    await db.delete(yearlySalesData).where(
      and(eq(yearlySalesData.year, 9993), eq(yearlySalesData.userId, userId), eq(yearlySalesData.dataType, 'managerTerritories'))
    );
    // Insert new data
    await db.insert(yearlySalesData).values({
      year: 9993,
      dataType: 'managerTerritories',
      aggregatedData: data,
      userId,
    });
  }
}

export const storage = new DatabaseStorage();
