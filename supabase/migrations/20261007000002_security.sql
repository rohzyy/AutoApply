-- Row Level Security, auth wiring and storage policies.
-- Principle: candidates can read/write only their own rows; staff (reviewer/admin) can read
-- operational data; anything system-authored (matches, AI events, audit, jobs) is written by
-- the service role from the server, never directly by a browser session.

-- ---------------------------------------------------------------------------
-- Role helper (security definer so it can read users without recursive RLS)
-- ---------------------------------------------------------------------------
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users where id = auth.uid() and role in ('reviewer', 'admin'));
$$;

create or replace function public.owns_application(p_application_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.applications where id = p_application_id and user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Provision app user rows when someone signs up through Supabase Auth
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  insert into public.user_settings (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.candidate_profiles enable row level security;
alter table public.resumes enable row level security;
alter table public.user_settings enable row level security;
alter table public.companies enable row level security;
alter table public.jobs enable row level security;
alter table public.matches enable row level security;
alter table public.tailored_documents enable row level security;
alter table public.applications enable row level security;
alter table public.application_events enable row level security;
alter table public.human_reviews enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.background_jobs enable row level security;
alter table public.ingestion_runs enable row level security;
alter table public.idempotency_keys enable row level security;
alter table public.rate_limits enable row level security;

-- Column-level privileges: a session can never change its own role or email.
revoke update on public.users from authenticated;
grant update (full_name, avatar_url, onboarded_at) on public.users to authenticated;

revoke update on public.matches from authenticated;
grant update (status) on public.matches to authenticated;

revoke update on public.applications from authenticated;
grant update (status, stage, notes, next_step_label, next_step_at, tailored_document_id) on public.applications to authenticated;

revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

-- users
create policy users_select on public.users for select to authenticated using (id = auth.uid() or public.is_staff());
create policy users_update_self on public.users for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- candidate profiles
create policy profiles_select on public.candidate_profiles for select to authenticated using (user_id = auth.uid() or public.is_staff());
create policy profiles_insert on public.candidate_profiles for insert to authenticated with check (user_id = auth.uid());
create policy profiles_update on public.candidate_profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- resumes
create policy resumes_select on public.resumes for select to authenticated using (user_id = auth.uid() or public.is_staff());
create policy resumes_insert on public.resumes for insert to authenticated with check (user_id = auth.uid());
create policy resumes_update on public.resumes for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy resumes_delete on public.resumes for delete to authenticated using (user_id = auth.uid());

-- settings
create policy settings_all on public.user_settings for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- public catalog
create policy companies_read on public.companies for select to anon, authenticated using (true);
create policy jobs_read on public.jobs for select to anon, authenticated using (status = 'active' or public.is_staff());
create policy plans_read on public.plans for select to anon, authenticated using (active or public.is_staff());

-- matches (written by the matching worker; candidates may only change status)
create policy matches_select on public.matches for select to authenticated using (user_id = auth.uid() or public.is_staff());
create policy matches_update on public.matches for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- tailored documents
create policy tailored_select on public.tailored_documents for select to authenticated using (user_id = auth.uid() or public.is_staff());
create policy tailored_update on public.tailored_documents for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- applications
create policy applications_select on public.applications for select to authenticated using (user_id = auth.uid() or public.is_staff());
create policy applications_insert on public.applications for insert to authenticated with check (user_id = auth.uid());
create policy applications_update on public.applications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- events: candidates can add their own notes; everything else is system-authored
create policy events_select on public.application_events for select to authenticated
  using (public.owns_application(application_id) or public.is_staff());
create policy events_insert_own on public.application_events for insert to authenticated
  with check (actor = 'candidate' and public.owns_application(application_id));

-- human reviews: candidates see the status of their own; staff work the queue
create policy reviews_select on public.human_reviews for select to authenticated
  using (public.owns_application(application_id) or public.is_staff());
create policy reviews_staff_update on public.human_reviews for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- billing: read-only for the owner; writes come from the payment webhook (service role)
create policy subscriptions_select on public.subscriptions for select to authenticated using (user_id = auth.uid());
create policy payments_select on public.payments for select to authenticated using (user_id = auth.uid());

-- notifications
create policy notifications_select on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- operations data: staff read-only; writes only via service role
create policy audit_staff_read on public.audit_logs for select to authenticated using (public.is_staff());
create policy jobs_queue_staff_read on public.background_jobs for select to authenticated using (public.is_staff());
create policy runs_staff_read on public.ingestion_runs for select to authenticated using (public.is_staff());
-- idempotency_keys and rate_limits intentionally have no policies (service role only).

-- ---------------------------------------------------------------------------
-- Storage: private bucket, objects namespaced by owner id ("<uid>/<file>")
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents', 'documents', false, 5242880,
  array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
)
on conflict (id) do nothing;

create policy documents_owner_read on storage.objects for select to authenticated
  using (bucket_id = 'documents' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff()));
create policy documents_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy documents_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
