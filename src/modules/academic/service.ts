import { and, asc, eq, gte, inArray, isNull, lt, notExists, sql, type SQL } from "drizzle-orm";
import type { DbOrTx } from "@/db";
import { AppError, forbidden, notFound } from "@/lib/errors";
import { dayRange, shiftDay } from "@/lib/time";
import { attendanceRecord } from "@/modules/attendance/schema";
import { can, unitResource, type LessonResource } from "@/modules/tenancy/policy";
import type { AppContext } from "@/modules/tenancy/service";
import {
  classGroup,
  classMembership,
  lessonOccurrence,
  lessonParticipant,
  room,
  teacherAssignment,
  teacherProfile,
} from "./schema";

export type LessonSummary = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  type: (typeof lessonOccurrence.$inferSelect)["type"];
  status: (typeof lessonOccurrence.$inferSelect)["status"];
  classCode: string | null;
  classLevel: string | null;
  roomName: string | null;
  teacherName: string | null;
  teacherRole: (typeof teacherAssignment.$inferSelect)["role"] | null;
  plannedContent: string | null;
};

const summaryColumns = {
  id: lessonOccurrence.id,
  startsAt: lessonOccurrence.startsAt,
  endsAt: lessonOccurrence.endsAt,
  timezone: lessonOccurrence.timezone,
  type: lessonOccurrence.type,
  status: lessonOccurrence.status,
  classCode: classGroup.code,
  classLevel: classGroup.level,
  roomName: room.name,
  teacherName: teacherProfile.displayName,
  teacherRole: teacherAssignment.role,
  plannedContent: lessonOccurrence.plannedContent,
};

/** Consulta base de aulas, sempre restrita à organização e unidade do contexto. */
function lessonsQuery(db: DbOrTx, ctx: AppContext, ...conditions: (SQL | undefined)[]) {
  return db
    .select(summaryColumns)
    .from(lessonOccurrence)
    .leftJoin(classGroup, eq(classGroup.id, lessonOccurrence.classGroupId))
    .leftJoin(room, eq(room.id, lessonOccurrence.roomId))
    .leftJoin(
      teacherAssignment,
      and(eq(teacherAssignment.lessonId, lessonOccurrence.id), eq(teacherAssignment.status, "active")),
    )
    .leftJoin(teacherProfile, eq(teacherProfile.id, teacherAssignment.teacherProfileId))
    .where(
      and(
        eq(lessonOccurrence.organizationId, ctx.organizationId),
        eq(lessonOccurrence.unitId, ctx.unitId),
        ...conditions,
      ),
    );
}

/** Carrega a aula pela tenancy do contexto e monta o recurso para `can()`. */
export async function loadLesson(db: DbOrTx, ctx: AppContext, lessonId: string) {
  const [lesson] = await lessonsQuery(db, ctx, eq(lessonOccurrence.id, lessonId));
  if (!lesson) return null;
  const assignments = await db
    .select({ teacherProfileId: teacherAssignment.teacherProfileId })
    .from(teacherAssignment)
    .where(
      and(
        eq(teacherAssignment.lessonId, lessonId),
        eq(teacherAssignment.unitId, ctx.unitId),
        eq(teacherAssignment.status, "active"),
      ),
    );
  const resource: LessonResource = {
    kind: "lesson",
    organizationId: ctx.organizationId,
    unitId: ctx.unitId,
    activeTeacherProfileIds: assignments.map((a) => a.teacherProfileId),
  };
  return { lesson, resource };
}

/** Aulas do dia em que o professor do contexto é o docente efetivo. */
export async function listOwnLessonsForDay(db: DbOrTx, ctx: AppContext, day: string): Promise<LessonSummary[]> {
  if (!ctx.teacherProfileId || !can(ctx, "lesson.listOwn", unitResource(ctx))) throw forbidden();
  const { start, end } = dayRange(day, ctx.timezone);
  return lessonsQuery(
    db,
    ctx,
    gte(lessonOccurrence.startsAt, start),
    lt(lessonOccurrence.startsAt, end),
    eq(teacherAssignment.teacherProfileId, ctx.teacherProfileId),
  ).orderBy(asc(lessonOccurrence.startsAt));
}

