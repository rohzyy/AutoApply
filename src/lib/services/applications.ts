import "server-only";
import { systemRepo, userRepo } from "@/lib/data";
import { CANDIDATE_TRANSITIONS, DEFAULT_REVIEW_CHECKLIST, REVIEW_SLA_HOURS, STATUS_META } from "@/lib/domain/constants";
import type { Application, ApplicationStatus, User } from "@/lib/domain/types";
import { AppError, notFound } from "@/lib/infra/errors";
import { audit } from "./audit";
import { assertWithinLimit } from "./billing";
import { notify } from "./notifications";


async function owned(user: User, applicationId: string) {
  const app = await (await userRepo()).getApplication(applicationId);
  if (!app || app.userId !== user.id) throw notFound("Application");
  return app;
}

export async function listTracker(user: User) {
  return (await userRepo()).listApplications(user.id);
}

export async function applicationDetail(user: User, applicationId: string) {
  const repo = await userRepo();
  const app = await owned(user, applicationId);
  const [events, review, document] = await Promise.all([
    repo.listEvents(app.id),
    repo.getReviewForApplication(app.id),
    app.tailoredDocumentId ? repo.getTailoredDocument(app.tailoredDocumentId) : Promise.resolve(null),
  ]);
  return { application: app, events, review, document };
}

/** Save a job to the shortlist. Idempotent: saving twice returns the same application. */
export async function saveJob(user: User, jobId: string) {
  const repo = systemRepo();
  const existing = await repo.getApplicationForJob(user.id, jobId);
  if (existing) return existing;
  const job = await repo.getJob(jobId);
  if (!job || job.status !== "active") throw notFound("Job");
  const match = await repo.getMatch(user.id, jobId);
  const app = await repo.createApplication({ userId: user.id, jobId, matchId: match?.id ?? null, status: "saved", stage: "matched", tailoredDocumentId: null, notes: "", nextStep: null, appliedAt: null });
  await repo.addEvent({ applicationId: app.id, type: "ai", actor: "ai", message: `Discovered on ${job.source} and matched at ${match?.score ?? "—"}% fit`, meta: { score: match?.score } });
  await repo.addEvent({ applicationId: app.id, type: "created", actor: "candidate", message: "Saved to shortlist", meta: {} });
  if (match) await repo.setMatchStatus(user.id, jobId, "saved");
  await audit(user, "application.created", "application", app.id, { jobId, status: "saved" });
  return app;
}

export async function moveApplication(user: User, applicationId: string, to: ApplicationStatus) {
  const app = await owned(user, applicationId);
  if (app.status === to) return app;
  if (to === "human_review") return submitForReview(user, applicationId);
  if (!CANDIDATE_TRANSITIONS[app.status].includes(to)) {
    throw new AppError("validation", `Can't move from ${STATUS_META[app.status].label} to ${STATUS_META[to].label}.`);
  }
  const patch: Partial<Application> = { status: to };
  if (to === "applied") {
    patch.stage = "applied";
    patch.appliedAt = app.appliedAt ?? new Date().toISOString();
  }
  const repo = systemRepo();
  const updated = await repo.updateApplication(app.id, patch);
  await repo.addEvent({ applicationId: app.id, type: "status_change", actor: "candidate", message: `Moved from ${STATUS_META[app.status].label} to ${STATUS_META[to].label}`, meta: { from: app.status, to } });
  await audit(user, "application.status_changed", "application", app.id, { from: app.status, to });
  return updated;
}

export async function submitForReview(user: User, applicationId: string) {
  const app = await owned(user, applicationId);
  const repo = systemRepo();
  if (app.status === "human_review") throw new AppError("conflict", "Already in human review.");
  if (!["preparing", "saved"].includes(app.status)) throw new AppError("validation", "Only applications being prepared can be sent for review.");
  const doc = app.tailoredDocumentId ? await repo.getTailoredDocument(app.tailoredDocumentId) : null;
  if (!doc || doc.status !== "approved") throw new AppError("validation", "Approve your tailored resume and cover letter before requesting review.");
  await assertWithinLimit(user.id, "review");

  const review = await repo.createReview({
    applicationId: app.id,
    reviewerId: null,
    status: "queued",
    priority: (app.score ?? 0) >= 85 ? "high" : "normal",
    checklist: DEFAULT_REVIEW_CHECKLIST.map((c) => ({ ...c, done: false })),
    notes: "",
    slaDueAt: new Date(Date.now() + REVIEW_SLA_HOURS * 3_600_000).toISOString(),
    completedAt: null,
  });
  const updated = await repo.updateApplication(app.id, { status: "human_review" });
  await repo.addEvent({ applicationId: app.id, type: "review", actor: "system", message: "Sent to human review queue", meta: { reviewId: review.id } });
  await audit(user, "review.requested", "human_review", review.id, { applicationId: app.id });
  return updated;
}

export async function updateNotes(user: User, applicationId: string, notes: string) {
  const app = await owned(user, applicationId);
  return (await userRepo()).updateApplication(app.id, { notes });
}

export async function addNote(user: User, applicationId: string, message: string) {
  const app = await owned(user, applicationId);
  return (await userRepo()).addEvent({ applicationId: app.id, type: "note", actor: "candidate", message, meta: {} });
}

export async function setNextStep(user: User, applicationId: string, nextStep: { label: string; at: string } | null) {
  const app = await owned(user, applicationId);
  const updated = await (await userRepo()).updateApplication(app.id, { nextStep });
  if (nextStep) {
    await systemRepo().addEvent({ applicationId: app.id, type: "note", actor: "candidate", message: `Scheduled: ${nextStep.label}`, meta: { at: nextStep.at } });
  }
  return updated;
}

/* ---------- Staff-side transitions ---------- */

export async function markSubmitted(staff: User, applicationId: string) {
  const repo = systemRepo();
  const app = await repo.getApplication(applicationId);
  if (!app) throw notFound("Application");
  const review = await repo.getReviewForApplication(app.id);
  if (!review || review.status !== "approved") throw new AppError("validation", "Approve the review before marking it submitted.");
  const updated = await repo.updateApplication(app.id, { status: "applied", stage: "applied", appliedAt: new Date().toISOString() });
  await repo.addEvent({ applicationId: app.id, type: "status_change", actor: "reviewer", message: `Submitted to ${app.job.company.name} by ${staff.fullName}`, meta: { to: "applied" } });
  await audit(staff, "application.submitted", "application", app.id);
  await notify(app.userId, { type: "application", title: "Application submitted", body: `${app.job.title} at ${app.job.company.name} is now with the employer.`, href: `/applications?open=${app.id}` });
  return updated;
}
