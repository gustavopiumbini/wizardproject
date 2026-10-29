// Datas no fuso da unidade. O banco guarda timestamptz em UTC (regra 10).
import { TZDate } from "@date-fns/tz";
import { addDays, format } from "date-fns";

export const DEFAULT_TIMEZONE = "America/Sao_Paulo";
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Dia civil (AAAA-MM-DD) de um instante, no fuso informado. */
export function dayInTz(instant: Date, timezone: string): string {
  return format(new TZDate(instant, timezone), "yyyy-MM-dd");
}

export function todayInTz(timezone: string, now = new Date()): string {
  return dayInTz(now, timezone);
}

/** Intervalo [início, fim) do dia civil no fuso da unidade, como instantes UTC. */
export function dayRange(day: string, timezone: string): { start: Date; end: Date } {
  if (!ISO_DAY.test(day)) throw new Error(`Dia inválido: ${day}`);
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const start = new TZDate(y, m - 1, d, 0, 0, 0, timezone);
  const end = addDays(start, 1);
  return { start: new Date(start.getTime()), end: new Date(end.getTime()) };
}

/** Instante de um horário local (HH:mm) num dia relativo a hoje, no fuso da unidade. */
export function localInstant(day: string, time: string, timezone: string): Date {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const [hh, mm] = time.split(":").map(Number) as [number, number];
  return new Date(new TZDate(y, m - 1, d, hh, mm, 0, timezone).getTime());
}

export function shiftDay(day: string, days: number): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

export function formatTime(instant: Date, timezone: string): string {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: timezone }).format(instant);
}

export function formatDayLong(day: string, timezone: string): string {
  const { start } = dayRange(day, timezone);
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: timezone,
  }).format(start);
}

export function formatDateTime(instant: Date, timezone: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: timezone }).format(instant);
}
