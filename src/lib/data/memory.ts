import "server-only";
import { randomUUID } from "node:crypto";
import { APPLICATION_STATUSES } from "@/lib/domain/types";
import type {
  Application,
  ApplicationStatus,
  ApplicationWithJob,
  BackgroundJob,
  HumanReviewWithContext,
  JobWithCompany,
  MatchWithJob,
  UserSettings,
} from "@/lib/domain/types";
import { buildDataset, defaultSettings, type Dataset } from "@/lib/seed/dataset";
import type { AdminStats, Repository } from "./repository";

interface Store extends Dataset {
  idempotency: Map<string, unknown>;
  passwords: Map<string, string>;
  blobs: Map<string, { bytes: Uint8Array; mime: string }>;
}

const g = globalThis as unknown as { __autoapplyStore?: Store };

export function memoryStore(): Store {
  if (!g.__autoapplyStore) {
    g.__autoapplyStore = { ...buildDataset(), idempotency: new Map(), passwords: new Map(), blobs: new Map() };
  }
  return g.__autoapplyStore;
}

const nowIso = () => new Date().toISOString();
const clone = <T>(v: T): T => structuredClone(v);
const day = (iso: string) => iso.slice(0, 10);

export class MemoryRepository implements Repository {
  private get s() {
    return memoryStore();
  }

  private withCompany(jobId: string): JobWithCompany | null {
    const job = this.s.jobs.find((j) => j.id === jobId);
    if (!job) return null;
    const company = this.s.companies.find((c) => c.id === job.companyId)!;
    return clone({ ...job, company });
  }

  private appWithJob(a: Application): ApplicationWithJob {
    const match = a.matchId ? this.s.matches.find((m) => m.id === a.matchId) : this.s.matches.find((m) => m.userId === a.userId && m.jobId === a.jobId);
    return { ...clone(a), job: this.withCompany(a.jobId)!, score: match?.score ?? null };
  }

  /* users */
  async getUser(id: string) {
    return clone(this.s.users.find((u) => u.id === id) ?? null);
  }
  async getUserByEmail(email: string) {
    return clone(this.s.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null);
  }
  async listUsers(opts: { role?: string; search?: string; limit?: number } = {}) {
    const q = opts.search?.toLowerCase();
    return clone(
      this.s.users
        .filter((u) => (!opts.role || u.role === opts.role) && (!q || u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, opts.limit ?? 200),
    );
  }
  async createUser(user: Parameters<Repository["createUser"]>[0]) {
    const row = { ...user, id: user.id ?? randomUUID(), createdAt: user.createdAt ?? nowIso() };
    this.s.users.push(row);
    this.s.settings.push(defaultSettings(row.id));
    return clone(row);
  }
  async updateUser(id: string, patch: Parameters<Repository["updateUser"]>[1]) {
    const u = this.s.users.find((x) => x.id === id);
    if (!u) throw new Error("user not found");
    Object.assign(u, patch);
    return clone(u);
  }

  /* profiles */
  async getProfile(userId: string) {
    return clone(this.s.profiles.find((p) => p.userId === userId) ?? null);
  }
  async upsertProfile(profile: Parameters<Repository["upsertProfile"]>[0]) {
    const i = this.s.profiles.findIndex((p) => p.userId === profile.userId);
    const row = { ...clone(profile), updatedAt: nowIso() };
    if (i >= 0) this.s.profiles[i] = row;
    else this.s.profiles.push(row);
    return clone(row);
  }

  async listProfiles(limit = 1000) {
    return clone(this.s.profiles.slice(0, limit));
  }

  /* resumes */
  async listResumes(userId: string) {
    return clone(this.s.resumes.filter((r) => r.userId === userId).sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || b.createdAt.localeCompare(a.createdAt)));
  }
  async getResume(userId: string, id: string) {
    return clone(this.s.resumes.find((r) => r.userId === userId && r.id === id) ?? null);
  }
  async createResume(resume: Parameters<Repository["createResume"]>[0]) {
    const row = { ...resume, id: resume.id ?? randomUUID(), createdAt: resume.createdAt ?? nowIso() };
    if (row.isPrimary) this.s.resumes.forEach((r) => r.userId === row.userId && (r.isPrimary = false));
    this.s.resumes.push(row);
    return clone(row);
  }
  async deleteResume(userId: string, id: string) {
    this.s.resumes = this.s.resumes.filter((r) => !(r.userId === userId && r.id === id));
  }
  async setPrimaryResume(userId: string, id: string) {
    this.s.resumes.forEach((r) => r.userId === userId && (r.isPrimary = r.id === id));
  }

