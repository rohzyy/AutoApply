import "server-only";
import { AppError } from "./errors";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export interface RateLimitRule {
  limit: number;
  windowSec: number;
}

export const RATE_LIMITS = {
  auth: { limit: 10, windowSec: 300 },
  tailor: { limit: 12, windowSec: 3600 },
  upload: { limit: 20, windowSec: 3600 },
  mutation: { limit: 120, windowSec: 60 },
  api: { limit: 300, windowSec: 60 },
  pipeline: { limit: 6, windowSec: 300 },
} satisfies Record<string, RateLimitRule>;

type Bucket = { count: number; resetAt: number };
const g = globalThis as unknown as { __rl?: Map<string, Bucket> };
const memory = (g.__rl ??= new Map());

function hitMemory(key: string, rule: RateLimitRule) {
  const now = Date.now();
  const bucket = memory.get(key);
  if (!bucket || bucket.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + rule.windowSec * 1000 });
    return { allowed: true, remaining: rule.limit - 1 };
  }
  bucket.count += 1;
  return { allowed: bucket.count <= rule.limit, remaining: Math.max(0, rule.limit - bucket.count) };
}

/**
 * Fixed-window limiter. Uses a Postgres function in Supabase mode so limits hold across
 * serverless instances; falls back to process memory in demo mode or if the DB call fails.
 */
export async function rateLimit(name: keyof typeof RATE_LIMITS, identifier: string) {
  const rule = RATE_LIMITS[name];
  const key = `${name}:${identifier}`;
  let allowed: boolean;

  if (serverEnv().dataMode === "supabase") {
    const { data, error } = await createAdminClient().rpc("rate_limit_hit", { p_key: key, p_limit: rule.limit, p_window_seconds: rule.windowSec });
    allowed = error ? hitMemory(key, rule).allowed : Boolean(data);
  } else {
    allowed = hitMemory(key, rule).allowed;
  }

  if (!allowed) {
    throw new AppError("rate_limited", "You're doing that too often. Please wait a moment and try again.", { rule: name });
  }
}
