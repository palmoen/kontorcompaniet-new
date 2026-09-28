-- ============================================================================
-- CRM: besøkende/attribusjon, organisasjoner, kontakter, leads, salgsmuligheter
-- med omsetning per inntektstype. Møbelscout: behov, kilder, normalisert lager,
-- kundepresentasjon, treff, prisregler og varsler.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- CRM
-- ---------------------------------------------------------------------------
create table crm.visitors (
  id uuid primary key default gen_random_uuid(),
  anon_id text not null unique,               -- førsteparts-ID, kun satt etter samtykke
  first_touch jsonb not null default '{}',    -- {utm_*, referrer, landing_page, gclid, li_fat_id, at}
  last_touch jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table crm.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  org_number text,
  domain text,
  external_refs jsonb not null default '{}',  -- {"crm": "...", "24so": "...", "workshop_studio": "..."}
  created_at timestamptz not null default now()
);
create unique index organizations_org_number on crm.organizations (org_number) where org_number is not null;

create table crm.contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references crm.organizations (id) on delete set null,
  name text not null,
  email citext not null,
  phone text,
  role text,
  consent jsonb not null default '{}',        -- {contact: true, at: ..., text_version: ...}
  external_refs jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index contacts_email on crm.contacts (email);

create table crm.leads (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('contact', 'project_request', 'quote_request', 'advisor_request', 'scout', 'scout_interest')),
  priority text not null default 'normal' check (priority in ('normal', 'high')),
  organization_id uuid references crm.organizations (id) on delete set null,
  contact_id uuid references crm.contacts (id) on delete set null,
  visitor_id uuid references crm.visitors (id) on delete set null,
  product_id uuid references content.products (id) on delete set null,
  brand_id uuid references content.brands (id) on delete set null,
  category_id uuid references content.categories (id) on delete set null,
  project_ref_id uuid references content.projects (id) on delete set null,
  message text,
  payload jsonb not null default '{}',
  attribution jsonb not null default '{}',
  source_path text,
  assigned_to uuid references content.people (id) on delete set null,
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'disqualified')),
  external_refs jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger leads_updated before update on crm.leads for each row execute function ops.set_updated_at();
create index leads_status on crm.leads (status, created_at desc);

-- «Legg til i prosjekt»: forespørselsliste, IKKE handlekurv (ingen priser, ingen checkout)
create table crm.inquiry_lists (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid references crm.visitors (id) on delete cascade,
  lead_id uuid references crm.leads (id) on delete set null,
  items jsonb not null default '[]',          -- [{product_id, note, qty_estimate}]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table crm.opportunities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references crm.leads (id) on delete set null,
  scout_request_id uuid,                      -- FK legges til etter scout.requests
  title text not null,
  stage text not null default 'qualified' check (stage in ('qualified', 'quoted', 'won', 'lost')),
  lost_reason text,
  expected_value_ex_vat numeric(14, 2),
  won_at timestamptz,
  external_refs jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger opportunities_updated before update on crm.opportunities for each row execute function ops.set_updated_at();

create table crm.opportunity_lines (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references crm.opportunities (id) on delete cascade,
  revenue_type text not null check (revenue_type in ('used_furniture', 'new_products', 'logistics', 'installation', 'services', 'other')),
  description text not null,
  quantity numeric(12, 2) not null default 1,
  unit_price_ex_vat numeric(14, 2) not null,
  cost_ex_vat numeric(14, 2),
  source text not null default 'manual' check (source in ('scout_match', 'catalog', 'manual')),
  scout_match_id uuid,
  product_id uuid references content.products (id) on delete set null
);

-- ---------------------------------------------------------------------------
-- Møbelscout
-- ---------------------------------------------------------------------------
create table scout.requests (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references crm.leads (id) on delete set null,
  contact_id uuid references crm.contacts (id) on delete set null,
  organization_id uuid references crm.organizations (id) on delete set null,
  visitor_id uuid references crm.visitors (id) on delete set null,
  original_prompt text not null,
  input_mode text not null default 'text' check (input_mode in ('text', 'voice')),
  transcript text,
  need jsonb not null,                         -- gjeldende ScoutNeed (Zod-validert i app)
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'matched', 'won', 'lost', 'expired')),
  result_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  activated_at timestamptz,
  last_matched_at timestamptz,
  expires_at timestamptz,
  closed_reason text,
  attribution jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger scout_requests_updated before update on scout.requests for each row execute function ops.set_updated_at();
create index scout_requests_active on scout.requests (status) where status in ('active', 'matched');

alter table crm.opportunities
  add constraint opportunities_scout_fk foreign key (scout_request_id) references scout.requests (id) on delete set null;

create table scout.request_revisions (
  id bigint generated always as identity primary key,
  request_id uuid not null references scout.requests (id) on delete cascade,
  need jsonb not null,
  changed_by text not null check (changed_by in ('customer', 'ai', 'admin')),
  at timestamptz not null default now()
);

-- Denormalisert fra need for rask deterministisk filtrering i SQL
create table scout.request_lines (
  request_id uuid not null references scout.requests (id) on delete cascade,
  line_no smallint not null,
  category text not null,
  quantity_target integer not null check (quantity_target > 0),
  quantity_min integer check (quantity_min > 0),
  brands text[] not null default '{}',
  models text[] not null default '{}',
  max_unit_price_ex_vat numeric(12, 2),
  conditions text[] not null default '{}',
  locations text[] not null default '{}',
  accept_alternatives boolean not null default true,
  hard jsonb not null default '[]',
  prefs jsonb not null default '[]',
  primary key (request_id, line_no)
);
create index request_lines_category on scout.request_lines (category);

