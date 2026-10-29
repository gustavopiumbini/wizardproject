import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { DbOrTx } from "@/db";
import { AppError, forbidden, notFound } from "@/lib/errors";
import { lessonParticipant, student } from "@/modules/academic/schema";
import { listUnitLessonsForDay, loadLesson, type LessonSummary } from "@/modules/academic/service";
import { user } from "@/modules/identity/schema";
import { can } from "@/modules/tenancy/policy";
import type { AppContext } from "@/modules/tenancy/service";
import { attendanceRecord, attendanceRevision, attendanceSheet, type AttendanceStatus } from "./schema";

export const MIN_REASON_LENGTH = 5;

export type Mark = { participantId: string; status: AttendanceStatus };

/** Participantes vigentes da aula (não retirados), com nome de exibição. */
async function activeParticipants(db: DbOrTx, ctx: AppContext, lessonId: string) {
  return db
    .select({
      participantId: lessonParticipant.id,
      studentId: student.id,
      studentName: student.displayName,
      kind: lessonParticipant.kind,
    })
    .from(lessonParticipant)
    .innerJoin(student, eq(student.id, lessonParticipant.studentId))
    .where(
      and(
        eq(lessonParticipant.organizationId, ctx.organizationId),
        eq(lessonParticipant.unitId, ctx.unitId),
        eq(lessonParticipant.lessonId, lessonId),
        isNull(lessonParticipant.removedAt),
      ),
    )
    .orderBy(asc(student.displayName));
}

async function recordsByParticipant(db: DbOrTx, ctx: AppContext, lessonId: string) {
  const rows = await db
    .select({ participantId: attendanceRecord.participantId, status: attendanceRecord.status })
    .from(attendanceRecord)
    .where(and(eq(attendanceRecord.unitId, ctx.unitId), eq(attendanceRecord.lessonId, lessonId)));
  return new Map(rows.map((r) => [r.participantId, r.status]));
}

async function lockSheet(tx: DbOrTx, ctx: AppContext, lessonId: string) {
  const [sheet] = await tx
    .select()
    .from(attendanceSheet)
    .where(and(eq(attendanceSheet.unitId, ctx.unitId), eq(attendanceSheet.lessonId, lessonId)))
    .for("update");
  return sheet ?? null;
}

/** Ficha da aula com a chamada atual. Aluno sem marcação aparece como "not_recorded". */
export async function getLessonAttendance(db: DbOrTx, ctx: AppContext, lessonId: string) {
  const loaded = await loadLesson(db, ctx, lessonId);
  if (!loaded) throw notFound();
  if (!can(ctx, "lesson.view", loaded.resource)) throw notFound();

  const [participants, records, sheetRows, revisions] = await Promise.all([
    activeParticipants(db, ctx, lessonId),
    recordsByParticipant(db, ctx, lessonId),
    db
      .select({
        status: attendanceSheet.status,
        version: attendanceSheet.version,
        finalizedAt: attendanceSheet.finalizedAt,
        finalizedByName: user.name,
      })
      .from(attendanceSheet)
      .leftJoin(user, eq(user.id, attendanceSheet.finalizedBy))
      .where(and(eq(attendanceSheet.unitId, ctx.unitId), eq(attendanceSheet.lessonId, lessonId))),
    db
      .select({
        id: attendanceRevision.id,
        participantId: attendanceRevision.participantId,
        previousStatus: attendanceRevision.previousStatus,
        newStatus: attendanceRevision.newStatus,
        reason: attendanceRevision.reason,
        authorName: user.name,
        createdAt: attendanceRevision.createdAt,
      })
      .from(attendanceRevision)
      .innerJoin(user, eq(user.id, attendanceRevision.authorId))
      .where(and(eq(attendanceRevision.unitId, ctx.unitId), eq(attendanceRevision.lessonId, lessonId)))
      .orderBy(desc(attendanceRevision.createdAt)),
  ]);
  const sheet = sheetRows[0] ?? null;
  const resource = { ...loaded.resource, finalizedAt: sheet?.finalizedAt ?? null };

  return {
    lesson: loaded.lesson,
    participants: participants.map((p) => ({ ...p, status: records.get(p.participantId) ?? "not_recorded" })),
    sheet: sheet ?? { status: "draft" as const, version: 0, finalizedAt: null, finalizedByName: null },
    revisions,
    permissions: {
      record: loaded.lesson.status === "scheduled" && can(ctx, "attendance.record", resource),
      correct: sheet?.status === "finalized" && can(ctx, "attendance.correct", resource),
    },
  };
}

