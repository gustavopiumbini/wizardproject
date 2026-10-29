"use client";
import { startTransition, useActionState, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { idleState } from "@/lib/action-result";
import { saveAttendanceAction } from "@/modules/attendance/actions";
import { ATTENDANCE_LABEL, ATTENDANCE_STATUSES } from "@/modules/attendance/labels";
import type { AttendanceStatus } from "@/modules/attendance/schema";

type Participant = { participantId: string; studentName: string; kind: "regular" | "makeup"; status: AttendanceStatus };

export function AttendanceForm({ lessonId, version, participants }: { lessonId: string; version: number; participants: Participant[] }) {
  const [state, action, pending] = useActionState(saveAttendanceAction, idleState);
  // Estado controlado: o formulário não perde as marcações entre envios.
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>(() =>
    Object.fromEntries(participants.map((p) => [p.participantId, p.status])),
  );
  const [dirty, setDirty] = useState(false);
  const currentVersion = state.version ?? version;
  const unrecorded = Object.values(marks).filter((s) => s === "not_recorded").length;

  return (
    <form
      // onSubmit em vez de `action`: o React 19 reseta formulários com `action` e as marcações sumiriam.
      onSubmit={(event) => {
        event.preventDefault();
        const submitter = (event.nativeEvent as SubmitEvent).submitter;
        const formData = new FormData(event.currentTarget, submitter);
        setDirty(false);
        startTransition(() => action(formData));
      }}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="lessonId" value={lessonId} />
      <input type="hidden" name="expectedVersion" value={currentVersion} />
      {participants.map((p) => (
        <fieldset key={p.participantId} className="rounded-lg border p-3">
          <legend className="px-1 font-medium">
            {p.studentName} {p.kind === "makeup" && <Badge variant="outline">Reposição</Badge>}
          </legend>
          <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {ATTENDANCE_STATUSES.map((status) => (
              <label
                key={status}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-2 text-sm has-checked:border-primary has-checked:bg-primary/10 has-checked:font-semibold has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
              >
                <input
                  type="radio"
                  name={`mark:${p.participantId}`}
                  value={status}
                  checked={marks[p.participantId] === status}
                  onChange={() => {
                    setMarks((m) => ({ ...m, [p.participantId]: status }));
                    setDirty(true);
                  }}
                  className="size-4 accent-primary"
                />
                {ATTENDANCE_LABEL[status]}
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      <p role="status" aria-live="polite" className="text-sm">
        {pending
          ? "Salvando…"
          : dirty
            ? "Alterações não salvas."
            : state.status === "ok" && state.savedAt
              ? `${state.message} (${new Date(state.savedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })})`
              : null}
      </p>

      {state.status === "error" && (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      {state.status === "pending_confirmation" && (
        <Alert>
          <AlertDescription className="flex flex-col gap-3">
            <span>
              {state.pending} aluno(s) continuam como &ldquo;Não registrado&rdquo;. Eles ficarão assim na chamada finalizada.
            </span>
            <label className="flex min-h-11 items-center gap-2">
              <input type="checkbox" name="confirmPending" value="1" required className="size-4" />
              Confirmo finalizar com alunos não registrados
            </label>
          </AlertDescription>
        </Alert>
      )}

      {unrecorded > 0 && <p className="text-sm text-muted-foreground">{unrecorded} aluno(s) não registrado(s)</p>}
      <div className="sticky bottom-0 grid grid-cols-2 gap-2 border-t bg-background py-2 sm:flex">
        <Button type="submit" name="intent" value="draft" variant="outline" size="lg" className="h-11" disabled={pending}>
          Salvar rascunho
        </Button>
        <Button type="submit" name="intent" value="finalize" size="lg" className="h-11" disabled={pending}>
          {state.status === "pending_confirmation" ? "Finalizar mesmo assim" : "Finalizar chamada"}
        </Button>
      </div>
    </form>
  );
}
