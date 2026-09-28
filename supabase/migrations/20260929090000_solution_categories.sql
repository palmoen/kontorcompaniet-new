-- ============================================================================
-- Løsning ↔ produktkategori. Løsningssidene lister kategoriene løsningen henger
-- sammen med («Produkter»-lenkene). Uten koblingen mistet Supabase-modus dem.
-- ============================================================================

create table content.solution_categories (
  solution_id uuid not null references content.solutions (id) on delete cascade,
  category_id uuid not null references content.categories (id) on delete cascade,
  sort integer not null default 0,
  primary key (solution_id, category_id)
);

alter table content.solution_categories enable row level security;
create policy editor_all on content.solution_categories for all to authenticated
  using (ops.has_role(array['editor'])) with check (ops.has_role(array['editor']));
create policy staff_read on content.solution_categories for select to authenticated
  using (ops.has_role(array['editor','sales']));
grant select, insert, update, delete on content.solution_categories to authenticated;
grant all on content.solution_categories to service_role;

-- Kun publiserte ender
create or replace view public.solution_categories_v as
  select s.slug as solution_slug, c.slug as category_slug, sc.sort
  from content.solution_categories sc
  join content.solutions s on s.id = sc.solution_id and s.status = 'published'
  join content.categories c on c.id = sc.category_id and c.status = 'published';

-- Supabase gir nye public-objekter brede rettigheter som standard: stram inn eksplisitt
revoke all on public.solution_categories_v from public, anon, authenticated;
grant select on public.solution_categories_v to anon, authenticated;
