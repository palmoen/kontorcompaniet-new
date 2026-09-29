import "server-only";
import OpenAI from "openai";
import { env } from "@/lib/env";
import { summarizeNeed } from "../need";
import type { AiProvider, ExtractedListing } from "./provider";
import { PARSE_INSTRUCTIONS, scoutNeedJsonSchema } from "./schema";

export function createOpenAiProvider(): AiProvider {
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY, maxRetries: 1, timeout: 20_000 });
  const model = env.OPENAI_SCOUT_MODEL;

  return {
    name: "openai",

    async parseNeed(text, today) {
      const t0 = Date.now();
      const res = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: PARSE_INSTRUCTIONS(today) },
          { role: "user", content: text },
        ],
        response_format: { type: "json_schema", json_schema: { name: "scout_need", strict: true, schema: scoutNeedJsonSchema } },
      });
      const content = res.choices[0]?.message?.content ?? "{}";
      return {
        raw: JSON.parse(content),
        usage: { model, inputTokens: res.usage?.prompt_tokens, outputTokens: res.usage?.completion_tokens, latencyMs: Date.now() - t0 },
      };
    },

    async transcribe(audio) {
      const t0 = Date.now();
      const res = await client.audio.transcriptions.create({ file: audio, model: env.OPENAI_TRANSCRIBE_MODEL, language: "no" });
      return { text: res.text.trim(), usage: { model: env.OPENAI_TRANSCRIBE_MODEL, latencyMs: Date.now() - t0 } };
    },

    async judgeEquivalent({ need, itemTitle }) {
      const t0 = Date.now();
      const res = await client.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content:
              "Du vurderer om et brukt kontormøbel er et reelt alternativ til det kunden ba om (samme bruk, kvalitetsnivå og funksjon). Svar kun med JSON.",
          },
          { role: "user", content: `Kundens behov: ${summarizeNeed(need).map((l) => l.text).join("; ")}\nVare: ${itemTitle}` },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "equivalence",
            strict: true,
            schema: {
              type: "object", additionalProperties: false, required: ["equivalent", "confidence", "reason"],
              properties: { equivalent: { type: "boolean" }, confidence: { type: "number" }, reason: { type: "string" } },
            },
          },
        },
      });
      const out = JSON.parse(res.choices[0]?.message?.content ?? "{}") as { equivalent: boolean; confidence: number; reason: string };
      return { ...out, usage: { model, inputTokens: res.usage?.prompt_tokens, outputTokens: res.usage?.completion_tokens, latencyMs: Date.now() - t0 } };
    },

    async extractListings({ pageText, pageUrl, categoryLabel }) {
      const t0 = Date.now();
      const nullable = (type: string) => ({ type: [type, "null"] });
      const res = await client.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content:
              `Du leser teksten fra en oversiktsside hos en forhandler av brukte kontormøbler og lister opp varene som er ${categoryLabel}. `
              + "Ta bare med varer som faktisk står på siden. Ikke gjett: bruk null når noe ikke står. Pris i hele kroner uten mva hvis det står, ellers prisen som står. "
              + "url er lenken til varen (står i hakeparentes etter teksten), gjort absolutt ut fra sidens adresse. Svar kun med JSON.",
          },
          { role: "user", content: `Side: ${pageUrl}\n\n${pageText}` },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "listings",
            strict: true,
            schema: {
              type: "object", additionalProperties: false, required: ["items"],
              properties: {
                items: {
                  type: "array",
                  items: {
                    type: "object", additionalProperties: false,
                    required: ["title", "brand", "model", "quantity", "condition", "price_nok", "location", "url"],
                    properties: {
                      title: { type: "string" }, brand: nullable("string"), model: nullable("string"), quantity: nullable("integer"),
                      condition: { type: ["string", "null"], enum: ["new", "used", "refurbished", "demo", null] },
                      price_nok: nullable("number"), location: nullable("string"), url: nullable("string"),
                    },
                  },
                },
              },
            },
          },
        },
      });
      const out = JSON.parse(res.choices[0]?.message?.content ?? "{}") as { items?: ExtractedListing[] };
      return { items: out.items ?? [], usage: { model, inputTokens: res.usage?.prompt_tokens, outputTokens: res.usage?.completion_tokens, latencyMs: Date.now() - t0 } };
    },
  };
}
