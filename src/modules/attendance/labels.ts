// Rótulos em pt-BR, seguros para componentes de cliente.
import type { AttendanceStatus } from "./schema";

export const ATTENDANCE_STATUSES = ["not_recorded", "present", "absent", "late", "excused"] as const satisfies readonly AttendanceStatus[];

export const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  not_recorded: "Não registrado",
  present: "Presente",
  absent: "Ausente",
  late: "Atrasado",
  excused: "Ausência justificada",
};

export const SHEET_LABEL = {
  none: "Chamada não iniciada",
  draft: "Rascunho",
  finalized: "Finalizada",
} as const;
