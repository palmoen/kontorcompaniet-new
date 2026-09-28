import Link from "next/link";
import { scoutContext } from "@/lib/scout/context";
import { requireAdmin } from "@/lib/supabase/auth";
import { runTickNow } from "./actions";

export const dynamic = "force-dynamic";
const df = new Intl.DateTimeFormat("nb-NO", { dateStyle: "short", timeStyle: "short" });
const STATUS: Record<string, string> = { draft: "Utkast", active: "Aktiv", paused: "Pauset", matched: "Har treff", won: "Vunnet", lost: "Tapt", expired: "Utløpt" };

export default async function AdminScoutList() {
  await requireAdmin(["sales"]);
  const ctx = scoutContext();
  if (!ctx) return <p>DATABASE_URL er ikke satt.</p>;
  const rows = await ctx.store.adminRequests();
  return (
    <div className="stack" style={{ ["--st" as string]: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 16, flexWrap: "wrap" }}>
        <div className="stack"><span className="eyebrow">Møbelscout</span><h1>Aktive Scouts</h1></div>
        <form action={runTickNow}><button className="btn btn-secondary" type="submit">Kjør søk nå</button></form>
      </div>
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
    </div>
  );
}