  /* companies & jobs */
  async listCompanies() {
    return clone(this.s.companies);
  }
  async upsertCompany(company: Parameters<Repository["upsertCompany"]>[0]) {
    const existing = this.s.companies.find((c) => c.domain === company.domain);
    if (existing) return clone(existing);
    const row = { ...company, id: company.id ?? randomUUID() };
    this.s.companies.push(row);
    return clone(row);
  }
  async listJobs(opts: { status?: "active" | "closed"; limit?: number; search?: string } = {}) {
    const q = opts.search?.toLowerCase();
    return this.s.jobs
      .filter((j) => (!opts.status || j.status === opts.status) && (!q || j.title.toLowerCase().includes(q)))
      .sort((a, b) => b.postedAt.localeCompare(a.postedAt))
      .slice(0, opts.limit ?? 500)
      .map((j) => this.withCompany(j.id)!);
  }
  async getJob(id: string) {
    return this.withCompany(id);
  }
  async findJobsByFingerprint(fingerprints: string[]) {
    const set = new Set(fingerprints);
    return this.s.jobs.filter((j) => set.has(j.fingerprint)).map((j) => j.fingerprint);
  }
  async insertJobs(jobs: Parameters<Repository["insertJobs"]>[0]) {
    const rows = jobs.map((j) => ({ ...j, id: j.id ?? randomUUID(), createdAt: j.createdAt ?? nowIso() }));
    this.s.jobs.push(...rows);
    return clone(rows);
  }
  async updateJob(id: string, patch: { status?: "active" | "closed" }) {
    const j = this.s.jobs.find((x) => x.id === id);
    if (j) Object.assign(j, patch);
  }

  /* matches */
  async listMatches(userId: string, query: Parameters<Repository["listMatches"]>[1] = {}) {
    const rows: MatchWithJob[] = this.s.matches
      .filter((m) => m.userId === userId && m.score >= (query.minScore ?? 0) && (!query.status || query.status.includes(m.status)))
      .map((m) => ({ ...clone(m), job: this.withCompany(m.jobId)! }))
      .filter((m) => m.job && m.job.status === "active")
      .sort((a, b) => b.score - a.score);
    return rows.slice(0, query.limit ?? 500);
  }
  async getMatch(userId: string, jobId: string) {
    return clone(this.s.matches.find((m) => m.userId === userId && m.jobId === jobId) ?? null);
  }
  async upsertMatches(matches: Parameters<Repository["upsertMatches"]>[0]) {
    let n = 0;
    for (const m of matches) {
      const existing = this.s.matches.find((x) => x.userId === m.userId && x.jobId === m.jobId);
      if (existing) {
        existing.score = m.score;
        existing.breakdown = m.breakdown;
        existing.updatedAt = nowIso();
      } else {
        const t = m.createdAt ?? nowIso();
        this.s.matches.push({ ...m, id: m.id ?? randomUUID(), createdAt: t, updatedAt: t });
      }
      n++;
    }
    return n;
  }
  async setMatchStatus(userId: string, jobId: string, status: MatchWithJob["status"]) {
    const m = this.s.matches.find((x) => x.userId === userId && x.jobId === jobId);
    if (m) {
      m.status = status;
      m.updatedAt = nowIso();
    }
  }

