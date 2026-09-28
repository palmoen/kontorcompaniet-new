import { expect, test } from "@playwright/test";
import { redirectRows } from "./helpers";

/** Alle mål i redirect-kartet må finnes (200) – ellers sender vi gamle URL-er til 404 */
test("alle redirect-mål svarer 200", async ({ request }) => {
  const targets = new Set(
    redirectRows().filter((r) => ["301", "MERGE", "KEEP"].includes(r.action) && r.next.startsWith("http")).map((r) => new URL(r.next).pathname),
  );
  expect(targets.size).toBeGreaterThan(30);
  const failures: string[] = [];
  for (const path of targets) {
    const res = await request.get(path, { maxRedirects: 0 });
    if (res.status() !== 200) failures.push(`${path}: ${res.status()}`);
  }
  expect(failures).toEqual([]);
});

/** Nettstedet er ikke en nettbutikk */
test("ingen handlekurv, kasse eller kjøpsknapper", async ({ page }) => {
  for (const path of ["/", "/produkter/kontorstoler", "/merkevarer/hag", "/kontakt"]) {
    await page.goto(path);
    const text = (await page.locator("body").innerText()).toLowerCase();
    for (const word of ["handlekurv", "legg i kurv", "til kassen", "kjøp nå", "checkout"]) expect(text, `${path}: «${word}»`).not.toContain(word);
  }
});

test("Legg til i prosjekt → prosjektliste → henvendelse", async ({ page }) => {
  await page.goto("/produkter/kontorstoler");
  const card = page.locator(".product", { hasText: "HÅG Capisco 8106" });
  await card.getByRole("button", { name: "Legg til i prosjekt" }).click();
  await expect(card.getByRole("button", { name: "Lagt til i prosjekt" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".site-header .list-link")).toContainText("1");

  await page.goto("/kontakt");
  const form = page.locator("#skjema form");
  await expect(form.getByText("HÅG Capisco 8106", { exact: true })).toBeVisible();
  await form.getByPlaceholder("Antall").fill("12");
  await form.getByLabel("Navn", { exact: true }).fill("Testperson E2E");
  await form.getByLabel("E-post", { exact: true }).fill(`e2e+${Date.now()}@eksempel.no`);
  await form.getByLabel("Fortell kort hva dere trenger").fill("Test fra ende-til-ende-test.");
  await form.getByRole("checkbox").check();
  await form.getByRole("button", { name: "Send henvendelse" }).click();
  await expect(page.getByRole("status")).toContainText("Takk, vi har fått henvendelsen");
  await expect(page.locator(".site-header .list-link")).toHaveCount(0);
});

test("skjemaet avviser manglende samtykke", async ({ page }) => {
  await page.goto("/losninger/moterom");
  const form = page.locator("#foresporsel form");
  await form.getByLabel("Navn", { exact: true }).fill("Testperson");
  await form.getByLabel("E-post", { exact: true }).fill("test@eksempel.no");
  await form.getByLabel("Fortell kort hva dere trenger").fill("Vi trenger to møterom.");
  await form.getByRole("button", { name: "Send henvendelse" }).click();
  await expect(form.getByRole("alert")).toContainText("samtykke");
});
