-- GENERERT av scripts/build-content-seed.ts fra src/lib/content/seed.ts. Ikke rediger for hånd:
-- endre seed.ts og kjør `npm run content:seed`.
-- Idempotent startinnhold for produksjon. Eksisterende rader røres ikke (admin-endringer beholdes).
-- Uten egen transaksjon (Supabase CLI styrer den); hver setning tåler å kjøres på nytt.

-- Nettstedsinnstillinger: raden lages i migreringen; fyll inn det som mangler
update content.site_settings set org_number = '930 584 630' where org_number is null;

insert into content.categories (slug, name, sort, status, published_at) values
  ('kontorstoler', 'Kontorstoler', 1, 'published', now()),
  ('moteromsstoler', 'Møteromsstoler', 2, 'published', now()),
  ('kantinestoler', 'Kantinestoler', 3, 'published', now()),
  ('skrivebord', 'Skrivebord', 4, 'published', now()),
  ('motebord', 'Møtebord', 5, 'published', now()),
  ('oppbevaring', 'Oppbevaring', 6, 'published', now()),
  ('sofa-og-lounge', 'Sofa og lounge', 7, 'published', now()),
  ('akustikk', 'Akustikk', 8, 'published', now()),
  ('tilbehor', 'Tilbehør', 9, 'published', now())
on conflict (slug) do nothing;

insert into content.brands (slug, name, country, parent_company, website_url, has_page, status, published_at) values
  ('hag', 'HÅG', 'Norge', 'Flokk', null, true, 'published', now()),
  ('rh', 'RH', null, 'Flokk', null, true, 'published', now()),
  ('sedus', 'Sedus', 'Tyskland', null, null, true, 'published', now()),
  ('vitra', 'Vitra', 'Sveits', null, null, true, 'published', now()),
  ('fora-form', 'Fora Form', 'Norge', null, null, true, 'published', now()),
  ('dencon', 'Dencon', 'Danmark', null, null, true, 'published', now()),
  ('evoline', 'Evoline', null, null, null, true, 'published', now()),
  ('muuto', 'Muuto', 'Danmark', null, null, true, 'published', now()),
  ('abstracta', 'Abstracta', 'Sverige', null, null, true, 'published', now()),
  ('horreds', 'Horreds', 'Sverige', null, null, true, 'published', now()),
  ('varier', 'Varier', null, null, null, false, 'published', now()),
  ('savo', 'Savo', null, null, null, false, 'published', now()),
  ('rbm', 'RBM', null, null, null, false, 'published', now()),
  ('ncp', 'NCP', null, null, null, false, 'published', now()),
  ('backapp', 'BackApp', null, null, null, false, 'published', now()),
  ('kontorsenteret', 'Kontorsenteret', null, null, null, false, 'published', now()),
  ('montana', 'Montana', null, null, null, false, 'published', now()),
  ('lammhults', 'Lammhults', null, null, null, false, 'published', now()),
  ('randers-radius', 'Randers+Radius', null, null, null, false, 'published', now()),
  ('ole-lium', 'Ole Lium', null, null, null, false, 'published', now()),
  ('cube-design', 'Cube Design', null, null, null, false, 'published', now()),
  ('sarpsborg-metall', 'Sarpsborg Metall', null, null, null, false, 'published', now()),
  ('glimakra', 'Glimakra', null, null, null, false, 'published', now()),
  ('osnes', 'Osnes', null, null, null, false, 'published', now()),
  ('gotessons', 'Gøtessons', null, null, null, false, 'published', now()),
  ('hay', 'Hay', null, null, null, false, 'published', now()),
  ('fredericia', 'Fredericia', null, null, null, false, 'published', now()),
  ('magis', 'Magis', null, null, null, false, 'published', now()),
  ('tacchini', 'Tacchini', null, null, null, false, 'published', now()),
  ('alias', 'Alias', null, null, null, false, 'published', now()),
  ('alki', 'Alki', null, null, null, false, 'published', now()),
  ('arper', 'Arper', null, null, null, false, 'published', now()),
  ('artwood', 'Artwood', null, null, null, false, 'published', now()),
  ('dauphin', 'Dauphin', null, null, null, false, 'published', now()),
  ('ekornes', 'Ekornes', null, null, null, false, 'published', now()),
  ('englesson', 'Englesson', null, null, null, false, 'published', now()),
  ('eskoleia', 'Eskoleia', null, null, null, false, 'published', now()),
  ('fantoni', 'Fantoni', null, null, null, false, 'published', now()),
  ('fischer', 'Fischer', null, null, null, false, 'published', now()),
  ('fogia', 'Fogia', null, null, null, false, 'published', now()),
  ('glamox-luxo', 'Glamox Luxo', null, null, null, false, 'published', now()),
  ('hjellegjerde', 'Hjellegjerde', null, null, null, false, 'published', now()),
  ('idt', 'IDT', null, null, null, false, 'published', now()),
  ('jensen', 'Jensen', null, null, null, false, 'published', now()),
  ('lapalma', 'Lapalma', null, null, null, false, 'published', now()),
  ('lk-hjelle', 'LK Hjelle', null, null, null, false, 'published', now()),
  ('normann-copenhagen', 'Normann Copenhagen', null, null, null, false, 'published', now()),
  ('northern-lighting', 'Northern Lighting', null, null, null, false, 'published', now()),
  ('offitec', 'Offitec', null, null, null, false, 'published', now()),
  ('prima-office', 'Prima Office', null, null, null, false, 'published', now()),
  ('profim', 'Profim', null, null, null, false, 'published', now()),
  ('trece', 'Trece', null, null, null, false, 'published', now())
