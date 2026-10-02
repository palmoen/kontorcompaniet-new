/**
 * Seed-innhold for utvikling, CI og forhåndsvisning uten Supabase.
 * Kun fakta fra dagens kontorcompaniet.no (crawl 2026-09-28). Produksjon leser Supabase.
 */
import type { Brand, Category, Person, ProductCard, Project, Solution, Testimonial } from "./types";

const T = "2026-09-28T00:00:00.000Z";

export const seedCategories: Category[] = [
  { slug: "kontorstoler", name: "Kontorstoler", sort: 1, updatedAt: T },
  { slug: "moteromsstoler", name: "Møteromsstoler", sort: 2, updatedAt: T },
  { slug: "kantinestoler", name: "Kantinestoler", sort: 3, updatedAt: T },
  { slug: "skrivebord", name: "Skrivebord", sort: 4, updatedAt: T },
  { slug: "motebord", name: "Møtebord", sort: 5, updatedAt: T },
  { slug: "oppbevaring", name: "Oppbevaring", sort: 6, updatedAt: T },
  { slug: "sofa-og-lounge", name: "Sofa og lounge", sort: 7, updatedAt: T },
  { slug: "akustikk", name: "Akustikk", sort: 8, updatedAt: T },
  { slug: "tilbehor", name: "Tilbehør", sort: 9, updatedAt: T },
];

// Merker per kategori fra /leverandorer/ (se docs/migration/merkevarer-inventar.csv)
const b = (slug: string, name: string, categories: string[], hasPage = false, extra: Partial<Brand> = {}): Brand => ({
  slug, name, categories, hasPage, updatedAt: T, ...extra,
});
export const seedBrands: Brand[] = [
  b("hag", "HÅG", ["kontorstoler", "kantinestoler"], true, { country: "Norge", parentCompany: "Flokk" }),
  b("rh", "RH", ["kontorstoler"], true, { parentCompany: "Flokk" }),
  b("sedus", "Sedus", ["kontorstoler", "kantinestoler"], true, { country: "Tyskland" }),
  b("vitra", "Vitra", ["kontorstoler", "moteromsstoler", "sofa-og-lounge"], true, { country: "Sveits" }),
  b("fora-form", "Fora Form", ["moteromsstoler", "motebord", "sofa-og-lounge"], true, { country: "Norge" }),
  b("dencon", "Dencon", ["skrivebord", "motebord", "oppbevaring"], true, { country: "Danmark" }),
  b("evoline", "Evoline", ["tilbehor"], true),
  b("muuto", "Muuto", ["sofa-og-lounge"], true, { country: "Danmark" }),
  b("abstracta", "Abstracta", ["akustikk"], true, { country: "Sverige" }),
  b("horreds", "Horreds", ["motebord", "skrivebord", "oppbevaring"], true, { country: "Sverige" }),
  b("varier", "Varier", ["kontorstoler", "kantinestoler"]),
  b("savo", "Savo", ["kontorstoler"]),
  b("rbm", "RBM", ["kontorstoler"]),
  b("ncp", "NCP", ["kontorstoler", "moteromsstoler", "kantinestoler"]),
  b("backapp", "BackApp", ["kontorstoler"]),
  b("kontorsenteret", "Kontorsenteret", ["kontorstoler", "sofa-og-lounge", "oppbevaring", "skrivebord"]),
  b("montana", "Montana", ["motebord", "sofa-og-lounge", "oppbevaring", "skrivebord"]),
  b("lammhults", "Lammhults", ["moteromsstoler", "motebord"]),
  b("randers-radius", "Randers+Radius", ["motebord", "kantinestoler"]),
  b("ole-lium", "Ole Lium", ["motebord", "oppbevaring", "skrivebord"]),
  b("cube-design", "Cube Design", ["motebord", "oppbevaring", "skrivebord"]),
  b("sarpsborg-metall", "Sarpsborg Metall", ["oppbevaring", "motebord"]),
  b("glimakra", "Glimakra", ["akustikk"]),
  b("osnes", "Osnes", ["akustikk"]),
  b("gotessons", "Gøtessons", ["akustikk"]),
  b("hay", "Hay", ["sofa-og-lounge", "kantinestoler"]),
  b("fredericia", "Fredericia", ["sofa-og-lounge"]),
  b("magis", "Magis", ["sofa-og-lounge", "kantinestoler"]),
  b("tacchini", "Tacchini", ["sofa-og-lounge", "kantinestoler"]),
  b("alias", "Alias", ["kantinestoler", "sofa-og-lounge"]),
  b("alki", "Alki", ["motebord"]),
  b("arper", "Arper", ["sofa-og-lounge"]),
  b("artwood", "Artwood", []),
  b("dauphin", "Dauphin", []),
  b("ekornes", "Ekornes", []),
  b("englesson", "Englesson", []),
  b("eskoleia", "Eskoleia", ["oppbevaring"]),
  b("fantoni", "Fantoni", ["akustikk"]),
  b("fischer", "Fischer", []),
  b("fogia", "Fogia", []),
  b("glamox-luxo", "Glamox Luxo", []),
  b("hjellegjerde", "Hjellegjerde", []),
  b("idt", "IDT", ["tilbehor"]),
  b("jensen", "Jensen", []),
  b("lapalma", "Lapalma", ["sofa-og-lounge"]),
  b("lk-hjelle", "LK Hjelle", []),
  b("normann-copenhagen", "Normann Copenhagen", ["kantinestoler"]),
  b("northern-lighting", "Northern Lighting", []),
  b("offitec", "Offitec", ["tilbehor"]),
  b("prima-office", "Prima Office", ["oppbevaring"]),
  b("profim", "Profim", []),
  b("trece", "Trece", ["oppbevaring"]),
];

