import "server-only";
import { hasOpenAi } from "@/lib/env";
import { scoutNeedSchema, type ScoutNeed } from "../need";
import { parseNeedRules } from "../parse-rules";
import { createOpenAiProvider } from "./openai";
import type { AiProvider, AiUsage } from "./provider";

let provider: AiProvider | null | undefined;
export function getAiProvider(): AiProvider | null {
  if (provider === undefined) provider = hasOpenAi ? createOpenAiProvider() : null;
  return provider;
}

export const voiceEnabled = () => Boolean(getAiProvider()?.transcribe);

export type AiLogger = (entry: { purpose: "scout_parse" | "scout_semantic" | "transcribe"; ok: boolean; usage?: AiUsage; error?: string }) => void | Promise<void>;

/**
 * Tolker behovet. AI når konfigurert (validert med Zod), ellers – eller ved feil –
 * regelbasert tolkning. Kunden får alltid et resultat å bekrefte eller endre.
 */
export async function interpretNeed(text: string, log?: AiLogger, now = new Date()): Promise<{ need: ScoutNeed; source: "ai" | "rules" }> {
  const ai = getAiProvider();
  if (ai) {
    try {
      const { raw, usage } = await ai.parseNeed(text, now.toISOString().slice(0, 10));
      const parsed = scoutNeedSchema.safeParse(raw);
      await log?.({ purpose: "scout_parse", ok: parsed.success, usage, error: parsed.success ? undefined : "schema" });
      if (parsed.success) return { need: parsed.data, source: "ai" };
    } catch (e) {
      await log?.({ purpose: "scout_parse", ok: false, error: e instanceof Error ? e.message.slice(0, 300) : "ukjent" });
    }
  }
  return { need: parseNeedRules(text, now), source: "rules" };
}
