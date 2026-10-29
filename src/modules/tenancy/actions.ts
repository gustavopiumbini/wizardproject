"use server";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { requireSession } from "@/lib/context";
import { session } from "@/modules/identity/schema";
import { unitBelongsToUser } from "./service";

export async function selectUnitAction(formData: FormData) {
  const parsed = z.object({ unitId: z.uuid() }).safeParse({ unitId: formData.get("unitId") });
  if (!parsed.success) redirect("/selecionar-unidade");
  const s = await requireSession();
  // A unidade enviada pelo cliente só vale se o usuário tiver vínculo com ela.
  if (!(await unitBelongsToUser(db, s.userId, parsed.data.unitId))) redirect("/selecionar-unidade");
  await db
    .update(session)
    .set({ activeUnitId: parsed.data.unitId })
    .where(and(eq(session.id, s.sessionId), eq(session.userId, s.userId)));
  redirect("/");
}
