// Critérios 3, 4 e 18 da spec §23, mais rascunho, finalização e concorrência.
import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { AppError } from "@/lib/errors";
import { buildScenario, contextFor, type Scenario } from "@/test/fixtures";
import { attendanceRevision, attendanceSheet } from "./schema";
import { correctAttendance, getLessonAttendance, listAttendanceOverview, saveAttendance } from "./service";

let s: Scenario;
beforeAll(async () => {
  s = await buildScenario();
});

async function errorOf(p: Promise<unknown>) {
  try {
    await p;
  } catch (e) {
    if (e instanceof AppError) return e;
    throw e;
  }
  throw new Error("era esperado um erro");
}

describe("chamada", () => {
  it("critério 4 — sem marcação o aluno fica não registrado, inclusive após finalizar", async () => {
    const ctx = await contextFor(s.users.teacherA.id, s.unitA1.id);
    const before = await getLessonAttendance(db, ctx, s.lessons.lessonPast.id);
    expect(before.participants).toHaveLength(3);
    expect(before.participants.every((p) => p.status === "not_recorded")).toBe(true);

    const [first] = before.participants;
    await saveAttendance(db, ctx, {
      lessonId: s.lessons.lessonPast.id,
      expectedVersion: 0,
      marks: [{ participantId: first!.participantId, status: "present" }],
      finalize: false,
      confirmPending: false,
    });
    const pending = await errorOf(
      saveAttendance(db, ctx, { lessonId: s.lessons.lessonPast.id, expectedVersion: 1, marks: [], finalize: true, confirmPending: false }),
    );
    expect(pending.code).toBe("pending_confirmation");
    expect(pending.details).toEqual({ pending: 2 });

    await saveAttendance(db, ctx, { lessonId: s.lessons.lessonPast.id, expectedVersion: 1, marks: [], finalize: true, confirmPending: true });
    const after = await getLessonAttendance(db, ctx, s.lessons.lessonPast.id);
    expect(after.sheet.status).toBe("finalized");
    expect(after.participants.filter((p) => p.status === "not_recorded")).toHaveLength(2);
  });

  it("critério 3 — o professor registra e a recepção e a coordenação veem o mesmo resultado", async () => {
    const teacher = await contextFor(s.users.teacherA.id, s.unitA1.id);
    const sheet = await getLessonAttendance(db, teacher, s.lessons.lessonToday.id);
    const statuses = ["present", "absent", "late"] as const;
    const marks = sheet.participants.map((p, i) => ({ participantId: p.participantId, status: statuses[i]! }));

    const draft = await saveAttendance(db, teacher, { lessonId: s.lessons.lessonToday.id, expectedVersion: 0, marks, finalize: false, confirmPending: false });
    expect(draft).toEqual({ version: 1, status: "draft" });
    await saveAttendance(db, teacher, { lessonId: s.lessons.lessonToday.id, expectedVersion: 1, marks: [], finalize: true, confirmPending: false });

    const expected = Object.fromEntries(marks.map((m) => [m.participantId, m.status]));
    for (const userId of [s.users.receptionist.id, s.users.coordinator.id]) {
      const ctx = await contextFor(userId, s.unitA1.id);
      const view = await getLessonAttendance(db, ctx, s.lessons.lessonToday.id);
      expect(view.sheet.status).toBe("finalized");
      expect(Object.fromEntries(view.participants.map((p) => [p.participantId, p.status]))).toEqual(expected);
      const row = (await listAttendanceOverview(db, ctx, s.today)).find((r) => r.id === s.lessons.lessonToday.id);
      expect(row?.sheetStatus).toBe("finalized");
      expect(row?.counts).toMatchObject({ present: 1, absent: 1, late: 1, not_recorded: 0 });
    }
  });

  it("recepção não registra chamada; versão desatualizada gera conflito explícito", async () => {
    const reception = await contextFor(s.users.receptionist.id, s.unitA1.id);
    const forbidden = await errorOf(
      saveAttendance(db, reception, { lessonId: s.lessons.lessonFuture.id, expectedVersion: 0, marks: [], finalize: false, confirmPending: false }),
    );
    expect(forbidden.code).toBe("forbidden");

    const teacher = await contextFor(s.users.teacherA.id, s.unitA1.id);
    await saveAttendance(db, teacher, { lessonId: s.lessons.lessonFuture.id, expectedVersion: 0, marks: [], finalize: false, confirmPending: false });
    const stale = await errorOf(
      saveAttendance(db, teacher, { lessonId: s.lessons.lessonFuture.id, expectedVersion: 0, marks: [], finalize: false, confirmPending: false }),
    );
    expect(stale.code).toBe("conflict");
  });

  it("critério 18 — correção registra motivo, autor e valores anteriores", async () => {
    const teacher = await contextFor(s.users.teacherA.id, s.unitA1.id);
    const lessonId = s.lessons.lessonToday.id;
    const { participants } = await getLessonAttendance(db, teacher, lessonId);
    const target = participants.find((p) => p.status === "absent")!;

    const afterFinal = await errorOf(
      saveAttendance(db, teacher, { lessonId, expectedVersion: 2, marks: [{ participantId: target.participantId, status: "present" }], finalize: false, confirmPending: false }),
    );
    expect(afterFinal.code).toBe("invalid_state");
    const noReason = await errorOf(correctAttendance(db, teacher, { lessonId, participantId: target.participantId, status: "present", reason: "  " }));
    expect(noReason.code).toBe("validation");

    await correctAttendance(db, teacher, { lessonId, participantId: target.participantId, status: "excused", reason: "Atestado entregue na recepção" });
    const [revision] = await db.select().from(attendanceRevision).where(eq(attendanceRevision.lessonId, lessonId));
    expect(revision).toMatchObject({
      participantId: target.participantId,
      previousStatus: "absent",
      newStatus: "excused",
      reason: "Atestado entregue na recepção",
      authorId: s.users.teacherA.id,
    });
    expect(revision?.createdAt).toBeInstanceOf(Date);

    // Fora da janela de 24 h o professor não corrige mais; a coordenação sim.
    await db
      .update(attendanceSheet)
      .set({ finalizedAt: new Date(Date.now() - 25 * 60 * 60 * 1000) })
      .where(and(eq(attendanceSheet.lessonId, lessonId), eq(attendanceSheet.unitId, s.unitA1.id)));
    const late = await errorOf(correctAttendance(db, teacher, { lessonId, participantId: target.participantId, status: "absent", reason: "Mudança tardia" }));
    expect(late.code).toBe("forbidden");
    const coord = await contextFor(s.users.coordinator.id, s.unitA1.id);
    await correctAttendance(db, coord, { lessonId, participantId: target.participantId, status: "absent", reason: "Revisão da coordenação" });
    const view = await getLessonAttendance(db, coord, lessonId);
    expect(view.participants.find((p) => p.participantId === target.participantId)?.status).toBe("absent");
    expect(view.revisions.map((r) => [r.previousStatus, r.newStatus, r.authorName])).toEqual([
      ["excused", "absent", "Coord A"],
      ["absent", "excused", "Prof A"],
    ]);
  });
});
