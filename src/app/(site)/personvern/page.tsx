import { Breadcrumbs } from "@/components/Breadcrumbs";
import { content } from "@/lib/content/repository";
import { buildMetadata } from "@/lib/seo/metadata";

// UTKAST: må kvalitetssikres av Kontorcompaniet før lansering. Holdes noindex til da.
export const metadata = buildMetadata({
  title: "Personvern",
  description: "Hvordan Kontorcompaniet behandler personopplysninger fra kontaktskjema, tilbudsforespørsler og Møbelscout.",
  path: "/personvern",
  noindex: true,
});

export default async function PrivacyPage() {
  const s = await content.getSiteSettings();
  return (
    <>
      <div className="wrap"><Breadcrumbs crumbs={[{ name: "Personvern", path: "/personvern" }]} /></div>
      <article className="band">
        <div className="wrap stack measure" style={{ ["--st" as string]: "1.2rem" }}>
          <span className="eyebrow">Personvern</span>
          <h1>Personvern</h1>
          <p className="hint">Utkast – kvalitetssikres før lansering.</p>
          <h2 style={{ fontSize: "1.3rem" }}>Behandlingsansvarlig</h2>
          <p>{s.legalName}, {s.streetAddress}, {s.postalCode} {s.city}. Spørsmål om personvern: <span className="selectable">{s.emailGeneral}</span>.</p>
          <h2 style={{ fontSize: "1.3rem" }}>Hva vi samler inn</h2>
          <p>Når du sender en forespørsel eller starter Møbelscout, lagrer vi bedriftsnavn, navn, e-post, eventuelt telefon, det du skriver om behovet, og hvilken side og kampanje du kom fra (for eksempel utm-parametere).</p>
          <h2 style={{ fontSize: "1.3rem" }}>Hvorfor</h2>
          <p>For å svare på forespørselen, lete etter møbler som passer behovet, sende deg forslag og følge opp med tilbud. Grunnlaget er samtykket du gir i skjemaet og vår berettigede interesse i å følge opp forespørsler fra bedrifter.</p>
          <h2 style={{ fontSize: "1.3rem" }}>Hvem som behandler data for oss</h2>
          <p>Vi bruker databehandlere for drift: Supabase (database), Vercel (nettside), Resend (e-post) og OpenAI (tolkning av teksten du skriver eller sier til Møbelscout). Opptak av tale lagres ikke etter at det er gjort om til tekst.</p>
          <h2 style={{ fontSize: "1.3rem" }}>Dine rettigheter</h2>
          <p>Du kan be om innsyn, retting og sletting, og du kan når som helst avslutte Møbelscout fra resultatsiden. Kontakt oss på <span className="selectable">{s.emailGeneral}</span>.</p>
        </div>
      </article>
    </>
  );
}
