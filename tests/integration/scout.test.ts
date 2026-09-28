/**
 * Integrasjonstest av hele Møbelscout-løpet mot ekte Postgres (migreringer + dev-seed).
 * Kjøres når TEST_DATABASE_URL er satt: eval "$(bash scripts/db-local.sh start)" && TEST_DATABASE_URL=$DATABASE_URL npm test
 */
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Email } from "@/lib/email";
import { parseNeedRules } from "@/lib/scout/parse-rules";
import { notifyAll, runMatching, tick } from "@/lib/scout/service";
import { scoutStore } from "@/lib/scout/store";

const url = process.env.TEST_DATABASE_URL;
const EXAMPLE = "Vi trenger ca. 30 ergonomiske kontorstoler fra HÅG eller RH, maks 4–5.000 kr per stol. Oslo/Drammen. Vi trenger dem før november.";

describe.skipIf(!url)("Møbelscout ende-til-ende (database)", () => {
  const sql = postgres(url ?? "postgres://x", { prepare: false, max: 2, onnotice: () => {} });
  const store = scoutStore(sql as never);
  const sent: Email[] = [];
  const deps = { store, mailer: async (m: Email) => { sent.push(m); return "test-id"; }, siteUrl: "https://kontorcompaniet.no", ai: null };
  let token = "";
  let requestId = "";

  beforeAll(async () => {
    // Testdatabase: start fra ren Scout-/CRM-tilstand
    await sql`truncate scout.requests, scout.items, scout.source_runs, scout.notifications, crm.leads, crm.contacts,
              crm.organizations, ops.analytics_events, ops.domain_events, ops.ai_calls restart identity cascade`;
    await sql`update scout.sources set next_run_at = now(), config = '{}' where key = 'mock'`;
  });
  afterAll(async () => { await sql.end(); });

  it("oppretter Scout med organisasjon, kontakt, lead, linjer og hendelser i én transaksjon", async () => {
    const need = parseNeedRules(EXAMPLE, new Date("2026-09-28"));
    const r = await store.createScout({
      prompt: EXAMPLE, inputMode: "text", need, sourcePath: "/mobelscout",
      contact: { company: "Eksempel AS", name: "Kari Nordmann", email: `kari+${Date.now()}@eksempel.no` },
      consent: { contact: true, textVersion: "v1" },
      attribution: { utm_source: "linkedin", utm_medium: "paid", landing_page: "/mobelscout" },
    });
    token = r.token; requestId = r.id;
    expect(token).toMatch(/^[0-9a-f]{48}$/);
    const [lead] = await sql`select kind, attribution from crm.leads where id = ${r.leadId}`;
    expect(lead.kind).toBe("scout");
    expect(lead.attribution.utm_source).toBe("linkedin");
    const lines = await sql`select category, quantity_target, brands from scout.request_lines where request_id = ${r.id}`;
    expect(lines).toEqual([{ category: "office_chair", quantity_target: 30, brands: ["HÅG", "RH"] }]);
    const events = await sql`select name from ops.analytics_events where scout_request_id = ${r.id} order by id`;
    expect(events.map((e) => e.name)).toEqual(["scout_confirmed", "scout_activated"]);
  });

  it("tick henter per kategori (ikke per Scout) og matcher nye varer", async () => {
    const summary = await tick(deps);
    expect(summary.sources).toBe(1);
    expect(summary.matches).toBeGreaterThan(0);
    const [run] = await sql`select categories from scout.source_runs order by id desc limit 1`;
    expect(run.categories).toContain("office_chair");
    expect(run.categories).not.toContain("desk"); // ingen Scout etterspør skrivebord
    const matches = await sql`select m.score, m.covered_qty, m.customer_price_ex_vat::int as price, i.brand, i.model, m.status
                              from scout.matches m join scout.items i on i.id = m.item_id where m.request_id = ${requestId} order by m.score desc`;
    const rh = matches.find((m) => m.brand === "RH")!;
    expect(rh).toMatchObject({ covered_qty: 24, price: 3490, status: "candidate" });
    expect(matches.find((m) => m.brand === "Vitra")).toBeUndefined(); // utstillingsmodell ikke ønsket + over budsjett
    expect(matches[0].brand).toBe("RH");
  });

  it("kunden ser ingenting før Kontorcompaniet har godkjent", async () => {
    const res = await store.resultByToken(token);
    expect(res!.matches).toHaveLength(0);
  });

  it("godkjent treff vises uten kildedata, og varsel sendes samlet (maks én per døgn)", async () => {
    const admin = await store.adminRequest(requestId);
    const top = admin!.matches[0];
    expect(top.source_url).toContain("example.invalid"); // admin ser kilden
    expect(await store.approveMatch(top.id, null)).toBe(true);

    const res = await store.resultByToken(token);
    expect(res!.matches).toHaveLength(1);
    const shown = res!.matches[0];
    expect(shown.display_name).toBe("RH Logic 400");
    expect(Object.keys(shown)).not.toEqual(expect.arrayContaining(["source_url"]));
    expect(JSON.stringify(shown)).not.toMatch(/example\.invalid|source_price|margin|mock/i);

    expect(await notifyAll(deps)).toBe(1);
    expect(sent.at(-1)!.subject).toBe("Møbelscout har funnet noe");
    expect(sent.at(-1)!.text).toContain(`/mobelscout/resultat/${token}`);
    await store.approveMatch(admin!.matches[1].id, null);
    expect(await notifyAll(deps)).toBe(0); // allerede varslet siste døgn
  });

  it("«Dette er interessant» gir høyprioritert lead med intern sourcing-info (idempotent)", async () => {
    const res = await store.resultByToken(token);
    const matchId = res!.matches.find((m) => m.display_name === "RH Logic 400")!.match_id;
    const r = await store.markInterested(token, matchId);
    expect(r).toMatchObject({ alreadyInterested: false });
    const [lead] = await sql`select kind, priority, payload from crm.leads where id = ${(r as { leadId: string }).leadId}`;
    expect(lead).toMatchObject({ kind: "scout_interest", priority: "high" });
    expect(lead.payload).toMatchObject({ source_key: "mock", quantity: 24, product: "RH Logic 400" });
    expect(Number(lead.payload.source_price)).toBe(3170);
    expect(await store.markInterested(token, matchId)).toMatchObject({ alreadyInterested: true });
    expect(await store.markInterested("feil-token", matchId)).toBeNull();
    const [ev] = await sql`select count(*)::int as n from ops.domain_events where type = 'scout.match_interested' and aggregate_id = ${matchId}`;
    expect(ev.n).toBe(1);
  });

  it("kilden endrer pris/antall og fjerner varer: historikk og «unavailable»", async () => {
    await sql`update scout.sources set next_run_at = now(), config = ${sql.json({ overrides: { "m-002": { gone: true }, "m-006": { sourcePrice: 2500 } } })} where key = 'mock'`;
    for (let i = 0; i < 3; i++) {
      await tick(deps);
      await sql`update scout.sources set next_run_at = now() where key = 'mock'`;
    }
    const [futu] = await sql`select availability from scout.items where external_id = 'm-002'`;
    expect(futu.availability).toBe("gone");
    const [m] = await sql`select m.status from scout.matches m join scout.items i on i.id = m.item_id where i.external_id = 'm-002' and m.request_id = ${requestId}`;
    expect(m.status).toBe("unavailable");
    const [obs] = await sql`select count(*)::int as n from scout.item_observations o join scout.items i on i.id = o.item_id where i.external_id = 'm-006'`;
    expect(obs.n).toBe(2); // opprettet + prisendring
  });

  it("ny Scout matches umiddelbart mot eksisterende lager", async () => {
    const need = parseNeedRules("15 hev/senk skrivebord til Oslo, maks 3000 kr", new Date("2026-09-28"));
    const r = await store.createScout({
      prompt: "skrivebord", inputMode: "text", need, sourcePath: "/mobelscout",
      contact: { company: "Test AS", name: "Ola", email: `ola+${Date.now()}@test.no` }, consent: { contact: true, textVersion: "v1" }, attribution: {},
    });
    // Skrivebord er ikke hentet ennå (ingen etterspurte før nå) → 0 treff, neste tick henter kategorien
    expect((await runMatching(store, { requestId: r.id })).created).toBe(0);
    await sql`update scout.sources set next_run_at = now(), config = '{}' where key = 'mock'`;
    await tick(deps);
    const [row] = await sql`select count(*)::int as n from scout.matches where request_id = ${r.id}`;
    expect(row.n).toBe(1);
  });
});
