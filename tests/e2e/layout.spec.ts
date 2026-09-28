import { expect, test } from "@playwright/test";

test("forside: ingen horisontal scrolling og tastaturnavigasjon", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await page.keyboard.press("Tab");
  await expect(page.locator(".skip-link")).toBeFocused();
});

test("mobilmeny åpner og lukker", async ({ page, isMobile }) => {
  test.skip(!isMobile, "kun mobil");
  await page.goto("/");
  const btn = page.getByRole("button", { name: "Meny" });
  await btn.click();
  await expect(page.getByRole("navigation", { name: "Hovedmeny" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Lukk" })).toHaveAttribute("aria-expanded", "true");
});
