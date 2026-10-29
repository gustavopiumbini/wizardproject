import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sameTenantFk, tenantColumns, unitFk } from "@/db/tenant";
import { lessonOccurrence, lessonParticipant } from "@/modules/academic/schema";
import { user } from "@/modules/identity/schema";

// "not_recorded" é o padrão: ausência de linha também significa não registrado (regra 4).
export const attendanceStatusEnum = pgEnum("attendance_status", [
  "not_recorded",
  "present",
  "absent",
  "late",
  "excused",
]);
export type AttendanceStatus = (typeof attendanceStatusEnum.enumValues)[number];

export const sheetStatusEnum = pgEnum("attendance_sheet_status", ["draft", "finalized"]);

// Estado da chamada de uma ocorrência. `version` sustenta a concorrência otimista.
export const attendanceSheet = pgTable(
  "attendance_sheet",
  {
    id: uuid().primaryKey().defaultRandom(),
    ...tenantColumns(),
    lessonId: uuid().notNull(),
    status: sheetStatusEnum().notNull().default("draft"),
    version: integer().notNull().default(1),
    updatedBy: text()
      .notNull()
      .references(() => user.id),
    updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    finalizedBy: text().references(() => user.id),
    finalizedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    unitFk("attendance_sheet_unit_fk", t),
    sameTenantFk("attendance_sheet_lesson_fk", t.lessonId, t, lessonOccurrence),
    unique("attendance_sheet_lesson_uq").on(t.lessonId),
    check(
      "attendance_sheet_finalized_ck",
      sql`(${t.status} = 'finalized') = (${t.finalizedAt} is not null and ${t.finalizedBy} is not null)`,
    ),
  ],
);

export const attendanceRecord = pgTable(
  "attendance_record",
  {
    id: uuid().primaryKey().defaultRandom(),
    ...tenantColumns(),
    lessonId: uuid().notNull(),
    participantId: uuid().notNull(),
    status: attendanceStatusEnum().notNull().default("not_recorded"),
    updatedBy: text()
      .notNull()
      .references(() => user.id),
    updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    unitFk("attendance_record_unit_fk", t),
    sameTenantFk("attendance_record_lesson_fk", t.lessonId, t, lessonOccurrence),
    sameTenantFk("attendance_record_participant_fk", t.participantId, t, lessonParticipant),
    // O participante precisa ser desta mesma aula.
    foreignKey({
      name: "attendance_record_participant_lesson_fk",
      columns: [t.participantId, t.lessonId],
      foreignColumns: [lessonParticipant.id, lessonParticipant.lessonId],
    }),
    // Frequência única por participante e ocorrência (spec §19).
    unique("attendance_record_lesson_participant_uq").on(t.lessonId, t.participantId),
  ],
);

// Correção após a finalização: autor, data, motivo, antes e depois. Somente inserção.
export const attendanceRevision = pgTable(
  "attendance_revision",
  {
    id: uuid().primaryKey().defaultRandom(),
    ...tenantColumns(),
    lessonId: uuid().notNull(),
    participantId: uuid().notNull(),
    previousStatus: attendanceStatusEnum().notNull(),
    newStatus: attendanceStatusEnum().notNull(),
    reason: text().notNull(),
    authorId: text()
      .notNull()
      .references(() => user.id),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    unitFk("attendance_revision_unit_fk", t),
    sameTenantFk("attendance_revision_lesson_fk", t.lessonId, t, lessonOccurrence),
    foreignKey({
      name: "attendance_revision_participant_lesson_fk",
      columns: [t.participantId, t.lessonId],
      foreignColumns: [lessonParticipant.id, lessonParticipant.lessonId],
    }),
    check("attendance_revision_reason_ck", sql`length(trim(${t.reason})) >= 5`),
    check("attendance_revision_change_ck", sql`${t.previousStatus} <> ${t.newStatus}`),
    index("attendance_revision_lesson_idx").on(t.lessonId),
  ],
);
