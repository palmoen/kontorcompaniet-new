import Image from "next/image";
import Link from "next/link";
import { AddToProject, QuoteButton } from "@/components/AddToProject";
import { LeadForm } from "@/components/LeadForm";
import { certificationNames } from "@/lib/content/seed";
import type { Person, ProductCard, Project } from "@/lib/content/types";
import { displayPhone, type SiteSettings } from "@/lib/site/settings";

/** Sideinnledning: tittel, ingress og valgfritt bilde ved siden av */
export function PageIntro({
  title, lead, image, imageAlt, kicker, children,
}: { title: string; lead?: string | null; image?: string | null; imageAlt?: string; kicker?: string; children?: React.ReactNode }) {
  return (
    <section className={`page-intro ${image ? "has-image" : ""}`}>
      <div className="wrap">
        <div className="text">
          {kicker && <p className="kicker">{kicker}</p>}
          <h1>{title}</h1>
          {lead && <p className="lead">{lead}</p>}
          {children}
        </div>
        {image && (
          <div className="media">
            <Image src={image} alt={imageAlt ?? ""} fill sizes="(max-width: 860px) 100vw, 45vw" quality={70} priority />
          </div>
        )}
      </div>
    </section>
  );
}

export function ProductGrid({ products, withActions = true }: { products: ProductCard[]; withActions?: boolean }) {
  if (!products.length) return null;
  return (
    <ul className="products">
      {products.map((p) => {
        const item = { slug: p.slug, name: p.name, brand: p.brandName };
        return (
          <li key={p.slug} className="product">
            <div className="ph">
              {p.image
                ? <Image src={p.image} alt={p.name} fill sizes="(max-width: 600px) 50vw, 260px" quality={70} />
                : <span className="ph-empty" aria-hidden="true">{p.brandName}</span>}
            </div>
            <div className="pbody">
              <p className="pbrand"><Link href={`/merkevarer/${p.brandSlug}`}>{p.brandName}</Link></p>
              <h3>{p.name}</h3>
              {p.tagline && <p className="ptag">{p.tagline}</p>}
              {p.certifications.length > 0 && (
                <p className="certs">{p.certifications.map((c) => certificationNames[c] ?? c).join(" · ")}</p>
              )}
              {withActions && (
                <div className="pactions">
                  <QuoteButton item={item} />
                  <AddToProject item={item} />
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function ProjectTeaser({ project, image }: { project: Project; image?: string }) {
  return (
    <article className="project-teaser">
      {image && (
        <div className="media"><Image src={image} alt={project.title} fill sizes="(max-width: 860px) 100vw, 50vw" quality={70} /></div>
      )}
      <div className="text">
        <p className="kicker">Prosjekt{project.location ? ` · ${project.location}` : ""}</p>
        <h3><Link href={`/prosjekter/${project.slug}`}>{project.title}</Link></h3>
        {project.scope && <p className="muted">{project.scope}</p>}
        <Link className="textlink" href={`/prosjekter/${project.slug}`}>Les om prosjektet</Link>
      </div>
    </article>
  );
}

export function FaqList({ items, title = "Spørsmål vi ofte får" }: { items: { q: string; a: string }[]; title?: string }) {
  if (!items.length) return null;
  return (
    <section className="band tight" aria-labelledby="h-faq">
      <div className="wrap two-col">
        <h2 id="h-faq">{title}</h2>
        <div className="faq">
          {items.map((f) => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}
        </div>
      </div>
    </section>
  );
}

/** Avslutning på de fleste sider: kort tekst, rådgiver og skjema */
export function LeadSection({
  settings, advisor, title = "Fortell oss hva dere trenger", intro, kind, context, showList = false, placeholder,
}: {
  settings: SiteSettings; advisor?: Person; title?: string; intro?: string;
  kind?: React.ComponentProps<typeof LeadForm>["kind"]; context?: React.ComponentProps<typeof LeadForm>["context"];
  showList?: boolean; placeholder?: string;
}) {
  return (
    <section className="band sand lead-section" id="foresporsel" aria-labelledby="h-lead">
      <div className="wrap lead-grid">
        <div className="stack" style={{ ["--st" as string]: "1rem" }}>
          <h2 id="h-lead">{title}</h2>
          <p className="muted measure">
            {intro ?? "Skriv noen linjer om prosjektet, så tar vi kontakt. Vi kommer gjerne på befaring, og det er alltid uforpliktende."}
          </p>
          <div className="contact-lines">
            <p>Ring <span className="selectable">{displayPhone(settings.phone)}</span></p>
            <p>E-post <span className="selectable">{settings.emailGeneral}</span></p>
          </div>
          {advisor && (
            <p className="advisor"><b>{advisor.name}</b>{advisor.roleTitle ? `, ${advisor.roleTitle.toLowerCase()}` : ""}, svarer på henvendelsen.</p>
          )}
        </div>
        <LeadForm kind={kind} context={context} showList={showList} phone={displayPhone(settings.phone)} placeholder={placeholder} />
      </div>
    </section>
  );
}
