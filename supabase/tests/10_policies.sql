-- Kjøres som superbruker etter migreringer. Feiler (ON_ERROR_STOP) ved brudd.
\set ON_ERROR_STOP on

-- Testdata
insert into auth.users values ('00000000-0000-0000-0000-000000000001', 'redaktor@kontorcompaniet.no'),
                              ('00000000-0000-0000-0000-000000000002', 'ukjent@example.com');
insert into ops.admin_users values ('00000000-0000-0000-0000-000000000001', 'Redaktør', 'editor');
insert into content.brands (slug, name, status, has_page) values ('hag', 'HÅG', 'published', true), ('utkast', 'Utkast', 'draft', false);
insert into content.categories (slug, name, status) values ('kontorstoler', 'Kontorstoler', 'published');
insert into content.products (slug, name, brand_id, primary_category_id, status, price_display, price_from_ex_vat, price_checked_at)
  select 'hag-capisco-8106', 'HÅG Capisco 8106', b.id, c.id, 'published', 'from', 8990, current_date - 400
  from content.brands b, content.categories c where b.slug = 'hag' and c.slug = 'kontorstoler';
insert into content.media_assets (storage_path, alt_text, rights) values ('a.webp', 'Alt', 'own'), ('b.webp', null, 'own'), ('c.webp', 'Alt', 'unknown');

-- 1) anon: views ja, interne tabeller nei, kun publisert
set role anon;
do $$ begin
  assert (select count(*) from public.brands_v) = 1, 'anon skal se kun publiserte merker';
  assert (select count(*) from public.media_v) = 1, 'kun rettighetsavklarte bilder med alt-tekst';
  assert (select price_from_ex_vat from public.products_v where slug = 'hag-capisco-8106') is null, 'ukontrollert pris skal skjules';
  assert (select email_general from public.site_settings_v) = 'post@kontorcompaniet.no', 'kontaktadresse';
end $$;
do $$ begin
  perform 1 from content.brands; raise exception 'anon fikk lese content.brands';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform 1 from scout.items; raise exception 'anon fikk lese scout.items';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform 1 from crm.leads; raise exception 'anon fikk lese crm.leads';
exception when insufficient_privilege then null; end $$;
reset role;

-- 2) innlogget uten rolle ser ingenting internt; redaktør ser innhold men ikke CRM
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false) \gset
do $$ begin assert (select count(*) from content.brands) = 0, 'bruker uten rolle skal ikke se innhold'; end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false) \gset
do $$ begin
  assert (select count(*) from content.brands) = 2, 'redaktør ser alle merker';
  assert (select count(*) from scout.items) = 0 and (select count(*) from crm.leads) = 0, 'redaktør ser ikke CRM/Scout';
end $$;
reset role;

-- 3) regler i skjemaet
do $$ begin
  insert into scout.sources (key, name, adapter, is_active) values ('finn', 'FINN', 'api', true);
  raise exception 'kilde ble aktivert uten juridisk godkjenning';
exception when check_violation then null; end $$;
do $$ begin
  update content.site_settings set email_general = 'info@kcdrammen.no';
  raise exception 'kcdrammen.no ble godtatt som offentlig e-post';
exception when check_violation then null; end $$;
do $$ begin
  insert into content.products (slug, name, brand_id, primary_category_id, price_display)
    select 'feil', 'Feil', b.id, c.id, 'from' from content.brands b, content.categories c limit 1;
  raise exception 'fra-pris uten beløp ble godtatt';
exception when check_violation then null; end $$;

-- 4) slug-endring gir redirect og flater ut kjeder
update content.brands set slug = 'hag-flokk' where slug = 'hag';
update content.brands set slug = 'hag-norge' where slug = 'hag-flokk';
do $$ begin
  assert (select to_path from ops.redirects where from_path = '/merkevarer/hag') = '/merkevarer/hag-norge', 'kjede ikke flatet ut';
  assert (select to_path from ops.redirects where from_path = '/merkevarer/hag-flokk') = '/merkevarer/hag-norge', 'redirect mangler';
end $$;

-- 5) Scout-resultat er ikke tilgjengelig for anon
set role anon;
do $$ begin
  perform 1 from scout.result_v; raise exception 'anon fikk lese scout.result_v';
exception when insufficient_privilege then null; end $$;
reset role;

select 'OK: alle databasetester bestod' as resultat;

-- 6) current_admin(): gir rolle kun for innlogget admin-bruker, og er ikke tilgjengelig for anon
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false) \gset
do $$ begin assert (select role from public.current_admin()) = 'editor', 'current_admin gir feil rolle'; end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false) \gset
do $$ begin assert (select count(*) from public.current_admin()) = 0, 'bruker uten rolle fikk admin'; end $$;
reset role;
set role anon;
do $$ begin
  perform public.current_admin(); raise exception 'anon fikk kalle current_admin';
exception when insufficient_privilege then null; end $$;
reset role;
select 'OK: admin-RPC' as resultat;

-- 7) Supabase-oppsett: RLS på alle interne tabeller, anon kan aldri skrive via public
do $$ declare t text; begin
  select string_agg(format('%I.%I', n.nspname, c.relname), ', ') into t
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where c.relkind in ('r', 'p') and n.nspname in ('content', 'crm', 'scout', 'ops', 'migration') and not c.relrowsecurity;
  assert t is null, 'tabeller uten RLS: ' || t;
  select string_agg(format('%s på %I', p.privilege_type, p.table_name), ', ') into t
  from information_schema.role_table_grants p
  where p.table_schema = 'public' and p.grantee in ('anon', 'PUBLIC') and p.privilege_type <> 'SELECT';
  assert t is null, 'anon har skriverettigheter i public: ' || t;
  select string_agg(format('%I.%I', n.nspname, c.relname), ', ') into t
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r';
  assert t is null, 'tabeller i public (skal kun være views): ' || t;
end $$;

-- 8) løsning ↔ kategori: kun publiserte ender
insert into content.solutions (slug, name, "group", status) values ('moterom', 'Møterom', 'rom', 'published'), ('skjult', 'Skjult', 'rom', 'draft');
insert into content.categories (slug, name, status) values ('utkast-kategori', 'Utkast', 'draft');
insert into content.solution_categories (solution_id, category_id)
  select s.id, c.id from content.solutions s, content.categories c;
set role anon;
do $$ begin
  assert (select count(*) from public.solution_categories_v) = 1, 'solution_categories_v viser upubliserte ender';
  assert (select category_slug from public.solution_categories_v where solution_slug = 'moterom') = 'kontorstoler', 'feil kobling';
end $$;
reset role;
select 'OK: Supabase-oppsett' as resultat;
