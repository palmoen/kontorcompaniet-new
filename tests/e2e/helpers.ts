import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const SITE = "https://kontorcompaniet.no";

/** Sider i sitemap (hentes fra appen selv, slik at nye sider testes automatisk) */
export async function sitemapPaths(request: import("@playwright/test").APIRequestContext): Promise<string[]> {
  const xml = await (await request.get("/sitemap.xml")).text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname || "/");
}

export function redirectRows(): { old: string; action: string; next: string }[] {
  const csv = readFileSync(resolve(__dirname, "../../docs/migration/redirect-map.csv"), "utf8");
  const [head, ...lines] = csv.trim().split(/\r?\n/);
  const cols = head.split(",");
  const iOld = cols.indexOf("old_url"), iAct = cols.indexOf("action"), iNew = cols.indexOf("new_url");
  return lines
    .map((l) => l.match(/("([^"]|"")*"|[^,]*)(,|$)/g)!.map((c) => c.replace(/,$/, "").replace(/^"|"$/g, "")))
    .filter((c) => c[iOld]?.startsWith("http"))
    .map((c) => ({ old: c[iOld], action: c[iAct], next: c[iNew] }));
}
