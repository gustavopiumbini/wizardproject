import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "@/modules/identity/schema";

export const roleEnum = pgEnum("role", ["org_manager", "coordinator", "receptionist", "teacher"]);
export type Role = (typeof roleEnum.enumValues)[number];

export const organization = pgTable("organization", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  slug: text().notNull().unique(),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});

export const schoolUnit = pgTable(
  "school_unit",
  {
    id: uuid().primaryKey().defaultRandom(),
    organizationId: uuid()
      .notNull()
      .references(() => organization.id),
    name: text().notNull(),
    timezone: text().notNull().default("America/Sao_Paulo"),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    // Alvo das FKs compostas (unidade, organização) das tabelas operacionais.
    unique("school_unit_id_org_uq").on(t.id, t.organizationId),
    index("school_unit_org_idx").on(t.organizationId),
  ],
);

// Vínculo explícito usuário ↔ organização/unidade com papel. Acúmulo de funções = várias linhas.
// Gestor da organização tem unit_id nulo (vale para todas as unidades da organização);
// os demais papéis sempre apontam uma unidade.
export const membership = pgTable(
  "membership",
  {
    id: uuid().primaryKey().defaultRandom(),
    organizationId: uuid()
      .notNull()
      .references(() => organization.id),
    unitId: uuid(),
    userId: text()
      .notNull()
      .references(() => user.id),
    role: roleEnum().notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    foreignKey({
      name: "membership_unit_org_fk",
      columns: [t.unitId, t.organizationId],
      foreignColumns: [schoolUnit.id, schoolUnit.organizationId],
    }),
    unique("membership_uq").on(t.organizationId, t.unitId, t.userId, t.role).nullsNotDistinct(),
    check(
      "membership_unit_scope_ck",
      sql`(${t.role} = 'org_manager' and ${t.unitId} is null) or (${t.role} <> 'org_manager' and ${t.unitId} is not null)`,
    ),
    index("membership_user_idx").on(t.userId),
  ],
);
