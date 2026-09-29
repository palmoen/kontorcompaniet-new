import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { LeadForm } from "@/components/LeadForm";
import { ProposalShowcase } from "@/components/ProposalShowcase";
import { content } from "@/lib/content/repository";
import { localBusiness } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { displayPhone } from "@/lib/site/settings";

export const metadata = buildMetadata({
  title: "Kontakt oss",
  description: "Ta kontakt for en uforpliktende prat eller befaring. Showroom i Tollbugata 115 i Drammen, åpent hverdager 08–16.",
  path: "/kontakt",
});

export default async function ContactPage() {
  const [s, people] = await Promise.all([content.getSiteSettings(), content.listPeople()]);
  return (
    <>
      <div className="wrap"><Breadcrumbs crumbs={[{ name: "Kontakt", path: "/kontakt" }]} /></div>
      <section className="band" aria-labelledby="h-kontakt">
        <div className="wrap intro-grid" style={{ alignItems: "start" }}>
          <div className="stack" style={{ ["--st" as string]: "1.1rem" }}>
            <span className="eyebrow">Kontakt</span>
            <h1 id="h-kontakt">Trenger dere ny kontorinnredning eller en befaring?</h1>
            <p className="muted measure">
              Ring, send e-post eller kom innom showroomet. Book gjerne et møte i forkant, så har vi god tid til dere.
            </p>
          </div>
          <div className="stack" style={{ ["--st" as string]: "1.4rem" }}>
            <div>
              <span className="eyebrow">Telefon</span>
              <p className="selectable" style={{ fontSize: "1.4rem" }}>{displayPhone(s.phone)}</p>
            </div>
            <div>
              <span className="eyebrow">E-post</span>
              <p className="selectable" style={{ fontSize: "1.2rem" }}>{s.emailGeneral}</p>
            </div>
            <div>
              <span className="eyebrow">Showroom</span>
              <address style={{ fontStyle: "normal" }}>
                {s.streetAddress}{s.addressNote ? ` (${s.addressNote})` : ""}<br />{s.postalCode} {s.city}
              </address>
              {s.openingHours.map((h) => <p key={h.days} className="muted">Hverdager {h.opens}–{h.closes}</p>)}
            </div>
            {people.length > 0 && (
              <div>
                <span className="eyebrow">Rådgivere</span>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {people.map((p) => <li key={p.name}><b>{p.name}</b>{p.roleTitle ? `, ${p.roleTitle}` : ""}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>
      <ProposalShowcase />
      <section className="band" id="skjema" aria-labelledby="h-skjema">
        <div className="wrap lead-grid">
          <div className="stack" style={{ ["--st" as string]: "1rem" }}>
            <h2 id="h-skjema">Send oss en henvendelse</h2>
            <p className="muted measure">
              Fortell kort hva dere trenger. Har dere lagt produkter i prosjektlisten, sendes den med. Vi svarer innen én arbeidsdag.
            </p>
          </div>
          <LeadForm showList phone={displayPhone(s.phone)} />
        </div>
      </section>
      <JsonLd data={localBusiness(s)} />
    </>
  );
}
