import type { Metadata } from "next";
import Link from "next/link";
import { CancelledBadge, SheetBadge } from "@/components/lesson-status";
import { Badge } from "@/components/ui/badge";
import { formatDayLong, formatTime, todayInTz } from "@/lib/time";
import { teacherDayPage } from "@/modules/attendance/queries";
import { requireContext } from "@/lib/context";

export const metadata: Metadata = { title: "Hoje" };

export default async function TodayPage() {
  const ctx = await requireContext();
  const today = todayInTz(ctx.timezone);
  const { lessons } = await teacherDayPage(today);
  const now = new Date();
  const next = lessons.find((l) => l.status === "scheduled" && l.endsAt > now);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Hoje</h1>
        <p className="text-sm first-letter:uppercase text-muted-foreground">{formatDayLong(today, ctx.timezone)}</p>
      </div>
      {!ctx.teacherProfileId ? (
        <p className="text-muted-foreground">Você não tem perfil de professor nesta unidade.</p>
      ) : lessons.length === 0 ? (
        <p className="text-muted-foreground">Nenhuma aula sua hoje nesta unidade.</p>
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Aulas de hoje">
          {lessons.map((lesson) => (
            <li key={lesson.id}>
              <Link
                href={`/aulas/${lesson.id}`}
                className="flex flex-col gap-2 rounded-lg border p-4 outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-lg font-semibold tabular-nums">
                    {formatTime(lesson.startsAt, ctx.timezone)}–{formatTime(lesson.endsAt, ctx.timezone)}
                  </span>
                  {lesson.id === next?.id && <Badge variant="outline">Próxima aula</Badge>}
                </div>
                <span className="font-medium">
                  {lesson.classCode} · {lesson.classLevel}
                </span>
                <span className="text-sm text-muted-foreground">
                  {lesson.roomName ?? "Sala não definida"}
                  {lesson.teacherRole === "substitute" ? " · Você é substituto nesta aula" : ""}
                </span>
                <span className="flex gap-2">
                  {lesson.status === "cancelled" ? <CancelledBadge /> : <SheetBadge status={lesson.sheetStatus} />}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
