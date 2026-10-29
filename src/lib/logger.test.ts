import { DrizzleQueryError } from "drizzle-orm/errors";
import { describe, expect, it } from "vitest";
import { describeError } from "./logger";

describe("logger", () => {
  it("não registra SQL nem parâmetros de erro de consulta", () => {
    const cause = Object.assign(new Error("violates check"), { code: "23514", constraint: "attendance_revision_reason_ck" });
    const error = new DrizzleQueryError("insert into attendance_revision ...", ["Atestado médico"], cause);
    const described = describeError(error);
    expect(described).toEqual({ name: "Error", code: "23514", constraint: "attendance_revision_reason_ck" });
    expect(JSON.stringify(described)).not.toContain("Atestado");
  });
});
