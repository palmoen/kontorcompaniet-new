-- ============================================================================
-- Offentlige views: det ENESTE anon kan lese. Kun publisert innhold,
-- kun rettighetsavklarte bilder, kun sitater med bekreftet tillatelse.
-- Views eies av postgres og kjører med eierens rettigheter (bevisst).
-- ============================================================================

create or replace view public.site_settings_v as
  select company_name, legal_name, org_number, street_address, address_note, postal_code, city, country,
         geo_lat, geo_lng, phone, email_general, email_sales, email_service, opening_hours, social,
         founded_year, certifications, updated_at
  from content.site_settings;

create or replace view public.media_v as
  select id, storage_path, width, height, mime, blurhash, alt_text, caption, credit, focal_x, focal_y
  from content.media_assets m
  where content.media_publishable(m);

create or replace view public.brands_v as
  select b.id, b.slug, b.name, b.logo_id, b.hero_media_id, b.website_url, b.country, b.parent_company,
         b.intro_md, b.why_we_use_md, b.sustainability_md, b.facts, b.has_page, b.published_at, b.updated_at,
         b.seo_title, b.seo_description, b.og_image_id, b.robots_override, b.canonical_override
  from content.brands b
  where b.status = 'published';

create or replace view public.categories_v as
  select c.id, c.slug, c.name, p.slug as parent_slug, c.sort, c.intro_md, c.body_source, c.body_mdx_path, c.body_blocks,
         c.hero_media_id, c.published_at, c.updated_at,
         c.seo_title, c.seo_description, c.og_image_id, c.robots_override, c.canonical_override
  from content.categories c
  left join content.categories p on p.id = c.parent_id
  where c.status = 'published';

create or replace view public.brand_categories_v as
  select b.slug as brand_slug, c.slug as category_slug, bc.note
  from content.brand_categories bc
  join content.brands b on b.id = bc.brand_id and b.status = 'published'
  join content.categories c on c.id = bc.category_id and c.status = 'published';

-- Produktkort (v1). Sidefelt tas med slik at fasen med produktsider ikke krever nytt view.
create or replace view public.products_v as
  select p.id, p.slug, p.name, b.slug as brand_slug, b.name as brand_name, c.slug as category_slug,
         p.model_code, p.tagline, p.summary_md, p.use_cases, p.features, p.warranty_years, p.designer,
         p.country_of_origin, p.lead_time_text,
         p.price_display,
         case when p.price_display = 'from' and p.price_checked_at > (current_date - interval '6 months')
              then p.price_from_ex_vat end as price_from_ex_vat,
         p.has_page, p.featured, p.sort, p.published_at, p.updated_at,
         (select pm.media_id from content.product_media pm
            join content.media_assets m on m.id = pm.media_id
           where pm.product_id = p.id and content.media_publishable(m)
           order by (pm.role = 'primary') desc, pm.sort limit 1) as primary_media_id,
         coalesce((select array_agg(ce.slug order by ce.slug) from content.product_certifications pc
                     join content.certifications ce on ce.id = pc.certification_id
                    where pc.product_id = p.id), '{}') as certifications,
         p.seo_title, p.seo_description, p.robots_override, p.canonical_override
  from content.products p
  join content.brands b on b.id = p.brand_id
  join content.categories c on c.id = p.primary_category_id
  where p.status = 'published';

create or replace view public.solutions_v as
  select id, slug, name, "group", summary, body_source, body_mdx_path, body_blocks, hero_media_id, priority, sort,
         published_at, updated_at, seo_title, seo_description, og_image_id, robots_override, canonical_override
  from content.solutions where status = 'published';

create or replace view public.testimonials_v as
  select t.id, t.quote, t.person_name, t.person_title, t.company, pr.slug as project_slug, t.sort
  from content.testimonials t
  left join content.projects pr on pr.id = t.project_id and pr.status = 'published'
  where t.permission_confirmed_at is not null;

