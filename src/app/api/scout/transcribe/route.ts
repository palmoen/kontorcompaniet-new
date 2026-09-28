import { NextResponse, type NextRequest } from "next/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getAiProvider } from "@/lib/scout/ai";
import { scoutContext } from "@/lib/scout/context";

export const maxDuration = 30;
const MAX_BYTES = 5 * 1024 * 1024; // ~ 1–2 min tale

/** Tale → tekst. Tillegg til tekstfeltet – teksten kan alltid redigeres før tolkning. */
export async function POST(req: NextRequest) {
  const ai = getAiProvider();
  if (!ai?.transcribe) return NextResponse.json({ error: "Tale er ikke tilgjengelig. Skriv behovet i stedet." }, { status: 503 });
  if (!rateLimit(`stt:${clientIp(req.headers)}`, 6, 60_000)) return NextResponse.json({ error: "For mange forsøk. Prøv igjen om litt." }, { status: 429 });

  const form = await req.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof File) || audio.size === 0) return NextResponse.json({ error: "Fant ikke lydopptaket." }, { status: 400 });
  if (audio.size > MAX_BYTES) return NextResponse.json({ error: "Opptaket er for langt. Hold det under et par minutter." }, { status: 413 });
  if (!/^audio\//.test(audio.type)) return NextResponse.json({ error: "Ukjent lydformat." }, { status: 415 });

  try {
    const { text, usage } = await ai.transcribe(audio);
    await scoutContext()?.store.logAiCall({ purpose: "transcribe", ok: true, model: usage.model, latencyMs: usage.latencyMs });
    return NextResponse.json({ text });
  } catch (e) {
    await scoutContext()?.store.logAiCall({ purpose: "transcribe", ok: false, error: e instanceof Error ? e.message.slice(0, 300) : "ukjent" });
    return NextResponse.json({ error: "Vi klarte ikke å gjøre om talen til tekst. Prøv igjen, eller skriv behovet." }, { status: 502 });
  }
}