export type SaveInput = {
  lessonId: string;
  expectedVersion: number;
  marks: Mark[];
  finalize: boolean;
  /** Confirma finalizar mesmo com alunos não registrados (regra documentada em docs/permissoes.md). */
  confirmPending: boolean;
};

/** Salva o rascunho e, se pedido, finaliza. Concorrência otimista pela versão da chamada. */
export async function saveAttendance(db: DbOrTx, ctx: AppContext, input: SaveInput) {
  return db.transaction(async (tx) => {
    const loaded = await loadLesson(tx, ctx, input.lessonId);
    if (!loaded || !can(ctx, "lesson.view", loaded.resource)) throw notFound();
    if (!can(ctx, "attendance.record", loaded.resource)) throw forbidden();
    if (loaded.lesson.status !== "scheduled") throw new AppError("invalid_state", "Aula cancelada não recebe chamada.");

    let sheet = await lockSheet(tx, ctx, input.lessonId);
    if (!sheet) {
      await tx
        .insert(attendanceSheet)
        .values({ organizationId: ctx.organizationId, unitId: ctx.unitId, lessonId: input.lessonId, version: 0, updatedBy: ctx.userId })
        .onConflictDoNothing();
      sheet = await lockSheet(tx, ctx, input.lessonId);
    }
    if (!sheet) throw new Error("chamada não criada");
    if (sheet.status === "finalized") {
      throw new AppError("invalid_state", "A chamada já foi finalizada. Alterações agora são correções com motivo.");
    }
    if (sheet.version !== input.expectedVersion) {
      throw new AppError("conflict", "A chamada foi alterada por outra pessoa. Recarregue para ver a versão atual.");
    }

    const participants = await activeParticipants(tx, ctx, input.lessonId);
    const valid = new Set(participants.map((p) => p.participantId));
    if (input.marks.some((m) => !valid.has(m.participantId))) {
      throw new AppError("validation", "Há aluno que não faz parte desta aula.");
    }

    if (input.marks.length > 0) {
      await tx
        .insert(attendanceRecord)
        .values(
          input.marks.map((m) => ({
            organizationId: ctx.organizationId,
            unitId: ctx.unitId,
            lessonId: input.lessonId,
            participantId: m.participantId,
            status: m.status,
            updatedBy: ctx.userId,
          })),
        )
        .onConflictDoUpdate({
          target: [attendanceRecord.lessonId, attendanceRecord.participantId],
          set: { status: sql`excluded.status`, updatedBy: ctx.userId, updatedAt: new Date() },
        });
    }

    if (input.finalize) {
      const records = await recordsByParticipant(tx, ctx, input.lessonId);
      const pending = participants.filter((p) => (records.get(p.participantId) ?? "not_recorded") === "not_recorded").length;
      if (pending > 0 && !input.confirmPending) {
        throw new AppError("pending_confirmation", "Há alunos sem registro.", { pending });
      }
    }

    const now = new Date();
    const [updated] = await tx
      .update(attendanceSheet)
      .set({
        version: sql`${attendanceSheet.version} + 1`,
        updatedBy: ctx.userId,
        updatedAt: now,
        ...(input.finalize ? { status: "finalized" as const, finalizedAt: now, finalizedBy: ctx.userId } : {}),
      })
      .where(and(eq(attendanceSheet.id, sheet.id), eq(attendanceSheet.unitId, ctx.unitId)))
      .returning({ version: attendanceSheet.version, status: attendanceSheet.status });
    if (!updated) throw new Error("chamada não atualizada");
    return updated;
  });
}

export type CorrectionInput = { lessonId: string; participantId: string; status: AttendanceStatus; reason: string };

