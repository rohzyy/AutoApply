import "server-only";
import { userRepo } from "@/lib/data";
import type { ApplicationStatus, MatchWithJob, Seniority, User, WorkMode } from "@/lib/domain/types";
import { notFound } from "@/lib/infra/errors";
import { rankMatches, scoreMatch } from "./matching/engine";

export interface JobFilters {
  q: string;
  country: string;
  mode: WorkMode | "";
  eligibility: "all" | "eligible" | "sponsorship";
  seniority: Seniority | "";
  minScore: number;
  sort: "fit" | "recent" | "salary";
  view: "all" | "saved" | "dismissed";
}

const FX: Record<string, number> = { USD: 1, EUR: 1.08, GBP: 1.27, CAD: 0.73, AUD: 0.66, SGD: 0.74, CHF: 1.12, AED: 0.27 };

export function parseJobFilters(sp: Record<string, string | string[] | undefined>): JobFilters {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]) ?? "";
  const pick = <T extends string>(v: string, allowed: readonly T[], fallback: T) => (allowed.includes(v as T) ? (v as T) : fallback);
  return {
    q: one("q").slice(0, 80),
    country: /^[A-Z]{2}$/.test(one("country")) ? one("country") : "",
    mode: pick(one("mode"), ["", "remote", "hybrid", "onsite"] as const, ""),
    eligibility: pick(one("eligibility"), ["all", "eligible", "sponsorship"] as const, "all"),
    seniority: pick(one("seniority"), ["", "entry", "mid", "senior", "lead", "executive"] as const, ""),
    minScore: Math.min(100, Math.max(0, Number(one("min")) || 0)),
    sort: pick(one("sort"), ["fit", "recent", "salary"] as const, "fit"),
    view: pick(one("view"), ["all", "saved", "dismissed"] as const, "all"),
  };
}

export type FeedItem = MatchWithJob & { applicationStatus: ApplicationStatus | null };

export async function jobFeed(user: User, f: JobFilters) {
  const repo = await userRepo();
  const [matches, apps] = await Promise.all([repo.listMatches(user.id), repo.listApplications(user.id)]);
  const appByJob = new Map(apps.map((a) => [a.jobId, a.status]));
  const q = f.q.toLowerCase();

  let items: FeedItem[] = matches
    .map((m) => ({ ...m, applicationStatus: appByJob.get(m.jobId) ?? null }))
    .filter((m) => {
      if (f.view === "dismissed") return m.status === "dismissed";
      if (m.status === "dismissed") return false;
      if (f.view === "saved" && m.status !== "saved" && !m.applicationStatus) return false;
      if (q && !`${m.job.title} ${m.job.company.name} ${m.job.requiredSkills.join(" ")}`.toLowerCase().includes(q)) return false;
      if (f.country && !m.job.locations.some((l) => l.country === f.country) && !m.job.remoteCountries.includes(f.country)) return false;
      if (f.mode && m.job.workMode !== f.mode) return false;
      if (f.seniority && m.job.seniority !== f.seniority) return false;
      if (f.eligibility === "eligible" && m.breakdown.eligibility !== "eligible") return false;
      if (f.eligibility === "sponsorship" && m.breakdown.eligibility === "ineligible") return false;
      return m.score >= f.minScore;
    });

  if (f.sort === "fit") items = rankMatches(items);
  else if (f.sort === "recent") items.sort((a, b) => b.job.postedAt.localeCompare(a.job.postedAt));
  else items.sort((a, b) => (b.job.salary ? b.job.salary.max * (FX[b.job.salary.currency] ?? 1) : 0) - (a.job.salary ? a.job.salary.max * (FX[a.job.salary.currency] ?? 1) : 0));

  const countries = new Map<string, number>();
  matches.forEach((m) => m.status !== "dismissed" && m.job.locations.forEach((l) => countries.set(l.country, (countries.get(l.country) ?? 0) + 1)));

  return {
    items,
    total: matches.filter((m) => m.status !== "dismissed").length,
    countries: [...countries.entries()].sort((a, b) => b[1] - a[1]),
  };
}

export async function jobDetail(user: User, jobId: string) {
  const repo = await userRepo();
  const job = await repo.getJob(jobId);
  if (!job) throw notFound("Job");
  const [stored, application, document, profile, matches] = await Promise.all([
    repo.getMatch(user.id, jobId),
    repo.getApplicationForJob(user.id, jobId),
    repo.getLatestTailored(user.id, jobId),
    repo.getProfile(user.id),
    repo.listMatches(user.id, { limit: 60 }),
  ]);
  // A job can be opened before the worker has scored it; compute an explanation on the fly.
  const match = stored ?? (profile ? { ...scoreMatch(profile, job, job.company), status: "new" as const, id: null } : null);
  const similar = matches
    .filter((m) => m.jobId !== jobId && m.status !== "dismissed" && (m.job.department === job.department || m.job.companyId === job.companyId))
    .slice(0, 4);
  return { job, match, application, document, similar, profile };
}

export async function setMatchVisibility(user: User, jobId: string, status: "dismissed" | "new" | "saved") {
  const repo = await userRepo();
  if (!(await repo.getMatch(user.id, jobId))) throw notFound("Match");
  await repo.setMatchStatus(user.id, jobId, status);
}
