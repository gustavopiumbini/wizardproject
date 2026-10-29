// Criação de dados de apoio para seed e testes. Não use em fluxos de produção.
import { and, eq, gte, isNull, lte, or } from "drizzle-orm";
import {
  classGroup,
  classMembership,
  lessonOccurrence,
  lessonParticipant,
  room,
  student,
  teacherAssignment,
  teacherProfile,
} from "@/modules/academic/schema";
import { account, user } from "@/modules/identity/schema";
import { membership, organization, schoolUnit, type Role } from "@/modules/tenancy/schema";
import { dayInTz } from "@/lib/time";
import type { DbOrTx } from "./index";

export type Tenant = { organizationId: string; unitId: string };

async function one<T>(rows: Promise<T[]>): Promise<T> {
  const [row] = await rows;
  if (!row) throw new Error("insert sem retorno");
  return row;
}

export const createOrganization = (db: DbOrTx, name: string, slug: string) =>
  one(db.insert(organization).values({ name, slug }).returning());

export const createUnit = (db: DbOrTx, organizationId: string, name: string, timezone = "America/Sao_Paulo") =>
  one(db.insert(schoolUnit).values({ organizationId, name, timezone }).returning());

/** Usuário com credencial de e-mail e senha (hash já calculado com better-auth/crypto). */
export async function createUser(db: DbOrTx, input: { name: string; email: string; passwordHash?: string }) {
  const id = crypto.randomUUID();
  const created = await one(db.insert(user).values({ id, name: input.name, email: input.email, emailVerified: true }).returning());
  if (input.passwordHash) {
    await db.insert(account).values({
      id: crypto.randomUUID(),
      accountId: id,
      providerId: "credential",
      userId: id,
      password: input.passwordHash,
    });
  }
  return created;
}

export const addMembership = (db: DbOrTx, input: { organizationId: string; unitId: string | null; userId: string; role: Role }) =>
  one(db.insert(membership).values(input).returning());

export const createTeacherProfile = (db: DbOrTx, t: Tenant, displayName: string, userId: string | null) =>
  one(db.insert(teacherProfile).values({ ...t, displayName, userId }).returning());

export const createStudent = (db: DbOrTx, t: Tenant, fullName: string) =>
  one(db.insert(student).values({ ...t, fullName, displayName: fullName.split(" ").slice(0, 2).join(" ") }).returning());

export const createRoom = (db: DbOrTx, t: Tenant, name: string, capacity = 10) =>
  one(db.insert(room).values({ ...t, name, capacity }).returning());

export const createClassGroup = (
  db: DbOrTx,
  t: Tenant,
  input: { code: string; level: string; responsibleTeacherId: string; usualRoomId: string; capacity?: number },
) => one(db.insert(classGroup).values({ ...t, capacity: 8, ...input }).returning());

export const enroll = (db: DbOrTx, t: Tenant, classGroupId: string, studentId: string, startsOn: string) =>
  one(db.insert(classMembership).values({ ...t, classGroupId, studentId, startsOn }).returning());

/**
 * Cria a ocorrência, o docente efetivo e a lista congelada com os alunos vinculados à turma
 * na data da aula (no fuso da unidade).
 */
export async function createLesson(
  db: DbOrTx,
  t: Tenant,
  input: {
    classGroupId: string;
    roomId: string;
    teacherProfileId: string;
    startsAt: Date;
    endsAt: Date;
    timezone: string;
    status?: "scheduled" | "cancelled";
    cancelledReason?: string;
    plannedContent?: string;
  },
) {
  const { teacherProfileId, ...lessonValues } = input;
  const lesson = await one(db.insert(lessonOccurrence).values({ ...t, ...lessonValues }).returning());
  await db.insert(teacherAssignment).values({ ...t, lessonId: lesson.id, teacherProfileId, role: "responsible" });

  const day = dayInTz(input.startsAt, input.timezone);
  const members = await db
    .select({ id: classMembership.id, studentId: classMembership.studentId })
    .from(classMembership)
    .where(
      and(
        eq(classMembership.classGroupId, input.classGroupId),
        lte(classMembership.startsOn, day),
        or(isNull(classMembership.endsOn), gte(classMembership.endsOn, day)),
      ),
    );
  if (members.length > 0) {
    await db
      .insert(lessonParticipant)
      .values(members.map((m) => ({ ...t, lessonId: lesson.id, studentId: m.studentId, classMembershipId: m.id })));
  }
  return lesson;
}

/** Substituição: encerra o vínculo ativo e cria o do substituto, só para esta ocorrência. */
export async function assignSubstitute(db: DbOrTx, t: Tenant, lessonId: string, teacherProfileId: string, reason: string) {
  await db
    .update(teacherAssignment)
    .set({ status: "ended", endedAt: new Date() })
    .where(and(eq(teacherAssignment.lessonId, lessonId), eq(teacherAssignment.status, "active")));
  return one(
    db.insert(teacherAssignment).values({ ...t, lessonId, teacherProfileId, role: "substitute", reason }).returning(),
  );
}
