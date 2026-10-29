// Dados 100% fictícios para o modo demonstrativo, com datas relativas a hoje (spec §22).
// Recria tudo a cada execução. Recusa rodar em produção ou fora do modo demonstrativo.
import { sql } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { logger } from "@/lib/logger";
import { localInstant, shiftDay, todayInTz } from "@/lib/time";
import { transferStudent } from "@/modules/academic/service";
import { saveAttendance } from "@/modules/attendance/service";
import type { Role } from "@/modules/tenancy/schema";
import { loadContext } from "@/modules/tenancy/service";
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
} from "./factories";
import { db, pool } from "./index";

export const DEMO_PASSWORD = "demo-aula-em-dia";
const TZ = "America/Sao_Paulo";

function assertDemoEnvironment() {
  if (process.env.NODE_ENV === "production") throw new Error("Seed demonstrativo bloqueado em produção.");
  if (process.env.DEMO_MODE !== "true") throw new Error("Seed exige DEMO_MODE=true.");
  // O seed apaga o banco inteiro: só em Postgres local, salvo liberação explícita.
  const host = new URL(process.env.DATABASE_URL ?? "").hostname;
  if (!["localhost", "127.0.0.1", "::1", "postgres"].includes(host) && process.env.SEED_ALLOW_REMOTE !== "true") {
    throw new Error("Seed recusado: DATABASE_URL não aponta para um Postgres local.");
  }
}

async function resetDatabase() {
  const { rows } = await pool.query<{ tablename: string }>(
    "select tablename from pg_tables where schemaname = 'public'",
  );
  if (rows.length === 0) return;
  const list = rows.map((r) => `"public"."${r.tablename}"`).join(", ");
  await db.execute(sql.raw(`truncate ${list} restart identity cascade`));
}

async function ctxFor(userId: string, unitId: string) {
  const ctx = await loadContext(db, userId, unitId);
  if (!ctx) throw new Error("vínculo ausente no seed");
  return ctx;
}

