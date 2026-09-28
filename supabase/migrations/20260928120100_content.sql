-- ============================================================================
-- Innhold: innstillinger, folk, media, merker, kategorier, produkter (kort i v1),
-- løsninger, prosjekter, sitater, kunder, artikler og koblingstabeller.
-- Ikke en nettbutikk: ingen SKU-er, lager, priser per variant eller ordre.
-- ============================================================================

create type content.publish_status as enum ('draft', 'published', 'archived');
create type content.robots_override as enum ('index', 'noindex');
create type content.body_source as enum ('mdx', 'db');

-- Slugs: små bokstaver, tall og bindestrek
create domain content.slug as text check (value ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

-- ---------------------------------------------------------------------------
-- Nettstedsinnstillinger (én rad). Kode har typet standard som fallback.
-- ---------------------------------------------------------------------------
create table content.site_settings (
  id boolean primary key default true check (id),
  company_name text not null default 'Kontorcompaniet',
  legal_name text not null default 'Kontorcompaniet AS',
  org_number text,
  street_address text not null,
  address_note text,
  postal_code text not null,
  city text not null,
  country text not null default 'NO',
  geo_lat numeric(9, 6),
  geo_lng numeric(9, 6),
  phone text not null,
  email_general citext not null check (email_general::text like '%@kontorcompaniet.no'),
  email_sales citext,
  email_service citext,
  opening_hours jsonb not null default '[]',
  social jsonb not null default '{}',
  founded_year smallint not null default 1981,
  certifications text[] not null default '{}',
  updated_at timestamptz not null default now()
);
create trigger site_settings_updated before update on content.site_settings for each row execute function ops.set_updated_at();

-- ---------------------------------------------------------------------------
-- Media med rettigheter
-- ---------------------------------------------------------------------------
create table content.media_assets (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  width integer,
  height integer,
  mime text,
  bytes integer,
  blurhash text,
  alt_text text,
  caption text,
  credit text,
  rights text not null default 'unknown'
    check (rights in ('own', 'manufacturer_licensed', 'customer_permission', 'restricted', 'unknown')),
  rights_note text,
  source_url text,
  focal_x real check (focal_x between 0 and 1),
  focal_y real check (focal_y between 0 and 1),
  imported_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger media_updated before update on content.media_assets for each row execute function ops.set_updated_at();

-- Publiserbar = rettighetsavklart og med alt-tekst
create or replace function content.media_publishable(m content.media_assets) returns boolean
language sql immutable as $$
  select m.rights in ('own', 'manufacturer_licensed', 'customer_permission') and coalesce(length(trim(m.alt_text)), 0) > 0
$$;

-- ---------------------------------------------------------------------------
-- Folk (rådgivere/ansatte)
-- ---------------------------------------------------------------------------
create table content.people (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role_title text,
  phone text,
  email citext,
  photo_id uuid references content.media_assets (id) on delete set null,
  bio text,
  linkedin_url text,
  handles text[] not null default '{}',
  is_public boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger people_updated before update on content.people for each row execute function ops.set_updated_at();

-- ---------------------------------------------------------------------------
-- Felles SEO-kolonner legges direkte på hver indekserbar tabell:
--   seo_title, seo_description, og_image_id, robots_override, canonical_override
-- ---------------------------------------------------------------------------

create table content.brands (
  id uuid primary key default gen_random_uuid(),
  slug content.slug not null unique,
  name text not null,
  logo_id uuid references content.media_assets (id) on delete set null,
  hero_media_id uuid references content.media_assets (id) on delete set null,
  website_url text,
  country text,
  parent_company text,
  intro_md text,
  why_we_use_md text,
  sustainability_md text,
  facts jsonb not null default '[]',          -- [{label, value}]
  is_partner boolean not null default true,
  has_page boolean not null default false,    -- egen /merkevarer/{slug}
  status content.publish_status not null default 'draft',
  published_at timestamptz,
  seo_title text, seo_description text,
  og_image_id uuid references content.media_assets (id) on delete set null,
  robots_override content.robots_override, canonical_override text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger brands_updated before update on content.brands for each row execute function ops.set_updated_at();

create table content.categories (
  id uuid primary key default gen_random_uuid(),
  slug content.slug not null unique,
  name text not null,
  parent_id uuid references content.categories (id) on delete set null,
  sort integer not null default 0,
  intro_md text,
  body_source content.body_source not null default 'mdx',
  body_mdx_path text,
  body_blocks jsonb,
  hero_media_id uuid references content.media_assets (id) on delete set null,
  status content.publish_status not null default 'draft',
  published_at timestamptz,
  seo_title text, seo_description text,
  og_image_id uuid references content.media_assets (id) on delete set null,
  robots_override content.robots_override, canonical_override text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger categories_updated before update on content.categories for each row execute function ops.set_updated_at();

create table content.brand_categories (
  brand_id uuid not null references content.brands (id) on delete cascade,
  category_id uuid not null references content.categories (id) on delete cascade,
  note text,
  primary key (brand_id, category_id)
);

create table content.product_families (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references content.brands (id) on delete cascade,
  slug content.slug not null,
  name text not null,
  intro_md text,
  unique (brand_id, slug)
);

-- Produkter. v1: kort uten egen side (has_page = false). Feltene for produktsiden
-- finnes, men fylles først i fasen med produktsider.
create table content.products (
  id uuid primary key default gen_random_uuid(),
  slug content.slug not null unique,
  name text not null,
  brand_id uuid not null references content.brands (id) on delete restrict,
  family_id uuid references content.product_families (id) on delete set null,
  primary_category_id uuid not null references content.categories (id) on delete restrict,
  model_code text,
  tagline text,                       -- «passer til»/én linje på kortet
  summary_md text,
  use_cases text[] not null default '{}',
  features jsonb not null default '[]',
  ergonomics_md text,
  dimensions_md text,
  materials_md text,
  warranty_years smallint,
  designer text,
  country_of_origin text,
  lead_time_text text,
  price_display text not null default 'none' check (price_display in ('none', 'from', 'on_request')),
  price_from_ex_vat numeric(12, 2),
  price_checked_at date,
  has_page boolean not null default false,
  featured boolean not null default false,
  sort integer not null default 0,
  legacy_wc_ids integer[] not null default '{}',
  status content.publish_status not null default 'draft',
  published_at timestamptz,
  seo_title text, seo_description text,
  og_image_id uuid references content.media_assets (id) on delete set null,
  robots_override content.robots_override, canonical_override text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((price_display = 'from') = (price_from_ex_vat is not null))
);
create trigger products_updated before update on content.products for each row execute function ops.set_updated_at();
create index products_brand on content.products (brand_id);
create index products_category on content.products (primary_category_id);

create table content.product_options (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references content.products (id) on delete cascade,
  "group" text not null,
  "values" text[] not null default '{}',
  note text,
  sort integer not null default 0
);
create table content.product_specs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references content.products (id) on delete cascade,
  "group" text,
  label text not null,
  value text not null,
  unit text,
  sort integer not null default 0
);
create table content.product_categories (
  product_id uuid not null references content.products (id) on delete cascade,
  category_id uuid not null references content.categories (id) on delete cascade,
  primary key (product_id, category_id)
);
create table content.product_media (
  product_id uuid not null references content.products (id) on delete cascade,
  media_id uuid not null references content.media_assets (id) on delete cascade,
  role text not null default 'gallery' check (role in ('primary', 'gallery', 'detail', 'context', 'in_project')),
  sort integer not null default 0,
  primary key (product_id, media_id)
);
create table content.certifications (
  id uuid primary key default gen_random_uuid(),
  slug content.slug not null unique,
  name text not null,
  description text,
  logo_id uuid references content.media_assets (id) on delete set null
);
create table content.product_certifications (
  product_id uuid not null references content.products (id) on delete cascade,
  certification_id uuid not null references content.certifications (id) on delete cascade,
  primary key (product_id, certification_id)
);
create table content.documents (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references content.products (id) on delete cascade,
  brand_id uuid references content.brands (id) on delete cascade,
  kind text not null check (kind in ('epd', 'datasheet', 'manual', 'guide', 'certificate')),
  title text not null,
  url text,
  file_path text,
  valid_until date,
  check (num_nonnulls(product_id, brand_id) = 1),
  check (num_nonnulls(url, file_path) = 1)
);
create table content.related_products (
  product_id uuid not null references content.products (id) on delete cascade,
  related_id uuid not null references content.products (id) on delete cascade,
  kind text not null check (kind in ('family', 'complement', 'alternative')),
  primary key (product_id, related_id),
  check (product_id <> related_id)
);

-- ---------------------------------------------------------------------------
-- Løsninger, prosjekter og redaksjonelt
-- ---------------------------------------------------------------------------
create table content.solutions (
  id uuid primary key default gen_random_uuid(),
  slug content.slug not null unique,
  name text not null,
  "group" text not null check ("group" in ('rom', 'tjeneste')),
  summary text,
  body_source content.body_source not null default 'mdx',
  body_mdx_path text,
  body_blocks jsonb,
  hero_media_id uuid references content.media_assets (id) on delete set null,
  priority text not null default 'P1' check (priority in ('P1', 'P2')),
  sort integer not null default 0,
  status content.publish_status not null default 'draft',
  published_at timestamptz,
  seo_title text, seo_description text,
  og_image_id uuid references content.media_assets (id) on delete set null,
  robots_override content.robots_override, canonical_override text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger solutions_updated before update on content.solutions for each row execute function ops.set_updated_at();

create table content.testimonials (
  id uuid primary key default gen_random_uuid(),
  quote text not null,
  person_name text not null,
  person_title text,
  company text not null,
  project_id uuid,
  permission_confirmed_at timestamptz,        -- publiseres ikke uten bekreftet tillatelse
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create table content.projects (
  id uuid primary key default gen_random_uuid(),
  slug content.slug not null unique,
  title text not null,
  client_name text not null,
  client_display text not null default 'named' check (client_display in ('named', 'anonymous')),
  industry text,
  location_text text,
  municipality text,
  year smallint,
  area_m2 integer,
  workstations integer,
  scope text,                                  -- «Kontor, konferanse, kantine …»
  challenge_md text,
  solution_md text,
  result_md text,
  hero_media_id uuid references content.media_assets (id) on delete set null,
  video_urls text[] not null default '{}',
  testimonial_id uuid references content.testimonials (id) on delete set null,
  featured boolean not null default false,
  sort integer not null default 0,
  status content.publish_status not null default 'draft',
  published_at timestamptz,
  seo_title text, seo_description text,
  og_image_id uuid references content.media_assets (id) on delete set null,
  robots_override content.robots_override, canonical_override text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger projects_updated before update on content.projects for each row execute function ops.set_updated_at();
alter table content.testimonials
  add constraint testimonials_project_fk foreign key (project_id) references content.projects (id) on delete set null;

create table content.project_media (
  project_id uuid not null references content.projects (id) on delete cascade,
  media_id uuid not null references content.media_assets (id) on delete cascade,
  caption text,
  sort integer not null default 0,
  primary key (project_id, media_id)
);
-- Koblingsmodellen: prosjekt ↔ løsning/tjeneste/produkt/merke, produkt ↔ løsning
create table content.project_solutions (
  project_id uuid not null references content.projects (id) on delete cascade,
  solution_id uuid not null references content.solutions (id) on delete cascade,
  primary key (project_id, solution_id)
);
create table content.project_products (
  project_id uuid not null references content.projects (id) on delete cascade,
  product_id uuid not null references content.products (id) on delete cascade,
  quantity integer,
  note text,
  primary key (project_id, product_id)
);
create table content.project_brands (
  project_id uuid not null references content.projects (id) on delete cascade,
  brand_id uuid not null references content.brands (id) on delete cascade,
  primary key (project_id, brand_id)
);
create table content.product_solutions (
  product_id uuid not null references content.products (id) on delete cascade,
  solution_id uuid not null references content.solutions (id) on delete cascade,
  primary key (product_id, solution_id)
);

create table content.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_id uuid references content.media_assets (id) on delete set null,
  website_url text,
  show_in_logo_wall boolean not null default false,
  sort integer not null default 0
);

create table content.articles (
  id uuid primary key default gen_random_uuid(),
  slug content.slug not null unique,
  title text not null,
  excerpt text,
  author_id uuid references content.people (id) on delete set null,
  body_source content.body_source not null default 'mdx',
  body_mdx_path text,
  body_blocks jsonb,
  hero_media_id uuid references content.media_assets (id) on delete set null,
  updated_at_display date,
  status content.publish_status not null default 'draft',
  published_at timestamptz,
  seo_title text, seo_description text,
  og_image_id uuid references content.media_assets (id) on delete set null,
  robots_override content.robots_override, canonical_override text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger articles_updated before update on content.articles for each row execute function ops.set_updated_at();
create table content.article_links (
  article_id uuid not null references content.articles (id) on delete cascade,
  solution_id uuid references content.solutions (id) on delete cascade,
  category_id uuid references content.categories (id) on delete cascade,
  brand_id uuid references content.brands (id) on delete cascade,
  check (num_nonnulls(solution_id, category_id, brand_id) = 1)
);

-- ---------------------------------------------------------------------------
-- Slug-endring ⇒ automatisk redirect (ingen døde URL-er fra admin)
-- ---------------------------------------------------------------------------
create or replace function content.slug_change_redirect() returns trigger
language plpgsql security definer set search_path = content, ops, pg_temp as $$
declare prefix text := tg_argv[0];
begin
  if new.slug is distinct from old.slug and old.status = 'published' then
    insert into ops.redirects (from_path, to_path, status_code, source, note)
    values (prefix || old.slug, prefix || new.slug, 301, 'slug_change', tg_table_name || ' ' || new.id)
    on conflict (from_path) do update set to_path = excluded.to_path, status_code = 301, source = 'slug_change';
    -- Unngå kjeder: eksisterende redirects som pekte på gammel slug peker nå direkte på ny
    update ops.redirects set to_path = prefix || new.slug where to_path = prefix || old.slug;
  end if;
  return new;
end $$;
create trigger brands_slug after update of slug on content.brands for each row execute function content.slug_change_redirect('/merkevarer/');
create trigger categories_slug after update of slug on content.categories for each row execute function content.slug_change_redirect('/produkter/');
create trigger solutions_slug after update of slug on content.solutions for each row execute function content.slug_change_redirect('/losninger/');
create trigger projects_slug after update of slug on content.projects for each row execute function content.slug_change_redirect('/prosjekter/');
create trigger articles_slug after update of slug on content.articles for each row execute function content.slug_change_redirect('/inspirasjon/');

-- ---------------------------------------------------------------------------
-- RLS: innhold leses offentlig KUN via public-views. Redaktører skriver.
-- ---------------------------------------------------------------------------
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'content' loop
    execute format('alter table content.%I enable row level security', t.tablename);
    execute format($p$create policy editor_all on content.%I for all to authenticated
                      using (ops.has_role(array['editor'])) with check (ops.has_role(array['editor']))$p$, t.tablename);
    execute format($p$create policy staff_read on content.%I for select to authenticated
                      using (ops.has_role(array['editor','sales']))$p$, t.tablename);
  end loop;
end $$;

grant select, insert, update, delete on all tables in schema content to authenticated;
grant all on all tables in schema content to service_role;
