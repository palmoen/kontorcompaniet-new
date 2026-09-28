/**
 * Regelbasert tolkning av norsk fritekst → ScoutNeed.
 * Brukes når OpenAI ikke er konfigurert, og som reserve hvis AI-svaret ikke validerer.
 * Bevisst enkel og forutsigbar: bedre å spørre (missing_critical) enn å gjette.
 */
import { type CategoryKey, type Condition, type Constraint, type ScoutNeed, scoutNeedSchema } from "./need";

const CATEGORY_WORDS: [RegExp, CategoryKey][] = [
  [/\b(kontorstol(er)?|arbeidsstol(er)?|ergonomiske? stol(er)?|skrivebordsstol(er)?)\b/i, "office_chair"],
  [/\b(møteromsstol(er)?|konferansestol(er)?|møtestol(er)?)\b/i, "meeting_chair"],
  [/\b(kantinestol(er)?|besøksstol(er)?|stablestol(er)?)\b/i, "canteen_chair"],
  [/\b(hev[/ -]?senk(e)?[- ]?(skrivebord|pult(er)?|bord)?|skrivebord|pult(er)?|arbeidsbord)\b/i, "desk"],
  [/\b(møtebord|konferansebord)\b/i, "meeting_table"],
  [/\b(oppbevaring|skap|reoler?|hyller?|skuffeseksjon(er)?|uttrekksskap)\b/i, "storage"],
  [/\b(sofa(er)?|lounge\w*|lenestol(er)?)\b/i, "sofa_lounge"],
  [/\b(akustikk\w*|bordskjerm(er)?|skillevegg(er)?|stillerom|telefonboks(er)?)\b/i, "acoustics"],
  [/\bstol(er)?\b/i, "office_chair"],
];

// Merker vi kjenner (fra leverandørlisten + vanlige i bruktmarkedet). Normalisert visningsnavn.
const BRANDS: [RegExp, string][] = [
  [/\bh[åa]g\b/i, "HÅG"], [/\brh\b/i, "RH"], [/\bsedus\b/i, "Sedus"], [/\bvitra\b/i, "Vitra"],
  [/\bkinnarps\b/i, "Kinnarps"], [/\bsavo\b/i, "Savo"], [/\bvarier\b/i, "Varier"], [/\bdencon\b/i, "Dencon"],
  [/\bfora\s?form\b/i, "Fora Form"], [/\bsteelcase\b/i, "Steelcase"], [/\bherman\s?miller\b/i, "Herman Miller"],
  [/\bmuuto\b/i, "Muuto"], [/\babstracta\b/i, "Abstracta"], [/\bhorreds\b/i, "Horreds"], [/\bmontana\b/i, "Montana"],
  [/\bef[ -]?office\b/i, "EFG"], [/\befg\b/i, "EFG"], [/\bframery\b/i, "Framery"], [/\bhay\b/i, "Hay"],
  [/\bprofim\b/i, "Profim"], [/\bncp\b/i, "NCP"], [/\brbm\b/i, "RBM"], [/\blammhults\b/i, "Lammhults"],
];

// Kjente modeller → merke (gir modellmatch i stedet for bare merkematch)
const MODELS: [RegExp, string][] = [
  [/\bcapisco(\s?puls)?\b/i, "HÅG Capisco"], [/\btribute\b/i, "HÅG Tribute"], [/\bfutu\b/i, "HÅG Futu"],
  [/\bsofi\b/i, "HÅG Sofi"], [/\bcreed\b/i, "HÅG Creed"], [/\blogic\s?(\d{3})?\b/i, "RH Logic"], [/\bactiv\b/i, "RH Activ"],
  [/\bextend\b/i, "RH Extend"], [/\bse:?\s?motion\b/i, "Sedus se:motion"], [/\bid\s?trim\b/i, "Vitra ID Trim"],
  [/\baeron\b/i, "Herman Miller Aeron"], [/\bleap\b/i, "Steelcase Leap"],
];

