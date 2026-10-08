export type Role = "candidate" | "reviewer" | "admin";

export type Seniority = "entry" | "mid" | "senior" | "lead" | "executive";
export type WorkMode = "remote" | "hybrid" | "onsite";
export type RemotePreference = WorkMode | "any";
export type AuthStatus = "citizen" | "permanent_resident" | "work_visa" | "student_visa" | "none";
export type SponsorshipPolicy = "yes" | "no" | "unknown";
export type SponsorshipHistory = "frequent" | "occasional" | "none" | "unknown";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  avatarUrl: string | null;
  onboardedAt: string | null;
  createdAt: string;
}

export interface Place {
  city: string;
  country: string; // ISO 3166-1 alpha-2
}

export interface WorkAuthorization {
  country: string;
  status: AuthStatus;
}

export interface Skill {
  name: string;
  level: 1 | 2 | 3 | 4 | 5;
  years: number;
}

export interface Experience {
  id: string;
  company: string;
  title: string;
  startDate: string; // YYYY-MM
  endDate: string | null;
  description: string;
  highlights: string[];
  skills: string[];
}

export interface Education {
  id: string;
  school: string;
  degree: string;
  field: string;
  year: number;
}

export interface SalaryExpectation {
  min: number;
  currency: string;
}

export interface CandidateProfile {
  userId: string;
  headline: string;
  summary: string;
  location: Place;
  citizenship: string[];
  workAuthorizations: WorkAuthorization[];
  requiresSponsorship: boolean;
  willingToRelocate: boolean;
  relocationCountries: string[];
  remotePreference: RemotePreference;
  preferredRoles: string[];
  preferredCountries: string[];
  seniority: Seniority;
  yearsExperience: number;
  skills: Skill[];
  experience: Experience[];
  education: Education[];
  salaryExpectation: SalaryExpectation | null;
  links: { linkedin?: string; github?: string; portfolio?: string };
  updatedAt: string;
}

export interface Company {
  id: string;
  name: string;
  domain: string;
  industry: string;
  size: string;
  headquarters: Place;
  description: string;
  sponsorshipHistory: SponsorshipHistory;
  website: string;
  brandColor: string;
}

export interface Salary {
  min: number;
  max: number;
  currency: string;
}

export interface Job {
  id: string;
  companyId: string;
  title: string;
  department: string;
  seniority: Seniority;
  employmentType: "full_time" | "contract" | "part_time";
  locations: Place[];
  workMode: WorkMode;
  remoteCountries: string[];
  salary: Salary | null;
  description: string;
  responsibilities: string[];
  requirements: string[];
  requiredSkills: string[];
  niceToHaveSkills: string[];
  minYears: number;
  visaSponsorship: SponsorshipPolicy;
  source: string;
  sourceUrl: string;
  externalId: string;
  fingerprint: string;
  status: "active" | "closed";
  postedAt: string;
  createdAt: string;
}

export interface JobWithCompany extends Job {
  company: Company;
}

/* ---------- Matching ---------- */

export type FactorKey = "skills" | "experience" | "eligibility" | "location" | "sponsorship" | "preferences";
export type FactorRating = "strong" | "moderate" | "weak" | "blocked";
export type Eligibility = "eligible" | "needs_sponsorship" | "ineligible";

export interface MatchFactor {
  key: FactorKey;
  label: string;
  rating: FactorRating;
  score: number; // 0..100
  weight: number; // 0..1
  reason: string;
}

export interface MatchBreakdown {
  factors: MatchFactor[];
  eligibility: Eligibility;
  matchedSkills: string[];
  missingSkills: string[];
  transferableSkills: string[];
  summary: string;
  modelVersion: string;
}

export type MatchStatus = "new" | "saved" | "dismissed" | "applied";

