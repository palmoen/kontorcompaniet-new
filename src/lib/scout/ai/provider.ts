import type { ScoutNeed } from "../need";

export type AiUsage = { model: string; inputTokens?: number; outputTokens?: number; audioSeconds?: number; latencyMs: number };

/**
 * Leverandørnøytralt AI-lag. Scout-logikken kjenner bare dette grensesnittet –
 * modell og leverandør byttes i konfigurasjon (se openai.ts / rules.ts).
 */
export interface AiProvider {
  readonly name: string;
  /** Naturlig språk → strukturert behov (validert mot scoutNeedSchema av kalleren) */
  parseNeed(text: string, today: string): Promise<{ raw: unknown; usage: AiUsage }>;
  /** Tale → tekst. Mangler når leverandøren ikke støtter det (UI skjuler da mikrofonen). */
  transcribe?(audio: File): Promise<{ text: string; usage: AiUsage }>;
  /** Gråsone i matching: er varen et reelt alternativ til det kunden ba om? */
  judgeEquivalent?(input: { need: ScoutNeed; itemTitle: string }): Promise<{ equivalent: boolean; confidence: number; reason: string; usage: AiUsage }>;
  /** Nettside-kilder: les ut varer fra teksten på en oversiktsside (rådata, normaliseres av adapteren) */
  extractListings?(input: { pageText: string; pageUrl: string; categoryLabel: string }): Promise<{ items: ExtractedListing[]; usage: AiUsage }>;
}

export type ExtractedListing = {
  title: string; brand: string | null; model: string | null; quantity: number | null;
  condition: "new" | "used" | "refurbished" | "demo" | null; price_nok: number | null; location: string | null; url: string | null;
};