const PLACES = [
  "Oslo", "Drammen", "Asker", "Bærum", "Sandvika", "Lysaker", "Fornebu", "Lillestrøm", "Ski", "Moss", "Fredrikstad",
  "Sarpsborg", "Tønsberg", "Sandefjord", "Larvik", "Kongsberg", "Hønefoss", "Hamar", "Lillehammer", "Gjøvik", "Bergen",
  "Stavanger", "Sandnes", "Trondheim", "Kristiansand", "Tromsø", "Bodø", "Ålesund", "Haugesund", "Skien", "Porsgrunn",
  "Jessheim", "Gardermoen", "Nydalen", "Skøyen", "Lier", "Viken", "Østlandet",
];

const MONTHS = ["januar", "februar", "mars", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "desember"];

const COLORS = ["sort", "svart", "hvit", "grå", "blå", "grønn", "rød", "beige", "brun", "eik", "bjørk", "valnøtt"];

/** «5.000», «5 000», «5000», «4,5k» → tall */
function toNumber(raw: string): number | null {
  const s = raw.trim().toLowerCase().replace(/\s/g, "");
  const k = s.endsWith("k");
  const n = Number(s.replace(/k$/, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return k ? n * 1000 : n;
}

function parsePrice(text: string, target: number | null): { unit: number | null; total: boolean } {
  // Tall: «5000», «5 000», «5.000», «4,5k» (k kun som eget suffiks, ikke starten av «kr»)
  const NUM = String.raw`(\d+(?:[ .]\d{3})*(?:,\d+)?(?:\s?k\b)?)`;
  const rx = new RegExp(
    String.raw`\b(maks(?:imalt)?|max|inntil|under|opp\s+til|budsjett(?:\s+på)?)\s*(?:kr\.?\s*)?` + NUM +
      String.raw`(?:\s*[-–]\s*` + NUM + String.raw`)?\s*(?:kr|,-|kroner|nok)?(?:\s*(per|pr\.?|\/)\s*(stk|stykk|stol|bord|enhet|plass))?(?:\s*(totalt|til sammen|i alt))?`,
    "i",
  );
  const m = text.match(rx);
  if (!m) return { unit: null, total: false };
  let lo = toNumber(m[2]);
  const hi = m[3] ? toNumber(m[3]) : null;
  if (lo == null) return { unit: null, total: false };
  // «4–5.000» betyr 4 000–5 000
  if (hi != null && lo < 100 && hi >= 1000) lo *= 1000;
  const value = hi ?? lo;
  const perUnit = Boolean(m[4]);
  const isTotal = Boolean(m[6]) || (!perUnit && target != null && value / target >= 50 && value > 20_000);
  if (isTotal && target) return { unit: Math.round(value / target), total: true };
  return { unit: value, total: false };
}

function parseDeadline(text: string, now: Date): string | null {
  const t = text.toLowerCase();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const dm = t.match(/\b(?:før|innen|senest)\s+(\d{1,2})\.\s*([a-zæøå]+)/);
  if (dm) {
    const mi = MONTHS.indexOf(dm[2]);
    if (mi >= 0) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), mi, Number(dm[1])));
      if (d < now) d.setUTCFullYear(d.getUTCFullYear() + 1);
      return iso(d);
    }
  }
  const mm = t.match(/\b(?:før|innen|til)\s+([a-zæøå]+)/);
  if (mm) {
    const mi = MONTHS.indexOf(mm[1]);
    if (mi >= 0) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), mi, 1));
      if (d <= now) d.setUTCFullYear(d.getUTCFullYear() + 1);
      return iso(d);
    }
  }
  const week = t.match(/\buke\s+(\d{1,2})\b/);
  if (week) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), 0, 1 + (Number(week[1]) - 1) * 7));
    if (d < now) d.setUTCFullYear(d.getUTCFullYear() + 1);
    return iso(d);
  }
  return null;
}

