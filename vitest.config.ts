import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Banco descartável por execução, criado no Postgres do Docker Compose (test/global-setup.ts).
const adminUrl = process.env.TEST_DATABASE_ADMIN_URL ?? "postgres://aula:aula_dev@localhost:5432/postgres";
const dbName = process.env.TEST_DB_NAME ?? `aula_test_${Date.now()}_${process.pid}`;
const testUrl = new URL(adminUrl);
testUrl.pathname = `/${dbName}`;
process.env.TEST_DB_NAME = dbName;

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["src/**/*.test.ts"],
    globalSetup: ["./src/test/global-setup.ts"],
    env: { DATABASE_URL: testUrl.toString(), TEST_DATABASE_ADMIN_URL: adminUrl, TEST_DB_NAME: dbName },
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
