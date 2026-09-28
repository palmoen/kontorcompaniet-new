-- ============================================================================
-- Prosjektsiden: fast beskrivelse og kreditering av arkitekt.
-- Involverte produsenter ligger allerede i content.project_brands.
-- ============================================================================

alter table content.projects
  add column description_md text,
  add column architect_name text,
  add column architect_url text check (architect_url is null or architect_url like 'https://%');

-- Nye kolonner legges til sist (create or replace view kan bare utvide). Rettighetene beholdes.
create or replace view public.projects_v as
  select p.id, p.slug, p.title,
         case when p.client_display = 'named' then p.client_name end as client_name,
         p.industry, p.location_text, p.municipality, p.year, p.area_m2, p.workstations, p.scope,
         p.challenge_md, p.solution_md, p.result_md, p.hero_media_id, p.video_urls, p.featured, p.sort,
         p.published_at, p.updated_at, p.seo_title, p.seo_description, p.og_image_id, p.robots_override, p.canonical_override,
         (select t.id from content.testimonials t where t.id = p.testimonial_id and t.permission_confirmed_at is not null) as testimonial_id,
         p.description_md, p.architect_name, p.architect_url
  from content.projects p where p.status = 'published';
