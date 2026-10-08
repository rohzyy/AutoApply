import "server-only";
import { getAIProvider } from "@/lib/ai";
import { systemRepo } from "@/lib/data";
import { PlanUpdateSchema } from "@/lib/domain/schemas";
import { profileCompleteness } from "@/lib/domain/profile";
import type { PlanId, User } from "@/lib/domain/types";
import { serverEnv } from "@/lib/env";
import { AppError } from "@/lib/infra/errors";
import { rateLimit } from "@/lib/infra/rate-limit";
import { enqueueAndKick } from "@/lib/pipeline/queue";
import { SOURCES } from "@/lib/pipeline/sources";
import { runWorker } from "@/lib/pipeline/worker";
import { audit } from "./audit";

export async function overview() {
  const repo = systemRepo();
  const now = new Date().toISOString();
  const [stats, reviews, runs, jobs] = await Promise.all([
    repo.adminStats(now),
    repo.listReviews({ status: ["queued", "in_review"], limit: 6 }),
    repo.listIngestionRuns(6),
    repo.listBackgroundJobs({ status: ["failed", "dead"], limit: 5 }),
  ]);
  return { stats, reviews, runs, failedJobs: jobs, now };
}

export async function candidates(search?: string) {
  const repo = systemRepo();
  const users = await repo.listUsers({ role: "candidate", search, limit: 200 });
  const [apps, subs] = await Promise.all([repo.listAllApplications({ limit: 1000 }), Promise.all(users.map((u) => repo.getSubscription(u.id)))]);
  const profiles = await Promise.all(users.map((u) => repo.getProfile(u.id)));
  const resumes = await Promise.all(users.map((u) => repo.listResumes(u.id)));
  return users.map((u, i) => ({
    user: u,
    profile: profiles[i],
    plan: subs[i]?.planId ?? "entry",
    completeness: profileCompleteness(profiles[i] ?? null, (resumes[i]?.length ?? 0) > 0).score,
    applications: apps.filter((a) => a.userId === u.id).length,
    active: apps.filter((a) => a.userId === u.id && ["human_review", "applied", "screening", "interview", "offer"].includes(a.status)).length,
  }));
}

export async function jobsCatalog(search?: string) {
  return systemRepo().listJobs({ search, limit: 300 });
}

export async function allApplications() {
  return systemRepo().listAllApplications({ limit: 300 });
}

export async function pipelineState() {
  const repo = systemRepo();
  const [runs, jobs] = await Promise.all([repo.listIngestionRuns(25), repo.listBackgroundJobs({ limit: 60 })]);
  return { runs, jobs, sources: SOURCES.map((s) => ({ id: s.id, name: s.name })) };
}

export async function auditTrail(entityType?: string) {
  const repo = systemRepo();
  const [logs, users] = await Promise.all([repo.listAudit({ limit: 200, entityType }), repo.listUsers({ limit: 500 })]);
  const names = new Map(users.map((u) => [u.id, u.fullName]));
  return logs.map((l) => ({ ...l, actorName: l.actorId ? (names.get(l.actorId) ?? "Unknown user") : "System" }));
}

export async function systemHealth() {
  const env = serverEnv();
  const repo = systemRepo();
  const started = Date.now();
  let dbOk = true;
  let dbError: string | null = null;
  try {
    await repo.listPlans();
  } catch (err) {
    dbOk = false;
    dbError = err instanceof Error ? err.message : String(err);
  }
  const dbLatency = Date.now() - started;
  const [queued, failed, runs] = await Promise.all([
    repo.listBackgroundJobs({ status: ["queued", "running"], limit: 500 }),
    repo.listBackgroundJobs({ status: ["failed", "dead"], limit: 500 }),
    repo.listIngestionRuns(1),
  ]);
  const ai = getAIProvider();
  return {
    checks: [
      { key: "database", label: env.dataMode === "supabase" ? "Postgres (Supabase)" : "Demo data store", ok: dbOk, detail: dbOk ? `${dbLatency} ms round trip` : dbError },
      { key: "auth", label: "Authentication", ok: true, detail: env.dataMode === "supabase" ? "Supabase Auth" : "Signed demo sessions" },
      { key: "ai", label: "AI provider", ok: true, detail: ai.name === "anthropic" ? `Anthropic · ${ai.model}` : "Deterministic fallback (no API key set)" },
      { key: "queue", label: "Job queue", ok: failed.filter((j) => j.status === "dead").length < 5, detail: `${queued.length} pending · ${failed.length} failed` },
      { key: "ingest", label: "Ingestion", ok: runs[0]?.status !== "failed", detail: runs[0] ? `Last run ${runs[0].status} (${runs[0].source})` : "No runs yet" },
      { key: "cron", label: "Worker cron", ok: !!env.CRON_SECRET || env.dataMode === "demo", detail: env.CRON_SECRET ? "Secret configured" : env.dataMode === "demo" ? "In-process after() kicks" : "CRON_SECRET missing" },
    ],
    dataMode: env.dataMode,
  };
}

export async function triggerIngestion(staff: User, sourceId: string) {
  await rateLimit("pipeline", staff.id);
  if (!SOURCES.some((s) => s.id === sourceId)) throw new AppError("validation", "Unknown source");
  const bucket = Math.floor(Date.now() / 60_000);
  const { job, created } = await enqueueAndKick({ type: "ingest_source", payload: { source: sourceId }, idempotencyKey: `ingest:${sourceId}:${bucket}` });
  await audit(staff, "pipeline.ingest_triggered", "background_job", job.id, { source: sourceId, created });
  return { job, created };
}

export async function retryBackgroundJob(staff: User, jobId: string) {
  await systemRepo().retryJob(jobId);
  await audit(staff, "background_job.retried", "background_job", jobId);
  return runWorker({ limit: 5, budgetMs: 15_000 });
}

export async function updatePlan(staff: User, planId: PlanId, input: unknown) {
  if (staff.role !== "admin") throw new AppError("forbidden", "Only admins can change pricing.");
  const data = PlanUpdateSchema.parse(input);
  const plan = await systemRepo().updatePlan(planId, data);
  await audit(staff, "plan.updated", "plan", planId, data);
  return plan;
}
