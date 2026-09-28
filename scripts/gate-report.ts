/**
 * Kvalitetsport-rapport: hvilke innholdssider indekseres, og hva som mangler på resten.
 * Kjør: npm run gates
 */
import { allGatedPages } from "@/lib/site/pages";

async function main() {
  const rows = await allGatedPages();
  const pass = rows.filter((r) => r.gate.pass);
  console.log(`\n${pass.length} av ${rows.length} innholdssider består kvalitetsporten\n`);
  for (const r of rows) {
    console.log(`${r.gate.pass ? "✓" : "✗"} ${r.path.padEnd(44)} ${r.gate.reasons.join("; ")}`);
  }
}

main();
