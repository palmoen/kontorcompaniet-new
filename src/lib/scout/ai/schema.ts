/**
 * JSON Schema for strukturert output (OpenAI strict mode: alle felt påkrevd,
 * additionalProperties: false, null i stedet for valgfrie felt). Speiler scoutNeedSchema.
 */
import { categoryKeys } from "../need";

const constraint = {
  type: "object",
  additionalProperties: false,
  required: ["field", "value"],
  properties: {
    field: { type: "string", enum: ["brand", "model", "price", "location", "deadline", "condition", "color", "attribute", "quantity"] },
    value: { type: "string" },
  },
};

export const scoutNeedJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["items", "locations", "deadline", "hard_constraints", "preferences", "missing_critical", "confidence"],
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["category", "quantity", "brands", "models", "max_unit_price_ex_vat", "condition", "accept_alternatives", "attributes"],
        properties: {
          category: { type: "string", enum: categoryKeys },
          quantity: {
            type: "object",
            additionalProperties: false,
            required: ["target", "minimum"],
            properties: { target: { type: "integer" }, minimum: { type: ["integer", "null"] } },
          },
          brands: { type: "array", items: { type: "string" } },
          models: { type: "array", items: { type: "string" } },
          max_unit_price_ex_vat: { type: ["number", "null"] },
          condition: { type: "array", items: { type: "string", enum: ["new", "used", "refurbished", "demo"] } },
          accept_alternatives: { type: "boolean" },
          attributes: { type: "array", items: { type: "string" } },
        },
      },
    },
    locations: { type: "array", items: { type: "string" } },
    deadline: { type: ["string", "null"], description: "ISO-dato YYYY-MM-DD" },
    hard_constraints: { type: "array", items: constraint },
    preferences: { type: "array", items: constraint },
    missing_critical: { type: "array", items: { type: "string", enum: ["category", "quantity", "location", "budget"] } },
    confidence: { type: "number" },
  },
} as const;

export const PARSE_INSTRUCTIONS = (today: string) => `Du tolker forespørsler til Møbelscout, en tjeneste hos Kontorcompaniet som leter etter brukte kontormøbler for bedrifter i Norge.
Dagens dato er ${today}. Returner kun strukturert data etter skjemaet.

Regler:
- Én post i items per møbeltype kunden nevner.
- quantity.target er ønsket antall. Ved «ca./cirka/rundt» settes minimum til omtrent to tredjedeler av target, ellers null.
- max_unit_price_ex_vat er pris per stykk eks. mva. i NOK. Et totalbudsjett deles på antall. «4–5 000» betyr 5000. Ukjent: null.
- Merker normaliseres (HÅG, RH, Sedus, Vitra, Kinnarps …). Kjente modeller i models med merke først, f.eks. «RH Logic 400».
- condition: «used» og «refurbished» hvis kunden ikke sier noe annet. «new» bare når kunden ber om nytt.
- accept_alternatives er true med mindre kunden sier «kun», «bare» eller «må være» om merket.
- hard_constraints er absolutte krav (budsjettgrense, frist, «må», antall minst). preferences er ønsker («gjerne», «helst», farger).
- deadline er siste frist som ISO-dato. «Før november» betyr første dag i neste november.
- missing_critical lister bare det som faktisk mangler: category, quantity, location. budget bare hvis kunden ber om å bli spurt.
- Gjett aldri merker, steder eller tall som ikke står i teksten.
- confidence er hvor sikker tolkningen er (0–1).`;
