import { after, NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { scoutContext } from "@/lib/scout/context";
import { scoutNeedSchema, summarizeNeed } from "@/lib/scout/need";
import { runMatching } from "@/lib/scout/service";

const CONSENT_TEXT_VERSION = "scout-2026-09";
const attr = z.string().max(300).optional();

const body = z.object({
  prompt: z.string().trim().min(8).max(2000),
  inputMode: z.enum(["text", "voice"]),
  need: scoutNeedSchema,
  contact: z.object({
    company: z.string().trim().min(2, "Skriv inn bedriftsnavn.").max(160),
    name: z.string().trim().min(2, "Skriv inn navnet ditt.").max(120),
    email: z.email("Skriv inn en gyldig e-postadresse.").max(200),
    phone: z.string().trim().max(40).optional().nullable(),
  }),
  consent: z.literal(true, { error: "Du må samtykke til at vi kontakter deg om treff." }),
  attribution: z.object({
    utm_source: attr, utm_medium: attr, utm_campaign: attr, utm_content: attr, utm_term: attr, referrer: attr, landing_page: attr, gclid: attr,
  }).default({}),
  website: z.string().max(0).optional(), // honeypot – skal være tom
});

export async function POST(req: NextRequest) {
  if (!rateLimit(`scout:${clientIp(req.headers)}`, 5, 10 * 60_000)) {
    return NextResponse.json({ error: "For mange forsøk. Prøv igjen senere, eller ring oss." }, { status: 429 });
  }
  const parsed = body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ugyldig forespørsel" }, { status: 400 });
  const ctx = scoutContext();
  if (!ctx) return NextResponse.json({ error: "Møbelscout er ikke tilgjengelig akkurat nå. Ring oss, så hjelper vi dere." }, { status: 503 });

  const d = parsed.data;
  const created = await ctx.store.createScout({
    prompt: d.prompt, inputMode: d.inputMode, need: d.need, attribution: d.attribution, sourcePath: "/mobelscout",
    contact: { company: d.contact.company, name: d.contact.name, email: d.contact.email, phone: d.contact.phone || null },
    consent: { contact: true, textVersion: CONSENT_TEXT_VERSION },
  });

  // Etter svaret: match mot eksisterende lager og varsle salg internt
  after(async () => {
    try {
      await runMatching(ctx.store, { requestId: created.id }, ctx.ai);
      const to = env.SALES_NOTIFY_EMAIL;
      if (to) {
        await ctx.mailer({
          to,
          subject: `Ny Møbelscout: ${d.contact.company}`,
          text: `${d.contact.name} (${d.contact.email}${d.contact.phone ? `, ${d.contact.phone}` : ""}) fra ${d.contact.company} har startet Møbelscout.\n\nBehov:\n${summarizeNeed(d.need).map((l) => `- ${l.text}`).join("\n")}\n\nOriginal tekst: «${d.prompt}»\n\nAdmin: ${ctx.siteUrl}/admin/mobelscout/${created.id}`,
        });
      }
    } catch (e) {
      console.error("[scout] etterarbeid feilet", e);
    }
  });

  return NextResponse.json({ token: created.token, resultUrl: `/mobelscout/resultat/${created.token}` }, { status: 201 });
}
