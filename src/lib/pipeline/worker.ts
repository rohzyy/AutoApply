import "server-only";
import { systemRepo } from "@/lib/data";
import type { BackgroundJob, BackgroundJobType } from "@/lib/domain/types";
import { logger } from "@/lib/infra/logger";
import { backoffMs } from "@/lib/infra/retry";
import { matchCandidate, matchJob } from "@/lib/services/matching/service";
import { notify } from "@/lib/services/notifications";
import { runIngestion } from "./ingest";

type Handler = (payload: Record<string, unknown>) => Promise<unknown>;

const str = (v: unknown, name: string) => {
  if (typeof v !== "string" || !v) throw new Error(`Invalid payload: ${name}`);
  return v;
};

const HANDLERS: Record<BackgroundJobType, Handler> = {
  ingest_source: (p) => runIngestion(str(p.source, "source")),
  match_candidate: (p) => matchCandidate(str(p.userId, "userId")),
  match_job: (p) => matchJob(str(p.jobId, "jobId")),
  tailor_application: async (p) => {
    const { generateForApplication } = await import("@/lib/services/tailoring");
    return generateForApplication(str(p.applicationId, "applicationId"));
  },
  send_notification: (p) =>
    notify(str(p.userId, "userId"), {
      type: (p.type as "system") ?? "system",
      title: str(p.title, "title"),
      body: String(p.body ?? ""),
      href: (p.href as string) ?? null,
    }),
};

async function runOne(job: BackgroundJob) {
  const repo = systemRepo();
  const started = Date.now();
  try {
    await HANDLERS[job.type](job.payload);
    await repo.completeJob(job.id);
    logger.info("worker.job.succeeded", { jobId: job.id, type: job.type, attempt: job.attempts, ms: Date.now() - started });
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const retryable = job.attempts < job.maxAttempts;
    const retryAt = retryable ? new Date(Date.now() + backoffMs(job.attempts, 2_000, 300_000)).toISOString() : null;
    await repo.failJob(job.id, message, retryAt);
    logger[retryable ? "warn" : "error"]("worker.job.failed", { jobId: job.id, type: job.type, attempt: job.attempts, retryAt, error: message });
    return false;
  }
}

/** Drains due jobs within a time budget. Safe to run concurrently: claiming uses SKIP LOCKED. */
export async function runWorker({ limit = 25, budgetMs = 50_000 }: { limit?: number; budgetMs?: number } = {}) {
  const repo = systemRepo();
  const deadline = Date.now() + budgetMs;
  let processed = 0;
  let failed = 0;
  while (Date.now() < deadline && processed < limit) {
    const batch = await repo.claimJobs(Math.min(5, limit - processed), new Date().toISOString());
    if (batch.length === 0) break;
    const results = await Promise.all(batch.map(runOne));
    processed += batch.length;
    failed += results.filter((ok) => !ok).length;
  }
  return { processed, failed };
}
