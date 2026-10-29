import "server-only";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { session as sessionTable } from "@/modules/identity/schema";
import { listUserUnits, loadContext, type AppContext } from "@/modules/tenancy/service";
import { auth } from "./auth";

export type SessionInfo = { userId: string; sessionId: string; userName: string; activeUnitId: string | null };

/** Sessão autenticada ou redirecionamento para o login. Não grava nada (pode rodar em GET). */
export const requireSession = cache(async (): Promise<SessionInfo> => {
  const result = await auth.api.getSession({ headers: await headers() });
  if (!result) redirect("/login");
  const [row] = await db
    .select({ activeUnitId: sessionTable.activeUnitId })
    .from(sessionTable)
    .where(and(eq(sessionTable.id, result.session.id), eq(sessionTable.userId, result.user.id)));
  return {
    userId: result.user.id,
    sessionId: result.session.id,
    userName: result.user.name,
    activeUnitId: row?.activeUnitId ?? null,
  };
});

/**
 * Usuário, organização e unidade autenticados (regra 1). A unidade ativa da sessão é
 * revalidada contra os vínculos; com um único vínculo ela é usada sem precisar escolher.
 */
export const requireContext = cache(async (): Promise<AppContext> => {
  const s = await requireSession();
  if (s.activeUnitId) {
    const ctx = await loadContext(db, s.userId, s.activeUnitId);
    if (ctx) return ctx;
  }
  const units = await listUserUnits(db, s.userId);
  const only = units.length === 1 ? units[0] : undefined;
  if (only) {
    const ctx = await loadContext(db, s.userId, only.unitId);
    if (ctx) return ctx;
  }
  redirect(units.length === 0 ? "/sem-acesso" : "/selecionar-unidade");
});
