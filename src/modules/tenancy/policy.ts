// Autorização no servidor com negação por padrão (regra 2). A matriz está documentada em
// docs/permissoes.md; mantenha os dois em sincronia.
import type { Role } from "./schema";
import type { AppContext } from "./service";

export type Action =
  | "lesson.view"
  | "lesson.listOwn"
  | "attendance.record"
  | "attendance.correct"
  | "attendance.overview"
  | "class.transfer";

/**
 * Escopo concedido a um papel:
 * - `unit`: qualquer recurso da unidade do contexto;
 * - `assigned`: só aulas em que o perfil docente do usuário tem vínculo ativo;
 * - `assignedWithinWindow`: como `assigned`, e só dentro da janela de correção.
 */
type Scope = "unit" | "assigned" | "assignedWithinWindow";

export const PERMISSIONS: Record<Action, Partial<Record<Role, Scope>>> = {
  "lesson.view": { org_manager: "unit", coordinator: "unit", receptionist: "unit", teacher: "assigned" },
  "lesson.listOwn": { teacher: "unit" },
  "attendance.record": { teacher: "assigned" },
  "attendance.correct": { coordinator: "unit", teacher: "assignedWithinWindow" },
  "attendance.overview": { org_manager: "unit", coordinator: "unit", receptionist: "unit" },
  "class.transfer": { org_manager: "unit", coordinator: "unit" },
};

/** Janela em que o professor pode corrigir a própria chamada após finalizar. */
export const TEACHER_CORRECTION_WINDOW_MS = 24 * 60 * 60 * 1000;

export type UnitResource = { kind: "unit"; organizationId: string; unitId: string };
export type LessonResource = {
  kind: "lesson";
  organizationId: string;
  unitId: string;
  /** Perfis docentes com vínculo ativo na ocorrência. */
  activeTeacherProfileIds: string[];
  /** Momento da finalização da chamada, se finalizada. */
  finalizedAt?: Date | null;
};
export type Resource = UnitResource | LessonResource;

function scopeAllows(scope: Scope, ctx: AppContext, resource: Resource, now: Date): boolean {
  if (scope === "unit") return true;
  if (resource.kind !== "lesson") return false;
  const assigned = ctx.teacherProfileId !== null && resource.activeTeacherProfileIds.includes(ctx.teacherProfileId);
  if (!assigned) return false;
  if (scope === "assigned") return true;
  if (!resource.finalizedAt) return true;
  return now.getTime() - resource.finalizedAt.getTime() <= TEACHER_CORRECTION_WINDOW_MS;
}

export function can(ctx: AppContext, action: Action, resource: Resource, now = new Date()): boolean {
  // O recurso precisa ser da mesma organização e unidade do contexto.
  if (resource.organizationId !== ctx.organizationId || resource.unitId !== ctx.unitId) return false;
  const grants = PERMISSIONS[action];
  return ctx.roles.some((role) => {
    const scope = grants[role];
    return scope !== undefined && scopeAllows(scope, ctx, resource, now);
  });
}

export const unitResource = (ctx: AppContext): UnitResource => ({
  kind: "unit",
  organizationId: ctx.organizationId,
  unitId: ctx.unitId,
});
