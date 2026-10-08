-- AutoApply core schema
-- Conventions: snake_case, uuid primary keys, timestamptz everywhere, jsonb only for
-- document-shaped data (profile sections, match explanations, tailoring output).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('candidate', 'reviewer', 'admin');
create type public.seniority as enum ('entry', 'mid', 'senior', 'lead', 'executive');
create type public.work_mode as enum ('remote', 'hybrid', 'onsite');
create type public.sponsorship_policy as enum ('yes', 'no', 'unknown');
create type public.sponsorship_history as enum ('frequent', 'occasional', 'none', 'unknown');
create type public.match_status as enum ('new', 'saved', 'dismissed', 'applied');
create type public.application_status as enum ('saved', 'preparing', 'human_review', 'applied', 'screening', 'interview', 'offer', 'rejected');
create type public.pipeline_stage as enum ('discovered', 'matched', 'tailored', 'reviewed', 'applied');
create type public.event_actor as enum ('candidate', 'ai', 'reviewer', 'system');
create type public.review_status as enum ('queued', 'in_review', 'approved', 'changes_requested');
create type public.job_status as enum ('queued', 'running', 'succeeded', 'failed', 'dead');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Users & candidates
-- ---------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  role public.user_role not null default 'candidate',
  avatar_url text,
  onboarded_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.candidate_profiles (
  user_id uuid primary key references public.users (id) on delete cascade,
  headline text not null default '' check (char_length(headline) <= 140),
  summary text not null default '' check (char_length(summary) <= 2000),
  location_city text not null default '',
  location_country char(2),
  citizenship text[] not null default '{}',
  work_authorizations jsonb not null default '[]'::jsonb,
  requires_sponsorship boolean not null default true,
  willing_to_relocate boolean not null default true,
  relocation_countries text[] not null default '{}',
  remote_preference text not null default 'any' check (remote_preference in ('remote', 'hybrid', 'onsite', 'any')),
  preferred_roles text[] not null default '{}',
  preferred_countries text[] not null default '{}',
  seniority public.seniority not null default 'mid',
  years_experience smallint not null default 0 check (years_experience between 0 and 60),
  skills jsonb not null default '[]'::jsonb,
  experience jsonb not null default '[]'::jsonb,
  education jsonb not null default '[]'::jsonb,
  salary_min integer check (salary_min is null or salary_min >= 0),
  salary_currency char(3),
  links jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create trigger candidate_profiles_touch before update on public.candidate_profiles
  for each row execute function public.touch_updated_at();

create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  file_name text not null,
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain')),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 5242880),
  is_primary boolean not null default false,
  parsed_text text,
  created_at timestamptz not null default now()
);
create index resumes_user_idx on public.resumes (user_id, created_at desc);
create unique index resumes_one_primary on public.resumes (user_id) where is_primary;

create table public.user_settings (
  user_id uuid primary key references public.users (id) on delete cascade,
  email_digest text not null default 'daily' check (email_digest in ('daily', 'weekly', 'off')),
  notify_new_matches boolean not null default true,
  notify_review_complete boolean not null default true,
  notify_application_updates boolean not null default true,
  min_match_score smallint not null default 60 check (min_match_score between 0 and 100),
  timezone text not null default 'UTC'
);

-- ---------------------------------------------------------------------------
-- Companies & jobs
-- ---------------------------------------------------------------------------
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text not null unique,
  industry text not null default '',
  size text not null default '',
  hq_city text not null default '',
  hq_country char(2),
  description text not null default '',
  sponsorship_history public.sponsorship_history not null default 'unknown',
  website text not null default '',
  brand_color text not null default '#9BA1AB',
  created_at timestamptz not null default now()
);

-- array_to_string is STABLE, which generated columns reject; this wrapper is safe because the separator is fixed.
create or replace function public.join_words(arr text[]) returns text
language sql immutable parallel safe as $$ select array_to_string(arr, ' ') $$;

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  title text not null,
  department text not null default '',
  seniority public.seniority not null,
  employment_type text not null default 'full_time' check (employment_type in ('full_time', 'contract', 'part_time')),
  locations jsonb not null default '[]'::jsonb,
  work_mode public.work_mode not null,
  remote_countries text[] not null default '{}',
  salary_min integer,
  salary_max integer,
  salary_currency char(3),
  description text not null default '',
  responsibilities text[] not null default '{}',
  requirements text[] not null default '{}',
  required_skills text[] not null default '{}',
  nice_to_have_skills text[] not null default '{}',
  min_years smallint not null default 0,
  visa_sponsorship public.sponsorship_policy not null default 'unknown',
  source text not null,
  source_url text not null,
  external_id text not null,
  fingerprint text not null unique,
  status text not null default 'active' check (status in ('active', 'closed')),
  posted_at timestamptz not null,
  created_at timestamptz not null default now(),
  search tsvector generated always as (
    to_tsvector('english'::regconfig, coalesce(title, '') || ' ' || coalesce(department, '') || ' ' || public.join_words(required_skills))
  ) stored,
  unique (source, external_id),
  check (salary_min is null or salary_max is null or salary_min <= salary_max)
);
create index jobs_status_posted_idx on public.jobs (status, posted_at desc);
create index jobs_company_idx on public.jobs (company_id);
create index jobs_search_idx on public.jobs using gin (search);

-- ---------------------------------------------------------------------------
-- Matching, applications, tailoring, review
-- ---------------------------------------------------------------------------
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  score smallint not null check (score between 0 and 100),
  breakdown jsonb not null,
  model_version text not null default 'match-v1',
  status public.match_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, job_id)
);
create index matches_user_score_idx on public.matches (user_id, score desc);
create trigger matches_touch before update on public.matches for each row execute function public.touch_updated_at();