  /* applications */
  async listApplications(userId: string) {
    return this.s.applications.filter((a) => a.userId === userId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((a) => this.appWithJob(a));
  }
  async listAllApplications(opts: { status?: ApplicationStatus; limit?: number } = {}) {
    return this.s.applications
      .filter((a) => !opts.status || a.status === opts.status)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, opts.limit ?? 200)
      .map((a) => ({ ...this.appWithJob(a), candidateName: this.s.users.find((u) => u.id === a.userId)?.fullName ?? "Unknown" }));
  }
  async getApplication(id: string) {
    const a = this.s.applications.find((x) => x.id === id);
    return a ? this.appWithJob(a) : null;
  }
  async getApplicationForJob(userId: string, jobId: string) {
    return clone(this.s.applications.find((a) => a.userId === userId && a.jobId === jobId) ?? null);
  }
  async createApplication(app: Parameters<Repository["createApplication"]>[0]) {
    if (this.s.applications.some((a) => a.userId === app.userId && a.jobId === app.jobId)) throw new Error("duplicate application");
    const t = app.createdAt ?? nowIso();
    const row: Application = { ...app, id: app.id ?? randomUUID(), createdAt: t, updatedAt: t };
    this.s.applications.push(row);
    return clone(row);
  }
  async updateApplication(id: string, patch: Parameters<Repository["updateApplication"]>[1]) {
    const a = this.s.applications.find((x) => x.id === id);
    if (!a) throw new Error("application not found");
    Object.assign(a, patch, { updatedAt: nowIso() });
    return clone(a);
  }
  async listEvents(applicationId: string) {
    return clone(this.s.events.filter((e) => e.applicationId === applicationId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }
  async addEvent(event: Parameters<Repository["addEvent"]>[0]) {
    const row = { ...event, id: event.id ?? randomUUID(), createdAt: event.createdAt ?? nowIso() };
    this.s.events.push(row);
    return clone(row);
  }
  async listRecentActivity(userId: string, limit: number) {
    const apps = new Map(this.s.applications.filter((a) => a.userId === userId).map((a) => [a.id, a]));
    return this.s.events
      .filter((e) => apps.has(e.applicationId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
      .map((e) => {
        const job = this.withCompany(apps.get(e.applicationId)!.jobId)!;
        return { ...clone(e), jobTitle: job.title, companyName: job.company.name };
      });
  }

  /* tailoring */
  async getTailoredDocument(id: string) {
    return clone(this.s.tailored.find((t) => t.id === id) ?? null);
  }
  async getLatestTailored(userId: string, jobId: string) {
    return clone(
      this.s.tailored.filter((t) => t.userId === userId && t.jobId === jobId).sort((a, b) => b.version - a.version)[0] ?? null,
    );
  }
  async createTailoredDocument(doc: Parameters<Repository["createTailoredDocument"]>[0]) {
    const t = doc.createdAt ?? nowIso();
    const row = { ...doc, id: doc.id ?? randomUUID(), createdAt: t, updatedAt: t };
    this.s.tailored.push(row);
    return clone(row);
  }
  async countTailoredSince(userId: string, since: string) {
    return this.s.tailored.filter((t) => t.userId === userId && t.createdAt >= since).length;
  }
  async countReviewsSince(userId: string, since: string) {
    const apps = new Set(this.s.applications.filter((a) => a.userId === userId).map((a) => a.id));
    return this.s.reviews.filter((r) => apps.has(r.applicationId) && r.createdAt >= since).length;
  }
  async updateTailoredDocument(id: string, patch: Parameters<Repository["updateTailoredDocument"]>[1]) {
    const d = this.s.tailored.find((x) => x.id === id);
    if (!d) throw new Error("document not found");
    Object.assign(d, patch, { updatedAt: nowIso() });
    return clone(d);
  }

  /* reviews */
  private reviewContext(r: (typeof this.s.reviews)[number]): HumanReviewWithContext | null {
    const app = this.s.applications.find((a) => a.id === r.applicationId);
    if (!app) return null;
    const candidate = this.s.users.find((u) => u.id === app.userId)!;
    const reviewer = r.reviewerId ? this.s.users.find((u) => u.id === r.reviewerId) : null;
    return { ...clone(r), application: this.appWithJob(app), candidate: { id: candidate.id, fullName: candidate.fullName, email: candidate.email }, reviewerName: reviewer?.fullName ?? null };
  }
  async listReviews(opts: { status?: HumanReviewWithContext["status"][]; limit?: number } = {}) {
    return this.s.reviews
      .filter((r) => !opts.status || opts.status.includes(r.status))
      .sort((a, b) => (a.priority === b.priority ? a.slaDueAt.localeCompare(b.slaDueAt) : a.priority === "high" ? -1 : 1))
      .slice(0, opts.limit ?? 200)
      .map((r) => this.reviewContext(r))
      .filter((r): r is HumanReviewWithContext => r !== null);
  }
  async getReview(id: string) {
    const r = this.s.reviews.find((x) => x.id === id);
    return r ? this.reviewContext(r) : null;
  }
  async getReviewForApplication(applicationId: string) {
    return clone(this.s.reviews.filter((r) => r.applicationId === applicationId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null);
  }
  async createReview(review: Parameters<Repository["createReview"]>[0]) {
    const row = { ...review, id: review.id ?? randomUUID(), createdAt: review.createdAt ?? nowIso() };
    this.s.reviews.push(row);
    return clone(row);
  }
  async updateReview(id: string, patch: Parameters<Repository["updateReview"]>[1]) {
    const r = this.s.reviews.find((x) => x.id === id);
    if (!r) throw new Error("review not found");
    Object.assign(r, patch);
    return clone(r);
  }

  /* billing */
  async listPlans(opts: { includeInactive?: boolean } = {}) {
    return clone(this.s.plans.filter((p) => opts.includeInactive || p.active).sort((a, b) => a.sortOrder - b.sortOrder));
  }
  async updatePlan(id: Parameters<Repository["updatePlan"]>[0], patch: Parameters<Repository["updatePlan"]>[1]) {
    const p = this.s.plans.find((x) => x.id === id);
    if (!p) throw new Error("plan not found");
    Object.assign(p, patch);
    return clone(p);
  }
  async getSubscription(userId: string) {
    return clone(this.s.subscriptions.find((s) => s.userId === userId && s.status !== "canceled") ?? null);
  }
  async upsertSubscription(sub: Parameters<Repository["upsertSubscription"]>[0]) {
    const existing = this.s.subscriptions.find((s) => s.userId === sub.userId);
    if (existing) {
      Object.assign(existing, sub, { id: existing.id, createdAt: existing.createdAt });
      return clone(existing);
    }
    const row = { ...sub, id: sub.id ?? randomUUID(), createdAt: sub.createdAt ?? nowIso() };
    this.s.subscriptions.push(row);
    return clone(row);
  }
  async listPayments(userId: string) {
    return clone(this.s.payments.filter((p) => p.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }
  async createPayment(payment: Parameters<Repository["createPayment"]>[0]) {
    const row = { ...payment, id: payment.id ?? randomUUID(), createdAt: payment.createdAt ?? nowIso() };
    this.s.payments.push(row);
    return clone(row);
  }

  /* notifications & settings */
  async listNotifications(userId: string, limit = 30) {
    return clone(this.s.notifications.filter((n) => n.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit));
  }
  async createNotification(n: Parameters<Repository["createNotification"]>[0]) {
    const row = { ...n, id: n.id ?? randomUUID(), createdAt: n.createdAt ?? nowIso() };
    this.s.notifications.push(row);
    return clone(row);
  }
  async markNotificationsRead(userId: string, ids?: string[]) {
    const t = nowIso();
    this.s.notifications.forEach((n) => {
      if (n.userId === userId && !n.readAt && (!ids || ids.includes(n.id))) n.readAt = t;
    });
  }
  async getSettings(userId: string) {
    return clone(this.s.settings.find((s) => s.userId === userId) ?? defaultSettings(userId));
  }
  async upsertSettings(settings: UserSettings) {
    const i = this.s.settings.findIndex((s) => s.userId === settings.userId);
    if (i >= 0) this.s.settings[i] = clone(settings);
    else this.s.settings.push(clone(settings));
    return clone(settings);
  }

  /* audit */
  async addAudit(entry: Parameters<Repository["addAudit"]>[0]) {
    this.s.audit.push({ ...entry, id: entry.id ?? randomUUID(), createdAt: entry.createdAt ?? nowIso() });
  }
  async listAudit(opts: { limit?: number; entityType?: string; actorId?: string } = {}) {
    return clone(
      this.s.audit
        .filter((a) => (!opts.entityType || a.entityType === opts.entityType) && (!opts.actorId || a.actorId === opts.actorId))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, opts.limit ?? 100),
    );
  }

  /* background jobs */
  async enqueue(job: Parameters<Repository["enqueue"]>[0]) {
    if (job.idempotencyKey) {
      const existing = this.s.backgroundJobs.find((j) => j.idempotencyKey === job.idempotencyKey);
      if (existing) return { job: clone(existing), created: false };
    }
    const t = nowIso();
    const row: BackgroundJob = {
      id: randomUUID(),
      type: job.type,
      payload: job.payload,
      status: "queued",
      attempts: 0,
      maxAttempts: job.maxAttempts ?? 3,
      lastError: null,
      idempotencyKey: job.idempotencyKey ?? null,
      runAfter: job.runAfter ?? t,
      startedAt: null,
      finishedAt: null,
      createdAt: t,
    };
    this.s.backgroundJobs.push(row);
    return { job: clone(row), created: true };
  }
  async claimJobs(limit: number, now: string) {
    const claimable = this.s.backgroundJobs
      .filter((j) => (j.status === "queued" || j.status === "failed") && j.runAfter <= now && j.attempts < j.maxAttempts)
      .sort((a, b) => a.runAfter.localeCompare(b.runAfter))
      .slice(0, limit);
    for (const j of claimable) {
      j.status = "running";
      j.attempts += 1;
      j.startedAt = now;
    }
    return clone(claimable);
  }
  async completeJob(id: string) {
    const j = this.s.backgroundJobs.find((x) => x.id === id);
    if (j) Object.assign(j, { status: "succeeded", finishedAt: nowIso(), lastError: null });
  }
  async failJob(id: string, error: string, retryAt: string | null) {
    const j = this.s.backgroundJobs.find((x) => x.id === id);
    if (j) Object.assign(j, { status: retryAt ? "failed" : "dead", lastError: error.slice(0, 500), runAfter: retryAt ?? j.runAfter, finishedAt: nowIso() });
  }
  async retryJob(id: string) {
    const j = this.s.backgroundJobs.find((x) => x.id === id);
    if (j) Object.assign(j, { status: "queued", attempts: 0, runAfter: nowIso(), lastError: null });
  }
  async listBackgroundJobs(opts: { status?: BackgroundJob["status"][]; limit?: number } = {}) {
    return clone(
      this.s.backgroundJobs
        .filter((j) => !opts.status || opts.status.includes(j.status))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, opts.limit ?? 100),
    );
  }
  async createIngestionRun(run: Parameters<Repository["createIngestionRun"]>[0]) {
    const row = { ...run, id: run.id ?? randomUUID() };
    this.s.ingestionRuns.push(row);
    return clone(row);
  }
  async updateIngestionRun(id: string, patch: Parameters<Repository["updateIngestionRun"]>[1]) {
    const r = this.s.ingestionRuns.find((x) => x.id === id);
    if (r) Object.assign(r, patch);
  }
  async listIngestionRuns(limit = 20) {
    return clone([...this.s.ingestionRuns].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, limit));
  }

  /* idempotency & analytics */
  async getIdempotentResponse(key: string) {
    return this.s.idempotency.get(key) ?? null;
  }
  async saveIdempotentResponse(key: string, response: unknown) {
    this.s.idempotency.set(key, response);
  }
  async adminStats(now: string): Promise<AdminStats> {
    const byStatus = Object.fromEntries(APPLICATION_STATUSES.map((s) => [s, 0])) as Record<ApplicationStatus, number>;
    this.s.applications.forEach((a) => byStatus[a.status]++);
    const days = Array.from({ length: 14 }, (_, i) => day(new Date(new Date(now).getTime() - (13 - i) * 86_400_000).toISOString()));
    const count = (dates: string[]) => days.map((d) => ({ date: d, count: dates.filter((x) => day(x) === d).length }));
    const openReviews = this.s.reviews.filter((r) => r.status === "queued" || r.status === "in_review");
    return {
      candidates: this.s.users.filter((u) => u.role === "candidate").length,
      activeJobs: this.s.jobs.filter((j) => j.status === "active").length,
      applications: this.s.applications.length,
      reviewQueue: openReviews.length,
      reviewsOverdue: openReviews.filter((r) => r.slaDueAt < now).length,
      failedJobs: this.s.backgroundJobs.filter((j) => j.status === "failed" || j.status === "dead").length,
      applicationsByStatus: byStatus,
      applicationsPerDay: count(this.s.applications.map((a) => a.createdAt)),
      matchesPerDay: count(this.s.matches.map((m) => m.createdAt)),
    };
  }
}
