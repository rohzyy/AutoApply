import type {
  Application,
  ApplicationEvent,
  ApplicationStatus,
  ApplicationWithJob,
  AuditLog,
  BackgroundJob,
  BackgroundJobStatus,
  CandidateProfile,
  Company,
  HumanReview,
  HumanReviewWithContext,
  IngestionRun,
  Job,
  JobWithCompany,
  Match,
  MatchStatus,
  MatchWithJob,
  Notification,
  Payment,
  Plan,
  PlanId,
  Resume,
  ReviewStatus,
  Role,
  Subscription,
  TailoredDocument,
  User,
  UserSettings,
} from "@/lib/domain/types";

export interface MatchQuery {
  minScore?: number;
  status?: MatchStatus[];
  limit?: number;
}

export interface AdminStats {
  candidates: number;
  activeJobs: number;
  applications: number;
  reviewQueue: number;
  reviewsOverdue: number;
  failedJobs: number;
  applicationsByStatus: Record<ApplicationStatus, number>;
  applicationsPerDay: { date: string; count: number }[];
  matchesPerDay: { date: string; count: number }[];
}

export type NewRow<T> = Omit<T, "id" | "createdAt"> & { id?: string; createdAt?: string };

/**
 * Persistence boundary for the whole product. Services depend on this interface only,
 * so storage can move between Supabase/Postgres and the in-memory demo store freely.
 */
export interface Repository {
  /* users */
  getUser(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  listUsers(opts?: { role?: Role; search?: string; limit?: number }): Promise<User[]>;
  createUser(user: NewRow<User>): Promise<User>;
  updateUser(id: string, patch: Partial<Pick<User, "fullName" | "avatarUrl" | "onboardedAt" | "role">>): Promise<User>;

  /* profiles */
  getProfile(userId: string): Promise<CandidateProfile | null>;
  upsertProfile(profile: CandidateProfile): Promise<CandidateProfile>;
  listProfiles(limit?: number): Promise<CandidateProfile[]>;

  /* resumes */
  listResumes(userId: string): Promise<Resume[]>;
  getResume(userId: string, id: string): Promise<Resume | null>;
  createResume(resume: NewRow<Resume>): Promise<Resume>;
  deleteResume(userId: string, id: string): Promise<void>;
  setPrimaryResume(userId: string, id: string): Promise<void>;

  /* companies & jobs */
  listCompanies(): Promise<Company[]>;
  upsertCompany(company: NewRow<Company>): Promise<Company>;
  listJobs(opts?: { status?: Job["status"]; limit?: number; search?: string }): Promise<JobWithCompany[]>;
  getJob(id: string): Promise<JobWithCompany | null>;
  findJobsByFingerprint(fingerprints: string[]): Promise<string[]>;
  insertJobs(jobs: NewRow<Job>[]): Promise<Job[]>;
  updateJob(id: string, patch: Partial<Pick<Job, "status">>): Promise<void>;

  /* matches */
  listMatches(userId: string, query?: MatchQuery): Promise<MatchWithJob[]>;
  getMatch(userId: string, jobId: string): Promise<Match | null>;
  upsertMatches(matches: NewRow<Omit<Match, "updatedAt">>[]): Promise<number>;
  setMatchStatus(userId: string, jobId: string, status: MatchStatus): Promise<void>;

  /* applications */
  listApplications(userId: string): Promise<ApplicationWithJob[]>;
  listAllApplications(opts?: { status?: ApplicationStatus; limit?: number }): Promise<(ApplicationWithJob & { candidateName: string })[]>;
  getApplication(id: string): Promise<ApplicationWithJob | null>;
  getApplicationForJob(userId: string, jobId: string): Promise<Application | null>;
  createApplication(app: NewRow<Omit<Application, "updatedAt">>): Promise<Application>;
  updateApplication(id: string, patch: Partial<Omit<Application, "id" | "userId" | "jobId" | "createdAt">>): Promise<Application>;
  listEvents(applicationId: string): Promise<ApplicationEvent[]>;
  addEvent(event: NewRow<ApplicationEvent>): Promise<ApplicationEvent>;
  listRecentActivity(userId: string, limit: number): Promise<(ApplicationEvent & { jobTitle: string; companyName: string })[]>;

  /* tailoring */
  getTailoredDocument(id: string): Promise<TailoredDocument | null>;
  getLatestTailored(userId: string, jobId: string): Promise<TailoredDocument | null>;
  createTailoredDocument(doc: NewRow<Omit<TailoredDocument, "updatedAt">>): Promise<TailoredDocument>;
  countTailoredSince(userId: string, since: string): Promise<number>;
  countReviewsSince(userId: string, since: string): Promise<number>;
  updateTailoredDocument(id: string, patch: Partial<Pick<TailoredDocument, "bullets" | "coverLetter" | "summary" | "status">>): Promise<TailoredDocument>;

  /* human review */
  listReviews(opts?: { status?: ReviewStatus[]; limit?: number }): Promise<HumanReviewWithContext[]>;
  getReview(id: string): Promise<HumanReviewWithContext | null>;
  getReviewForApplication(applicationId: string): Promise<HumanReview | null>;
  createReview(review: NewRow<HumanReview>): Promise<HumanReview>;
  updateReview(id: string, patch: Partial<Omit<HumanReview, "id" | "applicationId" | "createdAt">>): Promise<HumanReview>;

  /* billing */
  listPlans(opts?: { includeInactive?: boolean }): Promise<Plan[]>;
  updatePlan(id: PlanId, patch: Partial<Omit<Plan, "id">>): Promise<Plan>;
  getSubscription(userId: string): Promise<Subscription | null>;
  upsertSubscription(sub: NewRow<Subscription>): Promise<Subscription>;
  listPayments(userId: string): Promise<Payment[]>;
  createPayment(payment: NewRow<Payment>): Promise<Payment>;

  /* notifications & settings */
  listNotifications(userId: string, limit?: number): Promise<Notification[]>;
  createNotification(n: NewRow<Notification>): Promise<Notification>;
  markNotificationsRead(userId: string, ids?: string[]): Promise<void>;
  getSettings(userId: string): Promise<UserSettings>;
  upsertSettings(settings: UserSettings): Promise<UserSettings>;

  /* audit */
  addAudit(entry: NewRow<AuditLog>): Promise<void>;
  listAudit(opts?: { limit?: number; entityType?: string; actorId?: string }): Promise<AuditLog[]>;

  /* background jobs */
  enqueue(job: Pick<BackgroundJob, "type" | "payload"> & Partial<Pick<BackgroundJob, "idempotencyKey" | "runAfter" | "maxAttempts">>): Promise<{ job: BackgroundJob; created: boolean }>;
  claimJobs(limit: number, now: string): Promise<BackgroundJob[]>;
  completeJob(id: string): Promise<void>;
  failJob(id: string, error: string, retryAt: string | null): Promise<void>;
  retryJob(id: string): Promise<void>;
  listBackgroundJobs(opts?: { status?: BackgroundJobStatus[]; limit?: number }): Promise<BackgroundJob[]>;
  createIngestionRun(run: NewRow<IngestionRun>): Promise<IngestionRun>;
  updateIngestionRun(id: string, patch: Partial<Omit<IngestionRun, "id" | "source" | "startedAt">>): Promise<void>;
  listIngestionRuns(limit?: number): Promise<IngestionRun[]>;

  /* idempotency & analytics */
  getIdempotentResponse(key: string): Promise<unknown | null>;
  saveIdempotentResponse(key: string, response: unknown): Promise<void>;
  adminStats(now: string): Promise<AdminStats>;
}