const s = (slug: string, name: string, group: Solution["group"], priority: Solution["priority"], sort: number, categories: string[] = []): Solution => ({
  slug, name, group, priority, sort, categories, updatedAt: T,
});
export const seedSolutions: Solution[] = [
  s("kontorinnredning", "Kontorinnredning", "rom", "P1", 1, ["kontorstoler", "skrivebord", "motebord", "oppbevaring", "sofa-og-lounge"]),
  s("kontorlandskap", "Kontorlandskap", "rom", "P1", 2, ["skrivebord", "kontorstoler", "oppbevaring", "akustikk"]),
  s("moterom", "Møterom", "rom", "P1", 3, ["motebord", "moteromsstoler", "akustikk", "tilbehor"]),
  s("kantine", "Kantine", "rom", "P1", 4, ["kantinestoler", "motebord", "sofa-og-lounge", "akustikk"]),
  s("akustikk", "Akustikk", "rom", "P1", 5, ["akustikk", "sofa-og-lounge", "oppbevaring"]),
  s("ergonomi", "Ergonomi", "rom", "P1", 6, ["kontorstoler", "skrivebord", "tilbehor"]),
  s("stillerom", "Stillerom", "rom", "P2", 7, ["akustikk"]),
  s("gjenbruk", "Gjenbruk", "tjeneste", "P1", 8, ["kontorstoler", "skrivebord", "kantinestoler"]),
  s("leasing", "Leasing", "tjeneste", "P1", 9),
  s("prosjektledelse", "Prosjektledelse", "tjeneste", "P2", 10),
  s("levering-og-montering", "Levering og montering", "tjeneste", "P2", 11),
  s("service", "Service", "tjeneste", "P2", 12, ["kontorstoler"]),
];

