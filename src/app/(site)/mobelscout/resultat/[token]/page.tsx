import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { scoutContext } from "@/lib/scout/context";
import { SCOUT_CATEGORIES, summarizeNeed } from "@/lib/scout/need";
import { markInterested, markRejected, setScoutStatus } from "./actions";

// Personlig side: aldri indeksert, aldri bufret
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { absolute: "Møbelscout – forslag | Kontorcompaniet" }, robots: { index: false, follow: false } };

const nf = new Intl.NumberFormat("nb-NO");
const CONDITION: Record<string, string> = { used: "Brukt", refurbished: "Refurbished", demo: "Utstillingsmodell", new: "Nytt" };

export default async function ScoutResultPage({ params, searchParams }: PageProps<"/mobelscout/resultat/[token]">) {
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f]{48}$/.test(token)) notFound();
  const ctx = scoutContext();
  if (!ctx) notFound();
  const data = await ctx.store.resultByToken(token);
  if (!data) notFound();

  const { request, matches } = data;
  for (const m of matches.filter((x) => x.match_status === "presented" || x.match_status === "approved")) {
    await ctx.store.recordEvent("match_viewed", { requestId: request.id, matchId: m.match_id }).catch(() => {});
  }
  const item = request.need.items[0];
  const title = `${item.quantity.target} ${item.quantity.target === 1 ? SCOUT_CATEGORIES[item.category].one : SCOUT_CATEGORIES[item.category].many}`;
  const active = request.status === "active" || request.status === "matched";
  const paused = request.status === "paused";
  const visible = matches.filter((m) => m.match_status !== "rejected");
  const rejected = matches.filter((m) => m.match_status === "rejected");

  return (
    <>
      <section className="band tight sand">
        <div className="wrap stack" style={{ ["--st" as string]: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
            <span className="eyebrow">Møbelscout</span>
            <span className={`statuspill ${active ? "" : "paused"}`}>{active ? "Leter aktivt" : paused ? "Pauset" : "Avsluttet"}</span>
          </div>
          <h1>{title}</h1>
          <p className="muted">{summarizeNeed(request.need).map((l) => l.text).join(" · ")}</p>
        </div>
      </section>

      <section className="band tight" aria-labelledby="h-funn">
        <div className="wrap stack" style={{ ["--st" as string]: "20px" }}>
          <div className="stack" style={{ ["--st" as string]: ".5rem" }}>
            <h2 id="h-funn">Forslag ({visible.length})</h2>
            <p className="muted">Hvert forslag er kvalitetssikret av Kontorcompaniet. Vi bekrefter tilgjengelighet, stand og levering før dere får et tilbud.</p>
          </div>

          {visible.length === 0 && (
            <div className="match">
              <h3>Vi leter</h3>
              <p className="muted">Ingen forslag ennå. Vi sier fra på e-post når vi finner noe som passer. Det kan ta alt fra noen timer til noen uker.</p>
            </div>
          )}

          {visible.map((m) => {
            const interested = m.match_status === "interested";
            return (
              <article className="match" key={m.match_id} id={`treff-${m.match_id}`}>
                <div className="top">
                  <h3>{m.display_name}</h3>
                  <span className="score"><span className="bar" aria-hidden="true"><i style={{ width: `${m.score}%` }} /></span>{m.score} % match</span>
                </div>
                <dl>
                  <div><dt>Antall</dt><dd className="num">{m.quantity} stk</dd></div>
                  <div><dt>Stand</dt><dd>{m.condition ? CONDITION[m.condition] ?? m.condition : "Oppgis ved tilbud"}</dd></div>
                  {m.color && <div><dt>Farge</dt><dd>{m.color[0].toUpperCase() + m.color.slice(1)}</dd></div>}
                  {m.municipality && <div><dt>Område</dt><dd>{m.municipality}</dd></div>}
                </dl>
                {m.customer_price_ex_vat && (
                  <p className="price num">{nf.format(Number(m.customer_price_ex_vat))} kr/stk <span className="hint">eks. mva.</span></p>
                )}
                <p className="why">{m.explanation}</p>
                {m.completion && <p className="complete">{m.completion.text}</p>}
                {interested ? (
                  <p className="done" role="status">
                    {sp.interessert === m.match_id ? "Takk! " : ""}Vi har fått beskjed og kontakter dere innen én arbeidsdag for å bekrefte tilgjengelighet, stand og levering.
                  </p>
                ) : (
                  <div className="btn-row">
                    <form action={markInterested} className="inline-form">
                      <input type="hidden" name="token" value={token} /><input type="hidden" name="matchId" value={m.match_id} />
                      <button className="btn btn-primary" type="submit">Dette er interessant</button>
                    </form>
                    <details>
                      <summary className="btn-quiet" style={{ listStyle: "none", display: "inline" }}>Ikke aktuelt</summary>
                      <form action={markRejected} className="stack" style={{ marginTop: 10, ["--st" as string]: ".6rem" }}>
                        <input type="hidden" name="token" value={token} /><input type="hidden" name="matchId" value={m.match_id} />
                        <label className="field-label" htmlFor={`fb-${m.match_id}`}>Hvorfor ikke? <span className="hint">(valgfritt – gjør neste forslag bedre)</span></label>
                        <input id={`fb-${m.match_id}`} name="feedback" className="input" maxLength={300} placeholder="F.eks. feil farge, for dyrt, for langt unna" />
                        <button className="btn btn-secondary" type="submit">Marker som ikke aktuelt</button>
                      </form>
                    </details>
                  </div>
                )}
              </article>
            );
          })}

          {rejected.length > 0 && <p className="hint">{rejected.length} forslag markert som ikke aktuelt.</p>}

          <div className="btn-row" style={{ justifyContent: "space-between", borderTop: "1px solid var(--line)", paddingTop: 20 }}>
            <span className="muted">{active ? "Møbelscout fortsetter å lete til dere pauser eller avslutter." : "Møbelscout leter ikke nå."}</span>
            {(active || paused) && (
              <div className="btn-row">
                <form action={setScoutStatus} className="inline-form">
                  <input type="hidden" name="token" value={token} /><input type="hidden" name="status" value={active ? "paused" : "active"} />
                  <button className="btn btn-secondary" type="submit">{active ? "Pause Møbelscout" : "Start igjen"}</button>
                </form>
                <form action={setScoutStatus} className="inline-form">
                  <input type="hidden" name="token" value={token} /><input type="hidden" name="status" value="lost" />
                  <button className="btn-quiet" type="submit">Avslutt</button>
                </form>
              </div>
            )}
          </div>
          <p className="hint">Spørsmål? <Link href="/kontakt">Kontakt oss</Link>.</p>
        </div>
      </section>
    </>
  );
}
