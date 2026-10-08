import { heuristicTailor } from "@/lib/ai/heuristic";
import { DEFAULT_REVIEW_CHECKLIST, REVIEW_SLA_HOURS } from "@/lib/domain/constants";
import type {
  Application,
  ApplicationEvent,
  ApplicationStatus,
  AuditLog,
  BackgroundJob,
  CandidateProfile,
  Company,
  HumanReview,
  IngestionRun,
  Job,
  Match,
  Notification,
  Payment,
  PipelineStage,
  Plan,
  Resume,
  ReviewStatus,
  Subscription,
  TailoredDocument,
  User,
  UserSettings,
} from "@/lib/domain/types";
import { jobFingerprint } from "@/lib/pipeline/normalize";
import { scoreMatch } from "@/lib/services/matching/engine";
import { COMPANIES, JOB_SEEDS, PLANS, ROLE_TEMPLATES, companyIdByKey, jobIdByKey } from "./catalog";
import { daysAgo, daysFromNow, hoursAgo, seedId } from "./ids";
import { DEMO_ADMIN_KEY, DEMO_CANDIDATE_KEY, PEOPLE, demoProfile, otherProfiles, userIdByKey } from "./people";

export interface Dataset {
  users: User[];
  profiles: CandidateProfile[];
  resumes: Resume[];
  companies: Company[];
  jobs: Job[];
  matches: Match[];
  applications: Application[];
  events: ApplicationEvent[];
  tailored: TailoredDocument[];
  reviews: HumanReview[];
  plans: Plan[];
  subscriptions: Subscription[];
  payments: Payment[];
  notifications: Notification[];
  settings: UserSettings[];
  audit: AuditLog[];
  backgroundJobs: BackgroundJob[];
  ingestionRuns: IngestionRun[];
}

export const defaultSettings = (userId: string): UserSettings => ({
  userId,
  emailDigest: "daily",
  notifyNewMatches: true,
  notifyReviewComplete: true,
  notifyApplicationUpdates: true,
  minMatchScore: 60,
  timezone: "UTC",
});

const STATUS_STAGE: Record<ApplicationStatus, PipelineStage> = {
  saved: "matched",
  preparing: "tailored",
  human_review: "tailored",
  applied: "applied",
  screening: "applied",
  interview: "applied",
  offer: "applied",
  rejected: "applied",
};

