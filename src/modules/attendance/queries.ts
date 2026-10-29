// Leituras para as páginas: sempre a partir do contexto autenticado.
import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { requireContext } from "@/lib/context";
import { listOwnLessonsForDay } from "@/modules/academic/service";
import { attendanceSheet } from "./schema";
import { getLessonAttendance, listAttendanceOverview } from "./service";

export async function lessonAttendancePage(lessonId: string) {
  const ctx = await requireContext();
  return { ctx, data: await getLessonAttendance(db, ctx, lessonId) };
}

export async function overviewPage(day: string) {
  const ctx = await requireContext();
  return { ctx, rows: await listAttendanceOverview(db, ctx, day) };
}

/** Aulas do professor no dia, com o estado da chamada de cada uma. */
export async function teacherDayPage(day: string) {
  const ctx = await requireContext();
  if (!ctx.teacherProfileId) return { ctx, lessons: [] };
  const lessons = await listOwnLessonsForDay(db, ctx, day);
  const ids = lessons.map((l) => l.id);
  const sheets =
    ids.length === 0
      ? []
      : await db
          .select({ lessonId: attendanceSheet.lessonId, status: attendanceSheet.status })
          .from(attendanceSheet)
          .where(and(eq(attendanceSheet.organizationId, ctx.organizationId), eq(attendanceSheet.unitId, ctx.unitId), inArray(attendanceSheet.lessonId, ids)));
  const byLesson = new Map(sheets.map((s) => [s.lessonId, s.status]));
  return { ctx, lessons: lessons.map((l) => ({ ...l, sheetStatus: byLesson.get(l.id) ?? ("none" as const) })) };
}