create or replace view public.projects_v as
  select p.id, p.slug, p.title,
         case when p.client_display = 'named' then p.client_name end as client_name,
         p.industry, p.location_text, p.municipality, p.year, p.area_m2, p.workstations, p.scope,
         p.challenge_md, p.solution_md, p.result_md, p.hero_media_id, p.video_urls, p.featured, p.sort,
         p.published_at, p.updated_at, p.seo_title, p.seo_description, p.og_image_id, p.robots_override, p.canonical_override,
         (select t.id from content.testimonials t where t.id = p.testimonial_id and t.permission_confirmed_at is not null) as testimonial_id
  from content.projects p where p.status = 'published';

-- Koblingsmodellen som flate views (kun publiserte ender)
create or replace view public.project_links_v as
  select pr.slug as project_slug, 'solution' as kind, s.slug as target_slug, s.name as target_name
    from content.project_solutions x join content.projects pr on pr.id = x.project_id and pr.status = 'published'
    join content.solutions s on s.id = x.solution_id and s.status = 'published'
  union all
  select pr.slug, 'product', p.slug, p.name
    from content.project_products x join content.projects pr on pr.id = x.project_id and pr.status = 'published'
    join content.products p on p.id = x.product_id and p.status = 'published'
  union all
  select pr.slug, 'brand', b.slug, b.name
    from content.project_brands x join content.projects pr on pr.id = x.project_id and pr.status = 'published'
    join content.brands b on b.id = x.brand_id and b.status = 'published';

create or replace view public.articles_v as
  select a.id, a.slug, a.title, a.excerpt, pe.name as author_name, a.body_source, a.body_mdx_path, a.body_blocks,
         a.hero_media_id, a.updated_at_display, a.published_at, a.updated_at,
         a.seo_title, a.seo_description, a.og_image_id, a.robots_override, a.canonical_override
  from content.articles a left join content.people pe on pe.id = a.author_id
  where a.status = 'published';

create or replace view public.people_v as
  select id, name, role_title, phone, email, photo_id, bio, linkedin_url, handles, sort
  from content.people where is_public;

create or replace view public.clients_v as
  select id, name, logo_id, website_url, sort from content.clients where show_in_logo_wall;

create or replace view public.redirects_v as
  select from_path, to_path, status_code from ops.redirects;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.site_settings_v, public.media_v, public.brands_v, public.categories_v, public.brand_categories_v,
                public.products_v, public.solutions_v, public.testimonials_v, public.projects_v, public.project_links_v,
                public.articles_v, public.people_v, public.clients_v, public.redirects_v
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Kundens Scout-resultat: KUN presentasjonsdata. Ikke tilgjengelig for anon;
-- server-kode slår opp på result_token med service-rollen.
-- ---------------------------------------------------------------------------
create or replace view scout.result_v as
  select r.result_token, r.id as request_id, r.status as request_status, r.need,
         m.id as match_id, m.request_line_no, m.score, m.explanation, m.covered_qty, m.completion,
         m.customer_price_ex_vat, m.status as match_status,
         ip.display_name, ip.display_description, ip.media_ids, ip.catalog_product_id,
         i.quantity, i.condition, i.color, i.material, i.municipality
  from scout.requests r
  join scout.matches m on m.request_id = r.id and m.status in ('approved', 'presented', 'interested', 'rejected')
  join scout.items i on i.id = m.item_id
  join scout.item_presentation ip on ip.item_id = i.id and ip.approved_at is not null;
revoke all on scout.result_v from public, anon, authenticated;
grant select on scout.result_v to service_role;

-- ---------------------------------------------------------------------------
-- Standard nettstedsinnstillinger (kan endres i admin)
-- ---------------------------------------------------------------------------
insert into content.site_settings (street_address, address_note, postal_code, city, phone, email_general, opening_hours, social, certifications)
values ('Tollbugata 115', 'Inngang A, 2. etg.', '3041', 'Drammen', '+47 32 88 20 20', 'post@kontorcompaniet.no',
        '[{"days": "Mo-Fr", "opens": "08:00", "closes": "16:00", "label": "Showroom"}]',
        '{"linkedin": "https://www.linkedin.com/company/kontorcompaniet-as/", "instagram": "https://www.instagram.com/kontorcompaniet/", "facebook": "https://www.facebook.com/kontorcompaniet/", "vimeo": "https://vimeo.com/kontorcompaniet"}',
        array['Miljøfyrtårn', 'Grønt Punkt'])
on conflict (id) do nothing;