export function buildDataset(base = Date.now()): Dataset {
  const now = new Date(base).toISOString();
  const users: User[] = PEOPLE.map((p) => ({
    id: userIdByKey(p.key),
    email: p.email,
    fullName: p.fullName,
    role: p.role,
    avatarUrl: null,
    onboardedAt: p.role === "candidate" ? daysAgo(p.createdDaysAgo - 0.1, base) : null,
    createdAt: daysAgo(p.createdDaysAgo, base),
  }));
  const userById = new Map(users.map((u) => [u.id, u]));

  const profiles = [demoProfile(now), ...otherProfiles(now)];
  const companies = COMPANIES;
  const companyById = new Map(companies.map((c) => [c.id, c]));

  const jobs: Job[] = JOB_SEEDS.map((s) => {
    const company = companyById.get(companyIdByKey(s.company))!;
    const tpl = ROLE_TEMPLATES[s.template];
    const locations = s.locations.map(([city, country]) => ({ city, country }));
    return {
      id: jobIdByKey(s.key),
      companyId: company.id,
      title: s.title,
      department: s.department,
      seniority: s.seniority,
      employmentType: "full_time",
      locations,
      workMode: s.workMode,
      remoteCountries: s.remoteCountries ?? [],
      salary: s.salary ? { min: s.salary[0], max: s.salary[1], currency: s.salary[2] } : null,
      description: `${company.name} is hiring a ${s.title} to ${tpl.description}. ${company.description}`,
      responsibilities: [...tpl.responsibilities],
      requirements: [
        `${s.minYears}+ years of relevant professional experience`,
        ...s.required.map((r) => `Strong, production experience with ${r}`),
        s.sponsorship === "no" ? "Existing right to work in the listed location" : "Clear written and spoken English",
      ],
      requiredSkills: s.required,
      niceToHaveSkills: s.nice,
      minYears: s.minYears,
      visaSponsorship: s.sponsorship,
      source: ["greenhouse", "lever", "ashby", "workable"][s.key.length % 4]!,
      sourceUrl: `https://${company.domain}/careers/${s.key}`,
      externalId: s.key,
      fingerprint: jobFingerprint(company.domain, s.title, locations[0]!.country),
      status: "active",
      postedAt: daysAgo(s.postedDaysAgo, base),
      createdAt: daysAgo(s.postedDaysAgo, base),
    };
  });
  const jobById = new Map(jobs.map((j) => [j.id, j]));

  /* Matches: score every candidate against every job, keep the relevant ones. */
  const matches: Match[] = [];
  for (const profile of profiles) {
    for (const job of jobs) {
      const { score, breakdown } = scoreMatch(profile, job, companyById.get(job.companyId)!);
      if (score < 45) continue;
      const createdAt = new Date(Math.max(new Date(job.postedAt).getTime(), base - 20 * 86_400_000) + 3_600_000).toISOString();
      matches.push({ id: seedId(`match:${profile.userId}:${job.id}`), userId: profile.userId, jobId: job.id, score, breakdown, status: "new", createdAt, updatedAt: createdAt });
    }
  }
  const matchFor = (userId: string, jobId: string) => matches.find((m) => m.userId === userId && m.jobId === jobId);

  const applications: Application[] = [];
  const events: ApplicationEvent[] = [];
  const tailored: TailoredDocument[] = [];
  const reviews: HumanReview[] = [];

  const reviewers = [userIdByKey("rev-sam"), userIdByKey("rev-lena")];

  const addApp = (
    userKey: string,
    jobKey: string,
    status: ApplicationStatus,
    opts: { daysAgo: number; nextStep?: [string, number]; review?: ReviewStatus; tailor?: boolean; notes?: string } = { daysAgo: 3 },
  ) => {
    const userId = userIdByKey(userKey);
    const jobId = jobIdByKey(jobKey);
    const job = jobById.get(jobId)!;
    const company = companyById.get(job.companyId)!;
    const match = matchFor(userId, jobId);
    const profile = profiles.find((p) => p.userId === userId)!;
    const created = daysAgo(opts.daysAgo, base);
    const id = seedId(`app:${userKey}:${jobKey}`);
    const stage = opts.review === "approved" && status === "human_review" ? "reviewed" : STATUS_STAGE[status];

    let tailoredId: string | null = null;
    if (opts.tailor !== false && status !== "saved" && match) {
      const out = heuristicTailor({ profile, candidateName: userById.get(userId)!.fullName, job: { ...job, company }, breakdown: match.breakdown, resumeText: null });
      tailoredId = seedId(`tailor:${id}`);
      tailored.push({
        id: tailoredId,
        userId,
        jobId,
        applicationId: id,
        resumeId: userKey === DEMO_CANDIDATE_KEY ? seedId("resume:demo:1") : null,
        version: 1,
        summary: out.summary,
        bullets: out.bullets.map((b, i) => ({ ...b, id: seedId(`bullet:${id}:${i}`), decision: status === "preparing" ? "pending" : "accepted" })),
        coverLetter: out.coverLetter,
        skillAlignment: out.skillAlignment,
        recommendations: out.recommendations,
        provider: "heuristic",
        model: "autoapply-rules-v2",
        status: status === "preparing" ? "draft" : "approved",
        createdAt: daysAgo(opts.daysAgo - 0.2, base),
        updatedAt: daysAgo(opts.daysAgo - 0.3, base),
      });
    }

    applications.push({
      id,
      userId,
      jobId,
      matchId: match?.id ?? null,
      status,
      stage,
      tailoredDocumentId: tailoredId,
      notes: opts.notes ?? "",
      nextStep: opts.nextStep ? { label: opts.nextStep[0], at: daysFromNow(opts.nextStep[1], base) } : null,
      appliedAt: ["applied", "screening", "interview", "offer", "rejected"].includes(status) ? daysAgo(Math.max(opts.daysAgo - 1, 0.5), base) : null,
      createdAt: created,
      updatedAt: daysAgo(Math.max(opts.daysAgo - 1.2, 0.1), base),
    });
    if (match) match.status = status === "saved" ? "saved" : "applied";

    let t = opts.daysAgo;
    const ev = (type: ApplicationEvent["type"], actor: ApplicationEvent["actor"], message: string, meta: Record<string, unknown> = {}) => {
      events.push({ id: seedId(`event:${id}:${events.length}`), applicationId: id, type, actor, message, meta, createdAt: daysAgo(t, base) });
      t = Math.max(t - 0.35, 0.05);
    };
    ev("ai", "ai", `Discovered on ${job.source} and matched at ${match?.score ?? "—"}% fit`, { score: match?.score });
    ev("created", "candidate", status === "saved" ? "Saved to shortlist" : "Started an application");
    if (tailoredId) ev("ai", "ai", "Generated tailored resume suggestions and cover letter", { documentId: tailoredId });
    if (opts.review) {
      const reviewId = seedId(`review:${id}`);
      const reviewerId = opts.review === "queued" ? null : reviewers[applications.length % 2]!;
      const done = opts.review === "approved" || opts.review === "changes_requested";
      reviews.push({
        id: reviewId,
        applicationId: id,
        reviewerId,
        status: opts.review,
        priority: match && match.score >= 85 ? "high" : "normal",
        checklist: DEFAULT_REVIEW_CHECKLIST.map((c, i) => ({ ...c, done: done || (opts.review === "in_review" && i < 2) })),
        notes: opts.review === "changes_requested" ? "Please quantify the payouts bullet and soften the claim about leading the migration." : done ? "Looks strong. Eligibility verified against the listing." : "",
        slaDueAt: new Date(new Date(created).getTime() + REVIEW_SLA_HOURS * 3_600_000 + (opts.review === "queued" ? 86_400_000 * 2 : 0)).toISOString(),
        createdAt: daysAgo(opts.daysAgo - 0.5, base),
        completedAt: done ? daysAgo(opts.daysAgo - 1, base) : null,
      });
      ev("review", "system", "Sent to human review queue");
      if (reviewerId) ev("review", "reviewer", `${userById.get(reviewerId)!.fullName} picked up the review`);
      if (opts.review === "approved") ev("review", "reviewer", "Review approved — ready to submit");
      if (opts.review === "changes_requested") ev("review", "reviewer", "Requested changes before submission");
    }
    const order: ApplicationStatus[] = ["applied", "screening", "interview", "offer"];
    for (const s of order) {
      if (order.indexOf(s) > order.indexOf(status as (typeof order)[number]) || !order.includes(status)) break;
      ev("status_change", s === "applied" ? "reviewer" : "system", s === "applied" ? `Submitted to ${company.name}` : `Moved to ${s}`, { to: s });
    }
    if (status === "rejected") {
      ev("status_change", "reviewer", `Submitted to ${company.name}`, { to: "applied" });
      ev("status_change", "system", `${company.name} closed the application`, { to: "rejected" });
    }
  };

  // Demo candidate — a full, believable pipeline.
  addApp(DEMO_CANDIDATE_KEY, "orbital-sfe", "interview", { daysAgo: 12, nextStep: ["Technical interview with the platform team", 2], review: "approved", notes: "Hiring manager: Katrin. Prepare the FHIR integration story." });
  addApp(DEMO_CANDIDATE_KEY, "verdant-fs", "offer", { daysAgo: 19, nextStep: ["Offer decision deadline", 5], review: "approved", notes: "€68k + relocation package. Ask about visa timeline." });
  addApp(DEMO_CANDIDATE_KEY, "kestrel-sfe", "screening", { daysAgo: 8, nextStep: ["Recruiter call", 1], review: "approved" });
  addApp(DEMO_CANDIDATE_KEY, "saltmarsh-sfe", "applied", { daysAgo: 4, review: "approved" });
  addApp(DEMO_CANDIDATE_KEY, "helix-sfe", "human_review", { daysAgo: 1.2, review: "in_review" });
  addApp(DEMO_CANDIDATE_KEY, "meridian-fs", "preparing", { daysAgo: 0.6 });
  addApp(DEMO_CANDIDATE_KEY, "parallax-fe", "preparing", { daysAgo: 2 });
  addApp(DEMO_CANDIDATE_KEY, "nimbus-sfe", "saved", { daysAgo: 1.5, tailor: false });
  addApp(DEMO_CANDIDATE_KEY, "kk-fs", "saved", { daysAgo: 0.8, tailor: false });
  addApp(DEMO_CANDIDATE_KEY, "arclight-fe", "rejected", { daysAgo: 16, review: "approved", notes: "Closed: role limited to US work authorization after all." });

  // Other candidates — populate the operations review queue.
  addApp("c-mateo", "parallax-design", "human_review", { daysAgo: 0.9, review: "queued" });
  addApp("c-wei", "quanta-be", "human_review", { daysAgo: 1.6, review: "in_review" });
  addApp("c-fatima", "meridian-pm", "human_review", { daysAgo: 2.4, review: "queued" });
  addApp("c-daniel", "monolith-platform", "applied", { daysAgo: 5, review: "approved" });
  addApp("c-aisha", "saltmarsh-ml", "human_review", { daysAgo: 0.4, review: "queued" });
  addApp("c-hiro", "parallax-fe", "human_review", { daysAgo: 1.1, review: "changes_requested" });
  addApp("c-priya", "kestrel-ml", "interview", { daysAgo: 9, nextStep: ["Onsite loop", 4], review: "approved" });
  addApp("c-lucas", "verdant-fs", "human_review", { daysAgo: 3.1, review: "queued" });
  addApp("c-daniel", "helix-platform", "preparing", { daysAgo: 1 });

  const demoId = userIdByKey(DEMO_CANDIDATE_KEY);
  const adminId = userIdByKey(DEMO_ADMIN_KEY);

  const resumes: Resume[] = [
    { id: seedId("resume:demo:1"), userId: demoId, name: "General — Full-Stack", fileName: "Ananya_Rao_Resume_2026.pdf", storagePath: `${demoId}/seed-resume-general.pdf`, mimeType: "application/pdf", sizeBytes: 182_440, isPrimary: true, parsedText: null, createdAt: daysAgo(33, base) },
    { id: seedId("resume:demo:2"), userId: demoId, name: "Frontend focus", fileName: "Ananya_Rao_Frontend.pdf", storagePath: `${demoId}/seed-resume-frontend.pdf`, mimeType: "application/pdf", sizeBytes: 176_020, isPrimary: false, parsedText: null, createdAt: daysAgo(14, base) },
  ];

  const plans = PLANS;
  const subscriptions: Subscription[] = [
    { id: seedId("sub:demo"), userId: demoId, planId: "professional", status: "active", interval: "month", currentPeriodEnd: daysFromNow(17, base), cancelAtPeriodEnd: false, createdAt: daysAgo(34, base) },
    ...PEOPLE.filter((p) => p.role === "candidate" && p.key !== DEMO_CANDIDATE_KEY).map((p, i) => ({
      id: seedId(`sub:${p.key}`),
      userId: userIdByKey(p.key),
      planId: (["entry", "professional", "professional", "executive"] as const)[i % 4],
      status: "active" as const,
      interval: "month" as const,
      currentPeriodEnd: daysFromNow(10 + i, base),
      cancelAtPeriodEnd: false,
      createdAt: daysAgo(p.createdDaysAgo, base),
    })),
  ];
  const payments: Payment[] = [0, 1].map((i) => ({
    id: seedId(`pay:demo:${i}`),
    userId: demoId,
    subscriptionId: seedId("sub:demo"),
    amount: 49,
    currency: "USD",
    status: "succeeded" as const,
    provider: "mock",
    providerRef: `pi_demo_${i}`,
    description: "Professional — monthly",
    createdAt: daysAgo(34 - i * 30, base),
  }));

  const notifications: Notification[] = [
    { id: seedId("n:1"), userId: demoId, type: "match", title: "4 new high-fit matches", body: "Helix Payments, Saltmarsh Commerce and 2 more scored above 85%.", href: "/jobs", readAt: null, createdAt: hoursAgo(2, base) },
    { id: seedId("n:2"), userId: demoId, type: "review", title: "Review started", body: "Sam is reviewing your Helix Payments application.", href: `/applications?open=${seedId("app:demo:helix-sfe")}`, readAt: null, createdAt: hoursAgo(5, base) },
    { id: seedId("n:3"), userId: demoId, type: "application", title: "Interview scheduled", body: "Orbital Health — technical interview in 2 days.", href: `/applications?open=${seedId("app:demo:orbital-sfe")}`, readAt: null, createdAt: hoursAgo(20, base) },
    { id: seedId("n:4"), userId: demoId, type: "application", title: "Offer received", body: "Verdant Energy sent an offer. Deadline in 5 days.", href: `/applications?open=${seedId("app:demo:verdant-fs")}`, readAt: hoursAgo(30, base), createdAt: daysAgo(2, base) },
    { id: seedId("n:5"), userId: demoId, type: "billing", title: "Payment received", body: "Professional plan renewed — $49.00.", href: "/settings#billing", readAt: daysAgo(4, base), createdAt: daysAgo(4, base) },
  ];

  const settings = users.map((u) => defaultSettings(u.id));

  const auditActions: [string, string, string, string, number][] = [
    [adminId, "admin", "plan.updated", "plan", 9],
    [demoId, "candidate", "profile.updated", "candidate_profile", 6],
    [demoId, "candidate", "resume.uploaded", "resume", 5],
    [demoId, "candidate", "application.created", "application", 1.2],
    [reviewers[0]!, "reviewer", "review.claimed", "human_review", 1.0],
    [reviewers[1]!, "reviewer", "review.approved", "human_review", 4],
    [reviewers[0]!, "reviewer", "application.submitted", "application", 3.8],
    [adminId, "admin", "pipeline.ingest_triggered", "ingestion_run", 0.5],
    [adminId, "admin", "background_job.retried", "background_job", 0.3],
    [demoId, "candidate", "auth.signed_in", "user", 0.1],
    [reviewers[1]!, "reviewer", "review.changes_requested", "human_review", 0.7],
  ];
  const audit: AuditLog[] = auditActions.map(([actorId, role, action, entityType, d], i) => ({
    id: seedId(`audit:${i}`),
    actorId,
    actorRole: role as AuditLog["actorRole"],
    action,
    entityType,
    entityId: null,
    meta: {},
    ip: "203.0.113." + (10 + i),
    createdAt: daysAgo(d, base),
  }));

  const sources = ["greenhouse", "lever", "ashby", "workable"];
  const ingestionRuns: IngestionRun[] = Array.from({ length: 10 }, (_, i) => {
    const failed = i === 3;
    const fetched = 40 + ((i * 17) % 35);
    const duplicates = 6 + ((i * 5) % 9);
    return {
      id: seedId(`run:${i}`),
      source: sources[i % 4]!,
      status: failed ? "failed" : "succeeded",
      fetched: failed ? 0 : fetched,
      normalized: failed ? 0 : fetched - 2,
      duplicates: failed ? 0 : duplicates,
      inserted: failed ? 0 : fetched - 2 - duplicates,
      error: failed ? "Upstream returned 503 after 3 attempts" : null,
      startedAt: hoursAgo(i * 7 + 1, base),
      finishedAt: hoursAgo(i * 7 + 0.9, base),
    };
  });

  const backgroundJobs: BackgroundJob[] = [
    { id: seedId("bj:1"), type: "ingest_source", payload: { source: "workable" }, status: "dead", attempts: 3, maxAttempts: 3, lastError: "Upstream returned 503 Service Unavailable", idempotencyKey: "ingest:workable:seed-a", runAfter: hoursAgo(22, base), startedAt: hoursAgo(22, base), finishedAt: hoursAgo(21.9, base), createdAt: hoursAgo(22.5, base) },
    { id: seedId("bj:2"), type: "tailor_application", payload: { applicationId: seedId("app:c-daniel:helix-platform") }, status: "failed", attempts: 1, maxAttempts: 3, lastError: "AI provider timeout after 90s", idempotencyKey: "tailor:seed-b", runAfter: hoursAgo(-0.2, base), startedAt: hoursAgo(1, base), finishedAt: hoursAgo(0.98, base), createdAt: hoursAgo(1.1, base) },
    { id: seedId("bj:3"), type: "match_candidate", payload: { userId: demoId }, status: "succeeded", attempts: 1, maxAttempts: 3, lastError: null, idempotencyKey: "match:seed-c", runAfter: hoursAgo(2, base), startedAt: hoursAgo(2, base), finishedAt: hoursAgo(1.99, base), createdAt: hoursAgo(2, base) },
    { id: seedId("bj:4"), type: "send_notification", payload: { userId: demoId }, status: "succeeded", attempts: 1, maxAttempts: 5, lastError: null, idempotencyKey: "notify:seed-d", runAfter: hoursAgo(2, base), startedAt: hoursAgo(2, base), finishedAt: hoursAgo(2, base), createdAt: hoursAgo(2, base) },
    { id: seedId("bj:5"), type: "match_job", payload: { jobId: jobIdByKey("helix-sfe") }, status: "succeeded", attempts: 2, maxAttempts: 3, lastError: null, idempotencyKey: "matchjob:seed-e", runAfter: hoursAgo(26, base), startedAt: hoursAgo(26, base), finishedAt: hoursAgo(25.9, base), createdAt: hoursAgo(26, base) },
  ];

  return { users, profiles, resumes, companies, jobs, matches, applications, events, tailored, reviews, plans, subscriptions, payments, notifications, settings, audit, backgroundJobs, ingestionRuns };
}
