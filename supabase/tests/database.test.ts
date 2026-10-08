import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * Applies every migration to an in-process Postgres and checks the security model:
 * row isolation between candidates, column-level privileges, staff access and the queue functions.
 */
const root = join(__dirname, "..");
const db = new PGlite({ extensions: { pgcrypto } });

const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";
const STAFF = "00000000-0000-4000-8000-00000000000c";

async function asUser(uid: string, fn: () => Promise<void>) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`);
  try {
    await fn();
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
}

beforeAll(async () => {
  await db.exec(readFileSync(join(root, "tests", "supabase-stubs.sql"), "utf8"));
  const migrations = readdirSync(join(root, "migrations")).filter((f) => f.endsWith(".sql")).sort();
  for (const file of migrations) await db.exec(readFileSync(join(root, "migrations", file), "utf8"));

  // Signing up through Supabase Auth inserts into auth.users; the trigger provisions app rows.
  await db.exec(`
    insert into auth.users (id, email, raw_user_meta_data) values
      ('${A}', 'a@example.com', '{"full_name":"Candidate A"}'),
      ('${B}', 'b@example.com', '{"full_name":"Candidate B"}'),
      ('${STAFF}', 'staff@example.com', '{"full_name":"Reviewer"}');
    update public.users set role = 'reviewer' where id = '${STAFF}';
    insert into public.companies (id, name, domain) values ('10000000-0000-4000-8000-000000000001', 'Acme', 'acme.example');
    insert into public.jobs (id, company_id, title, seniority, work_mode, source, source_url, external_id, fingerprint, posted_at)
      values ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Engineer', 'senior', 'remote', 'test', 'https://acme.example/1', '1', 'fp-1', now());
    insert into public.applications (id, user_id, job_id, status) values
      ('30000000-0000-4000-8000-00000000000a', '${A}', '20000000-0000-4000-8000-000000000001', 'preparing'),
      ('30000000-0000-4000-8000-00000000000b', '${B}', '20000000-0000-4000-8000-000000000001', 'saved');
  `);
}, 60_000);

describe("schema & auth trigger", () => {
  it("provisions users and settings from auth.users", async () => {
    const users = await db.query<{ full_name: string }>(`select full_name from public.users order by email`);
    expect(users.rows.map((r) => r.full_name)).toEqual(["Candidate A", "Candidate B", "Reviewer"]);
    const settings = await db.query(`select 1 from public.user_settings`);
    expect(settings.rows).toHaveLength(3);
  });

  it("seeds configurable pricing", async () => {
    const plans = await db.query<{ id: string }>(`select id from public.plans order by sort_order`);
    expect(plans.rows.map((r) => r.id)).toEqual(["entry", "professional", "executive"]);
  });
});

describe("row level security", () => {
  it("isolates applications between candidates", async () => {
    await asUser(A, async () => {
      const rows = await db.query<{ user_id: string }>(`select user_id from public.applications`);
      expect(rows.rows).toEqual([{ user_id: A }]);
    });
  });

  it("prevents a candidate from writing another candidate's rows", async () => {
    await asUser(A, async () => {
      await db.query(`update public.applications set notes = 'x' where user_id = '${B}'`);
    });
    const b = await db.query<{ notes: string }>(`select notes from public.applications where user_id = '${B}'`);
    expect(b.rows[0]!.notes).toBe("");
  });

  it("blocks self-promotion to admin via column privileges", async () => {
    await asUser(A, async () => {
      await expect(db.query(`update public.users set role = 'admin' where id = '${A}'`)).rejects.toThrow(/permission denied/i);
      await db.query(`update public.users set full_name = 'Renamed' where id = '${A}'`);
    });
    const a = await db.query<{ role: string; full_name: string }>(`select role, full_name from public.users where id = '${A}'`);
    expect(a.rows[0]).toEqual({ role: "candidate", full_name: "Renamed" });
  });

  it("only allows candidate-authored events on own applications", async () => {
    await asUser(A, async () => {
      await db.query(`insert into public.application_events (application_id, type, actor, message) values ('30000000-0000-4000-8000-00000000000a', 'note', 'candidate', 'hi')`);
      await expect(
        db.query(`insert into public.application_events (application_id, type, actor, message) values ('30000000-0000-4000-8000-00000000000a', 'ai', 'ai', 'spoof')`),
      ).rejects.toThrow(/row-level security/i);
      await expect(
        db.query(`insert into public.application_events (application_id, type, actor, message) values ('30000000-0000-4000-8000-00000000000b', 'note', 'candidate', 'x')`),
      ).rejects.toThrow(/row-level security/i);
    });
  });

  it("lets staff read operational data but not candidates", async () => {
    await db.exec(`insert into public.audit_logs (actor_role, action, entity_type) values ('system', 'test', 'test')`);
    await asUser(A, async () => {
      expect((await db.query(`select 1 from public.audit_logs`)).rows).toHaveLength(0);
    });
    await asUser(STAFF, async () => {
      expect((await db.query(`select 1 from public.audit_logs`)).rows).toHaveLength(1);
      expect((await db.query(`select 1 from public.applications`)).rows).toHaveLength(2);
    });
  });

  it("hides closed jobs from anonymous visitors", async () => {
    await db.exec(`update public.jobs set status = 'closed'`);
    await db.exec(`set role anon`);
    const rows = await db.query(`select 1 from public.jobs`);
    await db.exec(`reset role`);
    await db.exec(`update public.jobs set status = 'active'`);
    expect(rows.rows).toHaveLength(0);
  });

  it("scopes storage objects to the owner's folder", async () => {
    await asUser(A, async () => {
      await db.query(`insert into storage.objects (bucket_id, name) values ('documents', '${A}/resume.pdf')`);
      await expect(db.query(`insert into storage.objects (bucket_id, name) values ('documents', '${B}/evil.pdf')`)).rejects.toThrow(/row-level security/i);
    });
  });
});

describe("pipeline functions", () => {
  it("claims due jobs exactly once and is not callable by end users", async () => {
    await db.exec(`insert into public.background_jobs (type, idempotency_key) values ('match_job', 'k1'), ('match_job', 'k2')`);
    await expect(db.exec(`insert into public.background_jobs (type, idempotency_key) values ('match_job', 'k1')`)).rejects.toThrow(/duplicate key/i);
    const first = await db.query(`select * from public.claim_background_jobs(5)`);
    const second = await db.query(`select * from public.claim_background_jobs(5)`);
    expect(first.rows).toHaveLength(2);
    expect(second.rows).toHaveLength(0);
    await asUser(A, async () => {
      await expect(db.query(`select * from public.claim_background_jobs(5)`)).rejects.toThrow(/permission denied/i);
    });
  });

  it("enforces fixed-window rate limits", async () => {
    const hits: boolean[] = [];
    for (let i = 0; i < 4; i++) {
      const r = await db.query<{ ok: boolean }>(`select public.rate_limit_hit('t', 3, 60) as ok`);
      hits.push(r.rows[0]!.ok);
    }
    expect(hits).toEqual([true, true, true, false]);
  });
});
