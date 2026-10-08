import { createHmac, timingSafeEqual } from "node:crypto";

export const DEMO_SESSION_COOKIE = "aa_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
/** Development-only fallback; production refuses to start in demo mode without SESSION_SECRET. */
export const DEV_SESSION_SECRET = "autoapply-dev-only-secret-change-me-in-production-0000";

export function demoSessionSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  return process.env.NODE_ENV === "production" ? null : DEV_SESSION_SECRET;
}

interface Payload {
  uid: string;
  exp: number;
}

const b64 = (s: string) => Buffer.from(s).toString("base64url");

function sign(data: string, secret: string) {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

/** Compact signed token: base64url(payload).hmac — used only when Supabase Auth isn't configured. */
export function createDemoToken(uid: string, secret: string, now = Date.now()) {
  if (!secret) throw new Error("SESSION_SECRET is required in production when running without Supabase");
  const body = b64(JSON.stringify({ uid, exp: Math.floor(now / 1000) + SESSION_TTL_SECONDS } satisfies Payload));
  return `${body}.${sign(body, secret)}`;
}

export function verifyDemoToken(token: string | undefined, secret: string, now = Date.now()): Payload | null {
  if (!token || !secret) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = Buffer.from(sign(body, secret));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as Payload;
    if (typeof payload.uid !== "string" || payload.exp * 1000 < now) return null;
    return payload;
  } catch {
    return null;
  }
}
