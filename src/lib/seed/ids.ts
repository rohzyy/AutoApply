import { createHash } from "node:crypto";

/** Deterministic UUID (v5-shaped) so seeds are stable across runs and databases. */
export function seedId(key: string) {
  const h = createHash("sha1").update(`autoapply:${key}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((parseInt(h.slice(16, 18), 16) & 0x3f) | 0x80).toString(16)}${h.slice(18, 20)}-${h.slice(20, 32)}`;
}

export const daysAgo = (d: number, base = Date.now()) => new Date(base - d * 86_400_000).toISOString();
export const hoursAgo = (h: number, base = Date.now()) => new Date(base - h * 3_600_000).toISOString();
export const daysFromNow = (d: number, base = Date.now()) => new Date(base + d * 86_400_000).toISOString();
