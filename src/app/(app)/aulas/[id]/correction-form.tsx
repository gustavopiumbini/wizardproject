"use client";
import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { idleState } from "@/lib/action-result";
import { correctAttendanceAction } from "@/modules/attendance/actions";
import { ATTENDANCE_LABEL, ATTENDANCE_STATUSES } from "@/modules/attendance/labels";

const selectClass = "h-11 rounded-md border bg-background px-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 outline-none";

export function CorrectionForm({ lessonId, participants }: { lessonId: string; participants: { participantId: string; studentName: string }[] }) {
  const [state, action, pending] = useActionState(correctAttendanceAction, idleState);
  return (
    <form action={action} className="flex flex-col gap-3 rounded-lg border p-3">
      <input type="hidden" name="lessonId" value={lessonId} />
      <div className="flex flex-col gap-1">
        <Label htmlFor="participantId">Aluno</Label>
        <select id="participantId" name="participantId" required className={selectClass}>
          {participants.map((p) => (
            <option key={p.participantId} value={p.participantId}>
              {p.studentName}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="status">Novo registro</Label>
        <select id="status" name="status" required className={selectClass}>
          {ATTENDANCE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ATTENDANCE_LABEL[s]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="reason">Motivo da correção</Label>
        <textarea id="reason" name="reason" required minLength={5} maxLength={500} rows={2} className="rounded-md border bg-background p-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50" />
        <p className="text-xs text-muted-foreground">Fica no histórico com seu nome, a data e os valores anterior e novo.</p>
      </div>
      {state.status !== "idle" && (
        <Alert variant={state.status === "ok" ? "default" : "destructive"}>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" variant="outline" size="lg" className="h-11 self-start" disabled={pending}>
        Registrar correção
      </Button>
    </form>
  );
}
