"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { PLANS_TAG } from "@/lib/services/public";
import * as admin from "@/lib/services/admin";
import { markSubmitted } from "@/lib/services/applications";
import * as reviews from "@/lib/services/reviews";
import { runWorker } from "@/lib/pipeline/worker";
import { audit } from "@/lib/services/audit";
import { run } from "./_wrap";

const STAFF = ["reviewer", "admin"] as ("reviewer" | "admin")[];
const id = z.string().min(1).max(64);

export async function claimReviewAction(reviewId: string) {
  return run("review.claim", (u) => reviews.claimReview(u, id.parse(reviewId)), { roles: STAFF, message: "Review claimed" });
}

export async function toggleChecklistAction(reviewId: string, key: string, done: boolean) {
  return run("review.checklist", (u) => reviews.toggleChecklist(u, id.parse(reviewId), z.string().max(40).parse(key), z.boolean().parse(done)), { roles: STAFF });
}

export async function completeReviewAction(reviewId: string, outcome: string, notes: string) {
  return run(
    "review.complete",
    (u) => reviews.completeReview(u, id.parse(reviewId), z.enum(["approved", "changes_requested"]).parse(outcome), z.string().max(2000).parse(notes)),
    { roles: STAFF, message: outcome === "approved" ? "Review approved" : "Changes requested" },
  );
}

export async function markSubmittedAction(applicationId: string) {
  return run("application.submit", async (u) => void (await markSubmitted(u, id.parse(applicationId))), { roles: STAFF, message: "Marked as applied" });
}

export async function triggerIngestionAction(sourceId: string) {
  return run("pipeline.ingest", async (u) => {
    const res = await admin.triggerIngestion(u, z.string().max(40).parse(sourceId));
    return { created: res.created };
  }, { roles: ["admin"], message: "Ingestion queued" });
}

export async function retryJobAction(jobId: string) {
  return run("pipeline.retry", (u) => admin.retryBackgroundJob(u, id.parse(jobId)), { roles: ["admin"], message: "Job re-queued" });
}

export async function runWorkerAction() {
  return run("pipeline.worker", async (u) => {
    const res = await runWorker({ limit: 25, budgetMs: 25_000 });
    await audit(u, "pipeline.worker_run", "background_job", null, res);
    return res;
  }, { roles: ["admin"] });
}

export async function updatePlanAction(planId: string, input: unknown) {
  return run(
    "plans.update",
    async (u) => {
      await admin.updatePlan(u, z.enum(["entry", "professional", "executive"]).parse(planId), input);
      updateTag(PLANS_TAG);
    },
    { roles: ["admin"], message: "Pricing updated" },
  );
}