on conflict (slug) do nothing;

insert into content.brand_categories (brand_id, category_id)
select b.id, c.id from (values
  ('hag', 'kontorstoler'),
  ('hag', 'kantinestoler'),
  ('rh', 'kontorstoler'),
  ('sedus', 'kontorstoler'),
  ('sedus', 'kantinestoler'),
  ('vitra', 'kontorstoler'),
  ('vitra', 'moteromsstoler'),
  ('vitra', 'sofa-og-lounge'),
  ('fora-form', 'moteromsstoler'),
  ('fora-form', 'motebord'),
  ('fora-form', 'sofa-og-lounge'),
  ('dencon', 'skrivebord'),
  ('dencon', 'motebord'),
  ('dencon', 'oppbevaring'),
  ('evoline', 'tilbehor'),
  ('muuto', 'sofa-og-lounge'),
  ('abstracta', 'akustikk'),
  ('horreds', 'motebord'),
  ('horreds', 'skrivebord'),
  ('horreds', 'oppbevaring'),
  ('varier', 'kontorstoler'),
  ('varier', 'kantinestoler'),
  ('savo', 'kontorstoler'),
  ('rbm', 'kontorstoler'),
  ('ncp', 'kontorstoler'),
  ('ncp', 'moteromsstoler'),
  ('ncp', 'kantinestoler'),
  ('backapp', 'kontorstoler'),
  ('kontorsenteret', 'kontorstoler'),
  ('kontorsenteret', 'sofa-og-lounge'),
  ('kontorsenteret', 'oppbevaring'),
  ('kontorsenteret', 'skrivebord'),
  ('montana', 'motebord'),
  ('montana', 'sofa-og-lounge'),
  ('montana', 'oppbevaring'),
  ('montana', 'skrivebord'),
  ('lammhults', 'moteromsstoler'),
  ('lammhults', 'motebord'),
  ('randers-radius', 'motebord'),
  ('randers-radius', 'kantinestoler'),
  ('ole-lium', 'motebord'),
  ('ole-lium', 'oppbevaring'),
  ('ole-lium', 'skrivebord'),
  ('cube-design', 'motebord'),
  ('cube-design', 'oppbevaring'),
  ('cube-design', 'skrivebord'),
  ('sarpsborg-metall', 'oppbevaring'),
  ('sarpsborg-metall', 'motebord'),
  ('glimakra', 'akustikk'),
  ('osnes', 'akustikk'),
  ('gotessons', 'akustikk'),
  ('hay', 'sofa-og-lounge'),
  ('hay', 'kantinestoler'),
  ('fredericia', 'sofa-og-lounge'),
  ('magis', 'sofa-og-lounge'),
  ('magis', 'kantinestoler'),
  ('tacchini', 'sofa-og-lounge'),
  ('tacchini', 'kantinestoler'),
  ('alias', 'kantinestoler'),
  ('alias', 'sofa-og-lounge'),
  ('alki', 'motebord'),
  ('arper', 'sofa-og-lounge'),
  ('eskoleia', 'oppbevaring'),
  ('fantoni', 'akustikk'),
  ('idt', 'tilbehor'),
  ('lapalma', 'sofa-og-lounge'),
  ('normann-copenhagen', 'kantinestoler'),
  ('offitec', 'tilbehor'),
  ('prima-office', 'oppbevaring'),
  ('trece', 'oppbevaring')
) v (brand, category)
join content.brands b on b.slug = v.brand join content.categories c on c.slug = v.category
on conflict do nothing;

