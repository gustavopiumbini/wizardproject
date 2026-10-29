import { Badge } from "@/components/ui/badge";
import { SHEET_LABEL } from "@/modules/attendance/labels";

// Estado sempre em texto, nunca só por cor.
export function SheetBadge({ status }: { status: keyof typeof SHEET_LABEL }) {
  const variant = status === "finalized" ? "default" : status === "draft" ? "secondary" : "outline";
  return <Badge variant={variant}>{SHEET_LABEL[status]}</Badge>;
}

export function CancelledBadge() {
  return <Badge variant="destructive">Cancelada</Badge>;
}
