import "server-only";
import { systemRepo } from "@/lib/data";
import type { ReviewStatus, User } from "@/lib/domain/types";
import { AppError, notFound } from "@/lib/infra/errors";
import { audit } from "./audit";
import { notify } from "./notifications";

export async function reviewQueue(status?: ReviewStatus[]) {
  return systemRepo().listReviews({ status });
}

export async function reviewDetail(reviewId: string) {
  const repo = systemRepo();
  const review = await repo.getReview(reviewId);
  if (!review) throw notFound("Review");
  const [profile, events, document] = await Promise.all([
    repo.getProfile(review.application.userId),
    repo.listEvents(review.applicationId),
    review.application.tailoredDocumentId ? repo.getTailoredDocument(review.application.tailoredDocumentId) : Promise.resolve(null),
  ]);
  const match = await repo.getMatch(review.application.userId, review.application.jobId);
  return { review, profile, events, document, match };
}

async function load(reviewId: string) {
  const r = await systemRepo().getReview(reviewId);
  if (!r) throw notFound("Review");
  return r;
}

export async function claimReview(staff: User, reviewId: string) {
  const r = await load(reviewId);
  if (r.status !== "queued") throw new AppError("conflict", r.reviewerName ? `Already claimed by ${r.reviewerName}.` : "This review is no longer in the queue.");
  const repo = systemRepo();
  await repo.updateReview(r.id, { reviewerId: staff.id, status: "in_review" });
  await repo.addEvent({ applicationId: r.applicationId, type: "review", actor: "reviewer", message: `${staff.fullName} picked up the review`, meta: {} });
  await audit(staff, "review.claimed", "human_review", r.id);
  await notify(r.application.userId, { type: "review", title: "Review started", body: `${staff.fullName.split(" ")[0]} is reviewing your ${r.application.job.company.name} application.`, href: `/applications?open=${r.applicationId}` });
}

export async function toggleChecklist(staff: User, reviewId: string, key: string, done: boolean) {
  const r = await load(reviewId);
  if (r.status !== "in_review" || r.reviewerId !== staff.id) throw new AppError("forbidden", "Claim this review before editing it.");
  await systemRepo().updateReview(r.id, { checklist: r.checklist.map((c) => (c.key === key ? { ...c, done } : c)) });
}

export async function completeReview(staff: User, reviewId: string, outcome: "approved" | "changes_requested", notes: string) {
  const r = await load(reviewId);
  if (r.status !== "in_review") throw new AppError("conflict", "Only reviews in progress can be completed.");
  if (r.reviewerId !== staff.id && staff.role !== "admin") throw new AppError("forbidden", "This review is assigned to someone else.");
  if (outcome === "approved" && r.checklist.some((c) => !c.done)) throw new AppError("validation", "Complete every checklist item before approving.");
  if (outcome === "changes_requested" && notes.trim().length < 10) throw new AppError("validation", "Explain what needs to change (at least 10 characters).");

  const repo = systemRepo();
  await repo.updateReview(r.id, { status: outcome, notes, completedAt: new Date().toISOString() });
  if (outcome === "approved") {
    await repo.updateApplication(r.applicationId, { stage: "reviewed" });
    await repo.addEvent({ applicationId: r.applicationId, type: "review", actor: "reviewer", message: "Review approved — ready to submit", meta: { notes } });
  } else {
    await repo.updateApplication(r.applicationId, { status: "preparing", stage: "tailored" });
    await repo.addEvent({ applicationId: r.applicationId, type: "review", actor: "reviewer", message: "Requested changes before submission", meta: { notes } });
  }
  await audit(staff, outcome === "approved" ? "review.approved" : "review.changes_requested", "human_review", r.id);
  await notify(r.application.userId, {
    type: "review",
    title: outcome === "approved" ? "Review approved" : "Changes requested",
    body: outcome === "approved" ? `Your ${r.application.job.company.name} application is cleared for submission.` : notes,
    href: `/applications?open=${r.applicationId}`,
  });
}