create table scout.sources (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  adapter text not null check (adapter in ('mock', 'manual', 'own_stock', 'feed', 'api')),
  config jsonb not null default '{}',
  categories text[] not null default '{}',
  interval_minutes integer not null default 30 check (interval_minutes >= 5),   -- frekvens er DATA
  next_run_at timestamptz not null default now(),
  last_run_at timestamptz,
  is_active boolean not null default false,
  legal_status text not null default 'not_assessed' check (legal_status in ('not_assessed', 'approved', 'rejected')),
  legal_note text,
  legal_approved_by text,
  legal_approved_at timestamptz,
  images_republishable boolean not null default false,
  rate_limit_per_min integer not null default 30,
  created_at timestamptz not null default now(),
  -- En kilde kan ikke aktiveres uten godkjent juridisk vurdering
  check (not is_active or legal_status = 'approved')
);

create table scout.source_runs (
  id bigint generated always as identity primary key,
  source_id uuid not null references scout.sources (id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  categories text[] not null default '{}',
  fetched integer not null default 0,
  new_items integer not null default 0,
  updated_items integer not null default 0,
  gone_items integer not null default 0,
  ok boolean,
  error text
);

-- KILDEDATA – aldri eksponert for kunde
create table scout.items (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references scout.sources (id) on delete cascade,
  external_id text not null,
  dedupe_key text not null,
  category text not null,
  brand text,
  model text,
  title_raw text,
  description_raw text,
  quantity integer not null default 1 check (quantity >= 0),
  condition text check (condition in ('new', 'used', 'refurbished', 'demo')),
  color text,
  material text,
  location_text text,
  municipality text,
  source_price numeric(12, 2),
  source_currency text not null default 'NOK',
  source_url text,
  source_images jsonb not null default '[]',
  availability text not null default 'available' check (availability in ('available', 'reserved', 'gone', 'unknown')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  missed_runs integer not null default 0,
  unique (source_id, external_id)
);
create index scout_items_match on scout.items (category, availability);
create index scout_items_dedupe on scout.items (dedupe_key);

create table scout.item_observations (
  id bigint generated always as identity primary key,
  item_id uuid not null references scout.items (id) on delete cascade,
  observed_at timestamptz not null default now(),
  quantity integer,
  source_price numeric(12, 2),
  availability text
);

-- KUNDEVENDT DATA – redigeres og godkjennes internt
create table scout.item_presentation (
  item_id uuid primary key references scout.items (id) on delete cascade,
  display_name text not null,
  display_description text,
  media_ids uuid[] not null default '{}',    -- kun rettighetsavklarte bilder
  catalog_product_id uuid references content.products (id) on delete set null,
  approved_by uuid,
  approved_at timestamptz
);

create table scout.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('default', 'category', 'source')),
  scope_value text,
  markup_pct numeric(5, 2) not null default 10 check (markup_pct >= 0),
  min_markup_nok numeric(10, 2) not null default 0,
  rounding text not null default '10' check (rounding in ('none', '10', '50', '100')),
  is_active boolean not null default true,
  check ((scope = 'default') = (scope_value is null))
);
create unique index pricing_rules_scope on scout.pricing_rules (scope, coalesce(scope_value, '')) where is_active;

create table scout.matches (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references scout.requests (id) on delete cascade,
  request_line_no smallint not null,
  item_id uuid not null references scout.items (id) on delete cascade,
  score smallint not null check (score between 0 and 100),
  score_breakdown jsonb not null default '{}',
  explanation text not null,
  covered_qty integer not null,
  completion jsonb,                           -- {"missing": 6, "suggested_product_id": ..., "text": ...}
  source_price_snapshot numeric(12, 2),
  customer_price_ex_vat numeric(12, 2),
  margin_nok numeric(12, 2),
  status text not null default 'candidate'
    check (status in ('candidate', 'approved', 'presented', 'interested', 'rejected', 'unavailable')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  customer_feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, request_line_no, item_id),
  foreign key (request_id, request_line_no) references scout.request_lines (request_id, line_no) on delete cascade
);
create trigger scout_matches_updated before update on scout.matches for each row execute function ops.set_updated_at();
create index scout_matches_status on scout.matches (status, created_at desc);

alter table crm.opportunity_lines
  add constraint opportunity_lines_match_fk foreign key (scout_match_id) references scout.matches (id) on delete set null;

create table scout.notifications (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references scout.requests (id) on delete cascade,
  channel text not null default 'email' check (channel in ('email', 'sms', 'donna', 'crm')),
  match_ids uuid[] not null default '{}',
  scheduled_for timestamptz not null default now(),
  sent_at timestamptz,
  provider_id text,
  opened_at timestamptz
);

create table scout.settings (
  key text primary key,
  value jsonb not null
);
insert into scout.settings (key, value) values
  ('tick_minutes', '5'),
  ('notify_max_per_day', '1'),
  ('request_ttl_days', '90'),
  ('gone_after_missed_runs', '3');
insert into scout.pricing_rules (scope, markup_pct, rounding) values ('default', 10, '10');

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
do $$
declare t record;
begin
  for t in select schemaname, tablename from pg_tables where schemaname in ('crm', 'scout') loop
    execute format('alter table %I.%I enable row level security', t.schemaname, t.tablename);
    execute format($p$create policy sales_all on %I.%I for all to authenticated
                      using (ops.has_role(array['sales'])) with check (ops.has_role(array['sales']))$p$,
                   t.schemaname, t.tablename);
  end loop;
end $$;

grant select, insert, update, delete on all tables in schema crm, scout to authenticated;
grant all on all tables in schema crm, scout to service_role;
grant usage, select on all sequences in schema crm, scout to service_role;
