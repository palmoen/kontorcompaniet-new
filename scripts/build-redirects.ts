/**
 * docs/migration/redirect-map.csv → src/generated/redirects.json
 * Kjøres etter at tools/audit/build_redirect_map.py har regenerert kartet.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

type Entry = { to: string | null; status: 301 | 410 };

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.length > 1);
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
}

export function keyOf(url: string): string {
  const u = new URL(url);
  const path = u.pathname.replace(/\/+$/, "") || "/";
  return u.search ? `${path}${u.search}` : path;
}

const root = resolve(__dirname, "..");
const rows = parseCsv(readFileSync(resolve(root, "docs/migration/redirect-map.csv"), "utf8"));
const map: Record<string, Entry> = {};
const pending: string[] = [];
for (const r of rows) {
  if (!r.old_url.startsWith("http")) continue; // mønsterregler håndteres i kode
  const key = keyOf(r.old_url);
  const action = r.action;
  if (action === "AVVENTER" || action === "UAVKLART") { pending.push(key); continue; }
  if (action === "410") { map[key] = { to: null, status: 410 }; continue; }
  if (action === "KEEP") continue; // samme sti finnes på ny plattform
  const to = keyOf(r.new_url);
  if (to !== key) map[key] = { to, status: 301 };
}
const out = { generatedFrom: "docs/migration/redirect-map.csv", count: Object.keys(map).length, pending, map };
writeFileSync(resolve(root, "src/generated/redirects.json"), JSON.stringify(out, null, 1) + "\n");
console.log(`${out.count} redirects, ${pending.length} avventer (firmagaver)`);
