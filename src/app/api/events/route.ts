import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { scoutContext } from "@/lib/scout/context";

// Kun hendelser som oppstår i nettleseren. Resten logges på serveren der de skjer.
const body = z.object({ name: z.enum(["scout_started", "cta_click", "contact_started"]), path: z.string().max(300).optional(), props: z.record(z.string(), z.string().max(200)).optional() });

export async function POST(req: NextRequest) {
  if (!rateLimit(`ev:${clientIp(req.headers)}`, 30, 60_000)) return new NextResponse(null, { status: 204 });
  const parsed = body.safeParse(await req.json().catch(() => ({})));
  const ctx = scoutContext();
  if (parsed.success && ctx) await ctx.store.recordEvent(parsed.data.name, {}, parsed.data.props ?? {}, parsed.data.path ?? null).catch(() => {});
  return new NextResponse(null, { status: 204 });
}
