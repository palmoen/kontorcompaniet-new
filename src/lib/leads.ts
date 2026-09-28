/**
 * Henvendelser fra nettstedet (kontakt, tilbud, rådgiver, prosjekt) → crm.leads.
 * «Legg til i prosjekt» er en forespørselsliste (crm.inquiry_lists), IKKE en handlekurv:
 * ingen priser, ingen ordre, ingen betaling.
 */
import { z } from "zod";
import type { Sql } from "@/lib/db";

export const LEAD_KINDS = ["contact", "quote_request", "advisor_request", "project_request"] as const;
export type LeadKind = (typeof LEAD_KINDS)[number];
export const CONSENT_TEXT_VERSION = "kontakt-2026-09";

const attr = z.string().max(300).optional();

export const inquiryItemSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/).max(120),
  name: z.string().trim().max(160),
  brand: z.string().trim().max(80).optional(),
  qty: z.number().int().min(1).max(10000).optional().nullable(),
});
export type InquiryItem = z.infer<typeof inquiryItemSchema>;

export const leadSchema = z.object({
  kind: z.enum(LEAD_KINDS),
  company: z.string().trim().max(160).optional().default(""),
  name: z.string().trim().min(2, "Skriv inn navnet ditt.").max(120),
  email: z.email("Skriv inn en gyldig e-postadresse.").max(200),
  phone: z.string().trim().max(40).optional().nullable(),
  message: z.string().trim().max(4000).optional().default(""),
  items: z.array(inquiryItemSchema).max(50).default([]),
  context: z.object({
    brand: z.string().regex(/^[a-z0-9-]+$/).max(80).optional(),
    category: z.string().regex(/^[a-z0-9-]+$/).max(80).optional(),
    solution: z.string().regex(/^[a-z0-9-]+$/).max(80).optional(),
    project: z.string().regex(/^[a-z0-9-]+$/).max(80).optional(),
  }).default({}),
  consent: z.literal(true, { error: "Du må samtykke til at vi kontakter deg." }),
  sourcePath: z.string().max(300).regex(/^\//).optional().default("/kontakt"),
  attribution: z.object({
    utm_source: attr, utm_medium: attr, utm_campaign: attr, utm_content: attr, utm_term: attr, referrer: attr, landing_page: attr, gclid: attr,
  }).default({}),
  website: z.string().max(0).optional(), // honeypot
}).refine((d) => d.message.length >= 5 || d.items.length > 0, { message: "Skriv noen ord om hva dere trenger.", path: ["message"] });

export type LeadInput = z.infer<typeof leadSchema>;

export const kindLabel: Record<LeadKind, string> = {
  contact: "Kontakt",
  quote_request: "Tilbudsforespørsel",
  advisor_request: "Rådgiver",
  project_request: "Prosjekt",
};

export function leadStore(sql: Sql) {
  return {
    async createLead(d: LeadInput): Promise<{ id: string }> {
      return sql.begin(async (tx) => {
        const orgId = d.company
          ? (await tx<{ id: string }[]>`insert into crm.organizations (name) values (${d.company}) returning id`)[0].id
          : null;
        const [contact] = await tx<{ id: string }[]>`
          insert into crm.contacts (organization_id, name, email, phone, consent)
          values (${orgId}, ${d.name}, ${d.email}, ${d.phone || null},
                  ${tx.json({ contact: true, text_version: CONSENT_TEXT_VERSION, at: new Date().toISOString() })})
          returning id`;
        const [lead] = await tx<{ id: string }[]>`
          insert into crm.leads (kind, organization_id, contact_id, message, payload, attribution, source_path,
                                 brand_id, category_id, project_ref_id)
          values (${d.kind}, ${orgId}, ${contact.id}, ${d.message || null}, ${tx.json({ items: d.items, context: d.context } as never)},
                  ${tx.json(d.attribution)}, ${d.sourcePath},
                  (select id from content.brands where slug = ${d.context.brand ?? null}),
                  (select id from content.categories where slug = ${d.context.category ?? null}),
                  (select id from content.projects where slug = ${d.context.project ?? null}))
          returning id`;
        if (d.items.length) {
          const items = [];
          for (const it of d.items) {
            const [prod] = await tx<{ id: string }[]>`select id from content.products where slug = ${it.slug}`;
            items.push({ product_id: prod?.id ?? null, slug: it.slug, name: it.name, qty_estimate: it.qty ?? null });
          }
          await tx`insert into crm.inquiry_lists (lead_id, items) values (${lead.id}, ${tx.json(items as never)})`;
        }
        await tx`insert into ops.domain_events (type, aggregate, aggregate_id, payload)
                 values ('lead.created', 'lead', ${lead.id}, ${tx.json({ kind: d.kind, items: d.items.length })})`;
        await tx`insert into ops.analytics_events (name, lead_id, path, props)
                 values ('contact_submitted', ${lead.id}, ${d.sourcePath}, ${tx.json({ kind: d.kind })})`;
        return { id: lead.id };
      });
    },
  };
}

/** Intern e-post til salg (ren tekst) */
export function leadEmail(d: LeadInput, adminUrl: string): { subject: string; text: string } {
  const who = `${d.name}${d.company ? `, ${d.company}` : ""}`;
  const lines = [
    `${kindLabel[d.kind]} fra ${who}`,
    `E-post: ${d.email}${d.phone ? ` · Telefon: ${d.phone}` : ""}`,
    `Side: ${d.sourcePath}`,
    "",
    d.message || "(ingen melding)",
  ];
  if (d.items.length) {
    lines.push("", "Prosjektliste:", ...d.items.map((i) => `- ${i.name}${i.brand ? ` (${i.brand})` : ""}${i.qty ? ` × ${i.qty}` : ""}`));
  }
  lines.push("", adminUrl);
  return { subject: `${kindLabel[d.kind]}: ${d.company || d.name}`, text: lines.join("\n") };
}
