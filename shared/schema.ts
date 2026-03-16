import { pgTable, pgSchema, serial, varchar, text, integer, timestamp, jsonb, decimal, boolean, uniqueIndex, numeric } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Отдельная схема для проекта World Medicine
export const wmSchema = pgSchema("world_medicine");

export const users = wmSchema.table("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("analyst"),
  avatar: varchar("avatar", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLogin: timestamp("last_login"),
});

export const drugs = wmSchema.table("drugs", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 500 }).notNull(),
  shortName: varchar("short_name", { length: 255 }),
  dosage: varchar("dosage", { length: 100 }),
  form: varchar("form", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const territories = wmSchema.table("territories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  parentId: integer("parent_id"),
  level: varchar("level", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contragents = wmSchema.table("contragents", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 500 }).notNull(),
  groupName: varchar("group_name", { length: 255 }),
  city: varchar("city", { length: 255 }),
  region: varchar("region", { length: 255 }),
  settlement: varchar("settlement", { length: 255 }),
  district: varchar("district", { length: 255 }),
  territoryId: integer("territory_id").references(() => territories.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sales = wmSchema.table("sales", {
  id: serial("id").primaryKey(),
  drugId: integer("drug_id").references(() => drugs.id).notNull(),
  territoryId: integer("territory_id").references(() => territories.id).notNull(),
  contragentId: integer("contragent_id").references(() => contragents.id),
  period: varchar("period", { length: 20 }).notNull(),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const savedReports = wmSchema.table("saved_reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  filters: jsonb("filters").notNull(),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const savedPlans = wmSchema.table("saved_plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  year: integer("year").notNull(),
  territoryId: integer("territory_id").references(() => territories.id),
  drugId: integer("drug_id").references(() => drugs.id),
  planValue: decimal("plan_value", { precision: 15, scale: 2 }).notNull(),
  isLocked: boolean("is_locked").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const uploadHistory = wmSchema.table("upload_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  uploadId: varchar("upload_id", { length: 100 }).notNull(),
  filename: varchar("filename", { length: 500 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  rowsCount: integer("rows_count"),
  yearPeriod: integer("year_period"),
  monthPeriod: varchar("month_period", { length: 50 }),
  isActive: boolean("is_active").default(true).notNull(),
  errorMessage: text("error_message"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const yearlySalesData = wmSchema.table("yearly_sales_data", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  year: integer("year").notNull(),
  dataType: varchar("data_type", { length: 50 }).notNull(),
  aggregatedData: jsonb("aggregated_data").notNull(),
  isLocked: boolean("is_locked").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const rawSalesRows = wmSchema.table("raw_sales_rows", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  uploadId: varchar("upload_id", { length: 100 }).notNull(),
  year: integer("year"),
  month: varchar("month", { length: 10 }),
  region: varchar("region", { length: 500 }),
  city: varchar("city", { length: 500 }),
  settlement: varchar("settlement", { length: 500 }),
  district: varchar("district", { length: 500 }),
  contragent: varchar("contragent", { length: 1000 }),
  drug: varchar("drug", { length: 1000 }),
  complexDrugName: varchar("complex_drug_name", { length: 1000 }),
  quantity: numeric("quantity", { precision: 15, scale: 2 }),
  amount: numeric("amount", { precision: 15, scale: 2 }),
  disposalType: varchar("disposal_type", { length: 500 }),
  disposalTypeCode: varchar("disposal_type_code", { length: 50 }),
  federalDistrict: varchar("federal_district", { length: 500 }),
  receiverType: varchar("receiver_type", { length: 500 }),
  contractorGroup: varchar("contractor_group", { length: 500 }),
  address: text("address"),
});

export const passwordResetTokens = wmSchema.table("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  tokenHash: varchar("token_hash", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  savedReports: many(savedReports),
  savedPlans: many(savedPlans),
  uploadHistory: many(uploadHistory),
  settings: one(userSettings),
  sessions: many(userSessions),
  notifications: many(notifications),
  auditLogs: many(auditLog),
  budgetScenarios: many(budgetScenarios),
}));

export const territoriesRelations = relations(territories, ({ one, many }) => ({
  parent: one(territories, {
    fields: [territories.parentId],
    references: [territories.id],
  }),
  children: many(territories),
  contragents: many(contragents),
  sales: many(sales),
  savedPlans: many(savedPlans),
}));

export const drugsRelations = relations(drugs, ({ many }) => ({
  sales: many(sales),
  savedPlans: many(savedPlans),
}));

export const contragentsRelations = relations(contragents, ({ one, many }) => ({
  territory: one(territories, {
    fields: [contragents.territoryId],
    references: [territories.id],
  }),
  sales: many(sales),
}));

export const salesRelations = relations(sales, ({ one }) => ({
  drug: one(drugs, {
    fields: [sales.drugId],
    references: [drugs.id],
  }),
  territory: one(territories, {
    fields: [sales.territoryId],
    references: [territories.id],
  }),
  contragent: one(contragents, {
    fields: [sales.contragentId],
    references: [contragents.id],
  }),
}));

export const savedReportsRelations = relations(savedReports, ({ one }) => ({
  user: one(users, {
    fields: [savedReports.userId],
    references: [users.id],
  }),
}));

export const savedPlansRelations = relations(savedPlans, ({ one }) => ({
  user: one(users, {
    fields: [savedPlans.userId],
    references: [users.id],
  }),
  territory: one(territories, {
    fields: [savedPlans.territoryId],
    references: [territories.id],
  }),
  drug: one(drugs, {
    fields: [savedPlans.drugId],
    references: [drugs.id],
  }),
}));

export const uploadHistoryRelations = relations(uploadHistory, ({ one }) => ({
  user: one(users, {
    fields: [uploadHistory.userId],
    references: [users.id],
  }),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}));

export const yearlySalesDataRelations = relations(yearlySalesData, ({ one }) => ({
  user: one(users, {
    fields: [yearlySalesData.userId],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Drug = typeof drugs.$inferSelect;
export type InsertDrug = typeof drugs.$inferInsert;
export type Territory = typeof territories.$inferSelect;
export type InsertTerritory = typeof territories.$inferInsert;
export type Contragent = typeof contragents.$inferSelect;
export type InsertContragent = typeof contragents.$inferInsert;
export type Sale = typeof sales.$inferSelect;
export type InsertSale = typeof sales.$inferInsert;
export type SavedReport = typeof savedReports.$inferSelect;
export type InsertSavedReport = typeof savedReports.$inferInsert;
export type SavedPlan = typeof savedPlans.$inferSelect;
export type InsertSavedPlan = typeof savedPlans.$inferInsert;
export type UploadHistory = typeof uploadHistory.$inferSelect;
export type InsertUploadHistory = typeof uploadHistory.$inferInsert;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;
export type YearlySalesData = typeof yearlySalesData.$inferSelect;
export type InsertYearlySalesData = typeof yearlySalesData.$inferInsert;

export const conversations = wmSchema.table("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = wmSchema.table("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

export const budgetScenarios = wmSchema.table("budget_scenarios", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  currentBudget: decimal("current_budget", { precision: 20, scale: 2 }).notNull(),
  growthPercent: decimal("growth_percent", { precision: 5, scale: 2 }).notNull(),
  targetBudget: decimal("target_budget", { precision: 20, scale: 2 }).notNull(),
  drugs: jsonb("drugs").notNull(),
  districtShares: jsonb("district_shares").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const budgetScenariosRelations = relations(budgetScenarios, ({ one }) => ({
  user: one(users, {
    fields: [budgetScenarios.userId],
    references: [users.id],
  }),
}));

export type BudgetScenario = typeof budgetScenarios.$inferSelect;
export type InsertBudgetScenario = typeof budgetScenarios.$inferInsert;

// Настройки пользователя
export const userSettings = wmSchema.table("user_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  theme: varchar("theme", { length: 20 }).default("light").notNull(),
  language: varchar("language", { length: 10 }).default("ru").notNull(),
  emailNotifications: boolean("email_notifications").default(true).notNull(),
  pushNotifications: boolean("push_notifications").default(true).notNull(),
  defaultView: varchar("default_view", { length: 50 }).default("dashboard"),
  dateFormat: varchar("date_format", { length: 20 }).default("DD.MM.YYYY"),
  timezone: varchar("timezone", { length: 50 }).default("Europe/Moscow"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Сессии пользователя
export const userSessions = wmSchema.table("user_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  tokenHash: varchar("token_hash", { length: 255 }).notNull(),
  deviceName: varchar("device_name", { length: 255 }),
  deviceType: varchar("device_type", { length: 50 }),
  browser: varchar("browser", { length: 100 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  isActive: boolean("is_active").default(true).notNull(),
  lastActivityAt: timestamp("last_activity_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Журнал аудита
export const auditLog = wmSchema.table("audit_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: integer("entity_id"),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Уведомления
export const notifications = wmSchema.table("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  link: varchar("link", { length: 500 }),
  isRead: boolean("is_read").default(false).notNull(),
  readAt: timestamp("read_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Прайс-лист препаратов (паттерн → цена за упаковку)
export const drugPrices = wmSchema.table("drug_prices", {
  id: serial("id").primaryKey(),
  drugPattern: varchar("drug_pattern", { length: 255 }).notNull(),
  drugLabel: varchar("drug_label", { length: 500 }).notNull(),
  pricePerUnit: numeric("price_per_unit", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Продукты WM Russia
export const wmProducts = wmSchema.table("wm_products", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 500 }).notNull(),
  shortName: varchar("short_name", { length: 100 }),
  category: varchar("category", { length: 100 }),
  dosage: varchar("dosage", { length: 100 }),
  form: varchar("form", { length: 100 }),
  packSize: integer("pack_size"),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Связь препаратов MDLP с продуктами WM
export const drugToWmProduct = wmSchema.table("drug_to_wm_product", {
  id: serial("id").primaryKey(),
  drugId: integer("drug_id").references(() => drugs.id, { onDelete: "cascade" }).notNull(),
  wmProductId: integer("wm_product_id").references(() => wmProducts.id, { onDelete: "cascade" }).notNull(),
  mappingType: varchar("mapping_type", { length: 50 }).default("exact").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueDrugWmProduct: uniqueIndex("unique_drug_wm_product").on(table.drugId, table.wmProductId),
}));

// Relations для новых таблиц
export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id],
  }),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  user: one(users, {
    fields: [auditLog.userId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));


export const wmProductsRelations = relations(wmProducts, ({ many }) => ({
  drugMappings: many(drugToWmProduct),
}));

export const drugToWmProductRelations = relations(drugToWmProduct, ({ one }) => ({
  drug: one(drugs, {
    fields: [drugToWmProduct.drugId],
    references: [drugs.id],
  }),
  wmProduct: one(wmProducts, {
    fields: [drugToWmProduct.wmProductId],
    references: [wmProducts.id],
  }),
}));

// Маппинг колонок для файлов разных форматов
export const columnMappings = wmSchema.table("column_mappings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  profileName: varchar("profile_name", { length: 255 }).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  mappings: jsonb("mappings").notNull(), // { systemField: "userColumn", ... }
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const columnMappingsRelations = relations(columnMappings, ({ one }) => ({
  user: one(users, {
    fields: [columnMappings.userId],
    references: [users.id],
  }),
}));

// Территории медпредов (кастомные округа)
export const salesRepTerritories = wmSchema.table("sales_rep_territories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  regions: jsonb("regions").notNull(), // массив регионов
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const salesRepTerritoriesRelations = relations(salesRepTerritories, ({ one }) => ({
  user: one(users, {
    fields: [salesRepTerritories.userId],
    references: [users.id],
  }),
}));

// Типы для новых таблиц
export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = typeof userSettings.$inferInsert;
export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = typeof userSessions.$inferInsert;
export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = typeof auditLog.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
export type DrugPrice = typeof drugPrices.$inferSelect;
export type InsertDrugPrice = typeof drugPrices.$inferInsert;
export type WmProduct = typeof wmProducts.$inferSelect;
export type InsertWmProduct = typeof wmProducts.$inferInsert;
export type DrugToWmProduct = typeof drugToWmProduct.$inferSelect;
export type InsertDrugToWmProduct = typeof drugToWmProduct.$inferInsert;
export type ColumnMapping = typeof columnMappings.$inferSelect;
export type InsertColumnMapping = typeof columnMappings.$inferInsert;
export type SalesRepTerritory = typeof salesRepTerritories.$inferSelect;
export type InsertSalesRepTerritory = typeof salesRepTerritories.$inferInsert;
