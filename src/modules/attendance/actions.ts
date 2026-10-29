"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { toErrorState, type ActionState } from "@/lib/action-result";
import { requireContext } from "@/lib/context";
import { attendanceStatusEnum } from "./schema";
import { correctAttendance, MIN_REASON_LENGTH, saveAttendance } from "./service";

const status = z.enum(attendanceStatusEnum.enumValues);

const saveSchema = z.object({
  lessonId: z.uuid(),
  expectedVersion: z.coerce.number().int().min(0),
  intent: z.enum(["draft", "finalize"]),
  confirmPending: z.literal("1").optional(),
  marks: z.array(z.object({ participantId: z.uuid(), status })).max(200),
});

function marksFrom(formData: FormData) {
  const marks: { participantId: string; status: string }[] = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("mark:") && typeof value === "string") marks.push({ participantId: key.slice(5), status: value });
  }
  return marks;
}

export async function saveAttendanceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = saveSchema.safeParse({
    lessonId: formData.get("lessonId"),
    expectedVersion: formData.get("expectedVersion"),
    intent: formData.get("intent"),
    confirmPending: formData.get("confirmPending") ?? undefined,
    marks: marksFrom(formData),
  });
  if (!parsed.success) return { status: "error", message: "Dados da chamada inválidos." };
  const input = parsed.data;
  try {
    const ctx = await requireContext();
    const result = await saveAttendance(db, ctx, {
      lessonId: input.lessonId,
      expectedVersion: input.expectedVersion,
      marks: input.marks,
      finalize: input.intent === "finalize",
      confirmPending: input.confirmPending === "1",
    });
    revalidatePath(`/aulas/${input.lessonId}`);
    return {
      status: "ok",
      version: result.version,
      savedAt: new Date().toISOString(),
      message: result.status === "finalized" ? "Chamada finalizada." : "Rascunho salvo.",
    };
  } catch (error) {
    return toErrorState(error);
  }
}

const correctionSchema = z.object({
  lessonId: z.uuid(),
  participantId: z.uuid(),
  status,
  reason: z.string().trim().min(MIN_REASON_LENGTH, `Informe o motivo (mínimo de ${MIN_REASON_LENGTH} caracteres).`).max(500),
});

export async function correctAttendanceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = correctionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  try {
    const ctx = await requireContext();
    await correctAttendance(db, ctx, parsed.data);
    revalidatePath(`/aulas/${parsed.data.lessonId}`);
    return { status: "ok", message: "Correção registrada." };
  } catch (error) {
    return toErrorState(error);
  }
}
