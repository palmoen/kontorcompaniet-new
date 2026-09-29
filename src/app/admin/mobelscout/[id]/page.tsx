import Link from "next/link";
import { notFound } from "next/navigation";
import { scoutContext } from "@/lib/scout/context";
import { summarizeNeed } from "@/lib/scout/need";
import { requireAdmin } from "@/lib/supabase/auth";
import { approveMatch, notifyNow, rejectMatch, setRequestStatus } from "../actions";

export const dynamic = "force-dynamic";
const nf = new Intl.NumberFormat("nb-NO");
const kr = (v: string | null) => (v == null ? "–" : `${nf.format(Number(v))} kr`);
const MATCH: Record<string, string> = { candidate: "Til vurdering", approved: "Godkjent (ikke varslet)", presented: "Vist kunden", interested: "INTERESSERT", rejected: "Avvist", unavailable: "Utilgjengelig" };

export default async function AdminScoutDetail({ params }: PageProps<"/admin/mobelscout/[id]">) {
  await requireAdmin(["sales"]);
  const { id } = await params;
  const ctx = scoutContext();
  if (!ctx || !/^[0-9a-f-]{36}$/.test(id)) notFound();
  const data = await ctx.store.adminRequest(id);
  if (!data) notFound();
  const { request: r, matches } = data;
  const approvedWaiting = matches.some((m) => m.status === "approved");

  return (
    <div className="stack" style={{ ["--st" as string]: "2rem" }}>
      <p><Link href="/admin/mobelscout">← Alle Scouts</Link></p>
      <div className="two-col">
        <div className="stack">
          <span className="eyebrow">{r.status}</span>
          <h1 style={{ fontSize: "2rem" }}>{r.company}</h1>
          <p>{r.contact} · <span className="selectable">{r.email}</span>{r.phone ? <> · <span className="selectable">{r.phone}</span></> : null}</p>
          <p className="hint">Kilde: {[r.attribution.utm_source, r.attribution.utm_medium, r.attribution.utm_campaign].filter(Boolean).join(" / ") || "direkte/ukjent"} · landingsside {r.attribution.landing_page ?? "–"}</p>
        </div>
        <div className="stack">
          <blockquote style={{ margin: 0, fontStyle: "italic" }}>«{r.original_prompt}»</blockquote>
          <ul className="understood">{summarizeNeed(r.need).map((l) => <li key={l.text} className={l.hard ? "hard" : undefined}>{l.text}</li>)}</ul>
          <p className="hint">Kundelenke: <span className="selectable">/mobelscout/resultat/{r.result_token}</span></p>
        </div>
      </div>

      <div className="btn-row">
        {(["active", "paused", "won", "lost"] as const).map((s) => (
          <form key={s} action={setRequestStatus}><input type="hidden" name="requestId" value={r.id} /><input type="hidden" name="status" value={s} />
            <button className="btn btn-secondary" type="submit" disabled={r.status === s}>{{ active: "Aktiver", paused: "Pause", won: "Vunnet", lost: "Tapt" }[s]}</button></form>
        ))}
        {approvedWaiting && <form action={notifyNow}><input type="hidden" name="requestId" value={r.id} /><button className="btn btn-primary" type="submit">Varsle kunden nå</button></form>}
      </div>

      <div className="stack" style={{ ["--st" as string]: "1rem" }}>
        <h2>Treff ({matches.length})</h2>
        {matches.map((m) => (
          <article key={m.id} className="match" style={{ background: m.status === "interested" ? "#FFF4EE" : undefined }}>
            <div className="top"><h3>{m.display_name ?? m.title_raw}</h3><span className="score"><span className="bar"><i style={{ width: `${m.score}%` }} /></span>{m.score} %</span></div>
            <dl>
              <div><dt>Status</dt><dd>{MATCH[m.status] ?? m.status}</dd></div>
              <div><dt>Antall</dt><dd>{m.quantity} (dekker {m.covered_qty})</dd></div>
              <div><dt>Kilde</dt><dd>{m.source_name}{m.source_status === "test" && <> · <b>testkilde</b></>}</dd></div>
              <div><dt>Område</dt><dd>{m.municipality ?? "–"}</dd></div>
              <div><dt>Kildepris</dt><dd>{kr(m.source_price_snapshot)}</dd></div>
              <div><dt>Kundepris</dt><dd>{kr(m.customer_price_ex_vat)}</dd></div>
              <div><dt>Margin/stk</dt><dd>{kr(m.margin_nok)}</dd></div>
              <div><dt>Stand</dt><dd>{m.condition ?? "–"}</dd></div>
            </dl>
            <p className="why">{m.explanation}</p>
            {m.source_url && <p className="hint">Kilde-URL (kun internt): <a href={m.source_url} rel="noopener noreferrer">{m.source_url}</a></p>}
            {m.source_status !== "approved" && (
              <p className="hint">Treff fra en testkilde. Kan ikke godkjennes eller sendes til kunden før kilden er avklart og godkjent.</p>
            )}
            {m.source_status === "approved" && (m.status === "candidate" || m.status === "approved") && (
              <div className="btn-row" style={{ alignItems: "end" }}>
                <form action={approveMatch} className="btn-row" style={{ alignItems: "end" }}>
                  <input type="hidden" name="matchId" value={m.id} /><input type="hidden" name="requestId" value={r.id} />
                  <div className="field"><label htmlFor={`dn-${m.id}`}>Visningsnavn</label><input id={`dn-${m.id}`} name="displayName" className="input" defaultValue={m.display_name ?? ""} placeholder="F.eks. RH Logic 400" /></div>
                  <div className="field"><label htmlFor={`pr-${m.id}`}>Kundepris/stk eks. mva.</label><input id={`pr-${m.id}`} name="customerPrice" className="input" inputMode="decimal" defaultValue={m.customer_price_ex_vat ? Number(m.customer_price_ex_vat) : ""} /></div>
                  <label className="check" htmlFor={`nt-${m.id}`}><input id={`nt-${m.id}`} name="notify" type="checkbox" defaultChecked /> Varsle kunden</label>
                  <button className="btn btn-primary" type="submit">{m.status === "approved" ? "Lagre" : "Godkjenn"}</button>
                </form>
                <form action={rejectMatch}><input type="hidden" name="matchId" value={m.id} /><input type="hidden" name="requestId" value={r.id} /><button className="btn-quiet" type="submit">Avvis</button></form>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
