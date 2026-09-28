import { z } from "zod";

/** Kategorier Møbelscout forstår (nøkkel → norsk navn i entall/flertall) */
export const SCOUT_CATEGORIES = {
  office_chair: { one: "kontorstol", many: "kontorstoler" },
  meeting_chair: { one: "møteromsstol", many: "møteromsstoler" },
  canteen_chair: { one: "kantinestol", many: "kantinestoler" },
  desk: { one: "skrivebord", many: "skrivebord" },
  meeting_table: { one: "møtebord", many: "møtebord" },
  storage: { one: "oppbevaringsenhet", many: "oppbevaring" },
  sofa_lounge: { one: "sofa/loungemøbel", many: "sofaer og loungemøbler" },
  acoustics: { one: "akustikkprodukt", many: "akustikkprodukter" },
  other: { one: "møbel", many: "møbler" },
} as const;
export type CategoryKey = keyof typeof SCOUT_CATEGORIES;
export const categoryKeys = Object.keys(SCOUT_CATEGORIES) as [CategoryKey, ...CategoryKey[]];

export const conditionSchema = z.enum(["new", "used", "refurbished", "demo"]);
export type Condition = z.infer<typeof conditionSchema>;

/** Et krav eller ønske, f.eks. {field: "attribute", value: "ergonomisk"} */
export const constraintSchema = z.object({
  field: z.enum(["brand", "model", "price", "location", "deadline", "condition", "color", "attribute", "quantity"]),
  value: z.string().min(1).max(120),
});
export type Constraint = z.infer<typeof constraintSchema>;

export const needItemSchema = z.object({
  category: z.enum(categoryKeys),
  quantity: z.object({ target: z.int().min(1).max(5000), minimum: z.int().min(1).max(5000).nullable() }),
  brands: z.array(z.string().min(1).max(60)).max(10),
  models: z.array(z.string().min(1).max(80)).max(10),
  max_unit_price_ex_vat: z.number().positive().max(1_000_000).nullable(),
  condition: z.array(conditionSchema).min(1),
  accept_alternatives: z.boolean(),
  attributes: z.array(z.string().min(1).max(60)).max(10),
});
export type NeedItem = z.infer<typeof needItemSchema>;

export const missingSchema = z.enum(["category", "quantity", "location", "budget"]);

export const scoutNeedSchema = z.object({
  items: z.array(needItemSchema).min(1).max(5),
  locations: z.array(z.string().min(1).max(60)).max(10),
  deadline: z.iso.date().nullable(),
  hard_constraints: z.array(constraintSchema).max(20),
  preferences: z.array(constraintSchema).max(20),
  missing_critical: z.array(missingSchema).max(4),
  confidence: z.number().min(0).max(1),
});
export type ScoutNeed = z.infer<typeof scoutNeedSchema>;

const nf = new Intl.NumberFormat("nb-NO");
const df = new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "long", year: "numeric" });

const CONDITION_LABEL: Record<Condition, string> = { new: "nytt", used: "brukt", refurbished: "refurbished", demo: "utstillingsmodell" };

export type SummaryLine = { text: string; hard: boolean };

/** «Slik forstår Møbelscout behovet» – linjer som vises til kunden */
export function summarizeNeed(need: ScoutNeed): SummaryLine[] {
  const hardFields = new Set(need.hard_constraints.map((c) => c.field));
  const lines: SummaryLine[] = [];
  for (const item of need.items) {
    const cat = SCOUT_CATEGORIES[item.category];
    const attrs = item.attributes.length ? `${item.attributes.join(", ")} ` : "";
    const min = item.quantity.minimum && item.quantity.minimum < item.quantity.target ? ` (minst ${item.quantity.minimum})` : "";
    lines.push({ text: `${nf.format(item.quantity.target)} ${attrs}${item.quantity.target === 1 ? cat.one : cat.many}${min}`, hard: true });
    if (item.brands.length || item.models.length) {
      const names = [...item.models, ...item.brands.filter((b) => !item.models.some((m) => m.startsWith(b)))];
      lines.push({ text: `${names.join(", ").replace(/, ([^,]*)$/, " eller $1")}${item.accept_alternatives ? " eller tilsvarende" : ""}`, hard: !item.accept_alternatives });
    }
    if (item.max_unit_price_ex_vat) {
      lines.push({ text: `Maks ${nf.format(item.max_unit_price_ex_vat)} kr/stk eks. mva.`, hard: hardFields.has("price") });
    }
    lines.push({
      text: item.condition.map((c) => CONDITION_LABEL[c]).join(" eller ").replace(/^./, (c) => c.toUpperCase()),
      hard: hardFields.has("condition"),
    });
  }
  if (need.locations.length) lines.push({ text: `Levering ${need.locations.join(" eller ")}`, hard: hardFields.has("location") });
  if (need.deadline) lines.push({ text: `Før ${df.format(new Date(need.deadline))}`, hard: hardFields.has("deadline") });
  for (const p of need.preferences.filter((p) => p.field === "color" || p.field === "attribute")) {
    lines.push({ text: `Gjerne ${p.value}`, hard: false });
  }
  return lines;
}

/** 1–3 korte oppfølgingsspørsmål, laget i kode fra det som mangler (ingen chatbot) */
export type FollowUp = { key: "category" | "quantity" | "location" | "budget"; question: string; suggestions: string[] };

export function followUps(need: ScoutNeed): FollowUp[] {
  const q: Record<FollowUp["key"], FollowUp> = {
    category: { key: "category", question: "Hva slags møbler ser dere etter?", suggestions: ["Kontorstoler", "Skrivebord", "Møtebord", "Oppbevaring"] },
    quantity: { key: "quantity", question: "Omtrent hvor mange trenger dere?", suggestions: ["5–10", "10–30", "30–100", "Over 100"] },
    location: { key: "location", question: "Hvor skal møblene leveres?", suggestions: ["Oslo", "Drammen", "Asker/Bærum", "Annet sted"] },
    budget: { key: "budget", question: "Har dere et budsjett per stykk?", suggestions: ["Under 2 000 kr", "2 000–5 000 kr", "Over 5 000 kr", "Vet ikke ennå"] },
  };
  return need.missing_critical.slice(0, 3).map((k) => q[k]);
}
