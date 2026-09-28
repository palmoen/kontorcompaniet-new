/**
 * Seed-innhold for utvikling, CI og forhåndsvisning uten Supabase.
 * Kun fakta fra dagens kontorcompaniet.no (crawl 2026-09-28). Produksjon leser Supabase.
 */
import type { Brand, Category, Person, Project, Solution, Testimonial } from "./types";

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
];

const s = (slug: string, name: string, group: Solution["group"], priority: Solution["priority"], sort: number): Solution => ({
  slug, name, group, priority, sort, updatedAt: T,
});
export const seedSolutions: Solution[] = [
  s("kontorinnredning", "Kontorinnredning", "rom", "P1", 1),
  s("kontorlandskap", "Kontorlandskap", "rom", "P1", 2),
  s("moterom", "Møterom", "rom", "P1", 3),
  s("kantine", "Kantine", "rom", "P1", 4),
  s("akustikk", "Akustikk", "rom", "P1", 5),
  s("ergonomi", "Ergonomi", "rom", "P1", 6),
  s("stillerom", "Stillerom", "rom", "P2", 7),
  s("gjenbruk", "Gjenbruk", "tjeneste", "P1", 8),
  s("leasing", "Leasing", "tjeneste", "P1", 9),
  s("prosjektledelse", "Prosjektledelse", "tjeneste", "P2", 10),
  s("levering-og-montering", "Levering og montering", "tjeneste", "P2", 11),
  s("service", "Service", "tjeneste", "P2", 12),
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
    videoUrls: ["https://vimeo.com/kontorcompaniet"],
    imageCount: 1,
    links: [
      { kind: "solution", slug: "kontorlandskap", name: "Kontorlandskap" },
      { kind: "solution", slug: "moterom", name: "Møterom" },
      { kind: "solution", slug: "kantine", name: "Kantine" },
      { kind: "solution", slug: "prosjektledelse", name: "Prosjektledelse" },
      { kind: "solution", slug: "levering-og-montering", name: "Levering og montering" },
    ],
    featured: true,
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