/** Correção após a finalização: exige motivo e grava autor, data e valores antes/depois (critério 18). */
export async function correctAttendance(db: DbOrTx, ctx: AppContext, input: CorrectionInput) {
  const reason = input.reason.trim();
  if (reason.length < MIN_REASON_LENGTH) {
    throw new AppError("validation", `Informe o motivo da correção (mínimo de ${MIN_REASON_LENGTH} caracteres).`);
  }
  return db.transaction(async (tx) => {
    const loaded = await loadLesson(tx, ctx, input.lessonId);
    if (!loaded || !can(ctx, "lesson.view", loaded.resource)) throw notFound();
    const sheet = await lockSheet(tx, ctx, input.lessonId);
    if (!sheet || sheet.status !== "finalized") {
      throw new AppError("invalid_state", "Só é possível corrigir uma chamada finalizada.");
    }
    if (!can(ctx, "attendance.correct", { ...loaded.resource, finalizedAt: sheet.finalizedAt })) throw forbidden();

    const participants = await activeParticipants(tx, ctx, input.lessonId);
    if (!participants.some((p) => p.participantId === input.participantId)) {
      throw new AppError("validation", "O aluno não faz parte desta aula.");
    }
    const records = await recordsByParticipant(tx, ctx, input.lessonId);
    const previous = records.get(input.participantId) ?? "not_recorded";
    if (previous === input.status) throw new AppError("validation", "O novo valor é igual ao atual.");

    const tenant = { organizationId: ctx.organizationId, unitId: ctx.unitId, lessonId: input.lessonId };
    await tx
      .insert(attendanceRecord)
      .values({ ...tenant, participantId: input.participantId, status: input.status, updatedBy: ctx.userId })
      .onConflictDoUpdate({
        target: [attendanceRecord.lessonId, attendanceRecord.participantId],
        set: { status: input.status, updatedBy: ctx.userId, updatedAt: new Date() },
      });
    await tx.insert(attendanceRevision).values({
      ...tenant,
      participantId: input.participantId,
      previousStatus: previous,
      newStatus: input.status,
      reason,
      authorId: ctx.userId,
    });
    await tx
      .update(attendanceSheet)
      .set({ version: sql`${attendanceSheet.version} + 1`, updatedBy: ctx.userId, updatedAt: new Date() })
      .where(and(eq(attendanceSheet.id, sheet.id), eq(attendanceSheet.unitId, ctx.unitId)));
    return { previousStatus: previous, newStatus: input.status };
  });
}

export type OverviewRow = LessonSummary & {
  sheetStatus: "none" | "draft" | "finalized";
  total: number;
  counts: Record<AttendanceStatus, number>;
};

const emptyCounts = (): Record<AttendanceStatus, number> => ({
  not_recorded: 0,
  present: 0,
  absent: 0,
  late: 0,
  excused: 0,
});

/** Visão de chamadas da unidade no dia (coordenação, recepção e gestão). */
export async function listAttendanceOverview(db: DbOrTx, ctx: AppContext, day: string): Promise<OverviewRow[]> {
  const lessons = await listUnitLessonsForDay(db, ctx, day);
  if (lessons.length === 0) return [];
  const ids = lessons.map((l) => l.id);

  const [counts, sheets] = await Promise.all([
    db
      .select({
        lessonId: lessonParticipant.lessonId,
        status: sql<AttendanceStatus>`coalesce(${attendanceRecord.status}, 'not_recorded')`,
        n: sql<number>`count(*)::int`,
      })
      .from(lessonParticipant)
      .leftJoin(attendanceRecord, eq(attendanceRecord.participantId, lessonParticipant.id))
      .where(
        and(
          eq(lessonParticipant.unitId, ctx.unitId),
          inArray(lessonParticipant.lessonId, ids),
          isNull(lessonParticipant.removedAt),
        ),
      )
      .groupBy(lessonParticipant.lessonId, sql`2`),
    db
      .select({ lessonId: attendanceSheet.lessonId, status: attendanceSheet.status })
      .from(attendanceSheet)
      .where(and(eq(attendanceSheet.unitId, ctx.unitId), inArray(attendanceSheet.lessonId, ids))),
  ]);

  const sheetBy = new Map(sheets.map((s) => [s.lessonId, s.status]));
  return lessons.map((lesson) => {
    const c = emptyCounts();
    for (const row of counts) if (row.lessonId === lesson.id) c[row.status] += row.n;
    const total = Object.values(c).reduce((a, b) => a + b, 0);
    return { ...lesson, sheetStatus: sheetBy.get(lesson.id) ?? "none", total, counts: c };
  });
}
