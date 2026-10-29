// Cenário de teste com duas organizações isoladas. Cada chamada cria dados novos e únicos.
import { db } from "@/db";
import {
  addMembership,
  assignSubstitute,
  createClassGroup,
  createLesson,
  createOrganization,
  createRoom,
  createStudent,
  createTeacherProfile,
  createUnit,
  createUser,
  enroll,
  type Tenant,
} from "@/db/factories";
import { localInstant, shiftDay, todayInTz } from "@/lib/time";
import type { Role } from "@/modules/tenancy/schema";
import { loadContext } from "@/modules/tenancy/service";

const TZ = "America/Sao_Paulo";

export async function contextFor(userId: string, unitId: string) {
  const ctx = await loadContext(db, userId, unitId);
  if (!ctx) throw new Error("usuário sem vínculo na unidade");
  return ctx;
}

async function person(tag: string, name: string, tenant: Tenant | { organizationId: string; unitId: null }, role: Role) {
  const u = await createUser(db, { name, email: `${name.toLowerCase().replace(/\s+/g, ".")}.${tag}@teste.invalid` });
  await addMembership(db, { organizationId: tenant.organizationId, unitId: tenant.unitId, userId: u.id, role });
  return u;
}

export async function buildScenario() {
  const tag = crypto.randomUUID().slice(0, 8);
  const today = todayInTz(TZ);
  const at = (day: string, hhmm: string) => localInstant(day, hhmm, TZ);

  const orgA = await createOrganization(db, "Escola A", `escola-a-${tag}`);
  const unitA1 = await createUnit(db, orgA.id, "A Centro");
  const unitA2 = await createUnit(db, orgA.id, "A Norte");
  const orgB = await createOrganization(db, "Escola B", `escola-b-${tag}`);
  const unitB1 = await createUnit(db, orgB.id, "B Única");
  const a1: Tenant = { organizationId: orgA.id, unitId: unitA1.id };
  const b1: Tenant = { organizationId: orgB.id, unitId: unitB1.id };

  const teacherA = await person(tag, "Prof A", a1, "teacher");
  const teacherB = await person(tag, "Prof B", a1, "teacher");
  const substitute = await person(tag, "Prof Sub", a1, "teacher");
  const coordinator = await person(tag, "Coord A", a1, "coordinator");
  const receptionist = await person(tag, "Recep A", a1, "receptionist");
  const manager = await person(tag, "Gestor A", { organizationId: orgA.id, unitId: null }, "org_manager");
  const teacherOrgB = await person(tag, "Prof OrgB", b1, "teacher");
  const coordinatorOrgB = await person(tag, "Coord OrgB", b1, "coordinator");
  await addMembership(db, { organizationId: orgA.id, unitId: unitA2.id, userId: teacherA.id, role: "teacher" });

  const profA = await createTeacherProfile(db, a1, "Prof A", teacherA.id);
  const profB = await createTeacherProfile(db, a1, "Prof B", teacherB.id);
  const profSub = await createTeacherProfile(db, a1, "Prof Sub", substitute.id);
  const profOrgB = await createTeacherProfile(db, b1, "Prof OrgB", teacherOrgB.id);
  const roomA = await createRoom(db, a1, "Sala 1");
  const roomB = await createRoom(db, b1, "Sala B");

  const classA = await createClassGroup(db, a1, { code: `A-${tag}`, level: "Teens 1", responsibleTeacherId: profA.id, usualRoomId: roomA.id });
  const classA2 = await createClassGroup(db, a1, { code: `A2-${tag}`, level: "Teens 2", responsibleTeacherId: profB.id, usualRoomId: roomA.id });
  const classOrgB = await createClassGroup(db, b1, { code: `B-${tag}`, level: "Kids", responsibleTeacherId: profOrgB.id, usualRoomId: roomB.id });

  const since = shiftDay(today, -30);
  const students = [];
  for (const name of ["Ana Lima", "Bruno Costa", "Carla Dias"]) {
    const s = await createStudent(db, a1, name);
    await enroll(db, a1, classA.id, s.id, since);
    students.push(s);
  }
  const studentA2 = await createStudent(db, a1, "Davi Rocha");
  await enroll(db, a1, classA2.id, studentA2.id, since);
  const studentOrgB = await createStudent(db, b1, "Eva Souza");
  await enroll(db, b1, classOrgB.id, studentOrgB.id, since);

  const base = { roomId: roomA.id, timezone: TZ };
  const lessonPast = await createLesson(db, a1, { ...base, classGroupId: classA.id, teacherProfileId: profA.id, startsAt: at(shiftDay(today, -7), "14:00"), endsAt: at(shiftDay(today, -7), "15:00") });
  const lessonToday = await createLesson(db, a1, { ...base, classGroupId: classA.id, teacherProfileId: profA.id, startsAt: at(today, "14:00"), endsAt: at(today, "15:00") });
  const lessonFuture = await createLesson(db, a1, { ...base, classGroupId: classA.id, teacherProfileId: profA.id, startsAt: at(shiftDay(today, 7), "14:00"), endsAt: at(shiftDay(today, 7), "15:00") });
  const lessonTeacherB = await createLesson(db, a1, { ...base, classGroupId: classA2.id, teacherProfileId: profB.id, startsAt: at(today, "16:00"), endsAt: at(today, "17:00") });
  const lessonA2Future = await createLesson(db, a1, { ...base, classGroupId: classA2.id, teacherProfileId: profB.id, startsAt: at(shiftDay(today, 7), "16:00"), endsAt: at(shiftDay(today, 7), "17:00") });
  const lessonSubstituted = await createLesson(db, a1, { ...base, classGroupId: classA2.id, teacherProfileId: profB.id, startsAt: at(today, "18:00"), endsAt: at(today, "19:00") });
  await assignSubstitute(db, a1, lessonSubstituted.id, profSub.id, "licença");
  const lessonOrgB = await createLesson(db, b1, { roomId: roomB.id, timezone: TZ, classGroupId: classOrgB.id, teacherProfileId: profOrgB.id, startsAt: at(today, "14:00"), endsAt: at(today, "15:00") });

  return {
    today,
    orgA, orgB, unitA1, unitA2, unitB1, a1, b1,
    users: { teacherA, teacherB, substitute, coordinator, receptionist, manager, teacherOrgB, coordinatorOrgB },
    profiles: { profA, profB, profSub, profOrgB },
    classes: { classA, classA2, classOrgB },
    students, studentA2, studentOrgB,
    lessons: { lessonPast, lessonToday, lessonFuture, lessonTeacherB, lessonA2Future, lessonSubstituted, lessonOrgB },
  };
}

export type Scenario = Awaited<ReturnType<typeof buildScenario>>;
