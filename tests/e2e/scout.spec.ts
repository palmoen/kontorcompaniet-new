import { expect, test } from "@playwright/test";
import postgres from "postgres";

/**
 * Møbelscout i nettleseren: behov → tolkning → bekreftelse → kontakt → Scout → tick (mock-kilde)
 * → godkjenning → forslag uten kildedata → «Dette er interessant» → høyprioritert lead.
 * Krever DATABASE_URL (migreringer + supabase/seed/dev.sql) og CRON_SECRET for serveren.
 */
const DB = process.env.DATABASE_URL;
const SECRET = process.env.CRON_SECRET;

test.describe("Møbelscout", () => {
  test.skip(!DB || !SECRET, "Krever DATABASE_URL og CRON_SECRET");

  test("hele flyten fra behov til interessert", async ({ page, request }) => {
    const sql = postgres(DB!, { max: 1, onnotice: () => {} });
    try {
      await sql`update scout.sources set next_run_at = now(), config = '{}' where key = 'mock'`;
      await page.goto("/mobelscout?utm_source=linkedin&utm_campaign=test");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Brukte kontormøbler. Vi leter for dere.");

      await page.getByLabel("Beskriv behovet med egne ord").fill(
        "Vi trenger ca. 30 ergonomiske kontorstoler fra HÅG eller RH, maks 4–5 000 kr per stol. Oslo/Drammen. Vi trenger dem før november.",
      );
      await page.getByRole("button", { name: "Fortsett" }).click();
      await expect(page.getByRole("heading", { name: "Slik forstår Møbelscout behovet deres" })).toBeVisible();
      await expect(page.locator(".understood li").first()).toHaveText("30 ergonomiske kontorstoler (minst 20)");
      await expect(page.locator(".understood")).toContainText("HÅG eller RH eller tilsvarende");

      await page.getByRole("button", { name: "Start Møbelscout" }).click();
      const email = `e2e+${Date.now()}@eksempel.no`;
      await page.getByLabel("Bedrift", { exact: true }).fill("E2E Test AS");
      await page.getByLabel("Kontaktperson", { exact: true }).fill("Kari Test");
      await page.getByLabel("E-post", { exact: true }).fill(email);
      await page.getByLabel(/Dere kan kontakte meg/).check();
      await page.getByRole("button", { name: "Start Møbelscout" }).click();
      await expect(page.getByRole("heading", { name: "Møbelscout er i gang" })).toBeVisible();

      await page.getByRole("link", { name: "Gå til resultatsiden" }).click();
      await page.waitForURL(/\/mobelscout\/resultat\/[0-9a-f]{48}$/);
      await expect(page.getByRole("heading", { name: "Vi leter", exact: true })).toBeVisible();
      expect(await page.locator('meta[name="robots"]').first().getAttribute("content")).toContain("noindex");
      const token = page.url().split("/").pop()!.split(/[?#]/)[0];

      // Attribusjon fulgte med
      const [lead] = await sql`select l.attribution from crm.leads l join crm.contacts c on c.id = l.contact_id where c.email = ${email}`;
      expect(lead.attribution).toMatchObject({ utm_source: "linkedin", utm_campaign: "test", landing_page: "/mobelscout" });

      // Jobb-endepunktet krever hemmelighet, og henter + matcher
      expect((await request.post("/api/cron/scout-tick")).status()).toBe(401);
      const tick = await request.post("/api/cron/scout-tick", { headers: { Authorization: `Bearer ${SECRET}` } });
      expect(tick.status()).toBe(200);

      // Intern godkjenning (admin-UI testes via integrasjonstestene; her direkte i databasen)
      const [best] = await sql`select m.id, m.item_id from scout.matches m join scout.requests r on r.id = m.request_id
                               where r.result_token = ${token} order by m.score desc limit 1`;
      await sql`insert into scout.item_presentation (item_id, display_name, approved_at) values (${best.item_id}, 'RH Logic 400', now())
                on conflict (item_id) do update set display_name = excluded.display_name, approved_at = now()`;
      await sql`update scout.matches set status = 'approved' where id = ${best.id}`;

      await page.reload();
      const card = page.locator(`#treff-${best.id}`);
      await expect(card.getByRole("heading", { name: "RH Logic 400" })).toBeVisible();
      await expect(card).toContainText("24 stk");
      await expect(card.locator(".price")).toContainText(/3\s490 kr\/stk/);
      await expect(card).toContainText("Vi kan komplettere de resterende 6");
      const html = await page.content();
      expect(html).not.toMatch(/example\.invalid|Mock-lager|source_url|source_price|margin_nok|3\s?170\b/i);

      await card.getByRole("button", { name: "Dette er interessant" }).click();
      await expect(page.locator(`#treff-${best.id} .done`)).toContainText("Vi har fått beskjed");
      const [interest] = await sql`select kind, priority from crm.leads where kind = 'scout_interest' and payload->>'match_id' = ${best.id}`;
      expect(interest).toMatchObject({ kind: "scout_interest", priority: "high" });
    } finally {
      await sql.end();
    }
  });

  test("feil token gir 404", async ({ page }) => {
    const res = await page.goto("/mobelscout/resultat/" + "0".repeat(48));
    expect(res?.status()).toBe(404);
  });
});
