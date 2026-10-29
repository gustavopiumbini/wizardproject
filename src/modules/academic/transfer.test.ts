// Critério 13 da spec §23: transferência preserva lista e frequência das aulas passadas.
import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { AppError } from "@/lib/errors";
import { getLessonAttendance, saveAttendance } from "@/modules/attendance/service";
import { buildScenario, contextFor, type Scenario } from "@/test/fixtures";
import { classMembership } from "./schema";
import { transferStudent } from "./service";

let s: Scenario;
beforeAll(async () => {
  s = await buildScenario();
});

describe("critério 13 — transferência de turma", () => {
  it("preserva aulas passadas e move só as futuras", async () => {
    const teacher = await contextFor(s.users.teacherA.id, s.unitA1.id);
    const moved = s.students[0]!;
    const past = await getLessonAttendance(db, teacher, s.lessons.lessonPast.id);
    const movedPart = past.participants.find((p) => p.studentId === moved.id)!;
    await saveAttendance(db, teacher, {
      lessonId: s.lessons.lessonPast.id,
      expectedVersion: 0,
      marks: [{ participantId: movedPart.participantId, status: "absent" }],
      finalize: true,
      confirmPending: true,
    });

    await expect(
      transferStudent(db, teacher, { studentId: moved.id, fromClassId: s.classes.classA.id, toClassId: s.classes.classA2.id, effectiveOn: s.today, reason: "x" }),
    ).rejects.toBeInstanceOf(AppError);

    const coord = await contextFor(s.users.coordinator.id, s.unitA1.id);
    await transferStudent(db, coord, {
      studentId: moved.id,
      fromClassId: s.classes.classA.id,
      toClassId: s.classes.classA2.id,
      effectiveOn: s.today,
      reason: "Mudança de horário",
    });

    const pastAfter = await getLessonAttendance(db, coord, s.lessons.lessonPast.id);
    expect(pastAfter.participants.map((p) => p.studentId)).toContain(moved.id);
    expect(pastAfter.participants.find((p) => p.studentId === moved.id)?.status).toBe("absent");

    const futureOld = await getLessonAttendance(db, coord, s.lessons.lessonFuture.id);
    expect(futureOld.participants.map((p) => p.studentId)).not.toContain(moved.id);
    const futureNew = await getLessonAttendance(db, coord, s.lessons.lessonA2Future.id);
    expect(futureNew.participants.map((p) => p.studentId)).toContain(moved.id);

    const memberships = await db
      .select()
      .from(classMembership)
      .where(and(eq(classMembership.studentId, moved.id), eq(classMembership.unitId, s.unitA1.id)));
    expect(memberships).toHaveLength(2);
    const old = memberships.find((m) => m.classGroupId === s.classes.classA.id);
    expect(old?.endsOn).not.toBeNull();
    expect(old?.endedReason).toBe("Mudança de horário");
  });
});
