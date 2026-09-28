import Image from "next/image";
import Link from "next/link";
import { ProjectTeaser } from "@/components/blocks";
import { JsonLd } from "@/components/JsonLd";
import { content } from "@/lib/content/repository";
import { localBusiness } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { displayPhone } from "@/lib/site/settings";
import { primaryCta } from "@/lib/site/navigation";
import { projectImages } from "@/lib/site/pages";

export const metadata = buildMetadata({
  title: "Kontorcompaniet – fra idé til ferdig arbeidsplass",
  description:
    "Vi planlegger, leverer og monterer kontorer folk trives i. Familieeid i Drammen siden 1981, med én kontaktperson fra befaring til ferdig montert.",
  path: "/",
});

const steps = [
  ["Behov og analyse", "Vi kartlegger hvordan dere jobber, hvor mange dere er, og hva som ikke fungerer i dag."],
  ["Plan og tegning", "Planløsning, soner og møbelvalg, tilpasset lokaler, budsjett og arbeidsform."],
  ["Tilbud og finansiering", "Ett samlet tilbud. Kjøp eller leasing over 3–5 år."],
  ["Levering og montering", "Vi koordinerer leverandører, frakt, innbæring og montering."],
  ["Oppfølging og service", "Justering, tilleggsbestillinger, service og ombruk når behovene endrer seg."],
] as const;

export default async function HomePage() {
  const [settings, solutions, brands, people, categories, projects] = await Promise.all([
    content.getSiteSettings(), content.listSolutions(), content.listBrands(), content.listPeople(),
    content.listCategories(), content.listProjects(),
  ]);
  const featured = projects.find((p) => p.featured);
  const advisor = people.find((p) => p.handles.includes("salg")) ?? people[0];
  const p1 = solutions.filter((s) => s.priority === "P1" && s.group === "rom");

  return (
    <>
      <section className="hero" aria-labelledby="h-hero">
        <Image className="bg" src="/images/prosjekter/ice-nydalen.webp" alt="" fill priority fetchPriority="high" quality={60} sizes="100vw" />
        <div className="wrap">
          <span className="eyebrow">Kontorinnredning siden {settings.foundedYear}</span>
          <h1 id="h-hero">Fra idé til ferdig arbeidsplass.</h1>
          <p className="lead">
            Vi planlegger, leverer og monterer kontorer folk trives i. Én kontaktperson hele veien, fra første befaring til
            siste stol er på plass.
          </p>
          <div className="btn-row on-dark">
            <Link className="btn btn-primary" href={primaryCta.href}>{primaryCta.label}</Link>
          </div>
          <p className="credit">Prosjekt: Ice, Nydalen</p>
        </div>
      </section>

      <section className="band" aria-labelledby="h-intro">
        <div className="wrap intro-grid">
          <div className="stack" style={{ ["--st" as string]: "1.1rem" }}>
            <span className="eyebrow">Hva vi gjør</span>
            <h2 id="h-intro">Én partner fra behov til ferdig møblerte lokaler</h2>
            <p className="muted measure">
              Vi er et familieeid selskap i {settings.city}. Vi kartlegger hvordan dere jobber, tegner løsningen, velger møbler
              fra produsenter vi kjenner godt, og tar ansvar for levering og montering. Vi er rådgivere, ikke pågående selgere.
            </p>
          </div>
          <dl className="facts">
            <div><dt className="num">{settings.foundedYear}</dt><dd>grunnlagt i {settings.city}</dd></div>
            <div><dt className="num">750</dt><dd>arbeidsplasser levert til Norwegian</dd></div>
            <div><dt className="num">{brands.length}</dt><dd>merker vi leverer</dd></div>
          </dl>
        </div>
      </section>

      <section className="band sand tight" aria-labelledby="h-sol">
        <div className="wrap">
          <div className="sec-head"><div className="stack"><span className="eyebrow">Løsninger</span><h2 id="h-sol">Hva trenger dere hjelp med?</h2></div><Link className="textlink" href="/losninger">Alle løsninger</Link></div>
          <ul className="chips">{p1.map((s) => <li key={s.slug}><Link href={`/losninger/${s.slug}`}>{s.name}</Link></li>)}</ul>
        </div>
      </section>

      <section className="band" aria-labelledby="h-kat">
        <div className="wrap">
          <div className="sec-head">
            <div className="stack"><span className="eyebrow">Møbler</span><h2 id="h-kat">Møbler fra produsenter vi kjenner</h2></div>
            <Link className="textlink" href="/merkevarer">Alle {brands.length} merker</Link>
          </div>
          <ul className="rows">
            {categories.map((c) => (
              <li key={c.slug}><Link href={`/produkter/${c.slug}`}><span className="row-title">{c.name}</span>
                <span className="row-text">{brands.filter((b) => b.hasPage && b.categories.includes(c.slug)).map((b) => b.name).slice(0, 4).join(", ")}</span></Link></li>
            ))}
          </ul>
        </div>
      </section>

      {featured && (
        <section className="band tight" aria-label="Prosjekt">
          <div className="wrap"><ProjectTeaser project={featured} image={projectImages[featured.slug]?.[0]} /></div>
        </section>
      )}

      <section className="band" aria-labelledby="h-proc">
        <div className="wrap">
          <div className="sec-head"><div className="stack"><span className="eyebrow">Slik jobber vi</span><h2 id="h-proc">Fra behov til ferdig lokale</h2></div></div>
          <ol className="process">{steps.map(([t, d]) => <li key={t}><h3>{t}</h3><p>{d}</p></li>)}</ol>
        </div>
      </section>

      <section className="band night" aria-labelledby="h-contact">
        <div className="wrap contact-cta">
          <div className="stack" style={{ ["--st" as string]: "1.1rem" }}>
            <span className="eyebrow">Kontakt</span>
            <h2 id="h-contact">Skal dere flytte, vokse eller fornye?</h2>
            <p className="muted measure">
              Vi tar en uforpliktende prat og kommer gjerne på befaring. Showroomet vårt i {settings.streetAddress} i {settings.city} er
              åpent hverdager.
            </p>
            <div className="btn-row on-dark"><Link className="btn btn-primary" href={primaryCta.href}>{primaryCta.label}</Link></div>
          </div>
          {advisor && (
            <div className="person">
              <div className="avatar" aria-hidden="true">{advisor.name.split(" ").map((n) => n[0]).join("")}</div>
              <div>
                <b style={{ color: "var(--night-ink)" }}>{advisor.name}</b><br />
                <span className="muted">{advisor.roleTitle}</span><br />
                <span className="selectable" style={{ color: "var(--night-ink)" }}>{displayPhone(settings.phone)}</span>
              </div>
            </div>
          )}
        </div>
      </section>
      <JsonLd data={localBusiness(settings)} />
    </>
  );
}
