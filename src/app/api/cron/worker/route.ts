import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { serverEnv } from "@/lib/env";
import { logger } from "@/lib/infra/logger";
import { runWorker } from "@/lib/pipeline/worker";
import { enqueue } from "@/lib/pipeline/queue";
import { SOURCES } from "@/lib/pipeline/sources";

export const maxDuration = 60;

function authorized(req: NextRequest) {
  const secret = serverEnv().CRON_SECRET;
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret) return serverEnv().NODE_ENV !== "production";
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Scheduled entry point (e.g. Vercel Cron every 5 minutes). Enqueues hourly ingestion
 * per source (idempotent per hour) and drains due jobs within the function's time budget.
 */
export async function GET(req: NextRequest) {
  if (!authorized(req)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const hour = new Date().toISOString().slice(0, 13);
  for (const s of SOURCES) {
    await enqueue({ type: "ingest_source", payload: { source: s.id }, idempotencyKey: `ingest:${s.id}:${hour}` });
  }
  const result = await runWorker({ limit: 50, budgetMs: 50_000 });
  logger.info("cron.worker", result);
  return Response.json(result);
}
