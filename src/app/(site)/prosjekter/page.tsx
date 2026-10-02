import Image from "next/image";
import Link from "next/link";
import { LeadSection, PageIntro } from "@/components/blocks";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { content } from "@/lib/content/repository";
import { collectionPage } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { getAdvisor, projectImages } from "@/lib/site/pages";

export const metadata = buildMetadata({
  title: "Prosjekter",
  description: "Kontorer vi har planlagt, levert og montert. Fra noen få arbeidsplasser til 750 arbeidsplasser for Norwegian på Fornebu.",
  path: "/prosjekter",
});

export default async function ProjectsHub() {
  const [projects, settings, advisor] = await Promise.all([content.listProjects(), content.getSiteSettings(), getAdvisor()]);
  const withImage = projects.filter((p) => projectImages[p.slug]?.[0]);
  const withoutImage = projects.filter((p) => !projectImages[p.slug]?.[0]);

  return (
    <>
      <div className="wrap"><Breadcrumbs crumbs={[{ name: "Prosjekter", path: "/prosjekter" }]} /></div>
      <PageIntro
        title="Prosjekter"
        lead="Et utvalg av kontorene vi har levert. Flere prosjekter kommer. Spør oss gjerne om referanser fra din bransje eller ditt område."
      />
      <section className="band tight">
        <div className="wrap">
          <ul className="project-list">
            {withImage.map((p) => (
              <li key={p.slug}>
                <Link href={`/prosjekter/${p.slug}`}>
                  <span className="media"><Image src={projectImages[p.slug][0]} alt="" fill sizes="(max-width: 860px) 100vw, 60vw" quality={70} /></span>
                  <span className="text">
                    <span className="pl-meta">{[p.location, p.workstations && `${p.workstations} arbeidsplasser`].filter(Boolean).join(" · ")}</span>
                    <span className="pl-title">{p.title}</span>
                    {p.scope && <span className="muted">{p.scope}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {withoutImage.length > 0 && (
            <>
              <h2 className="list-head more-projects">Flere prosjekter</h2>
              <ul className="project-rows">
                {withoutImage.map((p) => (
                  <li key={p.slug}>
                    <Link href={`/prosjekter/${p.slug}`}>
                      <span className="pl-meta">{p.location}</span>
                      <span className="pl-title">{p.clientName ?? p.title}</span>
                      {p.scope && <span className="muted">{p.scope}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>
      <LeadSection settings={settings} advisor={advisor} kind="project_request" />
      <JsonLd data={collectionPage({ name: "Prosjekter", path: "/prosjekter", items: projects.map((p) => ({ name: p.title, path: `/prosjekter/${p.slug}` })) })} />
    </>
  );
}
