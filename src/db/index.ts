import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Db = NodePgDatabase<typeof schema>;
/** Cliente ou transação: serviços aceitam os dois. */
export type DbOrTx = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não configurada");
  return url;
}

const globalForDb = globalThis as unknown as { __aulaPool?: Pool };

// Um pool por processo (o hot reload do Next recria módulos).
export const pool = globalForDb.__aulaPool ?? new Pool({ connectionString: databaseUrl(), max: 10 });
if (process.env.NODE_ENV !== "production") globalForDb.__aulaPool = pool;

export const db: Db = drizzle(pool, { schema, casing: "snake_case" });