insert into content.solutions (slug, name, "group", summary, priority, sort, status, published_at) values
  ('kontorinnredning', 'Kontorinnredning', 'rom', null, 'P1', 1, 'published', now()),
  ('kontorlandskap', 'Kontorlandskap', 'rom', null, 'P1', 2, 'published', now()),
  ('moterom', 'Møterom', 'rom', null, 'P1', 3, 'published', now()),
  ('kantine', 'Kantine', 'rom', null, 'P1', 4, 'published', now()),
  ('akustikk', 'Akustikk', 'rom', null, 'P1', 5, 'published', now()),
  ('ergonomi', 'Ergonomi', 'rom', null, 'P1', 6, 'published', now()),
  ('stillerom', 'Stillerom', 'rom', null, 'P2', 7, 'published', now()),
  ('gjenbruk', 'Gjenbruk', 'tjeneste', null, 'P1', 8, 'published', now()),
  ('leasing', 'Leasing', 'tjeneste', null, 'P1', 9, 'published', now()),
  ('prosjektledelse', 'Prosjektledelse', 'tjeneste', null, 'P2', 10, 'published', now()),
  ('levering-og-montering', 'Levering og montering', 'tjeneste', null, 'P2', 11, 'published', now()),
  ('service', 'Service', 'tjeneste', null, 'P2', 12, 'published', now())
on conflict (slug) do nothing;

insert into content.solution_categories (solution_id, category_id, sort)
select s.id, c.id, v.sort from (values
  ('kontorinnredning', 'kontorstoler', 0),
  ('kontorinnredning', 'skrivebord', 1),
  ('kontorinnredning', 'motebord', 2),
  ('kontorinnredning', 'oppbevaring', 3),
  ('kontorinnredning', 'sofa-og-lounge', 4),
  ('kontorlandskap', 'skrivebord', 0),
  ('kontorlandskap', 'kontorstoler', 1),
  ('kontorlandskap', 'oppbevaring', 2),
  ('kontorlandskap', 'akustikk', 3),
  ('moterom', 'motebord', 0),
  ('moterom', 'moteromsstoler', 1),
  ('moterom', 'akustikk', 2),
  ('moterom', 'tilbehor', 3),
  ('kantine', 'kantinestoler', 0),
  ('kantine', 'motebord', 1),
  ('kantine', 'sofa-og-lounge', 2),
  ('kantine', 'akustikk', 3),
  ('akustikk', 'akustikk', 0),
  ('akustikk', 'sofa-og-lounge', 1),
  ('akustikk', 'oppbevaring', 2),
  ('ergonomi', 'kontorstoler', 0),
  ('ergonomi', 'skrivebord', 1),
  ('ergonomi', 'tilbehor', 2),
  ('stillerom', 'akustikk', 0),
  ('gjenbruk', 'kontorstoler', 0),
  ('gjenbruk', 'skrivebord', 1),
  ('gjenbruk', 'kantinestoler', 2),
  ('service', 'kontorstoler', 0)
) v (solution, category, sort)
join content.solutions s on s.slug = v.solution join content.categories c on c.slug = v.category
on conflict do nothing;

insert into content.certifications (slug, name) values
  ('epd', 'EPD'),
  ('greenguard', 'Greenguard'),
  ('mobelfakta', 'Møbelfakta'),
  ('fsc', 'FSC'),
  ('svanen', 'Svanemerket')
on conflict (slug) do nothing;

