-- Utviklings-/testdata. ALDRI i produksjon.
-- Mock-kilden er Kontorcompaniets egne testdata (ingen ekte tredjepartskilde), derfor «approved».
insert into scout.sources (key, name, adapter, categories, interval_minutes, next_run_at, is_active, legal_status, legal_note, legal_approved_by, legal_approved_at)
values ('mock', 'Mock-lager (testdata)', 'mock', '{}', 30, now(), true, 'approved', 'Syntetiske testdata – ingen ekte kilde', 'utvikling', now())
on conflict (key) do nothing;

-- Katalogdata for komplettering («24 brukt + 6 nye»)
insert into content.brands (slug, name, status, has_page) values ('rh', 'RH', 'published', true), ('hag', 'HÅG', 'published', true)
on conflict (slug) do nothing;
insert into content.categories (slug, name, status) values ('kontorstoler', 'Kontorstoler', 'published') on conflict (slug) do nothing;
insert into content.products (slug, name, brand_id, primary_category_id, status, featured)
select 'rh-logic', 'RH Logic', b.id, c.id, 'published', true from content.brands b, content.categories c where b.slug = 'rh' and c.slug = 'kontorstoler'
on conflict (slug) do nothing;
insert into content.products (slug, name, brand_id, primary_category_id, status)
select 'hag-futu', 'HÅG Futu', b.id, c.id, 'published' from content.brands b, content.categories c where b.slug = 'hag' and c.slug = 'kontorstoler'
on conflict (slug) do nothing;
