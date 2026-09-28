import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { ScoutFlow } from "@/components/scout/ScoutFlow";
import { content } from "@/lib/content/repository";
import { hasDatabase } from "@/lib/env";
import { voiceEnabled } from "@/lib/scout/ai";
import { service } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { displayPhone } from "@/lib/site/settings";

const DESCRIPTION =
  "Brukte kontormøbler til bedrifter. Fortell Møbelscout hva dere trenger, så leter vi etter brukte kontorstoler, skrivebord og møtebord for dere.";

export const metadata = buildMetadata({ title: "Brukte kontormøbler – Møbelscout", description: DESCRIPTION, path: "/mobelscout" });

const faq = [
  ["Hva koster det å bruke Møbelscout?", "Det er gratis og uforpliktende å la Møbelscout lete. Dere betaler først når dere takker ja til et tilbud. Påslaget på bruktvaren er lavt, og frakt, klargjøring og montering prises bare hvis dere ønsker det."],
  ["Hvor lenge leter Møbelscout?", "Møbelscout leter så lenge behovet er aktivt, i utgangspunktet i 90 dager. Dere kan pause eller avslutte når som helst fra resultatsiden."],
  ["Hvilken stand har møblene?", "Vi oppgir stand på hvert forslag (brukt, refurbished eller utstillingsmodell). Før dere får et tilbud, bekrefter vi tilgjengelighet og stand."],
  ["Hva om vi ikke finner nok brukte møbler?", "Da kan vi fylle opp med nye møbler, gjerne samme modell. Mange velger for eksempel 24 brukte og 6 nye stoler."],
  ["Hvilke merker leter dere etter?", "De fleste kjente kvalitetsmerkene for kontor, som HÅG, RH, Sedus, Kinnarps, Vitra, Varier og Dencon. Skriv gjerne «eller tilsvarende» hvis dere er åpne for alternativer."],
] as const;

export default async function ScoutPage({ searchParams }: PageProps<"/mobelscout">) {
  const [settings, sp] = await Promise.all([content.getSiteSettings(), searchParams]);
  const initial = typeof sp.behov === "string" ? sp.behov.slice(0, 500) : "";
  return (
    <>
      <section className="scout-hero" aria-labelledby="h-scout">
        <div className="wrap">
          <div className="stack" style={{ ["--st" as string]: "1.2rem" }}>
            <Breadcrumbs crumbs={[{ name: "Møbelscout", path: "/mobelscout" }]} className="on-dark" />
            <span className="eyebrow">Møbelscout</span>
            <h1 id="h-scout">Brukte kontormøbler. Vi leter for dere.</h1>
            <p className="lead">Fortell oss hva dere trenger én gang. Møbelscout følger markedet og sier fra når vi finner noe som passer. Gratis og uforpliktende.</p>
            <ul className="benefits">
              <li>Brukte kontorstoler, skrivebord, møtebord, oppbevaring og mer</li>
              <li>Vi fyller opp med nye møbler når partiet ikke er stort nok</li>
              <li>Frakt, klargjøring og montering fra én leverandør</li>
            </ul>
          </div>
          {hasDatabase ? (
            <ScoutFlow voiceEnabled={voiceEnabled()} initialText={initial} phone={displayPhone(settings.phone)} />
          ) : (
            <div className="panel stack">
              <h2>Møbelscout åpner snart</h2>
              <p className="muted">Ring oss på <span className="selectable">{displayPhone(settings.phone)}</span> eller send e-post til <span className="selectable">{settings.emailGeneral}</span>, så leter vi for dere.</p>
            </div>
          )}
        </div>
      </section>

      <section className="band" aria-labelledby="h-how">
        <div className="wrap">
          <div className="sec-head"><div className="stack"><span className="eyebrow">Slik fungerer det</span><h2 id="h-how">Fra behov til levert</h2></div></div>
          <ol className="how">
            <li><h3>Beskriv behovet</h3><p>Skriv eller snakk. Antall, merker, budsjett, sted og frist.</p></li>
            <li><h3>Bekreft</h3><p>Vi viser hvordan vi forstod det, og dere kan endre.</p></li>
            <li><h3>Vi leter</h3><p>Møbelscout følger relevante kilder løpende.</p></li>
            <li><h3>Dere får forslag</h3><p>Vi kvalitetssikrer hvert forslag før dere ser det.</p></li>
            <li><h3>Vi leverer</h3><p>Tilgjengelighet og stand bekreftes, så kommer tilbud og levering.</p></li>
          </ol>
        </div>
      </section>

      <section className="band sand" aria-labelledby="h-what">
        <div className="wrap two-col">
          <div className="stack"><span className="eyebrow">Hva Møbelscout finner</span><h2 id="h-what">Brukte kontormøbler til bedrifter</h2></div>
          <div className="stack" style={{ ["--st" as string]: "1rem" }}>
            <p className="measure">Brukte kontorstoler, hev/senk-skrivebord, møtebord, møteromsstoler, oppbevaring, sofaer og akustikk. Mest etterspurt er brukte HÅG- og RH-stoler, brukte skrivebord og møteromsstoler i større partier.</p>
            <p className="measure muted">Ombruk er bra for miljøet og for budsjettet. Mange kombinerer brukte møbler i landskapet med nye møbler i møterom og kantine. Vi hjelper dere finne den riktige blandingen.</p>
          </div>
        </div>
      </section>

      <section className="band" aria-labelledby="h-more">
        <div className="wrap two-col">
          <div className="stack"><span className="eyebrow">Mer enn brukt</span><h2 id="h-more">Én leverandør for hele leveransen</h2></div>
          <div className="stack" style={{ ["--st" as string]: "1rem" }}>
            <p className="measure">Vi fyller opp med nye møbler, frakter, bærer inn, klargjør og monterer. Dere har én kontaktperson fra første forslag til alt står på plass.</p>
            <p className="measure muted">Kontorcompaniet har levert kontorinnredning siden {settings.foundedYear}. Vi kjenner produsentene og vet hva som holder seg.</p>
            <p><Link className="textlink" href="/kontakt">Snakk med en rådgiver</Link></p>
          </div>
        </div>
      </section>

      <section className="band sand" aria-labelledby="h-faq">
        <div className="wrap two-col">
          <div className="stack"><span className="eyebrow">Spørsmål og svar</span><h2 id="h-faq">Det kundene spør om</h2></div>
          <div className="faq">
            {faq.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
          </div>
        </div>
      </section>

      <JsonLd data={[
        service({ name: "Møbelscout – brukte kontormøbler", description: DESCRIPTION, path: "/mobelscout" }),
        {
          "@context": "https://schema.org", "@type": "FAQPage",
          mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
        },
      ]} />
    </>
  );
}
