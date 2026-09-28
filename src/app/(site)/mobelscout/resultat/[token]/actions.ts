"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { env } from "@/lib/env";
import { scoutContext } from "@/lib/scout/context";

const token = z.string().regex(/^[0-9a-f]{48}$/);
const uuid = z.uuid();

export async function markInterested(formData: FormData) {
  const t = token.parse(formData.get("token"));
  const m = uuid.parse(formData.get("matchId"));
  const ctx = scoutContext();
  if (!ctx) throw new Error("Møbelscout er ikke konfigurert");
  const r = await ctx.store.markInterested(t, m);
  if (r && !r.alreadyInterested && env.SALES_NOTIFY_EMAIL) {
    await ctx.mailer({
      to: env.SALES_NOTIFY_EMAIL,
      subject: `HØY PRIORITET: Kunde interessert i ${r.displayName}`,
      text: `En kunde har trykket «Dette er interessant» på ${r.displayName}.\n\nBekreft tilgjengelighet, pris, stand og logistikk før bindende tilbud.\n\nAdmin: ${ctx.siteUrl}/admin/mobelscout/${r.requestId}`,
    }).catch((e) => console.error("[scout] salgsvarsel feilet", e));
  }
  redirect(`/mobelscout/resultat/${t}?interessert=${m}#treff-${m}`);
}

export async function markRejected(formData: FormData) {
  const t = token.parse(formData.get("token"));
  const m = uuid.parse(formData.get("matchId"));
  const feedback = z.string().max(300).optional().parse(formData.get("feedback") || undefined) ?? null;
  await scoutContext()?.store.markRejected(t, m, feedback);
  redirect(`/mobelscout/resultat/${t}#treff-${m}`);
}

export async function setScoutStatus(formData: FormData) {
  const t = token.parse(formData.get("token"));
  const status = z.enum(["paused", "active", "lost"]).parse(formData.get("status"));
  await scoutContext()?.store.setStatusByToken(t, status);
  redirect(`/mobelscout/resultat/${t}`);
}