export interface Match {
  id: string;
  userId: string;
  jobId: string;
  score: number;
  breakdown: MatchBreakdown;
  status: MatchStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MatchWithJob extends Match {
  job: JobWithCompany;
}

/* ---------- Applications ---------- */

export const APPLICATION_STATUSES = [
  "saved",
  "preparing",
  "human_review",
  "applied",
  "screening",
  "interview",
  "offer",
  "rejected",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const PIPELINE_STAGES = ["discovered", "matched", "tailored", "reviewed", "applied"] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export interface Application {
  id: string;
  userId: string;
  jobId: string;
  matchId: string | null;
  status: ApplicationStatus;
  stage: PipelineStage;
  tailoredDocumentId: string | null;
  notes: string;
  nextStep: { label: string; at: string } | null;
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationWithJob extends Application {
  job: JobWithCompany;
  score: number | null;
}

export type EventActor = "candidate" | "ai" | "reviewer" | "system";

export interface ApplicationEvent {
  id: string;
  applicationId: string;
  type: "created" | "status_change" | "note" | "ai" | "review" | "system";
  actor: EventActor;
  message: string;
  meta: Record<string, unknown>;
  createdAt: string;
}

/* ---------- Tailoring & review ---------- */

export interface BulletSuggestion {
  id: string;
  original: string;
  suggested: string;
  reason: string;
  decision: "pending" | "accepted" | "rejected";
}

export interface SkillAlignment {
  skill: string;
  status: "matched" | "transferable" | "missing";
  evidence: string;
}

export interface TailoredDocument {
  id: string;
  userId: string;
  jobId: string;
  applicationId: string | null;
  resumeId: string | null;
  version: number;
  summary: string;
  bullets: BulletSuggestion[];
  coverLetter: string;
  skillAlignment: SkillAlignment[];
  recommendations: string[];
  provider: string;
  model: string;
  status: "draft" | "approved";
  createdAt: string;
  updatedAt: string;
}

export type ReviewStatus = "queued" | "in_review" | "approved" | "changes_requested";

export interface ReviewChecklistItem {
  key: string;
  label: string;
  done: boolean;
}

export interface HumanReview {
  id: string;
  applicationId: string;
  reviewerId: string | null;
  status: ReviewStatus;
  priority: "normal" | "high";
  checklist: ReviewChecklistItem[];
  notes: string;
  slaDueAt: string;
  createdAt: string;
  completedAt: string | null;
}

export interface HumanReviewWithContext extends HumanReview {
  application: ApplicationWithJob;
  candidate: Pick<User, "id" | "fullName" | "email">;
  reviewerName: string | null;
}

/* ---------- Documents ---------- */

export interface Resume {
  id: string;
  userId: string;
  name: string;
  fileName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  isPrimary: boolean;
  parsedText: string | null;
  createdAt: string;
}

/* ---------- Billing ---------- */

export type PlanId = "entry" | "professional" | "executive";

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  features: string[];
  limits: { matchesPerWeek: number | null; tailoredPerMonth: number | null; humanReviewsPerMonth: number | null };
  highlighted: boolean;
  sortOrder: number;
  active: boolean;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: PlanId;
  status: "active" | "trialing" | "past_due" | "canceled";
  interval: "month" | "year";
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
}

export interface Payment {
  id: string;
  userId: string;
  subscriptionId: string | null;
  amount: number;
  currency: string;
  status: "succeeded" | "failed" | "refunded" | "pending";
  provider: string;
  providerRef: string;
  description: string;
  createdAt: string;
}

/* ---------- Notifications, settings, audit ---------- */

export interface Notification {
  id: string;
  userId: string;
  type: "match" | "review" | "application" | "system" | "billing";
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface UserSettings {
  userId: string;
  emailDigest: "daily" | "weekly" | "off";
  notifyNewMatches: boolean;
  notifyReviewComplete: boolean;
  notifyApplicationUpdates: boolean;
  minMatchScore: number;
  timezone: string;
}

export interface AuditLog {
  id: string;
  actorId: string | null;
  actorRole: Role | "system";
  action: string;
  entityType: string;
  entityId: string | null;
  meta: Record<string, unknown>;
  ip: string | null;
  createdAt: string;
}

/* ---------- Pipeline ---------- */

export type BackgroundJobType = "ingest_source" | "match_candidate" | "match_job" | "tailor_application" | "send_notification";
export type BackgroundJobStatus = "queued" | "running" | "succeeded" | "failed" | "dead";

export interface BackgroundJob {
  id: string;
  type: BackgroundJobType;
  payload: Record<string, unknown>;
  status: BackgroundJobStatus;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  idempotencyKey: string | null;
  runAfter: string;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface IngestionRun {
  id: string;
  source: string;
  status: "running" | "succeeded" | "failed";
  fetched: number;
  normalized: number;
  duplicates: number;
  inserted: number;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
}
