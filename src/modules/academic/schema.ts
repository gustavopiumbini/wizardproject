import { sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sameTenantFk, tenantColumns, tenantKey, unitFk } from "@/db/tenant";
import { user } from "@/modules/identity/schema";

const createdAt = () => timestamp({ withTimezone: true }).defaultNow().notNull();

export const activeStatusEnum = pgEnum("active_status", ["active", "inactive"]);

// Papel docente separado do usuário (spec §19). Um perfil por unidade.
export const teacherProfile = pgTable(
  "teacher_profile",
  {
    id: uuid().primaryKey().defaultRandom(),
    ...tenantColumns(),
    userId: text().references(() => user.id),
    displayName: text().notNull(),
    status: activeStatusEnum().notNull().default("active"),
    createdAt: createdAt(),
  },
  (t) => [
    unitFk("teacher_profile_unit_fk", t),
    tenantKey("teacher_profile_tenant_uq", t),
    unique("teacher_profile_unit_user_uq").on(t.unitId, t.userId),
  ],
);

export const student = pgTable(
  "student",
  {
    id: uuid().primaryKey().defaultRandom(),
    ...tenantColumns(),
    externalId: text(),
    fullName: text().notNull(),
    displayName: text().notNull(),
    status: activeStatusEnum().notNull().default("active"),
    createdAt: createdAt(),
  },
  (t) => [
    unitFk("student_unit_fk", t),
    tenantKey("student_tenant_uq", t),
    index("student_unit_idx").on(t.unitId),
  ],
);

export const room = pgTable(
  "room",
  {
    id: uuid().primaryKey().defaultRandom(),
    ...tenantColumns(),
    name: text().notNull(),
    capacity: integer().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unitFk("room_unit_fk", t),
    tenantKey("room_tenant_uq", t),
    unique("room_unit_name_uq").on(t.unitId, t.name),
    check("room_capacity_ck", sql`${t.capacity} > 0`),
  ],
);

export const classGroup = pgTable(
  "class_group",
  {
    id: uuid().primaryKey().defaultRandom(),
    ...tenantColumns(),
    code: text().notNull(),
    level: text().notNull(),
    responsibleTeacherId: uuid(),
    usualRoomId: uuid(),
    capacity: integer().notNull(),
    status: activeStatusEnum().notNull().default("active"),
    createdAt: createdAt(),
  },
  (t) => [
    unitFk("class_group_unit_fk", t),
    tenantKey("class_group_tenant_uq", t),
    unique("class_group_unit_code_uq").on(t.unitId, t.code),
    sameTenantFk("class_group_teacher_fk", t.responsibleTeacherId, t, teacherProfile),
    sameTenantFk("class_group_room_fk", t.usualRoomId, t, room),
    check("class_group_capacity_ck", sql`${t.capacity} > 0`),
  ],
);

// Vínculo aluno ↔ turma com início e fim. Transferir = encerrar o vínculo; nunca apagar.
export const classMembership = pgTable(
  "class_membership",
  {
    id: uuid().primaryKey().defaultRandom(),
    ...tenantColumns(),
    classGroupId: uuid().notNull(),
    studentId: uuid().notNull(),
    startsOn: date({ mode: "string" }).notNull(),
    endsOn: date({ mode: "string" }),
    endedReason: text(),
    createdAt: createdAt(),
  },
  (t) => [
    unitFk("class_membership_unit_fk", t),
    sameTenantFk("class_membership_class_fk", t.classGroupId, t, classGroup),
    sameTenantFk("class_membership_student_fk", t.studentId, t, student),
    check("class_membership_dates_ck", sql`${t.endsOn} is null or ${t.endsOn} >= ${t.startsOn}`),
    uniqueIndex("class_membership_open_uq")
      .on(t.classGroupId, t.studentId)
      .where(sql`${t.endsOn} is null`),
    index("class_membership_student_idx").on(t.studentId),
    index("class_membership_class_idx").on(t.classGroupId, t.startsOn),
  ],
);

export const lessonTypeEnum = pgEnum("lesson_type", ["regular", "individual", "makeup", "trial"]);
export const lessonStatusEnum = pgEnum("lesson_status", ["scheduled", "cancelled"]);

