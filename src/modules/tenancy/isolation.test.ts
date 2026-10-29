// Critérios 1 e 2 da spec §23: isolamento entre professores e entre escolas, com IDs conhecidos.
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { AppError } from "@/lib/errors";
import { lessonParticipant } from "@/modules/academic/schema";
import { listOwnLessonsForDay, transferStudent } from "@/modules/academic/service";
import { attendanceRecord } from "@/modules/attendance/schema";
import { correctAttendance, getLessonAttendance, listAttendanceOverview, saveAttendance } from "@/modules/attendance/service";
import { buildScenario, contextFor, type Scenario } from "@/test/fixtures";
import { listUserUnits, loadContext } from "./service";

let s: Scenario;
beforeAll(async () => {
  s = await buildScenario();
});

const code = async (p: Promise<unknown>) => {
  try {
    await p;
    return "ok";
  } catch (e) {
    if (e instanceof AppError) return e.code;
    throw e;
  }
};

describe("critério 1 — professor A não acessa aula do professor B", () => {
  it("nega leitura e registro da aula de outro professor da mesma unidade", async () => {
    const ctxA = await contextFor(s.users.teacherA.id, s.unitA1.id);
    expect(await code(getLessonAttendance(db, ctxA, s.lessons.lessonTeacherB.id))).toBe("not_found");
    expect(
      await code(saveAttendance(db, ctxA, { lessonId: s.lessons.lessonTeacherB.id, expectedVersion: 0, marks: [], finalize: false, confirmPending: false })),
    ).toBe("not_found");
  });

  it("a lista Hoje do professor só traz as próprias aulas", async () => {
    const ctxA = await contextFor(s.users.teacherA.id, s.unitA1.id);
    const ids = (await listOwnLessonsForDay(db, ctxA, s.today)).map((l) => l.id);
    expect(ids).toEqual([s.lessons.lessonToday.id]);
  });

  it("substituto acessa só a aula da substituição; o titular perde o acesso a ela", async () => {
    const ctxSub = await contextFor(s.users.substitute.id, s.unitA1.id);
    const ctxB = await contextFor(s.users.teacherB.id, s.unitA1.id);
    expect((await listOwnLessonsForDay(db, ctxSub, s.today)).map((l) => l.id)).toEqual([s.lessons.lessonSubstituted.id]);
    expect(await code(getLessonAttendance(db, ctxSub, s.lessons.lessonSubstituted.id))).toBe("ok");
    expect(await code(getLessonAttendance(db, ctxSub, s.lessons.lessonTeacherB.id))).toBe("not_found");
    expect(await code(getLessonAttendance(db, ctxB, s.lessons.lessonSubstituted.id))).toBe("not_found");
  });
});

describe("critério 2 — escola B não acessa dados da escola A conhecendo os IDs", () => {
  it("não monta contexto em unidade de outra organização", async () => {
    expect(await loadContext(db, s.users.coordinatorOrgB.id, s.unitA1.id)).toBeNull();
    const units = await listUserUnits(db, s.users.coordinatorOrgB.id);
    expect(units.map((u) => u.unitId)).toEqual([s.unitB1.id]);
  });

  it("leitura, registro e correção com ID de aula da escola A respondem não encontrado", async () => {
    const ctxB = await contextFor(s.users.coordinatorOrgB.id, s.unitB1.id);
    const ctxTeacherB = await contextFor(s.users.teacherOrgB.id, s.unitB1.id);
    const [participant] = await db.select().from(lessonParticipant).where(eq(lessonParticipant.lessonId, s.lessons.lessonToday.id));
    expect(await code(getLessonAttendance(db, ctxB, s.lessons.lessonToday.id))).toBe("not_found");
    expect(
      await code(
        saveAttendance(db, ctxTeacherB, {
          lessonId: s.lessons.lessonToday.id,
          expectedVersion: 0,
          marks: participant ? [{ participantId: participant.id, status: "absent" }] : [],
          finalize: false,
          confirmPending: false,
        }),
      ),
    ).toBe("not_found");
    expect(
      await code(correctAttendance(db, ctxB, { lessonId: s.lessons.lessonToday.id, participantId: participant?.id ?? "", status: "present", reason: "tentativa cruzada" })),
    ).toBe("not_found");
    const written = await db.select().from(attendanceRecord).where(eq(attendanceRecord.lessonId, s.lessons.lessonToday.id));
    expect(written).toHaveLength(0);
  });

  it("a visão de chamadas e a lista Hoje não mostram aulas da escola A", async () => {
    const ctxB = await contextFor(s.users.coordinatorOrgB.id, s.unitB1.id);
    const overview = await listAttendanceOverview(db, ctxB, s.today);
    expect(overview.map((r) => r.id)).toEqual([s.lessons.lessonOrgB.id]);
    const ctxTeacherB = await contextFor(s.users.teacherOrgB.id, s.unitB1.id);
    expect((await listOwnLessonsForDay(db, ctxTeacherB, s.today)).map((l) => l.id)).toEqual([s.lessons.lessonOrgB.id]);
  });

  it("transferência com IDs de turma da escola A é recusada", async () => {
    const ctxB = await contextFor(s.users.coordinatorOrgB.id, s.unitB1.id);
    const input = { studentId: s.students[0]!.id, fromClassId: s.classes.classA.id, toClassId: s.classes.classA2.id, effectiveOn: s.today, reason: "cruzada" };
    expect(await code(transferStudent(db, ctxB, input))).toBe("not_found");
  });

  it("gestor da organização A não vê a unidade da organização B", async () => {
    const units = await listUserUnits(db, s.users.manager.id);
    expect(units.map((u) => u.unitId).sort()).toEqual([s.unitA1.id, s.unitA2.id].sort());
  });

  it("o banco recusa ligar entidades de escolas diferentes (FK composta)", async () => {
    await expect(
      db.insert(lessonParticipant).values({
        organizationId: s.orgB.id,
        unitId: s.unitB1.id,
        lessonId: s.lessons.lessonToday.id,
        studentId: s.studentOrgB.id,
      }),
    ).rejects.toThrow();
    await expect(
      db.insert(lessonParticipant).values({
        organizationId: s.orgA.id,
        unitId: s.unitA1.id,
        lessonId: s.lessons.lessonToday.id,
        studentId: s.studentOrgB.id,
      }),
    ).rejects.toThrow();
  });
});
