import { connection } from "next/server";
import { systemRepo } from "@/lib/data";
import { serverEnv } from "@/lib/env";

/** Unauthenticated liveness/readiness probe. Exposes no data beyond up/down. */
export async function GET() {
  await connection();
  const started = Date.now();
  try {
    await systemRepo().listPlans();
    return Response.json({ status: "ok", mode: serverEnv().dataMode, dbLatencyMs: Date.now() - started }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ status: "degraded" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
