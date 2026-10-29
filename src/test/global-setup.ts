import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";

const adminUrl = process.env.TEST_DATABASE_ADMIN_URL ?? "postgres://aula:aula_dev@localhost:5432/postgres";
const dbName = process.env.TEST_DB_NAME ?? "";

function urlFor(name: string) {
  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  return url.toString();
}

async function admin(sql: string) {
  const client = new Client({ connectionString: adminUrl });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

export async function setup() {
  if (!/^aula_test_[a-z0-9_]+$/.test(dbName)) throw new Error(`Nome de banco de teste inválido: ${dbName}`);
  await admin(`create database "${dbName}"`);
  const client = new Client({ connectionString: urlFor(dbName) });
  await client.connect();
  try {
    await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  } finally {
    await client.end();
  }
}

export async function teardown() {
  await admin(`drop database if exists "${dbName}" with (force)`);
}