insert into content.products (slug, name, brand_id, primary_category_id, tagline, featured, sort, status, published_at)
select v.slug, v.name, b.id, c.id, v.tagline, v.featured, v.sort, 'published', now() from (values
  ('hag-capisco-8106', 'HÅG Capisco 8106', 'hag', 'kontorstoler', 'Sadelstol for aktiv sitting og høye arbeidsflater', true, 1),
  ('hag-futu-mesh-1100-s', 'HÅG Futu Mesh', 'hag', 'kontorstoler', 'Enkel å justere, god til delte arbeidsplasser', true, 2),
  ('hag-sofi-mesh-7500', 'HÅG Sofi Mesh', 'hag', 'kontorstoler', 'Lett og luftig stol med nettingrygg', false, 3),
  ('hag-tribute', 'HÅG Tribute', 'hag', 'kontorstoler', 'Fås med og uten nakkestøtte (9021 og 9031)', false, 4),
  ('hag-creed-6006-kontorstol', 'HÅG Creed', 'hag', 'kontorstoler', 'Robust stol for dem som sitter mye', false, 5),
  ('hag-celi-9100', 'HÅG Celi', 'hag', 'moteromsstoler', 'Enkel stol for møterom og hjemmekontor', false, 6),
  ('vitra-id-trim', 'Vitra ID Trim', 'vitra', 'kontorstoler', 'Kontorstol tegnet av Antonio Citterio, også med nettingrygg', true, 7),
  ('vitra-physix', 'Vitra Physix', 'vitra', 'kontorstoler', 'Fleksibel rygg som følger bevegelsene', false, 8),
  ('profim-noor-6050', 'Profim Noor', 'profim', 'kontorstoler', 'Kontorstol med EPD og Greenguard', false, 9),
  ('fora-form-bud-unite-konferansestol', 'Fora Form Bud Unite', 'fora-form', 'moteromsstoler', 'Norsk konferansestol med mykt uttrykk', true, 10),
  ('fora-form-city-4-ben', 'Fora Form City', 'fora-form', 'moteromsstoler', 'Robust stol på fire ben', false, 11),
  ('vitra-soft-pad-chair', 'Vitra Soft Pad Chair', 'vitra', 'moteromsstoler', 'Eames-klassiker for styrerom (EA 217 og EA 219)', false, 12),
  ('vitra-eames-plastic-side-chair-dsr', 'Vitra Eames Plastic Side Chair', 'vitra', 'kantinestoler', 'Lettstelt designklassiker i mange farger', true, 13),
  ('hay-about-a-chair-222', 'Hay About a Chair', 'hay', 'kantinestoler', 'Solid stol for kantine og sosiale soner', false, 14),
  ('dencon-skrivebord', 'Dencon hev/senk-skrivebord', 'dencon', 'skrivebord', 'Elektrisk hev/senk eller fast høyde, flere størrelser', true, 15),
  ('dencon-delta-konferansebord', 'Dencon Delta', 'dencon', 'motebord', 'Konferansebord i seks størrelser', true, 16),
  ('fora-form-kvart-motebord', 'Fora Form Kvart', 'fora-form', 'motebord', 'Møtebord fra 200 til 260 cm', false, 17),
  ('dencon-skap', 'Dencon skap', 'dencon', 'oppbevaring', 'Skap i flere høyder, 2 til 4 A4', false, 18),
  ('dencon-uttrekksskap', 'Dencon uttrekksskap', 'dencon', 'oppbevaring', 'Uttrekksskap for faste arbeidsplasser', false, 19),
  ('fora-form-senso-hoy', 'Fora Form Senso Høy', 'fora-form', 'sofa-og-lounge', 'Sofa med høy rygg som skjermer for lyd og innsyn', true, 20),
  ('vitra-eames-loungechair', 'Vitra Eames Lounge Chair', 'vitra', 'sofa-og-lounge', 'Ikonisk lenestol fra 1956', false, 21),
  ('muuto-outline-3-seter', 'Muuto Outline', 'muuto', 'sofa-og-lounge', 'Enkel og solid sofa, 3-seter', false, 22),
  ('fogia-bollo', 'Fogia Bollo', 'fogia', 'sofa-og-lounge', 'Lenestol tegnet av Andreas Engelsvik', false, 23),
  ('abstracta-soneo-bordskjerm', 'Abstracta Soneo', 'abstracta', 'akustikk', 'Bordskjerm i bredder fra 120 til 160 cm', false, 24),
  ('evoline-circle80', 'Evoline Circle80', 'evoline', 'tilbehor', 'Innfelt strømmodul, også med trådløs lading (DisQ)', false, 25),
  ('evoline-express', 'Evoline Express', 'evoline', 'tilbehor', 'Klikksystem for strøm mellom bord', false, 26)
) v (slug, name, brand, category, tagline, featured, sort)
join content.brands b on b.slug = v.brand join content.categories c on c.slug = v.category
on conflict (slug) do nothing;

