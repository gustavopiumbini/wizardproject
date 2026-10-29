// Montagem do contexto autenticado. Organização e unidade vêm sempre dos vínculos no banco,
// nunca de IDs enviados pelo cliente.
import { and, eq, isNull, or } from "drizzle-orm";
import type { DbOrTx } from "@/db";
import { teacherProfile } from "@/modules/academic/schema";
import { membership, organization, schoolUnit, type Role } from "./schema";

export type AppContext = {
  userId: string;
  organizationId: string;
  organizationName: string;
  unitId: string;
  unitName: string;
  timezone: string;
  roles: Role[];
  /** Perfil docente ativo do usuário nesta unidade, se houver. */
  teacherProfileId: string | null;
};

export type UnitOption = { unitId: string; unitName: string; organizationName: string; roles: Role[] };

/** Unidades em que o usuário tem algum vínculo (papel na unidade ou gestor da organização). */
export async function listUserUnits(db: DbOrTx, userId: string): Promise<UnitOption[]> {
  const rows = await db
    .select({
      unitId: schoolUnit.id,
      unitName: schoolUnit.name,
      organizationName: organization.name,
      role: membership.role,
    })
    .from(membership)
    .innerJoin(organization, eq(organization.id, membership.organizationId))
    .innerJoin(
      schoolUnit,
      and(
        eq(schoolUnit.organizationId, membership.organizationId),
        or(eq(schoolUnit.id, membership.unitId), isNull(membership.unitId)),
      ),
    )
    .where(eq(membership.userId, userId))
    .orderBy(organization.name, schoolUnit.name);

  const byUnit = new Map<string, UnitOption>();
  for (const row of rows) {
    const current = byUnit.get(row.unitId) ?? { ...row, roles: [] };
    if (!current.roles.includes(row.role)) current.roles.push(row.role);
    byUnit.set(row.unitId, current);
  }
  return [...byUnit.values()].map(({ unitId, unitName, organizationName, roles }) => ({
    unitId,
    unitName,
    organizationName,
    roles,
  }));
}

/** Contexto do usuário numa unidade, ou null se não houver vínculo válido. */
export async function loadContext(db: DbOrTx, userId: string, unitId: string): Promise<AppContext | null> {
  const [unit] = await db
    .select({
      id: schoolUnit.id,
      name: schoolUnit.name,
      timezone: schoolUnit.timezone,
      organizationId: organization.id,
      organizationName: organization.name,
    })
    .from(schoolUnit)
    .innerJoin(organization, eq(organization.id, schoolUnit.organizationId))
    .where(eq(schoolUnit.id, unitId));
  if (!unit) return null;

  const memberships = await db
    .select({ role: membership.role })
    .from(membership)
    .where(
      and(
        eq(membership.userId, userId),
        eq(membership.organizationId, unit.organizationId),
        or(eq(membership.unitId, unit.id), isNull(membership.unitId)),
      ),
    );
  const roles = [...new Set(memberships.map((m) => m.role))];
  if (roles.length === 0) return null;

  let teacherProfileId: string | null = null;
  if (roles.includes("teacher")) {
    const [profile] = await db
      .select({ id: teacherProfile.id })
      .from(teacherProfile)
      .where(
        and(
          eq(teacherProfile.userId, userId),
          eq(teacherProfile.organizationId, unit.organizationId),
          eq(teacherProfile.unitId, unit.id),
          eq(teacherProfile.status, "active"),
        ),
      );
    teacherProfileId = profile?.id ?? null;
  }

  return {
    userId,
    organizationId: unit.organizationId,
    organizationName: unit.organizationName,
    unitId: unit.id,
    unitName: unit.name,
    timezone: unit.timezone,
    roles,
    teacherProfileId,
  };
}

export async function unitBelongsToUser(db: DbOrTx, userId: string, unitId: string) {
  const units = await listUserUnits(db, userId);
  return units.some((u) => u.unitId === unitId);
}

