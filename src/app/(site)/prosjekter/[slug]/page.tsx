import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LeadSection } from "@/components/blocks";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ConnectionLine, type Connection } from "@/components/ConnectionLine";
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

  const links: Connection[] = [
    { type: "Prosjekt", name: project.clientName ?? project.title },
    ...solutions.slice(0, 3).map((l) => ({ type: "Løsning", name: l.name, href: `/losninger/${l.slug}` })),
    ...project.links.filter((l) => l.kind === "brand").slice(0, 1).map((l) => ({ type: "Merke", name: l.name, href: `/merkevarer/${l.slug}` })),
  ];
  const facts = [
    project.clientName && ["Kunde", project.clientName],
    project.location && ["Sted", project.location],
    project.workstations && ["Arbeidsplasser", String(project.workstations)],
    project.year && ["År", String(project.year)],
  ].filter(Boolean) as [string, string][];

  return (
    <>
      <div className="wrap"><Breadcrumbs crumbs={[{ name: "Prosjekter", path: "/prosjekter" }, { name: project.clientName ?? project.title, path }]} /></div>
      <section className="project-head">
        <div className="wrap">
          <h1>{project.title}</h1>
          {p.doc?.data.lead && <p className="lead measure">{p.doc.data.lead}</p>}
          {facts.length > 0 && (
            <dl className="project-facts">
              {facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
            </dl>
          )}
        </div>
        {p.images[0] && (
          <div className="wrap"><div className="project-hero"><Image src={p.images[0]} alt={p.doc?.data.imageAlt ?? project.title} fill priority sizes="100vw" quality={70} /></div></div>
        )}
      </section>
      <ConnectionLine items={links} />

      <section className="band">
        <div className="wrap story">
          {project.challengeMd && <div><h2>Utgangspunktet</h2><Markdown source={project.challengeMd} /></div>}
          {project.solutionMd && <div><h2>Slik løste vi det</h2><Markdown source={project.solutionMd} /></div>}
          {project.resultMd && <div><h2>Resultatet</h2><Markdown source={project.resultMd} /></div>}
        </div>
      </section>

      {p.images.length > 1 && (
        <section className="band tight">
          <div className="wrap gallery">
            {p.images.slice(1).map((src) => (
              <div key={src} className="gimg"><Image src={src} alt={project.title} fill sizes="(max-width: 700px) 100vw, 50vw" quality={70} /></div>
            ))}
          </div>
        </section>
      )}

      {quote && (
        <section className="band tight">
          <figure className="wrap quote">
            <blockquote><p>«{quote.quote}»</p></blockquote>
            <figcaption>{quote.personName}{quote.personTitle ? `, ${quote.personTitle}` : ""}, {quote.company}</figcaption>
          </figure>
        </section>
      )}

      {project.videoUrls.length > 0 && (
        <section className="band tight">
          <div className="wrap"><p>Se <a className="textlink" href={project.videoUrls[0]} rel="noopener">filmer fra prosjektene våre på Vimeo</a>.</p></div>
        </section>
      )}

      {solutions.length > 0 && (
        <section className="band tight">
          <div className="wrap">
            <h2 className="list-head">Les mer om</h2>
            <ul className="chips">{solutions.map((l) => <li key={l.slug}><Link href={`/losninger/${l.slug}`}>{l.name}</Link></li>)}</ul>
          </div>
        </section>
      )}

      <LeadSection settings={settings} advisor={advisor} kind="project_request" context={{ project: slug }} title="Skal dere gjøre noe lignende?" />
      <JsonLd data={article({ headline: project.title, path, image: p.images[0], dateModified: project.updatedAt })} />
    </>
  );
}
