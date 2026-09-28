import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { scoutContext } from "@/lib/scout/context";
import { tick } from "@/lib/scout/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const secret = env.CRON_SECRET;
  const got = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || got.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(secret));
}

/** Kalles av pg_cron (se supabase/migrations/*_scout_cron.sql). Kilder med forfalt next_run_at hentes. */
export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
  const ctx = scoutContext();
  if (!ctx) return NextResponse.json({ error: "Database er ikke konfigurert" }, { status: 503 });
  const summary = await tick(ctx);
  return NextResponse.json({ ok: true, ...summary });
}
