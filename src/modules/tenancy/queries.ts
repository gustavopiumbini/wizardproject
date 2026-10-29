import "server-only";
import { db } from "@/db";
import { requireContext, requireSession } from "@/lib/context";
import { listUserUnits } from "./service";

export async function unitChoicesPage() {
  const s = await requireSession();
  return { session: s, units: await listUserUnits(db, s.userId) };
}

export async function appShellData() {
  const ctx = await requireContext();
  const s = await requireSession();
  const units = await listUserUnits(db, s.userId);
  return { ctx, userName: s.userName, canSwitchUnit: units.length > 1 };
}
