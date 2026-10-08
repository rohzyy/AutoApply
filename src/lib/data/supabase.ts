import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { APPLICATION_STATUSES } from "@/lib/domain/types";
import type {
  Application,
  ApplicationEvent,
  ApplicationStatus,
  ApplicationWithJob,
  AuditLog,
  BackgroundJob,
  CandidateProfile,
  Company,
  HumanReview,
  HumanReviewWithContext,
  IngestionRun,
  Job,
  JobWithCompany,
  Match,
  MatchWithJob,
  Notification,
  Payment,
  Plan,
  Resume,
  Subscription,
  TailoredDocument,
  User,
  UserSettings,
} from "@/lib/domain/types";
import { defaultSettings } from "@/lib/seed/dataset";
import type { AdminStats, Repository } from "./repository";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

function check(res: { data: any; error: { message: string; code?: string } | null }, ctx: string): any {
  if (res.error) throw new Error(`[db:${ctx}] ${res.error.message}`);
  return res.data;
}

/* ---------- mappers ---------- */

const toUser = (r: Row): User => ({ id: r.id, email: r.email, fullName: r.full_name, role: r.role, avatarUrl: r.avatar_url, onboardedAt: r.onboarded_at, createdAt: r.created_at });

const toProfile = (r: Row): CandidateProfile => ({
  userId: r.user_id,
  headline: r.headline,
  summary: r.summary,
  location: { city: r.location_city, country: r.location_country ?? "" },
  citizenship: r.citizenship,
  workAuthorizations: r.work_authorizations,
  requiresSponsorship: r.requires_sponsorship,
  willingToRelocate: r.willing_to_relocate,
  relocationCountries: r.relocation_countries,
  remotePreference: r.remote_preference,
  preferredRoles: r.preferred_roles,
  preferredCountries: r.preferred_countries,
  seniority: r.seniority,
  yearsExperience: r.years_experience,
  skills: r.skills,
  experience: r.experience,
  education: r.education,
  salaryExpectation: r.salary_min != null ? { min: r.salary_min, currency: r.salary_currency ?? "USD" } : null,
  links: r.links,
  updatedAt: r.updated_at,
});

const fromProfile = (p: CandidateProfile): Row => ({
  user_id: p.userId,
  headline: p.headline,
  summary: p.summary,
  location_city: p.location.city,
  location_country: p.location.country || null,
  citizenship: p.citizenship,
  work_authorizations: p.workAuthorizations,
  requires_sponsorship: p.requiresSponsorship,
  willing_to_relocate: p.willingToRelocate,
  relocation_countries: p.relocationCountries,
  remote_preference: p.remotePreference,
  preferred_roles: p.preferredRoles,
  preferred_countries: p.preferredCountries,
  seniority: p.seniority,
  years_experience: p.yearsExperience,
  skills: p.skills,
  experience: p.experience,
  education: p.education,
  salary_min: p.salaryExpectation?.min ?? null,
  salary_currency: p.salaryExpectation?.currency ?? null,
  links: p.links,
});

const toResume = (r: Row): Resume => ({ id: r.id, userId: r.user_id, name: r.name, fileName: r.file_name, storagePath: r.storage_path, mimeType: r.mime_type, sizeBytes: r.size_bytes, isPrimary: r.is_primary, parsedText: r.parsed_text, createdAt: r.created_at });

const toCompany = (r: Row): Company => ({
  id: r.id,
  name: r.name,
  domain: r.domain,
  industry: r.industry,
  size: r.size,
  headquarters: { city: r.hq_city, country: r.hq_country ?? "" },
  description: r.description,
  sponsorshipHistory: r.sponsorship_history,
  website: r.website,
  brandColor: r.brand_color,
});

const fromCompany = (c: Partial<Company>): Row => ({
  ...(c.id ? { id: c.id } : {}),
  name: c.name,
  domain: c.domain,
  industry: c.industry,
  size: c.size,
  hq_city: c.headquarters?.city,
  hq_country: c.headquarters?.country || null,
  description: c.description,
  sponsorship_history: c.sponsorshipHistory,
  website: c.website,
  brand_color: c.brandColor,
});