create table public.tailored_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  application_id uuid,
  resume_id uuid references public.resumes (id) on delete set null,
  version integer not null default 1,
  summary text not null default '',
  bullets jsonb not null default '[]'::jsonb,
  cover_letter text not null default '',
  skill_alignment jsonb not null default '[]'::jsonb,
  recommendations text[] not null default '{}',
  provider text not null,
  model text not null,
  status text not null default 'draft' check (status in ('draft', 'approved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, job_id, version)
);
create trigger tailored_touch before update on public.tailored_documents for each row execute function public.touch_updated_at();

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  match_id uuid references public.matches (id) on delete set null,
  status public.application_status not null default 'saved',
  stage public.pipeline_stage not null default 'matched',
  tailored_document_id uuid references public.tailored_documents (id) on delete set null,
  notes text not null default '' check (char_length(notes) <= 5000),
  next_step_label text,
  next_step_at timestamptz,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, job_id)
);
create index applications_user_idx on public.applications (user_id, updated_at desc);
create index applications_status_idx on public.applications (status);
create trigger applications_touch before update on public.applications for each row execute function public.touch_updated_at();

alter table public.tailored_documents
  add constraint tailored_documents_application_fk foreign key (application_id) references public.applications (id) on delete set null;

create table public.application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  type text not null check (type in ('created', 'status_change', 'note', 'ai', 'review', 'system')),
  actor public.event_actor not null,
  message text not null check (char_length(message) <= 1000),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index application_events_app_idx on public.application_events (application_id, created_at desc);

create table public.human_reviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  reviewer_id uuid references public.users (id) on delete set null,
  status public.review_status not null default 'queued',
  priority text not null default 'normal' check (priority in ('normal', 'high')),
  checklist jsonb not null default '[]'::jsonb,
  notes text not null default '',
  sla_due_at timestamptz not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index human_reviews_queue_idx on public.human_reviews (status, priority, sla_due_at);
create unique index human_reviews_one_open on public.human_reviews (application_id) where status in ('queued', 'in_review');

-- ---------------------------------------------------------------------------
-- Billing (pricing is data, not code)
-- ---------------------------------------------------------------------------
create table public.plans (
  id text primary key check (id in ('entry', 'professional', 'executive')),
  name text not null,
  tagline text not null default '',
  price_monthly numeric(10, 2) not null check (price_monthly >= 0),
  price_yearly numeric(10, 2) not null check (price_yearly >= 0),
  currency char(3) not null default 'USD',
  features text[] not null default '{}',
  limits jsonb not null default '{}'::jsonb,
  highlighted boolean not null default false,
  sort_order smallint not null default 0,
  active boolean not null default true
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  plan_id text not null references public.plans (id),
  status text not null check (status in ('active', 'trialing', 'past_due', 'canceled')),
  interval text not null default 'month' check (interval in ('month', 'year')),
  current_period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  amount numeric(10, 2) not null,
  currency char(3) not null,
  status text not null check (status in ('succeeded', 'failed', 'refunded', 'pending')),
  provider text not null,
  provider_ref text not null unique,
  description text not null default '',
  created_at timestamptz not null default now()
);
create index payments_user_idx on public.payments (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Notifications, audit
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null check (type in ('match', 'review', 'application', 'system', 'billing')),
  title text not null,
  body text not null default '',
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users (id) on delete set null,
  actor_role text not null,
  action text not null,
  entity_type text not null,
  entity_id text,
  meta jsonb not null default '{}'::jsonb,
  ip text,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, created_at desc);

-- ---------------------------------------------------------------------------
-- Pipeline infrastructure
-- ---------------------------------------------------------------------------
create table public.background_jobs (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('ingest_source', 'match_candidate', 'match_job', 'tailor_application', 'send_notification')),
  payload jsonb not null default '{}'::jsonb,
  status public.job_status not null default 'queued',
  attempts smallint not null default 0,
  max_attempts smallint not null default 3,
  last_error text,
  idempotency_key text unique,
  run_after timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);
create index background_jobs_claim_idx on public.background_jobs (status, run_after) where status in ('queued', 'failed');

create table public.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  status text not null check (status in ('running', 'succeeded', 'failed')),
  fetched integer not null default 0,
  normalized integer not null default 0,
  duplicates integer not null default 0,
  inserted integer not null default 0,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table public.idempotency_keys (
  key text primary key,
  response jsonb not null,
  created_at timestamptz not null default now()
);

create table public.rate_limits (
  key text primary key,
  count integer not null,
  window_start timestamptz not null
);

-- Atomically claim due jobs. SKIP LOCKED lets many workers run concurrently without double-processing.
create or replace function public.claim_background_jobs(p_limit integer)
returns setof public.background_jobs
language sql security definer set search_path = public as $$
  update public.background_jobs j
     set status = 'running', attempts = j.attempts + 1, started_at = now()
   where j.id in (
     select id from public.background_jobs
      where status in ('queued', 'failed') and run_after <= now() and attempts < max_attempts
      order by run_after
      limit p_limit
      for update skip locked
   )
  returning j.*;
$$;

-- Fixed-window rate limiter shared by every server instance. Returns true when the call is allowed.
create or replace function public.rate_limit_hit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_count integer;
begin
  insert into public.rate_limits as r (key, count, window_start)
  values (p_key, 1, now())
  on conflict (key) do update
    set count = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.count + 1 end,
        window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning count into v_count;
  return v_count <= p_limit;
end $$;

revoke execute on function public.claim_background_jobs(integer) from public, anon, authenticated;
revoke execute on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
