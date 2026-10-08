"use server";

import { z } from "zod";
import { userRepo } from "@/lib/data";
import { ApplicationStatusSchema, SettingsSchema } from "@/lib/domain/schemas";
import * as apps from "@/lib/services/applications";
import { cancelSubscription, changePlan } from "@/lib/services/billing";
import { setMatchVisibility } from "@/lib/services/jobs";
import * as profile from "@/lib/services/profile";
import * as tailoring from "@/lib/services/tailoring";
import { audit } from "@/lib/services/audit";
import { run } from "./_wrap";

const id = z.string().min(1).max(64);

/* ---------- jobs ---------- */

export async function saveJobAction(jobId: string) {
  return run("jobs.save", async (u) => (await apps.saveJob(u, id.parse(jobId))).id, { message: "Saved to your shortlist" });
}

export async function dismissMatchAction(jobId: string) {
  return run("jobs.dismiss", (u) => setMatchVisibility(u, id.parse(jobId), "dismissed"), { message: "Hidden from your feed" });
}

export async function restoreMatchAction(jobId: string) {
  return run("jobs.restore", (u) => setMatchVisibility(u, id.parse(jobId), "new"), { message: "Restored to your feed" });
}

/* ---------- applications ---------- */

export async function moveApplicationAction(applicationId: string, status: string) {
  return run("applications.move", async (u) => (await apps.moveApplication(u, id.parse(applicationId), ApplicationStatusSchema.parse(status))).status);
}

export async function submitForReviewAction(applicationId: string) {
  return run("applications.review", async (u) => (await apps.submitForReview(u, id.parse(applicationId))).status, { message: "Sent to a human specialist" });
}

export async function updateNotesAction(applicationId: string, notes: string) {
  return run("applications.notes", async (u) => void (await apps.updateNotes(u, id.parse(applicationId), z.string().max(5000).parse(notes))), { message: "Notes saved", refresh: false });
}

export async function addNoteAction(applicationId: string, message: string) {
  return run("applications.addNote", async (u) => void (await apps.addNote(u, id.parse(applicationId), z.string().trim().min(1).max(1000).parse(message))));
}

export async function setNextStepAction(applicationId: string, label: string, at: string) {
  return run("applications.nextStep", async (u) => {
    const step = label.trim() ? { label: z.string().trim().min(2).max(120).parse(label), at: z.iso.datetime({ offset: true }).or(z.iso.date()).parse(at) } : null;
    await apps.setNextStep(u, id.parse(applicationId), step ? { ...step, at: new Date(step.at).toISOString() } : null);
  }, { message: "Next step updated" });
}

/* ---------- tailoring ---------- */

export async function generateTailoringAction(jobId: string) {
  return run("tailoring.generate", async (u) => (await tailoring.generateTailoring(u, id.parse(jobId))).document.id, { message: "Tailoring ready for your review" });
}

export async function decideBulletAction(documentId: string, bulletId: string, decision: string) {
  return run("tailoring.bullet", async (u) => void (await tailoring.decideBullet(u, id.parse(documentId), id.parse(bulletId), z.enum(["accepted", "rejected", "pending"]).parse(decision))));
}

export async function saveCoverLetterAction(documentId: string, text: string) {
  return run("tailoring.cover", async (u) => void (await tailoring.updateCoverLetter(u, id.parse(documentId), z.string().trim().min(50, "Cover letter looks too short").max(8000).parse(text))), { message: "Cover letter saved" });
}

export async function approveTailoringAction(documentId: string) {
  return run("tailoring.approve", async (u) => void (await tailoring.approveDocument(u, id.parse(documentId))), { message: "Approved — ready for human review" });
}

/* ---------- profile ---------- */

export async function updateProfileAction(input: unknown) {
  return run("profile.update", async (u) => void (await profile.updateProfile(u, input)), { message: "Profile saved — re-ranking your matches" });
}

export async function completeOnboardingAction(input: unknown) {
  return run("onboarding.complete", (u) => profile.completeOnboarding(u, input), { refresh: false });
}

export async function uploadResumeAction(form: FormData) {
  return run("resume.upload", async (u) => {
    const file = form.get("file");
    if (!(file instanceof File)) throw new z.ZodError([{ code: "custom", path: ["file"], message: "Choose a file", input: null }]);
    const res = await profile.uploadResume(u, file, { name: String(form.get("name") ?? ""), makePrimary: form.get("primary") === "on" });
    return { id: res.resume.id, name: res.resume.name, extracted: res.extracted };
  }, { message: "Resume uploaded" });
}

export async function deleteResumeAction(resumeId: string) {
  return run("resume.delete", (u) => profile.deleteResume(u, id.parse(resumeId)), { message: "Resume deleted" });
}

export async function setPrimaryResumeAction(resumeId: string) {
  return run("resume.primary", (u) => profile.setPrimaryResume(u, id.parse(resumeId)), { message: "Primary resume updated" });
}

export async function rematchAction() {
  return run("matching.rematch", (u) => profile.rematchNow(u), { message: "Matches refreshed" });
}

/* ---------- settings & account ---------- */

export async function updateSettingsAction(input: unknown) {
  return run("settings.update", async (u) => {
    const data = SettingsSchema.parse(input);
    await (await userRepo()).upsertSettings({ ...data, userId: u.id });
    await audit(u, "settings.updated", "user_settings", u.id);
  }, { message: "Preferences saved" });
}

export async function updateAccountAction(fullName: string) {
  return run("account.update", async (u) => {
    await (await userRepo()).updateUser(u.id, { fullName: z.string().trim().min(2).max(80).parse(fullName) });
    await audit(u, "account.updated", "user", u.id);
  }, { message: "Account updated" });
}

export async function changePlanAction(planId: string, interval: string) {
  return run("billing.change", async (u) => void (await changePlan(u, z.enum(["entry", "professional", "executive"]).parse(planId), z.enum(["month", "year"]).parse(interval))), { message: "Plan updated" });
}

export async function cancelPlanAction() {
  return run("billing.cancel", (u) => cancelSubscription(u), { message: "Your plan will end at the close of this period" });
}

export async function markNotificationsReadAction(ids?: string[]) {
  return run("notifications.read", async (u) => (await userRepo()).markNotificationsRead(u.id, ids ? z.array(id).max(100).parse(ids) : undefined));
}
