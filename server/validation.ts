import sanitizeHtml from "sanitize-html";
import { z } from "zod";

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
  disallowedTagsMode: "discard",
};

export function sanitizeString(input: string): string {
  if (typeof input !== "string") return "";
  
  let sanitized = sanitizeHtml(input, sanitizeOptions);
  
  sanitized = sanitized
    .replace(/['";\\`]/g, "")
    .replace(/--/g, "")
    .replace(/\/\*/g, "")
    .replace(/\*\//g, "")
    .replace(/\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b/gi, "")
    .trim();
  
  return sanitized;
}

export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      result[key] = sanitizeString(value);
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      result[key] = sanitizeObject(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[key] = value.map(item => 
        typeof item === "string" ? sanitizeString(item) :
        typeof item === "object" && item !== null ? sanitizeObject(item as Record<string, unknown>) :
        item
      );
    } else {
      result[key] = value;
    }
  }
  
  return result as T;
}

export const loginSchema = z.object({
  email: z.string().email("Некорректный email").max(255),
  password: z.string().min(1, "Пароль обязателен").max(128),
});

export const registerSchema = z.object({
  email: z.string()
    .email("Некорректный email")
    .max(255),
  password: z.string()
    .min(6, "Пароль должен быть не менее 6 символов")
    .max(128),
  name: z.string()
    .min(2, "Имя должно быть не менее 2 символов")
    .max(100)
    .transform(sanitizeString),
});

export const passwordResetRequestSchema = z.object({
  email: z.string()
    .email("Некорректный email")
    .max(255),
});

export const passwordResetConfirmSchema = z.object({
  email: z.string().email("Некорректный email").max(255),
  token: z.string().min(1, "Токен обязателен").max(128),
  newPassword: z.string()
    .min(6, "Пароль должен быть не менее 6 символов")
    .max(128),
});

export const reportSchema = z.object({
  userId: z.number().int().positive(),
  name: z.string().min(1, "Название обязательно").max(255),
  type: z.string().min(1, "Тип обязателен").max(50),
  filters: z.unknown(),
  data: z.unknown(),
}).transform(data => ({
  ...data,
  name: sanitizeString(data.name),
  type: sanitizeString(data.type),
}));

export const planSchema = z.object({
  userId: z.number().int().positive(),
  year: z.number().int().min(2020).max(2100),
  territoryId: z.number().int().positive().optional().nullable(),
  drugId: z.number().int().positive().optional().nullable(),
  planValue: z.string().min(1),
  isLocked: z.boolean().optional(),
}).transform(data => ({
  ...data,
  planValue: sanitizeString(data.planValue),
}));

export const uploadSchema = z.object({
  userId: z.number().int().positive(),
  filename: z.string().min(1, "Имя файла обязательно").max(255),
  status: z.string().min(1),
  rowsCount: z.number().int().min(0).optional(),
  errorMessage: z.string().max(1000).optional().nullable(),
}).transform(data => ({
  ...data,
  filename: sanitizeString(data.filename),
  status: sanitizeString(data.status),
  errorMessage: data.errorMessage ? sanitizeString(data.errorMessage) : data.errorMessage,
}));

export const salesBatchSchema = z.object({
  sales: z.array(z.object({
    drugId: z.number().int().positive(),
    territoryId: z.number().int().positive(),
    contragentId: z.number().int().positive().optional(),
    period: z.string().max(50),
    year: z.number().int().min(2000).max(2100),
    month: z.number().int().min(1).max(12),
    amount: z.number().min(0),
    quantity: z.number().int().min(0),
  })),
});

export const yearlySalesDataSchema = z.object({
  userId: z.number().int().positive(),
  year: z.number().int().min(2020).max(9999),
  dataType: z.string().min(1).max(50),
  aggregatedData: z.unknown(),
  isLocked: z.boolean().optional(),
}).transform(data => ({
  ...data,
  dataType: sanitizeString(data.dataType),
}));

export function parseIntParam(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const num = parseInt(value, 10);
  return isNaN(num) || num < 0 ? undefined : num;
}
