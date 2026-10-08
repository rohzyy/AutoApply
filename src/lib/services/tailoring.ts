import "server-only";
import { withFallback } from "@/lib/ai";
import { systemRepo, userRepo } from "@/lib/data";
import type { BulletSuggestion, TailoredDocument, User } from "@/lib/domain/types";
import { AppError, notFound } from "@/lib/infra/errors";
import { rateLimit } from "@/lib/infra/rate-limit";
import { audit } from "./audit";
import { assertWithinLimit } from "./billing";
import { scoreMatch } from "./matching/engine";

async function buildAndStore(userId: string, jobId: string, applicationId: string | null) {
  const repo = systemRepo();
  const [user, profile, job, resumes, previous] = await Promise.all([
    repo.getUser(userId),
    repo.getProfile(userId),
    repo.getJob(jobId),
    repo.listResumes(userId),
    repo.getLatestTailored(userId, jobId),
  ]);
  if (!user || !profile) throw new AppError("validation", "Complete your profile before tailoring.");
  if (!job) throw notFound("Job");

  const match = (await repo.getMatch(userId, jobId)) ?? null;
  const breakdown = match?.breakdown ?? scoreMatch(profile, job, job.company).breakdown;
  const resume = resumes.find((r) => r.isPrimary) ?? resumes[0] ?? null;

  const { result, provider } = await withFallback("tailor", (p) =>
    p.tailor({ profile, candidateName: user.fullName, job, breakdown, resumeText: resume?.parsedText ?? null }),
  );

  const bullets: BulletSuggestion[] = result.bullets.map((b, i) => ({ ...b, id: `${Date.now().toString(36)}-${i}`, decision: "pending" }));
  const doc = await repo.createTailoredDocument({
    userId,
    jobId,
    applicationId,
    resumeId: resume?.id ?? null,
    version: (previous?.version ?? 0) + 1,
    summary: result.summary,
    bullets,
    coverLetter: result.coverLetter,
    skillAlignment: result.skillAlignment,
    recommendations: result.recommendations,
    provider: provider.name,
    model: provider.model,
    status: "draft",
  });
  return doc;
}

async function ensureApplication(user: User, jobId: string) {
  const repo = systemRepo();
  const existing = await repo.getApplicationForJob(user.id, jobId);
  if (existing) return existing;
  const match = await repo.getMatch(user.id, jobId);
  const app = await repo.createApplication({
    userId: user.id,
    jobId,
    matchId: match?.id ?? null,
    status: "preparing",
    stage: "matched",
    tailoredDocumentId: null,
    notes: "",
    nextStep: null,
    appliedAt: null,
  });
  await repo.addEvent({ applicationId: app.id, type: "created", actor: "candidate", message: "Started an application", meta: {} });
  if (match) await repo.setMatchStatus(user.id, jobId, "applied");
  return app;
}

/** Candidate-initiated tailoring. Rate limited, plan limited, and always produces a new draft version. */
export async function generateTailoring(user: User, jobId: string) {
  await rateLimit("tailor", user.id);
  await assertWithinLimit(user.id, "tailored");
  const app = await ensureApplication(user, jobId);
  const doc = await buildAndStore(user.id, jobId, app.id);

  const repo = systemRepo();
  await repo.updateApplication(app.id, {
    tailoredDocumentId: doc.id,
    stage: "tailored",
    status: app.status === "saved" ? "preparing" : app.status,
  });
  await repo.addEvent({
    applicationId: app.id,
    type: "ai",
    actor: "ai",
    message: `Generated tailoring v${doc.version} — ${doc.bullets.length} resume suggestions and a cover letter`,
    meta: { documentId: doc.id, provider: doc.provider, model: doc.model },
  });
  await audit(user, "tailoring.generated", "tailored_document", doc.id, { jobId, version: doc.version, provider: doc.provider });
  return { document: doc, applicationId: app.id };
}

/** Background variant used by the worker (e.g. retrying a failed generation). */
export async function generateForApplication(applicationId: string) {
  const repo = systemRepo();
  const app = await repo.getApplication(applicationId);
  if (!app) throw notFound("Application");
  const doc = await buildAndStore(app.userId, app.jobId, app.id);
  await repo.updateApplication(app.id, { tailoredDocumentId: doc.id, stage: "tailored" });
  await repo.addEvent({ applicationId: app.id, type: "ai", actor: "ai", message: `Generated tailoring v${doc.version}`, meta: { documentId: doc.id } });
  return doc.id;
}

async function ownedDocument(user: User, documentId: string): Promise<TailoredDocument> {
  const doc = await (await userRepo()).getTailoredDocument(documentId);
  if (!doc || doc.userId !== user.id) throw notFound("Document");
  return doc;
}

export async function decideBullet(user: User, documentId: string, bulletId: string, decision: BulletSuggestion["decision"]) {
  const doc = await ownedDocument(user, documentId);
  if (doc.status === "approved") throw new AppError("conflict", "This version is approved. Generate a new version to make changes.");
  const bullets = doc.bullets.map((b) => (b.id === bulletId ? { ...b, decision } : b));
  return (await userRepo()).updateTailoredDocument(doc.id, { bullets });
}

export async function updateCoverLetter(user: User, documentId: string, coverLetter: string) {
  const doc = await ownedDocument(user, documentId);
  if (doc.status === "approved") throw new AppError("conflict", "This version is approved. Generate a new version to make changes.");
  return (await userRepo()).updateTailoredDocument(doc.id, { coverLetter });
}

export async function approveDocument(user: User, documentId: string) {
  const doc = await ownedDocument(user, documentId);
  const pending = doc.bullets.filter((b) => b.decision === "pending").length;
  if (pending > 0) throw new AppError("validation", `Accept or reject the remaining ${pending} suggestion${pending === 1 ? "" : "s"} first.`);
  const updated = await (await userRepo()).updateTailoredDocument(doc.id, { status: "approved" });
  if (doc.applicationId) {
    await systemRepo().addEvent({ applicationId: doc.applicationId, type: "note", actor: "candidate", message: `Approved tailoring v${doc.version}`, meta: { documentId: doc.id } });
  }
  await audit(user, "tailoring.approved", "tailored_document", doc.id);
  return updated;
}