export const lessonOccurrence = pgTable(
  "lesson_occurrence",
  {
    id: uuid().primaryKey().defaultRandom(),
    ...tenantColumns(),
    classGroupId: uuid(),
    roomId: uuid(),
    startsAt: timestamp({ withTimezone: true }).notNull(),
    endsAt: timestamp({ withTimezone: true }).notNull(),
    timezone: text().notNull(),
    type: lessonTypeEnum().notNull().default("regular"),
    status: lessonStatusEnum().notNull().default("scheduled"),
    // Incrementa a cada mudança material (base da ciência versionada no /inc2).
    version: integer().notNull().default(1),
    cancelledReason: text(),
    plannedContent: text(),
    createdAt: createdAt(),
  },
  (t) => [
    unitFk("lesson_unit_fk", t),
    tenantKey("lesson_tenant_uq", t),
    sameTenantFk("lesson_class_fk", t.classGroupId, t, classGroup),
    sameTenantFk("lesson_room_fk", t.roomId, t, room),
    check("lesson_interval_ck", sql`${t.endsAt} > ${t.startsAt}`),
    index("lesson_unit_starts_idx").on(t.unitId, t.startsAt),
    index("lesson_class_starts_idx").on(t.classGroupId, t.startsAt),
  ],
);

export const participantKindEnum = pgEnum("participant_kind", ["regular", "makeup"]);

// Lista da aula congelada por ocorrência: preserva quem participava naquele momento (critério 13).
export const lessonParticipant = pgTable(
  "lesson_participant",
  {
    id: uuid().primaryKey().defaultRandom(),
    ...tenantColumns(),
    lessonId: uuid().notNull(),
    studentId: uuid().notNull(),
    kind: participantKindEnum().notNull().default("regular"),
    classMembershipId: uuid(),
    // Retirada da lista (ex.: transferência antes da aula). A linha nunca é apagada.
    removedAt: timestamp({ withTimezone: true }),
    removedReason: text(),
    createdAt: createdAt(),
  },
  (t) => [
    unitFk("lesson_participant_unit_fk", t),
    tenantKey("lesson_participant_tenant_uq", t),
    unique("lesson_participant_lesson_student_uq").on(t.lessonId, t.studentId),
    // Alvo da FK de attendance_record: garante que o registro é de um participante desta aula.
    unique("lesson_participant_id_lesson_uq").on(t.id, t.lessonId),
    sameTenantFk("lesson_participant_lesson_fk", t.lessonId, t, lessonOccurrence),
    sameTenantFk("lesson_participant_student_fk", t.studentId, t, student),
    foreignKey({
      name: "lesson_participant_membership_fk",
      columns: [t.classMembershipId],
      foreignColumns: [classMembership.id],
    }),
  ],
);

export const assignmentRoleEnum = pgEnum("assignment_role", ["responsible", "substitute"]);
export const assignmentStatusEnum = pgEnum("assignment_status", ["active", "ended"]);

// Professor efetivo da ocorrência. Só um vínculo ativo por aula; substituição encerra o anterior.
export const teacherAssignment = pgTable(
  "teacher_assignment",
  {
    id: uuid().primaryKey().defaultRandom(),
    ...tenantColumns(),
    lessonId: uuid().notNull(),
    teacherProfileId: uuid().notNull(),
    role: assignmentRoleEnum().notNull().default("responsible"),
    status: assignmentStatusEnum().notNull().default("active"),
    reason: text(),
    createdAt: createdAt(),
    endedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    unitFk("teacher_assignment_unit_fk", t),
    sameTenantFk("teacher_assignment_lesson_fk", t.lessonId, t, lessonOccurrence),
    sameTenantFk("teacher_assignment_teacher_fk", t.teacherProfileId, t, teacherProfile),
    uniqueIndex("teacher_assignment_active_uq")
      .on(t.lessonId)
      .where(sql`${t.status} = 'active'`),
    index("teacher_assignment_teacher_idx").on(t.teacherProfileId),
    index("teacher_assignment_lesson_idx").on(t.lessonId),
  ],
);
