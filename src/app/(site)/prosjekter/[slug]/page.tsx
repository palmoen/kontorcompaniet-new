import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LeadSection } from "@/components/blocks";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { Markdown } from "@/lib/content/markdown";
import { content } from "@/lib/content/repository";
import { article } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { getAdvisor, projectPage } from "@/lib/site/pages";

export async function generateStaticParams() {
  return (await content.listProjects()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/prosjekter/[slug]">) {
  const { slug } = await params;
  const p = await projectPage(slug);
  if (!p) return {};
  return buildMetadata({
    title: p.project.seoTitle ?? p.project.title,
    description: p.project.seoDescription ?? p.doc?.data.description ?? p.project.scope ?? p.project.title,
    path: `/prosjekter/${slug}`,
    image: p.images[0] ? { url: p.images[0], alt: p.project.title } : undefined,
    noindex: !p.index,
    type: "article",
  });
}

export default async function ProjectPage({ params }: PageProps<"/prosjekter/[slug]">) {
  const { slug } = await params;
  const p = await projectPage(slug);
  if (!p) notFound();
  const [settings, advisor, testimonials] = await Promise.all([content.getSiteSettings(), getAdvisor(), content.listTestimonials()]);
  const { project } = p;
  const path = `/prosjekter/${slug}`;
  const quote = testimonials.find((t) => t.projectSlug === slug);
  const solutions = project.links.filter((l) => l.kind === "solution");

  const brands = project.links.filter((l) => l.kind === "brand");
  const facts = [
    project.workstations && [String(project.workstations), "arbeidsplasser"],
    project.location && [project.location, "sted"],
    project.year && [String(project.year), "levert"],
    project.clientName && [project.clientName, "kunde"],
  ].filter(Boolean) as [string, string][];
  const chapters = [
    ["Utgangspunktet", project.challengeMd],
    ["Slik løste vi det", project.solutionMd],
    ["Resultatet", project.resultMd],
  ].filter(([, md]) => md) as [string, string][];
  const gallery = p.images.slice(1);

  return (
    <>
      <article className="case">
        <header className="case-hero">
          <div className="wrap"><Breadcrumbs crumbs={[{ name: "Prosjekter", path: "/prosjekter" }, { name: project.clientName ?? project.title, path }]} /></div>
          <div className="wrap case-title">
            <p className="kicker">Prosjekt{project.location ? ` · ${project.location}` : ""}</p>
            <h1>{project.title}</h1>
            {p.doc?.data.lead && <p className="lead">{p.doc.data.lead}</p>}
          </div>
          {p.images[0] && (
            <div className="case-media"><Image src={p.images[0]} alt={p.doc?.data.imageAlt ?? project.title} fill priority sizes="100vw" quality={70} /></div>
          )}
        </header>

        {facts.length > 0 && (
          <div className="wrap">
            <dl className="case-facts">
              {facts.map(([v, k]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
            </dl>
          </div>
        )}

        <section className="band" aria-label="Om prosjektet">
          <div className="wrap case-body">
            <aside className="case-aside">
              {project.scope && <div><h2>Omfang</h2><p>{project.scope}</p></div>}
              {solutions.length > 0 && (
                <div>
                  <h2>Leveranse</h2>
                  <ul>{solutions.map((l) => <li key={l.slug}><Link href={`/losninger/${l.slug}`}>{l.name}</Link></li>)}</ul>
                </div>
              )}
              {brands.length > 0 && (
                <div>
                  <h2>Merker</h2>
                  <ul>{brands.map((l) => <li key={l.slug}><Link href={`/merkevarer/${l.slug}`}>{l.name}</Link></li>)}</ul>
                </div>
              )}
            </aside>
            <ol className="case-story">
              {chapters.map(([title, md]) => <li key={title}><h2>{title}</h2><Markdown source={md} /></li>)}
            </ol>
          </div>
        </section>

        {gallery.length > 0 && (
          <section className="band tight" aria-label="Bilder fra prosjektet">
            <div className={`wrap case-gallery n${Math.min(gallery.length, 3)}`}>
              {gallery.map((src, i) => (
                <div key={src} className="gimg"><Image src={src} alt={`${project.title}, bilde ${i + 2}`} fill sizes="(max-width: 700px) 100vw, 60vw" quality={70} /></div>
              ))}
            </div>
          </section>
        )}

        {quote && (
          <section className="band case-quote-band">
            <figure className="wrap case-quote">
              <blockquote><p>{quote.quote}</p></blockquote>
              <figcaption><b>{quote.personName}</b>{quote.personTitle ? `, ${quote.personTitle}` : ""}<br />{quote.company}</figcaption>
            </figure>
          </section>
        )}

        {project.videoUrls.length > 0 && (
          <section className="band tight">
            <div className="wrap">
              <div className="case-video">
                <p>Vi filmer mange av prosjektene våre.</p>
                <a className="btn btn-secondary" href={project.videoUrls[0]} rel="noopener">Se filmene på Vimeo</a>
              </div>
            </div>
          </section>
        )}
      </article>
      <LeadSection settings={settings} advisor={advisor} kind="project_request" context={{ project: slug }} title="Skal dere gjøre noe lignende?" />
      <JsonLd data={article({ headline: project.title, path, image: p.images[0], dateModified: project.updatedAt })} />
    </>
  );
}
