/**
 * Henvendelser mot ekte Postgres. Kjøres når TEST_DATABASE_URL er satt.
 */
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";
import { leadSchema, leadStore } from "@/lib/leads";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("henvendelser (database)", () => {
  const sql = postgres(url ?? "postgres://x", { prepare: false, max: 2, onnotice: () => {} });
  afterAll(async () => { await sql.end(); });

  it("lagrer lead, kontakt, organisasjon, prosjektliste og hendelser", async () => {
    const d = leadSchema.parse({
      kind: "quote_request", company: "Liste AS", name: "Ola Nordmann", email: `ola+${Date.now()}@eksempel.no`, consent: true,
      message: "", items: [{ slug: "hag-futu", name: "HÅG Futu", qty: 8 }, { slug: "finnes-ikke", name: "Ukjent" }],
      context: { category: "kontorstoler", brand: "hag" }, sourcePath: "/produkter/kontorstoler",
      attribution: { utm_source: "google" },
    });
    const { id } = await leadStore(sql as never).createLead(d);
    const [lead] = await sql`select l.kind, l.source_path, l.attribution, o.name as org, c.consent, b.slug as brand, cat.slug as category
                             from crm.leads l join crm.organizations o on o.id = l.organization_id join crm.contacts c on c.id = l.contact_id
                             left join content.brands b on b.id = l.brand_id left join content.categories cat on cat.id = l.category_id
                             where l.id = ${id}`;
    expect(lead).toMatchObject({ kind: "quote_request", source_path: "/produkter/kontorstoler", org: "Liste AS", brand: "hag", category: "kontorstoler" });
    expect(lead.attribution).toEqual({ utm_source: "google" });
    expect(lead.consent.text_version).toBeTruthy();
    const [list] = await sql`select items from crm.inquiry_lists where lead_id = ${id}`;
    expect(list.items).toHaveLength(2);
    expect(list.items[0].product_id).toBeTruthy(); // hag-futu finnes i dev-seed
    expect(list.items[1].product_id).toBeNull();
    const events = await sql`select name from ops.analytics_events where lead_id = ${id}`;
    expect(events.map((e) => e.name)).toEqual(["contact_submitted"]);
  });

  it("lagrer henvendelse uten bedrift", async () => {
    const d = leadSchema.parse({ kind: "contact", name: "Per", email: `per+${Date.now()}@eksempel.no`, consent: true, message: "Når er showroomet åpent?" });
    const { id } = await leadStore(sql as never).createLead(d);
    const [lead] = await sql`select organization_id, message from crm.leads where id = ${id}`;
    expect(lead.organization_id).toBeNull();
    expect(lead.message).toBe("Når er showroomet åpent?");
  });
});
