import { after, NextResponse, type NextRequest } from "next/server";
import { getSql } from "@/lib/db";
import { createMailer } from "@/lib/email";
import { env, siteUrl } from "@/lib/env";
import { leadEmail, leadSchema, leadStore } from "@/lib/leads";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  if (!rateLimit(`lead:${clientIp(req.headers)}`, 5, 10 * 60_000)) {
    return NextResponse.json({ error: "For mange forsøk. Prøv igjen senere, eller ring oss." }, { status: 429 });
  }
  const parsed = leadSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ugyldig forespørsel" }, { status: 400 });
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: "Skjemaet er ikke tilgjengelig akkurat nå. Ring eller send oss en e-post." }, { status: 503 });

  const d = parsed.data;
  const { id } = await leadStore(sql).createLead(d);

  after(async () => {
    const to = env.SALES_NOTIFY_EMAIL;
    if (!to) return;
    try {
      const mail = leadEmail(d, `${siteUrl}/admin`);
      await createMailer({ apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM })({ to, ...mail });
    } catch (e) {
      console.error("[lead] varsel feilet", e);
    }
  });

  return NextResponse.json({ id }, { status: 201 });
}