insert into content.product_certifications (product_id, certification_id)
select p.id, ce.id from (values
  ('hag-futu-mesh-1100-s', 'epd'),
  ('hag-futu-mesh-1100-s', 'greenguard'),
  ('hag-futu-mesh-1100-s', 'mobelfakta'),
  ('hag-tribute', 'epd'),
  ('hag-tribute', 'greenguard'),
  ('hag-tribute', 'mobelfakta'),
  ('hag-creed-6006-kontorstol', 'epd'),
  ('hag-creed-6006-kontorstol', 'greenguard'),
  ('hag-creed-6006-kontorstol', 'mobelfakta'),
  ('hag-celi-9100', 'epd'),
  ('hag-celi-9100', 'greenguard'),
  ('hag-celi-9100', 'mobelfakta'),
  ('vitra-id-trim', 'epd'),
  ('vitra-physix', 'epd'),
  ('profim-noor-6050', 'epd'),
  ('profim-noor-6050', 'greenguard'),
  ('profim-noor-6050', 'mobelfakta'),
  ('fora-form-bud-unite-konferansestol', 'epd'),
  ('fora-form-bud-unite-konferansestol', 'mobelfakta'),
  ('fora-form-city-4-ben', 'epd'),
  ('fora-form-city-4-ben', 'mobelfakta'),
  ('vitra-eames-plastic-side-chair-dsr', 'epd'),
  ('dencon-skrivebord', 'fsc'),
  ('dencon-delta-konferansebord', 'fsc'),
  ('fora-form-kvart-motebord', 'epd'),
  ('fora-form-kvart-motebord', 'mobelfakta'),
  ('dencon-skap', 'fsc'),
  ('dencon-uttrekksskap', 'fsc'),
  ('fora-form-senso-hoy', 'epd'),
  ('fora-form-senso-hoy', 'mobelfakta'),
  ('vitra-eames-loungechair', 'epd'),
  ('abstracta-soneo-bordskjerm', 'epd'),
  ('abstracta-soneo-bordskjerm', 'mobelfakta')
) v (product, cert)
join content.products p on p.slug = v.product join content.certifications ce on ce.slug = v.cert
on conflict do nothing;

