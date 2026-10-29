import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;
const env = {
  DATABASE_URL: process.env.E2E_DATABASE_URL ?? "postgres://aula:aula_dev@localhost:5432/aula_e2e",
  BETTER_AUTH_URL: baseURL,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "e2e-only-secret-not-for-production-0123456789",
  DEMO_MODE: "true",
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "mobile", use: { ...devices["Pixel 7"] } }],
  webServer: {
    // Banco descartável recriado com seed antes de subir o app.
    command: `tsx scripts/e2e-db.ts && next dev --port ${PORT}`,
    url: `${baseURL}/login`,
    env,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
