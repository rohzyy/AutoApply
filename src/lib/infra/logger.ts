type Level = "debug" | "info" | "warn" | "error";
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN = ORDER[(process.env.LOG_LEVEL as Level) ?? "info"] ?? 20;

const REDACT = /(password|secret|token|authorization|cookie|api[_-]?key)/i;

function scrub(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== "object") return value;
  if (value instanceof Error) return { name: value.name, message: value.message };
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => scrub(v, depth + 1));
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, REDACT.test(k) ? "[redacted]" : scrub(v, depth + 1)]),
  );
}

function emit(level: Level, event: string, fields?: Record<string, unknown>) {
  if (ORDER[level] < MIN) return;
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...(scrub(fields ?? {}) as object) });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

/** Structured JSON logger. Sensitive keys are redacted before anything is written. */
export const logger = {
  debug: (event: string, fields?: Record<string, unknown>) => emit("debug", event, fields),
  info: (event: string, fields?: Record<string, unknown>) => emit("info", event, fields),
  warn: (event: string, fields?: Record<string, unknown>) => emit("warn", event, fields),
  error: (event: string, fields?: Record<string, unknown>) => emit("error", event, fields),
  child(base: Record<string, unknown>) {
    return {
      info: (e: string, f?: Record<string, unknown>) => emit("info", e, { ...base, ...f }),
      warn: (e: string, f?: Record<string, unknown>) => emit("warn", e, { ...base, ...f }),
      error: (e: string, f?: Record<string, unknown>) => emit("error", e, { ...base, ...f }),
    };
  },
};
