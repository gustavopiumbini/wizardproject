"use server";
import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import type { ActionState } from "@/lib/action-result";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { allowLoginAttempt, clearLoginAttempts, loginKeys } from "./service";

const loginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(200),
});

export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { status: "error", message: "Informe e-mail e senha válidos." };
  const requestHeaders = await headers();
  // IP do proxy reverso; sem ele, vale só o limite por e-mail.
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const keys = loginKeys(parsed.data.email, ip);
  if (!(await allowLoginAttempt(db, keys))) {
    logger.warn("auth.sign_in_throttled");
    return { status: "error", message: "Muitas tentativas de entrada. Aguarde 15 minutos e tente de novo." };
  }
  try {
    await auth.api.signInEmail({ body: parsed.data, headers: requestHeaders });
    await clearLoginAttempts(db, keys);
  } catch (error) {
    if (error instanceof APIError) return { status: "error", message: "E-mail ou senha incorretos." };
    logger.error("auth.sign_in_failed", { error });
    return { status: "error", message: "Não foi possível entrar agora. Tente novamente." };
  }
  redirect("/");
}

export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}