/** Todas as aulas da unidade no dia (coordenação/recepção). */
export async function listUnitLessonsForDay(db: DbOrTx, ctx: AppContext, day: string): Promise<LessonSummary[]> {
  if (!can(ctx, "attendance.overview", unitResource(ctx))) throw forbidden();
  const { start, end } = dayRange(day, ctx.timezone);
  return lessonsQuery(db, ctx, gte(lessonOccurrence.startsAt, start), lt(lessonOccurrence.startsAt, end)).orderBy(
    asc(lessonOccurrence.startsAt),
  );
}

export type TransferInput = { studentId: string; fromClassId: string; toClassId: string; effectiveOn: string; reason: string };

/**
 * Transfere o aluno de turma: encerra o vínculo atual na véspera, abre o novo e ajusta só
 * as aulas a partir da data efetiva. Aulas passadas mantêm lista e frequência (critério 13).
 */
export async function transferStudent(db: DbOrTx, ctx: AppContext, input: TransferInput) {
  if (!can(ctx, "class.transfer", unitResource(ctx))) throw forbidden();
  const tenant = { organizationId: ctx.organizationId, unitId: ctx.unitId };
  const run = async (tx: DbOrTx) => {
    const classes = await tx
      .select({ id: classGroup.id })
      .from(classGroup)
      .where(and(inArray(classGroup.id, [input.fromClassId, input.toClassId]), eq(classGroup.unitId, ctx.unitId), eq(classGroup.organizationId, ctx.organizationId)));
    if (classes.length !== 2) throw notFound();

    const [current] = await tx
      .select()
      .from(classMembership)
      .where(
        and(
          eq(classMembership.unitId, ctx.unitId),
          eq(classMembership.classGroupId, input.fromClassId),
          eq(classMembership.studentId, input.studentId),
          isNull(classMembership.endsOn),
        ),
      )
      .for("update");
    if (!current) throw notFound();
    if (input.effectiveOn <= current.startsOn) {
      throw new AppError("validation", "A data da transferência precisa ser posterior ao início do vínculo atual.");
    }

    await tx
      .update(classMembership)
      .set({ endsOn: shiftDay(input.effectiveOn, -1), endedReason: input.reason })
      .where(and(eq(classMembership.id, current.id), eq(classMembership.unitId, ctx.unitId)));
    const [created] = await tx
      .insert(classMembership)
      .values({ ...tenant, classGroupId: input.toClassId, studentId: input.studentId, startsOn: input.effectiveOn })
      .returning({ id: classMembership.id });
    if (!created) throw new Error("falha ao criar vínculo");

    const { start: from } = dayRange(input.effectiveOn, ctx.timezone);
    const futureOld = tx
      .select({ id: lessonOccurrence.id })
      .from(lessonOccurrence)
      .where(
        and(
          eq(lessonOccurrence.unitId, ctx.unitId),
          eq(lessonOccurrence.classGroupId, input.fromClassId),
          gte(lessonOccurrence.startsAt, from),
        ),
      );

    // Retira das aulas futuras da turma antiga, sem apagar e sem tocar em quem já tem frequência.
    await tx
      .update(lessonParticipant)
      .set({ removedAt: new Date(), removedReason: "transferência de turma" })
      .where(
        and(
          eq(lessonParticipant.unitId, ctx.unitId),
          eq(lessonParticipant.studentId, input.studentId),
          isNull(lessonParticipant.removedAt),
          inArray(lessonParticipant.lessonId, futureOld),
          notExists(
            tx.select({ one: sql`1` }).from(attendanceRecord).where(eq(attendanceRecord.participantId, lessonParticipant.id)),
          ),
        ),
      );

    const futureNew = await tx
      .select({ id: lessonOccurrence.id })
      .from(lessonOccurrence)
      .where(
        and(
          eq(lessonOccurrence.unitId, ctx.unitId),
          eq(lessonOccurrence.classGroupId, input.toClassId),
          gte(lessonOccurrence.startsAt, from),
        ),
      );
    if (futureNew.length > 0) {
      await tx
        .insert(lessonParticipant)
        .values(futureNew.map((l) => ({ ...tenant, lessonId: l.id, studentId: input.studentId, classMembershipId: created.id })))
        .onConflictDoUpdate({
          target: [lessonParticipant.lessonId, lessonParticipant.studentId],
          set: { removedAt: null, removedReason: null, classMembershipId: created.id },
        });
    }
    return { membershipId: created.id };
  };
  return db.transaction(run);
}