const toJob = (r: Row): Job => ({
  id: r.id,
  companyId: r.company_id,
  title: r.title,
  department: r.department,
  seniority: r.seniority,
  employmentType: r.employment_type,
  locations: r.locations,
  workMode: r.work_mode,
  remoteCountries: r.remote_countries,
  salary: r.salary_min != null && r.salary_max != null ? { min: r.salary_min, max: r.salary_max, currency: r.salary_currency } : null,
  description: r.description,
  responsibilities: r.responsibilities,
  requirements: r.requirements,
  requiredSkills: r.required_skills,
  niceToHaveSkills: r.nice_to_have_skills,
  minYears: r.min_years,
  visaSponsorship: r.visa_sponsorship,
  source: r.source,
  sourceUrl: r.source_url,
  externalId: r.external_id,
  fingerprint: r.fingerprint,
  status: r.status,
  postedAt: r.posted_at,
  createdAt: r.created_at,
});

const fromJob = (j: Partial<Job>): Row => ({
  ...(j.id ? { id: j.id } : {}),
  company_id: j.companyId,
  title: j.title,
  department: j.department,
  seniority: j.seniority,
  employment_type: j.employmentType,
  locations: j.locations,
  work_mode: j.workMode,
  remote_countries: j.remoteCountries,
  salary_min: j.salary?.min ?? null,
  salary_max: j.salary?.max ?? null,
  salary_currency: j.salary?.currency ?? null,
  description: j.description,
  responsibilities: j.responsibilities,
  requirements: j.requirements,
  required_skills: j.requiredSkills,
  nice_to_have_skills: j.niceToHaveSkills,
  min_years: j.minYears,
  visa_sponsorship: j.visaSponsorship,
  source: j.source,
  source_url: j.sourceUrl,
  external_id: j.externalId,
  fingerprint: j.fingerprint,
  status: j.status,
  posted_at: j.postedAt,
  ...(j.createdAt ? { created_at: j.createdAt } : {}),
});

const toJobWithCompany = (r: Row): JobWithCompany => ({ ...toJob(r), company: toCompany(r.company) });

const toMatch = (r: Row): Match => ({ id: r.id, userId: r.user_id, jobId: r.job_id, score: r.score, breakdown: r.breakdown, status: r.status, createdAt: r.created_at, updatedAt: r.updated_at });