-- Produktbilder fra dagens nettsted (public/images/produkter). Rettighetene er IKKE bekreftet
-- (docs/00, åpent spørsmål 8), så de vises ikke før rights settes til 'manufacturer_licensed'.
insert into content.media_assets (storage_path, mime, alt_text, rights, rights_note) values
  ('/images/produkter/hag-capisco-8106.webp', 'image/webp', 'HÅG Capisco 8106', 'unknown', 'Hentet fra dagens kontorcompaniet.no, trolig produsentbilde. Bekreft lisens før publisering.'),
  ('/images/produkter/hag-futu-mesh-1100-s.webp', 'image/webp', 'HÅG Futu Mesh', 'unknown', 'Hentet fra dagens kontorcompaniet.no, trolig produsentbilde. Bekreft lisens før publisering.'),
  ('/images/produkter/hag-sofi-mesh-7500.webp', 'image/webp', 'HÅG Sofi Mesh', 'unknown', 'Hentet fra dagens kontorcompaniet.no, trolig produsentbilde. Bekreft lisens før publisering.'),
  ('/images/produkter/hag-tribute.webp', 'image/webp', 'HÅG Tribute', 'unknown', 'Hentet fra dagens kontorcompaniet.no, trolig produsentbilde. Bekreft lisens før publisering.'),
  ('/images/produkter/hag-creed-6006-kontorstol.webp', 'image/webp', 'HÅG Creed', 'unknown', 'Hentet fra dagens kontorcompaniet.no, trolig produsentbilde. Bekreft lisens før publisering.'),
  ('/images/produkter/hag-celi-9100.webp', 'image/webp', 'HÅG Celi', 'unknown', 'Hentet fra dagens kontorcompaniet.no, trolig produsentbilde. Bekreft lisens før publisering.'),
  ('/images/produkter/vitra-id-trim.webp', 'image/webp', 'Vitra ID Trim', 'unknown', 'Hentet fra dagens kontorcompaniet.no, trolig produsentbilde. Bekreft lisens før publisering.'),
  ('/images/produkter/fora-form-bud-unite-konferansestol.webp', 'image/webp', 'Fora Form Bud Unite', 'unknown', 'Hentet fra dagens kontorcompaniet.no, trolig produsentbilde. Bekreft lisens før publisering.'),
  ('/images/produkter/fora-form-city-4-ben.webp', 'image/webp', 'Fora Form City', 'unknown', 'Hentet fra dagens kontorcompaniet.no, trolig produsentbilde. Bekreft lisens før publisering.'),
  ('/images/produkter/dencon-delta-konferansebord.webp', 'image/webp', 'Dencon Delta', 'unknown', 'Hentet fra dagens kontorcompaniet.no, trolig produsentbilde. Bekreft lisens før publisering.'),
  ('/images/produkter/fora-form-kvart-motebord.webp', 'image/webp', 'Fora Form Kvart', 'unknown', 'Hentet fra dagens kontorcompaniet.no, trolig produsentbilde. Bekreft lisens før publisering.'),
  ('/images/produkter/fora-form-senso-hoy.webp', 'image/webp', 'Fora Form Senso Høy', 'unknown', 'Hentet fra dagens kontorcompaniet.no, trolig produsentbilde. Bekreft lisens før publisering.'),
  ('/images/produkter/vitra-eames-loungechair.webp', 'image/webp', 'Vitra Eames Lounge Chair', 'unknown', 'Hentet fra dagens kontorcompaniet.no, trolig produsentbilde. Bekreft lisens før publisering.')
on conflict (storage_path) do nothing;

insert into content.product_media (product_id, media_id, role)
select p.id, m.id, 'primary' from (values
  ('hag-capisco-8106', '/images/produkter/hag-capisco-8106.webp'),
  ('hag-futu-mesh-1100-s', '/images/produkter/hag-futu-mesh-1100-s.webp'),
  ('hag-sofi-mesh-7500', '/images/produkter/hag-sofi-mesh-7500.webp'),
  ('hag-tribute', '/images/produkter/hag-tribute.webp'),
  ('hag-creed-6006-kontorstol', '/images/produkter/hag-creed-6006-kontorstol.webp'),
  ('hag-celi-9100', '/images/produkter/hag-celi-9100.webp'),
  ('vitra-id-trim', '/images/produkter/vitra-id-trim.webp'),
  ('fora-form-bud-unite-konferansestol', '/images/produkter/fora-form-bud-unite-konferansestol.webp'),
  ('fora-form-city-4-ben', '/images/produkter/fora-form-city-4-ben.webp'),
  ('dencon-delta-konferansebord', '/images/produkter/dencon-delta-konferansebord.webp'),
  ('fora-form-kvart-motebord', '/images/produkter/fora-form-kvart-motebord.webp'),
  ('fora-form-senso-hoy', '/images/produkter/fora-form-senso-hoy.webp'),
  ('vitra-eames-loungechair', '/images/produkter/vitra-eames-loungechair.webp')
) v (product, path)
join content.products p on p.slug = v.product join content.media_assets m on m.storage_path = v.path
on conflict do nothing;

