import "server-only";
import { after } from "next/server";
import { systemRepo } from "@/lib/data";
import type { BackgroundJob } from "@/lib/domain/types";
import { logger } from "@/lib/infra/logger";

type EnqueueInput = Pick<BackgroundJob, "type" | "payload"> & Partial<Pick<BackgroundJob, "idempotencyKey" | "runAfter" | "maxAttempts">>;

/** Durable, idempotent enqueue. The same idempotency key never creates a second job. */
export async function enqueue(job: EnqueueInput) {
  const res = await systemRepo().enqueue(job);
  if (!res.created) logger.debug("queue.duplicate", { key: job.idempotencyKey });
  return res;
}

/**
 * Enqueue and opportunistically drain the queue after the response is sent, so work
 * feels instant. The cron worker remains the source of truth for retries and backlog.
 */
export async function enqueueAndKick(job: EnqueueInput) {
  const res = await enqueue(job);
  after(async () => {
    const { runWorker } = await import("./worker");
    await runWorker({ limit: 10, budgetMs: 20_000 }).catch((err) => logger.error("queue.kick_failed", { error: err }));
  });
  return res;
}
