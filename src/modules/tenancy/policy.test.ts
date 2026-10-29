import { describe, expect, it } from "vitest";
import { can, PERMISSIONS, TEACHER_CORRECTION_WINDOW_MS, type LessonResource } from "./policy";
import type { AppContext } from "./service";

const ctx = (over: Partial<AppContext> = {}): AppContext => ({
  userId: "u1",
  organizationId: "org1",
  organizationName: "Org",
  unitId: "unit1",
  unitName: "Unidade",
  timezone: "America/Sao_Paulo",
  roles: ["teacher"],
  teacherProfileId: "tp1",
  ...over,
});
const lesson = (over: Partial<LessonResource> = {}): LessonResource => ({
  kind: "lesson",
  organizationId: "org1",
  unitId: "unit1",
  activeTeacherProfileIds: ["tp1"],
  ...over,
});

describe("can()", () => {
  it("nega por padrão quando o papel não tem a ação", () => {
    expect(can(ctx({ roles: ["receptionist"] }), "attendance.record", lesson())).toBe(false);
    expect(can(ctx({ roles: [] }), "lesson.view", lesson())).toBe(false);
  });

  it("nega recurso de outra organização ou unidade mesmo com papel de unidade", () => {
    const coord = ctx({ roles: ["coordinator"], teacherProfileId: null });
    expect(can(coord, "lesson.view", lesson({ organizationId: "org2" }))).toBe(false);
    expect(can(coord, "lesson.view", lesson({ unitId: "unit2" }))).toBe(false);
    expect(can(coord, "lesson.view", lesson())).toBe(true);
  });

  it("professor só acessa aula com vínculo ativo do próprio perfil", () => {
    expect(can(ctx(), "attendance.record", lesson())).toBe(true);
    expect(can(ctx(), "attendance.record", lesson({ activeTeacherProfileIds: ["tp2"] }))).toBe(false);
    expect(can(ctx({ teacherProfileId: null }), "lesson.view", lesson())).toBe(false);
  });

  it("professor corrige só dentro da janela; coordenação corrige depois dela", () => {
    const now = new Date("2026-10-29T12:00:00Z");
    const inside = new Date(now.getTime() - TEACHER_CORRECTION_WINDOW_MS + 1000);
    const outside = new Date(now.getTime() - TEACHER_CORRECTION_WINDOW_MS - 1000);
    expect(can(ctx(), "attendance.correct", lesson({ finalizedAt: inside }), now)).toBe(true);
    expect(can(ctx(), "attendance.correct", lesson({ finalizedAt: outside }), now)).toBe(false);
    expect(can(ctx({ roles: ["coordinator"] }), "attendance.correct", lesson({ finalizedAt: outside }), now)).toBe(true);
  });

  it("recepção e gestão não registram nem corrigem chamada", () => {
    for (const role of ["receptionist", "org_manager"] as const) {
      expect(PERMISSIONS["attendance.record"][role]).toBeUndefined();
      expect(PERMISSIONS["attendance.correct"][role]).toBeUndefined();
    }
  });
});
