import "server-only";
import { systemRepo } from "@/lib/data";
import type { CandidateProfile, JobWithCompany } from "@/lib/domain/types";
import { logger } from "@/lib/infra/logger";
import { notify } from "@/lib/services/notifications";
import { scoreMatch } from "./engine";

/** Matches below this are not stored: they would only add noise to the feed. */
export const STORE_THRESHOLD = 40;
const HIGH_FIT = 85;

function scoreAll(profile: CandidateProfile, jobs: JobWithCompany[]) {
  return jobs
    .map((job) => ({ job, ...scoreMatch(profile, job, job.company) }))
    .filter((m) => m.score >= STORE_THRESHOLD);
}

/** Re-score one candidate against every active job (after onboarding or a profile edit). */
export async function matchCandidate(userId: string) {
  const repo = systemRepo();
  const profile = await repo.getProfile(userId);
  if (!profile) return { scored: 0, highFit: 0 };

  const [jobs, existing] = await Promise.all([repo.listJobs({ status: "active" }), repo.listMatches(userId)]);
  const known = new Set(existing.map((m) => m.jobId));
  const results = scoreAll(profile, jobs);
  await repo.upsertMatches(results.map((r) => ({ userId, jobId: r.job.id, score: r.score, breakdown: r.breakdown, status: "new" })));

  const fresh = results.filter((r) => !known.has(r.job.id) && r.score >= HIGH_FIT);
  if (fresh.length) {
    await notify(userId, {
      type: "match",
      title: `${fresh.length} new high-fit ${fresh.length === 1 ? "match" : "matches"}`,
      body: fresh.slice(0, 2).map((r) => r.job.company.name).join(", ") + (fresh.length > 2 ? ` and ${fresh.length - 2} more` : "") + ` scored ${HIGH_FIT}%+.`,
      href: "/jobs",
    });
  }
  logger.info("matching.candidate.done", { userId, scored: results.length, highFit: fresh.length });
  return { scored: results.length, highFit: fresh.length };
}

/** Score one newly ingested job against every candidate profile. */
export async function matchJob(jobId: string) {
  const repo = systemRepo();
  const job = await repo.getJob(jobId);
  if (!job || job.status !== "active") return { scored: 0 };
  const profiles = await repo.listProfiles();
  const rows = profiles
    .map((p) => ({ userId: p.userId, ...scoreMatch(p, job, job.company) }))
    .filter((r) => r.score >= STORE_THRESHOLD)
    .map((r) => ({ userId: r.userId, jobId, score: r.score, breakdown: r.breakdown, status: "new" as const }));
  await repo.upsertMatches(rows);
  return { scored: rows.length };
}