insert into content.projects (slug, title, client_name, client_display, location_text, year, workstations, scope,
                              challenge_md, solution_md, result_md, description_md, architect_name, architect_url,
                              video_urls, featured, sort, status, published_at) values
  ('norwegian-fornebu', 'Norwegian: 750 arbeidsplasser på Fornebu', 'Norwegian', 'named', 'Fornebu', null, 750, 'Kontor, konferanse, kantine og sosiale soner', 'Norwegian skulle samle hovedkontoret på Fornebu: 750 arbeidsplasser med tilhørende konferanse-, kantine- og sosiale møbler, i Norwegians egen fargepalett.', 'Vi dro på leverandørbesøk for å velge tekstiler og farger som passet Norwegians profil, planla leveransen i etapper og koordinerte levering og montering.', 'Fire intense uker med montering endte med ferdigbefaring og et hovedkontor klart til bruk.', null, null, null, array['https://vimeo.com/316655909']::text[], true, 1, 'published', now()),
  ('ice-nydalen', 'Ice: aktivitetsbaserte lokaler over tre etasjer i Nydalen', 'Ice', 'named', 'Nydalen, Oslo', null, null, 'Komplette aktivitetsbaserte lokaler over tre etasjer', 'Lokalene skulle bygges for aktivitetsbasert arbeid: ingen faste plasser, men ulike soner for ulike oppgaver. Det krever flere typer arbeidsplasser enn et tradisjonelt landskap, og en tydelig plan for hva som skal skje hvor, fordelt på tre etasjer.', 'Vi planla sonene og møbleringen etasje for etasje: arbeidsplasser i landskap, møterom og uformelle møteplasser, og sosiale soner. Vi koordinerte leveransene fra produsentene og sto for levering og montering i alle tre etasjene.', 'Tre etasjer levert ferdig møblert og klare for aktivitetsbasert arbeid.', 'Ice samlet virksomheten i nye lokaler i Nydalen i Oslo. Vi leverte komplette aktivitetsbaserte lokaler over tre etasjer.', null, null, array['https://vimeo.com/269939976']::text[], false, 2, 'published', now()),
  ('yara-skoyen', 'Yara: en komplett etasje på Skøyen', 'Yara', 'named', 'Skøyen, Oslo', null, null, 'Arbeidsplasser, sosiale soner, stillerom, møterom og pods', 'En hel etasje skulle fungere både for konsentrert arbeid og for samarbeid. Det betyr arbeidsplasser i landskap, men også steder å trekke seg tilbake til og rom for møter i ulike størrelser.', 'Vi leverte arbeidsplasser, møterom og sosiale soner, og supplerte med stillerom og pods for telefonsamtaler og arbeid som krever ro. Plasseringen av stillerom og pods ble planlagt sammen med resten av etasjen, slik at de ligger der de gjør mest nytte.', 'En komplett etasje med rom for både samarbeid og konsentrasjon, levert ferdig montert.', 'For Yara på Skøyen i Oslo møblerte vi en komplett etasje, fra arbeidsplasser til stillerom og pods.', null, null, array['https://vimeo.com/439311013']::text[], false, 3, 'published', now()),
  ('kontorhuset-lierstranda', 'Kontorhuset: kontorfellesskap på Lierstranda', 'Kontorhuset', 'named', 'Lierstranda, Lier', null, null, 'Cellekontorer, møterom, teamkontorer og sosiale soner', 'I et kontorfellesskap deler mange ulike bedrifter de samme lokalene. Kontorene må fungere for leietakere med ulike behov, og fellesarealene må tåle mye bruk og mange brukere.', 'Vi leverte cellekontorer og teamkontorer for leietakerne, møterom som deles, og sosiale soner der folk fra ulike bedrifter møtes. Leveransen ble planlagt og montert som én helhet.', 'Et komplett møblert kontorfellesskap, klart for leietakerne.', 'Kontorhuset på Lierstranda er et kontorfellesskap. Vi sto for den komplette leveransen, fra cellekontorer til sosiale soner.', null, null, array['https://vimeo.com/269852960']::text[], false, 4, 'published', now()),
  ('axactor-gronland', 'Axactor: nye lokaler over to etasjer på Grønland', 'Axactor', 'named', 'Grønland, Drammen', null, null, 'Landskap, møterom og sosiale soner over to etasjer', 'Nye lokaler over to etasjer skulle møbleres fra bunnen av, med arbeidsplasser i landskap, møterom og steder der de ansatte kan møtes uformelt.', 'Vi planla møbleringen for begge etasjene, med landskap for arbeidsplassene, møterom i ulike størrelser og sosiale soner. Vi sto for levering og montering.', 'To etasjer møblert og klare til innflytting.', 'Axactor flyttet inn i nye lokaler på Grønland i Drammen. Vi møblerte to etasjer med landskap, møterom og sosiale soner.', null, null, array[]::text[], false, 5, 'published', now()),
  ('viken-fiber-gronland', 'Viken Fiber: møterom og sosiale soner på Grønland', 'Viken Fiber', 'named', 'Grønland, Drammen', null, null, 'Møterom og sosiale soner', 'Viken Fiber trengte møterom og sosiale soner som fungerer i hverdagen, både til formelle møter og til de uformelle samtalene.', 'Vi leverte møblering til møterommene og de sosiale sonene, og sto for levering og montering.', 'Møterom og sosiale soner levert ferdig montert.', 'For Viken Fiber på Grønland i Drammen leverte vi møterom og sosiale soner.', null, null, array[]::text[], false, 6, 'published', now()),
  ('kjellstad-naeringspark', 'Kjellstad Næringspark: kantine for hele næringsbygget', 'Kjellstad Næringspark', 'named', 'Lierstranda, Lier', null, null, 'Kantine for hele næringsbygget', 'En kantine for et helt næringsbygg brukes av mange bedrifter og mange mennesker hver dag. Møblene må tåle mye bruk og hyppig vask, og rommet må fungere både i lunsjen og resten av dagen.', 'Vi leverte kantinemøblene til hele næringsbygget, og sto for levering og montering.', 'En felles kantine for alle bedriftene i bygget, levert ferdig montert.', 'Kjellstad Næringspark på Lierstranda har én felles kantine for alle bedriftene i bygget. Vi leverte møblene til kantinen.', null, null, array[]::text[], false, 7, 'published', now())
