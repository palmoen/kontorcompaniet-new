-- ============================================================================
-- Kontorcompaniet.no – fundament
-- Eget Supabase-prosjekt. Skjemaer etter ansvar; kun views i public eksponeres.
-- ============================================================================

create extension if not exists pgcrypto;
create extension if not exists citext;

create schema if not exists content;
create schema if not exists crm;
create schema if not exists scout;
create schema if not exists ops;
create schema if not exists migration;

-- Anon får aldri direkte tilgang til interne skjemaer. Admin-brukere (authenticated)
-- får tilgang via RLS-policyer. service_role omgår RLS (brukes kun server-side).
revoke all on schema content, crm, scout, ops, migration from public;
grant usage on schema content, crm, scout, ops to authenticated, service_role;
grant usage on schema migration to service_role;

-- ---------------------------------------------------------------------------
-- Felles hjelpefunksjoner
-- ---------------------------------------------------------------------------
create or replace function ops.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Roller for admin: admin | editor | sales
create table ops.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('admin', 'editor', 'sales')),
  created_at timestamptz not null default now()
);
alter table ops.admin_users enable row level security;

create or replace function ops.has_role(roles text[]) returns boolean
language sql stable security definer set search_path = ops, pg_temp as $$
  select exists (
    select 1 from ops.admin_users au
    where au.user_id = auth.uid() and (au.role = 'admin' or au.role = any (roles))
  );
$$;
revoke all on function ops.has_role(text[]) from public;
grant execute on function ops.has_role(text[]) to authenticated, service_role;

create policy admin_users_self_read on ops.admin_users
  for select to authenticated using (user_id = auth.uid() or ops.has_role(array['admin']));
create policy admin_users_admin_write on ops.admin_users
  for all to authenticated using (ops.has_role(array['admin'])) with check (ops.has_role(array['admin']));

-- ---------------------------------------------------------------------------
-- Drift: redirects, 404-logg, revisjon, AI-logg, hendelser (outbox)
-- ---------------------------------------------------------------------------
create table ops.redirects (
  id uuid primary key default gen_random_uuid(),
  from_path text not null unique check (from_path like '/%'),
  to_path text check (to_path is null or to_path like '/%' or to_path like 'https://%'),
  status_code smallint not null check (status_code in (301, 302, 410)),
  source text not null default 'manual' check (source in ('migration', 'slug_change', 'manual')),
  note text,
  hits integer not null default 0,
  last_hit_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status_code = 410) = (to_path is null))
);
create trigger redirects_updated before update on ops.redirects for each row execute function ops.set_updated_at();

create table ops.not_found_log (
  path text primary key,
  referrer text,
  count integer not null default 1,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now()
);

create table ops.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  table_name text not null,
  row_id text,
  action text not null,
  diff jsonb,
  at timestamptz not null default now()
);

create table ops.ai_calls (
  id uuid primary key default gen_random_uuid(),
  purpose text not null check (purpose in ('scout_parse', 'scout_semantic', 'scout_explain', 'transcribe', 'other')),
  provider text not null,
  model text not null,
  input_tokens integer,
  output_tokens integer,
  audio_seconds numeric,
  cost_nok numeric(12, 4),
  latency_ms integer,
  scout_request_id uuid,
  ok boolean not null,
  error text,
  created_at timestamptz not null default now()
);

create table ops.domain_events (
  id bigint generated always as identity primary key,
  type text not null,
  aggregate text not null check (aggregate in ('lead', 'scout_request', 'scout_match', 'opportunity')),
  aggregate_id uuid not null,
  payload jsonb not null default '{}',
  occurred_at timestamptz not null default now(),
  processed_at timestamptz,
  attempts integer not null default 0,
  last_error text
);
create index domain_events_unprocessed on ops.domain_events (occurred_at) where processed_at is null;

create table ops.analytics_events (
  id bigint generated always as identity primary key,
  name text not null check (name in (
    'page_view', 'product_view', 'project_view', 'cta_click', 'contact_started', 'contact_submitted',
    'scout_started', 'scout_parsed', 'scout_confirmed', 'scout_activated', 'match_found', 'match_approved',
    'match_presented', 'match_viewed', 'match_interested', 'match_rejected',
    'opportunity_qualified', 'scout_won', 'scout_lost', 'order_value_recorded')),
  visitor_id uuid,
  lead_id uuid,
  scout_request_id uuid,
  scout_match_id uuid,
  path text,
  props jsonb not null default '{}',
  at timestamptz not null default now()
);
create index analytics_events_name_at on ops.analytics_events (name, at);
create index analytics_events_scout on ops.analytics_events (scout_request_id) where scout_request_id is not null;

alter table ops.redirects enable row level security;
alter table ops.not_found_log enable row level security;
alter table ops.audit_log enable row level security;
alter table ops.ai_calls enable row level security;
alter table ops.domain_events enable row level security;
alter table ops.analytics_events enable row level security;

create policy redirects_editor on ops.redirects for all to authenticated
  using (ops.has_role(array['editor'])) with check (ops.has_role(array['editor']));
create policy not_found_editor on ops.not_found_log for select to authenticated using (ops.has_role(array['editor']));
create policy audit_admin on ops.audit_log for select to authenticated using (ops.has_role(array['admin']));
create policy ai_calls_admin on ops.ai_calls for select to authenticated using (ops.has_role(array['admin']));
create policy events_sales on ops.domain_events for select to authenticated using (ops.has_role(array['sales']));
create policy analytics_sales on ops.analytics_events for select to authenticated using (ops.has_role(array['sales']));

grant select, insert, update, delete on all tables in schema ops to authenticated;
grant all on all tables in schema ops to service_role;
grant usage, select on all sequences in schema ops to service_role;
