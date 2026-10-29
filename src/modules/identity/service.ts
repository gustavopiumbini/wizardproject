import { createHash } from "node:crypto";
import { inArray, sql } from "drizzle-orm";
import type { DbOrTx } from "@/db";
import { loginThrottle } from "./schema";

export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_LIMITS = { email: 5, ip: 30 } as const;

const hashKey = (raw: string) => createHash("sha256").update(raw).digest("hex");

export function loginKeys(email: string, ip: string | null) {
  return { email: hashKey(`email:${email.trim().toLowerCase()}`), ip: ip ? hashKey(`ip:${ip}`) : null };
}

/** Conta uma tentativa na janela atual e devolve o total. Atômico (upsert). */
async function hit(db: DbOrTx, key: string, now: Date): Promise<number> {
  const windowStart = new Date(now.getTime() - LOGIN_WINDOW_MS);
  const expired = sql`${loginThrottle.windowStartedAt} < ${windowStart}`;
  const [row] = await db
    .insert(loginThrottle)
    .values({ key, attempts: 1, windowStartedAt: now })
    .onConflictDoUpdate({
      target: loginThrottle.key,
      set: {
        attempts: sql`case when ${expired} then 1 else ${loginThrottle.attempts} + 1 end`,
        windowStartedAt: sql`case when ${expired} then ${now} else ${loginThrottle.windowStartedAt} end`,
      },
    })
    .returning({ attempts: loginThrottle.attempts });
  return row?.attempts ?? 1;
}

/** Registra a tentativa; false quando o limite por e-mail ou por IP foi excedido. */
export async function allowLoginAttempt(db: DbOrTx, keys: ReturnType<typeof loginKeys>, now = new Date()) {
  const byEmail = await hit(db, keys.email, now);
  const byIp = keys.ip ? await hit(db, keys.ip, now) : 0;
  return byEmail <= LOGIN_LIMITS.email && byIp <= LOGIN_LIMITS.ip;
}

/** Após login bem-sucedido, zera o contador do e-mail (o do IP continua). */
export async function clearLoginAttempts(db: DbOrTx, keys: ReturnType<typeof loginKeys>) {
  await db.delete(loginThrottle).where(inArray(loginThrottle.key, [keys.email]));
}

