import Image from "next/image";
import Link from "next/link";
import { ProjectTeaser } from "@/components/blocks";
import { JsonLd } from "@/components/JsonLd";
import { ProposalShowcase } from "@/components/ProposalShowcase";
import { readDoc } from "@/lib/content/files";
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
  ["Tilbud og finansiering", "Ett samlet tilbud som en nettside, rom for rom med bilder. Dere kommenterer og godkjenner der. Kjøp eller leasing over 3–5 år."],
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
  const rooms = await Promise.all(p1.map(async (s) => ({ s, d: await readDoc("losninger", s.slug) })));

  return (
    <>
      <section className="hero-ed" aria-labelledby="h-hero">
        <div className="wrap text">
          <h1 id="h-hero">Fra idé til ferdig arbeidsplass.</h1>
          <div className="aside">
            <p className="lead">
              Vi planlegger, leverer og monterer kontorer folk trives i. Én kontaktperson hele veien, fra første befaring til
              siste stol er på plass.
            </p>
            <div className="btn-row">
              <Link className="btn btn-primary" href={primaryCta.href}>{primaryCta.label}</Link>
              <Link className="textlink" href="/prosjekter">Se prosjekter</Link>
            </div>
          </div>
        </div>
        <figure className="wrap">
          <div className="img">
            <Image src="/images/prosjekter/ice-nydalen.webp" alt="Kontorlandskap hos Ice i Nydalen" fill priority fetchPriority="high" quality={60} sizes="(max-width: 1400px) 100vw, 1400px" />
          </div>
          <figcaption>Ice, Nydalen. Kontorlandskap med sosiale soner.</figcaption>
        </figure>
      </section>

      <section className="band green" aria-labelledby="h-intro">
        <div className="wrap intro-ed">
          <h2 id="h-intro">Et familieeid selskap i {settings.city}, siden {settings.foundedYear}</h2>
          <div>
            <p className="big">
              Vi kartlegger hvordan dere jobber, tegner løsningen, velger møbler fra produsenter vi kjenner godt, og tar ansvar
              for levering og montering. <em>Vi er rådgivere, ikke pågående selgere.</em>
            </p>
            <p className="facts-line">
              <span><b>750</b> arbeidsplasser levert til Norwegian</span>
              <span><b>{brands.length}</b> merker vi leverer</span>
              <span>Miljøfyrtårn-sertifisert</span>
            </p>
          </div>
        </div>
      </section>

      <section className="band tight" aria-labelledby="h-sol">
        <div className="wrap">
          <div className="sec-head">
            <h2 id="h-sol">Hva trenger dere hjelp med?</h2>
            <Link className="textlink" href="/losninger">Alle løsninger</Link>
          </div>
          <ul className="tiles">
            {rooms.map(({ s, d }) => (
              <li key={s.slug}>
                <Link href={`/losninger/${s.slug}`} className="tile">
                  {d?.data.image && <span className="tile-img"><Image src={d.data.image} alt="" fill sizes="(max-width: 700px) 100vw, 33vw" quality={60} /></span>}
                  <span className="tile-title">{s.name}</span>
                  <span className="tile-text">{d?.data.lead}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {featured && (
        <section className="band" aria-label="Prosjekt">
          <div className="wrap"><ProjectTeaser project={featured} image={projectImages[featured.slug]?.[0]} /></div>
        </section>
      )}

      <section className="band green" aria-labelledby="h-kat">
        <div className="wrap">
          <div className="sec-head">
            <h2 id="h-kat">Møbler fra produsenter vi kjenner</h2>
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

      <section className="band" aria-labelledby="h-proc">
        <div className="wrap steps-ed">
          <div className="stack" style={{ ["--st" as string]: "1rem" }}>
            <h2 id="h-proc">Slik jobber vi</h2>
            <p className="muted measure">Samme fremgangsmåte enten dere skal bytte stolene i ett landskap eller innrede et helt bygg.</p>
          </div>
          <ol>{steps.map(([t, d]) => <li key={t}><h3>{t}</h3><p>{d}</p></li>)}</ol>
        </div>
      </section>

      <ProposalShowcase />

      <section className="band night" aria-labelledby="h-contact">
        <div className="wrap contact-ed">
          <div className="stack" style={{ ["--st" as string]: "1.1rem" }}>
            <h2 id="h-contact">Skal dere flytte, vokse eller fornye?</h2>
            <p className="lead">
              Vi tar en uforpliktende prat og kommer gjerne på befaring. Showroomet vårt i {settings.streetAddress} i {settings.city} er
              åpent hverdager.
            </p>
            <div className="btn-row"><Link className="btn btn-primary" href={primaryCta.href}>{primaryCta.label}</Link></div>
          </div>
          {advisor && (
            <div className="person-lines">
              <b>{advisor.name}</b>
              <span className="muted">{advisor.roleTitle}</span>
              <span className="selectable">{displayPhone(settings.phone)}</span>
            </div>
          )}
        </div>
      </section>
      <JsonLd data={localBusiness(settings)} />
    </>
  );
}
