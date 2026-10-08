import "server-only";
import { systemRepo } from "@/lib/data";
import type { NewRow } from "@/lib/data/repository";
import type { Job } from "@/lib/domain/types";
import { logger } from "@/lib/infra/logger";
import { withRetry } from "@/lib/infra/retry";
import { normalizePosting } from "./normalize";
import { enqueue } from "./queue";
import { getSource } from "./sources";

/**
 * ingest → normalize → dedupe → persist → fan out matching.
 * Each stage is tolerant of bad input: one malformed posting never fails a run.
 */
export async function runIngestion(sourceId: string) {
  const source = getSource(sourceId);
  if (!source) throw new Error(`Unknown source: ${sourceId}`);
  const repo = systemRepo();
  const startedAt = new Date().toISOString();
  const run = await repo.createIngestionRun({ source: sourceId, status: "running", fetched: 0, normalized: 0, duplicates: 0, inserted: 0, error: null, startedAt, finishedAt: null });
  const log = logger.child({ runId: run.id, source: sourceId });

  try {
    const { postings } = await withRetry(() => source.fetchPostings({ since: new Date(Date.now() - 86_400_000).toISOString() }), { attempts: 3, baseMs: 400 });

    const companies = new Map((await repo.listCompanies()).map((c) => [c.domain, c]));
    const normalized: NewRow<Job>[] = [];
    for (const raw of postings) {
      let company = companies.get(raw.company?.domain);
      if (!company && raw.company?.domain && raw.company.name.length > 1) {
        company = await repo.upsertCompany({
          name: raw.company.name,
          domain: raw.company.domain,
          industry: "",
          size: "",
          headquarters: { city: "", country: "" },
          description: "",
          sponsorshipHistory: "unknown",
          website: `https://${raw.company.domain}`,
          brandColor: "#9BA1AB",
        });
        companies.set(company.domain, company);
      }
      if (!company) continue;
      const job = normalizePosting(raw, company.id, startedAt);
      if (job) normalized.push(job);
    }

    // Dedupe within the batch, then against what's already stored.
    const unique = [...new Map(normalized.map((j) => [j.fingerprint, j])).values()];
    const existing = new Set(await repo.findJobsByFingerprint(unique.map((j) => j.fingerprint)));
    const fresh = unique.filter((j) => !existing.has(j.fingerprint));
    const inserted = await repo.insertJobs(fresh);

    for (const job of inserted) {
      await enqueue({ type: "match_job", payload: { jobId: job.id }, idempotencyKey: `match_job:${job.id}` });
    }

    const stats = {
      fetched: postings.length,
      normalized: normalized.length,
      duplicates: normalized.length - inserted.length,
      inserted: inserted.length,
    };
    await repo.updateIngestionRun(run.id, { status: "succeeded", ...stats, finishedAt: new Date().toISOString() });
    log.info("ingest.succeeded", stats);
    return { runId: run.id, ...stats };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await repo.updateIngestionRun(run.id, { status: "failed", error: message, finishedAt: new Date().toISOString() });
    log.error("ingest.failed", { error: message });
    throw err;
  }
}
