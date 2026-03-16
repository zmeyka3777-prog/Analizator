import { defineConfig } from "drizzle-kit";

if (!process.env.POSTGRESQL_HOST || !process.env.POSTGRESQL_USER || !process.env.POSTGRESQL_PASSWORD || !process.env.POSTGRESQL_DBNAME) {
  throw new Error("Drizzle: требуются переменные POSTGRESQL_HOST / USER / PASSWORD / DBNAME для Timeweb Cloud.");
}

const host = process.env.POSTGRESQL_HOST || "localhost";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    host,
    port: parseInt(process.env.POSTGRESQL_PORT || "5432"),
    user: process.env.POSTGRESQL_USER,
    password: process.env.POSTGRESQL_PASSWORD,
    database: process.env.POSTGRESQL_DBNAME,
    ssl: host === "localhost" || host === "127.0.0.1" ? false : "require",
  },
});
