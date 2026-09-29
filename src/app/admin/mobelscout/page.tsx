import Link from "next/link";
import { scoutContext } from "@/lib/scout/context";
import { requireAdmin } from "@/lib/supabase/auth";
import { runTickNow } from "./actions";

export const dynamic = "force-dynamic";
const df = new Intl.DateTimeFormat("nb-NO", { dateStyle: "short", timeStyle: "short" });
const LEGAL: Record<string, string> = { approved: "Godkjent", test: "Test (intern)", not_assessed: "Ikke vurdert", rejected: "Avvist" };
const STATUS: Record<string, string> = { draft: "Utkast", active: "Aktiv", paused: "Pauset", matched: "Har treff", won: "Vunnet", lost: "Tapt", expired: "Utløpt" };

export default async function AdminScoutList() {
  await requireAdmin(["sales"]);
  const ctx = scoutContext();
  if (!ctx) return <p>DATABASE_URL er ikke satt.</p>;
  const [rows, sources] = await Promise.all([ctx.store.adminRequests(), ctx.store.sourcesOverview()]);
  return (
    <div className="stack" style={{ ["--st" as string]: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 16, flexWrap: "wrap" }}>
        <div className="stack"><span className="eyebrow">Møbelscout</span><h1>Aktive Scouts</h1></div>
        <form action={runTickNow}><button className="btn btn-secondary" type="submit">Kjør søk nå</button></form>
      </div>
      <p className="hint">«Kjør søk nå» henter fra alle aktive kilder med én gang{ctx.allowTestSources ? ", også testkilder" : ". Testkilder kjøres ikke i produksjon"}.</p>
      <div style={{ overflowX: "auto" }}>
        <table className="admin-table">
          <thead><tr><th>Opprettet</th><th>Kunde</th><th>Behov</th><th>Status</th><th>Siste søk</th><th className="num">Treff</th><th className="num">Til vurdering</th><th className="num">Beste</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="num">{df.format(r.created_at)}</td>
                <td><Link href={`/admin/mobelscout/${r.id}`}><b>{r.company ?? "–"}</b></Link><br /><span className="hint">{r.contact} · {r.email}</span></td>
                <td style={{ maxWidth: 360 }}>{r.original_prompt.slice(0, 140)}{r.original_prompt.length > 140 ? " …" : ""}</td>
                <td>{STATUS[r.status] ?? r.status}</td>
                <td className="num">{r.last_matched_at ? df.format(r.last_matched_at) : "–"}</td>
                <td className="num">{r.matches}</td>
                <td className="num">{r.to_review > 0 ? <b>{r.to_review}</b> : 0}</td>
                <td className="num">{r.best ?? "–"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="muted">Ingen Scouts ennå.</td></tr>}
          </tbody>
        </table>
      </div>

      <h2>Kilder</h2>
      <div style={{ overflowX: "auto" }}>
        <table className="admin-table">
          <thead><tr><th>Kilde</th><th>Status</th><th>Aktiv</th><th className="num">Hvert</th><th>Siste kjøring</th><th className="num">Varer nå</th><th>Resultat</th></tr></thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.key}>
                <td><b>{s.name}</b><br /><span className="hint">{s.adapter}</span></td>
                <td>{LEGAL[s.legal_status] ?? s.legal_status}</td>
                <td>{s.is_active ? "Ja" : "Nei"}</td>
                <td className="num">{s.interval_minutes} min</td>
                <td className="num">{s.last_run_at ? df.format(s.last_run_at) : "–"}</td>
                <td className="num">{s.items}</td>
                <td>{s.last_ok == null ? "–" : s.last_ok ? `OK, ${s.last_fetched} hentet` : <span style={{ color: "var(--signal-deep)" }}>Feil: {s.last_error}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
