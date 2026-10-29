import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { CancelledBadge, SheetBadge } from "@/components/lesson-status";
import { buttonVariants } from "@/components/ui/button";
import { AppError } from "@/lib/errors";
import { requireContext } from "@/lib/context";
import { formatDayLong, formatTime, shiftDay, todayInTz } from "@/lib/time";
import { ATTENDANCE_LABEL } from "@/modules/attendance/labels";
import { overviewPage } from "@/modules/attendance/queries";

export const metadata: Metadata = { title: "Chamadas" };

const daySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export default async function AttendanceOverviewPage({ searchParams }: { searchParams: Promise<{ dia?: string }> }) {
  const ctx = await requireContext();
  const { dia } = await searchParams;
  const day = daySchema.safeParse(dia).success && dia ? dia : todayInTz(ctx.timezone);
  let rows;
  try {
    ({ rows } = await overviewPage(day));
  } catch (error) {
    if (error instanceof AppError && error.code === "forbidden") notFound();
    throw error;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Chamadas da unidade</h1>
          <p className="text-sm first-letter:uppercase text-muted-foreground">{formatDayLong(day, ctx.timezone)}</p>
        </div>
        <nav aria-label="Dia" className="flex gap-1">
          <Link className={buttonVariants({ variant: "outline", size: "lg" })} href={`?dia=${shiftDay(day, -1)}`}>Dia anterior</Link>
          <Link className={buttonVariants({ variant: "outline", size: "lg" })} href="/coordenacao/chamadas">Hoje</Link>
          <Link className={buttonVariants({ variant: "outline", size: "lg" })} href={`?dia=${shiftDay(day, 1)}`}>Próximo dia</Link>
        </nav>
      </div>
      {rows.length === 0 ? (
        <p className="text-muted-foreground">Nenhuma aula neste dia.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <caption className="sr-only">Situação das chamadas por aula</caption>
            <thead className="bg-muted/50 text-left">
              <tr>
                <th scope="col" className="px-3 py-2">Horário</th>
                <th scope="col" className="px-3 py-2">Turma</th>
                <th scope="col" className="px-3 py-2">Professor</th>
                <th scope="col" className="px-3 py-2">Chamada</th>
                <th scope="col" className="px-3 py-2">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2 tabular-nums">{formatTime(r.startsAt, ctx.timezone)}</td>
                  <td className="px-3 py-2">
                    <Link href={`/aulas/${r.id}`} className="font-medium underline underline-offset-4">
                      {r.classCode}
                    </Link>
                    <span className="block text-xs text-muted-foreground">{r.roomName}</span>
                  </td>
                  <td className="px-3 py-2">
                    {r.teacherName}
                    {r.teacherRole === "substitute" && <span className="block text-xs text-muted-foreground">substituição</span>}
                  </td>
                  <td className="px-3 py-2">{r.status === "cancelled" ? <CancelledBadge /> : <SheetBadge status={r.sheetStatus} />}</td>
                  <td className="px-3 py-2 text-xs">
                    {(["present", "absent", "late", "excused", "not_recorded"] as const)
                      .filter((s) => r.counts[s] > 0)
                      .map((s) => `${ATTENDANCE_LABEL[s]}: ${r.counts[s]}`)
                      .join(" · ") || "Sem alunos"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
