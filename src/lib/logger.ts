// Logger de servidor: JSON em uma linha. Nunca registre segredos, contatos ou conteúdo de aula;
// passe apenas IDs e códigos de evento.
type Level = "debug" | "info" | "warn" | "error";
type Fields = Record<string, unknown>;

/**
 * Erros viram só nome e códigos do Postgres. A mensagem nunca é registrada: a de erros de
 * consulta do Drizzle inclui SQL e parâmetros (motivos de correção, nomes, hashes).
 */
export function describeError(error: Error): Fields {
  const out: Fields = { name: error.name };
  const cause: unknown = error.cause;
  if (cause && typeof cause === "object") {
    const { code, constraint } = cause as { code?: unknown; constraint?: unknown };
    if (typeof code === "string") out.code = code;
    if (typeof constraint === "string") out.constraint = constraint;
  }
  return out;
}

function serialize(fields: Fields): Fields {
  const out: Fields = {};
  for (const [key, value] of Object.entries(fields)) {
    out[key] = value instanceof Error ? describeError(value) : value;
  }
  return out;
}

function write(level: Level, event: string, fields: Fields = {}) {
  if (level === "debug" && process.env.NODE_ENV === "production") return;
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...serialize(fields) });
  if (level === "error" || level === "warn") console.error(line);
  else console.log(line);
}

export const logger = {
  debug: (event: string, fields?: Fields) => write("debug", event, fields),
  info: (event: string, fields?: Fields) => write("info", event, fields),
  warn: (event: string, fields?: Fields) => write("warn", event, fields),
  error: (event: string, fields?: Fields) => write("error", event, fields),
};
