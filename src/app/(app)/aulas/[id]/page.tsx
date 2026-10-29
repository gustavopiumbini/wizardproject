import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { CancelledBadge, SheetBadge } from "@/components/lesson-status";
import { Badge } from "@/components/ui/badge";
import { AppError } from "@/lib/errors";
import { formatDateTime, formatDayLong, formatTime, dayInTz } from "@/lib/time";
import { ATTENDANCE_LABEL } from "@/modules/attendance/labels";
import { lessonAttendancePage } from "@/modules/attendance/queries";
import { AttendanceForm } from "./attendance-form";
import { CorrectionForm } from "./correction-form";

export const metadata: Metadata = { title: "Aula" };

async function load(id: string) {
  if (!z.uuid().safeParse(id).success) notFound();
  try {
    return await lessonAttendancePage(id);
  } catch (error) {
    if (error instanceof AppError && (error.code === "not_found" || error.code === "forbidden")) notFound();
    throw error;
  }
}

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx, data } = await load(id);
  const { lesson, participants, sheet, revisions, permissions } = data;
  const tz = ctx.timezone;
  const editable = permissions.record && sheet.status === "draft";
  const nameOf = new Map(participants.map((p) => [p.participantId, p.studentName]));

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="ficha" className="flex flex-col gap-1">
        <h1 id="ficha" className="text-2xl font-semibold">
          {lesson.classCode} · {lesson.classLevel}
        </h1>
        <p className="first-letter:uppercase text-muted-foreground">
          {formatDayLong(dayInTz(lesson.startsAt, tz), tz)}, {formatTime(lesson.startsAt, tz)}–{formatTime(lesson.endsAt, tz)}
        </p>
        <p className="text-sm">
          Sala: {lesson.roomName ?? "não definida"} · Professor: {lesson.teacherName ?? "sem professor"}
          {lesson.teacherRole === "substitute" ? " (substituição)" : ""}
        </p>
        <div className="mt-1 flex gap-2">
          {lesson.status === "cancelled" ? <CancelledBadge /> : <SheetBadge status={sheet.version === 0 ? "none" : sheet.status} />}
        </div>
      </section>

      <section aria-labelledby="chamada" className="flex flex-col gap-3">
        <h2 id="chamada" className="text-lg font-semibold">
          Chamada <span className="text-sm font-normal text-muted-foreground">({participants.length} alunos)</span>
        </h2>
        {sheet.status === "finalized" && sheet.finalizedAt && (
          <p className="text-sm text-muted-foreground">
            Finalizada por {sheet.finalizedByName} em {formatDateTime(sheet.finalizedAt, tz)}.
          </p>
        )}
        {participants.length === 0 ? (
          <p className="text-muted-foreground">Nenhum aluno na lista desta aula.</p>
        ) : editable ? (
          <AttendanceForm
            lessonId={lesson.id}
            version={sheet.version}
            participants={participants.map((p) => ({ participantId: p.participantId, studentName: p.studentName, kind: p.kind, status: p.status }))}
          />
        ) : (
          <ul className="divide-y rounded-lg border" aria-label="Resultado da chamada">
            {participants.map((p) => (
              <li key={p.participantId} className="flex items-center justify-between gap-2 px-3 py-2">
                <span>
                  {p.studentName} {p.kind === "makeup" && <Badge variant="outline">Reposição</Badge>}
                </span>
                <span className="text-sm font-medium" data-status={p.status}>
                  {ATTENDANCE_LABEL[p.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
        {lesson.status === "scheduled" && !permissions.record && sheet.status === "draft" && (
          <p className="text-sm text-muted-foreground">Somente o professor da aula registra a chamada.</p>
        )}
      </section>

      {permissions.correct && (
        <section aria-labelledby="correcao" className="flex flex-col gap-3">
          <h2 id="correcao" className="text-lg font-semibold">Corrigir chamada</h2>
          <CorrectionForm lessonId={lesson.id} participants={participants.map((p) => ({ participantId: p.participantId, studentName: p.studentName }))} />
        </section>
      )}

      {revisions.length > 0 && (
        <section aria-labelledby="historico" className="flex flex-col gap-2">
          <h2 id="historico" className="text-lg font-semibold">Histórico de correções</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {revisions.map((r) => (
              <li key={r.id} className="rounded-md border p-2">
                <p>
                  <strong>{nameOf.get(r.participantId) ?? "Aluno"}</strong>: {ATTENDANCE_LABEL[r.previousStatus]} → {ATTENDANCE_LABEL[r.newStatus]}
                </p>
                <p className="text-muted-foreground">
                  {r.authorName}, {formatDateTime(r.createdAt, tz)} — motivo: {r.reason}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {lesson.plannedContent && (
        <section aria-labelledby="planejamento" className="flex flex-col gap-1">
          <h2 id="planejamento" className="text-lg font-semibold">Conteúdo previsto</h2>
          <p className="text-sm">{lesson.plannedContent}</p>
        </section>
      )}
    </div>
  );
}
