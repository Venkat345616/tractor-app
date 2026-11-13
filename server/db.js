import pg from "pg";
import "dotenv/config";

export const pool = new pg.Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT || 5432),
        user: process.env.DB_USER || "postgres",
        password: String(process.env.DB_PASSWORD ?? ""),
        database: process.env.DB_NAME || "tractor",
      }
);

// pg returns NUMERIC as strings; convert to numbers for JSON
pg.types.setTypeParser(1700, (v) => parseFloat(v));
// DATE columns as plain text like 2026-04-14 (no timezone shifting)
pg.types.setTypeParser(1082, (v) => v);