export function parseNeedRules(text: string, now = new Date()): ScoutNeed {
  const clean = text.replace(/\s+/g, " ").trim();
  const lower = clean.toLowerCase();

  const category = CATEGORY_WORDS.find(([rx]) => rx.test(clean))?.[1] ?? null;

  // Antall: tall nær en kategori, «30 stk», eller første frittstående tall som ikke er pris/dato
  const qtyMatch =
    clean.match(/\b(ca\.?|cirka|rundt|omtrent|om lag)?\s*(\d{1,4})\s*(?:stk\.?|stykk|nye|brukte|stk)?\s*(?:[a-zæøå/-]+\s){0,2}?(?:kontorstol|stol|skrivebord|pult|møtebord|konferansebord|skap|sofa|bordskjerm|arbeidsplass|plass)/i) ??
    clean.match(/\b(ca\.?|cirka|rundt|omtrent)?\s*(\d{1,4})\s*(?:stk|stykk)\b/i);
  const target = qtyMatch ? Number(qtyMatch[2]) : null;
  const approx = Boolean(qtyMatch?.[1]);
  const minimum = target && approx ? Math.max(1, Math.ceil((target * 2) / 3)) : null;

  const brands = [...new Set(BRANDS.filter(([rx]) => rx.test(clean)).map(([, b]) => b))];
  const models = [...new Set(MODELS.filter(([rx]) => rx.test(clean)).map(([rx, name]) => {
    const n = clean.match(rx)?.[1];
    return n && /\d{3}/.test(n) ? `${name} ${n}` : name;
  }))];
  for (const m of models) {
    const brand = m.split(" ")[0] === "Herman" ? "Herman Miller" : m.split(" ")[0];
    if (!brands.includes(brand)) brands.push(brand);
  }

  const price = parsePrice(clean, target);
  const locations = PLACES.filter((p) => new RegExp(`(^|[^a-zæøå])${p}([^a-zæøå]|$)`, "i").test(clean));
  const deadline = parseDeadline(clean, now);

  const conditions: Condition[] = [];
  if (/\bnye?\b/i.test(lower) && !/\bbrukt|refurb|ombruk|gjenbruk/i.test(lower)) conditions.push("new");
  if (/\bbrukt|ombruk|gjenbruk/i.test(lower)) conditions.push("used");
  if (/\brefurb|oppusset|renovert|klargjort/i.test(lower)) conditions.push("refurbished");
  if (/\butstilling|demo/i.test(lower)) conditions.push("demo");
  if (!conditions.length) conditions.push("used", "refurbished");

  const onlyThese = /\b(kun|bare|må være)\b/i.test(lower) && brands.length > 0;
  const acceptAlternatives = !onlyThese || /tilsvarende/i.test(lower);

  const attributes: string[] = [];
  if (/ergonomisk/i.test(lower)) attributes.push("ergonomiske");
  if (/hev[/ -]?senk/i.test(lower)) attributes.push("hev/senk");
  if (/nakkestøtte/i.test(lower)) attributes.push("med nakkestøtte");
  if (/armlen/i.test(lower)) attributes.push("med armlener");

  const hard: Constraint[] = [];
  const prefs: Constraint[] = [];
  if (price.unit) hard.push({ field: "price", value: String(price.unit) });
  if (deadline) hard.push({ field: "deadline", value: deadline });
  if (!acceptAlternatives) brands.forEach((b) => hard.push({ field: "brand", value: b }));
  attributes.forEach((a) => (/\b(må|krav)\b/i.test(lower) || a === "ergonomiske" ? hard : prefs).push({ field: "attribute", value: a }));
  for (const c of COLORS) {
    if (new RegExp(`\\b${c}e?\\b`, "i").test(lower)) prefs.push({ field: "color", value: c === "svart" ? "sort" : c });
  }
  if (locations.length && /\b(må|kun)\b[^.]*\b(levert|leveres|hentes)/i.test(lower)) hard.push({ field: "location", value: locations.join("/") });

  const missing: ScoutNeed["missing_critical"] = [];
  if (!category) missing.push("category");
  if (!target) missing.push("quantity");
  if (!locations.length) missing.push("location");

  const found = [category, target, locations.length, brands.length, price.unit, deadline].filter(Boolean).length;

  return scoutNeedSchema.parse({
    items: [{
      category: category ?? "other",
      quantity: { target: target ?? 1, minimum: minimum && minimum < (target ?? 1) ? minimum : null },
      brands,
      models,
      max_unit_price_ex_vat: price.unit,
      condition: conditions,
      accept_alternatives: acceptAlternatives,
      attributes,
    }],
    locations,
    deadline,
    hard_constraints: hard,
    preferences: prefs,
    missing_critical: missing,
    confidence: Math.min(0.9, 0.2 + found * 0.12),
  });
}