export const seedProjects: Project[] = [
  {
    slug: "norwegian-fornebu",
    title: "Norwegian: 750 arbeidsplasser på Fornebu",
    clientName: "Norwegian",
    location: "Fornebu",
    year: null,
    workstations: 750,
    scope: "Kontor, konferanse, kantine og sosiale soner",
    challengeMd:
      "Norwegian skulle samle hovedkontoret på Fornebu: 750 arbeidsplasser med tilhørende konferanse-, kantine- og sosiale møbler, i Norwegians egen fargepalett.",
    solutionMd:
      "Vi dro på leverandørbesøk for å velge tekstiler og farger som passet Norwegians profil, planla leveransen i etapper og koordinerte levering og montering.",
    resultMd: "Fire intense uker med montering endte med ferdigbefaring og et hovedkontor klart til bruk.",
    videoUrls: ["https://vimeo.com/316655909"],
    imageCount: 2,
    links: [
      { kind: "solution", slug: "kontorinnredning", name: "Kontorinnredning" },
      { kind: "solution", slug: "kontorlandskap", name: "Kontorlandskap" },
      { kind: "solution", slug: "moterom", name: "Møterom" },
      { kind: "solution", slug: "kantine", name: "Kantine" },
      { kind: "solution", slug: "prosjektledelse", name: "Prosjektledelse" },
      { kind: "solution", slug: "levering-og-montering", name: "Levering og montering" },
    ],
    featured: true,
    updatedAt: T,
  },
  // Demoprosjekter (2026-10-02): kun fakta fra Kontorcompaniets egen beskrivelse. Ingen tall, årstall eller
  // sitater er lagt til. Tekstene må bekreftes, og kunden må godkjenne omtalen før lansering.
  {
    slug: "ice-nydalen",
    title: "Ice: aktivitetsbaserte lokaler over tre etasjer i Nydalen",
    clientName: "Ice",
    location: "Nydalen, Oslo",
    year: null,
    workstations: null,
    scope: "Komplette aktivitetsbaserte lokaler over tre etasjer",
    descriptionMd: "Ice samlet virksomheten i nye lokaler i Nydalen i Oslo. Vi leverte komplette aktivitetsbaserte lokaler over tre etasjer.",
    challengeMd:
      "Lokalene skulle bygges for aktivitetsbasert arbeid: ingen faste plasser, men ulike soner for ulike oppgaver. Det krever flere typer arbeidsplasser enn et tradisjonelt landskap, og en tydelig plan for hva som skal skje hvor, fordelt på tre etasjer.",
    solutionMd:
      "Vi planla sonene og møbleringen etasje for etasje: arbeidsplasser i landskap, møterom og uformelle møteplasser, og sosiale soner. Vi koordinerte leveransene fra produsentene og sto for levering og montering i alle tre etasjene.",
    resultMd: "Tre etasjer levert ferdig møblert og klare for aktivitetsbasert arbeid.",
    videoUrls: ["https://vimeo.com/269939976"],
    imageCount: 2,
    links: [
      { kind: "solution", slug: "kontorinnredning", name: "Kontorinnredning" },
      { kind: "solution", slug: "kontorlandskap", name: "Kontorlandskap" },
      { kind: "solution", slug: "moterom", name: "Møterom" },
      { kind: "solution", slug: "prosjektledelse", name: "Prosjektledelse" },
      { kind: "solution", slug: "levering-og-montering", name: "Levering og montering" },
    ],
    featured: false,
    updatedAt: T,
  },
  {
    slug: "yara-skoyen",
    title: "Yara: en komplett etasje på Skøyen",
    clientName: "Yara",
    location: "Skøyen, Oslo",
    year: null,
    workstations: null,
    scope: "Arbeidsplasser, sosiale soner, stillerom, møterom og pods",
    descriptionMd: "For Yara på Skøyen i Oslo møblerte vi en komplett etasje, fra arbeidsplasser til stillerom og pods.",
    challengeMd:
      "En hel etasje skulle fungere både for konsentrert arbeid og for samarbeid. Det betyr arbeidsplasser i landskap, men også steder å trekke seg tilbake til og rom for møter i ulike størrelser.",
    solutionMd:
      "Vi leverte arbeidsplasser, møterom og sosiale soner, og supplerte med stillerom og pods for telefonsamtaler og arbeid som krever ro. Plasseringen av stillerom og pods ble planlagt sammen med resten av etasjen, slik at de ligger der de gjør mest nytte.",
    resultMd: "En komplett etasje med rom for både samarbeid og konsentrasjon, levert ferdig montert.",
    videoUrls: ["https://vimeo.com/439311013"],
    imageCount: 0,
    links: [
      { kind: "solution", slug: "kontorinnredning", name: "Kontorinnredning" },
      { kind: "solution", slug: "kontorlandskap", name: "Kontorlandskap" },
      { kind: "solution", slug: "moterom", name: "Møterom" },
      { kind: "solution", slug: "stillerom", name: "Stillerom" },
      { kind: "solution", slug: "akustikk", name: "Akustikk" },
    ],
    featured: false,
    updatedAt: T,
  },
  {
    slug: "kontorhuset-lierstranda",
    title: "Kontorhuset: kontorfellesskap på Lierstranda",
    clientName: "Kontorhuset",
    location: "Lierstranda, Lier",
    year: null,
    workstations: null,
    scope: "Cellekontorer, møterom, teamkontorer og sosiale soner",
    descriptionMd: "Kontorhuset på Lierstranda er et kontorfellesskap. Vi sto for den komplette leveransen, fra cellekontorer til sosiale soner.",
    challengeMd:
      "I et kontorfellesskap deler mange ulike bedrifter de samme lokalene. Kontorene må fungere for leietakere med ulike behov, og fellesarealene må tåle mye bruk og mange brukere.",
    solutionMd:
      "Vi leverte cellekontorer og teamkontorer for leietakerne, møterom som deles, og sosiale soner der folk fra ulike bedrifter møtes. Leveransen ble planlagt og montert som én helhet.",
    resultMd: "Et komplett møblert kontorfellesskap, klart for leietakerne.",
    videoUrls: ["https://vimeo.com/269852960"],
    imageCount: 0,
    links: [
      { kind: "solution", slug: "kontorinnredning", name: "Kontorinnredning" },
      { kind: "solution", slug: "moterom", name: "Møterom" },
      { kind: "solution", slug: "prosjektledelse", name: "Prosjektledelse" },
      { kind: "solution", slug: "levering-og-montering", name: "Levering og montering" },
    ],
    featured: false,
    updatedAt: T,
  },
  {
    slug: "axactor-gronland",
    title: "Axactor: nye lokaler over to etasjer på Grønland",
    clientName: "Axactor",
    location: "Grønland, Drammen",
    year: null,
    workstations: null,
    scope: "Landskap, møterom og sosiale soner over to etasjer",
    descriptionMd: "Axactor flyttet inn i nye lokaler på Grønland i Drammen. Vi møblerte to etasjer med landskap, møterom og sosiale soner.",
    challengeMd:
      "Nye lokaler over to etasjer skulle møbleres fra bunnen av, med arbeidsplasser i landskap, møterom og steder der de ansatte kan møtes uformelt.",
    solutionMd:
      "Vi planla møbleringen for begge etasjene, med landskap for arbeidsplassene, møterom i ulike størrelser og sosiale soner. Vi sto for levering og montering.",
    resultMd: "To etasjer møblert og klare til innflytting.",
    videoUrls: [],
    imageCount: 0,
    links: [
      { kind: "solution", slug: "kontorinnredning", name: "Kontorinnredning" },
      { kind: "solution", slug: "kontorlandskap", name: "Kontorlandskap" },
      { kind: "solution", slug: "moterom", name: "Møterom" },
      { kind: "solution", slug: "levering-og-montering", name: "Levering og montering" },
    ],
    featured: false,
    updatedAt: T,
  },
  {
    slug: "viken-fiber-gronland",
    title: "Viken Fiber: møterom og sosiale soner på Grønland",
    clientName: "Viken Fiber",
    location: "Grønland, Drammen",
    year: null,
    workstations: null,
    scope: "Møterom og sosiale soner",
    descriptionMd: "For Viken Fiber på Grønland i Drammen leverte vi møterom og sosiale soner.",
    challengeMd: "Viken Fiber trengte møterom og sosiale soner som fungerer i hverdagen, både til formelle møter og til de uformelle samtalene.",
    solutionMd: "Vi leverte møblering til møterommene og de sosiale sonene, og sto for levering og montering.",
    resultMd: "Møterom og sosiale soner levert ferdig montert.",
    videoUrls: [],
    imageCount: 0,
    links: [
      { kind: "solution", slug: "moterom", name: "Møterom" },
      { kind: "solution", slug: "levering-og-montering", name: "Levering og montering" },
    ],
    featured: false,
    updatedAt: T,
  },
  {
    slug: "kjellstad-naeringspark",
    title: "Kjellstad Næringspark: kantine for hele næringsbygget",
    clientName: "Kjellstad Næringspark",
    location: "Lierstranda, Lier",
    year: null,
    workstations: null,
    scope: "Kantine for hele næringsbygget",
    descriptionMd: "Kjellstad Næringspark på Lierstranda har én felles kantine for alle bedriftene i bygget. Vi leverte møblene til kantinen.",
    challengeMd:
      "En kantine for et helt næringsbygg brukes av mange bedrifter og mange mennesker hver dag. Møblene må tåle mye bruk og hyppig vask, og rommet må fungere både i lunsjen og resten av dagen.",
    solutionMd: "Vi leverte kantinemøblene til hele næringsbygget, og sto for levering og montering.",
    resultMd: "En felles kantine for alle bedriftene i bygget, levert ferdig montert.",
    videoUrls: [],
    imageCount: 0,
    links: [
      { kind: "solution", slug: "kantine", name: "Kantine" },
      { kind: "solution", slug: "levering-og-montering", name: "Levering og montering" },
    ],
    featured: false,
    updatedAt: T,
  },
];

