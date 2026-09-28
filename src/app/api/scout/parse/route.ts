import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { interpretNeed } from "@/lib/scout/ai";
import { scoutContext } from "@/lib/scout/context";
import { followUps, summarizeNeed } from "@/lib/scout/need";

const body = z.object({ text: z.string().trim().min(8, "Beskriv behovet med litt flere ord.").max(2000) });

export async function POST(req: NextRequest) {
  if (!rateLimit(`parse:${clientIp(req.headers)}`, 12, 60_000)) {
    return NextResponse.json({ error: "For mange forsøk. Vent et minutt og prøv igjen." }, { status: 429 });
  }
  const parsed = body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ugyldig forespørsel" }, { status: 400 });

  const ctx = scoutContext();
  const { need, source } = await interpretNeed(parsed.data.text, ctx
    ? (e) => ctx.store.logAiCall({ purpose: e.purpose, ok: e.ok, model: e.usage?.model, inputTokens: e.usage?.inputTokens, outputTokens: e.usage?.outputTokens, latencyMs: e.usage?.latencyMs, error: e.error })
    : undefined);
  if (ctx) await ctx.store.recordEvent("scout_parsed", {}, { source, missing: need.missing_critical.length }, "/mobelscout").catch(() => {});

  return NextResponse.json({ need, summary: summarizeNeed(need), questions: followUps(need), source });
}
