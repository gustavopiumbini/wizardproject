// Worker separado do app (fila, outbox e lembretes). No incremento 1 ele só inicia o pg-boss
// e encerra limpo; nenhum job é registrado até o /inc3.
import { PgBoss } from "pg-boss";
import { logger } from "@/lib/logger";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL não configurada");

const boss = new PgBoss(connectionString);
boss.on("error", (error) => logger.error("worker.error", { error }));

async function shutdown(signal: string) {
  logger.info("worker.stopping", { signal });
  await boss.stop({ graceful: true });
  process.exit(0);
}

await boss.start();
logger.info("worker.started", { jobs: 0 });
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => void shutdown(signal));
}
