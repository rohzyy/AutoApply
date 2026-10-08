# AutoApply

AI-powered, human-assisted job search for international candidates: **Profile → Match → Tailor → Apply → Track**.

## Quick start (demo mode, no setup)

```bash
npm install
npm run dev
```

Open http://localhost:3000 → **Sign in** → choose **Candidate** or **Operations** under "Explore with demo data".
Without Supabase env vars the app runs on a seeded in-memory store (resets on restart).

## Production mode (Supabase)

1. Create a Supabase project and enable Email + Google auth providers.
2. Apply migrations in `supabase/migrations/` (`supabase db push` or the SQL editor, in order).
3. `cp .env.example .env.local` and fill in Supabase URL, anon key, service-role key, `SESSION_SECRET`, `CRON_SECRET`, optional `ANTHROPIC_API_KEY`.
4. `npm run seed` to load the demo dataset (accounts use `SEED_DEMO_PASSWORD`).
5. Deploy; `vercel.json` schedules `/api/cron/worker` every 5 minutes.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js 16 (Cache Components, partial prerendering) |
| `npm test` | Unit tests + database/RLS tests (PGlite runs the real migrations) |
| `npm run typecheck` / `lint` | Static checks |
| `npm run seed` | Seed a Supabase project |

## Architecture

- `src/app` — routes: marketing (`/`, `/pricing`), auth, onboarding, candidate app (`/dashboard`, `/jobs`, `/jobs/[id]`, `/jobs/[id]/tailor`, `/applications`, `/profile`, `/settings`), operations console (`/admin/*`), API (`/api/v1/*`, `/api/cron/worker`, `/api/health`).
- `src/lib/data` — `Repository` interface with Supabase (RLS-scoped session client + service-role system client) and in-memory implementations.
- `src/lib/services` — domain services: matching engine (explainable 6-factor scoring), tailoring, applications, human review, billing (mock payment adapter), admin.
- `src/lib/pipeline` — ingest → normalize → dedupe (fingerprints) → match fan-out; durable job queue with idempotency keys, retries, backoff and dead-lettering (`claim_background_jobs` uses `FOR UPDATE SKIP LOCKED`).
- `src/lib/ai` — provider abstraction: Anthropic (Claude, structured outputs) with automatic fallback to a deterministic rules provider.
- `src/lib/infra` — structured logging with secret redaction, typed errors, Postgres-backed rate limiting, retries.
- `supabase/` — schema, RLS + column privileges, storage policies, pricing seed, and tests.

Security: every query on behalf of a user runs under RLS; users cannot change their own role (column grants); uploads are type-sniffed by magic bytes and stored under `<uid>/` in a private bucket; nothing is submitted without candidate approval and a human review.