// Publiseres ikke før tillatelse er bekreftet (content.testimonials.permission_confirmed_at)
export const seedTestimonials: (Testimonial & { permissionConfirmed: boolean })[] = [
  {
    quote: "These people delivered and we as the customer could not wish for any other result. We highly recommend Kontorcompaniet!",
    personName: "Jørgen Horlings",
    personTitle: "Head of Facility Management",
    company: "Norwegian ASA",
    projectSlug: "norwegian-fornebu",
    permissionConfirmed: false,
  },
];

export const seedPeople: Person[] = [
  { name: "Pål Moen", roleTitle: "Daglig leder og salg", handles: ["salg", "scout"] },
];

// Kuraterte produktkort (docs/migration/produktkatalog-vurdering.csv, KEEP/MERGE-mål). Ingen egne sider i v1.
const p = (slug: string, name: string, brandSlug: string, brandName: string, categorySlug: string, tagline: string,
  certifications: string[] = [], image: string | null = null, featured = false): ProductCard => ({
  slug, name, brandSlug, brandName, categorySlug, tagline, certifications, featured, hasPage: false, updatedAt: T,
  image: image ? `/images/produkter/${image}.webp` : null,
});
export const seedProducts: ProductCard[] = [
  p("hag-capisco-8106", "HÅG Capisco 8106", "hag", "HÅG", "kontorstoler", "Sadelstol for aktiv sitting og høye arbeidsflater", [], "hag-capisco-8106", true),
  p("hag-futu-mesh-1100-s", "HÅG Futu Mesh", "hag", "HÅG", "kontorstoler", "Enkel å justere, god til delte arbeidsplasser", ["epd", "greenguard", "mobelfakta"], "hag-futu-mesh-1100-s", true),
  p("hag-sofi-mesh-7500", "HÅG Sofi Mesh", "hag", "HÅG", "kontorstoler", "Lett og luftig stol med nettingrygg", [], "hag-sofi-mesh-7500"),
  p("hag-tribute", "HÅG Tribute", "hag", "HÅG", "kontorstoler", "Fås med og uten nakkestøtte (9021 og 9031)", ["epd", "greenguard", "mobelfakta"], "hag-tribute"),
  p("hag-creed-6006-kontorstol", "HÅG Creed", "hag", "HÅG", "kontorstoler", "Robust stol for dem som sitter mye", ["epd", "greenguard", "mobelfakta"], "hag-creed-6006-kontorstol"),
  p("hag-celi-9100", "HÅG Celi", "hag", "HÅG", "moteromsstoler", "Enkel stol for møterom og hjemmekontor", ["epd", "greenguard", "mobelfakta"], "hag-celi-9100"),
  p("vitra-id-trim", "Vitra ID Trim", "vitra", "Vitra", "kontorstoler", "Kontorstol tegnet av Antonio Citterio, også med nettingrygg", ["epd"], "vitra-id-trim", true),
  p("vitra-physix", "Vitra Physix", "vitra", "Vitra", "kontorstoler", "Fleksibel rygg som følger bevegelsene", ["epd"]),
  p("profim-noor-6050", "Profim Noor", "profim", "Profim", "kontorstoler", "Kontorstol med EPD og Greenguard", ["epd", "greenguard", "mobelfakta"]),
  p("fora-form-bud-unite-konferansestol", "Fora Form Bud Unite", "fora-form", "Fora Form", "moteromsstoler", "Norsk konferansestol med mykt uttrykk", ["epd", "mobelfakta"], "fora-form-bud-unite-konferansestol", true),
  p("fora-form-city-4-ben", "Fora Form City", "fora-form", "Fora Form", "moteromsstoler", "Robust stol på fire ben", ["epd", "mobelfakta"], "fora-form-city-4-ben"),
  p("vitra-soft-pad-chair", "Vitra Soft Pad Chair", "vitra", "Vitra", "moteromsstoler", "Eames-klassiker for styrerom (EA 217 og EA 219)"),
  p("vitra-eames-plastic-side-chair-dsr", "Vitra Eames Plastic Side Chair", "vitra", "Vitra", "kantinestoler", "Lettstelt designklassiker i mange farger", ["epd"], null, true),
  p("hay-about-a-chair-222", "Hay About a Chair", "hay", "Hay", "kantinestoler", "Solid stol for kantine og sosiale soner"),
  p("dencon-skrivebord", "Dencon hev/senk-skrivebord", "dencon", "Dencon", "skrivebord", "Elektrisk hev/senk eller fast høyde, flere størrelser", ["fsc"], null, true),
  p("dencon-delta-konferansebord", "Dencon Delta", "dencon", "Dencon", "motebord", "Konferansebord i seks størrelser", ["fsc"], "dencon-delta-konferansebord", true),
  p("fora-form-kvart-motebord", "Fora Form Kvart", "fora-form", "Fora Form", "motebord", "Møtebord fra 200 til 260 cm", ["epd", "mobelfakta"], "fora-form-kvart-motebord"),
  p("dencon-skap", "Dencon skap", "dencon", "Dencon", "oppbevaring", "Skap i flere høyder, 2 til 4 A4", ["fsc"]),
  p("dencon-uttrekksskap", "Dencon uttrekksskap", "dencon", "Dencon", "oppbevaring", "Uttrekksskap for faste arbeidsplasser", ["fsc"]),
  p("fora-form-senso-hoy", "Fora Form Senso Høy", "fora-form", "Fora Form", "sofa-og-lounge", "Sofa med høy rygg som skjermer for lyd og innsyn", ["epd", "mobelfakta"], "fora-form-senso-hoy", true),
  p("vitra-eames-loungechair", "Vitra Eames Lounge Chair", "vitra", "Vitra", "sofa-og-lounge", "Ikonisk lenestol fra 1956", ["epd"], "vitra-eames-loungechair"),
  p("muuto-outline-3-seter", "Muuto Outline", "muuto", "Muuto", "sofa-og-lounge", "Enkel og solid sofa, 3-seter"),
  p("fogia-bollo", "Fogia Bollo", "fogia", "Fogia", "sofa-og-lounge", "Lenestol tegnet av Andreas Engelsvik"),
  p("abstracta-soneo-bordskjerm", "Abstracta Soneo", "abstracta", "Abstracta", "akustikk", "Bordskjerm i bredder fra 120 til 160 cm", ["epd", "mobelfakta"]),
  p("evoline-circle80", "Evoline Circle80", "evoline", "Evoline", "tilbehor", "Innfelt strømmodul, også med trådløs lading (DisQ)"),
  p("evoline-express", "Evoline Express", "evoline", "Evoline", "tilbehor", "Klikksystem for strøm mellom bord"),
];

export const certificationNames: Record<string, string> = {
  epd: "EPD", greenguard: "Greenguard", mobelfakta: "Møbelfakta", fsc: "FSC", svanen: "Svanemerket",
};
