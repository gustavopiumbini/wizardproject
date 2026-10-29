import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { allowLoginAttempt, clearLoginAttempts, LOGIN_LIMITS, LOGIN_WINDOW_MS, loginKeys } from "./service";

describe("limite de tentativas de login", () => {
  it("bloqueia após o limite por e-mail e libera na janela seguinte", async () => {
    const keys = loginKeys(`alvo.${crypto.randomUUID()}@teste.invalid`, null);
    const now = new Date();
    for (let i = 0; i < LOGIN_LIMITS.email; i++) expect(await allowLoginAttempt(db, keys, now)).toBe(true);
    expect(await allowLoginAttempt(db, keys, now)).toBe(false);
    expect(await allowLoginAttempt(db, keys, new Date(now.getTime() + LOGIN_WINDOW_MS + 1000))).toBe(true);
  });

  it("o limite por IP vale para e-mails diferentes; sucesso zera só o e-mail", async () => {
    const ip = `10.0.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}-${crypto.randomUUID()}`;
    const now = new Date();
    let last = true;
    for (let i = 0; i <= LOGIN_LIMITS.ip; i++) {
      last = await allowLoginAttempt(db, loginKeys(`u${i}.${crypto.randomUUID()}@teste.invalid`, ip), now);
    }
    expect(last).toBe(false);

    const keys = loginKeys(`ok.${crypto.randomUUID()}@teste.invalid`, null);
    for (let i = 0; i < LOGIN_LIMITS.email; i++) await allowLoginAttempt(db, keys, now);
    await clearLoginAttempts(db, keys);
    expect(await allowLoginAttempt(db, keys, now)).toBe(true);
  });

  it("não guarda e-mail em claro", () => {
    const keys = loginKeys("Pessoa@Escola.example", "1.2.3.4");
    expect(keys.email).toMatch(/^[0-9a-f]{64}$/);
    expect(keys.email).toBe(loginKeys("pessoa@escola.example", null).email);
  });
});
