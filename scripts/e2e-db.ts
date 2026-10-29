// Recria o banco do e2e (descartável), aplica as migrações e o seed demonstrativo.
import { Client } from "pg";

const url = new URL(process.env.DATABASE_URL ?? "");
const name = url.pathname.slice(1);
if (!/^aula_e2e[a-z0-9_]*$/.test(name)) throw new Error(`Banco de e2e inválido: ${name}`);
const admin = new URL(url);
admin.pathname = "/postgres";

const client = new Client({ connectionString: admin.toString() });
await client.connect();
await client.query(`drop database if exists "${name}" with (force)`);
await client.query(`create database "${name}"`);
await client.end();

const { runMigrations } = await import("../src/db/migrate");
const { seed } = await import("../src/db/seed");
const { pool } = await import("../src/db/index");
await runMigrations();
await seed();
await pool.end();