on conflict (slug) do nothing;

insert into content.project_solutions (project_id, solution_id)
select pr.id, t.id from (values
  ('norwegian-fornebu', 'kontorinnredning'),
  ('norwegian-fornebu', 'kontorlandskap'),
  ('norwegian-fornebu', 'moterom'),
  ('norwegian-fornebu', 'kantine'),
  ('norwegian-fornebu', 'prosjektledelse'),
  ('norwegian-fornebu', 'levering-og-montering'),
  ('ice-nydalen', 'kontorinnredning'),
  ('ice-nydalen', 'kontorlandskap'),
  ('ice-nydalen', 'moterom'),
  ('ice-nydalen', 'prosjektledelse'),
  ('ice-nydalen', 'levering-og-montering'),
  ('yara-skoyen', 'kontorinnredning'),
  ('yara-skoyen', 'kontorlandskap'),
  ('yara-skoyen', 'moterom'),
  ('yara-skoyen', 'stillerom'),
  ('yara-skoyen', 'akustikk'),
  ('kontorhuset-lierstranda', 'kontorinnredning'),
  ('kontorhuset-lierstranda', 'moterom'),
  ('kontorhuset-lierstranda', 'prosjektledelse'),
  ('kontorhuset-lierstranda', 'levering-og-montering'),
  ('axactor-gronland', 'kontorinnredning'),
  ('axactor-gronland', 'kontorlandskap'),
  ('axactor-gronland', 'moterom'),
  ('axactor-gronland', 'levering-og-montering'),
  ('viken-fiber-gronland', 'moterom'),
  ('viken-fiber-gronland', 'levering-og-montering'),
  ('kjellstad-naeringspark', 'kantine'),
  ('kjellstad-naeringspark', 'levering-og-montering')
) v (project, target)
join content.projects pr on pr.slug = v.project join content.solutions t on t.slug = v.target
on conflict do nothing;

-- Sitater publiseres ikke før tillatelsen er bekreftet (permission_confirmed_at)
insert into content.testimonials (quote, person_name, person_title, company, project_id, permission_confirmed_at, sort)
select v.quote, v.person_name, v.person_title, v.company, pr.id, case when v.confirmed then now() end, v.sort from (values
  ('These people delivered and we as the customer could not wish for any other result. We highly recommend Kontorcompaniet!', 'Jørgen Horlings', 'Head of Facility Management', 'Norwegian ASA', 'norwegian-fornebu', false, 1)
) v (quote, person_name, person_title, company, project, confirmed, sort)
left join content.projects pr on pr.slug = v.project
where not exists (select 1 from content.testimonials t where t.quote = v.quote);

insert into content.people (name, role_title, phone, email, handles, sort)
select v.name, v.role_title, v.phone, v.email::citext, v.handles, v.sort from (values
  ('Pål Moen', 'Daglig leder og salg', null, null, array['salg', 'scout']::text[], 1)
) v (name, role_title, phone, email, handles, sort)
where not exists (select 1 from content.people pe where pe.name = v.name);
