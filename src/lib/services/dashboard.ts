import "server-only";
import { userRepo } from "@/lib/data";
import { profileCompleteness } from "@/lib/domain/profile";
import type { ApplicationStatus, User } from "@/lib/domain/types";
import { rankMatches } from "./matching/engine";

export interface DashboardTask {
  id: string;
  label: string;
  detail: string;
  href: string;
  due: string | null;
  kind: "profile" | "review" | "tailor" | "interview" | "offer" | "follow_up";
}

export async function dashboardData(user: User) {
  const repo = await userRepo();
  const [profile, resumes, matches, applications, activity, notifications] = await Promise.all([
    repo.getProfile(user.id),
    repo.listResumes(user.id),
    repo.listMatches(user.id, { limit: 200 }),
    repo.listApplications(user.id),
    repo.listRecentActivity(user.id, 8),
    repo.listNotifications(user.id, 10),
  ]);

  const completeness = profileCompleteness(profile, resumes.length > 0);
  const appliedJobIds = new Set(applications.map((a) => a.jobId));
  const fresh = rankMatches(matches.filter((m) => m.status === "new" && !appliedJobIds.has(m.jobId) && m.breakdown.eligibility !== "ineligible"));
  const now = Date.now();
  const weekAgo = new Date(now - 7 * 86_400_000).toISOString();

  const count = (statuses: ApplicationStatus[]) => applications.filter((a) => statuses.includes(a.status)).length;
  const stats = {
    newMatches: fresh.filter((m) => m.createdAt >= weekAgo).length,
    highFit: fresh.filter((m) => m.score >= 85).length,
    active: count(["preparing", "human_review", "applied", "screening", "interview", "offer"]),
    inReview: count(["human_review"]),
    interviews: count(["interview"]),
    offers: count(["offer"]),
    saved: count(["saved"]),
    responseRate: (() => {
      const submitted = applications.filter((a) => a.appliedAt).length;
      const responded = count(["screening", "interview", "offer"]);
      return submitted ? Math.round((responded / submitted) * 100) : 0;
    })(),
  };

  const upcoming = applications
    .filter((a) => a.nextStep && new Date(a.nextStep.at).getTime() > now - 3_600_000)
    .sort((a, b) => a.nextStep!.at.localeCompare(b.nextStep!.at))
    .slice(0, 4);

  const tasks: DashboardTask[] = [];
  for (const item of completeness.missing.slice(0, 2)) {
    tasks.push({ id: `p-${item.key}`, label: item.label, detail: "Improves match accuracy", href: item.href, due: null, kind: "profile" });
  }
  for (const a of applications) {
    if (a.status === "offer" && a.nextStep) tasks.push({ id: `o-${a.id}`, label: `Respond to ${a.job.company.name} offer`, detail: a.nextStep.label, href: `/applications?open=${a.id}`, due: a.nextStep.at, kind: "offer" });
    else if (a.status === "interview" && a.nextStep) tasks.push({ id: `i-${a.id}`, label: `Prepare for ${a.job.company.name}`, detail: a.nextStep.label, href: `/applications?open=${a.id}`, due: a.nextStep.at, kind: "interview" });
    else if (a.status === "preparing") tasks.push({ id: `t-${a.id}`, label: `Finish tailoring for ${a.job.company.name}`, detail: a.tailoredDocumentId ? "Review AI suggestions and approve" : "Generate tailored materials", href: `/jobs/${a.jobId}/tailor`, due: null, kind: "tailor" });
    else if (a.status === "applied" && a.appliedAt && now - new Date(a.appliedAt).getTime() > 7 * 86_400_000)
      tasks.push({ id: `f-${a.id}`, label: `Follow up with ${a.job.company.name}`, detail: "No response in 7+ days", href: `/applications?open=${a.id}`, due: null, kind: "follow_up" });
  }
  const order: DashboardTask["kind"][] = ["offer", "interview", "review", "tailor", "profile", "follow_up"];
  tasks.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || (a.due ?? "z").localeCompare(b.due ?? "z"));

  const pipeline = {
    discovered: matches.length,
    matched: matches.filter((m) => m.score >= 70).length,
    tailored: applications.filter((a) => a.tailoredDocumentId).length,
    reviewed: applications.filter((a) => ["reviewed", "applied"].includes(a.stage)).length,
    applied: applications.filter((a) => a.appliedAt).length,
  };

  return {
    profile,
    completeness,
    stats,
    topMatches: fresh.slice(0, 5),
    upcoming,
    tasks: tasks.slice(0, 6),
    activity,
    pipeline,
    unread: notifications.filter((n) => !n.readAt).length,
    applications,
  };
}