const toApplication = (r: Row): Application => ({
  id: r.id,
  userId: r.user_id,
  jobId: r.job_id,
  matchId: r.match_id,
  status: r.status,
  stage: r.stage,
  tailoredDocumentId: r.tailored_document_id,
  notes: r.notes,
  nextStep: r.next_step_label && r.next_step_at ? { label: r.next_step_label, at: r.next_step_at } : null,
  appliedAt: r.applied_at,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const fromApplicationPatch = (p: Partial<Application>): Row => {
  const out: Row = {};
  if (p.status !== undefined) out.status = p.status;
  if (p.stage !== undefined) out.stage = p.stage;
  if (p.notes !== undefined) out.notes = p.notes;
  if (p.tailoredDocumentId !== undefined) out.tailored_document_id = p.tailoredDocumentId;
  if (p.matchId !== undefined) out.match_id = p.matchId;
  if (p.appliedAt !== undefined) out.applied_at = p.appliedAt;
  if (p.nextStep !== undefined) {
    out.next_step_label = p.nextStep?.label ?? null;
    out.next_step_at = p.nextStep?.at ?? null;
  }
  return out;
};

const toAppWithJob = (r: Row): ApplicationWithJob => ({ ...toApplication(r), job: toJobWithCompany(r.job), score: r.match?.score ?? null });

const toEvent = (r: Row): ApplicationEvent => ({ id: r.id, applicationId: r.application_id, type: r.type, actor: r.actor, message: r.message, meta: r.meta, createdAt: r.created_at });

const toTailored = (r: Row): TailoredDocument => ({
  id: r.id,
  userId: r.user_id,
  jobId: r.job_id,
  applicationId: r.application_id,
  resumeId: r.resume_id,
  version: r.version,
  summary: r.summary,
  bullets: r.bullets,
  coverLetter: r.cover_letter,
  skillAlignment: r.skill_alignment,
  recommendations: r.recommendations,
  provider: r.provider,
  model: r.model,
  status: r.status,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toReview = (r: Row): HumanReview => ({
  id: r.id,
  applicationId: r.application_id,
  reviewerId: r.reviewer_id,
  status: r.status,
  priority: r.priority,
  checklist: r.checklist,
  notes: r.notes,
  slaDueAt: r.sla_due_at,
  createdAt: r.created_at,
  completedAt: r.completed_at,
});

const toPlan = (r: Row): Plan => ({
  id: r.id,
  name: r.name,
  tagline: r.tagline,
  priceMonthly: Number(r.price_monthly),
  priceYearly: Number(r.price_yearly),
  currency: r.currency,
  features: r.features,
  limits: r.limits,
  highlighted: r.highlighted,
  sortOrder: r.sort_order,
  active: r.active,
});

const toSubscription = (r: Row): Subscription => ({ id: r.id, userId: r.user_id, planId: r.plan_id, status: r.status, interval: r.interval, currentPeriodEnd: r.current_period_end, cancelAtPeriodEnd: r.cancel_at_period_end, createdAt: r.created_at });
const toPayment = (r: Row): Payment => ({ id: r.id, userId: r.user_id, subscriptionId: r.subscription_id, amount: Number(r.amount), currency: r.currency, status: r.status, provider: r.provider, providerRef: r.provider_ref, description: r.description, createdAt: r.created_at });
const toNotification = (r: Row): Notification => ({ id: r.id, userId: r.user_id, type: r.type, title: r.title, body: r.body, href: r.href, readAt: r.read_at, createdAt: r.created_at });
const toSettings = (r: Row): UserSettings => ({ userId: r.user_id, emailDigest: r.email_digest, notifyNewMatches: r.notify_new_matches, notifyReviewComplete: r.notify_review_complete, notifyApplicationUpdates: r.notify_application_updates, minMatchScore: r.min_match_score, timezone: r.timezone });
const toAudit = (r: Row): AuditLog => ({ id: r.id, actorId: r.actor_id, actorRole: r.actor_role, action: r.action, entityType: r.entity_type, entityId: r.entity_id, meta: r.meta, ip: r.ip, createdAt: r.created_at });
const toBgJob = (r: Row): BackgroundJob => ({ id: r.id, type: r.type, payload: r.payload, status: r.status, attempts: r.attempts, maxAttempts: r.max_attempts, lastError: r.last_error, idempotencyKey: r.idempotency_key, runAfter: r.run_after, startedAt: r.started_at, finishedAt: r.finished_at, createdAt: r.created_at });
const toRun = (r: Row): IngestionRun => ({ id: r.id, source: r.source, status: r.status, fetched: r.fetched, normalized: r.normalized, duplicates: r.duplicates, inserted: r.inserted, error: r.error, startedAt: r.started_at, finishedAt: r.finished_at });

const JOB_SELECT = "*, company:companies(*)";
const APP_SELECT = "*, job:jobs(*, company:companies(*)), match:matches(score)";

export class SupabaseRepository implements Repository {
  constructor(private db: SupabaseClient) {}

  /* users */
  async getUser(id: string) {
    const r = check(await this.db.from("users").select("*").eq("id", id).maybeSingle(), "getUser");
    return r ? toUser(r) : null;
  }
  async getUserByEmail(email: string) {
    const r = check(await this.db.from("users").select("*").ilike("email", email).maybeSingle(), "getUserByEmail");
    return r ? toUser(r) : null;
  }
  async listUsers(opts: { role?: string; search?: string; limit?: number } = {}) {
    let q = this.db.from("users").select("*").order("created_at", { ascending: false }).limit(opts.limit ?? 200);
    if (opts.role) q = q.eq("role", opts.role);
    if (opts.search) {
      const term = opts.search.replace(/[%,()]/g, "");
      q = q.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);
    }
    return check(await q, "listUsers").map(toUser);
  }
  async createUser(user: Parameters<Repository["createUser"]>[0]) {
    const r = check(
      await this.db.from("users").insert({ id: user.id, email: user.email, full_name: user.fullName, role: user.role, avatar_url: user.avatarUrl, onboarded_at: user.onboardedAt }).select().single(),
      "createUser",
    );
    return toUser(r);
  }
  async updateUser(id: string, patch: Parameters<Repository["updateUser"]>[1]) {
    const row: Row = {};
    if (patch.fullName !== undefined) row.full_name = patch.fullName;
    if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl;
    if (patch.onboardedAt !== undefined) row.onboarded_at = patch.onboardedAt;
    if (patch.role !== undefined) row.role = patch.role;
    return toUser(check(await this.db.from("users").update(row).eq("id", id).select().single(), "updateUser"));
  }

  /* profiles */
  async getProfile(userId: string) {
    const r = check(await this.db.from("candidate_profiles").select("*").eq("user_id", userId).maybeSingle(), "getProfile");
    return r ? toProfile(r) : null;
  }
  async upsertProfile(profile: CandidateProfile) {
    return toProfile(check(await this.db.from("candidate_profiles").upsert(fromProfile(profile)).select().single(), "upsertProfile"));
  }

  async listProfiles(limit = 1000) {
    return check(await this.db.from("candidate_profiles").select("*").limit(limit), "listProfiles").map(toProfile);
  }

  /* resumes */
  async listResumes(userId: string) {
    return check(
      await this.db.from("resumes").select("*").eq("user_id", userId).order("is_primary", { ascending: false }).order("created_at", { ascending: false }),
      "listResumes",
    ).map(toResume);
  }
  async getResume(userId: string, id: string) {
    const r = check(await this.db.from("resumes").select("*").eq("user_id", userId).eq("id", id).maybeSingle(), "getResume");
    return r ? toResume(r) : null;
  }
  async createResume(resume: Parameters<Repository["createResume"]>[0]) {
    if (resume.isPrimary) check(await this.db.from("resumes").update({ is_primary: false }).eq("user_id", resume.userId), "clearPrimary");
    const r = check(
      await this.db
        .from("resumes")
        .insert({ id: resume.id, user_id: resume.userId, name: resume.name, file_name: resume.fileName, storage_path: resume.storagePath, mime_type: resume.mimeType, size_bytes: resume.sizeBytes, is_primary: resume.isPrimary, parsed_text: resume.parsedText })
        .select()
        .single(),
      "createResume",
    );
    return toResume(r);
  }
  async deleteResume(userId: string, id: string) {
    check(await this.db.from("resumes").delete().eq("user_id", userId).eq("id", id), "deleteResume");
  }
  async setPrimaryResume(userId: string, id: string) {
    check(await this.db.from("resumes").update({ is_primary: false }).eq("user_id", userId), "clearPrimary");
    check(await this.db.from("resumes").update({ is_primary: true }).eq("user_id", userId).eq("id", id), "setPrimary");
  }

  /* companies & jobs */
  async listCompanies() {
    return check(await this.db.from("companies").select("*").order("name"), "listCompanies").map(toCompany);
  }
  async upsertCompany(company: Parameters<Repository["upsertCompany"]>[0]) {
    return toCompany(check(await this.db.from("companies").upsert(fromCompany(company), { onConflict: "domain" }).select().single(), "upsertCompany"));
  }
  async listJobs(opts: { status?: "active" | "closed"; limit?: number; search?: string } = {}) {
    let q = this.db.from("jobs").select(JOB_SELECT).order("posted_at", { ascending: false }).limit(opts.limit ?? 500);
    if (opts.status) q = q.eq("status", opts.status);
    if (opts.search) q = q.textSearch("search", opts.search, { type: "websearch" });
    return check(await q, "listJobs").map(toJobWithCompany);
  }
  async getJob(id: string) {
    const r = check(await this.db.from("jobs").select(JOB_SELECT).eq("id", id).maybeSingle(), "getJob");
    return r ? toJobWithCompany(r) : null;
  }
  async findJobsByFingerprint(fingerprints: string[]) {
    if (!fingerprints.length) return [];
    return check(await this.db.from("jobs").select("fingerprint").in("fingerprint", fingerprints), "findFingerprints").map((r: Row) => r.fingerprint as string);
  }
  async insertJobs(jobs: Parameters<Repository["insertJobs"]>[0]) {
    if (!jobs.length) return [];
    const rows = check(
      await this.db.from("jobs").upsert(jobs.map((j) => fromJob(j as Partial<Job>)), { onConflict: "fingerprint", ignoreDuplicates: true }).select(),
      "insertJobs",
    );
    return rows.map(toJob);
  }
  async updateJob(id: string, patch: { status?: "active" | "closed" }) {
    check(await this.db.from("jobs").update(patch).eq("id", id), "updateJob");
  }

  /* matches */
  async listMatches(userId: string, query: Parameters<Repository["listMatches"]>[1] = {}) {
    let q = this.db
      .from("matches")
      .select("*, job:jobs!inner(*, company:companies(*))")
      .eq("user_id", userId)
      .eq("job.status", "active")
      .order("score", { ascending: false })
      .limit(query.limit ?? 500);
    if (query.minScore) q = q.gte("score", query.minScore);
    if (query.status) q = q.in("status", query.status);
    return check(await q, "listMatches").map((r: Row): MatchWithJob => ({ ...toMatch(r), job: toJobWithCompany(r.job) }));
  }
  async getMatch(userId: string, jobId: string) {
    const r = check(await this.db.from("matches").select("*").eq("user_id", userId).eq("job_id", jobId).maybeSingle(), "getMatch");
    return r ? toMatch(r) : null;
  }
  async upsertMatches(matches: Parameters<Repository["upsertMatches"]>[0]) {
    if (!matches.length) return 0;
    const rows = matches.map((m) => ({
      ...(m.id ? { id: m.id } : {}),
      user_id: m.userId,
      job_id: m.jobId,
      score: m.score,
      breakdown: m.breakdown,
      model_version: m.breakdown.modelVersion,
      ...(m.createdAt ? { created_at: m.createdAt } : {}),
    }));
    for (let i = 0; i < rows.length; i += 500) {
      check(await this.db.from("matches").upsert(rows.slice(i, i + 500), { onConflict: "user_id,job_id" }), "upsertMatches");
    }
    return rows.length;
  }
  async setMatchStatus(userId: string, jobId: string, status: Match["status"]) {
    check(await this.db.from("matches").update({ status }).eq("user_id", userId).eq("job_id", jobId), "setMatchStatus");
  }

  /* applications */
  async listApplications(userId: string) {
    return check(await this.db.from("applications").select(APP_SELECT).eq("user_id", userId).order("updated_at", { ascending: false }), "listApplications").map(toAppWithJob);
  }
  async listAllApplications(opts: { status?: ApplicationStatus; limit?: number } = {}) {
    let q = this.db.from("applications").select(`${APP_SELECT}, user:users(full_name)`).order("updated_at", { ascending: false }).limit(opts.limit ?? 200);
    if (opts.status) q = q.eq("status", opts.status);
    return check(await q, "listAllApplications").map((r: Row) => ({ ...toAppWithJob(r), candidateName: r.user?.full_name ?? "Unknown" }));
  }
  async getApplication(id: string) {
    const r = check(await this.db.from("applications").select(APP_SELECT).eq("id", id).maybeSingle(), "getApplication");
    return r ? toAppWithJob(r) : null;
  }
  async getApplicationForJob(userId: string, jobId: string) {
    const r = check(await this.db.from("applications").select("*").eq("user_id", userId).eq("job_id", jobId).maybeSingle(), "getApplicationForJob");
    return r ? toApplication(r) : null;
  }
  async createApplication(app: Parameters<Repository["createApplication"]>[0]) {
    const r = check(
      await this.db
        .from("applications")
        .insert({ id: app.id, user_id: app.userId, job_id: app.jobId, ...fromApplicationPatch(app as Partial<Application>), ...(app.createdAt ? { created_at: app.createdAt } : {}) })
        .select()
        .single(),
      "createApplication",
    );
    return toApplication(r);
  }
  async updateApplication(id: string, patch: Parameters<Repository["updateApplication"]>[1]) {
    return toApplication(check(await this.db.from("applications").update(fromApplicationPatch(patch)).eq("id", id).select().single(), "updateApplication"));
  }
  async listEvents(applicationId: string) {
    return check(await this.db.from("application_events").select("*").eq("application_id", applicationId).order("created_at", { ascending: false }), "listEvents").map(toEvent);
  }
  async addEvent(event: Parameters<Repository["addEvent"]>[0]) {
    const r = check(
      await this.db
        .from("application_events")
        .insert({ id: event.id, application_id: event.applicationId, type: event.type, actor: event.actor, message: event.message, meta: event.meta, ...(event.createdAt ? { created_at: event.createdAt } : {}) })
        .select()
        .single(),
      "addEvent",
    );
    return toEvent(r);
  }
  async listRecentActivity(userId: string, limit: number) {
    const rows = check(
      await this.db
        .from("application_events")
        .select("*, application:applications!inner(user_id, job:jobs(title, company:companies(name)))")
        .eq("application.user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit),
      "listRecentActivity",
    );
    return rows.map((r: Row) => ({ ...toEvent(r), jobTitle: r.application.job.title, companyName: r.application.job.company.name }));
  }

  /* tailoring */
  async getTailoredDocument(id: string) {
    const r = check(await this.db.from("tailored_documents").select("*").eq("id", id).maybeSingle(), "getTailored");
    return r ? toTailored(r) : null;
  }
  async getLatestTailored(userId: string, jobId: string) {
    const r = check(
      await this.db.from("tailored_documents").select("*").eq("user_id", userId).eq("job_id", jobId).order("version", { ascending: false }).limit(1).maybeSingle(),
      "getLatestTailored",
    );
    return r ? toTailored(r) : null;
  }
  async createTailoredDocument(doc: Parameters<Repository["createTailoredDocument"]>[0]) {
    const r = check(
      await this.db
        .from("tailored_documents")
        .insert({
          id: doc.id,
          user_id: doc.userId,
          job_id: doc.jobId,
          application_id: doc.applicationId,
          resume_id: doc.resumeId,
          version: doc.version,
          summary: doc.summary,
          bullets: doc.bullets,
          cover_letter: doc.coverLetter,
          skill_alignment: doc.skillAlignment,
          recommendations: doc.recommendations,
          provider: doc.provider,
          model: doc.model,
          status: doc.status,
        })
        .select()
        .single(),
      "createTailored",
    );
    return toTailored(r);
  }
  async countTailoredSince(userId: string, since: string) {
    const { count, error } = await this.db.from("tailored_documents").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", since);
    if (error) throw new Error(`[db:countTailored] ${error.message}`);
    return count ?? 0;
  }
  async countReviewsSince(userId: string, since: string) {
    const { count, error } = await this.db
      .from("human_reviews")
      .select("id, application:applications!inner(user_id)", { count: "exact", head: true })
      .eq("application.user_id", userId)
      .gte("created_at", since);
    if (error) throw new Error(`[db:countReviews] ${error.message}`);
    return count ?? 0;
  }
  async updateTailoredDocument(id: string, patch: Parameters<Repository["updateTailoredDocument"]>[1]) {
    const row: Row = {};
    if (patch.bullets) row.bullets = patch.bullets;
    if (patch.coverLetter !== undefined) row.cover_letter = patch.coverLetter;
    if (patch.summary !== undefined) row.summary = patch.summary;
    if (patch.status) row.status = patch.status;
    return toTailored(check(await this.db.from("tailored_documents").update(row).eq("id", id).select().single(), "updateTailored"));
  }

  /* reviews */
  private toReviewContext = (r: Row): HumanReviewWithContext => ({
    ...toReview(r),
    application: toAppWithJob(r.application),
    candidate: { id: r.application.user.id, fullName: r.application.user.full_name, email: r.application.user.email },
    reviewerName: r.reviewer?.full_name ?? null,
  });
  private REVIEW_SELECT = `*, reviewer:users!human_reviews_reviewer_id_fkey(full_name), application:applications!inner(${APP_SELECT}, user:users!applications_user_id_fkey(id, full_name, email))`;

  async listReviews(opts: { status?: HumanReview["status"][]; limit?: number } = {}) {
    let q = this.db.from("human_reviews").select(this.REVIEW_SELECT).order("priority", { ascending: true }).order("sla_due_at", { ascending: true }).limit(opts.limit ?? 200);
    if (opts.status) q = q.in("status", opts.status);
    return check(await q, "listReviews").map(this.toReviewContext);
  }
  async getReview(id: string) {
    const r = check(await this.db.from("human_reviews").select(this.REVIEW_SELECT).eq("id", id).maybeSingle(), "getReview");
    return r ? this.toReviewContext(r) : null;
  }
  async getReviewForApplication(applicationId: string) {
    const r = check(
      await this.db.from("human_reviews").select("*").eq("application_id", applicationId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      "getReviewForApplication",
    );
    return r ? toReview(r) : null;
  }
  async createReview(review: Parameters<Repository["createReview"]>[0]) {
    const r = check(
      await this.db
        .from("human_reviews")
        .insert({ id: review.id, application_id: review.applicationId, reviewer_id: review.reviewerId, status: review.status, priority: review.priority, checklist: review.checklist, notes: review.notes, sla_due_at: review.slaDueAt, completed_at: review.completedAt })
        .select()
        .single(),
      "createReview",
    );
    return toReview(r);
  }
  async updateReview(id: string, patch: Parameters<Repository["updateReview"]>[1]) {
    const row: Row = {};
    if (patch.reviewerId !== undefined) row.reviewer_id = patch.reviewerId;
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.checklist !== undefined) row.checklist = patch.checklist;
    if (patch.notes !== undefined) row.notes = patch.notes;
    if (patch.completedAt !== undefined) row.completed_at = patch.completedAt;
    if (patch.priority !== undefined) row.priority = patch.priority;
    return toReview(check(await this.db.from("human_reviews").update(row).eq("id", id).select().single(), "updateReview"));
  }

  /* billing */
  async listPlans(opts: { includeInactive?: boolean } = {}) {
    let q = this.db.from("plans").select("*").order("sort_order");
    if (!opts.includeInactive) q = q.eq("active", true);
    return check(await q, "listPlans").map(toPlan);
  }
  async updatePlan(id: Plan["id"], patch: Partial<Omit<Plan, "id">>) {
    const row: Row = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.tagline !== undefined) row.tagline = patch.tagline;
    if (patch.priceMonthly !== undefined) row.price_monthly = patch.priceMonthly;
    if (patch.priceYearly !== undefined) row.price_yearly = patch.priceYearly;
    if (patch.features !== undefined) row.features = patch.features;
    if (patch.highlighted !== undefined) row.highlighted = patch.highlighted;
    if (patch.active !== undefined) row.active = patch.active;
    if (patch.limits !== undefined) row.limits = patch.limits;
    return toPlan(check(await this.db.from("plans").update(row).eq("id", id).select().single(), "updatePlan"));
  }
  async getSubscription(userId: string) {
    const r = check(await this.db.from("subscriptions").select("*").eq("user_id", userId).neq("status", "canceled").maybeSingle(), "getSubscription");
    return r ? toSubscription(r) : null;
  }
  async upsertSubscription(sub: Parameters<Repository["upsertSubscription"]>[0]) {
    const r = check(
      await this.db
        .from("subscriptions")
        .upsert(
          { user_id: sub.userId, plan_id: sub.planId, status: sub.status, interval: sub.interval, current_period_end: sub.currentPeriodEnd, cancel_at_period_end: sub.cancelAtPeriodEnd },
          { onConflict: "user_id" },
        )
        .select()
        .single(),
      "upsertSubscription",
    );
    return toSubscription(r);
  }
  async listPayments(userId: string) {
    return check(await this.db.from("payments").select("*").eq("user_id", userId).order("created_at", { ascending: false }), "listPayments").map(toPayment);
  }
  async createPayment(p: Parameters<Repository["createPayment"]>[0]) {
    const r = check(
      await this.db
        .from("payments")
        .insert({ user_id: p.userId, subscription_id: p.subscriptionId, amount: p.amount, currency: p.currency, status: p.status, provider: p.provider, provider_ref: p.providerRef, description: p.description })
        .select()
        .single(),
      "createPayment",
    );
    return toPayment(r);
  }

  /* notifications & settings */
  async listNotifications(userId: string, limit = 30) {
    return check(await this.db.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit), "listNotifications").map(toNotification);
  }
  async createNotification(n: Parameters<Repository["createNotification"]>[0]) {
    const r = check(
      await this.db.from("notifications").insert({ user_id: n.userId, type: n.type, title: n.title, body: n.body, href: n.href, read_at: n.readAt }).select().single(),
      "createNotification",
    );
    return toNotification(r);
  }
  async markNotificationsRead(userId: string, ids?: string[]) {
    let q = this.db.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
    if (ids) q = q.in("id", ids);
    check(await q, "markRead");
  }
  async getSettings(userId: string) {
    const r = check(await this.db.from("user_settings").select("*").eq("user_id", userId).maybeSingle(), "getSettings");
    return r ? toSettings(r) : defaultSettings(userId);
  }
  async upsertSettings(s: UserSettings) {
    const r = check(
      await this.db
        .from("user_settings")
        .upsert({
          user_id: s.userId,
          email_digest: s.emailDigest,
          notify_new_matches: s.notifyNewMatches,
          notify_review_complete: s.notifyReviewComplete,
          notify_application_updates: s.notifyApplicationUpdates,
          min_match_score: s.minMatchScore,
          timezone: s.timezone,
        })
        .select()
        .single(),
      "upsertSettings",
    );
    return toSettings(r);
  }

  /* audit */
  async addAudit(e: Parameters<Repository["addAudit"]>[0]) {
    check(
      await this.db.from("audit_logs").insert({ actor_id: e.actorId, actor_role: e.actorRole, action: e.action, entity_type: e.entityType, entity_id: e.entityId, meta: e.meta, ip: e.ip }),
      "addAudit",
    );
  }
  async listAudit(opts: { limit?: number; entityType?: string; actorId?: string } = {}) {
    let q = this.db.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(opts.limit ?? 100);
    if (opts.entityType) q = q.eq("entity_type", opts.entityType);
    if (opts.actorId) q = q.eq("actor_id", opts.actorId);
    return check(await q, "listAudit").map(toAudit);
  }

  /* background jobs */
  async enqueue(job: Parameters<Repository["enqueue"]>[0]) {
    const insert = await this.db
      .from("background_jobs")
      .insert({ type: job.type, payload: job.payload, idempotency_key: job.idempotencyKey ?? null, run_after: job.runAfter ?? new Date().toISOString(), max_attempts: job.maxAttempts ?? 3 })
      .select()
      .single();
    if (insert.error?.code === "23505" && job.idempotencyKey) {
      const existing = check(await this.db.from("background_jobs").select("*").eq("idempotency_key", job.idempotencyKey).single(), "enqueueExisting");
      return { job: toBgJob(existing), created: false };
    }
    return { job: toBgJob(check(insert, "enqueue")), created: true };
  }
  async claimJobs(limit: number) {
    return (check(await this.db.rpc("claim_background_jobs", { p_limit: limit }), "claimJobs") as Row[]).map(toBgJob);
  }
  async completeJob(id: string) {
    check(await this.db.from("background_jobs").update({ status: "succeeded", finished_at: new Date().toISOString(), last_error: null }).eq("id", id), "completeJob");
  }
  async failJob(id: string, error: string, retryAt: string | null) {
    const row: Row = { status: retryAt ? "failed" : "dead", last_error: error.slice(0, 500), finished_at: new Date().toISOString() };
    if (retryAt) row.run_after = retryAt;
    check(await this.db.from("background_jobs").update(row).eq("id", id), "failJob");
  }
  async retryJob(id: string) {
    check(await this.db.from("background_jobs").update({ status: "queued", attempts: 0, run_after: new Date().toISOString(), last_error: null }).eq("id", id), "retryJob");
  }
  async listBackgroundJobs(opts: { status?: BackgroundJob["status"][]; limit?: number } = {}) {
    let q = this.db.from("background_jobs").select("*").order("created_at", { ascending: false }).limit(opts.limit ?? 100);
    if (opts.status) q = q.in("status", opts.status);
    return check(await q, "listBackgroundJobs").map(toBgJob);
  }
  async createIngestionRun(run: Parameters<Repository["createIngestionRun"]>[0]) {
    return toRun(
      check(
        await this.db.from("ingestion_runs").insert({ source: run.source, status: run.status, fetched: run.fetched, normalized: run.normalized, duplicates: run.duplicates, inserted: run.inserted, error: run.error, started_at: run.startedAt, finished_at: run.finishedAt }).select().single(),
        "createRun",
      ),
    );
  }
  async updateIngestionRun(id: string, patch: Parameters<Repository["updateIngestionRun"]>[1]) {
    const row: Row = {};
    for (const [k, v] of Object.entries(patch)) row[k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)] = v;
    check(await this.db.from("ingestion_runs").update(row).eq("id", id), "updateRun");
  }
  async listIngestionRuns(limit = 20) {
    return check(await this.db.from("ingestion_runs").select("*").order("started_at", { ascending: false }).limit(limit), "listRuns").map(toRun);
  }

  /* idempotency & analytics */
  async getIdempotentResponse(key: string) {
    const r = check(await this.db.from("idempotency_keys").select("response").eq("key", key).maybeSingle(), "getIdem");
    return r?.response ?? null;
  }
  async saveIdempotentResponse(key: string, response: unknown) {
    check(await this.db.from("idempotency_keys").upsert({ key, response }), "saveIdem");
  }
  async adminStats(now: string): Promise<AdminStats> {
    const since = new Date(new Date(now).getTime() - 13 * 86_400_000).toISOString().slice(0, 10);
    const head = { count: "exact" as const, head: true };
    const [candidates, activeJobs, applications, reviewQueue, overdue, failed, apps, recentApps, recentMatches] = await Promise.all([
      this.db.from("users").select("id", head).eq("role", "candidate"),
      this.db.from("jobs").select("id", head).eq("status", "active"),
      this.db.from("applications").select("id", head),
      this.db.from("human_reviews").select("id", head).in("status", ["queued", "in_review"]),
      this.db.from("human_reviews").select("id", head).in("status", ["queued", "in_review"]).lt("sla_due_at", now),
      this.db.from("background_jobs").select("id", head).in("status", ["failed", "dead"]),
      this.db.from("applications").select("status"),
      this.db.from("applications").select("created_at").gte("created_at", since),
      this.db.from("matches").select("created_at").gte("created_at", since),
    ]);
    const byStatus = Object.fromEntries(APPLICATION_STATUSES.map((s) => [s, 0])) as Record<ApplicationStatus, number>;
    (apps.data ?? []).forEach((r: Row) => byStatus[r.status as ApplicationStatus]++);
    const days = Array.from({ length: 14 }, (_, i) => new Date(new Date(now).getTime() - (13 - i) * 86_400_000).toISOString().slice(0, 10));
    const perDay = (rows: Row[] | null) => days.map((d) => ({ date: d, count: (rows ?? []).filter((r) => String(r.created_at).slice(0, 10) === d).length }));
    return {
      candidates: candidates.count ?? 0,
      activeJobs: activeJobs.count ?? 0,
      applications: applications.count ?? 0,
      reviewQueue: reviewQueue.count ?? 0,
      reviewsOverdue: overdue.count ?? 0,
      failedJobs: failed.count ?? 0,
      applicationsByStatus: byStatus,
      applicationsPerDay: perDay(recentApps.data),
      matchesPerDay: perDay(recentMatches.data),
    };
  }
}
