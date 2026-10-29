// Aplica as migrações versionadas em drizzle/. Nunca roda durante build ou requisição.
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { logger } from "@/lib/logger";
import { db, pool } from "./index";

export async function runMigrations() {
  await migrate(db, { migrationsFolder: "drizzle" });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then(() => logger.info("migrations.applied"))
    .catch((error: unknown) => {
      logger.error("migrations.failed", { error });
      process.exitCode = 1;
    })
    .finally(() => void pool.end());
}