export async function seed() {
  assertDemoEnvironment();
  await resetDatabase();
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const today = todayInTz(TZ);
  const at = (offset: number, hhmm: string) => localInstant(shiftDay(today, offset), hhmm, TZ);
  const lessonAt = (offset: number, start: string, end: string) => ({ startsAt: at(offset, start), endsAt: at(offset, end), timezone: TZ });

  const person = async (name: string, email: string, tenant: { organizationId: string; unitId: string | null }, role: Role) => {
    const u = await createUser(db, { name, email, passwordHash });
    await addMembership(db, { ...tenant, userId: u.id, role });
    return u;
  };

  // Organização A com duas unidades.
  const horizonte = await createOrganization(db, "Escola Horizonte Idiomas", "horizonte");
  const centro = await createUnit(db, horizonte.id, "Centro", TZ);
  const bairro = await createUnit(db, horizonte.id, "Bairro Alto", TZ);
  const c: Tenant = { organizationId: horizonte.id, unitId: centro.id };
  const b: Tenant = { organizationId: horizonte.id, unitId: bairro.id };

  await person("Helena Prado", "gestora@horizonte.example", { organizationId: horizonte.id, unitId: null }, "org_manager");
  const coord = await person("Carlos Menezes", "coordenacao@horizonte.example", c, "coordinator");
  await person("Renata Alves", "recepcao@horizonte.example", c, "receptionist");
  const rafael = await person("Rafael Souza", "prof.rafael@horizonte.example", c, "teacher");
  const julia = await person("Júlia Ramos", "prof.julia@horizonte.example", c, "teacher");
  const marina = await person("Marina Torres", "prof.marina@horizonte.example", c, "teacher");
  await addMembership(db, { ...b, userId: marina.id, role: "teacher" });

  const pRafael = await createTeacherProfile(db, c, "Rafael Souza", rafael.id);
  const pJulia = await createTeacherProfile(db, c, "Júlia Ramos", julia.id);
  const pMarina = await createTeacherProfile(db, c, "Marina Torres", marina.id);
  const pMarinaB = await createTeacherProfile(db, b, "Marina Torres", marina.id);

  const sala1 = await createRoom(db, c, "Sala 1", 8);
  const sala2 = await createRoom(db, c, "Sala 2", 10);
  const salaB = await createRoom(db, b, "Sala Azul", 8);

  const teens = await createClassGroup(db, c, { code: "TEENS-2A", level: "Teens 2", responsibleTeacherId: pRafael.id, usualRoomId: sala1.id });
  const adults = await createClassGroup(db, c, { code: "ADULT-1B", level: "Adults 1", responsibleTeacherId: pMarina.id, usualRoomId: sala2.id });
  const kids = await createClassGroup(db, c, { code: "KIDS-1", level: "Kids 1", responsibleTeacherId: pRafael.id, usualRoomId: sala1.id });
  const teensB = await createClassGroup(db, b, { code: "TEENS-1C", level: "Teens 1", responsibleTeacherId: pMarinaB.id, usualRoomId: salaB.id });

  const since = shiftDay(today, -60);
  const enrollAll = async (t: Tenant, classId: string, names: string[]) => {
    const created = [];
    for (const name of names) {
      const s = await createStudent(db, t, name);
      await enroll(db, t, classId, s.id, since);
      created.push(s);
    }
    return created;
  };
  const teensStudents = await enrollAll(c, teens.id, ["Alice Martins", "Bernardo Lopes", "Camila Freitas", "Diego Nunes"]);
  await enrollAll(c, adults.id, ["Eduardo Pires", "Fernanda Gomes", "Gustavo Reis"]);
  await enrollAll(c, kids.id, ["Heitor Barros", "Isabela Cunha", "João Pedro Melo"]);
  await enrollAll(b, teensB.id, ["Laura Batista", "Mateus Correia"]);

  // Aula passada com chamada finalizada, antes da transferência de Diego.
  const teensPast = await createLesson(db, c, { ...lessonAt(-7, "14:00", "15:00"), classGroupId: teens.id, roomId: sala1.id, teacherProfileId: pRafael.id, plannedContent: "Unit 4: past simple" });
  const rafaelCtx = await ctxFor(rafael.id, centro.id);
  const pastSheet = await db.query.lessonParticipant.findMany({ where: (p, { eq }) => eq(p.lessonId, teensPast.id) });
  await saveAttendance(db, rafaelCtx, {
    lessonId: teensPast.id,
    expectedVersion: 0,
    marks: pastSheet.map((p, i) => ({ participantId: p.id, status: i === 1 ? "absent" : "present" })),
    finalize: true,
    confirmPending: false,
  });

  // Cenário: aluno transferido de turma (TEENS-2A → ADULT-1B) há 3 dias.
  const diego = teensStudents[3];
  if (!diego) throw new Error("aluno ausente");
  await transferStudent(db, await ctxFor(coord.id, centro.id), {
    studentId: diego.id,
    fromClassId: teens.id,
    toClassId: adults.id,
    effectiveOn: shiftDay(today, -3),
    reason: "Mudança de horário a pedido da família",
  });

  // Cenário: chamada não registrada (ontem, sem nenhuma marcação).
  await createLesson(db, c, { ...lessonAt(-1, "14:00", "15:00"), classGroupId: teens.id, roomId: sala1.id, teacherProfileId: pRafael.id });
  await createLesson(db, c, { ...lessonAt(0, "14:00", "15:00"), classGroupId: teens.id, roomId: sala1.id, teacherProfileId: pRafael.id, plannedContent: "Unit 5: present perfect" });
  await createLesson(db, c, { ...lessonAt(1, "14:00", "15:00"), classGroupId: teens.id, roomId: sala1.id, teacherProfileId: pRafael.id });

  const adultsYesterday = await createLesson(db, c, { ...lessonAt(-1, "19:00", "20:30"), classGroupId: adults.id, roomId: sala2.id, teacherProfileId: pMarina.id });
  const marinaCtx = await ctxFor(marina.id, centro.id);
  const adultsParts = await db.query.lessonParticipant.findMany({ where: (p, { eq }) => eq(p.lessonId, adultsYesterday.id) });
  await saveAttendance(db, marinaCtx, {
    lessonId: adultsYesterday.id,
    expectedVersion: 0,
    marks: adultsParts.map((p) => ({ participantId: p.id, status: "present" })),
    finalize: true,
    confirmPending: false,
  });
  await createLesson(db, c, { ...lessonAt(0, "19:00", "20:30"), classGroupId: adults.id, roomId: sala2.id, teacherProfileId: pMarina.id });

  // Cenário: troca de professor (Júlia substitui Rafael hoje) e cancelamento (amanhã).
  const kidsToday = await createLesson(db, c, { ...lessonAt(0, "16:00", "17:00"), classGroupId: kids.id, roomId: sala1.id, teacherProfileId: pRafael.id });
  await assignSubstitute(db, c, kidsToday.id, pJulia.id, "Professor titular em formação");
  await createLesson(db, c, {
    ...lessonAt(1, "16:00", "17:00"),
    classGroupId: kids.id,
    roomId: sala1.id,
    teacherProfileId: pRafael.id,
    status: "cancelled",
    cancelledReason: "Feriado municipal",
  });

  await createLesson(db, b, { ...lessonAt(0, "10:00", "11:00"), classGroupId: teensB.id, roomId: salaB.id, teacherProfileId: pMarinaB.id });

  // Organização B, isolada da A.
  const ponte = await createOrganization(db, "Instituto Ponte Línguas", "ponte");
  const unica = await createUnit(db, ponte.id, "Unidade Única", TZ);
  const p: Tenant = { organizationId: ponte.id, unitId: unica.id };
  await person("Sofia Andrade", "coordenacao@ponte.example", p, "coordinator");
  const tiago = await person("Tiago Lima", "prof.tiago@ponte.example", p, "teacher");
  const pTiago = await createTeacherProfile(db, p, "Tiago Lima", tiago.id);
  const salaP = await createRoom(db, p, "Sala 3", 6);
  const basic = await createClassGroup(db, p, { code: "BASIC-A", level: "Básico", responsibleTeacherId: pTiago.id, usualRoomId: salaP.id });
  await enrollAll(p, basic.id, ["Nina Carvalho", "Otávio Moura"]);
  await createLesson(db, p, { ...lessonAt(0, "15:00", "16:00"), classGroupId: basic.id, roomId: salaP.id, teacherProfileId: pTiago.id });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seed()
    .then(() => logger.info("seed.done"))
    .catch((error: unknown) => {
      logger.error("seed.failed", { error });
      process.exitCode = 1;
    })
    .finally(() => void pool.end());
}
