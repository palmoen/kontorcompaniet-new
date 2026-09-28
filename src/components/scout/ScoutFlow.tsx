"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { captureAttribution, readAttribution, track } from "@/lib/client/attribution";
import type { FollowUp, ScoutNeed, SummaryLine } from "@/lib/scout/need";

type Step = "input" | "confirm" | "contact" | "done";
type Parsed = { need: ScoutNeed; summary: SummaryLine[]; questions: FollowUp[] };

const EXAMPLE = "Vi trenger ca. 30 ergonomiske kontorstoler fra HÅG eller RH, maks 4–5 000 kr per stol. Oslo/Drammen. Vi trenger dem før november.";

export function ScoutFlow({ voiceEnabled, initialText = "", phone }: { voiceEnabled: boolean; initialText?: string; phone: string }) {
  const [step, setStep] = useState<Step>("input");
  const [text, setText] = useState(initialText || EXAMPLE);
  const [inputMode, setInputMode] = useState<"text" | "voice">("text");
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  // Mikrofon: false ved server-rendering, faktisk støtte i nettleseren
  const canRecord = useSyncExternalStore(
    () => () => {},
    () => voiceEnabled && "MediaRecorder" in window && Boolean(navigator.mediaDevices?.getUserMedia),
    () => false,
  );
  const recorder = useRef<MediaRecorder | null>(null);
  const started = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => { captureAttribution(); }, []);

  // Flytt fokus til overskriften i hvert steg (skjermlesere får med seg bytte av steg)
  useEffect(() => { if (step !== "input") heading.current?.focus(); }, [step]);

  const onFirstInput = () => {
    if (!started.current) { started.current = true; track("scout_started"); }
  };

  async function interpret(t = text) {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/scout/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: t }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Noe gikk galt.");
      setParsed(data); setStep("confirm");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Noe gikk galt.");
    } finally { setBusy(false); }
  }

  function answer(q: FollowUp, value: string) {
    const label = { category: "Møbeltype", quantity: "Antall", location: "Levering", budget: "Budsjett per stk" }[q.key];
    const next = `${text.trim()} ${label}: ${value}.`;
    setText(next);
    void interpret(next);
  }

  async function toggleRecording() {
    if (recording) { recorder.current?.stop(); return; }
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false); setBusy(true);
        try {
          const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
          const form = new FormData();
          form.append("audio", new File([blob], "opptak.webm", { type: blob.type }));
          const res = await fetch("/api/scout/transcribe", { method: "POST", body: form });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          setText((prev) => (prev && prev !== EXAMPLE ? `${prev.trim()} ${data.text}` : data.text));
          setInputMode("voice");
          onFirstInput();
        } catch (e) {
          setError(e instanceof Error && e.message ? e.message : "Vi klarte ikke å gjøre om talen til tekst. Skriv behovet i stedet.");
        } finally { setBusy(false); }
      };
      recorder.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setError("Fikk ikke tilgang til mikrofonen. Du kan skrive behovet i stedet.");
    }
  }

  async function submitContact(form: HTMLFormElement) {
    const f = new FormData(form);
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/scout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text, inputMode, need: parsed!.need,
          contact: { company: f.get("company"), name: f.get("name"), email: f.get("email"), phone: f.get("phone") || null },
          consent: f.get("consent") === "on",
          attribution: readAttribution(),
          website: f.get("website") || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Noe gikk galt.");
      setResultUrl(data.resultUrl); setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Noe gikk galt.");
    } finally { setBusy(false); }
  }

  const steps: [Step, string][] = [["input", "Behov"], ["confirm", "Bekreft"], ["contact", "Kontakt"]];
  const order = ["input", "confirm", "contact", "done"];

  return (
    <div className="panel" id="start">
      {step !== "done" && (
        <ol className="steps-indicator" aria-label="Steg">
          {steps.map(([key, label]) => (
            <li key={key} aria-current={step === key ? "step" : undefined} className={order.indexOf(step) > order.indexOf(key) ? "done" : undefined}>{label}</li>
          ))}
        </ol>
      )}
      <div aria-live="polite">
        {step === "input" && (
          <form onSubmit={(e) => { e.preventDefault(); void interpret(); }}>
            <h2 ref={heading} tabIndex={-1}>Hva trenger dere?</h2>
            <div className="field" style={{ marginTop: 14 }}>
              <label htmlFor="scout-need">Beskriv behovet med egne ord</label>
              <textarea id="scout-need" className="input" value={text} maxLength={2000}
                onFocus={(e) => { if (e.currentTarget.value === EXAMPLE) e.currentTarget.select(); onFirstInput(); }}
                onChange={(e) => { setText(e.target.value); onFirstInput(); }}
                aria-describedby="scout-need-hint" />
              <p id="scout-need-hint" className="hint" style={{ marginTop: 6 }}>Hva slags møbler, omtrent hvor mange, merker, budsjett, sted og frist.</p>
            </div>
            <div className="input-tools">
              {canRecord ? (
                <button type="button" className="mic" aria-pressed={recording} onClick={toggleRecording} disabled={busy}>{recording ? "Stopp opptak" : "Snakk"}</button>
              ) : <span />}
              <span className="hint">{recording ? "Snakk fritt. Trykk «Stopp opptak» når du er ferdig." : canRecord ? "Tale er et tillegg. Tekst fungerer alltid." : ""}</span>
            </div>
            {error && <p className="error-text" role="alert" style={{ marginTop: 12 }}>{error}</p>}
            <div className="btn-row" style={{ marginTop: 20 }}>
              <button className="btn btn-primary" type="submit" disabled={busy || recording}>{busy ? "Tolker …" : "Fortsett"}</button>
            </div>
          </form>
        )}

        {step === "confirm" && parsed && (
          <div>
            <h2 ref={heading} tabIndex={-1}>Slik forstår Møbelscout behovet deres</h2>
            <ul className="understood">
              {parsed.summary.map((l) => <li key={l.text} className={l.hard ? "hard" : undefined}>{l.text}</li>)}
            </ul>
            <div className="legend"><span className="h">Må oppfylles</span><span>Ønske</span></div>
            {parsed.questions.map((q) => (
              <div className="question" key={q.key}>
                <p>{q.question}</p>
                <div className="pill-buttons">
                  {q.suggestions.map((s) => <button type="button" key={s} onClick={() => answer(q, s)} disabled={busy}>{s}</button>)}
                </div>
              </div>
            ))}
            {error && <p className="error-text" role="alert" style={{ marginTop: 12 }}>{error}</p>}
            <div className="btn-row" style={{ marginTop: 20 }}>
              <button className="btn btn-primary" type="button" onClick={() => setStep("contact")} disabled={busy || parsed.questions.some((q) => q.key !== "budget")}>
                Start Møbelscout
              </button>
              <button className="btn-quiet" type="button" onClick={() => setStep("input")}>Endre beskrivelsen</button>
            </div>
            {parsed.questions.some((q) => q.key !== "budget") && <p className="hint" style={{ marginTop: 10 }}>Svar på spørsmålet over, så kan vi starte.</p>}
          </div>
        )}

        {step === "contact" && (
          <form onSubmit={(e) => { e.preventDefault(); void submitContact(e.currentTarget); }} noValidate={false}>
            <h2 ref={heading} tabIndex={-1}>Hvem skal vi si fra til?</h2>
            <div className="form-grid" style={{ marginTop: 14 }}>
              <div className="field"><label htmlFor="c-company">Bedrift</label><input id="c-company" name="company" className="input" required autoComplete="organization" maxLength={160} /></div>
              <div className="field"><label htmlFor="c-name">Kontaktperson</label><input id="c-name" name="name" className="input" required autoComplete="name" maxLength={120} /></div>
              <div className="field"><label htmlFor="c-email">E-post</label><input id="c-email" name="email" type="email" className="input" required autoComplete="email" maxLength={200} /></div>
              <div className="field"><label htmlFor="c-phone">Telefon <span className="hint">(valgfritt)</span></label><input id="c-phone" name="phone" type="tel" className="input" autoComplete="tel" maxLength={40} /></div>
              <div className="hp" aria-hidden="true"><label htmlFor="c-website">Nettside</label><input id="c-website" name="website" tabIndex={-1} autoComplete="off" /></div>
              <label className="check full" htmlFor="c-consent">
                <input id="c-consent" name="consent" type="checkbox" required />
                <span>Dere kan kontakte meg på e-post eller telefon om treff og om behovet. Se <Link href="/personvern" prefetch={false}>personvernerklæringen</Link>.</span>
              </label>
            </div>
            {error && <p className="error-text" role="alert" style={{ marginTop: 12 }}>{error} {error.includes("Ring") ? phone : ""}</p>}
            <div className="btn-row" style={{ marginTop: 18 }}>
              <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Starter …" : "Start Møbelscout"}</button>
              <button className="btn-quiet" type="button" onClick={() => setStep("confirm")}>Tilbake</button>
            </div>
          </form>
        )}

        {step === "done" && resultUrl && (
          <div className="stack">
            <span className="statuspill">Leter aktivt</span>
            <h2 ref={heading} tabIndex={-1}>Møbelscout er i gang</h2>
            <p className="muted">Vi sier fra på e-post når vi finner noe som passer. På resultatsiden kan dere følge med, se forslag og pause eller avslutte.</p>
            <div className="btn-row"><Link className="btn btn-primary" href={resultUrl}>Gå til resultatsiden</Link></div>
            <p className="hint">Ta vare på lenken. Den er personlig og sendes også på e-post når vi har funnet noe.</p>
          </div>
        )}
      </div>
    </div>
  );
}
