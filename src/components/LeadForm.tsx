"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { captureAttribution, readAttribution, track } from "@/lib/client/attribution";
import { projectList } from "@/lib/client/project-list";

type Kind = "contact" | "quote_request" | "advisor_request" | "project_request";
type Context = { brand?: string; category?: string; solution?: string; project?: string };

const kinds: { value: Kind; label: string }[] = [
  { value: "project_request", label: "Nytt kontor eller ombygging" },
  { value: "quote_request", label: "Tilbud på møbler" },
  { value: "advisor_request", label: "En prat med en rådgiver" },
  { value: "contact", label: "Noe annet" },
];

export function LeadForm({
  kind: initialKind = "project_request", context = {}, heading, showList = false, phone, placeholder,
}: { kind?: Kind; context?: Context; heading?: string; showList?: boolean; phone: string; placeholder?: string }) {
  const items = useSyncExternalStore(projectList.subscribe, projectList.getSnapshot, projectList.getServerSnapshot);
  const [kind, setKind] = useState<Kind>(initialKind);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => { captureAttribution(); }, []);

  if (sent) {
    return (
      <div className="lead-done" role="status">
        <h3>Takk, vi har fått henvendelsen.</h3>
        <p>Vi tar kontakt innen én arbeidsdag. Haster det, ring oss på <span className="selectable">{phone}</span>.</p>
      </div>
    );
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          company: String(f.get("company") ?? ""),
          name: String(f.get("name") ?? ""),
          email: String(f.get("email") ?? ""),
          phone: String(f.get("phone") ?? "") || null,
          message: String(f.get("message") ?? ""),
          items: showList ? items : [],
          context,
          consent: f.get("consent") === "on",
          sourcePath: location.pathname,
          attribution: readAttribution(),
          website: String(f.get("website") ?? ""),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Noe gikk galt. Prøv igjen, eller ring oss.");
      if (showList) projectList.clear();
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Noe gikk galt.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="lead-form" onSubmit={submit} onFocus={() => { if (!started) { setStarted(true); track("contact_started"); } }} noValidate>
      {heading && <h3>{heading}</h3>}

      {showList && items.length > 0 && (
        <fieldset className="list" id="prosjektliste">
          <legend>Prosjektlisten din</legend>
          <ul>
            {items.map((i) => (
              <li key={i.slug}>
                <span><b>{i.name}</b>{i.brand && !i.name.startsWith(i.brand) ? <span className="muted"> · {i.brand}</span> : null}</span>
                <label>
                  <span className="sr-only">Antall {i.name}</span>
                  <input
                    className="input qty" type="number" min={1} max={10000} inputMode="numeric" placeholder="Antall"
                    value={i.qty ?? ""} onChange={(e) => projectList.setQty(i.slug, e.target.value ? Number(e.target.value) : null)}
                  />
                </label>
                <button type="button" className="btn-quiet" onClick={() => projectList.remove(i.slug)}>Fjern</button>
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      <fieldset className="kinds">
        <legend className="field-label">Hva gjelder det?</legend>
        <div className="kind-options">
          {kinds.map((k) => (
            <label key={k.value} className="kind">
              <input type="radio" name="kind" value={k.value} checked={kind === k.value} onChange={() => setKind(k.value)} />
              <span>{k.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="field">
        <label htmlFor="lf-message">Fortell kort hva dere trenger</label>
        <textarea id="lf-message" name="message" className="input" maxLength={4000}
          placeholder={placeholder ?? "For eksempel: Vi flytter i mars og trenger 40 arbeidsplasser, to møterom og en kantine."} />
      </div>

      <div className="form-grid">
        <div className="field"><label htmlFor="lf-name">Navn</label><input id="lf-name" name="name" className="input" autoComplete="name" required /></div>
        <div className="field"><label htmlFor="lf-company">Bedrift</label><input id="lf-company" name="company" className="input" autoComplete="organization" /></div>
        <div className="field"><label htmlFor="lf-email">E-post</label><input id="lf-email" name="email" type="email" className="input" autoComplete="email" required /></div>
        <div className="field"><label htmlFor="lf-phone">Telefon <span className="hint">(valgfritt)</span></label><input id="lf-phone" name="phone" type="tel" className="input" autoComplete="tel" /></div>
      </div>
      <div className="hp" aria-hidden="true"><label>Nettsted<input name="website" tabIndex={-1} autoComplete="off" /></label></div>

      <label className="check">
        <input type="checkbox" name="consent" required />
        <span>Jeg samtykker til at Kontorcompaniet kontakter meg om denne henvendelsen. Se <a href="/personvern">personvern</a>.</span>
      </label>

      {error && <p className="error-text" role="alert">{error}</p>}
      <div className="btn-row">
        <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Sender …" : "Send henvendelse"}</button>
        <span className="hint">Vi svarer innen én arbeidsdag.</span>
      </div>
    </form>
  );
}
