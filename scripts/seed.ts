/**
 * Seeds a Supabase project with the same realistic dataset the demo mode uses.
 *
 *   npm run seed
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SEED_DEMO_PASSWORD
 * (used for every seeded account). Safe to re-run: accounts are reused and rows upserted.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { SupabaseRepository } from "../src/lib/data/supabase";
import { buildDataset } from "../src/lib/seed/dataset";

config({ path: ".env.local" });
config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.SEED_DEMO_PASSWORD;

if (!url || !serviceKey) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see .env.example).");
if (!password || password.length < 10) throw new Error("Set SEED_DEMO_PASSWORD (10+ characters) for the seeded demo accounts.");

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const repo = new SupabaseRepository(admin);

async function existingAuthUsers() {
  const byEmail = new Map<string, string>();
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    data.users.forEach((u) => u.email && byEmail.set(u.email.toLowerCase(), u.id));
    if (data.users.length < 1000) return byEmail;
  }
}

async function main() {
  const seed = buildDataset();
  const known = await existingAuthUsers();

  // 1. Auth users (the on_auth_user_created trigger provisions public.users + settings).
  const idMap = new Map<string, string>();
  for (const u of seed.users) {
    let id = known.get(u.email.toLowerCase());
    if (!id) {
      const { data, error } = await admin.auth.admin.createUser({ email: u.email, password, email_confirm: true, user_metadata: { full_name: u.fullName } });
      if (error || !data.user) throw error ?? new Error(`createUser failed for ${u.email}`);
      id = data.user.id;
    }
    idMap.set(u.id, id);
  }

  // Rewrite every seeded user id to the real auth id, everywhere in the dataset.
  let json = JSON.stringify(seed);
  for (const [from, to] of idMap) json = json.split(from).join(to);
  const d: typeof seed = JSON.parse(json);

  for (const u of d.users) {
    await admin.from("users").update({ full_name: u.fullName, role: u.role, onboarded_at: u.onboardedAt, created_at: u.createdAt }).eq("id", u.id);
  }
  console.log(`✓ ${d.users.length} users`);

  for (const c of d.companies) await repo.upsertCompany(c);
  await repo.insertJobs(d.jobs);
  console.log(`✓ ${d.companies.length} companies, ${d.jobs.length} jobs`);

  for (const p of d.profiles) await repo.upsertProfile(p);
  for (const r of d.resumes) {
    const { error } = await admin.from("resumes").upsert({ id: r.id, user_id: r.userId, name: r.name, file_name: r.fileName, storage_path: r.storagePath, mime_type: r.mimeType, size_bytes: r.sizeBytes, is_primary: r.isPrimary, created_at: r.createdAt });
    if (error) throw error;
  }
  await repo.upsertMatches(d.matches);
  console.log(`✓ ${d.profiles.length} profiles, ${d.matches.length} matches`);

  // Applications and tailored documents reference each other: insert apps first, link after.
  for (const a of d.applications) {
    const { error } = await admin.from("applications").upsert({
      id: a.id, user_id: a.userId, job_id: a.jobId, match_id: a.matchId, status: a.status, stage: a.stage, notes: a.notes,
      next_step_label: a.nextStep?.label ?? null, next_step_at: a.nextStep?.at ?? null, applied_at: a.appliedAt, created_at: a.createdAt, updated_at: a.updatedAt,
    });
    if (error) throw error;
  }
  for (const t of d.tailored) {
    const { error } = await admin.from("tailored_documents").upsert({
      id: t.id, user_id: t.userId, job_id: t.jobId, application_id: t.applicationId, resume_id: t.resumeId, version: t.version, summary: t.summary, bullets: t.bullets,
      cover_letter: t.coverLetter, skill_alignment: t.skillAlignment, recommendations: t.recommendations, provider: t.provider, model: t.model, status: t.status, created_at: t.createdAt,
    });
    if (error) throw error;
  }
  for (const a of d.applications.filter((x) => x.tailoredDocumentId)) {
    await admin.from("applications").update({ tailored_document_id: a.tailoredDocumentId }).eq("id", a.id);
  }
  for (const e of d.events) {
    const { error } = await admin.from("application_events").upsert({ id: e.id, application_id: e.applicationId, type: e.type, actor: e.actor, message: e.message, meta: e.meta, created_at: e.createdAt });
    if (error) throw error;
  }
  for (const r of d.reviews) {
    const { error } = await admin.from("human_reviews").upsert({
      id: r.id, application_id: r.applicationId, reviewer_id: r.reviewerId, status: r.status, priority: r.priority, checklist: r.checklist, notes: r.notes,
      sla_due_at: r.slaDueAt, created_at: r.createdAt, completed_at: r.completedAt,
    });
    if (error) throw error;
  }
  console.log(`✓ ${d.applications.length} applications, ${d.events.length} events, ${d.reviews.length} reviews`);

  for (const p of d.plans) await repo.updatePlan(p.id, p);
  for (const s of d.subscriptions) await repo.upsertSubscription(s);
  for (const p of d.payments) {
    await admin.from("payments").upsert({ id: p.id, user_id: p.userId, subscription_id: null, amount: p.amount, currency: p.currency, status: p.status, provider: p.provider, provider_ref: p.providerRef, description: p.description, created_at: p.createdAt }, { onConflict: "provider_ref" });
  }
  for (const n of d.notifications) {
    await admin.from("notifications").upsert({ id: n.id, user_id: n.userId, type: n.type, title: n.title, body: n.body, href: n.href, read_at: n.readAt, created_at: n.createdAt });
  }
  for (const a of d.audit) {
    await admin.from("audit_logs").upsert({ id: a.id, actor_id: a.actorId, actor_role: a.actorRole, action: a.action, entity_type: a.entityType, entity_id: a.entityId, meta: a.meta, ip: a.ip, created_at: a.createdAt });
  }
  for (const r of d.ingestionRuns) {
    await admin.from("ingestion_runs").upsert({ id: r.id, source: r.source, status: r.status, fetched: r.fetched, normalized: r.normalized, duplicates: r.duplicates, inserted: r.inserted, error: r.error, started_at: r.startedAt, finished_at: r.finishedAt });
  }
  for (const j of d.backgroundJobs) {
    await admin.from("background_jobs").upsert({ id: j.id, type: j.type, payload: j.payload, status: j.status, attempts: j.attempts, max_attempts: j.maxAttempts, last_error: j.lastError, idempotency_key: j.idempotencyKey, run_after: j.runAfter, started_at: j.startedAt, finished_at: j.finishedAt, created_at: j.createdAt }, { onConflict: "idempotency_key" });
  }
  console.log("✓ billing, notifications, audit log and pipeline history");
  console.log("\nSeed complete. Sign in as demo@autoapply.dev (candidate) or ops@autoapply.dev (admin) with SEED_DEMO_PASSWORD.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
